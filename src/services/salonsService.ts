import { supabase } from './supabase';
import { Shop, Staff, Customer, Service, ServiceCategory, Bill, Payment, ShopSettings, SupportMessage, AccountDeletion, StylistPermissions } from '../types/database';

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

/**
 * Normalizes phone number to 10 digits for accurate deduplication
 */
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '').slice(-10);
}

/**
 * Validates that a salon is genuine real production data, not random/synthetic dummy data
 */
function isRealSalon(shop: Shop): boolean {
  const nameLower = (shop.name || '').toLowerCase().trim();
  const addressLower = (shop.address || '').toLowerCase().trim();

  // Synthetic / dummy patterns injected during manual testing
  if (
    !shop.owner_profile_id &&
    (nameLower.includes('test salon') ||
      nameLower === 'test' ||
      nameLower === 'dummy' ||
      addressLower.includes('123 main st') ||
      addressLower.includes('123 main street'))
  ) {
    return false;
  }

  // Must have a valid name
  if (!shop.name || shop.name.trim().length === 0) {
    return false;
  }

  return true;
}

/**
 * Fetches all salons from Supabase with strict deduplication and real-data enforcement.
 * Ensures that if a salon was registered multiple times (e.g. rapid double submit or retry),
 * only the true active canonical salon is returned.
 */
export async function fetchShops(): Promise<{ data: Shop[]; error: string | null }> {
  try {
    const [shopsRes, staffRes, customersRes, billsRes] = await Promise.all([
      supabase.from('shops').select('*').order('created_at', { ascending: false }),
      supabase.from('staff').select('id, shop_id'),
      supabase.from('customers').select('id, shop_id'),
      supabase.from('bills').select('id, shop_id'),
    ]);

    if (shopsRes.error) throw shopsRes.error;
    const rawShops: Shop[] = shopsRes.data || [];

    // Map relational counts per shop ID
    const staffCountMap = new Map<string, number>();
    const custCountMap = new Map<string, number>();
    const billCountMap = new Map<string, number>();

    (staffRes.data || []).forEach((st) => staffCountMap.set(st.shop_id, (staffCountMap.get(st.shop_id) || 0) + 1));
    (customersRes.data || []).forEach((c) => custCountMap.set(c.shop_id, (custCountMap.get(c.shop_id) || 0) + 1));
    (billsRes.data || []).forEach((b) => billCountMap.set(b.shop_id, (billCountMap.get(b.shop_id) || 0) + 1));

    // 1. Filter out synthetic / dummy test salons
    const realShops = rawShops.filter(isRealSalon);

    // 2. Fetch owner profiles for legitimate owners
    const ownerIds = realShops.map((s) => s.owner_profile_id).filter(Boolean) as string[];
    const profilesMap = new Map();

    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', ownerIds);

      if (profiles) {
        profiles.forEach((p) => profilesMap.set(p.id, p));
      }
    }

    // 3. Group salons for deduplication
    // Duplicates can share:
    // a) owner_profile_id
    // b) normalized phone
    // c) identical salon name & city
    const groups = new Map<string, Shop[]>();

    realShops.forEach((shop) => {
      let key = '';
      const normPhone = normalizePhone(shop.phone);
      if (shop.owner_profile_id) {
        key = `owner:${shop.owner_profile_id}`;
      } else if (normPhone.length >= 10) {
        key = `phone:${normPhone}`;
      } else {
        key = `name:${(shop.name || '').toLowerCase().trim()}_${(shop.city || '').toLowerCase().trim()}`;
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(shop);
    });

    // 4. Select the canonical active shop for each group
    const deduplicatedShops: Shop[] = [];

    groups.forEach((shopGroup) => {
      // Sort group: highest activity (customers > bills > staff) first, then latest created
      shopGroup.sort((a, b) => {
        const aCust = custCountMap.get(a.id) || 0;
        const bCust = custCountMap.get(b.id) || 0;
        const aBills = billCountMap.get(a.id) || 0;
        const bBills = billCountMap.get(b.id) || 0;
        const aStaff = staffCountMap.get(a.id) || 0;
        const bStaff = staffCountMap.get(b.id) || 0;

        const aScore = aCust * 10 + aBills * 5 + aStaff * 2;
        const bScore = bCust * 10 + bBills * 5 + bStaff * 2;

        if (aScore !== bScore) {
          return bScore - aScore;
        }

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      const canonical = shopGroup[0];
      const duplicatesMerged = shopGroup.length - 1;

      deduplicatedShops.push({
        ...canonical,
        owner_profile: canonical.owner_profile_id ? profilesMap.get(canonical.owner_profile_id) || null : null,
        staff_count: staffCountMap.get(canonical.id) || 0,
        customer_count: custCountMap.get(canonical.id) || 0,
        bill_count: billCountMap.get(canonical.id) || 0,
        duplicate_count: duplicatesMerged,
      });
    });

    // Sort by created_at descending
    deduplicatedShops.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { data: deduplicatedShops, error: null };
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

/**
 * Company Admin Panel: Updates module permissions for a stylist directly in Supabase
 */
export async function updateStaffPermissions(
  staffId: string,
  permissions: StylistPermissions
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('staff')
      .update({
        permissions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', staffId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error updating staff permissions:', err);
    return { success: false, error: err.message || 'Failed to update stylist permissions' };
  }
}
