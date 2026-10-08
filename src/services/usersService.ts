import { supabase } from './supabase';
import { Profile, Staff, Customer, StylistPermissions, DEFAULT_STYLIST_PERMISSIONS } from '../types/database';

export async function fetchProfiles(): Promise<{ data: Profile[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    console.error('Error fetching profiles:', err);
    return { data: [], error: err.message || 'Unable to load profiles' };
  }
}

export async function fetchStaff(): Promise<{ data: Staff[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('*, shop:shops(id, name, city, phone)')
      .not('shop_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    console.error('Error fetching staff:', err);
    return { data: [], error: err.message || 'Unable to load staff data' };
  }
}

export async function createStaff(params: {
  shop_id: string;
  name: string;
  phone?: string | null;
  role?: string;
  is_active?: boolean;
  permissions?: StylistPermissions;
  invitation_status?: string;
  invited_at?: string | null;
}): Promise<{ data: Staff | null; error: string | null }> {
  try {
    const phoneClean = params.phone ? params.phone.replace(/[^0-9]/g, '').slice(-10) : null;
    const { data, error } = await supabase
      .from('staff')
      .insert({
        shop_id: params.shop_id,
        name: params.name.trim(),
        phone: phoneClean,
        role: params.role || 'Stylist',
        is_active: params.is_active !== undefined ? params.is_active : true,
        permissions: params.permissions || DEFAULT_STYLIST_PERMISSIONS,
        invitation_status: params.invitation_status || 'not_invited',
        invited_at: params.invited_at || null,
      })
      .select('*, shop:shops(id, name, city, phone)')
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    console.error('Error creating staff member:', err);
    return { data: null, error: err.message || 'Failed to create staff member' };
  }
}

export async function updateStaff(
  id: string,
  updates: Partial<Staff>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const payload: any = { ...updates, updated_at: new Date().toISOString() };
    delete payload.shop;
    if (payload.phone) {
      payload.phone = payload.phone.replace(/[^0-9]/g, '').slice(-10);
    }
    const { error } = await supabase
      .from('staff')
      .update(payload)
      .eq('id', id);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error updating staff member:', err);
    return { success: false, error: err.message || 'Failed to update staff member' };
  }
}

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
    console.error('Error updating stylist permissions:', err);
    return { success: false, error: err.message || 'Failed to update stylist permissions' };
  }
}

export async function updateStaffInvitationStatus(
  staffId: string,
  status: 'not_invited' | 'invited' | 'active',
  invitedAt?: string | null
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('staff')
      .update({
        invitation_status: status,
        invited_at: invitedAt !== undefined ? invitedAt : (status === 'invited' ? new Date().toISOString() : null),
        updated_at: new Date().toISOString(),
      })
      .eq('id', staffId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error updating staff invitation status:', err);
    return { success: false, error: err.message || 'Failed to update invitation status' };
  }
}

export async function deleteStaff(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error deleting staff member:', err);
    return { success: false, error: err.message || 'Failed to delete staff member' };
  }
}

export async function fetchCustomers(): Promise<{ data: Customer[]; error: string | null }> {
  try {
    let allCustomers: Customer[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('customers')
        .select('*, shop:shops(id, name)')
        .not('shop_id', 'is', null)
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) throw error;
      if (data && data.length > 0) {
        allCustomers = allCustomers.concat(data);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          from += pageSize;
        }
      } else {
        hasMore = false;
      }
    }

    return { data: allCustomers, error: null };
  } catch (err: any) {
    console.error('Error fetching customers:', err);
    return { data: [], error: err.message || 'Unable to load customer records' };
  }
}

