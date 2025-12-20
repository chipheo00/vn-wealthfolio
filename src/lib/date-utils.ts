import type { TFunction } from "i18next";

/**
 * Get the number of months (including fractional) between two dates
 * Uses year and month difference, plus fractional month based on day difference
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of months (with fractional part based on day difference)
 */
export function getMonthsDiff(startDate: Date, endDate: Date): number {
  const yearDiff = endDate.getFullYear() - startDate.getFullYear();
  const monthDiff = endDate.getMonth() - startDate.getMonth();
  const wholeMonths = yearDiff * 12 + monthDiff;

  // Add fractional month based on days
  const daysDiff = endDate.getDate() - startDate.getDate();
  const fractionalMonth = daysDiff / 30; // Use 30 as average days per month

  return wholeMonths + fractionalMonth;
}

/**
 * Format the remaining time until a due date
 * @param dueDate - ISO string or Date object
 * @param t - Optional translation function
 * @returns Formatted string like "4 Years 2 Months" or "3 Months" or "15 Days"
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatTimeRemaining(
  dueDate: string | Date | undefined,
  t?: TFunction<any>,
): string {
  if (!dueDate) return t ? t("time.notSet" as any) : "Not set";

  const now = new Date();
  const targetDate = typeof dueDate === "string" ? new Date(dueDate) : dueDate;

  if (isNaN(targetDate.getTime())) return t ? t("time.invalidDate" as any) : "Invalid date";

  // If date is in the past
  if (targetDate < now) return t ? t("time.overdue" as any) : "Overdue";

  // Calculate difference in milliseconds
  let diff = targetDate.getTime() - now.getTime();

  // Convert to days
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Calculate years, months, and remaining days
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const remainingDays = days % 30;

  const parts: string[] = [];

  if (years > 0) {
    const yearLabel = t
      ? years === 1
        ? t("time.year" as any)
        : t("time.years" as any)
      : years === 1
        ? "Year"
        : "Years";
    parts.push(`${years} ${yearLabel}`);
  }

  if (months > 0) {
    const monthLabel = t
      ? months === 1
        ? t("time.month" as any)
        : t("time.months" as any)
      : months === 1
        ? "Month"
        : "Months";
    parts.push(`${months} ${monthLabel}`);
  }

  if (remainingDays > 0 && years === 0 && months < 3) {
    const dayLabel = t
      ? remainingDays === 1
        ? t("time.day" as any)
        : t("time.days" as any)
      : remainingDays === 1
        ? "Day"
        : "Days";
    parts.push(`${remainingDays} ${dayLabel}`);
  }

  return parts.length > 0 ? parts.join(" ") : t ? t("time.lessThanADay" as any) : "Less than a day";
}

/**
 * Format the elapsed time since a start date
 * @param startDate - ISO string or Date object
 * @returns Formatted string like "4 Years 2 Months" or "Starts in 3 Months"
 */
export function formatTimeElapsed(startDate: string | Date | undefined): string {
  if (!startDate) return "Not set";

  const now = new Date();
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;

  if (isNaN(start.getTime())) return "Invalid date";

  // If start date is in the future
  if (start > now) {
    const diff = start.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);

    if (months > 0) {
      return `Starts in ${months} ${months === 1 ? "Month" : "Months"}`;
    }
    return `Starts in ${days} ${days === 1 ? "Day" : "Days"}`;
  }

  // Calculate difference in milliseconds
  const diff = now.getTime() - start.getTime();

  // Convert to days
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Calculate years, months, and remaining days
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);

  const parts: string[] = [];

  if (years > 0) {
    parts.push(`${years} ${years === 1 ? "Year" : "Years"}`);
  }

  if (months > 0) {
    parts.push(`${months} ${months === 1 ? "Month" : "Months"}`);
  }

  return parts.length > 0 ? parts.join(" ") : "Just started";
}
