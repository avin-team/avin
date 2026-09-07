import type { Effect, Gpu, Target } from "vgpu";
import { effect, frame, sampler, target } from "vgpu";

import { BLUE_NOISE_SIZE, blueNoiseBytes } from "./blue-noise-128";
import blurWgsl from "./blur.wgsl?raw";
import compositeWgsl from "./composite.wgsl?raw";
import logoWgsl from "./logo.wgsl?raw";
import rimWgsl from "./rim.wgsl?raw";

export type Point = readonly [number, number];

export interface FlarePlacement {
  readonly canvasToLogo: Point;
  readonly logoCenter: Point;
  readonly logoScale: Point;
}

export interface LogoRaster {
  readonly height: number;
  readonly upload: (gpu: Gpu, texture: GPUTexture) => void;
  readonly width: number;
}

interface FlareTargets {
  readonly rim: Target;
  readonly rimA: Target;
  readonly rimB: Target;
  readonly scene: Target;
}

interface FrameEffects {
  readonly composite: Effect;
  readonly logo: Effect;
  readonly rim: Effect;
  readonly rimBlurH: Effect;
  readonly rimBlurV: Effect;
}

interface BoundLogo extends LogoRaster {
  readonly placement: FlarePlacement;
  readonly texture: GPUTexture;
}

// Fullscreen triangle vertex shader for top-left origin coordinates
const TOP_LEFT_FULLSCREEN_VERTEX = `
struct FlareFullscreenVertexOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn flare_fullscreen_vs(@builtin(vertex_index) vertexIndex: u32) -> FlareFullscreenVertexOut {
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0),
  );
  let uvs = array<vec2f, 3>(
    vec2f(0.0, 1.0),
    vec2f(2.0, 1.0),
    vec2f(0.0, -1.0),
  );
  var output: FlareFullscreenVertexOut;
  output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
  output.uv = uvs[vertexIndex];
  return output;
}
`;

const GLYPH_CENTER_IN_BOX: Point = [(48 + 256.5) / 514, (88 + 270) / 624];
const LOGO_HEIGHT_RATIO = 0.62;
const MAX_RENDER_WIDTH = 1920;
const PULSE_TRANSITION_SECONDS = 2;
const PULSE_FLOOR = 0.2;
const FLARE_COLOR = [180 / 255, 255 / 255, 130 / 255] as const;
const BLUR_CENTER_WEIGHT = 0.0799404796215474;
const BLUR_TAPS = [
  [1.48500449838059, 0.15215191554518462, 0, 0],
  [3.4650570548417856, 0.12482060361420404, 0, 0],
  [5.445220764892785, 0.08739756064091182, 0, 0],
  [7.42555748318834, 0.052228984400379486, 0, 0],
  [9.406126897065857, 0.026638884372877224, 0, 0],
  [11.386985823860664, 0.011595876612829572, 0, 0],
  [13.368187582263898, 0.004307876491458321, 0, 0],
  [15, 0.0008880585113811997, 0, 0],
] as const;

export const LOGO_CENTER: Point = [0.5, 0.5];

const bestEffort = (cleanup: () => void): void => {
  try {
    cleanup();
  } catch {
    // Cleanup must not replace the active construction or render failure.
  }
};

export const runCleanups = (cleanups: readonly (() => void)[]): void => {
  let primary: unknown;
  let failed = false;
  for (const cleanup of cleanups) {
    try {
      cleanup();
    } catch (error) {
      if (!failed) {
        primary = error;
      }
      failed = true;
    }
  }
  if (failed) {
    throw primary;
  }
};

const fullscreen = (shader: string | { readonly wgsl: string }): string => {
  const source = typeof shader === "string" ? shader : shader.wgsl;
  return `${TOP_LEFT_FULLSCREEN_VERTEX}\n${source}`;
};

const padTextureRows = (
  data: Uint8Array<ArrayBuffer>,
  sourceBytesPerRow: number,
  destinationBytesPerRow: number,
  height: number
): Uint8Array<ArrayBuffer> => {
  const padded = new Uint8Array(destinationBytesPerRow * height);
  for (let row = 0; row < height; row += 1) {
    const sourceOffset = row * sourceBytesPerRow;
    padded.set(
      data.subarray(sourceOffset, sourceOffset + sourceBytesPerRow),
      row * destinationBytesPerRow
    );
  }
  return padded;
};

const createBlueNoiseTexture = (gpu: Gpu): GPUTexture => {
  const texture = gpu.gpu.createTexture({
    format: "r8unorm",
    label: "avin-flare-blue-noise-128",
    size: [BLUE_NOISE_SIZE, BLUE_NOISE_SIZE],
    usage: 6,
  });
  try {
    const bytesPerRow = 256;
    gpu.gpu.queue.writeTexture(
      { texture },
      padTextureRows(
        blueNoiseBytes(),
        BLUE_NOISE_SIZE,
        bytesPerRow,
        BLUE_NOISE_SIZE
      ),
      { bytesPerRow, rowsPerImage: BLUE_NOISE_SIZE },
      [BLUE_NOISE_SIZE, BLUE_NOISE_SIZE]
    );
    return texture;
  } catch (error) {
    bestEffort(() => texture.destroy());
    throw error;
  }
};

const createTargets = (
  gpu: Gpu,
  size: Point,
  supersample: number,
  owned: (() => void)[]
): FlareTargets => {
  const own = (value: Target) => {
    owned.push(() => value.color.destroy());
    return value;
  };
  const full = { format: "rgba8unorm" as const, size };
  return {
    rim: own(target(gpu, full)),
    rimA: own(target(gpu, full)),
    rimB: own(target(gpu, full)),
    scene: own(
      target(gpu, {
        format: "rgba8unorm",
        size: [size[0] * supersample, size[1] * supersample],
      })
    ),
  };
};

const targetCleanups = (targets: FlareTargets): (() => void)[] =>
  Object.values(targets).map((value) => () => value.color.destroy());

const pulseHash = (index: number): number => {
  const value = Math.sin(index * 127.1 + 311.7) * 43_758.5453;
  return value - Math.floor(value);
};

const lightPulse = (timeSeconds: number): number => {
  let remaining = Math.max(timeSeconds, 0);
  let index = 0;
  let on = true;
  for (;;) {
    const hold = index === 0 ? 6 : 3 + pulseHash(index) * 3;
    if (remaining < hold) {
      return on ? 1 : PULSE_FLOOR;
    }
    remaining -= hold;
    if (remaining < PULSE_TRANSITION_SECONDS) {
      const progress = remaining / PULSE_TRANSITION_SECONDS;
      const eased = progress * progress * (3 - 2 * progress);
      const raw = on ? 1 - eased : eased;
      return PULSE_FLOOR + (1 - PULSE_FLOOR) * raw;
    }
    remaining -= PULSE_TRANSITION_SECONDS;
    on = !on;
    index += 1;
  }
};

export const backingDimensions = (
  width: number,
  height: number,
  dpr: number
): Point => {
  const pixelRatio = Math.min(
    Math.max(dpr, 1),
    1.75,
    MAX_RENDER_WIDTH / Math.max(width, 1)
  );
  return [
    Math.max(1, Math.floor(width * pixelRatio)),
    Math.max(1, Math.floor(height * pixelRatio)),
  ];
};

export const logoPixelSize = (size: number): [number, number] => {
  const aspect = 514 / 624;
  const height = size * LOGO_HEIGHT_RATIO;
  return [
    Math.max(1, Math.round(height * aspect)),
    Math.max(1, Math.round(height)),
  ];
};

export const centeredPlacement = (
  width: number,
  height: number,
  reference: number
): FlarePlacement => {
  const [logoWidth, logoHeight] = logoPixelSize(reference);
  const logoCenter: Point = [
    0.5 - (GLYPH_CENTER_IN_BOX[0] - 0.5) * (logoWidth / width),
    0.5 - (GLYPH_CENTER_IN_BOX[1] - 0.5) * (logoHeight / height),
  ];
  return {
    canvasToLogo: [width / reference, height / reference],
    logoCenter,
    logoScale: [logoWidth / width, logoHeight / height],
  };
};

export const mapAutonomousLight = (
  timeSeconds: number,
  placement: FlarePlacement
): Point => {
  const phase = timeSeconds * 0.32;
  const radius = 0.34 + 0.09 * Math.sin(phase * 0.83);
  const local: Point = [
    0.5 + Math.cos(phase) * radius * 1.1,
    0.5 - Math.sin(phase) * radius * 0.85,
  ];
  return [
    placement.logoCenter[0] + (local[0] - 0.5) / placement.canvasToLogo[0],
    placement.logoCenter[1] + (local[1] - 0.5) / placement.canvasToLogo[1],
  ];
};

export const followLight = (
  current: Point,
  targetPoint: Point,
  dt: number
): Point => {
  const alpha = 1 - Math.exp(-Math.min(Math.max(dt, 0), 0.05) / 0.3);
  return [
    current[0] + (targetPoint[0] - current[0]) * alpha,
    current[1] + (targetPoint[1] - current[1]) * alpha,
  ];
};

export const canvasRaster = (canvas: HTMLCanvasElement): LogoRaster => ({
  height: canvas.height,
  upload: (gpu, texture) => {
    gpu.gpu.queue.copyExternalImageToTexture({ source: canvas }, { texture }, [
      canvas.width,
      canvas.height,
    ]);
  },
  width: canvas.width,
});

export const rgbaRaster = (
  data: Uint8Array<ArrayBuffer>,
  width: number,
  height: number
): LogoRaster => ({
  height,
  upload: (gpu, texture) => {
    const bytesPerRow = Math.ceil((width * 4) / 256) * 256;
    const upload =
      bytesPerRow === width * 4
        ? data
        : padTextureRows(data, width * 4, bytesPerRow, height);
    gpu.gpu.queue.writeTexture(
      { texture },
      upload,
      { bytesPerRow, rowsPerImage: height },
      [width, height]
    );
  },
  width,
});

export class FlarePipeline {
  private readonly gpu: Gpu;
  private readonly output: Target;
  private readonly sampler: GPUSampler;
  private readonly blueNoise: GPUTexture;
  private readonly effects: FrameEffects;
  private targets: FlareTargets | undefined;
  private logo: BoundLogo | undefined;
  private size: Point = [1, 1];
  private supersample = 1;
  private disposed = false;

  constructor(gpu: Gpu, output: Target) {
    this.gpu = gpu;
    this.output = output;
    this.sampler = sampler(gpu, {
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      magFilter: "linear",
      minFilter: "linear",
    });
    this.blueNoise = createBlueNoiseTexture(gpu);
    try {
      this.effects = {
        composite: effect(gpu, fullscreen(compositeWgsl), {
          label: "avin-flare-composite",
        }),
        logo: effect(gpu, fullscreen(logoWgsl), { label: "avin-flare-logo" }),
        rim: effect(gpu, fullscreen(rimWgsl), { label: "avin-flare-rim" }),
        rimBlurH: effect(gpu, fullscreen(blurWgsl), {
          label: "avin-flare-rim-horizontal",
        }),
        rimBlurV: effect(gpu, fullscreen(blurWgsl), {
          label: "avin-flare-rim-vertical",
        }),
      };
    } catch (error) {
      bestEffort(() => this.blueNoise.destroy());
      throw error;
    }
  }

  async replace(
    size: Point,
    supersample: number,
    raster: LogoRaster,
    isStale: () => boolean = () => false
  ): Promise<FlarePlacement | undefined> {
    if (this.disposed) {
      return;
    }
    const nextSize = size.map((value) => Math.max(1, Math.floor(value))) as [
      number,
      number,
    ];
    const rebuild =
      !this.targets ||
      nextSize[0] !== this.size[0] ||
      nextSize[1] !== this.size[1] ||
      supersample !== this.supersample;
    const candidate: (() => void)[] = [];

    try {
      const nextTargets = rebuild
        ? createTargets(this.gpu, nextSize, supersample, candidate)
        : this.targets;
      if (!nextTargets) {
        return;
      }
      const nextTexture = this.gpu.gpu.createTexture({
        format: "rgba8unorm",
        label: "avin-flare-logo-raster",
        size: [raster.width, raster.height],
        usage: 22,
      });
      candidate.push(() => nextTexture.destroy());
      raster.upload(this.gpu, nextTexture);
      if (!this.targets) {
        await this.compile(nextTargets);
      }
      if (this.disposed || isStale()) {
        return;
      }

      const placement = centeredPlacement(
        nextSize[0],
        nextSize[1],
        Math.min(nextSize[0], nextSize[1])
      );
      const nextLogo: BoundLogo = {
        ...raster,
        placement,
        texture: nextTexture,
      };
      const previousTargets = this.targets;
      const previousLogo = this.logo;
      const previousOutputSize = [...this.output.size] as [number, number];

      try {
        this.output.resize(nextSize);
        this.bindTargets(nextTargets);
        this.bindLogo(nextLogo);
      } catch (error) {
        bestEffort(() => this.output.resize(previousOutputSize));
        if (previousTargets) {
          bestEffort(() => this.bindTargets(previousTargets));
        }
        if (previousLogo) {
          bestEffort(() => this.bindLogo(previousLogo));
        }
        throw error;
      }

      this.targets = nextTargets;
      this.logo = nextLogo;
      this.size = nextSize;
      this.supersample = supersample;
      candidate.length = 0;
      runCleanups([
        ...(rebuild && previousTargets ? targetCleanups(previousTargets) : []),
        ...(previousLogo ? [() => previousLogo.texture.destroy()] : []),
      ]);
      return placement;
    } finally {
      for (const cleanup of candidate) {
        bestEffort(cleanup);
      }
    }
  }

  setFrameUniforms(
    placement: FlarePlacement,
    light: Point,
    frameIndex: number,
    timeSeconds: number,
    pulseHold: number
  ): void {
    if (!this.targets) {
      return;
    }
    const blurTexel: Point = [
      1 / this.targets.rimA.size[0],
      1 / this.targets.rimA.size[1],
    ];
    this.effects.logo.set({
      params: {
        logoCenter: placement.logoCenter,
        logoScale: placement.logoScale,
      },
    });
    this.effects.rim.set({
      params: {
        aspect: placement.canvasToLogo,
        light,
        sceneTexel: [1 / this.size[0], 1 / this.size[1]],
        spotReach: 0.5,
        spotStroke: 0.9,
      },
    });
    const blurParams = {
      centerWeight: BLUR_CENTER_WEIGHT,
      tapCount: BLUR_TAPS.length,
      taps: BLUR_TAPS,
      texelSize: blurTexel,
    };
    this.effects.rimBlurH.set({
      params: { ...blurParams, direction: [blurTexel[0], 0] },
    });
    this.effects.rimBlurV.set({
      params: { ...blurParams, direction: [0, blurTexel[1]] },
    });
    const pulse = lightPulse(timeSeconds);
    const attenuation = pulse + (1 - pulse) * pulseHold;
    this.effects.composite.set({
      params: {
        aspect: placement.canvasToLogo,
        beamIntensity: 0.8 * attenuation,
        extension: 0.6,
        filmGrain: 0.03,
        flareColor: FLARE_COLOR,
        frameIndex,
        light,
        logoCenter: placement.logoCenter,
        logoOpacity: 1,
        rimFill: 1,
        rimIntensity: attenuation,
        scatter: 1,
        smoothness: 1,
        spotFocus: 0.08,
        verticalEdgeFade: 0.1,
      },
    });
  }

  draw(staticDirty: boolean): void {
    const { targets } = this;
    if (!targets || this.disposed) {
      return;
    }
    frame(this.gpu, (currentFrame) => {
      if (staticDirty) {
        currentFrame.pass(targets.scene, this.effects.logo);
      }
      currentFrame.pass(targets.rim, this.effects.rim);
      currentFrame.pass(targets.rimA, this.effects.rimBlurH);
      currentFrame.pass(targets.rimB, this.effects.rimBlurV);
      currentFrame.pass(this.output, this.effects.composite);
    });
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    const currentLogo = this.logo;
    runCleanups([
      () => this.blueNoise.destroy(),
      ...(currentLogo ? [() => currentLogo.texture.destroy()] : []),
      ...(this.targets ? targetCleanups(this.targets) : []),
    ]);
  }

  private async compile(targets: FlareTargets): Promise<void> {
    const attempts = [
      this.effects.logo.compile(targets.scene),
      this.effects.rim.compile(targets.rim),
      this.effects.rimBlurH.compile(targets.rimA),
      this.effects.rimBlurV.compile(targets.rimB),
      this.effects.composite.compile({
        colors: [this.output.format],
        sampleCount: this.output.sampleCount,
      }),
    ];
    const results = await Promise.allSettled(attempts);
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") {
      throw failure.reason;
    }
  }

  private bindTargets(targets: FlareTargets): void {
    this.effects.rim.set({
      linearSampler: this.sampler,
      sceneTexture: targets.scene,
    });
    this.effects.rimBlurH.set({
      linearSampler: this.sampler,
      sourceTexture: targets.rim,
    });
    this.effects.rimBlurV.set({
      linearSampler: this.sampler,
      sourceTexture: targets.rimA,
    });
    this.effects.composite.set({
      blueNoiseTexture: this.blueNoise,
      linearSampler: this.sampler,
      rimBlurTexture: targets.rimB,
      rimTexture: targets.rim,
      sceneTexture: targets.scene,
    });
  }

  private bindLogo(logo: BoundLogo): void {
    const pad = 3;
    this.effects.logo.set({
      logoSampler: this.sampler,
      logoTexture: logo.texture,
      params: {
        _pad: 0,
        edge: 1.1,
        logoCenter: logo.placement.logoCenter,
        logoScale: logo.placement.logoScale,
        uvInset: [pad / logo.width, pad / logo.height],
      },
    });
  }
}
