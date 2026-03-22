-- Add preferred schedule fields to plan_request_items.
-- preferred_start_time: the daily start time suggested by admin/supervisor for this job.
-- preferred_provider_id: optional pre-assigned provider suggested by admin.
ALTER TABLE plan_request_items
  ADD COLUMN IF NOT EXISTS preferred_start_time time,
  ADD COLUMN IF NOT EXISTS preferred_provider_id uuid REFERENCES service_providers(id);

-- Notify PostgREST to reload its schema cache.
NOTIFY pgrst, 'reload schema';
