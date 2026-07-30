/**
 * Formats a numeric amount into Vietnamese Dong currency string (e.g. 50.000 ₫).
 */
export const formatVND = (amount: number): string => {
  const formatted = new Intl.NumberFormat("vi-VN").format(amount);
  return `${formatted} ₫`;
};
