-- Add new columns to goals table
ALTER TABLE goals ADD COLUMN target_return_rate DOUBLE DEFAULT NULL;
ALTER TABLE goals ADD COLUMN due_date TEXT;
ALTER TABLE goals ADD COLUMN monthly_investment DOUBLE;
ALTER TABLE goals ADD COLUMN start_date TEXT;
ALTER TABLE goals ADD COLUMN initial_actual_value DOUBLE;
