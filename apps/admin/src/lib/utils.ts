export const sleep = (ms = 1000): Promise<void> =>
  new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });

/**
 * Generates page numbers for pagination with ellipsis
 * @param currentPage - Current page number (1-based)
 * @param totalPages - Total number of pages
 * @returns Array of page numbers and ellipsis strings
 *
 * Examples:
 * - Small dataset (≤5 pages): [1, 2, 3, 4, 5]
 * - Near beginning: [1, 2, 3, 4, '...', 10]
 * - In middle: [1, '...', 4, 5, 6, '...', 10]
 * - Near end: [1, '...', 7, 8, 9, 10]
 */
export const getPageNumbers = (
  currentPage: number,
  totalPages: number
): (number | string)[] => {
  // Maximum number of page buttons to show
  const maxVisiblePages = 5;
  const rangeWithDots: (number | string)[] = [];

  if (totalPages <= maxVisiblePages) {
    // If total pages is 5 or less, show all pages
    for (let i = 1; i <= totalPages; i += 1) {
      rangeWithDots.push(i);
    }
  } else {
    // Always show first page
    rangeWithDots.push(1);

    if (currentPage <= 3) {
      // Near the beginning: [1] [2] [3] [4] ... [10]
      for (let i = 2; i <= 4; i += 1) {
        rangeWithDots.push(i);
      }
      rangeWithDots.push("...", totalPages);
    } else if (currentPage >= totalPages - 2) {
      // Near the end: [1] ... [7] [8] [9] [10]
      rangeWithDots.push("...");
      for (let i = totalPages - 3; i <= totalPages; i += 1) {
        rangeWithDots.push(i);
      }
    } else {
      // In the middle: [1] ... [4] [5] [6] ... [10]
      rangeWithDots.push("...");
      for (let i = currentPage - 1; i <= currentPage + 1; i += 1) {
        rangeWithDots.push(i);
      }
      rangeWithDots.push("...", totalPages);
    }
  }

  return rangeWithDots;
};

/**
 * Initials from a display name: first character of the first word + first
 * character of the last word. One word only: first two characters. Empty: `?`.
 */
export const getDisplayNameInitials = (displayName: string): string => {
  const parts = displayName.trim().split(/\s+/gu).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return (parts[0]?.slice(0, 2) ?? "").toUpperCase();
  }
  const first = parts[0]?.[0] ?? "";
  const last = parts.at(-1)?.[0] ?? "";
  return (first + last).toUpperCase();
};
