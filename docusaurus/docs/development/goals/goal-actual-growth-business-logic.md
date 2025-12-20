# Goal Actual Growth Business Logic

## Overview

This document describes the complete business logic for calculating goal actual growth. The system tracks how allocated portfolio values grow over time and attributes that growth correctly across multiple accounts and goals.

## Core Concepts

### 1. Allocation Model

Each goal has allocations across one or more accounts:
- **initialContribution**: The initial dollar amount allocated (locked at goal start date).
- **allocatedPercent**: The percentage of account growth attributed to this goal (0-100%)
- **allocationDate**: When the allocation was made (typically goal.startDate for initial allocations)

### 2. Growth Attribution Principle

```
Goal Growth = Sum of (Account Growth × Allocation Percentage) for all accounts
```

Where:
- **Account Growth** = Current Account Value - Account Value at Goal Start Date
- **Allocation Percentage** = The percentage of account growth attributed to this goal

This allows multiple goals to grow from a single account without double-counting.

### 2.1. Contributed Value
Contributed Value is the total value of the goal at the current date that have contributed to the goal.
```
Contributed Value = Sum of (initialContribution + Account Growth × Allocation Percentage) for all accounts
```

### 2.2. Goal Growth
Unallocated Value is the value of the account that is not allocated to any goal at the specified date.
```
Unallocated Value = Account Value at Goal specified Date - sum (contributed value and initialContribution of all goals at the specified date)
```

### 3. Current Value vs Initial Contribution

Under the new allocation system:

- **initialContribution**: The originally allocated amount (locked in at allocation date)
- **current_value**: initialContribution + attributed_growth
- **growth**: current_value - initialContribution

**Important**: All allocations are initialized with initialContribution=0 and allocatedPercent=0 when a goal is created. Users then allocate from the unallocated pool.

## Calculation Scenarios

### Scenario 1: Single Account, Single Goal

**Setup:**
- Account A: Value at goal start (2024-01-01) = 0
- Account A: Current value (today) = 100,000,000
- Goal created today with startDate=2024-01-01
- User allocates: initialContribution=0 (can not greater than value at start date), allocatedPercent=50%

**Calculation:**
```
Account growth = 100,000,000 - 0 = 100,000,000
Goal growth = 100,000,000 × 50% = 50,000,000
Goal current value = initialContribution + growth = 0 + 50,000,000 = 50,000,000
```

### Scenario 2: Single Account, Multiple Goals

**Setup:**
- Account A: Value at goal start = 0
- Account A: Current value = 100,000,000
- Goal 1: initialContribution= 0 (can not greater than value at start date), allocatedPercent=50%
- Goal 2: initialContribution=0 (can not greater than value at start date), allocatedPercent=30%
- Unallocated: 20,000,000 @ 20%
- Unallocated growth = 20,000,000

**Calculation:**
```
Account growth = 100,000,000 (from 0 - 100M)

Goal 1:
  growth = 100,000,000 × 50% = 50,000,000
  contributedValue = 0 + 50,000,000 = 50,000,000

Goal 2:
  growth = 100,000,000 × 30% = 30,000,000
  contributedValue = 0 + 30,000,000 = 30,000,000

Unallocated:
  growth = 100,000,000 × 20% = 20,000,000
  unallocatedValue = 20,000,000

Validation: 50M + 30M + 20M = 100M  = Goal Growth (from 0 - 100M)
```

### Scenario 3: Multiple Accounts, Single Goal

**Setup:**
- Account 1: Value at goal start = 0, Current = 100,000,000
- Account 2: Value at goal start = 0, Current = 100,000,000
- Account 3: Value at goal start = 0, Current = 100,000,000
- Goal 1:
  - Account 1: initialContribution=0 (can not greater than value at start date), allocatedPercent=30%
  - Account 2: initialContribution=0 (can not greater than value at start date), allocatedPercent=30%
  - Account 3: initialContribution=0 (can not greater than value at start date), allocatedPercent=30%

**Calculation:**
```
Account 1 growth = 100,000,000 × 30% = 30,000,000
Account 2 growth = 100,000,000 × 30% = 30,000,000
Account 3 growth = 100,000,000 × 30% = 30,000,000

Goal 1:
  total_growth = 30M + 30M + 30M = 90,000,000
  current = (0 + 0 + 0) + 90M = 90,000,000
```

### Scenario 4: Allocation Edits (Amount Change)

**Setup:**
- Account A: Value at goal start = 1,000, Current account value = 1,100
- Goal allocation: initialContribution=500, allocatedPercent=50%
- User edits allocation to: initialContribution=600

**Before Edit:**
```
Growth = (1,100 - 1,000) × 50% = 50
Contributed Value = 500 + 50 = 550
Unallocated = 1,100 - 550 = 550
```

**After Edit:**
```
Growth = (1,100 - 1,000) × 50% = 50 (unchanged - still from historical baseline)
Contributed Value = 600 + 50 = 650
Unallocated = 1,100 - 650 = 450

Impact:
- Allocation increased by 100. The initialContribution is now 600. but the init point of actual growth line is start at 600 after make change
- Unallocated decreased by 100
```

**Key**: The historical growth (50) doesn't change. Only the initialContribution changes.

### Scenario 5: Allocation Edits (Percentage Change)

**Setup:**
- Account A: Value at goal start = 1,000, Current = 1,100
- Goal allocation: initialContribution=500, allocatedPercent=50%
- User edits percentage to: 70%

**Before Edit:**
```
Growth = (1,100 - 1,000) × 50% = 50
Contributed Value = 500 + 50 = 550
Unallocated = 1,100 - 550 = 550
```

**After Edit:**
```
Growth = (1,100 - 1,000) × 70% = 70
Contributed Value = 500 + 70 = 570
Unallocated = 1,100 - 570 = 530

Impact:
- Growth increases by 20 (from the 20% percentage change)
- InitialContribution stays locked at 500 (no changes)
```

**Key**: initialContribution is immutable. Only growth recalculates based on new percentage. the growth line will start from the new initialContribution point.

### Scenario 6: Segmented Growth (Multiple Allocation Versions)

**Setup:**
- Account A: Value at goal start (Jan 1) = 1,000
- Value at Feb 15 = 1,100
- Value at Apr 1 = 1,250
- Current (today) = 1,330

**Allocation History:**
Assign Acount A to goal
- initialContribution=0
- Version 1: Jan 1 - Feb 15, allocatedPercent=50%
- Version 2: Feb 15 - Apr 1, allocatedPercent=50%
- Version 3: Apr 1 - today, allocatedPercent=60%

**Calculation:**
```
Period 1 (Jan 1 - Feb 15):
  goal growth = (1,100 - 1,000) × 50% = 50
  goal contributedValue = 0 + 50 = 50

Period 2 (Feb 15 - Apr 1):
  goal growth = (1,250 - 1,100) × 50% = 75
  goal contributedValue = 50 + 75 = 125

Period 3 (Apr 1 - today):
  goal growth = (1,330 - 1,250) × 60% = 48
  goal contributedValue = 125 + 48 = 173

Total goal growth = 50 + 75 + 48 = 173
Total goal contributedValue = 0 + 173 = 173
```
Note: The initialContribution is 0, so the contributed value is the same as the growth. The line in chart only change following the changes of growth.

## Edge Cases

### Case 1: Goal Created After Account Has Grown

**Setup:**
- Account A: Value on 2024-01-01 = 0
- Account A: Current (2025-12-14) = 100,000,000
- Goal created today with startDate=2024-01-01
- User allocates: initialContribution=0 (account value at start date is 0, not allowed to greater than value at start date), allocatedPercent=50%

**Result:**
```
Unallocated at goal start date (2024-01-01) = 0
Cannot allocate 50,000,000 when unallocated was 0

This is INVALID. The system should prevent this with validation:
"Allocation amount exceeds historical unallocated balance at goal start date"

Correct approach:
- User can only allocate UP TO the current unallocated balance
- OR the system allocates from the grown balance retroactively
```

**Business Logic Decision:**
According to allocation-setting-plan.md:
- When a goal is created with historical start date, unallocated is calculated at that start date
- User can only allocate from that historical unallocated balance (plus its subsequent growth)
- If user wants to allocate 50M today, it must come from the 40M unallocated that grew from 0

### Case 2: Account Value Decreases

**Setup:**
- Account A: Value at goal start = 1,000, Current value = 800
- Goal allocation: initialContribution=500, allocatedPercent=50%

**Calculation:**
```
Account growth = 800 - 1,000 = -200 (negative/loss)
Goal growth = -200 × 50% = -100 (loss proportional to allocation)
Contributed value = 500 + (-100) = 400
```

**Key**: Losses are attributed proportionally to allocations, just like gains.

### Case 3: Zero Account Value

**Setup:**
- Account A: Value at goal start = 0, Current value = 100,000,000
- Goal allocation: initialContribution=0, allocatedPercent=50% (default initialization)

**Calculation:**
```
Account growth = 100,000,000 - 0 = 100,000,000
Goal growth = 100,000,000 × 50% = 50,000,000
Contributed value = 0 + 50,000,000 = 50,000,000

This is valid and shows correct initialization behavior
```

### Case 4: Account Grows Before Allocation

**Setup:**
- Account A: Value on 2024-01-01 = 100,000
- Account A: Value on 2024-06-01 = 200,000 (grew by 100,000)
- Account A: Current value = 300,000

**Scenario A: Allocate on 2024-06-01**
```
For the allocation, use:
- Goal start date: 2024-01-01
- Allocation date: 2024-06-01
- Account value at goal start: 100,000
- Account value at allocation: 200,000
- Current value: 300,000

Unallocated at goal start = 100,000
User can allocate from current unallocated value (which has grown from 100,000 to 200,000)

If user allocates 150,000 on 2024-06-01:
- initialContribution: 150,000 (locked in)
- unallocated: 200,000 - 150,000 = 50,000
- allocation percentage: manual input (20%)

Growth calculation:
- account growth from goal allocation date = 300,000 - 200,000 = 100,000
- goal growth = 100,000 × 20% = 20,000
- contributedValue = 150,000 + 20,000 = 170,000
- unallocated = 50,000 + 100,000* (100% - 20%) = 50,000 + 80,000 = 130,000
```

**Key**: Allocation percentage is based on account value AT ALLOCATION TIME, not goal start time.

### Case 5: Future-Start Goal (Goal Not Yet Begun)

**Setup:**
- Account A: Current value (2025-12-14) = 100,000
- Goal created today with startDate=2025-12-25 (future date, 11 days from now)
- Unallocated balance today = 100,000
- User opens goal details and clicks "Edit Allocations"

**Behavior:**
```
For future-start goals:
1. Use CURRENT account values as the baseline for "Unallocated Balance"
   - Unallocated = Account Current Value - Sum(initialContributions of all goals)
   - Example: 100,000 - 0 = 100,000

2. User can allocate from the current unallocated pool
   - initialContribution: up to 100,000 (current unallocated)
   - allocatedPercent: 0-100% (user configurable)
   - allocationDate: NOT set by user, backend backfills from goal.startDate

3. When goal start date arrives (2025-12-25):
   - Backend will use historical account value at 2025-12-25
   - Growth calculated from that historical baseline

Example allocation made today for future-start goal:
- initialContribution: 50,000
- allocatedPercent: 40%
- allocationDate: (empty, backend will set to 2025-12-25)
- Unallocated remaining: 100,000 - 50,000 = 50,000
```

**Growth Calculation (after goal start date):**
```
Assume on 2025-12-25:
- Account value = 102,000 (grew by 2,000)
- Assume on 2026-01-14 (today + 31 days): Account value = 105,000

Goal growth from 2025-12-25 to 2026-01-14:
- Account growth = 105,000 - 102,000 = 3,000
- Goal growth = 3,000 × 40% = 1,200
- Contributed value = 50,000 + 1,200 = 51,200
```

**Key Characteristics:**
- Allocations created on-demand (when user opens edit modal, not on goal creation)
- Uses current account values, not future/projected values
- Backend backfills allocation dates from goal dates
- Goal creation succeeds immediately (no dependent allocation save)
- Allocation percentages describe future growth attribution, not current ownership

## Implementation Requirements

 ### 1. Backend Calculation (Rust)

 The `GoalService.calculate_goal_progress_on_date()` must:

 ```rust
 For each allocation:
   1. Get account value at goal.start_date (baseline)
   2. Get account value at query_date (current)
   3. Calculate account_growth = current - baseline
   4. Calculate allocated_growth = account_growth × (allocation.percentage / 100)
   5. Accumulate total_growth
   6. Return GoalProgressSnapshot with all details
 ```

 **Current Implementation Status**: ✓ Implemented correctly in `src-core/src/goals/goals_service.rs`

 ### 2. Frontend Calculation (React)

 The `useGoalProgress()` hook must:

 ```typescript
 For each goal:
   1. Find all active allocations (where startDate <= today <= endDate)
   2. For each allocation:
      - Get current account value from latestValuations
      - Calculate: allocated_value = account_value × (allocation.percentage / 100)
   3. Sum all allocated_values = currentValue
   4. Calculate projectedValue using compound interest formula
   5. Compare currentValue vs projectedValue to determine isOnTrack
 ```

 **Current Implementation Status**: ⚠️ Incorrect / Divergent
 - Uses `percentAllocation` (should be `allocatedPercent` as per type definitions)
 - Calculates `allocatedValue` as `totalValue * percentage`. This interprets percentage as "% of Total Account Value" rather than "% of Growth or Attribution"
 - Does not subtract historical account value at goal start (no access to historical data in this hook)
 - Assumes `startValue` is 0 for projections

 ### 3. Modal Display (Edit Allocation)

 The `EditAllocationModal` must display:

 ```
 For each account:
   - Value at goal.startDate (historical baseline for past/current goals)
   - Unallocated at that date
   - Current user allocation amount
   - Current allocation percentage

 For future-start goals:
   - Use CURRENT account values as the baseline
   - Display "Unallocated" as current unallocated balance
   - Allocations will have their dates backfilled by backend

 Validation:
   - Sum of allocations <= unallocated balance (at goal start for past goals, current for future goals)
   - Amount delta fits within available unallocated
   - Percentage sum <= 100% per account
 ```

 **Current Implementation Status**: ✓ Checks against Current Value
 - Modal receives `currentAccountValues`
 - Validates that `initialContribution <= currentAccountValue - sum(other_allocations_init_contributions)`
 - For future-start goals: detects future dates and uses current values instead of trying to fetch non-existent historical data
 - Creates allocations on-demand in submit handler (no default allocations created on goal creation)

 ### 4. Data Models

 Required fields on `GoalAllocation`:

 ```
 - id: string (unique per goal-account pair)
 - goalId: string
 - accountId: string
 - initialContribution: number (the init_amount, locked)
 - allocatedPercent: number (0-100, the growth attribution %)
 - allocationDate: string (when allocated, typically goal.startDate)
 - initAmount: f64 (same as initialContribution, for clarity)
 - startDate: string (goal.startDate, when this allocation begins)
 - endDate: string (goal.dueDate, when this allocation ends)
 ```

 **Current Implementation Status**: ✓ Types match `src/lib/types.ts` (`allocatedPercent`), but frontend usage in `useGoalProgress` is inconsistent (uses `percentAllocation`).

 ## Growth Line Chart Calculation

 ### Actual Growth Line

 For each date in chart:

 ```
 1. Get account values at that date (historical)
 2. For each allocation:
    - Lookup allocation version active on that date
    - Calculate: growth = (account_value_at_date - account_value_at_goal_start) × percentage
 3. Sum all growth = actual_value at that date
 ```

 **Key**: Use historical account valuations, not current values.

 ### Projected Growth Line

 For each date in chart:

 ```
 1. Calculate months from goal start to that date
 2. Use compound interest formula:
    FV = PMT × [((1 + r)^n - 1) / r]

    Where:
    - PMT = monthly_investment from goal
    - r = annual_return_rate / 12 / 100
    - n = months_from_start
 ```

 **Current Implementation Status**: ✓ Implemented in `src/pages/goals/use-goal-valuation-history.ts`
 - Fetches historical valuations correctly
 - Calculates actuals attempting to follow: `initialContribution + (current - start) * percent`
 - **Note**: Projection calculation currently ignores the `startValue` (Initial Allocation), projecting only monthly contributions.

 ## Validation Rules

 ### 1. Allocation Constraints

 ```
 For each account on any date:
   Sum(initialContributions for active allocations) <= account_value_at_that_date
 ```

 ### 2. Percentage Constraints

 ```
 For each account on any date:
   Sum(allocatedPercents for active allocations) <= 100%
 ```

 ### 3. Unallocated Balance

 ```
 unallocated_value = account_current_value - sum(initialContributions)
 unallocated_value must be >= 0
 ```

 ### 4. Retroactive Allocation

 When allocating to a goal with historical start date:

 ```
 Check at goal start date:
   requested_allocation <= unallocated_at_goal_start

 If violated:
   Error: "Cannot allocate more than available at goal start date (YYYY-MM-DD)"
 ```

 ## Allocation Creation Strategy

 ### On-Demand Creation (Not Upfront)

 **Why allocations are created on-demand (when user opens edit modal) rather than upfront (on goal creation):**

 1. **Goal Creation Success**: Creating allocations upfront couples goal creation to allocation initialization, which can fail. By creating on-demand, goal creation always succeeds.

 2. **Future-Start Goals**: Future-start goals have no historical baseline, making upfront allocation validation complex. On-demand creation lets users adjust allocations after goal creation with full context.

 3. **Simpler Error Handling**: If allocation save fails, it happens in the context where the user is actively managing allocations (edit modal), not hidden in goal creation flow.

 4. **Flexibility**: Users can create a goal first, then decide allocation strategy later, even for future-start goals.

 **Implementation:**
 - Goal creation does NOT call `saveAllocationsMutation`
 - `EditAllocationModal` creates allocations on first save if they don't exist (checked via `existingAllocations`)
 - Both update and create flows use same save path: `updatedAllocations.push({...})`

 ## Configuration & Flexibility

 The actual growth line becomes configurable through:

 ### 1. Allocation Amount Changes
 - User edits the initialContribution
 - Growth recalculates automatically
 - Unallocated pool adjusts by the delta

 ### 2. Allocation Percentage Changes
 - User edits the growth attribution percentage
 - Only future/historical growth recalculates
 - initialContribution remains locked

 ### 3. Allocation History
 - Each edit creates a new version
 - Growth segments by time period
 - Total growth = sum of all period gains

 ### 4. Account Selection
 - User can allocate from different accounts
 - Each account's growth is tracked independently
 - Multi-account goals show per-account breakdown

 ## Testing Scenarios

 All scenarios from "Calculation Scenarios" section should have tests covering:

 1. ✓ Single account, single goal
 2. ✓ Single account, multiple goals
 3. ✓ Multiple accounts, single goal
 4. ✓ Allocation amount edits
 5. ✓ Allocation percentage edits
 6. ✓ Segmented growth (version history)
 7. ✓ Negative growth (losses)
 8. ✓ Zero baseline values
 9. ✓ Retroactive allocation to historical start date

 ## Issues & Known Gaps

 ### 1. React Hook Logic Errors (`useGoalProgress`)
 - Uses incorrect field `percentAllocation` (instead of `allocatedPercent`), which likely results in `undefined` values at runtime.
 - Implements `Total Value * Percentage` logic instead of `Init + (Growth * Percentage)`, conflating "Ownership of Account" with "Attribution of Growth".
 - Does not fetch historical data to establish baseline.

 ### 2. Projection Logic Gaps
 - `calculateProjectedValue` (in both `useGoalProgress` and `useGoalValuationHistory`) ignores the `startValue` / `initialContribution`. It projects growth ONLY on monthly contributions, effectively assuming 0 starting capital for the projection curve.

 ### 3. Modal Validation logic
 - ✓ FIXED: `EditAllocationModal` now correctly handles both past-start and future-start goals
 - For future-start goals: detects future dates and uses current account values as baseline (not non-existent historical data)
 - For past-start goals: uses historical account values at goal.startDate when available
 - Subtracts `sum(initialContributions)` from baseline to find "Available", which is appropriate for both scenarios

 ### 4. Historical Data Fallbacks
 - `useGoalValuationHistory` defaults `startDateValue` to `initialContribution` if strict historical data for the start date is missing. This is a reasonable fallback but relies on `initialContribution` being accurate.

 ### 5. Field Naming Consistency
 - `GoalAllocation` interface is correct (`allocatedPercent`), but usage in some hooks (`useGoalProgress`) is incorrect.

 ## References

 - `docs/.temporary/allocation-setting-plan.md` - Allocation model design
 - `src-core/src/goals/goals_service.rs` - Core growth calculation logic
 - `src-core/src/goals/goal_progress_model.rs` - Data models
 - `src/pages/goals/use-goal-progress.ts` - Frontend progress calculation
 - `src/pages/goals/use-goal-valuation-history.ts` - Chart data generation
 - `src/pages/goals/components/edit-allocation-modal.tsx` - UI for allocation editing
