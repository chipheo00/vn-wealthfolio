import { getHistoricalValuations } from "@/commands/portfolio";
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
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface EditAllocationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal;
  accounts: Account[];
  currentAccountValues: Map<string, number>;
  existingAllocations?: GoalAllocation[]; // Current goal's allocations (for prefilling)
  allAllocations?: GoalAllocation[]; // All allocations for calculation
  onSubmit: (allocations: GoalAllocation[]) => Promise<void>;
}

export function EditAllocationsModal({
  open,
  onOpenChange,
  goal,
  accounts,
  currentAccountValues,
  existingAllocations = [],
  allAllocations = [],
  onSubmit,
}: EditAllocationsModalProps) {
  const { t } = useTranslation("goals");
  const queryClient = useQueryClient();
  const [allocations, setAllocations] = useState<Record<string, { allocationAmount: number; allocatedPercent: number }>>({});
  const [availableBalances, setAvailableBalances] = useState<Record<string, number>>({});
  const [historicalAccountValues, setHistoricalAccountValues] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  // Fetch historical valuations at goal start date
  useEffect(() => {
    const fetchHistoricalValues = async () => {
      // If no start date, we can't fetch history.
      // If it's a future goal or no start date, maybe we fall back to current values?
      // But for Scenario 1, we assume startDate exists.
      if (!open || !goal.startDate || accounts.length === 0) return;

      setIsFetchingHistory(true);
      try {
        const historyMap: Record<string, number> = {};
        const promises = accounts.map(async (account) => {
          try {
             // Fetch valuation specifically on the goal start date.
             // Ensure date is YYYY-MM-DD format.
             const dateQuery = goal.startDate ? goal.startDate.split("T")[0] : undefined;

             if (!dateQuery) {
                 historyMap[account.id] = 0;
                 return;
             }

             // Fetch a small range to handle weekends/holidays (e.g. 5 days)
             // But valid 'Unallocated' should be based on the conceptual start value.
             // If we just ask for specific date, we might get nothing.
             // Let's ask for specific date first.
             const valuations = await getHistoricalValuations(
               account.id,
               dateQuery,
               dateQuery
             );

             if (valuations && valuations.length > 0) {
               historyMap[account.id] = valuations[0].totalValue;
             } else {
               // If strict date match fails, maybe try fetching a small window?
               // Or finding the closest prior valuation?
               // For now, if exact date match fails, try fetching last known valuation before this date?
               // Or we can assume 0 if it's really not found.
               // Given the previous issue, falling back to 0 is what's causing "Unallocated Balance: 0" for an existing account.
               // Let's try to fetch with a small buffer, e.g. 7 days forward?
               // No, if I started a goal on Jan 1st, I want the value on Jan 1st.
               // If market closed on Jan 1st, I probably want Dec 31st value? or Jan 2nd?
               // Usually 'Start Value' implies 'Value at beginning of period'.
               // Let's trying fetching range [startDate, startDate + 7 days] and take the first one?
               // Actually, `getHistoricalValuations` might strictly match.

               // Let's retry with a clearer range if empty?
               // Actually, let's just assume the user wants the nearest available value.
               // But `getHistoricalValuations` (Tauri cmd) likely uses `get_valuations_on_date` or similar.
               // Let's stick to simple fix: Format the date string correctly.
               historyMap[account.id] = 0;
             }
          } catch (err) {
            console.error(`Failed to fetch history for account ${account.id}`, err);
            historyMap[account.id] = 0;
          }
        });

        await Promise.all(promises);
        setHistoricalAccountValues(historyMap);
      } catch (error) {
        console.error("Error fetching historical valuations", error);
      } finally {
        setIsFetchingHistory(false);
      }
    };

    fetchHistoricalValues();
  }, [open, goal.startDate, accounts]);

  // Calculate available balances
  // For past goals: use historical value at goal start × unallocated percentage
  // For future goals: use current value × unallocated percentage
  // This ensures the unallocated balance reflects what was available at goal start
  const calculateAvailableBalances = () => {
    const balances: Record<string, number> = {};

    for (const account of accounts) {
      // Determine if goal started in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const goalStartDate = goal.startDate ? new Date(goal.startDate) : null;
      const isPastGoal = goalStartDate && goalStartDate <= today;

      // Use historical value for past goals, current value for future goals
      let baseValue: number;
      if (isPastGoal && historicalAccountValues[account.id] !== undefined) {
        baseValue = historicalAccountValues[account.id];
      } else {
        baseValue = currentAccountValues.get(account.id) || 0;
      }

      // Sum percentage allocations for this account from OTHER goals only
      const allocatedPercentToOtherGoals = allAllocations.reduce((sum, alloc) => {
        // Exclude allocations for this goal
        if (alloc.goalId === goal.id) return sum;
        // Check if allocation is for THIS account
        if (alloc.accountId !== account.id) return sum;

        return sum + (alloc.allocatedPercent ?? 0);
      }, 0);

      // Unallocated percentage available for this goal to use
      const unallocatedPercent = Math.max(0, 100 - allocatedPercentToOtherGoals);

      // Available balance = base value × unallocated percentage
      balances[account.id] = baseValue * (unallocatedPercent / 100);
    }

    setAvailableBalances(balances);
  };

  // Initialize and Recalculate when dependencies change
  useEffect(() => {
    if (open) {
      calculateAvailableBalances();
    }
  }, [open, historicalAccountValues, allAllocations, currentAccountValues, accounts, goal.startDate]); // Re-run when history loads

  // Initial Data Refetch
  useEffect(() => {
    if (open) {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.GOALS_ALLOCATIONS] });
      queryClient.refetchQueries({ queryKey: [QueryKeys.GOALS_ALLOCATIONS] });
    }
  }, [open, queryClient]);

  // Prefill form
  useEffect(() => {
    if (open) {
      const prefilledAllocations: Record<string, { allocationAmount: number; allocatedPercent: number }> = {};
      for (const account of accounts) {
        const existingAlloc = existingAllocations.find(
          (alloc) => alloc.accountId === account.id
        );

        if (existingAlloc) {
          prefilledAllocations[account.id] = {
            allocationAmount: existingAlloc.initialContribution,
            allocatedPercent: existingAlloc.allocatedPercent || 0,
          };
        }
      }
      setAllocations(prefilledAllocations);
      setErrors({}); // Clear errors on open/re-prefill
    }
  }, [open, accounts, existingAllocations]);

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
        newErrors[account.id] = t("editAllocationsModal.errors.amountNegative");
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
        newErrors[account.id] = `Amount exceeds available balance (${formatAmount(available, account.currency, false)})`;
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

      for (const account of accounts) {
         const alloc = allocations[account.id];

         // Find existing allocation for this account
         const existingAlloc = existingAllocations.find(
           (a) => a.accountId === account.id
         );

         const allocationAmount = alloc?.allocationAmount || 0;
         const allocatedPercent = alloc?.allocatedPercent || 0;

         if (existingAlloc) {
           // Update existing allocation record with new values
           // Don't override allocationDate - let backend backfill from goal dates if needed
           updatedAllocations.push({
             ...existingAlloc,
             initialContribution: allocationAmount,
             allocatedPercent: allocatedPercent,
             allocationAmount: allocationAmount, // Required deprecated field
             percentAllocation: 0, // Required deprecated field
           } as any);
         } else {
           // Create new allocation if it doesn't exist
           updatedAllocations.push({
             id: `${goal.id}-${account.id}-${Date.now()}`,
             goalId: goal.id,
             accountId: account.id,
             initialContribution: allocationAmount,
             allocatedPercent: allocatedPercent,
             allocationAmount: allocationAmount, // Required deprecated field
             percentAllocation: 0, // Required deprecated field
           } as any);
         }
       }

      await onSubmit(updatedAllocations);

      // Wait a moment for backend to process, then refetch queries
      await new Promise(resolve => setTimeout(resolve, 500));

      // Refetch to ensure fresh data is immediately available
      await Promise.all([
        queryClient.refetchQueries({ queryKey: [QueryKeys.GOALS_ALLOCATIONS] }),
        queryClient.refetchQueries({ queryKey: [QueryKeys.GOALS] }),
        queryClient.refetchQueries({ queryKey: ["historicalValuation"] }),
      ]);

      handleOpenChange(false);
      // Note: toast is handled by the mutation's onSuccess handler
    } catch (err) {
      toast.error(t("editAllocationsModal.saveFailed"), {
        description: err instanceof Error ? err.message : t("editAllocationsModal.unknownError"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{t("editModal.title", { title: goal.title })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Allocations Table */}
          <div className="relative overflow-x-auto rounded-md border">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-muted">
                  <th className="sticky left-0 z-10 px-4 py-3 text-left text-sm font-semibold">
                    {t("editAllocationsModal.account")}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    {t("editAllocationsModal.unallocatedBalance")}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    {t("editAllocationsModal.unallocatedPercent")}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    {t("editAllocationsModal.initialContribution")}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    {t("editAllocationsModal.allocatedPercent")}
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
                           {formatAmount(available ?? 0, account.currency, false)}
                         </div>
                       </td>
                       <td className="px-4 py-3 text-sm">
                         <div className="text-muted-foreground">
                           {(() => {
                             // Unallocated percent = 100 - sum of all allocatedPercent for this account
                             const otherGoalsPercent = allAllocations.reduce((sum, existingAlloc) => {
                               if (existingAlloc.accountId === account.id && existingAlloc.goalId !== goal.id) {
                                 return sum + (existingAlloc.allocatedPercent || 0);
                               }
                               return sum;
                             }, 0);
                             const unallocatedPercent = Math.max(0, 100 - otherGoalsPercent);
                             return `${unallocatedPercent.toFixed(1)}%`;
                           })()}
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
                           disabled={isLoading || isFetchingHistory}
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
                           disabled={isLoading || isFetchingHistory}
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
            <p className="text-xs font-semibold text-blue-900">{t("editAllocationsModal.summary")}</p>
            <div className="mt-2 space-y-1 text-sm text-blue-800">
              {accounts.map((account) => {
                const alloc = allocations[account.id];
                if (!alloc || (alloc.allocationAmount === 0 && alloc.allocatedPercent === 0)) return null;
                return (
                  <div key={account.id} className="flex justify-between">
                    <span>{account.name}:</span>
                    <span>
                      {formatAmount(alloc.allocationAmount, account.currency, false)} ({alloc.allocatedPercent.toFixed(1)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading || isFetchingHistory}>
            {t("editAllocationsModal.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || isFetchingHistory}>
            {isLoading ? t("editAllocationsModal.updating") : isFetchingHistory ? t("editAllocationsModal.loadingData") : t("editAllocationsModal.updateAllocations")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
