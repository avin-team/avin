import { cn } from "@avin/ui/lib/utils";
import { NumberField } from "@base-ui/react/number-field";
import { Minus, Plus } from "lucide-react";
import * as React from "react";

import { inputStyles } from "./input";

type NumberInputProps = React.ComponentProps<typeof NumberField.Root> & {
  decrementLabel?: string;
  incrementLabel?: string;
  inputClassName?: string;
  inputProps?: React.ComponentProps<typeof NumberField.Input>;
  placeholder?: string;
};

function NumberInput({
  "aria-invalid": ariaInvalid,
  className,
  decrementLabel = "Giảm",
  incrementLabel = "Tăng",
  inputClassName,
  inputProps,
  placeholder,
  ...props
}: NumberInputProps) {
  const {
    "aria-invalid": inputAriaInvalid,
    className: inputPropsClassName,
    placeholder: inputPlaceholder,
    ...restInputProps
  } = inputProps ?? {};

  return (
    <NumberField.Root className={cn("w-full", className)} {...props}>
      <NumberField.Group className="relative w-full">
        <NumberField.Input
          {...restInputProps}
          aria-invalid={ariaInvalid ?? inputAriaInvalid}
          className={cn(
            inputStyles,
            "pr-20",
            inputPropsClassName,
            inputClassName
          )}
          placeholder={placeholder ?? inputPlaceholder}
        />
        <div className="absolute inset-y-1 right-1 flex items-center gap-1">
          <NumberField.Decrement
            aria-label={decrementLabel}
            className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
          >
            <Minus aria-hidden="true" className="size-3.5" />
          </NumberField.Decrement>
          <NumberField.Increment
            aria-label={incrementLabel}
            className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
          >
            <Plus aria-hidden="true" className="size-3.5" />
          </NumberField.Increment>
        </div>
      </NumberField.Group>
    </NumberField.Root>
  );
}

export { NumberInput };
