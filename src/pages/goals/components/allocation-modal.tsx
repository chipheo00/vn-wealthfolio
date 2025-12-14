import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Account, GoalAllocation } from "@/lib/types";
import { invoke } from "@tauri-apps/api/core";
import { DatePickerInput } from "@wealthvn/ui";

interface AllocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: { id: string; title: string };
  account: Account;
  currentAllocation?: GoalAllocation;
  currentAccountValue: number;
  onSubmit: (allocation: GoalAllocation) => Promise<void>;
}

export function AllocationModal({
  open,
  onOpenChange,
  goal,
  account,
  currentAllocation,
  currentAccountValue,
  onSubmit,
}: AllocationModalProps) {
  const [amount, setAmount] = useState<number>(currentAllocation?.allocationAmount || 0);
  const [percentage, setPercentage] = useState<number>(currentAllocation?.allocatedPercent || 0);
  const [allocationDate, setAllocationDate] = useState<string>(
    currentAllocation?.allocationDate || new Date().toISOString().split("T")[0]
  );
  const [unallocatedBalance, setUnallocatedBalance] = useState<number>(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Calculate unallocated balance on mount
  useEffect(() => {
    if (!open) return;
    
    const fetchUnallocated = async () => {
      try {
        const result: { unallocated_balance: number } = await invoke(
          "get_unallocated_balance",
          {
            accountId: account.id,
            currentAccountValue,
          }
        );
        setUnallocatedBalance(result.unallocated_balance);
      } catch (err) {
        console.error("Failed to fetch unallocated balance:", err);
      }
    };

    fetchUnallocated();
  }, [open, account.id, currentAccountValue]);

  // Handle amount change
  const handleAmountChange = (value: number) => {
    setAmount(value);
    // Auto-calculate percentage if editing amount
    if (currentAccountValue > 0) {
      const newPercentage = (value / currentAccountValue) * 100;
      setPercentage(Math.round(newPercentage * 100) / 100);
    }
    setErrors((prev) => ({ ...prev, amount: "" }));
  };

  // Handle percentage change
  const handlePercentageChange = (value: number) => {
    setPercentage(value);
    // Auto-calculate amount if editing percentage
    const newAmount = (value / 100) * currentAccountValue;
    setAmount(Math.round(newAmount * 100) / 100);
    setErrors((prev) => ({ ...prev, percentage: "" }));
  };

  // Validate form
  const validateForm = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    if (amount <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    }

    if (percentage <= 0 || percentage > 100) {
      newErrors.percentage = "Percentage must be between 0 and 100";
    }

    // Check unallocated balance (only for new allocations)
    if (!currentAllocation && amount > unallocatedBalance) {
      newErrors.amount = `Amount exceeds available unallocated balance ($${unallocatedBalance.toFixed(2)})`;
    }

    // Validate percentage doesn't exceed 100% with other allocations
    try {
      const response: { valid: boolean; message: string } = await invoke(
        "validate_allocation_percentages",
        {
          accountId: account.id,
          newPercentage: percentage,
          excludeAllocationId: currentAllocation?.id,
        }
      );

      if (!response.valid) {
        newErrors.percentage = response.message;
      }
    } catch (err) {
      newErrors.percentage = "Validation error";
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
      const allocation: GoalAllocation = {
        id: currentAllocation?.id || `${goal.id}-${account.id}-${Date.now()}`,
        goalId: goal.id,
        accountId: account.id,
        initialContribution: currentAllocation?.initialContribution || amount,
        allocatedPercent: percentage,
        allocationDate,
      };

      await onSubmit(allocation);
      onOpenChange(false);
      setAmount(0);
      setPercentage(0);
      toast[currentAllocation ? "success" : "success"](
        currentAllocation ? "Allocation Updated" : "Allocation Created",
        {
          description: `${goal.title} on ${account.name}`,
        }
      );
    } catch (err) {
      toast.error("Failed to save allocation", {
        description: err instanceof Error ? err.message : "Unknown error",
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
            {currentAllocation ? "Edit Allocation" : "Create Allocation"}
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

          {/* Account Balance and Unallocated */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Account Balance</p>
              <p className="font-semibold">${currentAccountValue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Unallocated</p>
              <p className="font-semibold text-green-600">${unallocatedBalance.toFixed(2)}</p>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <Label className="text-sm">Allocation Amount ($)</Label>
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
            <Label className="text-sm">Allocation Percentage (%)</Label>
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

          {/* Allocation Date */}
          <div>
            <Label className="text-sm">Allocation Date</Label>
            <DatePickerInput
              value={new Date(allocationDate)}
              onChange={(date) => {
                if (date) {
                  setAllocationDate(date.toISOString().split("T")[0]);
                }
              }}
              disabled={isLoading || !!currentAllocation}
            />
          </div>

          {/* Projected Current Value */}
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-xs text-muted-foreground">Projected Current Value</p>
            <p className="font-semibold text-blue-600">
              ${(currentAllocation?.initAmount || amount).toFixed(2)}
            </p>
            {!currentAllocation && (
              <p className="text-xs text-muted-foreground">
                (Init: ${amount.toFixed(2)} + Growth: $0.00)
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
