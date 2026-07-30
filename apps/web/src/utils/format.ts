const vndFormatter = new Intl.NumberFormat("vi-VN");

/**
 * Formats a numeric amount into Vietnamese Dong currency string (e.g. 50.000 ₫).
 */
export const formatVND = (amount: number): string => {
  const formatted = vndFormatter.format(amount);
  return `${formatted} ₫`;
};
