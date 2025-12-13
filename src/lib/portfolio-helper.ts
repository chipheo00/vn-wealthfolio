import { Goal, GoalAllocation, GoalProgress, AccountValuation } from "./types";

export function calculateGoalProgress(
  accountsValuations: AccountValuation[],
  goals: Goal[],
  allocations: GoalAllocation[],
): GoalProgress[] {
  // Return early if essential data is missing
  if (!accountsValuations || accountsValuations.length === 0 || !goals || !allocations) {
    return [];
  }

  // Determine base currency (assuming consistency across account valuations data)
  const baseCurrency = accountsValuations[0].baseCurrency ?? "USD"; // Use first account's base currency

  // Create a map of accountId to totalValue in baseCurrency for quick lookup
  const accountValueMap = new Map<string, number>();
  accountsValuations.forEach((account) => {
    // Convert account total value to base currency
    const valueInBaseCurrency = (account.totalValue ?? 0) * (account.fxRateToBase ?? 1);
    accountValueMap.set(account.accountId, valueInBaseCurrency);
  });

  // Group allocations by goalId for efficient lookup
  const allocationsByGoal = new Map<string, GoalAllocation[]>();
  allocations.forEach((alloc) => {
    const existing = allocationsByGoal.get(alloc.goalId) ?? [];
    allocationsByGoal.set(alloc.goalId, [...existing, alloc]);
  });

  // Create a sorted copy of goals to avoid mutating the original array
  const sortedGoals = [...goals].sort((a, b) => a.targetAmount - b.targetAmount);

  // Get today's date in YYYY-MM-DD format
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Calculate progress for each goal
  return sortedGoals.map((goal) => {
    // Use the pre-grouped allocations map
    const goalAllocations = allocationsByGoal.get(goal.id) ?? [];

    // Calculate the total value allocated to this goal in base currency
    // Only count allocations that are active on today's date
    const totalAllocatedValue = goalAllocations.reduce((total, allocation) => {
      // Check if allocation is active on today's date
      const isActive = 
        (!allocation.startDate || allocation.startDate <= todayStr) &&
        (!allocation.endDate || allocation.endDate >= todayStr);
      
      if (!isActive) {
        return total; // Skip allocations that aren't active today
      }

      const accountValueInBase = accountValueMap.get(allocation.accountId) ?? 0;
      const allocatedValue = (accountValueInBase * allocation.percentAllocation) / 100;
      return total + allocatedValue;
    }, 0);

    // Calculate progress percentage (base currency vs base currency)
    const progress = goal.targetAmount > 0 ? totalAllocatedValue / goal.targetAmount : 0;

    // Ensure progress does not exceed 100% visually if needed, although mathematically it can
    // const cappedProgress = Math.min(progress, 100);

    return {
      // Use goal.title for name consistency if desired, or keep as is
      name: goal.title,
      targetValue: goal.targetAmount, // Base Currency
      currentValue: totalAllocatedValue, // Base Currency
      progress: progress, // Use 'progress' or 'cappedProgress'
      currency: baseCurrency, // Report in base currency
    };
  });
}
