-- Add default_supervisor_id to customers table
-- This allows admin to assign a supervisor to a customer before any plan is created
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS default_supervisor_id uuid REFERENCES staff_accounts(id) ON DELETE SET NULL;

COMMENT ON COLUMN customers.default_supervisor_id IS 'Primary supervisor assigned to this customer, set by admin before plan creation';
