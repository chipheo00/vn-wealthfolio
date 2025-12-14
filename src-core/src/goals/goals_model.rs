use crate::accounts::Account;
use diesel::prelude::*;
use diesel::Queryable;
use diesel::Selectable;
use serde::{Deserialize, Serialize};

#[derive(
    Queryable,
    Identifiable,
    AsChangeset,
    Selectable,
    PartialEq,
    Serialize,
    Deserialize,
    Debug,
    Clone,
)]
#[diesel(table_name = crate::schema::goals)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
#[serde(rename_all = "camelCase")]
pub struct Goal {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub target_amount: f64,
    pub is_achieved: bool,
    pub target_return_rate: Option<f64>,
    pub due_date: Option<String>,
    pub monthly_investment: Option<f64>,
    pub start_date: Option<String>,
    pub initial_actual_value: Option<f64>,
}

#[derive(Insertable, Serialize, Deserialize, Debug, Clone)]
#[diesel(table_name = crate::schema::goals)]
#[serde(rename_all = "camelCase")]
pub struct NewGoal {
    pub id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub target_amount: f64,
    pub is_achieved: bool,
    pub target_return_rate: Option<f64>,
    pub due_date: Option<String>,
    pub monthly_investment: Option<f64>,
    pub start_date: Option<String>,
    pub initial_actual_value: Option<f64>,
}

#[derive(
    Insertable,
    Queryable,
    Identifiable,
    Associations,
    AsChangeset,
    Selectable,
    PartialEq,
    Serialize,
    Deserialize,
    Debug,
    Clone,
)]
#[diesel(belongs_to(Goal))]
#[diesel(belongs_to(Account))]
#[diesel(table_name = crate::schema::goals_allocation)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
#[serde(rename_all = "camelCase")]
pub struct GoalsAllocation {
    pub id: String,
    pub goal_id: String,
    pub account_id: String,
    #[serde(rename = "initialContribution")]
    pub init_amount: f64, // Initial contribution amount at allocation start date
    #[serde(rename = "allocatedPercent")]
    pub allocation_percentage: f64, // Allocation percentage (0-100)
    pub allocation_date: Option<String>, // When this allocation started
    // DEPRECATED: kept for backward compatibility only
    pub percent_allocation: i32,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub allocation_amount: f64,
}

#[derive(
    Insertable,
    Queryable,
    Identifiable,
    Associations,
    AsChangeset,
    Selectable,
    PartialEq,
    Serialize,
    Deserialize,
    Debug,
    Clone,
)]
#[diesel(belongs_to(GoalsAllocation, foreign_key = allocation_id))]
#[diesel(table_name = crate::schema::allocation_versions)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
#[serde(rename_all = "camelCase")]
pub struct AllocationVersion {
    pub id: String,
    pub allocation_id: String,
    #[serde(rename = "allocatedPercent")]
    pub allocation_percentage: f64,
    #[serde(rename = "initialContribution")]
    pub allocation_amount: f64,
    pub version_start_date: String,
    pub version_end_date: Option<String>,
    pub created_at: String,
}
