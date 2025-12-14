use crate::db::{get_connection, WriteHandle};
use crate::errors::Result;
use crate::goals::goals_model::{Goal, GoalsAllocation, NewGoal, AllocationVersion};
use crate::goals::goals_traits::GoalRepositoryTrait;
use crate::schema::goals;
use crate::schema::goals::dsl::*;
use crate::schema::goals_allocation;
use crate::schema::allocation_versions;
use async_trait::async_trait;
use diesel::prelude::*;
use diesel::r2d2::{self, Pool};
use diesel::SqliteConnection;

use std::sync::Arc;
use uuid::Uuid;

pub struct GoalRepository {
    pool: Arc<Pool<r2d2::ConnectionManager<SqliteConnection>>>,
    writer: WriteHandle,
}

impl GoalRepository {
    pub fn new(
        pool: Arc<Pool<r2d2::ConnectionManager<SqliteConnection>>>,
        writer: WriteHandle,
    ) -> Self {
        GoalRepository { pool, writer }
    }

    pub fn load_goals_impl(&self) -> Result<Vec<Goal>> {
        let mut conn = get_connection(&self.pool)?;
        Ok(goals
            .select(Goal::as_select())
            .load::<Goal>(&mut conn)?)
    }

    pub fn load_allocations_for_non_achieved_goals_impl(&self) -> Result<Vec<GoalsAllocation>> {
        let mut conn = get_connection(&self.pool)?;
        Ok(goals_allocation::table
            .inner_join(goals::table.on(goals::id.eq(goals_allocation::goal_id)))
            .filter(goals::is_achieved.eq(false))
            .select(GoalsAllocation::as_select())
            .load::<GoalsAllocation>(&mut conn)?)
    }

    pub fn get_allocations_for_account_on_date(
        &self,
        account_id: &str,
        query_date: &str,
    ) -> Result<Vec<GoalsAllocation>> {
        let mut conn = get_connection(&self.pool)?;
        let query_date = query_date.to_string();
        let account_id = account_id.to_string();

        Ok(goals_allocation::table
            .filter(goals_allocation::account_id.eq(account_id))
            .filter(goals_allocation::start_date.le(&query_date))
            .filter(goals_allocation::end_date.ge(&query_date))
            .select(GoalsAllocation::as_select())
            .load::<GoalsAllocation>(&mut conn)?)
    }

    pub fn get_allocations_for_goal_impl(
        &self,
        goal_id: &str,
    ) -> Result<Vec<GoalsAllocation>> {
        let mut conn = get_connection(&self.pool)?;
        let goal_id = goal_id.to_string();

        Ok(goals_allocation::table
            .filter(goals_allocation::goal_id.eq(goal_id))
            .select(GoalsAllocation::as_select())
            .load::<GoalsAllocation>(&mut conn)?)
    }

    pub fn get_allocation_versions_impl(
        &self,
        allocation_id: &str,
    ) -> Result<Vec<AllocationVersion>> {
        let mut conn = get_connection(&self.pool)?;
        let allocation_id = allocation_id.to_string();

        Ok(allocation_versions::table
            .filter(allocation_versions::allocation_id.eq(allocation_id))
            .order_by(allocation_versions::version_start_date.asc())
            .select(AllocationVersion::as_select())
            .load::<AllocationVersion>(&mut conn)?)
    }

    pub fn get_allocation_by_id_impl(
        &self,
        allocation_id: &str,
    ) -> Result<GoalsAllocation> {
        let mut conn = get_connection(&self.pool)?;
        let allocation_id_str = allocation_id.to_string();

        Ok(goals_allocation::table
            .find(&allocation_id_str)
            .select(GoalsAllocation::as_select())
            .first(&mut conn)?)
    }

    pub fn get_allocations_for_account_impl(
        &self,
        account_id: &str,
    ) -> Result<Vec<GoalsAllocation>> {
        let mut conn = get_connection(&self.pool)?;
        let account_id = account_id.to_string();

        Ok(goals_allocation::table
            .filter(goals_allocation::account_id.eq(account_id))
            .select(GoalsAllocation::as_select())
            .load::<GoalsAllocation>(&mut conn)?)
    }
}

#[async_trait]
impl GoalRepositoryTrait for GoalRepository {
    fn load_goals(&self) -> Result<Vec<Goal>> {
        self.load_goals_impl()
    }

    async fn insert_new_goal(&self, new_goal: NewGoal) -> Result<Goal> {
        self.writer
            .exec(move |conn: &mut SqliteConnection| -> Result<Goal> {
                let mut new_goal_mut = new_goal;
                new_goal_mut.id = Some(Uuid::new_v4().to_string());

                Ok(diesel::insert_into(goals::table)
                    .values(&new_goal_mut)
                    .returning(goals::all_columns)
                    .get_result(conn)?)
            })
            .await
    }

    async fn update_goal(&self, goal_update: Goal) -> Result<Goal> {
        let goal_id_owned = goal_update.id.clone();
        let goal_update_owned = goal_update.clone();

        self.writer
            .exec(move |conn: &mut SqliteConnection| -> Result<Goal> {
                diesel::update(goals.find(goal_id_owned.clone()))
                    .set(&goal_update_owned)
                    .execute(conn)?;
                Ok(goals.filter(id.eq(goal_id_owned)).first(conn)?)
            })
            .await
    }

    async fn delete_goal(&self, goal_id_to_delete: String) -> Result<usize> {
        self.writer
            .exec(move |conn: &mut SqliteConnection| -> Result<usize> {
                Ok(diesel::delete(goals.find(goal_id_to_delete)).execute(conn)?)
            })
            .await
    }

    fn load_allocations_for_non_achieved_goals(&self) -> Result<Vec<GoalsAllocation>> {
        self.load_allocations_for_non_achieved_goals_impl()
    }

    fn get_allocations_for_account_on_date(
        &self,
        account_id: &str,
        query_date: &str,
    ) -> Result<Vec<GoalsAllocation>> {
        self.get_allocations_for_account_on_date(account_id, query_date)
    }

    async fn upsert_goal_allocations(&self, allocations: Vec<GoalsAllocation>) -> Result<usize> {
        let allocations_owned = allocations.clone();

        self.writer
            .exec(move |conn: &mut SqliteConnection| -> Result<usize> {
                let mut affected_rows = 0;
                for allocation in allocations_owned {
                    affected_rows += diesel::insert_into(goals_allocation::table)
                        .values(&allocation)
                        .on_conflict(goals_allocation::id)
                        .do_update()
                        .set(&allocation)
                        .execute(conn)?;
                }
                Ok(affected_rows)
            })
            .await
    }

    fn get_allocations_for_goal(&self, goal_id: &str) -> Result<Vec<GoalsAllocation>> {
        self.get_allocations_for_goal_impl(goal_id)
    }

    fn get_allocation_versions(&self, allocation_id: &str) -> Result<Vec<AllocationVersion>> {
        self.get_allocation_versions_impl(allocation_id)
    }

    fn get_allocation_by_id(&self, allocation_id: &str) -> Result<GoalsAllocation> {
        self.get_allocation_by_id_impl(allocation_id)
    }

    fn get_allocations_for_account(&self, account_id: &str) -> Result<Vec<GoalsAllocation>> {
        self.get_allocations_for_account_impl(account_id)
    }

    async fn insert_allocation_version(&self, version: AllocationVersion) -> Result<AllocationVersion> {
        self.writer
            .exec(move |conn: &mut SqliteConnection| -> Result<AllocationVersion> {
                Ok(diesel::insert_into(allocation_versions::table)
                    .values(&version)
                    .returning(AllocationVersion::as_select())
                    .get_result(conn)?)
            })
            .await
    }

    async fn update_allocation(&self, allocation: GoalsAllocation) -> Result<GoalsAllocation> {
        let allocation_id_owned = allocation.id.clone();
        let allocation_owned = allocation.clone();

        self.writer
            .exec(move |conn: &mut SqliteConnection| -> Result<GoalsAllocation> {
                diesel::update(goals_allocation::table.find(allocation_id_owned.clone()))
                    .set(&allocation_owned)
                    .execute(conn)?;
                Ok(goals_allocation::table
                    .filter(goals_allocation::id.eq(allocation_id_owned))
                    .select(GoalsAllocation::as_select())
                    .first(conn)?)
            })
            .await
    }

    async fn delete_allocation(&self, allocation_id: String) -> Result<usize> {
        self.writer
            .exec(move |conn: &mut SqliteConnection| -> Result<usize> {
                Ok(diesel::delete(goals_allocation::table.find(allocation_id)).execute(conn)?)
            })
            .await
    }
}
