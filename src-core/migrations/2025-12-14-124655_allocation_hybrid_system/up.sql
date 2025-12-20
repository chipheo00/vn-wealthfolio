-- Add hybrid allocation system columns to goals_allocation table
-- This migration adds support for value-based + percentage-based allocation

ALTER TABLE goals_allocation ADD COLUMN init_amount DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE goals_allocation ADD COLUMN allocation_amount DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE goals_allocation ADD COLUMN allocation_percentage DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE goals_allocation ADD COLUMN allocation_date TEXT;
ALTER TABLE goals_allocation ADD COLUMN start_date TEXT;
ALTER TABLE goals_allocation ADD COLUMN end_date TEXT;

-- Create allocation_versions table to track allocation changes over time
CREATE TABLE IF NOT EXISTS allocation_versions (
    id TEXT PRIMARY KEY,
    allocation_id TEXT NOT NULL,
    allocation_percentage DOUBLE NOT NULL,
    allocation_amount DOUBLE NOT NULL,
    version_start_date TEXT NOT NULL,
    version_end_date TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (allocation_id) REFERENCES goals_allocation(id)
);

-- Create index for faster queries
CREATE INDEX idx_allocation_versions_allocation_id ON allocation_versions(allocation_id);
CREATE INDEX idx_allocation_versions_dates ON allocation_versions(version_start_date, version_end_date);
