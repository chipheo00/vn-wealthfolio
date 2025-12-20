import {
    validateAllocationConflict,
    type AllocationConflictValidationRequest,
} from "@/commands/goal";
import type { Goal, GoalAllocation } from "@/lib/types";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef } from "react";

export interface ConflictInfo {
  valid: boolean;
  message: string;
  existingAllocations?: {
    goalTitle: string;
    percentage: number;
  }[];
  maxAvailable?: number;
}

interface UseAllocationConflictOptions {
  allAllocations: GoalAllocation[];
  goals: Goal[];
}



/**
 * Hook to validate allocation conflicts using the backend API
 * and provide detailed conflict information for the UI
 */
export function useAllocationConflict({ allAllocations, goals }: UseAllocationConflictOptions) {
  // Use refs to avoid recreating callbacks when these values change
  const allAllocationsRef = useRef(allAllocations);
  const goalsRef = useRef(goals);
  allAllocationsRef.current = allAllocations;
  goalsRef.current = goals;

  const validateMutation = useMutation({
    mutationFn: (request: AllocationConflictValidationRequest) =>
      validateAllocationConflict(request),
  });

  // Use ref to avoid validateMutation in dependencies causing infinite loop
  const validateMutationRef = useRef(validateMutation);
  validateMutationRef.current = validateMutation;

  /**
   * Validate a single allocation against all others
   * Returns detailed conflict info including existing allocations and max available
   * Note: Currently validates by account only (no date ranges)
   */
  const validateAllocation = useCallback(
    async (allocation: GoalAllocation, excludeIds?: string[]): Promise<ConflictInfo> => {
      // Skip validation if account or percentage not set
      if (!allocation.accountId || allocation.allocatedPercent <= 0) {
        return { valid: true, message: "" };
      }

      try {
        // Find existing allocations for the same account
        const idsToExclude = new Set(excludeIds || []);
        idsToExclude.add(allocation.id);

        const existingAllocations = allAllocationsRef.current
          .filter(
            (a) =>
              a.accountId === allocation.accountId &&
              !idsToExclude.has(a.id) &&
              a.allocatedPercent > 0,
          )
          .map((a) => {
            const goal = goalsRef.current.find((g) => g.id === a.goalId);
            return {
              goalTitle: goal?.title || "Unknown Goal",
              percentage: a.allocatedPercent,
            };
          });

        const totalExisting = existingAllocations.reduce((sum, a) => sum + a.percentage, 0);
        const totalWithNew = totalExisting + allocation.allocatedPercent;
        const maxAvailable = Math.max(0, 100 - totalExisting);

        if (totalWithNew > 100) {
          return {
            valid: false,
            message: `Total allocation exceeds 100% (current: ${totalExisting}%, adding: ${allocation.allocatedPercent}%)`,
            existingAllocations,
            maxAvailable,
          };
        }

        return { valid: true, message: "" };
      } catch {
        return {
          valid: false,
          message: "Error validating allocation",
        };
      }
    },
    [], // No dependencies - using refs instead
  );

  return {
    validateAllocation,
    isValidating: validateMutation.isPending,
  };
}
