import { getErrorMessage } from "@/utils/get-error-message";

const PUBLISH_ERROR_MESSAGES: Record<string, string> = {
  "A Service listing must define at least one package before publishing":
    "Thêm ít nhất một gói giá trước khi đăng bán dịch vụ.",
  "A Service listing must have at least one package":
    "Thêm ít nhất một gói giá trước khi đăng bán dịch vụ.",
  "A published Service listing must have an available package":
    "Bật trạng thái khả dụng cho ít nhất một gói giá trước khi đăng bán.",
  "Listing category must be active":
    "Danh mục sản phẩm đã bị ẩn hoặc ngừng hoạt động. Vui lòng chọn danh mục khác.",
  "Seller access is not available for this account":
    "Tài khoản người bán chưa đủ điều kiện để đăng bán. Vui lòng kiểm tra trạng thái duyệt, thỏa thuận người bán hoặc trạng thái tài khoản.",
  "Store profile must be complete before publishing a listing":
    "Hoàn tất hồ sơ gian hàng (tên, địa chỉ, mô tả và ảnh đại diện) trước khi đăng bán.",
};

export const getListingPublicationErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  const message = getErrorMessage(error, fallback);
  return PUBLISH_ERROR_MESSAGES[message] ?? message;
};
