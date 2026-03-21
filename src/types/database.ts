// Central TypeScript types aligned with supabase/schema.sql
// Single source of truth for all enum types and table row interfaces.

// ─── Enum Types ────────────────────────────────────────────────────────────

export type CartStatus = "active" | "submitted";

export type PlanRequestStatus =
  | "cart_in_progress"
  | "submitted"
  | "captain_allocation_pending"
  | "captain_review_pending"
  | "payment_pending"
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | "closed";

export type PaymentStatus = "pending" | "succeeded" | "failed";

export type StaffRole = "admin" | "ops_lead" | "manager" | "supervisor";

export type StaffStatus = "active" | "inactive";

export type ProviderType =
  | "housekeeping"
  | "kitchen"
  | "car_care"
  | "garden_care"
  | "technician_electrical"
  | "technician_plumber"
  | "technician_carpenter"
  | "technician_ro"
  | "technician_ac";

export type ProviderStatus = "available" | "on_leave" | "inactive";

export type JobAllocationStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "completed_delayed"
  | "scheduled_delayed"
  | "in_progress_delayed"
  | "cancelled"
  | "cancelled_by_customer"
  | "service_on_pause"
  | "incomplete"
  | "status_not_marked";

export type PauseStatus = "pending" | "approved" | "rejected" | "active" | "completed";

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export type OnDemandStatus = "pending" | "allocated" | "in_progress" | "completed" | "cancelled";

export type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

export type IssuePriority = "low" | "medium" | "high" | "urgent";

export type CommenterType = "customer" | "supervisor" | "admin" | "provider";

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

// ─── Table Row Interfaces ──────────────────────────────────────────────────

export interface ServiceCategory {
  id: string;
  slug: string;
  name: string;
  code: string | null;
  sort_order: number;
}

export interface ServiceJob {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  code: string | null;
  class: string | null;
  service_type: string | null;
  primary_card: string | null;
  sub_card: string | null;
  frequency_label: string;
  unit_type: string;
  unit_interval: number;
  min_unit: number;
  max_unit: number;
  default_unit: number;
  time_multiple: number | null;
  base_rate_per_unit: number;
  instances_per_month: number;
  discount_pct: number;
  is_on_demand: boolean;
  formula_type: string;
  compound_child_code: string | null;
  active: boolean;
  sort_order: number;
}

export interface Location {
  id: string;
  name: string;
  city: string | null;
  sector: string | null;
  state: string | null;
  pincode: string | null;
  is_active: boolean;
}

export interface StaffAccount {
  id: string;
  phone: string;
  name: string;
  email: string;
  password_hash: string | null;
  role: StaffRole;
  status: StaffStatus;
  reports_to: string | null;
  location_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  phone: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerProfile {
  customer_id: string;
  flat_no: string | null;
  building: string | null;
  society: string | null;
  sector: string | null;
  city: string | null;
  pincode: string | null;
  home_type: string | null;
  bhk: number | null;
  bathrooms: number | null;
  balconies: number | null;
  cars: number;
  plants: number;
  diet_pref: string | null;
  people_count: number | null;
  cook_window_morning: boolean;
  cook_window_evening: boolean;
  kitchen_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Cart {
  id: string;
  customer_id: string;
  status: CartStatus;
  preferred_start_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanRequest {
  id: string;
  request_code: string;
  customer_id: string;
  status: PlanRequestStatus;
  total_price_monthly: number;
  plan_start_date: string | null;
  plan_active_start_date: string | null;
  is_recurring: boolean;
  assigned_supervisor_id: string | null;
  admin_remarks: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanRequestItem {
  id: string;
  plan_request_id: string;
  category_id: string;
  job_id: string | null;
  job_code: string | null;
  title: string;
  frequency_label: string;
  unit_type: string;
  unit_value: number;
  minutes: number;
  base_rate_per_unit: number | null;
  instances_per_month: number | null;
  discount_pct: number | null;
  time_multiple: number | null;
  formula_type: string | null;
  base_price_monthly: number | null;
  price_monthly: number;
  mrp_monthly: number | null;
  is_addon: boolean;
  updated_at: string;
}

export interface Payment {
  id: string;
  plan_request_id: string;
  amount: number;
  status: PaymentStatus;
  provider: string | null;
  provider_ref: string | null;
  payment_link: string | null;
  payment_link_expires_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface ServiceProvider {
  id: string;
  phone: string;
  name: string;
  provider_type: ProviderType;
  status: ProviderStatus;
  aadhaar: string | null;
  address: string | null;
  permanent_address: string | null;
  location_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderWeekOff {
  id: string;
  service_provider_id: string;
  day_of_week: DayOfWeek;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
}

export interface JobAllocation {
  id: string;
  plan_request_id: string;
  plan_request_item_id: string | null;
  service_provider_id: string;
  customer_id: string;
  supervisor_id: string | null;
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  actual_start_time: string | null;   // timestamptz (ISO string)
  actual_end_time: string | null;     // timestamptz (ISO string)
  status: JobAllocationStatus;
  is_locked: boolean;
  supervisor_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PauseRequest {
  id: string;
  customer_id: string;
  plan_request_id: string;
  pause_type: string;
  pause_start_date: string;
  pause_end_date: string | null;
  pause_duration_unit: string | null;
  pause_duration_value: number | null;
  status: PauseStatus;
  created_at: string;
  updated_at: string;
}

export interface ProviderLeaveRequest {
  id: string;
  service_provider_id: string;
  leave_start_date: string;
  leave_end_date: string;
  leave_type: string | null;
  status: LeaveStatus;
  created_at: string;
  updated_at: string;
}

export interface OnDemandRequest {
  id: string;
  customer_id: string;
  plan_request_id: string | null;  // nullable — validated at request time
  job_id: string;
  request_date: string;
  request_time_preference: string | null;
  service_provider_id: string | null;
  allocated_date: string | null;
  allocated_start_time: string | null;
  allocated_end_time: string | null;
  status: OnDemandStatus;
  customer_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TechServicesAllowance {
  id: string;
  plan_request_id: string;
  service_type: string;
  month_year: string;   // format: 'YYYY-MM'
  allowed_count: number;
  used_count: number;
  created_at: string;
  updated_at: string;
}

export interface IssueTicket {
  id: string;
  customer_id: string;
  plan_request_id: string;
  job_allocation_id: string | null;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  supervisor_response: string | null;
  created_at: string;
  updated_at: string;
}

export interface IssueComment {
  id: string;
  issue_ticket_id: string;
  commenter_id: string;       // uuid — points to customer/staff/provider depending on commenter_type
  commenter_type: CommenterType;
  comment_text: string;
  created_at: string;
}
