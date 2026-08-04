import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ListingImageUploader } from "./listing-image-uploader";

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
  useUploadFiles: () => ({
    averageProgress: undefined,
    failedFiles: [],
    hasFailedFiles: false,
    isPending: false,
    progresses: [],
    reset: resetUpload,
    uploadAsync,
  }),
}));

vi.mock("./listing-image-validation", () => ({
  validateListingImage: vi.fn().mockResolvedValue(null),
}));

vi.mock("@avin/ui/components/file-dropzone", () => ({
  FileDropzone: ({
    className,
    inputLabel,
    label,
    multiple,
    onFilesSelected,
  }: {
    className?: string;
    inputLabel: string;
    label?: string;
    multiple?: boolean;
    onFilesSelected: (files: File[]) => void;
  }) => (
    <div className={className} data-testid="file-dropzone">
      <input
        aria-label={inputLabel}
        multiple={multiple}
        onChange={(event) => {
          onFilesSelected([...(event.target.files ?? [])]);
        }}
        type="file"
      />
      <span>{label}</span>
    </div>
  ),
}));

const completeUpload = (file: File, key: string) => ({
  objectInfo: { key },
  raw: file,
});

describe("ListingImageUploader", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the add-image dropzone as the final grid tile", () => {
    render(
      <ListingImageUploader
        disabled={false}
        images={["https://example.com/cover.png"]}
        listingId="listing-1"
        onDirty={vi.fn()}
        onImageChange={vi.fn()}
        thumbnailUrl="https://example.com/cover.png"
      />
    );

    expect(screen.getByTestId("file-dropzone")).toHaveClass(
      "aspect-video",
      "min-h-0"
    );
    expect(screen.getByText("Thêm ảnh")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Thêm ảnh" })
    ).not.toBeInTheDocument();
  });

  it("appends a batch of uploaded images in selection order", async () => {
    const firstExistingImage = "https://example.com/cover.png";
    const secondExistingImage = "https://example.com/second.png";
    const firstFile = new File(["first"], "first.png", {
      type: "image/png",
    });
    const secondFile = new File(["second"], "second.webp", {
      type: "image/webp",
    });
    uploadAsync.mockResolvedValue({
      failedFiles: [],
      files: [
        completeUpload(firstFile, "listings/listing-1/thumbnail/1.png"),
        completeUpload(secondFile, "listings/listing-1/thumbnail/2.webp"),
      ],
    });
    const onImageChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ListingImageUploader
        disabled={false}
        images={[firstExistingImage, secondExistingImage]}
        listingId="listing-1"
        onDirty={vi.fn()}
        onImageChange={onImageChange}
        thumbnailUrl={firstExistingImage}
      />
    );

    await user.upload(screen.getByLabelText("Chọn ảnh sản phẩm"), [
      firstFile,
      secondFile,
    ]);

    expect(uploadAsync).toHaveBeenCalledWith([firstFile, secondFile], {
      metadata: { listingId: "listing-1" },
    });
    expect(onImageChange).toHaveBeenLastCalledWith({
      images: [
        firstExistingImage,
        secondExistingImage,
        "https://example.supabase.co/storage/v1/object/public/public-media/listings/listing-1/thumbnail/1.png",
        "https://example.supabase.co/storage/v1/object/public/public-media/listings/listing-1/thumbnail/2.webp",
      ],
      thumbnailUrl: firstExistingImage,
    });
  });

  it("reorders images and promotes the next image when the cover is removed", async () => {
    const images = [
      "https://example.com/one.png",
      "https://example.com/two.png",
    ];
    const onImageChange = vi.fn();
    const user = userEvent.setup();

    const view = render(
      <ListingImageUploader
        disabled={false}
        images={images}
        listingId="listing-1"
        onDirty={vi.fn()}
        onImageChange={onImageChange}
        thumbnailUrl={images[0]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Đưa ảnh 2 lên" }));
    expect(onImageChange).toHaveBeenLastCalledWith({
      images: [images[1], images[0]],
      thumbnailUrl: images[1],
    });

    view.rerender(
      <ListingImageUploader
        disabled={false}
        images={[images[1], images[0]]}
        listingId="listing-1"
        onDirty={vi.fn()}
        onImageChange={onImageChange}
        thumbnailUrl={images[1]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Xóa ảnh 1" }));
    expect(onImageChange).toHaveBeenLastCalledWith({
      images: [images[0]],
      thumbnailUrl: images[0],
    });
  });

  it("keeps a failed upload available for retry or dismissal", async () => {
    const file = new File(["failed"], "failed.png", { type: "image/png" });
    uploadAsync.mockResolvedValueOnce({
      failedFiles: [{ error: new Error("Storage unavailable"), raw: file }],
      files: [],
    });
    const onImageChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ListingImageUploader
        disabled={false}
        images={[]}
        listingId="listing-1"
        onDirty={vi.fn()}
        onImageChange={onImageChange}
        thumbnailUrl=""
      />
    );

    await user.upload(screen.getByLabelText("Chọn ảnh sản phẩm"), file);
    expect(screen.getByText("Storage unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: `Bỏ ảnh lỗi ${file.name}` })
    );
    expect(screen.queryByText("Storage unavailable")).not.toBeInTheDocument();
  });

  it("offers undo after removing an image", async () => {
    const images = [
      "https://example.com/one.png",
      "https://example.com/two.png",
    ];
    const onImageChange = vi.fn();
    const user = userEvent.setup();
    const view = render(
      <ListingImageUploader
        disabled={false}
        images={images}
        listingId="listing-1"
        onDirty={vi.fn()}
        onImageChange={onImageChange}
        thumbnailUrl={images[0]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Xóa ảnh 1" }));
    view.rerender(
      <ListingImageUploader
        disabled={false}
        images={[images[1]]}
        listingId="listing-1"
        onDirty={vi.fn()}
        onImageChange={onImageChange}
        thumbnailUrl={images[1]}
      />
    );
    await user.click(screen.getByRole("button", { name: "Hoàn tác" }));

    expect(onImageChange).toHaveBeenLastCalledWith({
      images,
      thumbnailUrl: images[0],
    });
  });
});
