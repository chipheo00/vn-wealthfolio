import { Icons } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import type { Goal, GoalAllocation } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
    formatAmount,
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@wealthvn/ui";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { GoalOperations } from "./goal-operations";

export interface GoalItemProps {
  goal: Goal;
  currentValue?: number;
  progress?: number;
  isOnTrack?: boolean;
  allocations?: GoalAllocation[];
  totalAccountCount?: number;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}

export function GoalItem({
  goal,
  currentValue = 0,
  progress = 0,
  isOnTrack = true,
  allocations = [],
  totalAccountCount = 0,
  onEdit,
  onDelete,
}: GoalItemProps) {
  const navigate = useNavigate();
  const { t } = useTranslation("goals");

  // Calculate allocation stats
  const allocationCount = allocations.length;
  // Sum of allocation percentages for this goal
  const totalAllocationPercent = allocations.reduce((sum, a) => sum + a.allocatedPercent, 0);
  // Average allocation: sum of allocations / (total accounts * 100)
  // e.g., if goal has 50% from account1 + 50% from account2, and there are 2 accounts total:
  // (50 + 50) / (2 * 100) = 50%
  const averageAllocationPercent =
    totalAccountCount > 0 ? (totalAllocationPercent / (totalAccountCount * 100)) * 100 : 0;

  // Determine the track status text and color
  const getTrackStatus = () => {
    if (goal.isAchieved) {
      return { text: t("item.done"), colorVar: "var(--success)" };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = goal.startDate ? new Date(goal.startDate) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);

    // Check if not started
    if (startDate && startDate > today) {
      return { text: "", colorVar: "var(--muted-foreground)" }; // No track status for not started
    }

    if (isOnTrack) {
      return { text: t("item.onTrack"), colorVar: "var(--chart-actual-on-track)" };
    }
    return { text: t("item.offTrack"), colorVar: "var(--chart-actual-off-track)" };
  };

  const trackStatus = getTrackStatus();

  const getGoalStatus = () => {
    if (goal.isAchieved)
      return {
        label: t("item.completed"),
        className: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30",
      };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = goal.startDate ? new Date(goal.startDate) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);

    const dueDate = goal.dueDate ? new Date(goal.dueDate) : null;
    if (dueDate) dueDate.setHours(0, 0, 0, 0);

    if (startDate && startDate > today) {
      return { label: t("item.notStarted"), className: "text-muted-foreground bg-muted" };
    }

    if (dueDate && dueDate < today) {
      return { label: t("item.overdue"), className: "text-destructive bg-destructive/10" };
    }

    return {
      label: t("item.ongoing"),
      className: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30",
    };
  };

  const status = getGoalStatus();

  return (
    <div
      onClick={() => navigate(`/goals/${goal.id}`)}
      className="bg-card hover:bg-muted/50 border-border group relative flex cursor-pointer flex-col justify-between rounded-xl border p-6 transition-all hover:shadow-md"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
            <Icons.Goal className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-foreground text-lg font-bold">{goal.title}</h3>
            <div className="flex items-center gap-2">
              <span
                className={cn("rounded-full px-2 py-0.5 text-xs font-medium", status.className)}
              >
                {status.label}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        "inline-flex cursor-help items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        allocationCount > 0
                          ? "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                          : "text-muted-foreground bg-muted",
                      )}
                    >
                      <Icons.PieChart className="h-3 w-3" />
                      {allocationCount > 0
                        ? `${averageAllocationPercent.toFixed(1)}%`
                        : t("item.noAllocations")}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {allocationCount > 0
                      ? t("item.allocationTooltip", {
                          count: allocationCount,
                          percent: averageAllocationPercent.toFixed(1),
                        })
                      : t("item.noAllocationsTooltip")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <GoalOperations goal={goal} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("item.current")}</span>
          <span className="text-foreground font-bold">
            {formatAmount(currentValue, "USD", false)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("item.target")}</span>
          <span className="text-foreground font-bold">
            {formatAmount(goal.targetAmount, "USD", false)}
          </span>
        </div>

        <div className="relative pt-1">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <span className="text-primary bg-primary/20 inline-block rounded-full px-2 py-1 text-xs font-semibold uppercase">
                {progress.toFixed(0)}%
              </span>
            </div>
            <div className="text-right">
              <span
                className="inline-block text-xs font-semibold"
                style={{ color: trackStatus.colorVar }}
              >
                {trackStatus.text}
              </span>
            </div>
          </div>
          <div className="bg-muted flex h-2 overflow-hidden rounded text-xs">
            <div
              style={{ width: `${progress}%` }}
              className={cn(
                "flex flex-col justify-center text-center whitespace-nowrap text-white shadow-none transition-all duration-500",
                isOnTrack || goal.isAchieved ? "bg-primary" : "bg-amber-500",
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

GoalItem.Skeleton = function GoalItemSkeleton() {
  return (
    <div className="rounded-xl border p-6">
      <div className="mb-4 flex items-center space-x-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
};
