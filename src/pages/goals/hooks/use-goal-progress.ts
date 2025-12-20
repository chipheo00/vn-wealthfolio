import { getGoalsAllocation } from "@/commands/goal";
import { getHistoricalValuations } from "@/commands/portfolio";
import { useAccounts } from "@/hooks/use-accounts";
import { useLatestValuations } from "@/hooks/use-latest-valuations";
import { QueryKeys } from "@/lib/query-keys";
import type { AccountValuation, Goal, GoalAllocation } from "@/lib/types";
import { useQueries, useQuery } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import { useMemo } from "react";
import { calculateProjectedValueByDate, isGoalOnTrack } from "../lib/goal-utils";

// ============ TYPES ============
export interface GoalProgress {
  goalId: string;
  currentValue: number;
  targetAmount: number;
  progress: number; // percentage (actual)
  expectedProgress: number; // percentage (based on timeline)
  isOnTrack: boolean;
  projectedValue: number; // projected value at today's date
  startValue: number; // initial principal (sum of initial contributions)
}

interface HistoryRequest {
  accountId: string;
  date: string;
}

interface GoalProgressResult {
  goalProgressMap: Map<string, GoalProgress>;
  allocationProgressMap: Map<string, number>;
}

// ============ HELPERS ============
/**
 * Identify unique (accountId, date) pairs needed for historical valuations
 */
function buildHistoryRequests(goals: Goal[] | undefined, allocations: GoalAllocation[] | undefined): HistoryRequest[] {
  if (!goals || !allocations) return [];

  const reqs = new Set<string>(); // key: "accountId|date"
  const result: HistoryRequest[] = [];

  allocations.forEach((alloc) => {
    const goal = goals.find((g) => g.id === alloc.goalId);
    if (!goal) return;

    const startDate = alloc.allocationDate || goal.startDate;
    if (!startDate) return;

    const key = `${alloc.accountId}|${startDate}`;
    if (!reqs.has(key)) {
      reqs.add(key);
      result.push({ accountId: alloc.accountId, date: startDate });
    }
  });

  return result;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Calculate allocated value for a single allocation
 */
function calculateAllocationValue(
  allocation: GoalAllocation,
  _goal: Goal,
  currentValuation: AccountValuation | undefined,
  startAccountValue: number
): number | null {
  if (!currentValuation) return null;

  const currentAccountValue = currentValuation.totalValue;
  const initialContribution = allocation.initialContribution ?? 0;
  const percentage = (allocation.allocatedPercent ?? 0) / 100;

  // Formula: Initial Contribution + (Account Growth * Percentage)
  const accountGrowth = currentAccountValue - startAccountValue;
  const allocatedGrowth = accountGrowth * percentage;

  return initialContribution + allocatedGrowth;
}

/**
 * Build goal progress map with calculations
 */
function buildGoalProgressMap(
  goals: Goal[],
  allocations: GoalAllocation[],
  latestValuations: AccountValuation[],
  historyQueries: any[],
  requiredHistory: HistoryRequest[]
): GoalProgressResult {
  const progressMap = new Map<string, GoalProgress>();
  const allocationProgressMap = new Map<string, number>();

  // Create lookup maps for quick access
  const valuationMap = new Map<string, AccountValuation>();
  latestValuations.forEach((val) => valuationMap.set(val.accountId, val));

  const historyMap = new Map<string, number>();
  historyQueries.forEach((q, i) => {
    if (q.data !== undefined) {
      const { accountId, date } = requiredHistory[i];
      historyMap.set(`${accountId}|${date}`, q.data);
    }
  });

  const todayStr = getTodayString();

  goals.forEach((goal) => {
    let currentValue = 0;
    let totalInitialContribution = 0;

    const goalAllocations = allocations.filter((alloc) => alloc.goalId === goal.id);

    goalAllocations.forEach((alloc) => {
      // Skip future allocations
      if (alloc.allocationDate && alloc.allocationDate > todayStr) return;

      const currentAccountValuation = valuationMap.get(alloc.accountId);
      const baselineDate = alloc.allocationDate || goal.startDate;
      const startAccountValue = baselineDate ? historyMap.get(`${alloc.accountId}|${baselineDate}`) ?? 0 : 0;

      const allocatedValue = calculateAllocationValue(alloc, goal, currentAccountValuation, startAccountValue);

      if (allocatedValue !== null) {
        allocationProgressMap.set(alloc.id, allocatedValue);
        currentValue += allocatedValue;
        totalInitialContribution += alloc.initialContribution ?? 0;
      }
    });

    const progress = goal.targetAmount > 0
      ? Math.min((currentValue / goal.targetAmount) * 100, 100)
      : 0;

    const monthlyInvestment = goal.monthlyInvestment ?? 0;
    const annualReturnRate = goal.targetReturnRate ?? 0;

    let projectedValue = 0;
    if (goal.startDate) {
      const goalStartDate = parseISO(goal.startDate);
      const today = new Date();
      const dailyInvestment = monthlyInvestment / 30;
      projectedValue = calculateProjectedValueByDate(
        0,
        dailyInvestment,
        annualReturnRate,
        goalStartDate,
        today
      );
    }

    progressMap.set(goal.id, {
      goalId: goal.id,
      currentValue,
      targetAmount: goal.targetAmount,
      progress,
      expectedProgress: 0,
      isOnTrack: isGoalOnTrack(currentValue, projectedValue),
      projectedValue,
      startValue: totalInitialContribution,
    });
  });

  return { goalProgressMap: progressMap, allocationProgressMap };
}

// ============ HOOK ============
/**
 * Hook to calculate goal progress based on account allocations and their values.
 *
 * For each goal, we:
 * 1. Find all allocations for that goal
 * 2. For each allocation, get the account's current value
 * 3. Multiply account value by allocation percentage
 * 4. Sum up all the allocated values to get the goal's current value
 * 5. Calculate projected value at today's date
 * 6. Compare actual vs projected to determine if on track
 */
export function useGoalProgress(goals: Goal[] | undefined) {
  const { accounts } = useAccounts();
  const accountIds = useMemo(() => accounts?.map((acc) => acc.id) ?? [], [accounts]);

  const { latestValuations, isLoading: isLoadingValuations } = useLatestValuations(accountIds);

  const { data: allocations, isLoading: isLoadingAllocations } = useQuery<GoalAllocation[], Error>({
    queryKey: [QueryKeys.GOALS_ALLOCATIONS],
    queryFn: getGoalsAllocation,
  });

  const requiredHistory = useMemo(
    () => buildHistoryRequests(goals, allocations),
    [goals, allocations]
  );

  const historyQueries = useQueries({
    queries: requiredHistory.map(({ accountId, date }) => ({
      queryKey: ["historicalValuation", accountId, date],
      queryFn: async () => {
        // Fetch valuations from the baseline date to 7 days after
        // This helps find the closest available valuation if exact date doesn't exist
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 7);
        const endDateStr = endDate.toISOString().split("T")[0];

        const vals = await getHistoricalValuations(accountId, date, endDateStr);

        if (!vals || vals.length === 0) {
          // If no valuations found in range, return 0 (same as before)
          return 0;
        }

        // Find valuation at exact date first
        const exactMatch = vals.find(v => v.valuationDate === date);
        if (exactMatch) {
          return exactMatch.totalValue;
        }

        // Fallback: use the earliest available valuation in the range
        // This matches the chart's fallback behavior
        const sortedVals = [...vals].sort((a, b) =>
          a.valuationDate.localeCompare(b.valuationDate)
        );
        return sortedVals[0]?.totalValue ?? 0;
      },
      staleTime: 1000 * 60 * 60, // 1 hour cache
    })),
  });

  const isLoadingHistory = historyQueries.some((q) => q.isLoading);

  const goalProgressMap = useMemo(() => {
    if (!goals || !allocations || !latestValuations) {
      return { goalProgressMap: new Map<string, GoalProgress>(), allocationProgressMap: new Map<string, number>() };
    }

    return buildGoalProgressMap(goals, allocations, latestValuations, historyQueries, requiredHistory);
  }, [goals, allocations, latestValuations, historyQueries, requiredHistory]);

  const isLoading = isLoadingValuations || isLoadingAllocations || isLoadingHistory;

  return {
    goalProgressMap: goalProgressMap.goalProgressMap,
    isLoading,
    getGoalProgress: (goalId: string) => goalProgressMap.goalProgressMap.get(goalId),
    getAllocationValue: (allocationId: string) => goalProgressMap.allocationProgressMap.get(allocationId),
  };
}
