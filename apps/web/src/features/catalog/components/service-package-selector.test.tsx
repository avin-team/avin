import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ServicePackageSelector } from "@/features/catalog/components/service-package-selector";

describe("ServicePackageSelector", () => {
  afterEach(() => {
    cleanup();
  });

  const mockPackages = [
    {
      description: "Package 1 details",
      id: "pkg-1",
      name: "SV4 : Member Beta, Tên ngoại [ 1k-2k / 24 giờ]",
      priceAmount: 23,
      processingTimeHours: 24,
    },
    {
      description: "Package 2 details",
      id: "pkg-2",
      name: "Member ẩn, không hiển thị [5k/ 24 giờ. ]",
      priceAmount: 25_000,
      processingTimeHours: 24,
    },
  ];

  it("renders nothing when packages list is empty", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ServicePackageSelector
        onChange={onChange}
        packages={[]}
        selectedPackageId={null}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders packages with truncated titles, tooltips, and non-wrapping prices", () => {
    const onChange = vi.fn();
    render(
      <ServicePackageSelector
        onChange={onChange}
        packages={mockPackages}
        selectedPackageId="pkg-1"
      />
    );

    const firstPackageTitle = screen.getByText(
      "SV4 : Member Beta, Tên ngoại [ 1k-2k / 24 giờ]"
    );
    expect(firstPackageTitle).toHaveClass("line-clamp-2");
    expect(firstPackageTitle).toHaveClass("min-w-0");

    const priceSpan = screen.getByText("23 ₫");
    expect(priceSpan).toHaveClass("whitespace-nowrap");
    expect(priceSpan).toHaveClass("shrink-0");

    const secondPriceSpan = screen.getByText("25.000 ₫");
    expect(secondPriceSpan).toHaveClass("whitespace-nowrap");
    expect(secondPriceSpan).toHaveClass("shrink-0");
  });

  it("calls onChange when a package is clicked", () => {
    const onChange = vi.fn();
    render(
      <ServicePackageSelector
        onChange={onChange}
        packages={mockPackages}
        selectedPackageId="pkg-1"
      />
    );

    const secondPackageButton = screen.getByRole("button", {
      name: /Member ẩn/iu,
    });
    fireEvent.click(secondPackageButton);

    expect(onChange).toHaveBeenCalledWith("pkg-2");
  });
});
