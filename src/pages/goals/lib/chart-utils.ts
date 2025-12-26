/**
 * Chart Utilities for Goals Module
 * Functions for chart date handling, formatting, and interval generation
 */

import {
    addMonths,
    addWeeks,
    addYears,
    eachMonthOfInterval,
    eachWeekOfInterval,
    eachYearOfInterval,
    endOfMonth,
    endOfWeek,
    endOfYear,
    format,
    isAfter,
    isBefore,
    isEqual,
    startOfDay,
    subMonths,
    subWeeks,
    subYears,
} from "date-fns";
import type { DateRange, TimePeriodOption } from "./goal-types";

// ============================================================================
// DISPLAY CONFIGURATION
// ============================================================================

/**
 * Get display count config for each time period
 * Per documentation:
 * - Weeks: +/- 12 weeks from today
 * - Months: +/- 12 months from today
 * - Years: +/- 3-5 years from today
 */
export function getDisplayCounts(period: Exclude<TimePeriodOption, "all">): { past: number; future: number } {
  switch (period) {
    case "weeks":
      return { past: 12, future: 12 };
    case "months":
      return { past: 12, future: 12 };
    case "years":
      return { past: 3, future: 5 };
    default:
      return { past: 12, future: 12 };
  }
}

// ============================================================================
// DATE RANGE CALCULATIONS
// ============================================================================

/**
 * Calculate display date range centered around today
 * For weeks/months: Always center around today, but clamp end to goalDueDate
 * For years/all: Constrain to goal boundaries
 */
export function calculateDisplayDateRange(
  period: TimePeriodOption,
  goalStartDate: Date,
  goalDueDate: Date
): DateRange {
  const today = startOfDay(new Date());

  // For "all" view, always show the full goal timeline
  if (period === "all") {
    return {
      displayStart: goalStartDate,
      displayEnd: goalDueDate,
    };
  }

  const counts = getDisplayCounts(period);

  // Calculate past and future boundaries based on period
  let pastBoundary: Date;
  let futureBoundary: Date;

  switch (period) {
    case "weeks":
      pastBoundary = endOfWeek(subWeeks(today, counts.past), { weekStartsOn: 1 });
      futureBoundary = endOfWeek(addWeeks(today, counts.future), { weekStartsOn: 1 });
      break;
    case "months":
      pastBoundary = endOfMonth(subMonths(today, counts.past));
      futureBoundary = endOfMonth(addMonths(today, counts.future));
      break;
    case "years":
      pastBoundary = endOfYear(subYears(today, counts.past));
      futureBoundary = endOfYear(addYears(today, counts.future));
      break;
  }

  // For weeks/months: Use today-centered range, but clamp end to due date
  // For years: Constrain both ends to goal boundaries
  let displayStart: Date;
  let displayEnd: Date;

  if (period === "years") {
    // Years view: constrain to goal boundaries
    displayStart = isAfter(pastBoundary, goalStartDate) ? pastBoundary : goalStartDate;
    displayEnd = isBefore(futureBoundary, goalDueDate) ? futureBoundary : goalDueDate;
  } else {
    // Weeks/months: center around today, only clamp end to due date
    displayStart = pastBoundary;
    displayEnd = isBefore(futureBoundary, goalDueDate) ? futureBoundary : goalDueDate;
  }

  return { displayStart, displayEnd };
}

// ============================================================================
// DATE INTERVAL GENERATION
// ============================================================================

/**
 * Generate date intervals based on the selected time period
 */
export function generateDateIntervals(startDate: Date, endDate: Date, period: TimePeriodOption): Date[] {
  switch (period) {
    case "weeks":
      return eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 }).map((d) =>
        endOfWeek(d, { weekStartsOn: 1 })
      );
    case "months":
      return eachMonthOfInterval({ start: startDate, end: endDate }).map((d) => endOfMonth(d));
    case "years":
    case "all":
      return eachYearOfInterval({ start: startDate, end: endDate }).map((d) => endOfYear(d));
    default:
      return eachMonthOfInterval({ start: startDate, end: endDate }).map((d) => endOfMonth(d));
  }
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Format date label based on the time period
 */
export function formatDateLabel(date: Date, period: TimePeriodOption, specialLabel?: string | null): string {
  if (specialLabel) {
    // For special labels (Start/End), include the formatted date
    const dateStr = format(date, "dd-MM-yyyy");
    return `${specialLabel}:${dateStr}`;
  }

  switch (period) {
    case "weeks":
      return format(date, "MMM d");
    case "months":
      return format(date, "MMM ''yy");
    case "years":
    case "all":
      return format(date, "yyyy");
    default:
      return format(date, "MMM ''yy");
  }
}

// ============================================================================
// PERIOD DETECTION
// ============================================================================

/**
 * Determine if a date is in the same period as today
 */
export function isSamePeriod(date: Date, today: Date, period: TimePeriodOption): boolean {
  switch (period) {
    case "weeks":
      return format(date, "yyyy-ww") === format(today, "yyyy-ww");
    case "months":
      return format(date, "yyyy-MM") === format(today, "yyyy-MM");
    case "years":
    case "all":
      return format(date, "yyyy") === format(today, "yyyy");
    default:
      return false;
  }
}

/**
 * Check if a date falls within the same period as any date in the intervals
 * Used to avoid adding duplicate boundary dates
 */
export function isInSamePeriodAsIntervals(date: Date, intervals: Date[], period: TimePeriodOption): boolean {
  const getPeriodKey = (d: Date): string => {
    switch (period) {
      case "weeks":
        return format(d, "yyyy-ww");
      case "months":
        return format(d, "yyyy-MM");
      case "years":
      case "all":
        return format(d, "yyyy");
      default:
        return format(d, "yyyy-MM");
    }
  };

  const dateKey = getPeriodKey(date);
  return intervals.some((interval) => getPeriodKey(interval) === dateKey);
}

// ============================================================================
// SPECIAL DATE LABELS
// ============================================================================

/**
 * Detect if a date is a special boundary (start or end of goal)
 * Only returns a label if this date is explicitly a boundary date that was added separately
 * For weeks/months: Don't show "End" label as the due date is added for projection purposes only
 */
export function getSpecialDateLabel(
  date: Date,
  goalStartDate: Date,
  goalDueDate: Date,
  period: TimePeriodOption,
  isExplicitBoundaryDate: boolean = false
): string | null {
  const isStartDate =
    isEqual(startOfDay(date), startOfDay(goalStartDate)) ||
    format(date, "yyyy-MM-dd") === format(goalStartDate, "yyyy-MM-dd");

  const isEndDate =
    isEqual(startOfDay(date), startOfDay(goalDueDate)) ||
    format(date, "yyyy-MM-dd") === format(goalDueDate, "yyyy-MM-dd");

  // For "years" and "all" views, show both Start and End labels
  if (period === "years" || period === "all") {
    if (isStartDate) return "Start";
    if (isEndDate) return "End";
    return null;
  }

  // For weeks/months: Only show "Start" label on the exact goal start date
  // Don't show "End" label - the due date is just used for projections, not as a display boundary
  if (isStartDate && isExplicitBoundaryDate) {
    return "Start";
  }

  return null;
}

// ============================================================================
// INTERPOLATION
// ============================================================================

/**
 * Add interpolation points between two dates to create smooth curves
 * This prevents straight line gaps between period boundaries and exact goal dates
 *
 * @param lastPeriodDate - Last period-end date
 * @param nextDate - Next date (e.g., exact goal end)
 * @param maxGapDays - Maximum gap before adding interpolation (default: 2 days)
 * @returns Array of interpolated dates, or empty if gap is small enough
 */
export function getInterpolationPoints(lastPeriodDate: Date, nextDate: Date, maxGapDays: number = 2): Date[] {
  const gapMs = nextDate.getTime() - lastPeriodDate.getTime();
  const gapDays = gapMs / (1000 * 60 * 60 * 24);

  // If gap is small enough, no interpolation needed
  if (gapDays <= maxGapDays) {
    return [];
  }

  // For year gaps > ~90 days, add quarterly interpolation points
  if (gapDays > 90) {
    const points: Date[] = [];
    const numPoints = Math.min(3, Math.floor(gapDays / 90));
    const stepMs = gapMs / (numPoints + 1);

    for (let i = 1; i <= numPoints; i++) {
      points.push(new Date(lastPeriodDate.getTime() + stepMs * i));
    }
    return points;
  }

  // For smaller gaps, add a single midpoint
  const midpoint = new Date(lastPeriodDate.getTime() + gapMs / 2);
  return [midpoint];
}

// ============================================================================
// ACTUAL VALUE HELPERS
// ============================================================================

/**
 * Get actual value for a date point
 */
export function getActualValue(
  date: Date,
  today: Date,
  goalStartDate: Date,
  aggregatedActuals: Map<string, number>,
  latestActualValue: number | null,
  period: TimePeriodOption
): number | null {
  // No actual value before goal start
  if (isBefore(date, goalStartDate)) return null;

  // For dates in the current period, use the latest actual value
  if (isSamePeriod(date, today, period)) {
    return latestActualValue;
  }

  // For dates in the future, no actual value
  if (isAfter(date, today)) return null;

  // Look for aggregated value
  const dateKey = format(date, "yyyy-MM-dd");
  const value = aggregatedActuals.get(dateKey);

  return value ?? null;
}
