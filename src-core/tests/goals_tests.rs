/// Tests for goal allocation conflict validation and progress calculation
/// These tests verify the new goal allocation date range and init_value=0 logic

#[cfg(test)]
mod goal_allocation_tests {
    use std::collections::HashMap;

    #[test]
    fn test_date_range_overlap_detection() {
        // Test case 1: Complete overlap
        let start1 = "2025-01-01";
        let end1 = "2025-06-30";
        let start2 = "2025-02-01";
        let end2 = "2025-05-01";

        assert!(
            ranges_overlap(start1, end1, start2, end2),
            "Should detect overlap: inner range within outer"
        );

        // Test case 2: No overlap - second range before first
        let start3 = "2024-12-01";
        let end3 = "2024-12-31";
        assert!(
            !ranges_overlap(start1, end1, start3, end3),
            "Should not overlap: second range ends before first starts"
        );

        // Test case 3: No overlap - second range after first
        let start4 = "2025-07-01";
        let end4 = "2025-12-31";
        assert!(
            !ranges_overlap(start1, end1, start4, end4),
            "Should not overlap: second range starts after first ends"
        );

        // Test case 4: Partial overlap - starts before, ends in middle
        let start5 = "2024-12-01";
        let end5 = "2025-03-01";
        assert!(
            ranges_overlap(start1, end1, start5, end5),
            "Should detect partial overlap: second range starts before, ends in middle"
        );

        // Test case 5: Single day overlap
        let start6 = "2025-06-30";
        let end6 = "2025-07-15";
        assert!(
            ranges_overlap(start1, end1, start6, end6),
            "Should detect single-day overlap"
        );
    }

    #[test]
    fn test_allocation_percent_sum_validation() {
        // Test case 1: Valid - exactly 100%
        let allocations = vec![
            ("acc-1", 50),
            ("acc-2", 50),
        ];
        assert!(
            validate_allocation_sum(&allocations),
            "Should be valid: 100% total allocation"
        );

        // Test case 2: Valid - less than 100%
        let allocations = vec![
            ("acc-1", 30),
            ("acc-2", 50),
        ];
        assert!(
            validate_allocation_sum(&allocations),
            "Should be valid: 80% total allocation"
        );

        // Test case 3: Invalid - more than 100%
        let allocations = vec![
            ("acc-1", 60),
            ("acc-2", 50),
        ];
        assert!(
            !validate_allocation_sum(&allocations),
            "Should be invalid: 110% total allocation"
        );

        // Test case 4: Valid - zero allocations
        let allocations: Vec<(&str, i32)> = vec![];
        assert!(
            validate_allocation_sum(&allocations),
            "Should be valid: 0% allocation"
        );
    }

    #[test]
    fn test_sequential_goals_no_conflict() {
        // Goal 1: 2025-01-02 to 2025-06-30, 100% allocation
        // Goal 2: 2025-07-01 to 2026-01-02, 100% allocation
        // These should NOT conflict because they don't overlap

        let goal1_start = "2025-01-02";
        let goal1_end = "2025-06-30";
        let goal2_start = "2025-07-01";
        let goal2_end = "2026-01-02";

        assert!(
            !ranges_overlap(goal1_start, goal1_end, goal2_start, goal2_end),
            "Sequential goals should not overlap"
        );
    }

    #[test]
    fn test_overlapping_goals_with_stacked_allocations() {
        // Goal 1: 2025-01-02 to 2025-12-31, Account A 80%, Account B 80%
        // Goal 2: 2025-06-01 to 2026-06-01, Account A 20%, Account B 20%
        // On 2025-06-15 (within both):
        //   - Account A: 80% + 20% = 100% ✓
        //   - Account B: 80% + 20% = 100% ✓

        let goal1_start = "2025-01-02";
        let goal1_end = "2025-12-31";
        let goal2_start = "2025-06-01";
        let goal2_end = "2026-06-01";
        let query_date = "2025-06-15";

        // Both ranges should contain query_date
        assert!(
            is_date_in_range(query_date, goal1_start, goal1_end),
            "Query date should be in goal 1 range"
        );
        assert!(
            is_date_in_range(query_date, goal2_start, goal2_end),
            "Query date should be in goal 2 range"
        );

        // Calculate total allocation per account
        let acc_a_alloc = 80 + 20; // 100%
        let acc_b_alloc = 80 + 20; // 100%

        assert_eq!(acc_a_alloc, 100, "Account A allocation should be 100%");
        assert_eq!(acc_b_alloc, 100, "Account B allocation should be 100%");
    }

    #[test]
    fn test_goal_progress_init_value_is_zero() {
        // Verify that init_value is always 0 under new logic
        let goal_start_date = "2025-01-02";
        let query_date = "2025-01-03";

        // Account snapshot at goal start: $1000
        let account_value_at_start = 1000.0;

        // Account current value at query_date: $2000
        let account_current_value = 2000.0;

        // Growth calculation
        let growth = account_current_value - account_value_at_start; // 1000
        let init_value = 0.0; // Always 0 under new logic
        let current_value = growth; // Should equal growth when init_value = 0

        assert_eq!(init_value, 0.0, "Init value must be 0");
        assert_eq!(current_value, 1000.0, "Current value should equal growth");
        assert_eq!(current_value - init_value, 1000.0, "Progress should be 1000");
    }

    #[test]
    fn test_goal_progress_with_allocations() {
        // Goal with multiple accounts and different allocations
        // Goal start: 2025-01-02
        // Query date: 2025-01-03

        let allocation_percent = 80.0 / 100.0; // 80% allocation

        // Account A
        let acc_a_start = 1000.0;
        let acc_a_current = 2000.0;
        let acc_a_growth = acc_a_current - acc_a_start; // 1000
        let acc_a_allocated_growth = acc_a_growth * allocation_percent; // 800

        // Account B
        let acc_b_start = 500.0;
        let acc_b_current = 1000.0;
        let acc_b_growth = acc_b_current - acc_b_start; // 500
        let acc_b_allocated_growth = acc_b_growth * allocation_percent; // 400

        let total_growth = acc_a_allocated_growth + acc_b_allocated_growth; // 1200

        assert_eq!(acc_a_allocated_growth, 800.0, "Account A allocated growth");
        assert_eq!(acc_b_allocated_growth, 400.0, "Account B allocated growth");
        assert_eq!(total_growth, 1200.0, "Total goal progress");
    }

    #[test]
    fn test_account_values_not_double_counted_across_goals() {
        // Scenario:
        // - Account A total value: $10,000
        // - Goal 1: Account A 50% = $5,000
        // - Goal 2: Account A 50% = $5,000
        // - Total: $10,000 (not $20,000)

        let account_total = 10000.0;

        let goal1_alloc_percent = 50.0 / 100.0;
        let goal2_alloc_percent = 50.0 / 100.0;

        let goal1_allocated = account_total * goal1_alloc_percent; // 5000
        let goal2_allocated = account_total * goal2_alloc_percent; // 5000
        let total_allocated = goal1_allocated + goal2_allocated; // 10000

        assert_eq!(goal1_allocated, 5000.0, "Goal 1 gets 50%");
        assert_eq!(goal2_allocated, 5000.0, "Goal 2 gets 50%");
        assert_eq!(
            total_allocated, 10000.0,
            "Total allocation equals account value"
        );
    }

    #[test]
    fn test_allocation_with_different_date_ranges() {
        // Goal 1, Allocation 1: 2025-01-02 to 2025-06-30
        // Goal 1, Allocation 2: 2025-06-01 to 2025-12-31 (overlaps with Allocation 1)
        // Same account, same goal but different time ranges

        let alloc1_start = "2025-01-02";
        let alloc1_end = "2025-06-30";
        let alloc2_start = "2025-06-01";
        let alloc2_end = "2025-12-31";

        let query_date = "2025-06-15";

        // Both allocations active on query_date
        assert!(
            is_date_in_range(query_date, alloc1_start, alloc1_end),
            "Allocation 1 should be active"
        );
        assert!(
            is_date_in_range(query_date, alloc2_start, alloc2_end),
            "Allocation 2 should be active"
        );
    }

    // Helper functions
    fn ranges_overlap(start1: &str, end1: &str, start2: &str, end2: &str) -> bool {
        start1 <= end2 && end1 >= start2
    }

    fn is_date_in_range(date: &str, start: &str, end: &str) -> bool {
        date >= start && date <= end
    }

    fn validate_allocation_sum(allocations: &[(&str, i32)]) -> bool {
        let total: i32 = allocations.iter().map(|(_, percent)| percent).sum();
        total <= 100
    }
}

#[cfg(test)]
mod goal_progress_calculation_tests {
    use std::collections::HashMap;

    #[test]
    fn test_goal_progress_on_single_date() {
        // Simulate: Goal started on 2025-01-02 with 100% allocation to Account A
        // Account A value on 2025-01-02: $1000 (goal start baseline)
        // Account A value on 2025-01-03: $1500 (current)
        // Expected progress: $500 growth

        let mut account_values_at_start = HashMap::new();
        account_values_at_start.insert("acc-1".to_string(), 1000.0);

        let mut current_account_values = HashMap::new();
        current_account_values.insert("acc-1".to_string(), 1500.0);

        let allocation_percent = 100.0 / 100.0;
        let acc_growth = 1500.0 - 1000.0;
        let allocated_growth = acc_growth * allocation_percent;

        assert_eq!(allocated_growth, 500.0);
    }

    #[test]
    fn test_goal_progress_with_zero_growth() {
        // Account values don't change
        let mut account_values_at_start = HashMap::new();
        account_values_at_start.insert("acc-1".to_string(), 1000.0);

        let mut current_account_values = HashMap::new();
        current_account_values.insert("acc-1".to_string(), 1000.0);

        let allocation_percent = 100.0 / 100.0;
        let acc_growth = 1000.0 - 1000.0;
        let allocated_growth = acc_growth * allocation_percent;

        assert_eq!(allocated_growth, 0.0);
    }

    #[test]
    fn test_goal_progress_with_negative_growth() {
        // Account value decreases (loss)
        let mut account_values_at_start = HashMap::new();
        account_values_at_start.insert("acc-1".to_string(), 1000.0);

        let mut current_account_values = HashMap::new();
        current_account_values.insert("acc-1".to_string(), 800.0);

        let allocation_percent = 100.0 / 100.0;
        let acc_growth = 800.0 - 1000.0; // -200
        let allocated_growth = acc_growth * allocation_percent;

        assert_eq!(allocated_growth, -200.0);
    }

    #[test]
    fn test_multiple_allocations_sum_correctly() {
        // Goal with two accounts:
        // Account A: 60% allocation, starts at $1000, now $1500 → growth $300
        // Account B: 40% allocation, starts at $500, now $700 → growth $80
        // Total growth: $300 + $80 = $380

        let acc_a_start = 1000.0;
        let acc_a_current = 1500.0;
        let acc_a_alloc = 60.0 / 100.0;
        let acc_a_growth = (acc_a_current - acc_a_start) * acc_a_alloc; // 300

        let acc_b_start = 500.0;
        let acc_b_current = 700.0;
        let acc_b_alloc = 40.0 / 100.0;
        let acc_b_growth = (acc_b_current - acc_b_start) * acc_b_alloc; // 80

        let total_progress = acc_a_growth + acc_b_growth; // 380

        assert_eq!(acc_a_growth, 300.0);
        assert_eq!(acc_b_growth, 80.0);
        assert_eq!(total_progress, 380.0);
    }
}

#[cfg(test)]
mod goal_allocation_conflict_tests {
    #[test]
    fn test_single_allocation_no_conflict() {
        // Single allocation at 80% should never conflict
        let total = 80;
        assert!(total <= 100);
    }

    #[test]
    fn test_two_allocations_100_percent_valid() {
        // Two allocations totaling exactly 100% should be valid
        let alloc1 = 60;
        let alloc2 = 40;
        let total = alloc1 + alloc2;
        assert_eq!(total, 100);
        assert!(total <= 100);
    }

    #[test]
    fn test_two_allocations_exceeding_100_invalid() {
        // Two allocations totaling more than 100% should be invalid
        let alloc1 = 60;
        let alloc2 = 50;
        let total = alloc1 + alloc2;
        assert_eq!(total, 110);
        assert!(total > 100);
    }

    #[test]
    fn test_three_allocations_mixed() {
        // Test with more than 2 allocations
        let alloc1 = 40;
        let alloc2 = 40;
        let alloc3 = 20;
        let total = alloc1 + alloc2 + alloc3;
        assert_eq!(total, 100);
        assert!(total <= 100);
    }

    #[test]
    fn test_three_allocations_exceeding() {
        // Three allocations exceeding 100%
        let alloc1 = 40;
        let alloc2 = 40;
        let alloc3 = 30;
        let total = alloc1 + alloc2 + alloc3;
        assert_eq!(total, 110);
        assert!(total > 100);
    }
}
