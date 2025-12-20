use std::sync::Arc;

use crate::{
    context::ServiceContext,
    events::{emit_resource_changed, ResourceEventPayload},
};
use log::debug;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{AppHandle, State};
use wealthvn_core::goals::goals_model::{Goal, GoalsAllocation, NewGoal, AllocationVersion};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AllocationConflictValidationRequest {
    pub account_id: String,
    pub start_date: String,
    pub end_date: String,
    pub percent_allocation: i32,
    pub exclude_allocation_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AllocationConflictValidationResponse {
    pub valid: bool,
    pub message: String,
}

// New hybrid allocation API request/response types







#[derive(Debug, Serialize)]
pub struct AllocationValidationResponse {
    pub valid: bool,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct UnallocatedBalanceResponse {
    pub unallocated_balance: f64,
}

#[tauri::command]
pub async fn get_goals(state: State<'_, Arc<ServiceContext>>) -> Result<Vec<Goal>, String> {
    debug!("Fetching active goals...");
    state.goal_service().get_goals().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_goal(
    goal: NewGoal,
    state: State<'_, Arc<ServiceContext>>,
    handle: AppHandle,
) -> Result<Goal, String> {
    debug!("Adding new goal...");
    let new_goal = state
        .goal_service()
        .create_goal(goal)
        .await
        .map_err(|e| e.to_string())?;

    emit_resource_changed(
        &handle,
        ResourceEventPayload::new("goal", "created", json!({ "goal_id": new_goal.id })),
    );

    Ok(new_goal)
}

#[tauri::command]
pub async fn update_goal(
    goal: Goal,
    state: State<'_, Arc<ServiceContext>>,
    handle: AppHandle,
) -> Result<Goal, String> {
    debug!("Updating goal...");
    let goal_id = goal.id.clone();
    let updated_goal = state
        .goal_service()
        .update_goal(goal)
        .await
        .map_err(|e| e.to_string())?;

    emit_resource_changed(
        &handle,
        ResourceEventPayload::new("goal", "updated", json!({ "goal_id": goal_id })),
    );

    Ok(updated_goal)
}

#[tauri::command]
pub async fn delete_goal(
    goal_id: String,
    state: State<'_, Arc<ServiceContext>>,
    handle: AppHandle,
) -> Result<usize, String> {
    debug!("Deleting goal...");
    let result = state
        .goal_service()
        .delete_goal(goal_id.clone())
        .await
        .map_err(|e| e.to_string())?;

    emit_resource_changed(
        &handle,
        ResourceEventPayload::new("goal", "deleted", json!({ "goal_id": goal_id })),
    );

    Ok(result)
}

#[tauri::command]
pub async fn update_goal_allocations(
    allocations: Vec<GoalsAllocation>,
    state: State<'_, Arc<ServiceContext>>,
) -> Result<usize, String> {
    debug!("Updating goal allocations...");
    state
        .goal_service()
        .upsert_goal_allocations(allocations)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_goals_allocations(
    state: State<'_, Arc<ServiceContext>>,
) -> Result<Vec<GoalsAllocation>, String> {
    debug!("Loading goal allocations...");
    state
        .goal_service()
        .load_goals_allocations()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn validate_allocation_conflict(
    request: AllocationConflictValidationRequest,
    state: State<'_, Arc<ServiceContext>>,
) -> Result<AllocationConflictValidationResponse, String> {
    debug!("Validating allocation conflict...");

    let result = state.goal_service().validate_allocation_conflicts(
        &request.account_id,
        &request.start_date,
        &request.end_date,
        request.percent_allocation,
        request.exclude_allocation_id.as_deref(),
    );

    match result {
        Ok(()) => Ok(AllocationConflictValidationResponse {
            valid: true,
            message: String::new(),
        }),
        Err(e) => Ok(AllocationConflictValidationResponse {
            valid: false,
            message: e.to_string(),
        }),
    }
}

// New hybrid allocation commands

#[tauri::command]
pub async fn get_unallocated_balance(
    account_id: String,
    current_account_value: f64,
    state: State<'_, Arc<ServiceContext>>,
) -> Result<UnallocatedBalanceResponse, String> {
    debug!("Getting unallocated balance for account...");

    let unallocated_balance = state
        .goal_service()
        .get_unallocated_balance(&account_id, current_account_value)
        .map_err(|e| e.to_string())?;

    Ok(UnallocatedBalanceResponse { unallocated_balance })
}



#[tauri::command]
pub async fn validate_allocation_percentages(
    account_id: String,
    new_percentage: f64,
    exclude_allocation_id: Option<String>,
    state: State<'_, Arc<ServiceContext>>,
) -> Result<AllocationValidationResponse, String> {
    debug!("Validating allocation percentages...");

    let result = state
        .goal_service()
        .validate_allocation_percentages(&account_id, new_percentage, exclude_allocation_id.as_deref());

    match result {
        Ok(()) => Ok(AllocationValidationResponse {
            valid: true,
            message: String::new(),
        }),
        Err(e) => Ok(AllocationValidationResponse {
            valid: false,
            message: e.to_string(),
        }),
    }
}



#[tauri::command]
pub async fn get_allocation_versions(
    allocation_id: String,
    state: State<'_, Arc<ServiceContext>>,
) -> Result<Vec<AllocationVersion>, String> {
    debug!("Getting allocation versions...");

    state
        .goal_service()
        .get_repository()
        .get_allocation_versions(&allocation_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_goal_allocation(
    allocation_id: String,
    state: State<'_, Arc<ServiceContext>>,
    handle: AppHandle,
) -> Result<usize, String> {
    debug!("Deleting goal allocation...");
    let result = state
        .goal_service()
        .get_repository()
        .delete_allocation(allocation_id.clone())
        .await
        .map_err(|e| e.to_string())?;

    emit_resource_changed(
        &handle,
        ResourceEventPayload::new("allocation", "deleted", json!({ "allocation_id": allocation_id })),
    );

    Ok(result)
}
