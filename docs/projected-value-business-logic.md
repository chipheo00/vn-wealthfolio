# Projected Value Business Logic

## Overview

Projected Value represents the expected growth from monthly contributions by today's date based on:

- Monthly contributions specified in the goal (NOT initial contributions)
- Expected annual return rate
- Time elapsed from goal start date

**Current Implementation:** Projected value uses **daily compounding** for precision, calculating growth from monthly contributions only. Initial contributions are excluded from projected value calculations.

## Compounding Approaches

The system uses **daily compounding** for all projections for maximum precision:

| Aspect | Details |
|--------|---------|
| **Method** | Daily Compounding |
| **When Used** | Goal progress calculations, on-track determination, and chart projections |
| **Granularity** | Any specific date |
| **Function** | `calculateProjectedValueByDate()` in goal-utils.ts |
| **Time Calculation** | Exact day count using `getDaysDiff()` |
| **Precision** | ~0.13% higher than monthly compounding |

## Core Formula (Daily Compounding)

```
FV = PMT_daily × [((1 + r_daily)^n - 1) / r_daily]
```

Where:

- **FV** = Future Value (Projected Value from monthly contributions only)
- **PMT_daily** = Daily Investment Amount (monthly / 30)
- **r_daily** = Daily Return Rate (annual rate / 100 / 365)
- **n** = Number of days from goal start date

**Key:** Only monthly contributions are compounded. Initial contributions are EXCLUDED from projected value.

### Why Daily Compounding?

Daily compounding is used for:
1. **Maximum precision** - ~0.13% more accurate than monthly
2. **Flexible date calculations** - Works for any date, not just month-ends
3. **Realistic tracking** - Better reflects actual investment compound growth
4. **Consistency** - Both actual and projected values use the same compounding method

### Initial Contributions Handling

**Current Implementation:** Initial contributions are **EXCLUDED** from projected value calculations.

- Initial contributions are aggregated from allocations: `sum(allocation.initialContribution)`
- They are NOT compounded in the projected value formula
- `goalProgress.startValue` tracks the initial principal for reference only
- Initial contributions are tracked separately and included in current/actual value (not projected)

**Formula Implementation:**
- Monthly contributions grow: `PMT_daily × [((1 + r_daily)^n - 1) / r_daily]`
- **Projected value = monthly contributions growth only**
- Initial contributions are included in actual/current value, not in projected value

## Calculation Details (Current Implementation)

### 1. Parameter Conversion

**Annual to Daily Return Rate:**

```typescript
const dailyRate = annualReturnRate / 100 / 365;
```

Example: 7% annual = 0.0192% daily (7 / 100 / 365 = 0.000192)

**Monthly Investment to Daily:**

```typescript
const dailyInvestment = monthlyInvestment / 30;
```

Example: 1,000,000 monthly = 33,333 daily (1,000,000 / 30)

### 2. Time Calculation

```typescript
const daysFromStart = getDaysDiff(startDate, currentDate);
```

Precise day count between two dates using millisecond precision.

### 3. Compound Factor

```typescript
const compoundFactor = Math.pow(1 + dailyRate, daysFromStart);
```

This represents: (1 + r_daily)^n

### 4. Future Value Calculation

**If daily rate is 0:**

```typescript
return dailyInvestment * daysFromStart;
```

Simple accumulation of daily contributions only (no initial contributions).

**If daily rate > 0:**

```typescript
const compoundFactor = Math.pow(1 + dailyRate, daysFromStart);
const futureContributions = dailyInvestment * ((compoundFactor - 1) / dailyRate);
return futureContributions;
```

Compound interest formula for monthly contributions only (initial contributions excluded).

## Implementation Locations

### 1. goal-utils.ts - calculateProjectedValueByDate()

**Purpose:** Calculate projected value for any specific date using daily compounding.

**Key Features:**
- Calculates growth from monthly contributions only (initial contributions EXCLUDED)
- Works for any date (not just month-ends)
- Higher precision than monthly compounding (~0.13%)
- Used for on-track determination and chart projections

```typescript
export function calculateProjectedValueByDate(
  startValue: number,      // NOT USED (kept for backwards compatibility)
  dailyInvestment: number, // Daily contribution (monthlyInvestment / 30)
  annualReturnRate: number,
  startDate: Date,
  currentDate: Date,
): number {
  const daysFromStart = getDaysDiff(startDate, currentDate);

  if (daysFromStart <= 0) return 0; // 0 at start (no contributions yet)

  const dailyRate = annualReturnRate / 100 / 365;

  if (dailyRate === 0) {
    return dailyInvestment * daysFromStart;
  }

  const compoundFactor = Math.pow(1 + dailyRate, daysFromStart);
  const futureContributions = dailyInvestment * ((compoundFactor - 1) / dailyRate);

  return futureContributions;
}
```

**Called from:**

- **use-goal-progress.ts:** Calculate today's projected value
  ```typescript
  const dailyInvestment = monthlyInvestment / 30;
  const projectedValue = calculateProjectedValueByDate(
    0,  // startValue not used (initial contributions excluded from projection)
    dailyInvestment,
    annualReturnRate,
    goalStartDate,
    today,
  );
  // Compare today's actual value with today's projected value
  isOnTrack = currentValue >= projectedValue;
  ```

- **use-goal-valuation-history.ts:** Calculate projected values for chart data points
  ```typescript
  const dailyInvestment = monthlyInvestment / 30;
  const projected = calculateProjectedValueByDate(
    0,  // startValue not used (initial contributions excluded from projection)
    dailyInvestment,
    annualReturnRate,
    goalStartDate,
    dateInterval,  // Any date
  );
  ```

### 2. use-goal-progress.ts

**Purpose:** Main hook for calculating goal progress and on-track status.

**Key Logic:**
- Calculates `currentValue` = today's actual value (initialContribution + accountGrowth × percent)
- Gets `totalInitialContribution` as sum of all `allocation.initialContribution` (for reference)
- Calculates `projectedValue` using `calculateProjectedValueByDate()` with daily compounding (monthly contributions only)
- Determines on-track status: `currentValue >= projectedValue` (today's actual vs today's projected)

```typescript
// Calculate progress for each goal
goals.forEach((goal) => {
  let currentValue = 0;
  let totalInitialContribution = 0;

  // Sum up allocations' actual values (includes initial contributions + growth)
  goalAllocations.forEach((alloc) => {
    const accountGrowth = currentValue - startAccountValue;
    const allocatedGrowth = accountGrowth * percentage;
    const allocatedValue = initialContribution + allocatedGrowth;
    currentValue += allocatedValue;
    totalInitialContribution += initialContribution;
  });

  // Calculate today's projected value using daily compounding (monthly contributions only)
  const dailyInvestment = monthlyInvestment / 30;
  const projectedValue = calculateProjectedValueByDate(
    0,  // Initial contributions excluded from projection
    dailyInvestment,
    annualReturnRate,
    goalStartDate,
    today,
  );

  // Store progress
  progressMap.set(goal.id, {
    currentValue, // Today's actual value (includes initial contributions + growth)
    projectedValue, // Today's projected value (monthly contributions only)
    startValue: totalInitialContribution, // Sum of initial contributions (reference)
    isOnTrack: currentValue >= projectedValue, // Today's actual vs today's projected
  });
});
```

### 3. use-goal-valuation-history.ts

**Purpose:** Generate chart data with actual values and projected values for each date interval.

**Key Logic:**
- Fetches historical valuations for allocated accounts
- **Always includes initial contributions** in actual values (even when valuation data is missing)
- Calculates actual value per allocation: `initialContribution + (accountGrowth × percent)`
- Aggregates by period (weeks/months/years)
- Calculates projected values using daily compounding for each date
- Returns chart data points with both actual and projected values

```typescript
// Calculate actual values - ALWAYS includes initial contributions
allocationDetailsMap.forEach((allocationDetails, accountId) => {
  const { initialContribution, percentage, startDate } = allocationDetails;
  
  // Always include initial contribution
  totalValue += initialContribution;

  const valuations = historicalValuations.get(accountId);
  const valuation = valuations?.find((v) => v.valuationDate === dateStr);
  
  if (valuation) {
    // Add growth on top
    const accountGrowth = valuation.totalValue - startAccountValue;
    const allocatedGrowth = accountGrowth * percentage;
    totalValue += allocatedGrowth;
  }
});

// For each date interval in chart
dateIntervals.forEach((date) => {
  const dailyInvestment = monthlyInvestment / 30;
  
  const projected = calculateProjectedValueByDate(
    startValue,  // Sum of all initial contributions (included)
    dailyInvestment,
    annualReturnRate,
    goalStartDate,
    date,
  );

  const actual = /* aggregated from historical valuations, always includes initial contributions */;

  chartData.push({
    date: format(date, 'yyyy-MM-dd'),
    dateLabel: formatDateLabel(date, period),
    projected: projected,
    actual: actual,
  });
});
```

## On-Track Determination

**Logic:**

```typescript
isOnTrack = currentValue >= projectedValue;
```

**Where:**

- **currentValue** = sum of all allocations' actual values
  - Per allocation: `initialContribution + (accountGrowth × allocatedPercent)`
  - `accountGrowth` = current account value - account value at allocation start date
- **projectedValue** = calculated using `calculateProjectedValue()` 
  - Monthly compounding from goal start date to today
  - Only includes monthly contribution growth (initial principal NOT included)

**Single Source of Truth:** The `goalProgress.isOnTrack` from `use-goal-progress.ts` hook is used by both Goal Card and Goal Details page to ensure consistency.

### Example: On Track

- Goal start: Jan 1, 2025
- Today: Feb 1, 2025 (1 month)
- Initial allocation: 34,000,000
- Monthly investment: 1,000,000
- Annual return: 7%
- Actual account value: 34,500,000
- Account value at start: 34,000,000

**Calculation:**

```
currentValue = 34,000,000 + (500,000 × 100%) = 34,500,000

monthsFromStart = 1
monthlyRate = 7 / 100 / 12 = 0.00583
compoundFactor = (1.00583)^1 = 1.00583
projectedValue = 1,000,000 × ((1.00583 - 1) / 0.00583)
               = 1,000,000 × 1.00
               = ~1,000,000
```

**Determination:**

```
34,500,000 >= 1,000,000 → ON TRACK ✓
```

(Note: Initial allocation of 34M keeps goal on track even though projected contributions are only 1M)

### Example: Off Track (Future Goal with No Allocation)

- Goal start: Mar 15, 2025 (future)
- Today: Feb 14, 2025 (before start)
- Initial allocation: 0
- Monthly investment: 1,000,000

**Calculation:**

```
monthsFromStart = negative (before goal start)
projectedValue = 0
currentValue = 0
```

**Determination:**

```
0 >= 0 → ON TRACK ✓
```

(Future goal with zero values appears on track, but `getGoalStatus()` checks `isGoalScheduled()` first)

## Chart Rendering

### Date Intervals

Based on time period selected:

- **Weeks:** End of each week from goal start to due date
- **Months:** End of each month from goal start to due date
- **Years:** End of each year from goal start to due date
- **All:** Yearly intervals from goal start to due date

### Chart Data Points

For each date interval:

```typescript
{
  date: "2025-02-01",
  dateLabel: "Feb '25",
  projected: 1020321,  // Calculated using calculateProjectedValue()
  actual: 34500000     // Historical account value (if available)
}
```

### Handling Incomplete Periods

For the **current period** (which hasn't ended yet):

**Current Logic:**
- If actual data available on or before the period end date: Use it
- If NOT available AND it's the current period: Use latest known value
- If future period: Show null (no actual data)

**Example (December, current date is Dec 15):**
- Period end date: Dec 31 (future)
- Latest actual value: Dec 15 (today)
- Chart displays: Dec 15 value marked as "Dec" data point

**Code:**
```typescript
if (actual === null && latestActualValue !== null) {
  const isSamePeriod =
    (period === "weeks" && format(date, "yyyy-ww") === format(today, "yyyy-ww")) ||
    (period === "months" && format(date, "yyyy-MM") === format(today, "yyyy-MM")) ||
    (period === "years" && format(date, "yyyy") === format(today, "yyyy")) ||
    (period === "all" && format(date, "yyyy") === format(today, "yyyy"));

  if (isSamePeriod) {
    actual = latestActualValue;
  }
}
```

## Special Cases

### Case 1: Goal Not Started Yet

**Setup:**

- Goal start date: 2026-01-01
- Today: 2025-12-16
- Months from start: negative

**Handling:**

```typescript
if (monthsFromStart <= 0) return 0;
```

Projected value = 0 (goal hasn't started)

---

### Case 2: No Monthly Investment

**Setup:**

- Monthly investment: 0
- Any return rate
- Any months

**Calculation:**

```
projectedValue = 0
```

Projected value = 0 (no contributions to project)

---

### Case 3: Negative Return Rate

**Not supported by business logic.** Return rates are typically 0-20%. Negative returns should be handled as 0 or require separate loss calculation.

## Implementation Details

### 1. Daily Compounding Precision

Daily compounding provides ~0.13% higher accuracy than monthly:

- **Monthly** (old): (1 + 0.08/12)^60 = 1.4898
- **Daily** (new): (1 + 0.08/365)^1825 = 1.4917

The difference compounds over time and is particularly noticeable for long-term goals.

### 2. Daily Investment Conversion

Monthly contributions are converted to daily equivalents:

```typescript
const dailyInvestment = monthlyInvestment / 30;
```

This is simpler than fractional daily calculations and provides sufficient precision. The 30-day average is sufficient for investment tracking purposes.

### 3. Actual Values Always Include Initial Contributions

**Critical Fix:** Actual values now always include initial contributions, even when:
- Historical valuation data is missing for a date
- A valuation date falls on a weekend/holiday

This prevents chart discrepancies where actual values appeared smaller than projected.

**Implementation:**
```typescript
totalValue = 0;
allocationDetailsMap.forEach((details) => {
  totalValue += details.initialContribution; // Always add
  if (valuation) {
    totalValue += accountGrowth * details.percentage; // Add growth if available
  }
});
```

### 4. Date Precision

- `getDaysDiff()` calculates exact day count using millisecond precision
- Works correctly across daylight saving time transitions
- Handles leap years automatically via JavaScript date arithmetic

## Data Dependencies

### use-goal-progress.ts

**Requires:**

- `goal.monthlyInvestment` — Monthly contribution amount
- `goal.targetReturnRate` — Annual return percentage (0-100)
- `goal.startDate` — Goal start date (ISO string)
- Allocations with `initialContribution` values

**Provides:**

- `goalProgress.projectedValue` — Today's projected value (daily compounding, from monthly contributions only)
- `goalProgress.isOnTrack` — Boolean: today's actual >= today's projected
- `goalProgress.startValue` — Sum of initial contributions (reference value only)

### use-goal-valuation-history.ts

**Requires:**

- `goal.monthlyInvestment` — Monthly contribution amount
- `goal.targetReturnRate` — Annual return percentage (0-100)
- `goal.startDate` — Goal start date (ISO string)
- `goal.dueDate` — Goal due date (ISO string)
- Allocations with `initialContribution` values
- Historical valuations for allocated accounts

**Provides:**

- `chartData[].projected` — Projected value for each date interval (daily compounding, from monthly contributions only)
- `chartData[].actual` — Historical actual value (aggregated from account valuations, includes initial contributions)
- Used in chart rendering and visual comparison with actual values

## Validation Rules

### 1. Monthly Investment Range

```
0 <= monthlyInvestment <= account_balance
```

Can be 0 (no contributions expected).

### 2. Annual Return Rate Range

```
0 <= annualReturnRate <= 100
```

Typically 0-20% for realistic scenarios. Negative returns not supported.

### 3. Start Date Before Due Date

```
goal.startDate < goal.dueDate
```

Ensure goal timeline makes sense.

### 4. Projected Value Constraints

```
projectedValue >= 0
```

Always non-negative (only calculates from positive contributions and rates).

## Testing Scenarios

1. ✓ Goal with zero monthly investment → projected = 0 (no contributions to project)
2. ✓ Goal with zero return rate → projected = sum of monthly contributions (no growth)
3. ✓ Goal with contributions + return → compound interest applied to monthly contributions only
4. ✓ Goal not started yet (start date > today) → projected = 0 (no days elapsed)
5. ✓ Goal active for 1 year → verify daily compounding matches manual calculation (~0.13% more than monthly)
6. ✓ On-track determination → today's actual >= today's projected (actual includes initial contributions)
7. ✓ Chart data points → actual values include initial contributions, projected excludes them
8. ✓ Missing valuation data → actual values still include initial contributions
9. ✓ Initial contributions handling → Excluded from projected value, included in actual value

## References

- `src/lib/date-utils.ts` — Date calculation utilities
  - `getMonthsDiff()` — Calculate months between dates (with fractional component)
  - `formatTimeRemaining()` — Format time to due date
  - `formatTimeElapsed()` — Format time since start date

- `src/pages/goals/lib/goal-utils.ts` — Goal calculation utilities
  - `calculateProjectedValue()` — Legacy monthly compounding (deprecated, kept for compatibility)
  - `calculateProjectedValueByDate()` — **Primary function** - Daily compounding for monthly contributions only (initial contributions excluded)
  - `calculateDailyInvestment()` — Back-calculate daily investment for target (not used in current flow)
  - `getDaysDiff()` — Calculate exact day count between dates
  - `isGoalOnTrack()` — Compare today's actual value vs today's projected value
  - `isGoalOnTrackByDate()` — Daily precision on-track check (not used in current flow)
  - `isGoalScheduled()` — Check if goal is future-scheduled
  - `getGoalStatus()` — Get UI status display

- `src/pages/goals/hooks/use-goal-progress.ts` — Main hook for goal progress calculation and on-track determination
  - Uses daily compounding via `calculateProjectedValueByDate()` for projected value (monthly contributions only)
  - Current value includes initial contributions + growth
  - On-track = today's actual >= today's projected

- `src/pages/goals/hooks/use-goal-valuation-history.ts` — Chart data generation
  - Actual values include initial contributions (even when valuation data missing)
  - Uses daily compounding via `calculateProjectedValueByDate()` for projected values (monthly contributions only)

- `src/pages/goals/goal-details-page.tsx` — Goal details page (uses `goalProgress.isOnTrack`)

- `src/pages/goals/components/goal-form.tsx` — Goal form (may use different calculation for monthly investment)
