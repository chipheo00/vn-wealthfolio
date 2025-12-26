/**
 * Goal Module Type Definitions
 * Centralized types for the goals feature
 */

import type { Goal, GoalAllocation } from "@/lib/types";

// ============================================================================
// PROGRESS TYPES
// ============================================================================

/**
 * Represents the current progress state of a goal
 */
export interface GoalProgress {
  goalId: string;
  currentValue: number;
  targetAmount: number;
  progress: number; // percentage (actual)
  expectedProgress: number; // percentage (based on timeline)
  isOnTrack: boolean;
  projectedValue: number; // projected value at today's date
  startValue: number; // sum of initial contributions
}

/**
 * Request for historical valuation data
 */
export interface HistoryRequest {
  accountId: string;
  date: string;
}

/**
 * Result from goal progress calculation
 */
export interface GoalProgressResult {
  goalProgressMap: Map<string, GoalProgress>;
  allocationProgressMap: Map<string, number>;
}

// ============================================================================
// CHART TYPES
// ============================================================================

/**
 * Time period options for chart display
 */
export type TimePeriodOption = "weeks" | "months" | "years" | "all";

/**
 * Single data point for the goal chart
 */
export interface GoalChartDataPoint {
  date: string;
  dateLabel: string;
  projected: number | null;
  actual: number | null;
}

/**
 * Result from the goal valuation history hook
 */
export interface UseGoalValuationHistoryResult {
  chartData: GoalChartDataPoint[];
  allocationValues: Map<string, number>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Options for the goal valuation history hook
 */
export interface UseGoalValuationHistoryOptions {
  startValue?: number;
  projectedFutureValue?: number;
}

/**
 * Display date range for charts
 */
export interface DateRange {
  displayStart: Date;
  displayEnd: Date;
}

/**
 * Allocation details for chart calculations
 */
export interface AllocationDetails {
  percentage: number;
  initialContribution: number;
  startDate?: string;
}

/**
 * Date range configuration for API calls
 */
export interface DateRangeConfig {
  startDate: string;
  endDate: string;
  goalStartDate: string;
}

// ============================================================================
// ALLOCATION FORM TYPES
// ============================================================================

/**
 * Cache for historical valuation values
 * Key format: "accountId:date"
 */
export interface HistoricalValuesCache {
  [key: string]: number;
}

/**
 * Allocation form state for a single account
 */
export interface AllocationFormState {
  allocationAmount: number;
  allocatedPercent: number;
}

/**
 * Result from allocation form calculations
 */
export interface AllocationFormResult {
  availableBalances: Record<string, number>;
  historicalValuesCache: HistoricalValuesCache;
  isFetchingHistory: boolean;
}

/**
 * Props for allocation form hooks
 */
export interface UseAllocationFormProps {
  goal: Goal | { id: string; title: string; startDate?: string; dueDate?: string };
  accounts?: { id: string; currency: string }[];
  currentAccountValues: Map<string, number>;
  allAllocations: GoalAllocation[];
  allGoals: Goal[];
  open: boolean;
}
