pub mod goals_model;
pub mod goals_repository;
pub mod goals_service;
pub mod goals_traits;
pub mod goal_progress_model;

pub use goals_repository::GoalRepository;
pub use goals_service::GoalService;
pub use goals_traits::{GoalRepositoryTrait, GoalServiceTrait};
pub use goal_progress_model::{GoalProgressSnapshot, GoalProgressHistory, AllocationDetail};
pub use goals_model::{GoalsAllocation, AllocationVersion};
