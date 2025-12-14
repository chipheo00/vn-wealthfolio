import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { QueryKeys } from "@/lib/query-keys";
import { Account, Goal, GoalAllocation } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";
import { formatAmount } from "@wealthvn/ui";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface EditAllocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal;
  accounts: Account[];
  currentAccountValues: Map<string, number>;
  existingAllocations?: GoalAllocation[]; // Current goal's allocations (for prefilling)
  allAllocations?: GoalAllocation[]; // All allocations for calculation
  onSubmit: (allocations: GoalAllocation[]) => Promise<void>;
}

export function EditAllocationModal({
  open,
  onOpenChange,
  goal,
  accounts,
  currentAccountValues,
  existingAllocations = [],
  allAllocations = [],
  onSubmit,
}: EditAllocationModalProps) {
  const queryClient = useQueryClient();
  const [allocations, setAllocations] = useState<Record<string, { allocationAmount: number; allocatedPercent: number }>>({});
  const [availableBalances, setAvailableBalances] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Calculate available balances when modal opens
  // Available = Unallocated from other goals + Current goal's allocation for this account
  const calculateAvailableBalances = () => {
    const balances: Record<string, number> = {};

    console.log("[Modal] Calculating available balances...");
    console.log("[Modal] accounts:", accounts);
    console.log("[Modal] currentAccountValues Map:", currentAccountValues);
    console.log("[Modal] existingAllocations:", existingAllocations);
    console.log("[Modal] allAllocations:", allAllocations);

    for (const account of accounts) {
      const currentValue = currentAccountValues.get(account.id) || 0;
      console.log(`[Modal] Account ${account.id} (${account.name}): value=${currentValue}`);

      // Sum allocations for this account from OTHER goals (not this goal)
      const allocatedToOtherGoals = allAllocations.reduce((sum, alloc) => {
          return sum + (alloc.initialContribution ?? 0);
        }
        return sum;
      }, 0);

      // Available = Unallocated from other goals at this goal's start date
      // This gives us the max amount that can be allocated to this goal
      balances[account.id] = Math.max(0, currentValue - allocatedToOtherGoals);
    }

    setAvailableBalances(balances);
  };

  // Initialize when modal opens
  useEffect(() => {
    if (open) {
      // Invalidate and refetch allocations to ensure fresh data
      queryClient.invalidateQueries({ queryKey: [QueryKeys.GOALS_ALLOCATIONS] });
      queryClient.refetchQueries({ queryKey: [QueryKeys.GOALS_ALLOCATIONS] });
    }
  }, [open, queryClient]);

  // Prefill form when allocations are updated
  useEffect(() => {
    if (open) {
      calculateAvailableBalances();

      // Prefill allocations with existing goal allocations
      const prefilledAllocations: Record<string, { allocationAmount: number; allocatedPercent: number }> = {};
      for (const account of accounts) {
        // Find existing allocation for this account in this goal
        const existingAlloc = existingAllocations.find(
          (alloc) => alloc.accountId === account.id
        );

        if (existingAlloc) {
          // Prefill with existing allocation values
          prefilledAllocations[account.id] = {
            allocationAmount: existingAlloc.initialContribution,
            allocatedPercent: existingAlloc.allocatedPercent || 0,
          };
        }
      }

      setAllocations(prefilledAllocations);
      setErrors({});
    }
  }, [open, existingAllocations, allAllocations, accounts, currentAccountValues]);

  // Handle modal open/close
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  // Handle amount change - INDEPENDENT from percentage
  const handleAmountChange = (accountId: string, value: number) => {
    setAllocations((prev) => ({
      ...prev,
      [accountId]: {
        allocationAmount: value,
        allocatedPercent: prev[accountId]?.allocatedPercent || 0,
      },
    }));
    setErrors((prev) => ({ ...prev, [accountId]: "" }));
  };

  // Handle percentage change - INDEPENDENT from amount
  const handlePercentageChange = (accountId: string, value: number) => {
    setAllocations((prev) => ({
      ...prev,
      [accountId]: {
        allocationAmount: prev[accountId]?.allocationAmount || 0,
        allocatedPercent: value,
      },
    }));
    setErrors((prev) => ({ ...prev, [accountId]: "" }));
  };

  // Validate form
  const validateForm = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    for (const account of accounts) {
      const alloc = allocations[account.id];

      // Skip if no allocation set for this account
      if (!alloc || (alloc.allocationAmount === 0 && alloc.allocatedPercent === 0)) continue;

      // Validate amount - must be > 0 if set
      if (alloc.allocationAmount < 0) {
        newErrors[account.id] = "Amount cannot be negative";
        continue;
      }

      // Validate percentage - must be between 0 and 100
      if (alloc.allocatedPercent < 0 || alloc.allocatedPercent > 100) {
        newErrors[account.id] = "Percentage must be between 0 and 100";
        continue;
      }

      // Check available balance for amount
      const available = availableBalances[account.id] || 0;
      if (alloc.allocationAmount > available) {
        newErrors[account.id] = `Amount exceeds available balance (${formatAmount(available, "USD", false)})`;
        continue;
      }

      // Check total percentage across all goals for this account
      // Sum percentages from other goals
      const otherGoalsPercentage = allAllocations.reduce((sum, existingAlloc) => {
        if (existingAlloc.accountId === account.id && existingAlloc.goalId !== goal.id) {
          return sum + (existingAlloc.allocatedPercent || 0);
        }
        return sum;
      }, 0);

      const totalPercentage = otherGoalsPercentage + alloc.allocatedPercent;
      if (totalPercentage > 100) {
        newErrors[account.id] = `Total allocation exceeds 100% (other goals: ${otherGoalsPercentage.toFixed(1)}%, this: ${alloc.allocatedPercent.toFixed(1)}%)`;
        continue;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!(await validateForm())) {
      return;
    }

    setIsLoading(true);
    try {
      const updatedAllocations: GoalAllocation[] = [];
      const allocationDate = new Date().toISOString().split("T")[0];

      for (const account of accounts) {
        const alloc = allocations[account.id];

        // Find existing allocation for this account (should always exist)
        const existingAlloc = existingAllocations.find(
          (a) => a.accountId === account.id
        );

        if (!existingAlloc) {
          console.warn(`No existing allocation found for account ${account.id}`);
          continue;
        }

        // Update existing allocation record with new values
        updatedAllocations.push({
          ...existingAlloc,
          initialContribution: alloc?.allocationAmount || 0,
          allocatedPercent: alloc?.allocatedPercent || 0,
          allocationDate: existingAlloc.allocationDate || allocationDate,
        });
      }

      await onSubmit(updatedAllocations);
      handleOpenChange(false);
      toast.success("Allocations Updated", {
        description: `Updated allocations for ${goal.title}`,
      });
    } catch (err) {
      toast.error("Failed to update allocations", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Edit Allocations for {goal.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Allocations Table */}
          <div className="relative overflow-x-auto rounded-md border">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-muted">
                  <th className="sticky left-0 z-10 px-4 py-3 text-left text-sm font-semibold">
                    Account
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Available Balance
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Initial Contribution
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Allocated Percent
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => {
                  const alloc = allocations[account.id];
                  const available = availableBalances[account.id];
                  const hasError = errors[account.id];

                  return (
                    <tr key={account.id} className="border-t">
                      <td className="sticky left-0 z-10 bg-muted/50 px-4 py-3 font-medium text-sm">
                        {account.name}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="text-muted-foreground">
                          {formatAmount(available ?? 0, "USD", false)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={alloc?.allocationAmount ?? ""}
                          onChange={(e) =>
                            handleAmountChange(account.id, Number(e.target.value))
                          }
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          disabled={isLoading}
                          className={`w-32 ${hasError ? "border-red-500" : ""}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={alloc?.allocatedPercent ?? ""}
                          onChange={(e) =>
                            handlePercentageChange(account.id, Number(e.target.value))
                          }
                          placeholder="0"
                          step="0.1"
                          min="0"
                          max="100"
                          disabled={isLoading}
                          className={`w-24 ${hasError ? "border-red-500" : ""}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Error messages */}
          {Object.entries(errors).map(([accountId, error]) => {
            const account = accounts.find((a) => a.id === accountId);
            return (
              error && (
                <div key={accountId} className="rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-800">
                    <span className="font-semibold">{account?.name}:</span> {error}
                  </p>
                </div>
              )
            );
          })}

          {/* Summary */}
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-xs font-semibold text-blue-900">Summary</p>
            <div className="mt-2 space-y-1 text-sm text-blue-800">
              {accounts.map((account) => {
                const alloc = allocations[account.id];
                if (!alloc || (alloc.allocationAmount === 0 && alloc.allocatedPercent === 0)) return null;
                return (
                  <div key={account.id} className="flex justify-between">
                    <span>{account.name}:</span>
                    <span>
                      {formatAmount(alloc.allocationAmount, "USD", false)} ({alloc.allocatedPercent.toFixed(1)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Allocations"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
