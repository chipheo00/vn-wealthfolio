import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Account, GoalAllocation } from "@/lib/types";
import { formatAmount } from "@wealthvn/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface EditSingleAllocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: { id: string; title: string };
  account: Account;
  currentAllocation?: GoalAllocation;
  currentAccountValue: number;
  onSubmit: (allocation: GoalAllocation) => Promise<void>;
}

export function EditSingleAllocationModal({
  open,
  onOpenChange,
  goal,
  account,
  currentAllocation,
  currentAccountValue,
  onSubmit,
}: EditSingleAllocationModalProps) {
  const { t } = useTranslation("goals");
  const [amount, setAmount] = useState<number>(currentAllocation?.initialContribution || 0);
  const [percentage, setPercentage] = useState<number>(currentAllocation?.allocatedPercent || 0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when opening (in case props changed)
  useEffect(() => {
    if (!open) return;
    setAmount(currentAllocation?.initialContribution || 0);
    setPercentage(currentAllocation?.allocatedPercent || 0);
    setErrors({});
  }, [open, currentAllocation]);

  // Handle amount change - INDEPENDENT from percentage
  const handleAmountChange = (value: number) => {
    setAmount(value);
    setErrors((prev) => ({ ...prev, amount: "" }));
  };

  // Handle percentage change - INDEPENDENT from amount
  const handlePercentageChange = (value: number) => {
    setPercentage(value);
    setErrors((prev) => ({ ...prev, percentage: "" }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (amount < 0) {
      newErrors.amount = t("singleAllocationModal.errors.amountNegative");
    }

    if (percentage < 0 || percentage > 100) {
      newErrors.percentage = t("singleAllocationModal.errors.percentageRange");
    }

    if (amount === 0 && percentage === 0) {
       newErrors.amount = t("singleAllocationModal.errors.allocationRequired");
    }

    // Simple check: percentage should not exceed 100%
    // Backend will do the full validation including other allocations
    if (percentage > 100) {
      newErrors.percentage = t("singleAllocationModal.errors.percentageExceeds");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const allocation: GoalAllocation = {
        id: currentAllocation?.id || `${goal.id}-${account.id}-${Date.now()}`,
        goalId: goal.id,
        accountId: account.id,
        initialContribution: amount,
        allocatedPercent: percentage,
        // allocationDate follows goal's dates - handled by backend
        allocationDate: currentAllocation?.allocationDate,
        // Required deprecated fields for backend compatibility
        percentAllocation: percentage,
        allocationAmount: amount,
      } as GoalAllocation;

      await onSubmit(allocation);
      onOpenChange(false);
      setAmount(0);
      setPercentage(0);
      // Toast is handled by the mutation hook, no need to show it here
    } catch (err) {
      toast.error(t("singleAllocationModal.saveFailed"), {
        description: err instanceof Error ? err.message : t("singleAllocationModal.unknownError"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {currentAllocation ? t("singleAllocationModal.editTitle") : t("singleAllocationModal.createTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Goal and Account Info */}
          <div className="rounded-lg bg-muted p-3">
            <div className="text-sm">
              <p className="font-semibold">{goal.title}</p>
              <p className="text-muted-foreground text-xs">{account.name}</p>
            </div>
          </div>

          {/* Account Balance and Growth Allocation Status */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">{t("singleAllocationModal.accountBalance")}</p>
              <p className="font-semibold">{formatAmount(currentAccountValue, account.currency, false)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">{t("singleAllocationModal.unallocatedGrowth")}</p>
              <p className="font-semibold text-green-600">
                {Math.max(0, 100 - percentage).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <Label className="text-sm">{t("singleAllocationModal.initialContribution")}</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => handleAmountChange(Number(e.target.value))}
              placeholder="0.00"
              step="0.01"
              min="0"
              disabled={isLoading}
              className={errors.amount ? "border-red-500" : ""}
            />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
          </div>

          {/* Percentage Input */}
          <div>
            <Label className="text-sm">{t("singleAllocationModal.allocationPercentage")}</Label>
            <Input
              type="number"
              value={percentage}
              onChange={(e) => handlePercentageChange(Number(e.target.value))}
              placeholder="0"
              step="0.1"
              min="0"
              max="100"
              disabled={isLoading}
              className={errors.percentage ? "border-red-500" : ""}
            />
            {errors.percentage && <p className="text-red-500 text-xs mt-1">{errors.percentage}</p>}
          </div>

          {/* Projected Contribution Value */}
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-xs text-muted-foreground">{t("singleAllocationModal.projectedContributionValue")}</p>
            <p className="font-semibold text-blue-600">
              {formatAmount(
                amount + Math.max(0, (currentAccountValue - amount) * (percentage / 100)),
                account.currency,
                false
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              ({t("singleAllocationModal.initial")}: {formatAmount(amount, account.currency, false)} + {t("singleAllocationModal.growth")}: {formatAmount(
                Math.max(0, (currentAccountValue - amount) * (percentage / 100)),
                account.currency,
                false
              )})
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t("singleAllocationModal.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? t("singleAllocationModal.saving") : t("singleAllocationModal.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
