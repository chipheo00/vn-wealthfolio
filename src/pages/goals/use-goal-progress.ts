import { getGoalsAllocation } from "@/commands/goal";
import { useAccounts } from "@/hooks/use-accounts";
import { useLatestValuations } from "@/hooks/use-latest-valuations";
import { QueryKeys } from "@/lib/query-keys";
import type { AccountValuation, Goal, GoalAllocation } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { parseISO } from "date-fns";
import { isGoalOnTrack } from "./lib/goal-utils";

interface GoalProgress {
  goalId: string;
  currentValue: number;
  targetAmount: number;
  progress: number; // percentage (actual)
  expectedProgress: number; // percentage (based on timeline)
  isOnTrack: boolean;
  projectedValue: number; // projected value at today's date
}

/**
 * Calculate projected value using compound interest formula with regular contributions
 * FV = PV × (1 + r)^n + PMT × [((1 + r)^n - 1) / r]
 */
function calculateProjectedValue(
  startValue: number,
  monthlyInvestment: number,
  annualReturnRate: number,
  monthsFromStart: number,
): number {
  if (monthsFromStart <= 0) return startValue;

  const monthlyRate = annualReturnRate / 100 / 12;

  if (monthlyRate === 0) {
    return startValue + monthlyInvestment * monthsFromStart;
  }

  const compoundFactor = Math.pow(1 + monthlyRate, monthsFromStart);
  const futurePV = startValue * compoundFactor;
  const futureContributions = monthlyInvestment * ((compoundFactor - 1) / monthlyRate);

  return futurePV + futureContributions;
}

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

  const goalProgressMap = useMemo(() => {
    const progressMap = new Map<string, GoalProgress>();

    if (!goals || !allocations || !latestValuations) {
      return progressMap;
    }

    // Create a map of account ID to valuation for quick lookup
    const valuationMap = new Map<string, AccountValuation>();
    latestValuations.forEach((val) => valuationMap.set(val.accountId, val));

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Calculate progress for each goal
    goals.forEach((goal) => {
      let currentValue = 0;

      // Find all allocations for this goal
      const goalAllocations = allocations.filter((alloc) => alloc.goalId === goal.id);

      // Sum up the allocated values from each account
      // Only count allocations that are active on today's date
      goalAllocations.forEach((alloc) => {
        // Check if allocation is active on today's date
        const isActive = 
          (!alloc.startDate || alloc.startDate <= todayStr) &&
          (!alloc.endDate || alloc.endDate >= todayStr);
        
        if (!isActive) {
          return; // Skip allocations that aren't active today
        }

        const accountValuation = valuationMap.get(alloc.accountId);
        if (accountValuation) {
          // Account value * allocation percentage (allocation is stored as 0-100)
          const allocatedValue = accountValuation.totalValue * (alloc.percentAllocation / 100);
          currentValue += allocatedValue;
        }
      });

      const progress = goal.targetAmount > 0
        ? Math.min((currentValue / goal.targetAmount) * 100, 100)
        : 0;

      // Calculate projected value at today's date based on goal start
      const monthlyInvestment = goal.monthlyInvestment ?? 0;
      const annualReturnRate = goal.targetReturnRate ?? 0;
      
      // Calculate months from goal start to today
      let monthsFromStart = 0;
      if (goal.startDate) {
        const goalStartDate = parseISO(goal.startDate);
        const today = new Date();
        const yearDiff = today.getFullYear() - goalStartDate.getFullYear();
        const monthDiff = today.getMonth() - goalStartDate.getMonth();
        const daysDiff = today.getDate() - goalStartDate.getDate();
        monthsFromStart = yearDiff * 12 + monthDiff + daysDiff / 30;
      }
      
      // Get initial value at goal start (0 if future goal)
      // For now, assume we started with 0 and calculated current value from contributions
      const startValue = 0;
      
      const projectedValue = calculateProjectedValue(
        startValue,
        monthlyInvestment,
        annualReturnRate,
        Math.max(0, monthsFromStart),
      );

      progressMap.set(goal.id, {
        goalId: goal.id,
        currentValue,
        targetAmount: goal.targetAmount,
        progress,
        expectedProgress: 0,
        isOnTrack: isGoalOnTrack(currentValue, projectedValue),
        projectedValue,
      });
    });

    return progressMap;
  }, [goals, allocations, latestValuations]);

  const isLoading = isLoadingValuations || isLoadingAllocations;

  return {
    goalProgressMap,
    isLoading,
    getGoalProgress: (goalId: string) => goalProgressMap.get(goalId),
  };
}
