import { supabase } from './supabase';
import { NavView } from '../types/dashboard';

export interface SearchResultItem {
  id: string;
  type: 'salon' | 'customer' | 'staff' | 'invoice' | 'deletion' | 'support';
  title: string;
  subtitle: string;
  badge?: string;
  targetView: NavView;
  rawRecord: any;
}

export async function performGlobalSearch(query: string): Promise<SearchResultItem[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const results: SearchResultItem[] = [];

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);

    // 1. Search Salons
    let salonQuery = supabase.from('shops').select('id, name, city, phone, created_at');
    if (isUuid) {
      salonQuery = salonQuery.eq('id', trimmed);
    } else {
      salonQuery = salonQuery.or(`name.ilike.%${trimmed}%,city.ilike.%${trimmed}%,phone.ilike.%${trimmed}%`);
    }
    const { data: salons } = await salonQuery.limit(5);
    if (salons) {
      salons.forEach((s) => {
        results.push({
          id: s.id,
          type: 'salon',
          title: s.name,
          subtitle: `${s.city || 'No city'} • Phone: ${s.phone || 'N/A'}`,
          badge: 'Salon',
          targetView: 'salons_360',
          rawRecord: s,
        });
      });
    }

    // 2. Search Customers
    let custQuery = supabase.from('customers').select('id, name, phone, shop_id');
    if (isUuid) {
      custQuery = custQuery.eq('id', trimmed);
    } else {
      custQuery = custQuery.or(`name.ilike.%${trimmed}%,phone.ilike.%${trimmed}%`);
    }
    const { data: customers } = await custQuery.limit(5);
    if (customers) {
      customers.forEach((c) => {
        results.push({
          id: c.id,
          type: 'customer',
          title: c.name,
          subtitle: `Customer • Phone: ${c.phone}`,
          badge: 'Client',
          targetView: 'salons_360',
          rawRecord: c,
        });
      });
    }

    // 3. Search Staff
    let staffQuery = supabase.from('staff').select('id, name, role, phone, shop_id');
    if (isUuid) {
      staffQuery = staffQuery.eq('id', trimmed);
    } else {
      staffQuery = staffQuery.or(`name.ilike.%${trimmed}%,role.ilike.%${trimmed}%,phone.ilike.%${trimmed}%`);
    }
    const { data: staff } = await staffQuery.limit(5);
    if (staff) {
      staff.forEach((st) => {
        results.push({
          id: st.id,
          type: 'staff',
          title: st.name,
          subtitle: `Role: ${st.role} • Phone: ${st.phone || 'N/A'}`,
          badge: 'Staff',
          targetView: 'staff_access',
          rawRecord: st,
        });
      });
    }

    // 4. Search Bills / Invoices
    let billQuery = supabase.from('bills').select('id, invoice_number, total_minor, status, shop_id');
    if (isUuid) {
      billQuery = billQuery.eq('id', trimmed);
    } else {
      billQuery = billQuery.ilike('invoice_number', `%${trimmed}%`);
    }
    const { data: bills } = await billQuery.limit(5);
    if (bills) {
      bills.forEach((b) => {
        results.push({
          id: b.id,
          type: 'invoice',
          title: `Invoice ${b.invoice_number}`,
          subtitle: `Amount: ₹${(b.total_minor / 100).toFixed(2)} • Status: ${b.status}`,
          badge: 'Bill',
          targetView: 'reports_bi',
          rawRecord: b,
        });
      });
    }

    // 5. Search Account Deletions
    let delQuery = supabase.from('account_deletions').select('id, shop_name, phone, reason, status');
    if (isUuid) {
      delQuery = delQuery.eq('id', trimmed);
    } else {
      delQuery = delQuery.or(`shop_name.ilike.%${trimmed}%,phone.ilike.%${trimmed}%,reason.ilike.%${trimmed}%`);
    }
    const { data: dels } = await delQuery.limit(5);
    if (dels) {
      dels.forEach((d) => {
        results.push({
          id: d.id,
          type: 'deletion',
          title: `Deletion: ${d.shop_name || 'Salon'}`,
          subtitle: `Phone: ${d.phone || '—'} • Reason: ${d.reason || 'N/A'}`,
          badge: 'Deletion',
          targetView: 'account_deletions',
          rawRecord: d,
        });
      });
    }

    // 6. Search Support Messages
    let suppQuery = supabase.from('support_messages').select('id, message, contact_info, status');
    if (isUuid) {
      suppQuery = suppQuery.eq('id', trimmed);
    } else {
      suppQuery = suppQuery.or(`message.ilike.%${trimmed}%,contact_info.ilike.%${trimmed}%`);
    }
    const { data: msgs } = await suppQuery.limit(5);
    if (msgs) {
      msgs.forEach((m) => {
        results.push({
          id: m.id,
          type: 'support',
          title: `Support #${m.id.slice(0, 8)}`,
          subtitle: m.message.slice(0, 60),
          badge: 'Support',
          targetView: 'support_messages',
          rawRecord: m,
        });
      });
    }

  } catch (err) {
    console.error('Global search error:', err);
  }

  return results;
}
