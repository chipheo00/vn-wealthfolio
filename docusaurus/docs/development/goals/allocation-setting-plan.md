# Goal Allocation Setting Plan

## Overview

Hybrid approach: both **value-based** and **percentage-based** allocation to prevent double-counting while properly attributing growth across multiple goals.

## Allocation Approach

### New Goal Initialization
When a goal is created, allocations are initialized with:
- **allocationAmount**: 0 for all accounts
- **allocationPercentage**: 0 for all accounts
- **allocationDate**: `goal.startDate` (not creation date)

This allows users to allocate values later, with the allocation date anchored to the goal's start period.

### Initial Allocation
- User specifies an **explicit amount** to allocate from unallocated account balance
- User also specifies an **allocation percentage** for this goal
- Allocation percentage = `allocated_amount / account_value_at_allocation_date`
- Init valuation is **locked in** (immutable)

### Example
- Account A balance at goal start date: $1000
- Goal 1: allocated $500
- Goal 2: allocated $300
- **Unallocated**: $200 (available for new goals)

## Growth Calculation

**Fixed init valuation, proportional growth:**
- Goal init value = $500 (locked, never changes)
- Allocation ratio = $500 / $1000 = 50%
- Account grows to $1100 (+$100 gain)
- **Goal actual gain** = 50% × $100 = $50
- **Goal current value** = $500 + $50 = $550

Growth is attributed **only to the allocation percentage**, not the entire account movement.

## Rules and Constraints

### Active/Archived Goals
- Remain **completely untouched** by other goal operations
- No value reshuffling between active goals
- Each goal maintains independent allocation and valuation tracking

### Goal Deletion (Removal)
- Goal A deleted → its current value becomes **free/unallocated**
- This unallocated balance is now available for new goal allocations
- No cascading impact on other active goals

### Reallocation to New Goal
- User can only allocate from **unallocated balance**
- Cannot take value from other active/archived goals
- New allocation uses current value as init valuation

## Allocation Editing

### Edit Amount (Init Valuation)
- User updates allocated amount (e.g., $500 → $600)
- Goal's **init valuation recalculates** to new amount
- Changes the baseline going forward
- Historical growth already locked in (no retroactive changes)
- Freed/required balance impacts unallocated pool

**Example:**
- Current allocation: $500
- User edits to $600 → init valuation becomes $600
- Unallocated pool decreases by $100

### Edit Percentage (Allocation Strategy)
- User edits percentage for a **specific historical period only**
- **Init amount stays locked** (never changes)
- Only the growth calculation for that period recalculates with new %
- Other periods and current value update accordingly
- No impact to periods before or after the edited period

**Example:**
- Account A: $1000 initial
- Goal A: $500 allocated @ 50%
- Account A grows: $1000 → $1100 (+$100)
- **Before edit:**
  - Growth = $100 × 50% = $50
  - Goal value = $500 + $50 = $550
- **User edits: 50% → 70%**
  - Init amount: $500 ✓ (unchanged)
  - Growth recalculated: $100 × 70% = $70
  - Goal value: $500 + $70 = $570
  - Impact: +$20 additional gain (only in this period)

## Allocation History & Versioning

**Track allocation changes:**
```
Allocation History:
- Version 1: Amount=$500, Percentage=50%, Date=Jan 1, Status=Active
- Version 2: Amount=$600, Percentage=50%, Date=Feb 15, Status=Active
- Version 3: Amount=$600, Percentage=60%, Date=Apr 1, Status=Active
```

**Each version stores:**
- Amount
- Percentage
- Start date (when this version became active)
- End date (when next version started, or null if current)

## Growth Calculation with History

**Segmented growth:**
1. For each allocation period (between version changes), calculate:
   - `period_gain = (account_value_end - account_value_start) × allocation_percentage`
2. Sum all period gains for total actual gain
3. Current value = init_amount + total_actual_gain

**Unallocated balance growth:**
- Unallocated percentage = 100% - sum(all_goal_percentages)
- Unallocated balance grows with its own allocation percentage
- When user creates new goal later, they allocate from the grown unallocated balance

**Example Timeline:**
```
Initial State:
- Account A: $1000
- Goal 1: $500 @ 50%
- Goal 2: $300 @ 30%
- Unallocated: $200 @ 20%

After Account A grows to $1100 (+$100):
- Goal 1 value: $500 + ($100 × 50%) = $550
- Goal 2 value: $300 + ($100 × 30%) = $330
- Unallocated: $200 + ($100 × 20%) = $220 ← also grows!

User creates Goal 3 (allocates from unallocated):
- Goal 3 init amount: $220 (the grown unallocated balance)
- Goal 3 percentage: 20%
- From now on: Goal 3 grows with 20% of future Account A growth
```

**Validation always holds:**
- `sum(goal_values) + unallocated_value = account_current_value`

**Example with segmented periods:**
- Period 1 (Jan 1 - Feb 15): Growth $100 @ 50% = $50
- Period 2 (Feb 15 - Apr 1): Growth $150 @ 50% = $75
- Period 3 (Apr 1 - Now): Growth $80 @ 60% = $48
- **Total gain = $173**
- **Current value = $600 + $173 = $773**

## Validation Logic

```
sum(all_goal_allocations) + unallocated_balance = account_total_value
```

Before allocation:
- User selects amount `X` from unallocated balance
- Validate: `X <= unallocated_balance`
- Calculate allocation ratio: `X / account_value_at_allocation_date`
- Store ratio for future growth calculations

## Implementation Requirements

1. Track **allocation history** per account-goal pair
   - Amount allocated
   - Allocation ratio
   - Allocation date
   - Status (active/archived)

2. Calculate **actual gain** from growth
   - Current account value
   - Previous account value (at allocation date)
   - Gain = (current - previous) × allocation_ratio

3. Maintain **unallocated pool**
   - Real-time calculation: `account_value - sum(all_allocations)`
   - UI validation before allocation

4. Handle **goal deletion**
   - When goal deleted, mark as deleted
   - Add current value to unallocated pool
   - Don't touch other goals' allocations

## Edge Cases

- **Account value fluctuations**: Percentage-based growth calculation handles naturally
- **Multiple allocations same account**: Each goal gets proportional share of growth
- **Account value < sum of allocations**: Should be prevented by validation
- **Reallocating between goals**: Only from unallocated pool, not between active goals
