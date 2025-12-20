use crate::errors::Result;
use crate::goals::goals_model::{Goal, GoalsAllocation, NewGoal};
use crate::goals::goals_traits::{GoalRepositoryTrait, GoalServiceTrait};
use crate::goals::goal_progress_model::{GoalProgressSnapshot, AllocationDetail};
use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::Arc;

pub struct GoalService<T: GoalRepositoryTrait> {
    goal_repo: Arc<T>,
}

impl<T: GoalRepositoryTrait> GoalService<T> {
    pub fn new(goal_repo: Arc<T>) -> Self {
        GoalService { goal_repo }
    }

    pub fn get_allocations_for_account_on_date(
        &self,
        account_id: &str,
        query_date: &str,
    ) -> Result<Vec<GoalsAllocation>> {
        self.goal_repo
            .get_allocations_for_account_on_date(account_id, query_date)
    }

    pub fn validate_allocation_conflicts(
        &self,
        account_id: &str,
        new_start_date: &str,
        new_end_date: &str,
        new_percent_allocation: i32,
        exclude_allocation_id: Option<&str>,
    ) -> Result<()> {
        // DEPRECATED: This method uses old percent_allocation field
        // Use validate_allocation_percentages() instead for new hybrid system
        
        // Get allocations that overlap with the new allocation's date range
        let allocations = self.goal_repo.load_allocations_for_non_achieved_goals()?;

        let mut conflicting_percent = new_percent_allocation as f64;

        for allocation in allocations {
            if allocation.account_id != account_id {
                continue;
            }

            // Check if date ranges overlap
            if let (Some(alloc_start), Some(alloc_end)) = (&allocation.start_date, &allocation.end_date) {
                // Ranges overlap if: start_date <= new_end_date AND end_date >= new_start_date
                if alloc_start.as_str() <= new_end_date && alloc_end.as_str() >= new_start_date {
                    // Skip the allocation we're updating
                    if let Some(exclude_id) = exclude_allocation_id {
                        if allocation.id == exclude_id {
                            continue;
                        }
                    }
                    // Use new allocation_percentage field
                    conflicting_percent += allocation.allocation_percentage;
                }
            }
        }

        if conflicting_percent > 100.0 {
            return Err(crate::errors::Error::Validation(
                crate::errors::ValidationError::InvalidInput(
                    format!(
                        "Total allocation {:.1}% exceeds 100% on account {} during this period",
                        conflicting_percent, account_id
                    )
                )
            ));
        }

        Ok(())
    }

    /// Calculate goal progress on a specific date
    /// Parameters:
    ///   goal: The goal to calculate progress for
    ///   account_values_at_goal_start: Map of account_id -> value at goal.start_date
    ///   current_account_values: Map of account_id -> current value at query_date
    ///   query_date: The date to calculate progress for (format: YYYY-MM-DD)
    pub fn calculate_goal_progress_on_date(
        &self,
        goal: &Goal,
        account_values_at_goal_start: &HashMap<String, f64>,
        current_account_values: &HashMap<String, f64>,
        query_date: &str,
    ) -> Result<GoalProgressSnapshot> {
        // Ensure goal has a start_date (validates goal structure)
        let _goal_start_date = goal
            .start_date
            .as_ref()
            .ok_or_else(|| {
                crate::errors::Error::Validation(
                    crate::errors::ValidationError::InvalidInput(
                        "Goal must have a start_date".to_string(),
                    ),
                )
            })?;

        // Get allocations active on the query_date
        let active_allocations = self.goal_repo.get_allocations_for_account_on_date("", query_date)?;

        // Filter for allocations of this goal only
        let goal_allocations: Vec<_> = active_allocations
            .iter()
            .filter(|a| a.goal_id == goal.id)
            .collect();

        let mut total_growth = 0.0;
        let mut allocation_details = Vec::new();

        for allocation in goal_allocations {
            let account_value_at_start = account_values_at_goal_start
                .get(&allocation.account_id)
                .copied()
                .unwrap_or(0.0);

            let current_account_value = current_account_values
                .get(&allocation.account_id)
                .copied()
                .unwrap_or(0.0);

            let account_growth = current_account_value - account_value_at_start;
            let allocation_percent = allocation.percent_allocation as f64 / 100.0;
            let allocated_growth = account_growth * allocation_percent;

            total_growth += allocated_growth;

            allocation_details.push(AllocationDetail {
                account_id: allocation.account_id.clone(),
                percent_allocation: allocation.percent_allocation,
                account_value_at_goal_start: account_value_at_start,
                account_current_value: current_account_value,
                account_growth,
                allocated_growth,
            });
        }

        Ok(GoalProgressSnapshot {
            goal_id: goal.id.clone(),
            goal_title: goal.title.clone(),
            query_date: query_date.to_string(),
            init_value: 0.0, // Always 0 under new logic
            current_value: total_growth,
            growth: total_growth, // growth = current_value - init_value = total_growth - 0
            allocation_details,
        })
    }

    /// Get all active allocations for a specific goal on a given date
    pub fn get_goal_allocations_on_date(
        &self,
        goal_id: &str,
        query_date: &str,
    ) -> Result<Vec<GoalsAllocation>> {
        let all_allocations = self.goal_repo.load_allocations_for_non_achieved_goals()?;

        Ok(all_allocations
            .into_iter()
            .filter(|a| {
                if a.goal_id != goal_id {
                    return false;
                }
                // Check if date is within allocation's active range
                match (&a.start_date, &a.end_date) {
                    (Some(start), Some(end)) => start.as_str() <= query_date && query_date <= end.as_str(),
                    _ => false, // Allocation without dates is not active
                }
            })
            .collect())
    }

    /// Get unallocated balance for an account on a given date
    /// Unallocated = account_current_value - sum(all_goal_allocations)
    pub fn get_unallocated_balance(
        &self,
        account_id: &str,
        current_account_value: f64,
    ) -> Result<f64> {
        let allocations = self.goal_repo.get_allocations_for_account(account_id)?;
        
        let total_allocated: f64 = allocations
            .iter()
            .map(|a| a.allocation_amount)
            .sum();

        Ok((current_account_value - total_allocated).max(0.0))
    }

    /// Validate that unallocated balance is sufficient for a new allocation
    pub fn validate_unallocated_balance(
        &self,
        account_id: &str,
        allocation_amount: f64,
        current_account_value: f64,
    ) -> Result<()> {
        let unallocated = self.get_unallocated_balance(account_id, current_account_value)?;
        
        if allocation_amount > unallocated {
            return Err(crate::errors::Error::Validation(
                crate::errors::ValidationError::InvalidInput(
                    format!(
                        "Allocation amount ${} exceeds available unallocated balance ${:.2}",
                        allocation_amount, unallocated
                    )
                )
            ));
        }

        Ok(())
    }

    /// Validate that total allocation percentages don't exceed 100%
    pub fn validate_allocation_percentages(
        &self,
        account_id: &str,
        new_percentage: f64,
        exclude_allocation_id: Option<&str>,
    ) -> Result<()> {
        let allocations = self.goal_repo.get_allocations_for_account(account_id)?;
        
        let mut total_percent = new_percentage;
        
        for allocation in allocations {
            // Skip the allocation being updated
            if let Some(exclude_id) = exclude_allocation_id {
                if allocation.id == exclude_id {
                    continue;
                }
            }
            total_percent += allocation.allocation_percentage;
        }

        if total_percent > 100.0 {
            return Err(crate::errors::Error::Validation(
                crate::errors::ValidationError::InvalidInput(
                    format!(
                        "Total allocation percentage {:.1}% exceeds 100% on account {}",
                        total_percent, account_id
                    )
                )
            ));
        }

        Ok(())
    }

    /// Calculate growth for an allocation over a period
    /// growth = (account_value_end - account_value_start) * allocation_percentage / 100
    pub fn calculate_allocation_growth(
        &self,
        allocation_percentage: f64,
        account_value_start: f64,
        account_value_end: f64,
    ) -> f64 {
        let account_growth = account_value_end - account_value_start;
        account_growth * (allocation_percentage / 100.0)
    }

    /// Calculate segmented growth based on allocation version history
    /// Returns total growth across all periods with different allocation percentages
    pub fn calculate_segmented_growth(
        &self,
        allocation_values: &[(f64, f64, f64)], // (allocation_percentage, value_start, value_end)
    ) -> f64 {
        allocation_values
            .iter()
            .map(|(percentage, start, end)| {
                self.calculate_allocation_growth(*percentage, *start, *end)
            })
            .sum()
    }

    /// Get current value for an allocation (init_amount + growth)
    pub fn calculate_allocation_current_value(
        &self,
        allocation: &GoalsAllocation,
        allocation_growth: f64,
    ) -> f64 {
        allocation.init_amount + allocation_growth
    }

    /// Validate historical allocation constraints
    /// Ensures that at the time of allocation, it didn't exceed available balance
    pub fn validate_historical_allocation(
        &self,
        account_id: &str,
        allocation_amount: f64,
        allocation_date: &str,
        account_value_at_allocation_date: f64,
    ) -> Result<()> {
        // Get all allocations for this account
        let allocations = self.goal_repo.get_allocations_for_account(account_id)?;
        
        // Sum up allocations that were active on the allocation_date
        let mut total_allocated_at_date = 0.0;
        
        for alloc in &allocations {
            // Check if this allocation was active on allocation_date
            if let Some(alloc_date) = &alloc.allocation_date {
                if alloc_date.as_str() <= allocation_date {
                    // This allocation was already active, check if it was still active
                    // For simplicity, assume if allocation_date exists, it's active until explicitly removed
                    total_allocated_at_date += alloc.init_amount;
                }
            }
        }

        // Add the new allocation
        total_allocated_at_date += allocation_amount;

        // Check if total exceeds account value at that time
        if total_allocated_at_date > account_value_at_allocation_date {
            return Err(crate::errors::Error::Validation(
                crate::errors::ValidationError::InvalidInput(
                    format!(
                        "On {}, total allocation ${:.2} would exceed account value ${:.2}",
                        allocation_date, total_allocated_at_date, account_value_at_allocation_date
                    )
                )
            ));
        }

        Ok(())
    }
}

#[async_trait]
impl<T: GoalRepositoryTrait + Send + Sync> GoalServiceTrait for GoalService<T> {
    fn get_goals(&self) -> Result<Vec<Goal>> {
        self.goal_repo.load_goals()
    }

    async fn create_goal(&self, new_goal: NewGoal) -> Result<Goal> {
        self.goal_repo.insert_new_goal(new_goal).await
    }

    async fn update_goal(&self, updated_goal_data: Goal) -> Result<Goal> {
        self.goal_repo.update_goal(updated_goal_data).await
    }

    async fn delete_goal(&self, goal_id_to_delete: String) -> Result<usize> {
        self.goal_repo.delete_goal(goal_id_to_delete).await
    }

    async fn upsert_goal_allocations(&self, mut allocations: Vec<GoalsAllocation>) -> Result<usize> {
        // Backfill allocation dates from their associated goals
        let goals = self.goal_repo.load_goals()?;
        let goal_map: HashMap<String, Goal> = goals
            .into_iter()
            .map(|g| (g.id.clone(), g))
            .collect();

        for allocation in &mut allocations {
            if let Some(goal) = goal_map.get(&allocation.goal_id) {
                // Backfill start_date if missing
                if allocation.start_date.is_none() {
                    allocation.start_date = goal.start_date.clone();
                }
                // Backfill end_date (due_date) if missing
                if allocation.end_date.is_none() {
                    allocation.end_date = goal.due_date.clone();
                }
            }
        }

        self.goal_repo.upsert_goal_allocations(allocations).await
    }

    fn load_goals_allocations(&self) -> Result<Vec<GoalsAllocation>> {
        self.goal_repo.load_allocations_for_non_achieved_goals()
    }

    fn validate_allocation_conflicts(
        &self,
        account_id: &str,
        start_date: &str,
        end_date: &str,
        percent_allocation: i32,
        exclude_allocation_id: Option<&str>,
    ) -> Result<()> {
        self.validate_allocation_conflicts(account_id, start_date, end_date, percent_allocation, exclude_allocation_id)
    }

    fn get_unallocated_balance(&self, account_id: &str, current_account_value: f64) -> Result<f64> {
        self.get_unallocated_balance(account_id, current_account_value)
    }

    fn validate_unallocated_balance(&self, account_id: &str, allocation_amount: f64, current_account_value: f64) -> Result<()> {
        self.validate_unallocated_balance(account_id, allocation_amount, current_account_value)
    }

    fn validate_allocation_percentages(&self, account_id: &str, new_percentage: f64, exclude_allocation_id: Option<&str>) -> Result<()> {
        self.validate_allocation_percentages(account_id, new_percentage, exclude_allocation_id)
    }

    fn get_repository(&self) -> &dyn GoalRepositoryTrait {
        self.goal_repo.as_ref()
    }
}
