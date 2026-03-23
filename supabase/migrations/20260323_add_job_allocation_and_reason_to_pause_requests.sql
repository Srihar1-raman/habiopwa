-- Add job_allocation_id (optional FK for single-job pauses) and reason columns
-- to pause_requests so that single-job pause submissions can be stored correctly.
ALTER TABLE pause_requests
  ADD COLUMN IF NOT EXISTS job_allocation_id uuid REFERENCES job_allocations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reason text;

-- Notify PostgREST to reload its schema cache so new columns are immediately visible.
NOTIFY pgrst, 'reload schema';
