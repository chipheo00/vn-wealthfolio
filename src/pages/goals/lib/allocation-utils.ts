/**
 * Allocation Utilities for Goals Module
 * Functions for allocation calculations and historical value lookups
 */

import type { AccountValuation, GoalAllocation } from "@/lib/types";
import { format } from "date-fns";
import type { AllocationDetails } from "./goal-types";
import { extractDateString, getAllocationStartDate } from "./goal-utils";

// ============================================================================
// ALLOCATION DETAILS MAP
// ============================================================================

/**
 * Build allocation details map from allocations
 */
export function buildAllocationDetailsMap(
  allocations: GoalAllocation[] | undefined,
  goalId: string,
  goalStartDate: string
): Map<string, AllocationDetails> {
  const detailsMap = new Map<string, AllocationDetails>();

  allocations?.forEach((alloc) => {
    if (alloc.goalId === goalId) {
      // Use utility to get allocation start date with proper fallbacks
      const startDate = getAllocationStartDate(alloc.allocationDate, alloc.startDate, goalStartDate);
      detailsMap.set(alloc.accountId, {
        percentage: alloc.allocatedPercent / 100,
        initialContribution: alloc.initialContribution,
        startDate,
      });
    }
  });

  return detailsMap;
}

// ============================================================================
// ACTUAL VALUE CALCULATIONS
// ============================================================================

/**
 * Calculate actual values from historical valuations
 */
export function calculateActualValuesByDate(
  historicalValuations: Map<string, AccountValuation[]> | undefined,
  allocationDetailsMap: Map<string, AllocationDetails>,
  goalStartDate: string
): {
  actualValuesByDate: Map<string, number>;
  latestActualValue: number | null;
  latestAllocationValues: Map<string, number>; // Per-allocation values (accountId -> value)
} {
  const actualValuesByDate = new Map<string, number>();
  let latestActualValue: number | null = null;
  const latestAllocationValues = new Map<string, number>();

  if (!historicalValuations || historicalValuations.size === 0) {
    return { actualValuesByDate, latestActualValue, latestAllocationValues };
  }

  // Get all unique dates across all accounts
  const allDates = new Set<string>();
  historicalValuations.forEach((valuations) => {
    valuations.forEach((v) => allDates.add(v.valuationDate));
  });

  // Sort dates
  const sortedDates = Array.from(allDates).sort();

  // For each date, calculate the total allocated value
  sortedDates.forEach((dateStr) => {
    let totalValue = 0;

    allocationDetailsMap.forEach((allocationDetails, accountId) => {
      const { initialContribution, percentage, startDate } = allocationDetails;
      let allocationValue = initialContribution;

      const valuations = historicalValuations.get(accountId);
      const valuation = valuations?.find((v) => v.valuationDate === dateStr);

      if (valuation && valuations) {
        let startAccountValue = 0;
        const baselineDate = startDate || extractDateString(goalStartDate);

        if (baselineDate) {
          const startValuation = valuations.find((v) => v.valuationDate === baselineDate);
          if (startValuation) {
            startAccountValue = startValuation.totalValue;
          } else if (valuations.length > 0) {
            // Find earliest available valuation
            const earliestValuation = valuations.reduce((prev, curr) =>
              prev.valuationDate < curr.valuationDate ? prev : curr
            );

            // Only use earliest valuation if it's BEFORE or ON the baseline date
            // If the account was created AFTER the goal started, use 0 as baseline
            // This means all account value is attributed to the goal's growth
            if (earliestValuation.valuationDate <= baselineDate) {
              startAccountValue = earliestValuation.totalValue;
            } else {
              // Account created after goal started - startAccountValue = 0
              startAccountValue = 0;
            }
          }
        }

        const accountGrowth = valuation.totalValue - startAccountValue;
        const allocatedGrowth = accountGrowth * percentage;
        allocationValue += allocatedGrowth;
      }

      totalValue += allocationValue;
      // Track the latest value for this allocation (will be overwritten as we iterate through dates)
      latestAllocationValues.set(accountId, allocationValue);
    });

    if (totalValue > 0) {
      actualValuesByDate.set(dateStr, totalValue);
      latestActualValue = totalValue;
    }
  });

  return { actualValuesByDate, latestActualValue, latestAllocationValues };
}

// ============================================================================
// VALUATION AGGREGATION
// ============================================================================

/**
 * Aggregate valuation data by the specified period
 */
export function aggregateValuationsByPeriod(
  valuations: Map<string, number>,
  dates: Date[],
  _period: string
): Map<string, number> {
  const aggregated = new Map<string, number>();

  dates.forEach((date) => {
    const dateStr = format(date, "yyyy-MM-dd");

    // For each aggregation date, find the nearest valuation on or before it
    let nearestValue: number | null = null;
    let nearestDate: string | null = null;

    valuations.forEach((value, valuationDateStr) => {
      if (valuationDateStr <= dateStr) {
        if (!nearestDate || valuationDateStr > nearestDate) {
          nearestDate = valuationDateStr;
          nearestValue = value;
        }
      }
    });

    if (nearestValue !== null) {
      aggregated.set(dateStr, nearestValue);
    }
  });

  return aggregated;
}
