import { supabase } from './supabase';
import { Profile, Staff, Customer } from '../types/database';

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
      .select('*, shop:shops(id, name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    console.error('Error fetching staff:', err);
    return { data: [], error: err.message || 'Unable to load staff data' };
  }
}

export async function fetchCustomers(): Promise<{ data: Customer[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*, shop:shops(id, name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    console.error('Error fetching customers:', err);
    return { data: [], error: err.message || 'Unable to load customer records' };
  }
}
