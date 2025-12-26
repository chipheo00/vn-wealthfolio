/**
 * Custom hook for allocation form logic
 * Shared between EditAllocationsModal and EditSingleAllocationModal
 */

import { getHistoricalValuations } from "@/commands/portfolio";
import type { Account, Goal, GoalAllocation } from "@/lib/types";
import { useEffect, useState } from "react";
import type { HistoricalValuesCache } from "../lib/goal-types";
import {
    calculateAllocationContributedValue,
    calculateUnallocatedBalance,
    doDateRangesOverlap,
    extractDateString,
} from "../lib/goal-utils";

// ============================================================================
// TYPES
// ============================================================================

export interface UseAllocationFormProps {
  goal: Goal | { id: string; title: string; startDate?: string; dueDate?: string };
  accounts: Account[];
  currentAccountValues: Map<string, number>;
  allAllocations: GoalAllocation[];
  allGoals: Goal[];
  open: boolean;
}

export interface UseAllocationFormResult {
  historicalValuesCache: HistoricalValuesCache;
  availableBalances: Record<string, number>;
  isFetchingHistory: boolean;
  isGoalAchieved: (goalId: string) => boolean;
  getCacheKey: (accountId: string, date: string) => string;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook to manage allocation form state including:
 * - Historical valuation fetching
 * - Time-aware unallocated balance calculation
 * - Goal achievement status checks
 */
export function useAllocationForm({
  goal,
  accounts,
  currentAccountValues,
  allAllocations,
  allGoals,
  open,
}: UseAllocationFormProps): UseAllocationFormResult {
  const [historicalValuesCache, setHistoricalValuesCache] = useState<HistoricalValuesCache>({});
  const [availableBalances, setAvailableBalances] = useState<Record<string, number>>({});
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  // Helper to get cache key
  const getCacheKey = (accountId: string, date: string) => `${accountId}:${date}`;

  // Helper to check if a goal is completed/achieved
  const isGoalAchieved = (goalId: string): boolean => {
    const goalInfo = allGoals.find((g) => g.id === goalId);
    return goalInfo?.isAchieved === true;
  };

  // Fetch historical valuations
  useEffect(() => {
    const fetchHistoricalValues = async () => {
      if (!open || accounts.length === 0) return;

      setIsFetchingHistory(true);
      const newCache: HistoricalValuesCache = {};

      try {
        // Collect all unique (accountId, date) pairs we need to fetch
        const fetchRequests: Array<{ accountId: string; date: string }> = [];

        // 1. Current goal's start date for all accounts
        const currentGoalStartDate = extractDateString(goal.startDate);
        if (currentGoalStartDate) {
          for (const account of accounts) {
            fetchRequests.push({ accountId: account.id, date: currentGoalStartDate });
          }
        }

        // 2. Other allocations' start dates (for their respective accounts)
        for (const alloc of allAllocations) {
          if (alloc.goalId === goal.id) continue; // Skip current goal's allocations

          // Use allocationDate or startDate from the allocation
          const allocStartDate = extractDateString(alloc.allocationDate || alloc.startDate);
          if (allocStartDate) {
            fetchRequests.push({ accountId: alloc.accountId, date: allocStartDate });
          }
        }

        // Deduplicate requests
        const uniqueRequests = Array.from(
          new Map(fetchRequests.map((r) => [getCacheKey(r.accountId, r.date), r])).values()
        );

        // Fetch all values in parallel
        await Promise.all(
          uniqueRequests.map(async ({ accountId, date }) => {
            try {
              const valuations = await getHistoricalValuations(accountId, date, date);
              if (valuations && valuations.length > 0) {
                newCache[getCacheKey(accountId, date)] = valuations[0].totalValue;
              } else {
                // If no exact match, try a 7-day window
                const endDate = new Date(date);
                endDate.setDate(endDate.getDate() + 7);
                const rangeValuations = await getHistoricalValuations(
                  accountId,
                  date,
                  endDate.toISOString().split("T")[0]
                );
                if (rangeValuations && rangeValuations.length > 0) {
                  newCache[getCacheKey(accountId, date)] = rangeValuations[0].totalValue;
                } else {
                  newCache[getCacheKey(accountId, date)] = 0;
                }
              }
            } catch (err) {
              console.error(`Failed to fetch history for account ${accountId} on ${date}`, err);
              newCache[getCacheKey(accountId, date)] = 0;
            }
          })
        );

        setHistoricalValuesCache(newCache);
      } catch (error) {
        console.error("Error fetching historical valuations", error);
      } finally {
        setIsFetchingHistory(false);
      }
    };

    fetchHistoricalValues();
  }, [open, goal.startDate, goal.id, accounts, allAllocations]);

  // Calculate available balances using TIME-AWARE logic
  useEffect(() => {
    if (!open) return;

    const balances: Record<string, number> = {};

    // Current goal's start date
    const currentGoalStartDate = extractDateString(goal.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const goalStartDateObj = goal.startDate ? new Date(goal.startDate) : null;
    const isPastGoal = goalStartDateObj && goalStartDateObj <= today;

    for (const account of accounts) {
      // Get account value at current goal's start date
      let accountValueAtGoalStart: number;
      if (isPastGoal && currentGoalStartDate) {
        accountValueAtGoalStart = historicalValuesCache[getCacheKey(account.id, currentGoalStartDate)] ?? 0;
      } else {
        // Future goal: use current account value
        accountValueAtGoalStart = currentAccountValues.get(account.id) || 0;
      }

      // Calculate contributed values from OTHER goals' allocations at current goal's start date
      const otherAllocationsContributedValues: number[] = [];

      for (const alloc of allAllocations) {
        // Skip current goal's allocations
        if (alloc.goalId === goal.id) continue;
        // Skip allocations for other accounts
        if (alloc.accountId !== account.id) continue;
        // Skip completed goals' allocations - they are released
        if (isGoalAchieved(alloc.goalId)) continue;

        // Get allocation's start date
        const allocStartDate = extractDateString(alloc.allocationDate || alloc.startDate);
        if (!allocStartDate) continue;

        // Get account value at allocation's start date
        const accountValueAtAllocStart = historicalValuesCache[getCacheKey(account.id, allocStartDate)] ?? 0;

        // Calculate contributed value at current goal's start date
        const allocStartDateObj = new Date(allocStartDate);
        const queryDateObj = goalStartDateObj || today;

        const contributedValue = calculateAllocationContributedValue(
          alloc.initialContribution || 0,
          alloc.allocatedPercent || 0,
          accountValueAtAllocStart,
          accountValueAtGoalStart,
          allocStartDateObj,
          queryDateObj
        );

        otherAllocationsContributedValues.push(contributedValue);
      }

      // Calculate unallocated balance
      balances[account.id] = calculateUnallocatedBalance(
        accountValueAtGoalStart,
        otherAllocationsContributedValues
      );
    }

    setAvailableBalances(balances);
  }, [open, historicalValuesCache, allAllocations, currentAccountValues, accounts, goal.startDate, goal.id]);

  return {
    historicalValuesCache,
    availableBalances,
    isFetchingHistory,
    isGoalAchieved,
    getCacheKey,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate the total percentage allocated from other goals for an account
 * Only counts overlapping goals that are not achieved
 */
export function calculateOtherGoalsPercentage(
  accountId: string,
  currentGoalId: string,
  currentGoalStartDate: string | undefined,
  currentGoalDueDate: string | undefined,
  allAllocations: GoalAllocation[],
  isGoalAchieved: (goalId: string) => boolean
): number {
  return allAllocations.reduce((sum, alloc) => {
    if (alloc.goalId === currentGoalId) return sum;
    if (alloc.accountId !== accountId) return sum;
    if (isGoalAchieved(alloc.goalId)) return sum;

    // Check if the other allocation's time period overlaps with current goal
    const overlaps = doDateRangesOverlap(
      currentGoalStartDate,
      currentGoalDueDate,
      alloc.startDate,
      alloc.endDate
    );

    if (!overlaps) return sum;

    return sum + (alloc.allocatedPercent || 0);
  }, 0);
}
