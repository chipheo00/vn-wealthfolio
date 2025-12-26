/**
 * Goal Valuation History Hook
 * Fetches and calculates goal valuation history for chart display
 */

import { getGoalsAllocation } from "@/commands/goal";
import { getHistoricalValuations } from "@/commands/portfolio";
import { QueryKeys } from "@/lib/query-keys";
import type { AccountValuation, Goal } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  isBefore,
  parseISO,
  startOfDay
} from "date-fns";
import { useMemo } from "react";

// Import from utility files
import {
  aggregateValuationsByPeriod,
  buildAllocationDetailsMap,
  calculateActualValuesByDate,
} from "../lib/allocation-utils";
import {
  calculateDisplayDateRange,
  formatDateLabel,
  generateDateIntervals,
  getActualValue,
  getInterpolationPoints,
  getSpecialDateLabel,
  isInSamePeriodAsIntervals,
} from "../lib/chart-utils";
import type {
  DateRangeConfig,
  GoalChartDataPoint,
  TimePeriodOption,
  UseGoalValuationHistoryOptions,
  UseGoalValuationHistoryResult,
} from "../lib/goal-types";
import {
  calculateDailyInvestment,
  calculateProjectedValueByDate,
  extractDateString,
  formatGoalDateForApi,
  getTodayString,
} from "../lib/goal-utils";

// Re-export types for consumers
export type { GoalChartDataPoint, TimePeriodOption };

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Hook to fetch and calculate goal valuation history for the chart
 */
export function useGoalValuationHistory(
  goal: Goal | undefined,
  period: TimePeriodOption = "months",
  options: UseGoalValuationHistoryOptions = {}
): UseGoalValuationHistoryResult {
  const { startValue: passedStartValue, projectedFutureValue: passedProjectedFutureValue } = options;

  // Fetch allocations for this goal
  const {
    data: allocations,
    isLoading: isLoadingAllocations,
    error: allocationsError,
  } = useQuery({
    queryKey: [QueryKeys.GOALS_ALLOCATIONS, goal?.id],
    queryFn: async () => {
      const allAllocations = await getGoalsAllocation();
      return allAllocations.filter((a) => a.goalId === goal?.id);
    },
    enabled: !!goal?.id,
  });

  // Get list of accounts we need to fetch history for
  const allocatedAccountIds = useMemo(() => {
    if (!allocations || !goal) return [];
    return allocations
      .filter((alloc) => alloc.goalId === goal.id && alloc.allocatedPercent > 0)
      .map((alloc) => alloc.accountId);
  }, [allocations, goal]);

  // Calculate date range for fetching
  const dateRange = useMemo((): DateRangeConfig | null => {
    if (!goal) return null;

    const todayStr = getTodayString();

    // Use utilities to extract date portions (avoids timezone conversion issues)
    const goalStartDateStr = formatGoalDateForApi(goal.startDate, todayStr);
    const goalDueDateStr = extractDateString(goal.dueDate);

    // For data fetching range, use the earlier of today or goal start
    const dataStartDate = goalStartDateStr > todayStr ? todayStr : goalStartDateStr;

    // End date: due date + 1 year, or today + 1 year
    let endDateStr: string;
    if (goalDueDateStr) {
      const dueDate = parseISO(goalDueDateStr);
      dueDate.setFullYear(dueDate.getFullYear() + 1);
      endDateStr = format(dueDate, "yyyy-MM-dd");
    } else {
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);
      endDateStr = format(endDate, "yyyy-MM-dd");
    }

    return {
      startDate: dataStartDate,
      endDate: endDateStr,
      goalStartDate: goalStartDateStr,
    };
  }, [goal]);

  // Fetch historical valuations
  const {
    data: historicalValuations,
    isLoading: isLoadingValuations,
    error: valuationsError,
  } = useQuery<Map<string, AccountValuation[]>, Error>({
    queryKey: [QueryKeys.GOAL_VALUATION_HISTORY, goal?.id, allocatedAccountIds, dateRange],
    queryFn: async () => {
      if (allocatedAccountIds.length === 0 || !dateRange) return new Map();

      const valuationsMap = new Map<string, AccountValuation[]>();

      await Promise.all(
        allocatedAccountIds.map(async (accountId) => {
          const valuations = await getHistoricalValuations(
            accountId,
            dateRange.startDate,
            dateRange.endDate
          );
          valuationsMap.set(accountId, valuations);
        })
      );

      return valuationsMap;
    },
    enabled: allocatedAccountIds.length > 0 && !!dateRange,
  });

  // Calculate chart data
  const chartDataResult = useMemo((): { chartData: GoalChartDataPoint[]; allocationValues: Map<string, number> } => {
    if (!goal || !dateRange) return { chartData: [], allocationValues: new Map() };

    const goalStartDate = parseISO(dateRange.goalStartDate);
    const today = startOfDay(new Date());

    // Use utility to extract date portion (avoids timezone conversion issues)
    const goalDueDateStr = formatGoalDateForApi(goal.dueDate, dateRange.endDate);
    const goalDueDate = parseISO(goalDueDateStr);

    // Calculate display date range
    const { displayStart, displayEnd } = calculateDisplayDateRange(
      period,
      goalStartDate,
      goalDueDate
    );

    // Generate date intervals
    let dateIntervals = generateDateIntervals(displayStart, displayEnd, period);

    // For "all" view, add the exact due date if not already included
    if (period === "all" && dateIntervals.length > 0) {
      const lastInterval = dateIntervals[dateIntervals.length - 1];
      const lastIntervalYear = format(lastInterval, "yyyy");
      const dueDateYear = format(goalDueDate, "yyyy");

      if (lastIntervalYear !== dueDateYear) {
        // Add interpolation points for smooth curve (only for "all" view)
        const interpolation = getInterpolationPoints(lastInterval, goalDueDate);
        dateIntervals = [...dateIntervals, ...interpolation, goalDueDate];
      }
    }

    // For "years" view, add the due date if beyond the last interval
    if (period === "years" && dateIntervals.length > 0) {
      const lastPeriodDate = dateIntervals[dateIntervals.length - 1];
      if (isBefore(lastPeriodDate, goalDueDate)) {
        dateIntervals = [...dateIntervals, goalDueDate];
      }
    }

    // NOTE: For weeks/months, we do NOT add the due date.
    // These views show a window centered around today, not the full goal timeline.

    // Build allocation details map
    const allocationDetailsMap = buildAllocationDetailsMap(allocations, goal.id, dateRange.goalStartDate);

    // Calculate actual values
    const { actualValuesByDate, latestActualValue, latestAllocationValues } = calculateActualValuesByDate(
      historicalValuations,
      allocationDetailsMap,
      dateRange.goalStartDate
    );

    const aggregatedActuals = aggregateValuationsByPeriod(actualValuesByDate, dateIntervals, period);

    // Calculate daily investment for projections
    const startValue = passedStartValue ?? allocations?.reduce((sum, a) => sum + (a.initialContribution || 0), 0) ?? 0;
    const annualReturnRate = goal.targetReturnRate ?? 0;

    const dailyInvestment = calculateDailyInvestment(
      startValue,
      goal.targetAmount,
      annualReturnRate,
      goalStartDate,
      goalDueDate
    );

    // Build chart data points
    const chartData: GoalChartDataPoint[] = [];
    const explicitBoundaryDates = new Set<string>();

    // Track explicit boundary dates
    if (!isInSamePeriodAsIntervals(goalStartDate, dateIntervals, period)) {
      explicitBoundaryDates.add(format(goalStartDate, "yyyy-MM-dd"));
    }
    if (period === "years" || period === "all") {
      explicitBoundaryDates.add(format(goalDueDate, "yyyy-MM-dd"));
    }

    dateIntervals.forEach((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const isExplicitBoundary = explicitBoundaryDates.has(dateStr);
      const specialLabel = getSpecialDateLabel(date, goalStartDate, goalDueDate, period, isExplicitBoundary);

      // Get actual value
      const actual = getActualValue(
        date,
        today,
        goalStartDate,
        aggregatedActuals,
        latestActualValue,
        period
      );

      // Calculate projected value
      let projected: number | null = null;
      if (!isBefore(date, goalStartDate)) {
        // Check if this is the due date and we have a passed value
        const isAtDueDate = format(date, "yyyy-MM-dd") === format(goalDueDate, "yyyy-MM-dd");
        if (isAtDueDate && passedProjectedFutureValue !== undefined) {
          projected = passedProjectedFutureValue;
        } else {
          projected = startValue + calculateProjectedValueByDate(
            startValue,
            dailyInvestment,
            annualReturnRate,
            goalStartDate,
            date
          );
        }
      }

      chartData.push({
        date: dateStr,
        dateLabel: formatDateLabel(date, period, specialLabel),
        projected,
        actual,
      });
    });

    return { chartData, allocationValues: latestAllocationValues };
  }, [
    goal,
    dateRange,
    historicalValuations,
    allocations,
    period,
    passedStartValue,
    passedProjectedFutureValue,
  ]);

  return {
    chartData: chartDataResult.chartData,
    allocationValues: chartDataResult.allocationValues,
    isLoading: isLoadingAllocations || isLoadingValuations,
    error: allocationsError || valuationsError || null,
  };
}
