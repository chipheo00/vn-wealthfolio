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
import { calculateAllocationContributedValue, calculateUnallocatedBalance } from "../lib/goal-utils";

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

// Type for storing historical values at multiple dates
interface HistoricalValuesCache {
  // Key: "accountId:date" -> value
  [key: string]: number;
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
  // Cache for historical values: key = "accountId:date", value = account value at that date
  const [historicalValuesCache, setHistoricalValuesCache] = useState<HistoricalValuesCache>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  // Helper to get cache key
  const getCacheKey = (accountId: string, date: string) => `${accountId}:${date}`;

  // Helper to parse date string to YYYY-MM-DD format
  const formatDateString = (date: string | undefined): string | null => {
    if (!date) return null;
    return date.split("T")[0];
  };

  // Fetch historical valuations for:
  // 1. Current goal's start date (for all accounts)
  // 2. Each other allocation's start date (for the respective account)
  useEffect(() => {
    const fetchHistoricalValues = async () => {
      if (!open || accounts.length === 0) return;

      setIsFetchingHistory(true);
      const newCache: HistoricalValuesCache = {};

      try {
        // Collect all unique (accountId, date) pairs we need to fetch
        const fetchRequests: Array<{ accountId: string; date: string }> = [];

        // 1. Current goal's start date for all accounts
        const currentGoalStartDate = formatDateString(goal.startDate);
        if (currentGoalStartDate) {
          for (const account of accounts) {
            fetchRequests.push({ accountId: account.id, date: currentGoalStartDate });
          }
        }

        // 2. Other allocations' start dates (for their respective accounts)
        for (const alloc of allAllocations) {
          if (alloc.goalId === goal.id) continue; // Skip current goal's allocations

          // Use allocationDate or startDate from the allocation (startDate is backfilled from goal)
          const allocStartDate = formatDateString(alloc.allocationDate || alloc.startDate);
          if (allocStartDate) {
            fetchRequests.push({ accountId: alloc.accountId, date: allocStartDate });
          }
        }

        // Deduplicate requests
        const uniqueRequests = Array.from(
          new Map(fetchRequests.map(r => [getCacheKey(r.accountId, r.date), r])).values()
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
  }, [open, goal.startDate, accounts, allAllocations, goal.id]);

  // Calculate available balances using TIME-AWARE logic
  // For each account:
  // 1. Get account value at current goal's start date
  // 2. For each OTHER goal's allocation on this account:
  //    - Calculate its contributed value at current goal's start date
  // 3. Unallocated balance = Account value - Sum of other allocations' contributed values
  const calculateAvailableBalances = () => {
    const balances: Record<string, number> = {};

    // Current goal's start date
    const currentGoalStartDate = formatDateString(goal.startDate);
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

        // Get allocation's start date (allocationDate or startDate which is backfilled from goal)
        const allocStartDate = formatDateString(alloc.allocationDate || alloc.startDate);
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
  };

  // Initialize and Recalculate when dependencies change
  useEffect(() => {
    if (open) {
      calculateAvailableBalances();
    }
  }, [open, historicalValuesCache, allAllocations, currentAccountValues, accounts, goal.startDate]); // Re-run when history loads

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
              const baseUnallocated = availableBalances[account.id] ?? 0;
              const hasError = errors[account.id];

              // Calculate what's already allocated to other goals (percentage)
              const otherGoalsPercent = allAllocations.reduce((sum, existingAlloc) => {
                if (existingAlloc.accountId === account.id && existingAlloc.goalId !== goal.id) {
                  return sum + (existingAlloc.allocatedPercent || 0);
                }
                return sum;
              }, 0);

              // Current user input for this goal
              const currentInputAmount = alloc?.allocationAmount || 0;
              const currentInputPercent = alloc?.allocatedPercent || 0;

              // Remaining unallocated after user's current input
              const remainingUnallocatedBalance = Math.max(0, baseUnallocated - currentInputAmount);
              const remainingUnallocatedPercent = Math.max(0, 100 - otherGoalsPercent - currentInputPercent);

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
                          <span className="text-muted-foreground text-xs">{t("editAllocationsModal.unallocatedBalance")}</span>
                          <span className="text-muted-foreground text-xs text-right">{t("editAllocationsModal.unallocatedPercent")}</span>

                          <span className={cn(
                            "font-mono font-medium",
                            remainingUnallocatedBalance < baseUnallocated * 0.1 ? "text-amber-500" : "text-foreground"
                          )}>
                            {formatAmount(remainingUnallocatedBalance, account.currency, true)}
                          </span>
                          <span className={cn(
                            "font-mono font-medium text-right",
                            remainingUnallocatedPercent < 10 ? "text-amber-500" : "text-green-600"
                          )}>
                            {remainingUnallocatedPercent.toFixed(1)}%
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
