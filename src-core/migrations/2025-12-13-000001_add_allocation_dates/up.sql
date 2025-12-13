-- Add temporal bounds to goals_allocation table
ALTER TABLE goals_allocation ADD COLUMN start_date TEXT;
ALTER TABLE goals_allocation ADD COLUMN end_date TEXT;

-- Backfill existing allocations with goal dates
UPDATE goals_allocation 
SET start_date = (SELECT start_date FROM goals WHERE goals.id = goals_allocation.goal_id),
    end_date = (SELECT due_date FROM goals WHERE goals.id = goals_allocation.goal_id);
