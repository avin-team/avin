import {
  LISTING_IMAGE_MIN_HEIGHT,
  LISTING_IMAGE_MIN_WIDTH,
} from "@avin/api/storage";

interface ImageDimensions {
  height: number;
  width: number;
}

const readImageDimensions = async (file: Blob): Promise<ImageDimensions> => {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    try {
      return { height: bitmap.height, width: bitmap.width };
    } finally {
      bitmap.close();
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    return { height: image.naturalHeight, width: image.naturalWidth };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const validateListingImage = async (
  file: Blob
): Promise<string | undefined> => {
  try {
    const { height, width } = await readImageDimensions(file);
    if (width < LISTING_IMAGE_MIN_WIDTH || height < LISTING_IMAGE_MIN_HEIGHT) {
      return `Ảnh phải có kích thước tối thiểu ${LISTING_IMAGE_MIN_WIDTH}×${LISTING_IMAGE_MIN_HEIGHT} px.`;
    }
  } catch {
    return "Không thể đọc kích thước ảnh. Chọn ảnh khác rồi thử lại.";
  }

  return undefined;
};
