const capitalizeFirst = (str: string): string =>
  str.length > 0 ? str.charAt(0).toUpperCase() + str.slice(1) : str;

export const formatNotificationTitle = (title: string): string => {
  if (title === "Cập nhật OrderItem") {
    return "Cập nhật đơn hàng";
  }
  if (title === "Dispute mới cần xử lý") {
    return "Khiếu nại mới cần xử lý";
  }
  if (title === "OrderItem đã được giao") {
    return "Sản phẩm đã được bàn giao";
  }
  if (title === "Buyer đã xác nhận giao hàng") {
    return "Đã xác nhận nhận hàng";
  }
  const formatted = title
    .replaceAll(/\bOrderItem\b/gu, "Đơn hàng")
    .replaceAll(/\borderItem\b/gu, "đơn hàng")
    .replaceAll(/\bDispute\b/gu, "Khiếu nại")
    .replaceAll(/\bBuyer\b/gu, "Người mua")
    .replaceAll(/\bSeller\b/gu, "Người bán");
  return capitalizeFirst(formatted);
};

export const formatNotificationText = (text: string): string => {
  const formatted = text
    .replaceAll(/\bOrderItem\b/gu, "Đơn hàng")
    .replaceAll(/\borderItem\b/gu, "đơn hàng")
    .replaceAll(/\bIN_PROGRESS\b/gu, "Đang xử lý")
    .replaceAll(/\bAWAITING_SELLER\b/gu, "Chờ người bán xác nhận")
    .replaceAll(/\bDELIVERED\b/gu, "Đã bàn giao")
    .replaceAll(/\bIN_WARRANTY\b/gu, "Đang bảo hành")
    .replaceAll(/\bCLOSED\b/gu, "Hoàn tất")
    .replaceAll(/\bCANCELLED\b/gu, "Đã hủy")
    .replaceAll(/\bREFUNDED\b/gu, "Đã hoàn tiền")
    .replaceAll(/\bDISPUTED\b/gu, "Đang khiếu nại")
    .replaceAll(/\bBuyer\b/gu, "Người mua")
    .replaceAll(/\bSeller\b/gu, "Người bán")
    .replaceAll(/\bDispute\b/gu, "Khiếu nại")
    .replaceAll(/\bDeliverySubmission\b/gu, "thông tin bàn giao")
    .replaceAll(/\bSeller Enforcement\b/gu, "xử lý vi phạm gian hàng");
  return capitalizeFirst(formatted);
};
