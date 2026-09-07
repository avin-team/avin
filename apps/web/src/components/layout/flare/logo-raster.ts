import { logoPixelSize } from "./pipeline";

export const LOGO_SVG =
  '<svg width="514" height="624" viewBox="-48 -88 514 624" fill="none" xmlns="http://www.w3.org/2000/svg">' +
  "<defs>" +
  '<linearGradient id="a" x1="200" y1="40" x2="60" y2="380" gradientUnits="userSpaceOnUse">' +
  '<stop stop-color="#EDEDED"/>' +
  '<stop offset="0.75" stop-color="#EDEDED" stop-opacity="0.9"/>' +
  '<stop offset="1" stop-color="#EDEDED" stop-opacity="0.3"/>' +
  "</linearGradient>" +
  '<linearGradient id="b" x1="270" y1="120" x2="440" y2="530" gradientUnits="userSpaceOnUse">' +
  '<stop stop-color="#EDEDED"/>' +
  '<stop offset="0.5" stop-color="#EDEDED" stop-opacity="0.85"/>' +
  '<stop offset="0.8" stop-color="#EDEDED" stop-opacity="0.3"/>' +
  '<stop offset="1" stop-color="#EDEDED" stop-opacity="0"/>' +
  "</linearGradient>" +
  "</defs>" +
  '<path d="M48 380L190 40H230L148 235H249L271 280H128L86 380H48Z" stroke="url(#a)" stroke-width="2" vector-effect="non-scaling-stroke"/>' +
  '<path d="M252 40L465 495C452 512 436 524 418 534L214 120L252 40Z" stroke="url(#b)" stroke-width="2" vector-effect="non-scaling-stroke"/>' +
  "</svg>";

export const rasterizeLogo = async (
  size: number,
  signal?: AbortSignal
): Promise<HTMLCanvasElement> => {
  if (signal?.aborted) {
    throw new DOMException("Logo rasterization aborted.", "AbortError");
  }
  const [width, height] = logoPixelSize(size);
  const pad = 3;
  const canvas = document.createElement("canvas");
  canvas.width = width + pad * 2;
  canvas.height = height + pad * 2;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create the logo raster canvas.");
  }
  const image = new Image();
  let abort: (() => void) | undefined;
  let handleLoad: (() => void) | undefined;
  let handleError: (() => void) | undefined;

  const loaded = new Promise<void>((resolve, reject) => {
    handleLoad = () => resolve();
    handleError = () =>
      reject(new Error("Could not decode the Avin logo SVG."));
    image.addEventListener("load", handleLoad, { once: true });
    image.addEventListener("error", handleError, { once: true });
    abort = () => {
      if (handleLoad) {
        image.removeEventListener("load", handleLoad);
      }
      if (handleError) {
        image.removeEventListener("error", handleError);
      }
      image.src = "";
      reject(new DOMException("Logo rasterization aborted.", "AbortError"));
    };
    signal?.addEventListener("abort", abort, { once: true });
  });

  if (signal?.aborted) {
    abort?.();
  } else {
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      LOGO_SVG
    )}`;
  }

  try {
    await loaded;
  } finally {
    if (handleLoad) {
      image.removeEventListener("load", handleLoad);
    }
    if (handleError) {
      image.removeEventListener("error", handleError);
    }
    if (abort) {
      signal?.removeEventListener("abort", abort);
    }
  }

  if (signal?.aborted) {
    throw new DOMException("Logo rasterization aborted.", "AbortError");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, pad, pad, width, height);
  return canvas;
};
