use std::sync::Arc;

use crate::{
    api::shared::trigger_lightweight_portfolio_update, error::ApiResult, main_lib::AppState,
};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{delete, get, post},
    Json, Router,
};
use wealthvn_core::goals::goals_model::{Goal, GoalsAllocation, NewGoal};
use wealthvn_core::goals::{GoalProgressSnapshot, AllocationDetail};
use serde::Deserialize;

async fn get_goals(State(state): State<Arc<AppState>>) -> ApiResult<Json<Vec<Goal>>> {
    let goals = state.goal_service.get_goals()?;
    Ok(Json(goals))
}

async fn create_goal(
    State(state): State<Arc<AppState>>,
    Json(goal): Json<NewGoal>,
) -> ApiResult<Json<Goal>> {
    let g = state.goal_service.create_goal(goal).await?;
    trigger_lightweight_portfolio_update(state.clone());
    Ok(Json(g))
}

async fn update_goal(
    State(state): State<Arc<AppState>>,
    Json(goal): Json<Goal>,
) -> ApiResult<Json<Goal>> {
    let g = state.goal_service.update_goal(goal).await?;
    trigger_lightweight_portfolio_update(state.clone());
    Ok(Json(g))
}

async fn delete_goal(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> ApiResult<StatusCode> {
    let _ = state.goal_service.delete_goal(id).await?;
    trigger_lightweight_portfolio_update(state);
    Ok(StatusCode::NO_CONTENT)
}

async fn load_goals_allocations(
    State(state): State<Arc<AppState>>,
) -> ApiResult<Json<Vec<GoalsAllocation>>> {
    let allocs = state.goal_service.load_goals_allocations()?;
    Ok(Json(allocs))
}

async fn update_goal_allocations(
    State(state): State<Arc<AppState>>,
    Json(allocs): Json<Vec<GoalsAllocation>>,
) -> ApiResult<StatusCode> {
    let _ = state.goal_service.upsert_goal_allocations(allocs).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Deserialize)]
struct GoalProgressQuery {
    #[serde(rename = "date")]
    query_date: Option<String>,
}

#[derive(Deserialize)]
struct AllocationConflictValidationRequest {
    account_id: String,
    start_date: String,
    end_date: String,
    percent_allocation: i32,
    exclude_allocation_id: Option<String>,
}

/// Get goal progress on a specific date
/// Query params:
///   date: YYYY-MM-DD format (optional, defaults to today)
async fn get_goal_progress(
    Path(goal_id): Path<String>,
    Query(query): Query<GoalProgressQuery>,
    State(state): State<Arc<AppState>>,
) -> ApiResult<Json<GoalProgressSnapshot>> {
    let query_date = query.query_date.unwrap_or_else(|| {
        chrono::Local::now().format("%Y-%m-%d").to_string()
    });

    // Get goal and allocations
    let goals = state.goal_service.get_goals()?;
    let goal = goals
        .iter()
        .find(|g| g.id == goal_id)
        .ok_or_else(|| {
            wealthvn_core::errors::Error::Validation(
                wealthvn_core::errors::ValidationError::InvalidInput(
                    format!("Goal '{}' not found", goal_id),
                ),
            )
        })?
        .clone();

    // Get active allocations for this goal on the query date
    let allocations = state
        .goal_service
        .get_goal_allocations_on_date(&goal_id, &query_date)?;

    if allocations.is_empty() {
        return Err(wealthvn_core::errors::Error::Validation(
            wealthvn_core::errors::ValidationError::InvalidInput(
                format!("Goal '{}' has no active allocations on {}", goal_id, query_date),
            ),
        )
        .into());
    }

    // Get account valuations at goal start and on query date
    // This requires integration with valuation service
    // For now, return a placeholder response
    let progress = GoalProgressSnapshot {
        goal_id: goal.id.clone(),
        goal_title: goal.title.clone(),
        query_date: query_date.clone(),
        init_value: 0.0,
        current_value: 0.0,
        growth: 0.0,
        allocation_details: allocations
            .iter()
            .map(|alloc| AllocationDetail {
                account_id: alloc.account_id.clone(),
                percent_allocation: alloc.percent_allocation,
                account_value_at_goal_start: 0.0,
                account_current_value: 0.0,
                account_growth: 0.0,
                allocated_growth: 0.0,
            })
            .collect(),
    };

    Ok(Json(progress))
}

/// Get all allocations for a goal on a specific date
/// Query params:
///   date: YYYY-MM-DD format (optional, defaults to today)
async fn get_goal_allocations_on_date(
    Path(goal_id): Path<String>,
    Query(query): Query<GoalProgressQuery>,
    State(state): State<Arc<AppState>>,
) -> ApiResult<Json<Vec<GoalsAllocation>>> {
    let query_date = query.query_date.unwrap_or_else(|| {
        chrono::Local::now().format("%Y-%m-%d").to_string()
    });

    let allocations = state
        .goal_service
        .get_goal_allocations_on_date(&goal_id, &query_date)?;

    Ok(Json(allocations))
}

/// Validate if adding a new allocation would create a conflict
async fn validate_allocation_conflict(
    State(state): State<Arc<AppState>>,
    Json(req): Json<AllocationConflictValidationRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    let result = state.goal_service.validate_allocation_conflicts(
        &req.account_id,
        &req.start_date,
        &req.end_date,
        req.percent_allocation,
        req.exclude_allocation_id.as_deref(),
    );

    match result {
        Ok(_) => Ok(Json(serde_json::json!({
            "valid": true,
            "message": "No allocation conflicts"
        }))),
        Err(e) => Ok(Json(serde_json::json!({
            "valid": false,
            "message": e.to_string()
        }))),
    }
}

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route(
            "/goals/allocations",
            get(load_goals_allocations).post(update_goal_allocations),
        )
        .route("/goals/{id}/progress", get(get_goal_progress))
        .route("/goals/{id}/allocations-on-date", get(get_goal_allocations_on_date))
        .route(
            "/goals/validate-allocation-conflict",
            post(validate_allocation_conflict),
        )
        .route("/goals", get(get_goals).post(create_goal).put(update_goal))
        .route("/goals/{id}", delete(delete_goal))
}
