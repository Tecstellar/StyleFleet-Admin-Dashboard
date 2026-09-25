import { supabase } from './supabase';
import { Shop, Staff, Customer, Service, ServiceCategory, Bill, Payment, ShopSettings, SupportMessage, AccountDeletion } from '../types/database';

export interface SalonWithRelations extends Shop {
  staffCount?: number;
  customerCount?: number;
  serviceCount?: number;
  billCount?: number;
}

export interface SalonDetailedView {
  shop: Shop;
  staff: Staff[];
  customers: Customer[];
  services: Service[];
  categories: ServiceCategory[];
  bills: Bill[];
  payments: Payment[];
  settings: ShopSettings | null;
  supportMessages: SupportMessage[];
  deletions: AccountDeletion[];
}

export async function fetchShops(): Promise<{ data: Shop[]; error: string | null }> {
  try {
    const { data: shops, error: shopsErr } = await supabase
      .from('shops')
      .select('*')
      .order('created_at', { ascending: false });

    if (shopsErr) throw shopsErr;
    if (!shops) return { data: [], error: null };

    // Fetch owner profiles for shops that have owner_profile_id
    const ownerIds = shops.map((s) => s.owner_profile_id).filter(Boolean) as string[];
    let profilesMap = new Map();

    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', ownerIds);

      if (profiles) {
        profiles.forEach((p) => profilesMap.set(p.id, p));
      }
    }

    const enriched = shops.map((s) => ({
      ...s,
      owner_profile: s.owner_profile_id ? profilesMap.get(s.owner_profile_id) || null : null,
    }));

    return { data: enriched, error: null };
  } catch (err: any) {
    console.error('Error fetching shops:', err);
    return { data: [], error: err.message || 'Unable to load salon data' };
  }
}

export async function fetchSalonDetails(shopId: string): Promise<{ data: SalonDetailedView | null; error: string | null }> {
  try {
    const [
      shopRes,
      staffRes,
      customersRes,
      servicesRes,
      categoriesRes,
      billsRes,
      paymentsRes,
      settingsRes,
      supportRes,
      deletionsRes,
    ] = await Promise.all([
      supabase.from('shops').select('*').eq('id', shopId).single(),
      supabase.from('staff').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }),
      supabase.from('customers').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }),
      supabase.from('services').select('*').eq('shop_id', shopId),
      supabase.from('service_categories').select('*').eq('shop_id', shopId),
      supabase.from('bills').select('*').eq('shop_id', shopId).order('issued_at', { ascending: false }),
      supabase.from('payments').select('*').eq('shop_id', shopId).order('paid_at', { ascending: false }),
      supabase.from('shop_settings').select('*').eq('shop_id', shopId).maybeSingle(),
      supabase.from('support_messages').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }),
      supabase.from('account_deletions').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }),
    ]);

    if (shopRes.error) throw shopRes.error;

    // Fetch owner profile if exists
    let ownerProfile = null;
    if (shopRes.data?.owner_profile_id) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', shopRes.data.owner_profile_id)
        .maybeSingle();
      ownerProfile = prof;
    }

    const shopWithProfile: Shop = {
      ...shopRes.data,
      owner_profile: ownerProfile,
    };

    return {
      data: {
        shop: shopWithProfile,
        staff: staffRes.data || [],
        customers: customersRes.data || [],
        services: servicesRes.data || [],
        categories: categoriesRes.data || [],
        bills: billsRes.data || [],
        payments: paymentsRes.data || [],
        settings: settingsRes.data || null,
        supportMessages: supportRes.data || [],
        deletions: deletionsRes.data || [],
      },
      error: null,
    };
  } catch (err: any) {
    console.error('Error fetching salon details:', err);
    return { data: null, error: err.message || 'Unable to load salon details' };
  }
}
