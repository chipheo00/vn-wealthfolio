import { getHistoricalValuations } from "@/commands/portfolio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { QueryKeys } from "@/lib/query-keys";
import { Account, Goal, GoalAllocation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { formatAmount } from "@wealthvn/ui";
import { Percent } from "lucide-react";
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{t("editModal.title", { title: goal.title })}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-2 px-1">
          {/* Summary Card */}
          <Card className="bg-primary/5 border-primary/20 shadow-none">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div>
                <h4 className="text-sm font-semibold text-primary mb-1">{t("editAllocationsModal.summary")}</h4>
                <p className="text-xs text-muted-foreground">
                  {t("editAllocationsModal.reviewAllocations")}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {Object.values(allocations).some(a => (a.allocationAmount > 0 || a.allocatedPercent > 0)) && (
                  <Badge variant="outline" className="bg-background text-primary border-primary/30">
                    {t("editAllocationsModal.totalAllocated")}: {Object.entries(allocations).filter(([_, v]) => v.allocationAmount > 0 || v.allocatedPercent > 0).length} {t("editAllocationsModal.accounts")}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {accounts.map((account) => {
              const alloc = allocations[account.id];
              const available = availableBalances[account.id];
              const hasError = errors[account.id];

              const otherGoalsPercent = allAllocations.reduce((sum, existingAlloc) => {
                if (existingAlloc.accountId === account.id && existingAlloc.goalId !== goal.id) {
                  return sum + (existingAlloc.allocatedPercent || 0);
                }
                return sum;
              }, 0);
              const unallocatedPercent = Math.max(0, 100 - otherGoalsPercent);

              // Get currency symbol
              const currencySymbol = (0).toLocaleString('en-US', { style: 'currency', currency: account.currency, minimumFractionDigits: 0 }).replace(/\d/g, '').trim();

              return (
                <Card
                  key={account.id}
                  className={cn(
                    "transition-all duration-200 border-muted hover:border-primary/50 hover:shadow-md",
                    hasError && "border-destructive/50 bg-destructive/5"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-6">

                      {/* Left: Account Info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-base flex items-center gap-2">
                            {account.name}
                            {/* Account Type or Icon could go here */}
                          </div>
                          <Badge variant="secondary" className="font-mono text-xs">{account.currency}</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span className="text-muted-foreground text-xs">{t("editAllocationsModal.available")}</span>
                          <span className="text-muted-foreground text-xs text-right">{t("editAllocationsModal.unallocatedPercent")}</span>

                          <span className="font-mono font-medium text-foreground">
                            {formatAmount(available ?? 0, account.currency, true)}
                          </span>
                          <span className={cn(
                            "font-mono font-medium text-right",
                            unallocatedPercent < 10 ? "text-amber-500" : "text-green-600"
                          )}>
                            {unallocatedPercent.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <Separator orientation="vertical" className="hidden md:block h-auto bg-border/50" />
                      <Separator orientation="horizontal" className="md:hidden bg-border/50" />

                      {/* Right: Inputs */}
                      <div className="flex-1 grid grid-cols-2 gap-4 items-start">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                            {t("editAllocationsModal.amount")}
                          </Label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                              {currencySymbol || "$"}
                            </div>
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
                              className={cn(
                                "pl-7 font-mono",
                                hasError && "border-destructive focus-visible:ring-destructive"
                              )}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                            {t("editAllocationsModal.allocatedPercent")}
                          </Label>
                          <div className="relative">
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
                              className={cn(
                                "pr-8 font-mono",
                                hasError && "border-destructive focus-visible:ring-destructive"
                              )}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                              <Percent className="h-3 w-3" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {hasError && (
                      <div className="mt-3 text-xs font-medium text-destructive bg-destructive/10 p-2 rounded flex items-center animate-in fade-in slide-in-from-top-1">
                        ⚠️ {hasError}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading || isFetchingHistory}>
            {t("editAllocationsModal.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || isFetchingHistory} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {isLoading ? t("editAllocationsModal.updating") : isFetchingHistory ? t("editAllocationsModal.loadingData") : t("editAllocationsModal.updateAllocations")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
