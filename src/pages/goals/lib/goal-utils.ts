import type { Goal } from "@/lib/types";
import { format, isAfter, parseISO } from "date-fns";

// ============================================================================
// DATE UTILITIES FOR GOALS MODULE
// ============================================================================
// These utilities ensure consistent date handling across the goals module,
// avoiding timezone conversion issues when working with ISO date strings.
//
// Problem: Dates stored as "2025-01-01T17:00:00.000Z" (5pm UTC) get converted
// to "2025-01-02" in Vietnam timezone (UTC+7) when parsed and formatted.
//
// Solution: Extract the date portion directly from the ISO string before
// any timezone-aware operations.
// ============================================================================

/**
 * Extracts the date portion (YYYY-MM-DD) from an ISO date string.
 * This avoids timezone conversion issues.
 *
 * @param isoDateString - ISO date string like "2025-01-01T17:00:00.000Z"
 * @returns Date string in "YYYY-MM-DD" format, or undefined if input is undefined
 *
 * @example
 * extractDateString("2025-01-01T17:00:00.000Z") // Returns "2025-01-01"
 * extractDateString(undefined) // Returns undefined
 */
export function extractDateString(isoDateString: string | undefined): string | undefined {
  if (!isoDateString) return undefined;
  return isoDateString.split("T")[0];
}

/**
 * Parses an ISO date string to a Date object, extracting only the date portion
 * to avoid timezone conversion issues.
 *
 * @param isoDateString - ISO date string like "2025-01-01T17:00:00.000Z" or "2025-01-01"
 * @returns Date object representing the date at midnight local time
 *
 * @example
 * parseGoalDate("2025-01-01T17:00:00.000Z") // Returns Date for 2025-01-01 00:00:00 local
 * parseGoalDate("2025-01-01") // Returns Date for 2025-01-01 00:00:00 local
 */
export function parseGoalDate(isoDateString: string): Date {
  // Extract date portion first to avoid timezone issues
  const dateOnly = isoDateString.split("T")[0];
  // Parse year, month, day explicitly to create local midnight
  // This avoids parseISO potentially treating date-only strings as UTC
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

/**
 * Safely parses an optional ISO date string to a Date object.
 * Returns undefined if the input is undefined or empty.
 *
 * @param isoDateString - Optional ISO date string
 * @returns Date object or undefined
 */
export function parseGoalDateOptional(isoDateString: string | undefined): Date | undefined {
  if (!isoDateString) return undefined;
  return parseGoalDate(isoDateString);
}

/**
 * Gets the allocation start date, with fallbacks.
 * Priority: allocationDate > startDate > goalStartDate
 * Returns the date in YYYY-MM-DD format.
 *
 * @param allocationDate - Specific allocation date (optional)
 * @param startDate - Allocation's start date (optional)
 * @param goalStartDate - Goal's start date as fallback
 * @returns Date string in YYYY-MM-DD format
 */
export function getAllocationStartDate(
  allocationDate: string | undefined,
  startDate: string | undefined,
  goalStartDate: string
): string {
  const rawDate = allocationDate || startDate || goalStartDate;
  return rawDate.split("T")[0];
}

/**
 * Formats a goal date for API calls (YYYY-MM-DD format).
 * Safely handles undefined inputs.
 *
 * @param isoDateString - ISO date string
 * @param fallback - Fallback value if input is undefined
 * @returns Date string in YYYY-MM-DD format
 */
export function formatGoalDateForApi(isoDateString: string | undefined, fallback: string): string {
  if (!isoDateString) return fallback;
  return isoDateString.split("T")[0];
}

/**
 * Gets today's date in YYYY-MM-DD format
 * @returns Today's date string
 */
export function getTodayString(): string {
  return format(new Date(), "yyyy-MM-dd");
}


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
 *
 * @param targetAmount - Target amount to reach by due date
 * @param annualReturnRate - Annual return rate as percentage (e.g., 7 for 7%)
 * @param startDate - Goal start date
 * @param dueDate - Goal due date
 * @param queryDate - Date to calculate projected value for
 * @returns Future value from daily contributions only (excludes initial principal)
 */
export function calculateProjectedValueByDate(
  targetAmount: number,
  annualReturnRate: number,
  startDate: Date,
  dueDate: Date,
  queryDate: Date,
): number {
  // Back-calculate daily investment needed to reach target
  const dailyInvestment = calculateDailyInvestment(
    targetAmount,
    annualReturnRate,
    startDate,
    dueDate,
  );

  // For dates before goal start, return 0 (no projection yet)
  if (queryDate < startDate) return 0;

  const daysFromStart = getDaysDiff(startDate, queryDate);

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
 * Formula: dailyInvestment = targetValue / [((1+r)^n - 1) / r]
 * (Assumes starting from 0 for the contribution portion)
 *
 * @param targetValue - Target amount to reach
 * @param annualReturnRate - Annual return rate as percentage (e.g., 8 for 8%)
 * @param startDate - Goal start date
 * @param dueDate - Goal due date (target date)
 * @returns Daily investment amount needed to reach target
 */
export function calculateDailyInvestment(
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
    // With 0% return, daily investment is just the target amount spread over days
    return targetValue / totalDays;
  }

  // Back-calculate: how much daily investment is needed?
  // targetValue = dailyInvestment × [((1 + r)^n - 1) / r]
  // dailyInvestment = targetValue / [((1 + r)^n - 1) / r]

  const compoundFactor = Math.pow(1 + dailyRate, totalDays);
  const annuityFactor = (compoundFactor - 1) / dailyRate;

  return targetValue / annuityFactor;
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
 * IMPORTANT DESIGN DECISION:
 * On-track comparison uses ONLY projected contributions, NOT including principal growth.
 * This is intentional - a high initial allocation can "buffer" poor market performance.
 *
 * @param currentValue - Current actual value of the goal (includes initial contribution + growth)
 * @param targetAmount - Target amount to reach
 * @param annualReturnRate - Annual return rate as percentage
 * @param startDate - Goal start date
 * @param dueDate - Goal due date
 * @returns true if on track, false if off track
 */
export function isGoalOnTrackByDate(
  currentValue: number,
  targetAmount: number,
  annualReturnRate: number,
  startDate: Date,
  dueDate: Date,
): boolean {
  const today = new Date();

  // Calculate projected contributions value (excludes initial principal)
  const projectedValue = calculateProjectedValueByDate(
    targetAmount,
    annualReturnRate,
    startDate,
    dueDate,
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

/**
 * Check if two date ranges overlap
 * Two ranges overlap if: rangeA.start < rangeB.end AND rangeA.end > rangeB.start
 *
 * @param startA - Start date of range A (ISO string or Date)
 * @param endA - End date of range A (ISO string or Date)
 * @param startB - Start date of range B (ISO string or Date)
 * @param endB - End date of range B (ISO string or Date)
 * @returns true if the ranges overlap, false otherwise
 *
 * @example
 * // Goal 1: 2025-01-01 to 2030-12-31
 * // Goal 2: 2031-01-01 to 2035-12-31
 * doDateRangesOverlap('2025-01-01', '2030-12-31', '2031-01-01', '2035-12-31')
 * // Returns: false (Goal 2 starts after Goal 1 ends)
 *
 * // Goal 1: 2025-01-01 to 2030-12-31
 * // Goal 2: 2028-01-01 to 2032-12-31
 * doDateRangesOverlap('2025-01-01', '2030-12-31', '2028-01-01', '2032-12-31')
 * // Returns: true (they overlap from 2028 to 2030)
 */
export function doDateRangesOverlap(
  startA: string | Date | undefined,
  endA: string | Date | undefined,
  startB: string | Date | undefined,
  endB: string | Date | undefined,
): boolean {
  // If any date is missing, we can't determine overlap - assume they DON'T overlap
  // This is conservative: if we don't know, don't count it
  if (!startA || !endA || !startB || !endB) {
    return false;
  }

  const dateStartA = typeof startA === 'string' ? new Date(startA) : startA;
  const dateEndA = typeof endA === 'string' ? new Date(endA) : endA;
  const dateStartB = typeof startB === 'string' ? new Date(startB) : startB;
  const dateEndB = typeof endB === 'string' ? new Date(endB) : endB;

  // Two ranges overlap if: A starts before B ends AND A ends after B starts
  return dateStartA < dateEndB && dateEndA > dateStartB;
}

/**
 * Calculate the contributed value of an allocation at a specific query date
 *
 * Formula: ContributedValue = InitialContribution + (AccountGrowth × AllocationPercent)
 *
 * Where:
 * - AccountGrowth = AccountValue@QueryDate - AccountValue@AllocationStartDate
 * - AllocationPercent is expressed as decimal (e.g., 0.5 for 50%)
 *
 * @param initialContribution - The initial contribution amount locked in at allocation start
 * @param allocationPercentage - Allocation percentage (0-100)
 * @param accountValueAtAllocationStart - Account value when this allocation started
 * @param accountValueAtQueryDate - Account value at the query date
 * @param allocationStartDate - When this allocation started
 * @param queryDate - The date we're calculating contributed value for
 * @returns The contributed value at the query date
 *
 * @example
 * // Goal 1 started 2020-01-01 with 50% allocation on an account worth $100,000
 * // Account is now worth $200,000 on 2025-01-01
 * const contributed = calculateAllocationContributedValue(
 *   50000,  // $50K initial contribution
 *   50,     // 50% allocation
 *   100000, // Account worth $100K at Goal 1 start
 *   200000, // Account worth $200K at query date (2025-01-01)
 *   new Date('2020-01-01'),
 *   new Date('2025-01-01')
 * );
 * // Result: $50,000 + ($200,000 - $100,000) × 0.5 = $50,000 + $50,000 = $100,000
 */
export function calculateAllocationContributedValue(
  initialContribution: number,
  allocationPercentage: number,
  accountValueAtAllocationStart: number,
  accountValueAtQueryDate: number,
  allocationStartDate: Date,
  queryDate: Date,
): number {
  // If query date is before allocation started, contributed value is 0
  if (queryDate < allocationStartDate) {
    return 0;
  }

  // Account growth from allocation start to query date
  const accountGrowth = accountValueAtQueryDate - accountValueAtAllocationStart;

  // Allocated portion of the growth
  const allocationDecimal = allocationPercentage / 100;
  const allocatedGrowth = accountGrowth * allocationDecimal;

  // Total contributed value = initial + growth
  // If growth is negative, contributed value can be less than initial
  return initialContribution + allocatedGrowth;
}

/**
 * Calculate the unallocated balance for an account at a specific date
 * considering all existing allocations from other goals
 *
 * @param accountValueAtQueryDate - Account value at the query date
 * @param otherAllocationsContributedValues - Array of contributed values from other goals' allocations
 * @returns The unallocated balance available for new allocations
 */
export function calculateUnallocatedBalance(
  accountValueAtQueryDate: number,
  otherAllocationsContributedValues: number[],
): number {
  const totalContributed = otherAllocationsContributedValues.reduce((sum, val) => sum + val, 0);
  return Math.max(0, accountValueAtQueryDate - totalContributed);
}

/**
 * Calculate the unallocated percentage for an account at a specific date
 * This is useful for determining how much growth percentage is still available
 *
 * @param otherAllocationsPercentages - Array of allocation percentages from other goals
 * @returns The unallocated percentage (0-100)
 */
export function calculateUnallocatedPercentage(
  otherAllocationsPercentages: number[],
): number {
  const totalAllocated = otherAllocationsPercentages.reduce((sum, pct) => sum + pct, 0);
  return Math.max(0, 100 - totalAllocated);
}
