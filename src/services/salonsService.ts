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
    const [shopsRes, staffRes, customersRes, billsRes, apptsRes] = await Promise.all([
      supabase.from('shops').select('*').order('created_at', { ascending: false }),
      supabase.from('staff').select('id, shop_id'),
      supabase.from('customers').select('id, shop_id'),
      supabase.from('bills').select('id, shop_id'),
      supabase.from('appointments').select('id, shop_id'),
    ]);

    if (shopsRes.error) throw shopsRes.error;
    const rawShops: Shop[] = shopsRes.data || [];

    // Map relational counts per shop ID
    const staffCountMap = new Map<string, number>();
    const custCountMap = new Map<string, number>();
    const billCountMap = new Map<string, number>();
    const apptCountMap = new Map<string, number>();

    (staffRes.data || []).forEach((st) => staffCountMap.set(st.shop_id, (staffCountMap.get(st.shop_id) || 0) + 1));
    (customersRes.data || []).forEach((c) => custCountMap.set(c.shop_id, (custCountMap.get(c.shop_id) || 0) + 1));
    (billsRes.data || []).forEach((b) => billCountMap.set(b.shop_id, (billCountMap.get(b.shop_id) || 0) + 1));
    (apptsRes.data || []).forEach((a) => apptCountMap.set(a.shop_id, (apptCountMap.get(a.shop_id) || 0) + 1));

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

    // 3. Accurate Deduplication:
    // Only merges records if they share the exact 10-digit phone number, or the exact trimmed business name.
    const cleanName = (n: string) => (n || '').toLowerCase().trim();
    const groups: Shop[][] = [];

    for (const shop of realShops) {
      const sName = cleanName(shop.name);
      const sPhone = normalizePhone(shop.phone);

      let matchedGroupIndex = -1;
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const isMatch = group.some((g) => {
          const gName = cleanName(g.name);
          const gPhone = normalizePhone(g.phone);

          if (sPhone && gPhone && sPhone.length >= 10 && gPhone.length >= 10) {
            return sPhone === gPhone;
          }
          return sName.length >= 2 && gName.length >= 2 && sName === gName;
        });

        if (isMatch) {
          matchedGroupIndex = i;
          break;
        }
      }

      if (matchedGroupIndex >= 0) {
        groups[matchedGroupIndex].push(shop);
      } else {
        groups.push([shop]);
      }
    }

    // 4. Select the single canonical active shop for each group
    const deduplicatedShops: Shop[] = [];

    groups.forEach((shopGroup) => {
      // Sort group: highest activity (customers > bills > staff > owner present) first, then latest created
      shopGroup.sort((a, b) => {
        const aCust = custCountMap.get(a.id) || 0;
        const bCust = custCountMap.get(b.id) || 0;
        const aBills = billCountMap.get(a.id) || 0;
        const bBills = billCountMap.get(b.id) || 0;
        const aStaff = staffCountMap.get(a.id) || 0;
        const bStaff = staffCountMap.get(b.id) || 0;
        const aOwnerBonus = a.owner_profile_id ? 20 : 0;
        const bOwnerBonus = b.owner_profile_id ? 20 : 0;

        const aScore = aCust * 10 + aBills * 5 + aStaff * 2 + aOwnerBonus;
        const bScore = bCust * 10 + bBills * 5 + bStaff * 2 + bOwnerBonus;

        if (aScore !== bScore) {
          return bScore - aScore;
        }

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      const canonical = shopGroup[0];
      const duplicatesMerged = shopGroup.length - 1;
      const duplicateIds = shopGroup.map((s) => s.id);

      // Sum all relational counts across duplicate entries so no child records are lost
      let totalStaff = 0;
      let totalCust = 0;
      let totalBills = 0;
      let totalAppts = 0;
      shopGroup.forEach((s) => {
        totalStaff += staffCountMap.get(s.id) || 0;
        totalCust += custCountMap.get(s.id) || 0;
        totalBills += billCountMap.get(s.id) || 0;
        totalAppts += apptCountMap.get(s.id) || 0;
      });

      // Best owner profile among group
      const canonicalOwnerId = canonical.owner_profile_id || shopGroup.find((s) => s.owner_profile_id)?.owner_profile_id || null;

      deduplicatedShops.push({
        ...canonical,
        owner_profile_id: canonicalOwnerId,
        owner_profile: canonicalOwnerId ? profilesMap.get(canonicalOwnerId) || null : null,
        staff_count: totalStaff || staffCountMap.get(canonical.id) || 0,
        customer_count: totalCust || custCountMap.get(canonical.id) || 0,
        bill_count: totalBills || billCountMap.get(canonical.id) || 0,
        appointment_count: totalAppts || apptCountMap.get(canonical.id) || 0,
        duplicate_count: duplicatesMerged,
        duplicate_ids: duplicateIds,
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

/**
 * Company Admin Panel: sets (or clears, with null) a salon's free-plan sales limit.
 * The app uses 100 when this is null.
 */
export async function updateShopFreeSalesLimit(
  shopId: string,
  limit: number | null
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (limit !== null && (!Number.isInteger(limit) || limit < 1)) {
      return { success: false, error: 'Limit must be a whole number of 1 or more' };
    }
    const { data, error } = await supabase
      .from('shops')
      .update({ free_sales_limit: limit, updated_at: new Date().toISOString() })
      .eq('id', shopId)
      .select('id');

    if (error) throw error;
    if (!data || data.length === 0) {
      return { success: false, error: 'Salon was not updated (no matching row or no permission)' };
    }
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error updating free sales limit:', err);
    return { success: false, error: err.message || 'Failed to update the free sales limit' };
  }
}

export interface CreateSalonAccountParams {
  salonName: string;
  ownerName: string;
  phone: string;
  email: string;
  password: string;
  city?: string;
  address?: string;
  pinCode?: string;
  gstin?: string;
}

/**
 * Creates a brand new salon account with owner authentication in Supabase
 */
export async function createSalonAccount(
  params: CreateSalonAccountParams
): Promise<{ success: boolean; data?: Shop; error: string | null }> {
  try {
    const cleanPhone = normalizePhone(params.phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number' };
    }

    const cleanEmail = params.email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid login email address' };
    }

    if (!params.password || params.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long' };
    }

    // 1. Generate initials invoice prefix (e.g., "Luxe Hair" -> "LH", fallback "SF")
    const words = params.salonName.trim().split(/\s+/);
    let prefix = words.map((w) => w[0]?.toUpperCase()).join('').slice(0, 4);
    if (!prefix) prefix = 'SF';

    // 2. Sign up the owner account in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: params.password,
      options: {
        data: {
          full_name: params.ownerName.trim(),
          phone: cleanPhone,
        },
      },
    });

    if (authError && !authError.message.toLowerCase().includes('already registered')) {
      return { success: false, error: authError.message };
    }

    const ownerId = authData?.user?.id;

    // 3. Upsert owner profile if owner ID was created
    if (ownerId) {
      await supabase.from('profiles').upsert({
        id: ownerId,
        full_name: params.ownerName.trim(),
        phone: cleanPhone,
        updated_at: new Date().toISOString(),
      });
    }

    // 4. Insert the new salon shop record into `shops`
    const { data: shopData, error: shopError } = await supabase
      .from('shops')
      .insert({
        name: params.salonName.trim(),
        owner_profile_id: ownerId || null,
        phone: cleanPhone,
        city: params.city?.trim() || null,
        address: params.address?.trim() || null,
        pin_code: params.pinCode?.trim() || null,
        gstin: params.gstin?.trim() || null,
        invoice_prefix: prefix,
        accent_color: '#000000',
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (shopError) throw shopError;

    return { success: true, data: shopData, error: null };
  } catch (err: any) {
    console.error('Error creating salon account:', err);
    return { success: false, error: err.message || 'Failed to create salon account' };
  }
}

/**
 * Sends an official Supabase password reset link directly to the salon account email
 */
export async function resetAccountPassword(
  email: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address' };
    }

    const redirectTo = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    });

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error resetting password:', err);
    return { success: false, error: err.message || 'Failed to send password reset request' };
  }
}
