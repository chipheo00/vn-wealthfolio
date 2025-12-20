use crate::errors::Result;
use crate::goals::goals_model::{Goal, GoalsAllocation, NewGoal, AllocationVersion};
use async_trait::async_trait;

/// Trait for goal repository operations
#[async_trait]
pub trait GoalRepositoryTrait: Send + Sync {
    fn load_goals(&self) -> Result<Vec<Goal>>;
    async fn insert_new_goal(&self, new_goal: NewGoal) -> Result<Goal>;
    async fn update_goal(&self, goal_update: Goal) -> Result<Goal>;
    async fn delete_goal(&self, goal_id_to_delete: String) -> Result<usize>;
    fn load_allocations_for_non_achieved_goals(&self) -> Result<Vec<GoalsAllocation>>;
    async fn upsert_goal_allocations(&self, allocations: Vec<GoalsAllocation>) -> Result<usize>;
    fn get_allocations_for_account_on_date(
        &self,
        account_id: &str,
        query_date: &str,
    ) -> Result<Vec<GoalsAllocation>>;
    // New hybrid allocation methods
    fn get_allocations_for_goal(&self, goal_id: &str) -> Result<Vec<GoalsAllocation>>;
    fn get_allocation_versions(&self, allocation_id: &str) -> Result<Vec<AllocationVersion>>;
    fn get_allocation_by_id(&self, allocation_id: &str) -> Result<GoalsAllocation>;
    fn get_allocations_for_account(&self, account_id: &str) -> Result<Vec<GoalsAllocation>>;
    async fn insert_allocation_version(&self, version: AllocationVersion) -> Result<AllocationVersion>;
    async fn update_allocation(&self, allocation: GoalsAllocation) -> Result<GoalsAllocation>;
    async fn delete_allocation(&self, allocation_id: String) -> Result<usize>;
}

/// Trait for goal service operations
#[async_trait]
pub trait GoalServiceTrait: Send + Sync {
    fn get_goals(&self) -> Result<Vec<Goal>>;
    async fn create_goal(&self, new_goal: NewGoal) -> Result<Goal>;
    async fn update_goal(&self, updated_goal_data: Goal) -> Result<Goal>;
    async fn delete_goal(&self, goal_id_to_delete: String) -> Result<usize>;
    async fn upsert_goal_allocations(&self, allocations: Vec<GoalsAllocation>) -> Result<usize>;
    fn load_goals_allocations(&self) -> Result<Vec<GoalsAllocation>>;
    fn validate_allocation_conflicts(
        &self,
        account_id: &str,
        start_date: &str,
        end_date: &str,
        percent_allocation: i32,
        exclude_allocation_id: Option<&str>,
    ) -> Result<()>;
    // New hybrid allocation methods
    fn get_unallocated_balance(&self, account_id: &str, current_account_value: f64) -> Result<f64>;
    fn validate_unallocated_balance(&self, account_id: &str, allocation_amount: f64, current_account_value: f64) -> Result<()>;
    fn validate_allocation_percentages(&self, account_id: &str, new_percentage: f64, exclude_allocation_id: Option<&str>) -> Result<()>;
    fn get_repository(&self) -> &dyn GoalRepositoryTrait;
}
