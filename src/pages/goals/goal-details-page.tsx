import { getGoals, getGoalsAllocation } from "@/commands/goal";
import { MetricDisplay } from "@/components/metric-display";
import { useAccounts } from "@/hooks/use-accounts";
import { useLatestValuations } from "@/hooks/use-latest-valuations";
import { formatTimeRemaining } from "@/lib/date-utils";
import { QueryKeys } from "@/lib/query-keys";
import type { Goal, GoalAllocation } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { AnimatedToggleGroup, Button, formatAmount, Icons, Page, Skeleton } from "@wealthvn/ui";
import { parseISO } from "date-fns";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
    Area,
    AreaChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { AllocationHistoryTable } from "./components/allocation-history-table";
import { EditAllocationsModal } from "./components/edit-allocations-modal";
import GoalsAllocations from "./components/goal-allocations";
import { GoalEditModal } from "./components/goal-edit-modal";
import { useGoalMutations } from "./hooks/use-goal-mutations";
import { useGoalProgress } from "./hooks/use-goal-progress";
import { TimePeriodOption, useGoalValuationHistory } from "./hooks/use-goal-valuation-history";
import {
    calculateDailyInvestment,
    calculateProjectedValueByDate,
    isGoalOnTrackByDate,
} from "./lib/goal-utils";

export default function GoalDetailsPage() {
  const { t } = useTranslation("goals");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: goals, isLoading: isGoalsLoading } = useQuery<Goal[], Error>({
    queryKey: [QueryKeys.GOALS],
    queryFn: getGoals,
  });

  const { data: allocations, isLoading: isAllocationsLoading } = useQuery<GoalAllocation[], Error>({
    queryKey: [QueryKeys.GOALS_ALLOCATIONS],
    queryFn: getGoalsAllocation,
  });

  const { accounts } = useAccounts();

  // Fetch latest valuations for accounts
  const accountIds = accounts?.map(acc => acc.id) || [];
  const { latestValuations } = useLatestValuations(accountIds);

  // Build current account values map from valuations, fallback to account.balance
  const currentAccountValuesFromValuations = new Map(
    (accounts || []).map(acc => {
      const valuation = (latestValuations || []).find(v => v.accountId === acc.id);
      return [acc.id, valuation?.totalValue ?? acc.balance ?? 0];
    })
  );

  const [visibleModal, setVisibleModal] = useState(false);
  const [isCreatingAllocation, setIsCreatingAllocation] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriodOption>("months");
  const { getGoalProgress, getAllocationValue } = useGoalProgress(goals);
  const { updateAllocationMutation, deleteAllocationMutation, saveAllocationsMutation } = useGoalMutations();

  const goal = goals?.find((g) => g.id === id);
  const goalProgress = id ? getGoalProgress(id) : undefined;

  // Move options definition inside component to use translation
  const timePeriodOptions = [
    { value: "weeks" as const, label: t("details.chart.periods.weeks") },
    { value: "months" as const, label: t("details.chart.periods.months") },
    { value: "years" as const, label: t("details.chart.periods.years") },
    { value: "all" as const, label: t("details.chart.periods.all") },
  ];

  // Get startValue from goalProgress for chart projection consistency
  const chartStartValue = goalProgress?.startValue ?? 0;

  // Calculate projectedFutureValue early so we can pass it to the chart hook
  // This ensures the chart's final point matches the Overview's "Projected Future Value"
  const chartProjectedFutureValue = useMemo(() => {
    if (!goal || !goal.startDate || !goal.dueDate) return undefined;

    const startDate = parseISO(goal.startDate);
    const dueDate = parseISO(goal.dueDate);
    const startValue = chartStartValue;
    const annualReturnRate = goal.targetReturnRate ?? 0;

    // Back-calculate daily investment to match target at due date
    const dailyInvestment = calculateDailyInvestment(
      startValue,
      goal.targetAmount,
      annualReturnRate,
      startDate,
      dueDate,
    );

    // Get projected value at due date
    return calculateProjectedValueByDate(
      startValue,
      dailyInvestment,
      annualReturnRate,
      startDate,
      dueDate,
    );
  }, [goal, chartStartValue]);

  // Use the new hook for chart data - pass startValue and projectedFutureValue for consistency
  const { chartData, allocationValues, isLoading: isChartLoading } = useGoalValuationHistory(goal, timePeriod, {
    startValue: chartStartValue,
    projectedFutureValue: chartProjectedFutureValue,
  });

  if (isGoalsLoading || isAllocationsLoading) {
    return (
      <Page className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </Page>
    );
  }

  if (!goal) {
    return (
      <Page className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">{t("notFound")}</h1>
        <Button onClick={() => navigate("/goals")}>{t("backToGoals")}</Button>
      </Page>
    );
  }

  // Get actual values from hook - but prefer chart's actual value for consistency with chart display
  let currentAmount = goalProgress?.currentValue ?? 0;

  // Use the chart's latest actual value as the source of truth for "Current Progress"
  // This ensures the Overview matches what's shown on the chart's actual line
  if (chartData && chartData.length > 0) {
    // Find the latest point with an actual value (working backwards from the end)
    for (let i = chartData.length - 1; i >= 0; i--) {
      if (chartData[i].actual !== null) {
        currentAmount = chartData[i].actual as number;
        break;
      }
    }
  }

  // Recalculate progress based on the chart-consistent current amount
  const progress = goal?.targetAmount && goal.targetAmount > 0
    ? Math.min((currentAmount / goal.targetAmount) * 100, 100)
    : 0;

  // Calculate projections using daily compounding for accuracy
  let projectedFutureValue = 0;
  let onTrack = true;

  if (goal && goal.startDate && goal.dueDate && goalProgress) {
    const startDate = parseISO(goal.startDate);
    const dueDate = parseISO(goal.dueDate);
    const startValue = goalProgress.startValue ?? 0; // Initial principal (sum of initial contributions)
    const annualReturnRate = goal.targetReturnRate ?? 0;

    // Back-calculate daily investment to match target at due date
    const dailyInvestment = calculateDailyInvestment(
      startValue,
      goal.targetAmount,
      annualReturnRate,
      startDate,
      dueDate,
    );

    // For years/all views: Show projected value at goal due date
    // For weeks/months views: Show projected value at last chart point (overridden below)
    projectedFutureValue = calculateProjectedValueByDate(
      startValue,
      dailyInvestment,
      annualReturnRate,
      startDate,
      dueDate,
    );

    // Determine if on track using daily precision
    onTrack = isGoalOnTrackByDate(
      currentAmount,
      startValue,
      dailyInvestment,
      annualReturnRate,
      startDate,
    );
  }

  // For weeks/months views: Use the last chart point's projected value
  // This makes the Overview's "Projected Future Value" match the chart's last point
  if ((timePeriod === "weeks" || timePeriod === "months") && chartData && chartData.length > 0) {
    const lastChartPoint = chartData[chartData.length - 1];
    if (lastChartPoint.projected !== null) {
      projectedFutureValue = lastChartPoint.projected;
    }
  }

  const actualColor = onTrack ? "var(--chart-actual-on-track)" : "var(--chart-actual-off-track)";



  // Format tooltip value
  const formatTooltipValue = (value: number | null) => {
    if (value === null || value === undefined) return "N/A";
    return formatAmount(value, "USD", false);
  };

  return (
    <Page className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between border-b pb-6">
        <div>
          <h1 className="text-foreground text-2xl font-bold">
            {t("details.title", { title: goal.title })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("details.description", { title: goal.title })}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setVisibleModal(true)}>
            <Icons.Pencil className="mr-2 h-4 w-4" />
            {t("details.editGoal")}
          </Button>
          <Button onClick={() => navigate("/goals")}>
            <Icons.ArrowLeft className="mr-2 h-4 w-4" />
            {t("details.back")}
          </Button>
        </div>
      </div>

      {/* Chart & Stats Grid - Account Page Layout */}
      <div className="grid grid-cols-1 gap-4 pt-0 md:grid-cols-3">
        {/* Chart Card - 2 columns on desktop */}
        <div className="border-border bg-card col-span-1 rounded-xl border shadow-sm md:col-span-2">
          <div className="border-border flex items-center justify-between border-b px-6 py-4">
            <h3 className="text-foreground text-lg font-bold">
              {t("details.chart.growthProjection")}
            </h3>
            <AnimatedToggleGroup
              items={timePeriodOptions}
              value={timePeriod}
              onValueChange={(value) => setTimePeriod(value as TimePeriodOption)}
              variant="secondary"
              size="sm"
            />
          </div>
          <div className="p-0">
            <div className="h-[480px] w-full">
              {isChartLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : chartData.length === 0 ? (
                <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
                  <Icons.TrendingUp className="mb-2 h-12 w-12 opacity-50" />
                  <p>{t("details.chart.noData")}</p>
                  <p className="text-sm">{t("details.chart.noDataDescription")}</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-projected)" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="var(--chart-projected)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={actualColor} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={actualColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                      strokeOpacity={0.5}
                    />
                    <XAxis
                      dataKey="dateLabel"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "currentColor" }}
                      minTickGap={20}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "currentColor" }}
                      tickFormatter={(value) => {
                        if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                        return value.toString();
                      }}
                      width={60}
                    />
                    <Tooltip
                      cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                        backgroundColor: "hsl(var(--popover))",
                        color: "hsl(var(--popover-foreground))",
                        padding: "12px",
                      }}
                      formatter={(value, name) => [
                        formatTooltipValue(typeof value === "number" ? value : null),
                        name === "projected"
                          ? t("details.chart.projectedGrowth")
                          : t("details.chart.actualValue"),
                      ]}
                      labelFormatter={(label) => label}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      height={36}
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) =>
                        value === "projected"
                          ? t("details.chart.projectedGrowth")
                          : t("details.chart.actualValue")
                      }
                      wrapperStyle={{ fontSize: "12px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="projected"
                      stroke="var(--chart-projected)"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fill="url(#colorProjected)"
                      name="projected"
                      connectNulls
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      stroke={actualColor}
                      strokeWidth={2}
                      fill="url(#colorActual)"
                      name="actual"
                      connectNulls
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Info Card - 1 column on desktop */}
        <div className="border-border bg-card col-span-1 flex flex-col rounded-xl border shadow-sm">
          <div className="border-border border-b px-6 py-4">
            <h3 className="text-foreground text-lg font-bold">{t("details.overview.title")}</h3>
          </div>
          <div className="flex flex-1 flex-col space-y-6 p-6">
            {/* Target Amount & Progress */}
            <div className="border-border flex items-start justify-between gap-4 border-b pb-6">
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">
                    {t("details.overview.targetAmount")}
                  </p>
                  <p className="text-2xl font-bold" style={{ color: "var(--chart-projected)" }}>
                    {formatAmount(goal.targetAmount, "USD", false)}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-xs">
                    {t("details.overview.currentProgress")}
                  </p>
                  <p className="text-sm font-medium">
                    <span className="font-bold" style={{ color: actualColor }}>
                      {progress.toFixed(1)}%
                    </span>{" "}
                    -{" "}
                    <span style={{ color: actualColor }}>
                      {formatAmount(currentAmount, "USD", false)}
                    </span>
                  </p>
                </div>
              </div>
              <div className="bg-primary/10 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full">
                <Icons.Goal className="text-primary h-6 w-6" />
              </div>
            </div>

            {/* Description - if exists */}
            {goal.description && (
              <div className="border-border border-b pb-6">
                <p className="text-muted-foreground mb-2 text-xs">
                  {t("details.overview.description")}
                </p>
                <div
                  style={{
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                  className="text-foreground text-sm whitespace-pre-wrap"
                >
                  {goal.description}
                </div>
              </div>
            )}

            {/* Metrics Grid - 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              <MetricDisplay
                label={t("details.metrics.monthlyInvestmentDCA")}
                value={undefined}
                className="border-muted/30 bg-muted/30 rounded-md border"
                labelComponent={
                  <div className="text-muted-foreground flex w-full flex-col items-center justify-center space-y-2 text-xs">
                    <span className="text-center">{t("details.metrics.monthlyInvestment")}</span>
                    <span className="text-foreground text-sm font-bold">
                      {goal.monthlyInvestment
                        ? formatAmount(goal.monthlyInvestment, "USD", false)
                        : t("details.metrics.notSet")}
                    </span>
                  </div>
                }
              />
              <MetricDisplay
                label={t("details.metrics.targetReturnRate")}
                value={goal.targetReturnRate ? goal.targetReturnRate / 100 : 0}
                isPercentage={true}
                className="border-muted/30 bg-muted/30 rounded-md border"
              />
              <MetricDisplay
                label={t("details.metrics.timeRemaining")}
                value={undefined}
                className="border-muted/30 bg-muted/30 rounded-md border"
                labelComponent={
                  <div className="text-muted-foreground flex w-full flex-col items-center justify-center space-y-2 text-xs">
                    <span className="text-center">{t("details.metrics.timeRemaining")}</span>
                    <span className="text-foreground text-sm font-bold">
                      {formatTimeRemaining(goal.dueDate, t)}
                    </span>
                  </div>
                }
              />
              <MetricDisplay
                label={t("details.metrics.projectedFutureValue")}
                value={undefined}
                className="border-muted/30 bg-muted/30 rounded-md border"
                labelComponent={
                  <div className="text-muted-foreground flex w-full flex-col items-center justify-center space-y-2 text-xs">
                    <span className="text-center">{t("details.metrics.projectedFutureValue")}</span>
                    <span className="text-sm font-bold" style={{ color: "var(--chart-projected)" }}>
                      {formatAmount(projectedFutureValue, "USD", false)}
                    </span>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Allocations Section */}
      <div className="mb-8 space-y-8">
        {/* Allocation Settings - Read Only */}
        <div>
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-foreground mb-2 text-xl font-bold">{t("details.allocationSettings.title")}</h3>
              <p className="text-muted-foreground text-sm">{t("details.allocationSettings.description")}</p>
            </div>
            <Button onClick={() => setIsCreatingAllocation(true)} variant="default">
              <Icons.Pencil className="mr-2 h-4 w-4" />
              {t("details.allocationSettings.editButton")}
            </Button>
          </div>
          {goal && accounts && (
            <GoalsAllocations
              goals={[goal]}
              accounts={accounts || []}
              existingAllocations={allocations?.filter((a) => a.goalId === id) || []}
              allAllocations={allocations || []}
              onSubmit={async () => {}}
              readOnly={true}
              showRemaining={true}
              currentAccountValues={currentAccountValuesFromValuations}
            />
          )}
        </div>

        {/* Current Allocations - With Actions */}
        <div>
          <h3 className="text-foreground mb-2 text-xl font-bold">{t("details.allocations.title")}</h3>
          <p className="text-muted-foreground mb-4 text-sm">{t("details.allocations.description")}</p>
          <AllocationHistoryTable
            goalId={id || ""}
            goalStartDate={goal.startDate}
            allocations={allocations?.filter((a) => a.goalId === id) || []}
            allAllocations={allocations || []}
            accounts={
              new Map(
                accounts?.map((acc) => [
                  acc.id,
                  acc,
                ]) || []
              )
            }
            currentAccountValues={currentAccountValuesFromValuations}
            getAllocationValue={(allocationId) => {
              // Use chart-consistent per-allocation values
              // Each allocation's value is calculated independently based on its own account's growth
              const allocation = allocations?.find(a => a.id === allocationId);
              if (!allocation) return getAllocationValue(allocationId);

              // Get the chart-calculated value for this allocation's account
              const chartValue = allocationValues.get(allocation.accountId);
              if (chartValue !== undefined) {
                return chartValue;
              }

              // Fallback to original calculation if chart value not available
              return getAllocationValue(allocationId);
            }}
            onAllocationUpdated={async (allocation) => {
              await updateAllocationMutation.mutateAsync(allocation);
            }}
            onAllocationDeleted={async (allocationId) => {
              await deleteAllocationMutation.mutateAsync(allocationId);
            }}
            readOnly={false}
          />
        </div>
      </div>

      <GoalEditModal goal={goal} open={visibleModal} onClose={() => setVisibleModal(false)} />

      {/* Add Allocation Modal */}
      {goal && accounts && (
        <EditAllocationsModal
          open={isCreatingAllocation}
          onOpenChange={setIsCreatingAllocation}
          goal={goal}
          accounts={accounts}
          currentAccountValues={currentAccountValuesFromValuations}
          existingAllocations={allocations?.filter((a) => a.goalId === id) || []}
          allAllocations={allocations || []}
          onSubmit={async (newAllocations) => {
            // Save all allocations at once with a single success toast
            await saveAllocationsMutation.mutateAsync(newAllocations);
          }}
        />
      )}
    </Page>
  );
}
