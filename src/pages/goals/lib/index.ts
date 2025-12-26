/**
 * Goals Module Library Exports
 * Centralized exports for all goal-related utilities, types, and functions
 */

// Types
export * from "./goal-types";

// Core utilities
export {
    // Allocation helpers
    calculateAllocationContributedValue, calculateDailyInvestment,
    // Projection calculations
    calculateProjectedValue,
    calculateProjectedValueByDate, calculateUnallocatedBalance,
    calculateUnallocatedPercentage,
    doDateRangesOverlap,
    // Date utilities
    extractDateString, formatGoalDateForApi, getAllocationStartDate, getDaysDiff, getGoalStatus, getTodayString,
    // Goal status
    isGoalOnTrack,
    isGoalOnTrackByDate,
    isGoalScheduled, parseGoalDate,
    parseGoalDateOptional
} from "./goal-utils";

// Chart utilities
export {
    calculateDisplayDateRange, formatDateLabel, generateDateIntervals, getActualValue, getDisplayCounts, getInterpolationPoints, getSpecialDateLabel, isInSamePeriodAsIntervals, isSamePeriod
} from "./chart-utils";

// Allocation utilities
export {
    aggregateValuationsByPeriod, buildAllocationDetailsMap,
    calculateActualValuesByDate
} from "./allocation-utils";
