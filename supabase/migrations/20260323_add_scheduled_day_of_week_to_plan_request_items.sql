-- Issue 3A: Add scheduled_day_of_week to plan_request_items
-- Used for weekly jobs to store which day of the week the job runs.
-- 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
-- NULL = not set (only weekly jobs need this; daily jobs ignore it)

ALTER TABLE plan_request_items
  ADD COLUMN IF NOT EXISTS scheduled_day_of_week SMALLINT DEFAULT NULL;
