-- Rollback: Remove allocation_versions table
DROP TABLE IF EXISTS allocation_versions;

-- Drop indices
DROP INDEX IF EXISTS idx_allocation_versions_allocation_id;
DROP INDEX IF EXISTS idx_allocation_versions_dates;

-- Remove columns from goals_allocation
-- Note: SQLite supports ALTER TABLE DROP COLUMN
ALTER TABLE goals_allocation DROP COLUMN init_amount;
ALTER TABLE goals_allocation DROP COLUMN allocation_amount;
ALTER TABLE goals_allocation DROP COLUMN allocation_percentage;
ALTER TABLE goals_allocation DROP COLUMN allocation_date;
ALTER TABLE goals_allocation DROP COLUMN start_date;
ALTER TABLE goals_allocation DROP COLUMN end_date;
