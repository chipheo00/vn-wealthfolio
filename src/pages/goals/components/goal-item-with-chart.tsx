import type { Goal, GoalAllocation } from "@/lib/types";
import { useGoalProgress } from "../hooks/use-goal-progress";
import { useGoalValuationHistory } from "../hooks/use-goal-valuation-history";
import { GoalItem } from "./goal-item";

interface GoalItemWithChartProps {
  goal: Goal;
  allocations: GoalAllocation[];
  totalAccountCount: number;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  goals: Goal[] | undefined; // Needed for useGoalProgress
}

/**
 * Wrapper component that fetches chart-consistent actual values for a goal.
 * This ensures the Goals list shows the same values as the Goal Details page.
 */
export function GoalItemWithChart({
  goal,
  allocations,
  totalAccountCount,
  onEdit,
  onDelete,
  goals,
}: GoalItemWithChartProps) {
  const { getGoalProgress } = useGoalProgress(goals);
  const goalProgress = getGoalProgress(goal.id);

  // Fetch chart data for this goal to get consistent actual values
  const { chartData } = useGoalValuationHistory(goal, "months", {
    startValue: goalProgress?.startValue ?? 0,
  });

  // Get chart-consistent current value (same logic as goal-details-page)
  let currentValue = goalProgress?.currentValue ?? 0;
  if (chartData && chartData.length > 0) {
    for (let i = chartData.length - 1; i >= 0; i--) {
      if (chartData[i].actual !== null) {
        currentValue = chartData[i].actual as number;
        break;
      }
    }
  }

  // Recalculate progress based on chart-consistent value
  const progress = goal.targetAmount > 0
    ? Math.min((currentValue / goal.targetAmount) * 100, 100)
    : 0;

  return (
    <GoalItem
      goal={goal}
      currentValue={currentValue}
      progress={progress}
      isOnTrack={goalProgress?.isOnTrack ?? true}
      allocations={allocations}
      totalAccountCount={totalAccountCount}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}
