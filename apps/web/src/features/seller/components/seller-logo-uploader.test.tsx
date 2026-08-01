import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SellerLogoUploader } from "./seller-logo-uploader";

const { resetUpload, uploadAsync } = vi.hoisted(() => ({
  resetUpload: vi.fn(),
  uploadAsync: vi.fn(),
}));

vi.mock("@avin/env/web", () => ({
  env: {
    VITE_SERVER_URL: "http://localhost:3000",
    VITE_SUPABASE_URL: "https://example.supabase.co",
  },
}));

vi.mock("@better-upload/client", () => ({
  useUploadFile: () => ({
    isPending: false,
    progress: undefined,
    reset: resetUpload,
    uploadAsync,
  }),
}));

vi.mock("@avin/ui/components/file-dropzone", () => ({
  FileDropzone: ({
    inputLabel,
    onFilesSelected,
    renderTrigger,
  }: {
    inputLabel: string;
    onFilesSelected: (files: File[]) => void;
    renderTrigger?: (props: { open: () => void }) => ReactNode;
  }) => (
    <div>
      <input
        aria-label={inputLabel}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onFilesSelected([file]);
          }
        }}
        type="file"
      />
      {renderTrigger?.({ open: () => undefined })}
    </div>
  ),
}));

describe("SellerLogoUploader", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("uploads the selected file and returns its public media URL", async () => {
    uploadAsync.mockResolvedValue({
      file: {
        objectInfo: {
          key: "sellers/seller_123/logo/logo.png",
        },
      },
    });
    const onLogoChange = vi.fn();
    const user = userEvent.setup();

    render(
      <SellerLogoUploader fileName="" logoUrl="" onLogoChange={onLogoChange} />
    );

    const file = new File(["logo"], "logo.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Chọn logo gian hàng"), file);

    expect(uploadAsync).toHaveBeenCalledWith(file, { metadata: {} });
    expect(onLogoChange).toHaveBeenCalledWith({
      name: "logo.png",
      url: "https://example.supabase.co/storage/v1/object/public/public-media/sellers/seller_123/logo/logo.png",
    });
  });

  it("shows only icon controls when a logo already exists", () => {
    render(
      <SellerLogoUploader
        fileName="logo.png"
        logoUrl="https://example.supabase.co/logo.png"
        onLogoChange={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Thay logo" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Xóa logo" })).toBeVisible();
    expect(screen.queryByText("Chọn logo")).not.toBeInTheDocument();
  });
});
