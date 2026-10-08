/**
 * StyleFleet Database Types
 * Generated directly from live Supabase schema inspection
 */

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface Shop {
  id: string;
  name: string;
  owner_profile_id: string | null;
  logo_path: string | null;
  address: string | null;
  city: string | null;
  pin_code: string | null;
  gstin: string | null;
  phone: string | null;
  accent_color: string;
  invoice_prefix: string;
  gst_rate: number;
  /** Per-salon override of the free-plan sales limit; null means the app default (100) */
  free_sales_limit?: number | null;
  created_at: string;
  updated_at: string;
  // Joined relation fields
  owner_profile?: Profile | null;
  staff_count?: number;
  customer_count?: number;
  bill_count?: number;
  appointment_count?: number;
  duplicate_count?: number;
  duplicate_ids?: string[];
}

export interface ShopMember {
  id: string;
  shop_id: string;
  profile_id: string;
  role: 'owner' | 'manager' | 'staff' | string;
  is_active: boolean;
  created_at: string;
  profile?: Profile;
  shop?: Shop;
}

export interface StylistPermissions {
  customers: boolean;
  sales: boolean;
  appointments: boolean;
  expenses: boolean;
  reports: boolean;
  team: boolean;
  reminders: boolean;
  profile: boolean;
}

export const DEFAULT_STYLIST_PERMISSIONS: StylistPermissions = {
  customers: true,
  sales: true,
  appointments: true,
  expenses: false,
  reports: false,
  team: false,
  reminders: true,
  profile: false,
};

export interface Staff {
  id: string;
  shop_id: string;
  profile_id: string | null;
  name: string;
  role: string;
  phone: string | null;
  is_active: boolean;
  target_amount_minor: number;
  permissions?: StylistPermissions;
  invitation_status?: 'not_invited' | 'invited' | 'active' | string;
  invited_at?: string | null;
  created_at: string;
  updated_at: string;
  shop?: Shop;
}

export interface Customer {
  id: string;
  shop_id: string;
  name: string;
  phone: string;
  notes: string | null;
  preferred_staff_id: string | null;
  is_starred: boolean;
  created_at: string;
  updated_at: string;
  shop?: Shop;
}

export interface ServiceCategory {
  id: string;
  shop_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  shop_id: string;
  category_id: string | null;
  name: string;
  price_minor: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: ServiceCategory;
}

export interface Bill {
  id: string;
  shop_id: string;
  customer_id: string | null;
  staff_id: string | null;
  invoice_number: string;
  status: 'pending' | 'paid' | 'cancelled' | string;
  subtotal_minor: number;
  discount_minor: number;
  tax_minor: number;
  total_minor: number;
  notes: string | null;
  issued_at: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  shop?: Shop;
  customer?: Customer;
}

export interface BillItem {
  id: string;
  bill_id: string;
  service_id: string | null;
  service_name_snapshot: string;
  quantity: number;
  unit_price_minor: number;
  discount_minor: number;
  tax_minor: number;
  line_total_minor: number;
  staff_id: string | null;
}

export interface Payment {
  id: string;
  shop_id: string;
  bill_id: string;
  amount_minor: number;
  method: string;
  status: string;
  reference: string | null;
  paid_at: string;
  created_by: string | null;
  created_at: string;
  shop?: Shop;
  bill?: Bill;
}

export interface ExpenseCategory {
  id: string;
  shop_id: string | null;
  name: string;
  is_active: boolean;
}

export interface Expense {
  id: string;
  shop_id: string;
  category_id: string | null;
  note: string;
  amount_minor: number;
  payment_method: string;
  expense_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: ExpenseCategory;
}

export interface Appointment {
  id: string;
  shop_id: string;
  customer_id: string | null;
  staff_id: string | null;
  service_id: string | null;
  starts_at: string;
  duration_minutes: number;
  status: 'Not confirmed' | 'Confirmed' | 'Done' | 'Cancelled' | string;
  notes: string | null;
  confirmation_sent_at: string | null;
  created_at: string;
  updated_at: string;
  shop?: Shop;
  customer?: Customer;
  staff?: Staff;
  service?: Service;
}

export interface Offer {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed' | string;
  discount_value: number;
  conditions: Record<string, any>;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShopSettings {
  shop_id: string;
  appointment_reminder_enabled: boolean;
  payment_followup_enabled: boolean;
  daily_closing_enabled: boolean;
  daily_closing_time: string;
  appointment_reminder_minutes: number;
  payment_followup_interval_days: number;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  shop_id: string | null;
  user_id: string | null;
  message: string;
  contact_info: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  shop?: Shop;
  profile?: Profile;
  answers?: SupportMessageAnswer[];
}

export interface SupportMessageAnswer {
  id: string;
  shop_id: string;
  message_id?: string | null;
  admin_name?: string | null;
  answer: string;
  is_read: boolean;
  created_at: string;
}

export interface AccountDeletion {
  id: string;
  shop_id: string | null;
  user_id: string | null;
  phone: string | null;
  shop_name: string | null;
  reason: string | null;
  status: 'pending' | 'processed' | 'cancelled';
  deleted_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  shop_id: string;
  actor_profile_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface TelemetryRecord {
  id: string;
  shop_id: string | null;
  device_id: string;
  device_name?: string | null;
  platform: string;
  os_name?: string | null;
  os_version?: string | null;
  app_version: string;
  battery_level?: number | null;
  is_charging?: boolean | null;
  network_type?: string | null;
  screen_resolution?: string | null;
  memory_usage?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  recorded_at?: string | null;
  created_at: string;
  shop?: Shop;
}

export interface SystemHealthRecord {
  id: string;
  shop_id: string | null;
  component: string;
  status: string;
  details?: any;
  latency_ms: number | null;
  error_count?: number | null;
  timestamp?: string | null;
  created_at: string;
  shop?: Shop;
}

export interface SystemLogRecord {
  id: string;
  shop_id: string | null;
  device_id?: string | null;
  level: 'info' | 'warn' | 'error' | 'fatal' | 'debug' | string;
  tag: string;
  message: string;
  stack_trace?: string | null;
  device_info?: Record<string, any> | null;
  context?: Record<string, any> | null;
  created_at: string;
  shop?: Shop;
}
