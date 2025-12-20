import type { Goal } from "@/lib/types";
import { format, isAfter, parseISO } from "date-fns";

/**
 * Calculate projected value using compound interest formula with regular contributions (MONTHLY compounding)
 *
 * IMPORTANT: Initial contributions are EXCLUDED from projection.
 * Projected value shows only growth from monthly contributions.
 *
 * Formula: FV = PMT × [((1 + r)^n - 1) / r]
 *
 * @param startValue - Initial principal (starting allocation) - NOT USED, kept for backwards compatibility
 * @param monthlyInvestment - Monthly contribution (PMT)
 * @param annualReturnRate - Annual return rate as percentage (e.g., 7 for 7%)
 * @param monthsFromStart - Number of months from goal start date
 * @returns Projected value from monthly contributions with compound interest (0 at start date)
 */
export function calculateProjectedValue(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _startValue: number,
  monthlyInvestment: number,
  annualReturnRate: number,
  monthsFromStart: number,
): number {
  // Before goal start date, projected value is 0
  if (monthsFromStart < 0) return 0;

  // At goal start date (monthsFromStart = 0), show first day's contribution without growth
  if (monthsFromStart === 0) {
    // Approximately 1/30 of monthly investment for first day
    return monthlyInvestment / 30;
  }

  const monthlyRate = annualReturnRate / 100 / 12;

  if (monthlyRate === 0) {
    // No return: just sum of contributions
    return monthlyInvestment * monthsFromStart;
  }

  // Compound interest only from monthly contributions
  const compoundFactor = Math.pow(1 + monthlyRate, monthsFromStart);
  const futureContributions = monthlyInvestment * ((compoundFactor - 1) / monthlyRate);

  return futureContributions;
}

/**
 * Calculate the number of days between two dates
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of days between dates
 */
export function getDaysDiff(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate projected value using compound interest with DAILY compounding (more precise)
 * FV = PMT_daily × [((1 + r)^n - 1) / r]
 *
 * IMPORTANT: Initial contributions (startValue) are EXCLUDED from projection.
 * The projected line shows only growth from daily/monthly contributions.
 * This is intentional - the actual value line will show the full portfolio value
 * including initial contributions.
 *
 * The daily investment is typically back-calculated using calculateDailyInvestment()
 * which DOES account for startValue when determining how much daily contribution is needed.
 *
 * @param _startValue - Initial principal (NOT USED in calculation, kept for API compatibility)
 * @param dailyInvestment - Daily contribution amount
 * @param annualReturnRate - Annual return rate as percentage (e.g., 7 for 7%)
 * @param startDate - Goal start date
 * @param currentDate - Date to calculate projected value for
 * @returns Future value from daily contributions only (excludes initial principal)
 */
export function calculateProjectedValueByDate(
  _startValue: number,
  dailyInvestment: number,
  annualReturnRate: number,
  startDate: Date,
  currentDate: Date,
): number {
  // For dates before goal start, return 0 (no projection yet)
  if (currentDate < startDate) return 0;

  const daysFromStart = getDaysDiff(startDate, currentDate);

  // At goal start date, no contributions yet
  if (daysFromStart === 0) return 0;

  const dailyRate = annualReturnRate / 100 / 365;

  if (dailyRate === 0) {
    // No return: just sum of daily contributions
    return dailyInvestment * daysFromStart;
  }

  // Compound factor: (1 + r)^n
  const compoundFactor = Math.pow(1 + dailyRate, daysFromStart);

  // Future value of daily contributions only: PMT × [((1 + r)^n - 1) / r]
  const futureContributions = dailyInvestment * ((compoundFactor - 1) / dailyRate);

  return futureContributions;
}

/**
 * Calculate daily investment needed to reach target value at goal due date
 * Uses daily compounding to back-calculate the required daily contribution
 *
 * Formula: dailyInvestment = (targetValue - PV×(1+r)^n) / [((1+r)^n - 1) / r]
 *
 * @param startValue - Initial principal (starting allocation)
 * @param targetValue - Target amount to reach
 * @param annualReturnRate - Annual return rate as percentage (e.g., 8 for 8%)
 * @param startDate - Goal start date
 * @param dueDate - Goal due date (target date)
 * @returns Daily investment amount needed to reach target
 *
 * @example
 * // Need to reach $500M starting with $100M by Dec 31, 2026 at 8% return
 * const daily = calculateDailyInvestment(100000000, 500000000, 8, startDate, dueDate);
 * // dailyInvestment can then be used in calculateProjectedValueByDate()
 * // At dueDate, projected value will equal targetValue
 */
export function calculateDailyInvestment(
  startValue: number,
  targetValue: number,
  annualReturnRate: number,
  startDate: Date,
  dueDate: Date,
): number {
  const totalDays = getDaysDiff(startDate, dueDate);

  if (totalDays <= 0) {
    return 0;
  }

  const dailyRate = annualReturnRate / 100 / 365;

  if (dailyRate === 0) {
    // With 0% return, daily investment is just the remaining amount spread over days
    return (targetValue - startValue) / totalDays;
  }

  // Calculate what the initial principal will grow to
  const compoundFactor = Math.pow(1 + dailyRate, totalDays);
  const futurePV = startValue * compoundFactor;

  // Back-calculate: how much daily investment is needed?
  // targetValue = futurePV + dailyInvestment × [((1 + r)^n - 1) / r]
  // dailyInvestment = (targetValue - futurePV) / [((1 + r)^n - 1) / r]
  const contributionNeeded = targetValue - futurePV;
  const annuityFactor = (compoundFactor - 1) / dailyRate;

  return contributionNeeded / annuityFactor;
}

/**
 * Determines if a goal is on track by comparing today's actual value vs today's projected value
 * On track: todayActualValue >= todayProjectedValue
 * Off track: todayActualValue < todayProjectedValue
 *
 * @param currentValue - Today's actual value of the goal (from accounts)
 * @param projectedValue - Today's projected value (calculated from monthly contributions)
 * @returns true if on track, false if off track
 */
export function isGoalOnTrack(currentValue: number, projectedValue: number): boolean {
  return currentValue >= projectedValue;
}

/**
 * Determines if a goal is on track with daily precision
 * Uses daily compounding for more accurate projection
 *
 * **Note:** To use this accurately with a fixed target, back-calculate dailyInvestment
 * using `calculateDailyInvestment()` first, which ensures the projected value will
 * match your target at the due date.
 *
 * @param currentValue - Current actual value of the goal
 * @param startValue - Initial principal
 * @param dailyInvestment - Daily contribution amount
 * @param annualReturnRate - Annual return rate as percentage
 * @param startDate - Goal start date
 * @returns true if on track, false if off track
 *
 * @example
 * // Calculate daily investment needed to reach $500M target
 * const dailyInv = calculateDailyInvestment(100000000, 500000000, 8, startDate, dueDate);
 * // Check if on track with daily precision
 * const onTrack = isGoalOnTrackByDate(currentValue, 100000000, dailyInv, 8, startDate);
 */
export function isGoalOnTrackByDate(
  currentValue: number,
  startValue: number,
  dailyInvestment: number,
  annualReturnRate: number,
  startDate: Date,
): boolean {
  const today = new Date();
  const projectedValue = calculateProjectedValueByDate(
    startValue,
    dailyInvestment,
    annualReturnRate,
    startDate,
    today,
  );
  return currentValue >= projectedValue;
}

/**
 * Checks if a goal is scheduled for the future (hasn't started yet)
 */
export function isGoalScheduled(goal: Goal): boolean {
  if (!goal.startDate) return false;
  const startDate = parseISO(goal.startDate);
  return isAfter(startDate, new Date());
}

/**
 * Gets the display status for a goal (for UI rendering)
 */
export function getGoalStatus(goal: Goal, isOnTrack: boolean) {
  if (goal.isAchieved) {
    return {
      text: "Done",
      colorClass: "text-success", // Will use CSS variable
      statusText: "Completed",
      statusClass: "text-success bg-success/10",
    };
  }

  // Check if goal is scheduled for the future
  if (isGoalScheduled(goal)) {
    const startDate = parseISO(goal.startDate!);
    return {
      text: "Scheduled",
      colorClass: "text-muted-foreground",
      statusText: `Starts ${format(startDate, "MMM d, yyyy")}`,
      statusClass: "text-muted-foreground bg-muted/10",
    };
  }

  if (isOnTrack) {
    return {
      text: "On track",
      colorClass: "text-chart-actual-on-track", // Will use CSS variable
      statusText: "Ongoing",
      statusClass: "text-primary bg-primary/10",
    };
  }

  return {
    text: "Off track",
    colorClass: "text-chart-actual-off-track", // Will use CSS variable
    statusText: "Ongoing",
    statusClass: "text-primary bg-primary/10",
  };
}
