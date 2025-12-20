use serde::{Deserialize, Serialize};

/// Represents the progress of a goal on a specific date
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoalProgressSnapshot {
    pub goal_id: String,
    pub goal_title: String,
    pub query_date: String,
    /// Initial value is always 0 under the new logic
    pub init_value: f64,
    /// Current accumulated value from growth since goal start date
    pub current_value: f64,
    /// Growth = current_value - init_value
    pub growth: f64,
    /// Allocation breakdown by account
    pub allocation_details: Vec<AllocationDetail>,
}

/// Details of how a goal is performing on a specific account
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AllocationDetail {
    pub account_id: String,
    pub percent_allocation: i32,
    /// Account value at goal start date (baseline)
    pub account_value_at_goal_start: f64,
    /// Current account value
    pub account_current_value: f64,
    /// Growth on this account = current - baseline
    pub account_growth: f64,
    /// This allocation's portion of growth
    pub allocated_growth: f64,
}

/// Summary of goal across all dates (historical view)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoalProgressHistory {
    pub goal_id: String,
    pub goal_title: String,
    pub start_date: String,
    pub due_date: String,
    /// Snapshots at key dates
    pub snapshots: Vec<GoalProgressSnapshot>,
}
