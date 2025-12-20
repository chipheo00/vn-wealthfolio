import { logger } from "@/adapters";
import { NewGoalInput, createGoal, deleteGoal, deleteGoalAllocation, updateGoal, updateGoalsAllocations } from "@/commands/goal";
import { QueryKeys } from "@/lib/query-keys";
import { Goal, GoalAllocation } from "@/lib/types";
import { UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ============ TYPES ============
export interface GoalMutations {
  addGoalMutation: UseMutationResult<Goal, Error, NewGoalInput, unknown>;
  updateGoalMutation: UseMutationResult<Goal, Error, Goal, unknown>;
  deleteGoalMutation: UseMutationResult<void, Error, string, unknown>;
  saveAllocationsMutation: UseMutationResult<void, Error, GoalAllocation[], unknown>;
  updateAllocationMutation: UseMutationResult<void, Error, GoalAllocation, unknown>;
  deleteAllocationMutation: UseMutationResult<void, Error, string, unknown>;
}

// ============ HELPERS ============
const handleSuccess = (queryClient: ReturnType<typeof useQueryClient>, message: string, invalidateKeys: string[]) => {
  invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  toast.success(message);
};

const handleError = (action: string, error: Error) => {
  logger.error(`Error ${action}: ${error}`);
  toast.error("Uh oh! Something went wrong.", {
    description: `There was a problem ${action}.`,
  });
};

// ============ HOOK ============
export const useGoalMutations = (): GoalMutations => {
  const queryClient = useQueryClient();

  const addGoalMutation = useMutation({
    mutationFn: createGoal,
    onSuccess: () =>
      handleSuccess(
        queryClient,
        "Goal added successfully. Start adding or importing this goal activities.",
        [QueryKeys.GOALS]
      ),
    onError: (e) => handleError("adding this goal", e),
  });

  const updateGoalMutation = useMutation({
    mutationFn: updateGoal,
    onSuccess: () => handleSuccess(queryClient, "Goal updated successfully.", [QueryKeys.GOALS]),
    onError: (e) => handleError("updating this goal", e),
  });

  const deleteGoalMutation = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () =>
      handleSuccess(queryClient, "Goal deleted successfully.", [
        QueryKeys.GOALS,
        QueryKeys.GOALS_ALLOCATIONS,
      ]),
    onError: (e) => handleError("deleting this goal", e),
  });

  const saveAllocationsMutation = useMutation({
    mutationFn: updateGoalsAllocations,
    onSuccess: () =>
      handleSuccess(queryClient, "Allocation saved successfully.", [
        QueryKeys.GOALS,
        QueryKeys.GOALS_ALLOCATIONS,
      ]),
    onError: (e) => handleError("saving the allocations", e),
  });

  const updateAllocationMutation = useMutation({
    mutationFn: async (allocation: GoalAllocation) => {
      await updateGoalsAllocations([allocation]);
    },
    onSuccess: () =>
      handleSuccess(queryClient, "Allocation updated successfully.", [
        QueryKeys.GOALS_ALLOCATIONS,
      ]),
    onError: (e) => handleError("updating the allocation", e),
  });

  const deleteAllocationMutation = useMutation({
    mutationFn: deleteGoalAllocation,
    onSuccess: () =>
      handleSuccess(queryClient, "Allocation deleted successfully.", [
        QueryKeys.GOALS_ALLOCATIONS,
      ]),
    onError: (e) => handleError("deleting the allocation", e),
  });

  return {
    addGoalMutation,
    updateGoalMutation,
    deleteGoalMutation,
    saveAllocationsMutation,
    updateAllocationMutation,
    deleteAllocationMutation,
  };
};
