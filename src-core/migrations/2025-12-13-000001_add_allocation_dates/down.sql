-- Rollback: Remove temporal bounds from goals_allocation table
ALTER TABLE goals_allocation DROP COLUMN start_date;
ALTER TABLE goals_allocation DROP COLUMN end_date;
