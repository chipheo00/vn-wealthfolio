# Projected Value Business Logic

## Overview

Projected Value represents the target amount a goal should reach by a given date
based on:

- Regular monthly contributions
- Expected annual return rate
- Time elapsed from goal start date

**Key Principle:** Initial contributions are **excluded** from projection.
Projected value is calculated purely from **monthly investment contributions**.

## Compounding Approaches

The system supports two projection methods for different use cases:

| Aspect | Monthly Compounding | Daily Compounding |
|--------|-------------------|-------------------|
| **When Used** | Chart projections, goal form calculations | Current-date on-track determination |
| **Granularity** | Month-end dates only | Any specific date |
| **Precision** | ~0.13% lower | ~0.13% higher |
| **Function** | `calculateProjectedValue()` | `calculateProjectedValueByDate()` |
| **Consistency** | Matches goal form setup | More realistic real-world |

## Core Formula (Monthly Compounding)

```
FV = PV × (1 + r)^n + PMT × [((1 + r)^n - 1) / r]
```

Where:

- **FV** = Future Value (Projected Value)
- **PV** = Initial Contributions (starting allocation)
- **PMT** = Monthly Investment Amount
- **r** = Monthly Return Rate (annual rate / 12)
- **n** = Number of months from goal start date

### Why Monthly Compounding?

Monthly compounding is used for consistency with the goal form calculation. When
a user creates a goal:

1. **Goal Form** calculates required monthly investment using monthly
   compounding
2. **Projected Value** uses the same monthly compounding formula
3. **Result:** Projected Future Value at due date = Target Amount (consistent)

If different compounding methods were used, the projected value would not match
the target, causing user confusion.

### Why Not Include Initial Contribution?

Initial contributions represent what you've already allocated at goal start. The
projection shows what you **expect to achieve through ongoing contributions and
growth**, not what you already have.

**Example:**

- Initial allocation: 34,000,000 (locked at goal start)
- Monthly contribution: 1,000,000
- Annual return: 7%
- Months elapsed: 1

Projected should show: ~1,005,833 (from contributions + growth) Not:
34,000,000 + 1,005,833 (mixing allocated with projected)

## Alternative Formula: Daily Compounding

For more accurate real-world projections, daily compounding can be used.
Unlike monthly compounding, daily compounding calculates projection for any
specific date (not just month milestones).

### Daily Compounding Formula

```
FV_contributions = PMT_daily × [((1 + r_daily)^n - 1) / r_daily]
```

Where:

- **FV_contributions** = Future Value of contributions only
- **PMT_daily** = Daily Investment Amount (typically back-calculated to reach target)
- **r_daily** = Daily Return Rate (annual rate / 100 / 365)
- **n** = Number of days from goal start date to target date

*Note: The `startValue` (Initial Principal) is technically excluded from this specific function's output in the current implementation, as the projection line focuses on the growth of systematic investments.*
- **r_daily** = Daily Return Rate (annual rate / 100 / 365)
- **n** = Number of days from goal start date to target date

### When to Use Daily Compounding

- **For current-date on-track determination**: More precise than monthly
- **For any specific date projection**: Can calculate for Dec 15, not just Dec 31
- **For daily charts or real-time tracking**: Better granularity

### Precision Difference

Daily vs Monthly compounding for 5 years at 8% annual rate:

- Monthly compounding: `(1 + 0.08/12)^60 = 1.4898`
- Daily compounding: `(1 + 0.08/365)^1825 = 1.4917`

Difference: ~0.13% higher with daily compounding (more realistic)

## Calculation Details (Current Implementation)

### 1. Parameter Conversion

**Annual to Monthly Return Rate:**

```typescript
const monthlyRate = annualReturnRate / 100 / 12;
```

Example: 7% annual = 0.583% monthly (7 / 100 / 12 = 0.00583)

### 2. Time Calculation

```typescript
const monthsFromStart = differenceInMonths(today, goalStartDate);
```

Uses date-fns `differenceInMonths` for accurate month difference.

### 3. Compound Factor

```typescript
const compoundFactor = Math.pow(1 + monthlyRate, monthsFromStart);
```

This represents: (1 + r)^n

### 4. Future Value Calculation

**If monthly rate is 0:**

```typescript
return monthlyInvestment * monthsFromStart;
```

Simple accumulation of contributions.

**If monthly rate > 0:**

```typescript
const compoundFactor = Math.pow(1 + monthlyRate, monthsFromStart);
return monthlyInvestment * ((compoundFactor - 1) / monthlyRate);
```

Compound interest formula for regular contributions. Note that detailed implementation excludes `startValue` (Initial Principal) from this specific calculation to isolate the growth of new contributions.

## Implementation Locations

### 1. goal-utils.ts - calculateProjectedValue()

**Purpose:** Calculate projected value for any date, used for chart rendering and "On Track"
determination. Excludes initial contributions per business logic.

```typescript
export function calculateProjectedValue(
  startValue: number,  // NOT USED - kept for backwards compatibility
  monthlyInvestment: number,
  annualReturnRate: number,
  monthsFromStart: number,
): number {
  // At goal start date, projected value is 0 (no contributions yet)
  if (monthsFromStart <= 0) return 0;

  const monthlyRate = annualReturnRate / 100 / 12;

  if (monthlyRate === 0) {
    // No return: just sum of contributions
    return monthlyInvestment * monthsFromStart;
  }

  // Compound interest only from monthly contributions
  const compoundFactor = Math.pow(1 + monthlyRate, monthsFromStart);
  const futureContributions = monthlyInvestment * ((compoundFactor - 1) / monthlyRate);

  return futureContributions;
}
```

**Called from:**

- **use-goal-progress.ts:** For "On Track" determination
  ```typescript
  const monthsFromStart = getMonthsDiff(goalStartDate, today);
  const projectedValue = calculateProjectedValue(
    0,  // Initial contributions excluded from projection
    monthlyInvestment,
    annualReturnRate,
    Math.max(0, monthsFromStart),
  );
  ```

- **use-goal-valuation-history.ts:** For chart data points
  ```typescript
  const monthsFromStart = getMonthsDiff(goalStartDate, date);
  const projected = calculateProjectedValue(
    0,  // Initial contributions excluded
    monthlyInvestment,
    annualReturnRate,
    Math.max(0, monthsFromStart),
  );
  ```

### 2. goal-utils.ts - Daily Compounding Functions

**Purpose:** Provide daily-precision projection calculations for on-track
determination and any-date projections.

#### `getDaysDiff(startDate, endDate)`

Calculates exact number of days between two dates.

```typescript
export function getDaysDiff(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}
```

#### `calculateProjectedValueByDate(startValue, monthlyInvestment, annualReturnRate, startDate, currentDate)`

Calculates projected value at any specific date using daily compounding.
*Note: `startValue` is passed for API consistency but is currently unused in the internal calculation logic.*

```typescript
// Example: Project value for Dec 15 (not just Dec 31)
const projected = calculateProjectedValueByDate(
  startValue: 1000000,      // Passed but unused in projection logic
  dailyInvestment: 3333,    // Daily contribution
  annualReturnRate: 7,       // 7% annual
  startDate: new Date('2025-01-01'),
  currentDate: new Date('2025-12-15') // Any date
);
```

**Key Formula:**
- Converts monthly investment to daily: `dailyInvestment = monthlyInvestment / 30`
- Daily rate: `dailyRate = annualReturnRate / 100 / 365`
- Applies compound interest for exact days elapsed

#### `isGoalOnTrackByDate(currentValue, startValue, monthlyInvestment, annualReturnRate, startDate)`

Determines on-track status using daily compounding (more precise than monthly).

```typescript
const onTrack = isGoalOnTrackByDate(
  currentValue: 500000,
  startValue: 1000000,
  monthlyInvestment: 100000,
  annualReturnRate: 7,
  startDate: new Date('2025-01-01')
);
```

### 4. goal-details-page.tsx

**Purpose:** Display goal details with on-track status.

**Single Source of Truth:** Uses `goalProgress.isOnTrack` from the hook to
ensure consistency between Goal Card and Goal Details page.

```typescript
// Use goalProgress.isOnTrack as single source of truth (same as Goal Card)
const onTrack = goalProgress?.isOnTrack ?? true;
```

### 5. use-goal-valuation-history.ts

**Purpose:** Calculate projected values for all dates in the chart
(weeks/months/years/all), used for chart rendering.

Uses monthly compounding for consistency, called for each date interval:

```typescript
const projected = calculateProjectedValue(
  startValue,
  monthlyInvestment,
  annualReturnRate,
  Math.max(0, monthsFromStart),
);
```

## Calculation Scenarios

### Scenario 1: No Monthly Investment, No Return

**Setup:**

- Monthly investment: 0
- Annual return rate: 0%
- Months from start: 1

**Calculation:**

```
monthlyInvestment = 0
projectedValue = 0
```

**Result:** 0 (no growth without contributions or returns)

---

### Scenario 2: Monthly Investment, No Return

**Setup:**

- Monthly investment: 1,000,000
- Annual return rate: 0%
- Months from start: 1

**Calculation:**

```
projectedValue = 1,000,000 × 1 = 1,000,000
```

**Result:** 1,000,000 (purely from contributions)

---

### Scenario 3: Monthly Investment + Return

**Setup:**

- Monthly investment: 1,000,000
- Annual return rate: 7%
- Months from start: 1

**Calculation:**

```
monthlyRate = 7 / 100 / 12 = 0.00583
compoundFactor = (1 + 0.00583)^1 = 1.00583
projectedValue = 1,000,000 × ((1.00583 - 1) / 0.00583)
              = 1,000,000 × 1.0
              = 1,000,000
```

**Result:** 1,000,000 (first month, minimal compound effect)

---

### Scenario 4: 1 Year Projection

**Setup:**

- Monthly investment: 1,000,000
- Annual return rate: 7%
- Months from start: 12

**Calculation:**

```
monthlyRate = 0.00583
compoundFactor = (1.00583)^12 = 1.0723
projectedValue = 1,000,000 × ((1.0723 - 1) / 0.00583)
              = 1,000,000 × 12.40
              = 12,400,000
```

**Result:** 12,400,000 (approximately: 12M from contributions + 400K from
growth)

---

### Scenario 5: Multiple Years

**Setup:**

- Initial allocation: 34,000,000 (NOT included in projection)
- Monthly investment: 1,000,000
- Annual return rate: 7%
- Months from start: 24 (2 years)

**Calculation:**

```
monthlyRate = 0.00583
compoundFactor = (1.00583)^24 = 1.1498
projectedValue = 1,000,000 × ((1.1498 - 1) / 0.00583)
              = 1,000,000 × 25.69
              = 25,690,000
```

**Result:** 25,690,000 (only from monthly contributions, not initial allocation)

**Note:** The 34M initial allocation affects actual value, not projected value.

## On-Track Determination

**Logic:**

```typescript
isOnTrack = currentValue >= projectedValue;
```

**Where:**

- **currentValue** = initialContribution + (accountGrowth × allocatedPercent)
- **projectedValue** = PMT × [((1 + r)^n - 1) / r] (using monthly compounding)

**Single Source of Truth:** The `goalProgress.isOnTrack` from
`use-goal-progress.ts` hook is used by both Goal Card and Goal Details page to
ensure consistency.

### Example: On Track

- Goal start: Jan 1, 2025
- Today: Feb 1, 2025 (1 month)
- Initial allocation: 34,000,000
- Monthly investment: 1,000,000
- Annual return: 7%
- Actual account growth: 500,000

**Actual value:**

```
currentValue = 34,000,000 + (500,000 × 100%)
             = 34,500,000
```

**Projected value:**

```
monthlyRate = 7 / 100 / 12 = 0.00583
compoundFactor = (1.00583)^1 = 1.00583
projectedValue = 1,000,000 × ((1.00583 - 1) / 0.00583)
              = 1,000,000
```

**Determination:**

```
34,500,000 >= 1,000,000 → ON TRACK ✓
```

### Example: Off Track

**Same setup but:**

- Actual account growth: -500,000 (loss)

**Actual value:**

```
currentValue = 34,000,000 + (-500,000 × 100%)
             = 33,500,000
```

**Determination:**

```
33,500,000 >= 1,000,000 → ON TRACK ✓ (still on track!)
```

---

**Example with smaller initial allocation:**

**Setup:**

- Initial allocation: 1,000,000
- Monthly investment: 10,000
- Annual return: 7%
- Months from start: 1
- Actual account growth: 0 (no growth)

**Actual value:**

```
currentValue = 1,000,000 + (0 × 100%)
             = 1,000,000
```

**Projected value:**

```
projectedValue = 10,000 × 1 = 10,000
```

**Determination:**

```
1,000,000 >= 10,000 → ON TRACK ✓
```

---

**Example: Truly Off Track**

**Setup:**

- Initial allocation: 100,000 (that was supposed to grow)
- Monthly investment: 1,000
- Annual return: 10%
- Months from start: 12
- Actual account growth: -50,000 (loss)

**Actual value:**

```
currentValue = 100,000 + (-50,000 × 100%)
             = 50,000
```

**Projected value:**

```
monthlyRate = 10 / 100 / 12 = 0.00833
compoundFactor = (1.00833)^12 = 1.1047
projectedValue = 1,000 × ((1.1047 - 1) / 0.00833)
              = 1,000 × 12.56
              = 12,560
```

**Determination:**

```
50,000 >= 12,560 → ON TRACK ✓
```

(Even with loss, initial allocation keeps it on track)

---

**Example: Truly Off Track (Version 2)**

**Setup:**

- Initial allocation: 0 (future-start goal, no allocation yet)
- Monthly investment: 1,000,000
- Annual return: 7%
- Months from start: 1
- Actual account growth: 0

**Actual value:**

```
currentValue = 0 + (0 × 100%)
             = 0
```

**Projected value:**

```
projectedValue = 1,000,000
```

**Determination:**

```
0 >= 1,000,000 → OFF TRACK ✗
```

(Future goal with no allocation yet is off track)

## Chart Rendering

The projected line on the chart is built by calculating projected value for each
date interval.

### Date Intervals

Based on time period selected:

- **Weeks:** Every end-of-week from goal start to due date
- **Months:** Every end-of-month from goal start to due date
- **Years:** Every end-of-year from goal start to due date
- **All:** Yearly intervals across entire goal timeline

### Chart Data Points

For each date interval:

```typescript
{
  date: "2025-02-01",
  dateLabel: "Feb '25",
  projected: 1020321,  // Calculated for end of period
  actual: 34500000     // Historical account value (if available)
}
```

### Handling Incomplete Periods

For the **current period** (which hasn't ended yet):

**Current Logic (as of implementation):**
- If actual data available on or before the period end date: Use it
- If NOT available AND it's the current period: Use latest known value
- If future period: Show null (no actual data)

**Example (December, current date is Dec 15):**
- Period end date: Dec 31 (future)
- Latest actual value: Dec 15 (today)
- Chart displays: Dec 15 value marked as "Dec" data point

**Code:**
```typescript
// Lines 470-480 in use-goal-valuation-history.ts
if (actual === null && latestActualValue !== null) {
  const isSamePeriod =
    (period === "weeks" && format(date, "yyyy-ww") === format(today, "yyyy-ww")) ||
    (period === "months" && format(date, "yyyy-MM") === format(today, "yyyy-MM")) ||
    (period === "years" && format(date, "yyyy") === format(today, "yyyy")) ||
    (period === "all" && format(date, "yyyy") === format(today, "yyyy"));

  if (isSamePeriod) {
    actual = latestActualValue;  // Use today's value for current period
  }
}
```

### Projected vs Actual Lines

- **Projected (dashed line):** Uses monthly compounding, calculated at period end dates
- **Actual (solid line):** Historical values from account valuations, latest value used for current incomplete period

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

Projected value = 0 (only from contributions)

---

### Case 3: Negative Return Rate

**Not supported by business logic.** Return rates are typically 0-20%. Negative
returns should be handled as 0 or require separate loss calculation.

## Data Dependencies

### use-goal-progress.ts

Requires:

- `goal.monthlyInvestment` — Monthly contribution amount
- `goal.targetReturnRate` — Annual return percentage (0-100)
- `goal.startDate` — Goal start date (ISO string)

Provides:

- `goalProgress.projectedValue` — Projected value at today's date
- `goalProgress.isOnTrack` — Boolean: currentValue >= projectedValue

### use-goal-valuation-history.ts

Requires:

- `goal.monthlyInvestment` — Monthly contribution amount
- `goal.targetReturnRate` — Annual return percentage (0-100)
- `goal.startDate` — Goal start date (ISO string)
- `goal.dueDate` — Goal due date (ISO string)

Provides:

- `chartData[].projected` — Projected value for each date interval
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

Typically 0-20% for realistic scenarios.

### 3. Start Date Before Due Date

```
goal.startDate < goal.dueDate
```

Ensure goal timeline makes sense.

### 4. Projected Value Constraints

```
projectedValue >= 0
```

Always non-negative (can't have negative projected value without losses).

## Testing Scenarios

1. ✓ Goal with zero monthly investment → projected = 0
2. ✓ Goal with zero return rate → projected = sum of contributions
3. ✓ Goal with 0% monthly + 7% return → projected = 0
4. ✓ Goal with contributions + return → compound interest applied
5. ✓ Goal not started yet → projected = 0
6. ✓ Goal active for 1 year → verify against manual calculation
7. ✓ On-track determination → currentValue >= projectedValue
8. ✓ Chart data points → verify intervals match selected period

## References

- `src/lib/date-utils.ts` — Date calculation utilities
  - `getMonthsDiff()` — Calculate months between dates
  - `formatTimeRemaining()` — Format time to due date
  - `formatTimeElapsed()` — Format time since start date

- `src/pages/goals/lib/goal-utils.ts` — Goal calculation and status utilities
  - `calculateProjectedValue()` — Monthly compounding projection
  - `calculateProjectedValueByDate()` — Daily compounding projection for any date
  - `getDaysDiff()` — Calculate days between dates
  - `isGoalOnTrack()` — Compare current vs monthly-projected value
  - `isGoalOnTrackByDate()` — Compare current vs daily-projected value
  - `isGoalScheduled()` — Check if goal is future-scheduled
  - `getGoalStatus()` — Get UI status display

- `src/pages/goals/use-goal-progress.ts` — Main hook for goal progress and
  on-track determination

- `src/pages/goals/use-goal-valuation-history.ts` — Chart data generation with
  monthly compounding projections

- `src/pages/goals/goal-details-page.tsx` — Goal details page (uses
  goalProgress.isOnTrack as single source)

- `src/pages/goals/components/goal-form.tsx` — Goal form (calculates monthly
  investment using same formula)

- `docs/goal-actual-growth-business-logic.md` — Actual value calculation logic
