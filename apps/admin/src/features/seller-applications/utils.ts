const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export const formatApplicationDate = (isoDate: string): string =>
  dateFormatter.format(new Date(isoDate));
