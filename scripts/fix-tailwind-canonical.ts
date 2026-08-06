import { readFileSync, writeFileSync } from "node:fs";

// Matches patterns like min-w-[240px], w-[190px], h-[20px], p-[8px], m-[12px], gap-[16px], etc.
// where pixel value is divisible by 2 (allowing whole numbers and half-steps like 47.5).
const CANONICAL_REGEX =
  /\b(?<prefix>w|h|min-w|min-h|max-w|max-h|p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|top|right|bottom|left|inset|inset-x|inset-y|space-x|space-y|translate-x|translate-y)-\[(?<pxValue>\d+)px\]/gu;

// Matches arbitrary decimal opacity patterns like bg-primary/[0.03], text-black/[0.5], etc.
const OPACITY_REGEX = /\b(?<prefix>[a-z0-9-]+)\/\[(?<dec>0\.\d+)\]/gu;

const fixFile = (filePath: string): void => {
  const content = readFileSync(filePath, "utf-8");
  let replacedCount = 0;

  let newContent = content.replace(
    CANONICAL_REGEX,
    (_match, prefix, pxValueStr) => {
      const px = Number(pxValueStr);
      if (px > 0 && px % 2 === 0) {
        const canonicalScale = px / 4;
        replacedCount += 1;
        return `${prefix}-${canonicalScale}`;
      }
      return _match;
    }
  );

  newContent = newContent.replace(OPACITY_REGEX, (_match, prefix, decStr) => {
    const dec = Number(decStr);
    const percent = Math.round(dec * 100);
    if (percent > 0 && percent < 100 && Math.abs(dec * 100 - percent) < 1e-6) {
      replacedCount += 1;
      return `${prefix}/${percent}`;
    }
    return _match;
  });

  if (replacedCount > 0) {
    writeFileSync(filePath, newContent, "utf-8");
    console.log(
      `[Tailwind Fix] Replaced ${replacedCount} canonical Tailwind class(es) in ${filePath}`
    );
  }
};

const main = async (): Promise<void> => {
  const glob = new Bun.Glob("{apps,packages}/**/*.{tsx,jsx,html}");
  for await (const file of glob.scan(".")) {
    if (
      !file.includes("node_modules") &&
      !file.includes("dist") &&
      !file.includes(".next")
    ) {
      fixFile(file);
    }
  }
};

void main();
