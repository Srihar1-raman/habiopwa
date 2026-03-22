-- Add backup_provider_id to plan_request_items.
-- backup_provider_id: the provider who covers when the preferred_provider is on their weekly day-off.
ALTER TABLE plan_request_items
  ADD COLUMN IF NOT EXISTS backup_provider_id uuid REFERENCES service_providers(id);

-- Notify PostgREST to reload its schema cache.
NOTIFY pgrst, 'reload schema';
