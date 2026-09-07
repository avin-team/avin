import { useEffect, useRef, useState } from "react";

import { createRenderer } from "./renderer";

interface FlareLogoProps {
  readonly className?: string;
}

export const FlareLogo = ({ className }: FlareLogoProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasWebGpu, setHasWebGpu] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return false;
    }
    return Boolean("gpu" in navigator && navigator.gpu);
  });

  useEffect(() => {
    if (!hasWebGpu) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let disposed = false;
    let renderer: ReturnType<typeof createRenderer> | undefined;

    const start = async () => {
      try {
        renderer = createRenderer({ canvas });
        await renderer.ready;
      } catch (error: unknown) {
        if (!disposed) {
          console.warn(
            "WebGPU initialization failed, falling back to SVG:",
            error
          );
          setHasWebGpu(false);
        }
      }
    };

    void start();

    return () => {
      disposed = true;
      try {
        renderer?.dispose();
      } catch {
        // Quiet cleanup
      }
    };
  }, [hasWebGpu]);

  return (
    <section
      aria-label="Avin Flare Logo"
      className={`relative h-full w-full overflow-hidden bg-black select-none ${className ?? ""}`}
    >
      {hasWebGpu ? (
        <canvas className="block h-full w-full touch-none" ref={canvasRef} />
      ) : (
        <div className="relative flex h-full w-full items-center justify-center bg-black p-2">
          {/* Ambient Glow */}
          <div className="absolute inset-0 rounded-full bg-primary/15 blur-2xl" />
          <svg
            aria-label="Avin Flare Logo Fallback"
            className="relative h-full w-full max-h-full max-w-full drop-shadow-[0_0_20px_rgba(180,255,130,0.4)] transition-transform duration-500 hover:scale-105"
            fill="none"
            viewBox="-48 -88 514 624"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="fallback-a"
                x1="200"
                x2="60"
                y1="40"
                y2="380"
              >
                <stop stopColor="#FFFFFF" />
                <stop offset="0.75" stopColor="#EDEDED" stopOpacity="0.9" />
                <stop offset="1" stopColor="#B4FF82" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="fallback-b"
                x1="270"
                x2="440"
                y1="120"
                y2="530"
              >
                <stop stopColor="#FFFFFF" />
                <stop offset="0.5" stopColor="#EDEDED" stopOpacity="0.85" />
                <stop offset="0.8" stopColor="#EDEDED" stopOpacity="0.3" />
                <stop offset="1" stopColor="#B4FF82" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M48 380L190 40H230L148 235H249L271 280H128L86 380H48Z"
              stroke="url(#fallback-a)"
              strokeWidth="3"
            />
            <path
              d="M252 40L465 495C452 512 436 524 418 534L214 120L252 40Z"
              stroke="url(#fallback-b)"
              strokeWidth="3"
            />
          </svg>
        </div>
      )}
    </section>
  );
};
