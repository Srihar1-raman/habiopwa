-- Add notes column to service_providers if it doesn't already exist.
-- This column stores optional specialization / notes entered during provider creation.
ALTER TABLE service_providers ADD COLUMN IF NOT EXISTS notes text;

-- Notify PostgREST to reload its schema cache so the new column is immediately visible.
NOTIFY pgrst, 'reload schema';
