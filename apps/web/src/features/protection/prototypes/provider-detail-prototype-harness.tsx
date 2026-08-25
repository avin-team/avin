import { useEffect, useState } from "react";

import { SAMPLE_PROVIDER_DETAIL } from "./mock-detail-data";
import type { ProviderDetailData } from "./mock-detail-data";
import { VariantFocusCertified } from "./variant-focus-certified";
import { VariantFocusClassic } from "./variant-focus-classic";
import { VariantFocusInteractive } from "./variant-focus-interactive";

const VARIANTS = [
  {
    axis: "Exact Match to Reference Mockup",
    description:
      "Chuẩn xác 100% theo bản thiết kế mẫu: 4 ô chỉ số, thẻ ngân hàng viền xanh, checklist an toàn bên phải",
    id: "focus-classic",
    name: "1. Focus Classic (Chuẩn 100%)",
  },
  {
    axis: "Multi-Bank Switcher & VietQR",
    description:
      "Kế thừa mẫu chuẩn + mở rộng bộ chọn nhiều ngân hàng & nút mở VietQR",
    id: "focus-interactive",
    name: "2. Focus Interactive (Nhiều STK & QR)",
  },
  {
    axis: "Proof of Reserve & History Timeline",
    description:
      "Kế thừa mẫu chuẩn + huy hiệu Proof of Reserve & lịch sử nâng hạng phiên bản",
    id: "focus-certified",
    name: "3. Focus Certified (Proof of Reserve)",
  },
] as const;

type VariantId = (typeof VARIANTS)[number]["id"];

export const ProviderDetailPrototypeHarness = ({
  initialVariant = "focus-classic",
  provider = SAMPLE_PROVIDER_DETAIL,
}: {
  initialVariant?: VariantId;
  provider?: ProviderDetailData;
}) => {
  const [selectedVariant, setSelectedVariant] =
    useState<VariantId>(initialVariant);

  // Keyboard shortcut support (1, 2, 3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "1") {
        setSelectedVariant("focus-classic");
      }
      if (e.key === "2") {
        setSelectedVariant("focus-interactive");
      }
      if (e.key === "3") {
        setSelectedVariant("focus-certified");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Floating Variant Picker Toolbar */}
      <aside
        aria-label="Prototype Variant Switcher"
        className="sticky top-0 z-50 border-b border-border/80 bg-background/90 px-4 py-2.5 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#84cc16]/20 px-2 py-0.5 font-bold text-[#84cc16] text-xs uppercase tracking-wider">
              Prototype
            </span>
            <span className="font-semibold text-xs text-foreground">
              Provider Detail Explorer
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/80 bg-muted/40 p-1">
            {VARIANTS.map((v) => (
              <button
                aria-pressed={selectedVariant === v.id}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                  selectedVariant === v.id
                    ? "bg-[#84cc16] text-black shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                key={v.id}
                onClick={() => setSelectedVariant(v.id)}
                type="button"
              >
                {v.name}
              </button>
            ))}
          </div>

          <span className="hidden text-muted-foreground text-xs md:inline">
            Bấm phím{" "}
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.65rem] border">
              1
            </kbd>
            ,{" "}
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.65rem] border">
              2
            </kbd>
            ,{" "}
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.65rem] border">
              3
            </kbd>{" "}
            để chuyển
          </span>
        </div>
      </aside>

      {/* Render Active Variant */}
      <main>
        {selectedVariant === "focus-classic" && (
          <VariantFocusClassic provider={provider} />
        )}
        {selectedVariant === "focus-interactive" && (
          <VariantFocusInteractive provider={provider} />
        )}
        {selectedVariant === "focus-certified" && (
          <VariantFocusCertified provider={provider} />
        )}
      </main>
    </div>
  );
};
