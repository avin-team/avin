import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QuantityStepper } from "@/features/commerce/components/quantity-stepper";

describe("QuantityStepper", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders initial value and handles minus and plus buttons", () => {
    const onChange = vi.fn();
    render(<QuantityStepper onChange={onChange} value={2} />);

    const input = screen.getByRole("spinbutton", { name: "Số lượng" });
    expect(input).toHaveValue(2);

    const minusBtn = screen.getByRole("button", { name: "Giảm Số lượng" });
    const plusBtn = screen.getByRole("button", { name: "Tăng Số lượng" });

    fireEvent.click(plusBtn);
    expect(onChange).toHaveBeenCalledWith(3);

    fireEvent.click(minusBtn);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("disables minus button when value is at min", () => {
    const onChange = vi.fn();
    render(<QuantityStepper min={1} onChange={onChange} value={1} />);

    const minusBtn = screen.getByRole("button", { name: "Giảm Số lượng" });
    expect(minusBtn).toBeDisabled();
  });

  it("allows clearing input and commits clamped min on blur", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<QuantityStepper min={1} onChange={onChange} value={5} />);

    const input = screen.getByRole("spinbutton", { name: "Số lượng" });

    // Backspacing completely
    await user.clear(input);
    expect(input).toHaveValue(null);
    expect(onChange).not.toHaveBeenCalled();

    // Tabbing away blurs and clamps back to min
    await user.tab();
    expect(input).toHaveValue(1);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("commits valid value on Enter key", () => {
    const onChange = vi.fn();
    render(<QuantityStepper onChange={onChange} value={1} />);

    const input = screen.getByRole("spinbutton", { name: "Số lượng" });
    fireEvent.change(input, { target: { value: "50" } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(50);
  });
});
