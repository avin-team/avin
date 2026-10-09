import { Button } from "@avin/ui/components/button";
import { Input } from "@avin/ui/components/input";
import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";

export interface QuantityStepperProps {
  ariaLabel?: string;
  disabled?: boolean;
  min?: number;
  onChange: (value: number) => void;
  size?: "default" | "sm";
  value: number;
}

export const QuantityStepper = ({
  ariaLabel = "Số lượng",
  disabled = false,
  min = 1,
  onChange,
  size = "default",
  value,
}: QuantityStepperProps) => {
  const [prevValue, setPrevValue] = useState(value);
  const [localValue, setLocalValue] = useState(String(value));

  if (prevValue !== value) {
    setPrevValue(value);
    setLocalValue(String(value));
  }

  const commitValue = (valStr: string) => {
    const parsed = Math.trunc(Number(valStr));
    const nextVal = Number.isNaN(parsed) || parsed < min ? min : parsed;
    setLocalValue(String(nextVal));
    if (nextVal !== value) {
      onChange(nextVal);
    }
  };

  const isSmall = size === "sm";

  return (
    <div
      className={`flex items-center ${
        isSmall ? "rounded-lg shadow-2xs" : "rounded-xl shadow-xs"
      } border border-input bg-background`}
    >
      <Button
        aria-label={`Giảm ${ariaLabel}`}
        className={
          isSmall
            ? "h-7 w-7 rounded-r-none rounded-l-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            : "h-9 w-9 rounded-r-none rounded-l-xl text-muted-foreground hover:bg-muted hover:text-foreground"
        }
        disabled={disabled || value <= min}
        onClick={() => commitValue(String(value - 1))}
        size={isSmall ? "icon-xs" : "icon"}
        type="button"
        variant="ghost"
      >
        <MinusIcon className={isSmall ? "size-3" : "size-3.5"} />
      </Button>
      <Input
        aria-label={ariaLabel}
        className={
          isSmall
            ? "h-7 w-12 rounded-none border-0 bg-transparent text-center font-bold text-xs shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            : "h-9 w-full rounded-none border-0 bg-transparent text-center font-bold text-sm shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        }
        disabled={disabled}
        min={min}
        onBlur={() => commitValue(localValue)}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commitValue(localValue);
          }
        }}
        type="number"
        value={localValue}
      />
      <Button
        aria-label={`Tăng ${ariaLabel}`}
        className={
          isSmall
            ? "h-7 w-7 rounded-l-none rounded-r-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            : "h-9 w-9 rounded-l-none rounded-r-xl text-muted-foreground hover:bg-muted hover:text-foreground"
        }
        disabled={disabled}
        onClick={() => commitValue(String(value + 1))}
        size={isSmall ? "icon-xs" : "icon"}
        type="button"
        variant="ghost"
      >
        <PlusIcon className={isSmall ? "size-3" : "size-3.5"} />
      </Button>
    </div>
  );
};
