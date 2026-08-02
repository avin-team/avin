import { cn } from "@avin/ui/lib/utils";
import { NumberField } from "@base-ui/react/number-field";
import * as React from "react";

import { inputStyles } from "./input";

type NumberInputProps = React.ComponentProps<typeof NumberField.Root> & {
  inputClassName?: string;
  inputProps?: React.ComponentProps<typeof NumberField.Input>;
  placeholder?: string;
};

function NumberInput({
  "aria-invalid": ariaInvalid,
  className,
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
          className={cn(inputStyles, inputPropsClassName, inputClassName)}
          placeholder={placeholder ?? inputPlaceholder}
        />
      </NumberField.Group>
    </NumberField.Root>
  );
}

export { NumberInput };
