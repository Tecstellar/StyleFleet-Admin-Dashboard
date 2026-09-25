import { supabase } from './supabase';
import { Appointment } from '../types/database';

export async function fetchAppointments(): Promise<{ data: Appointment[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, shop:shops(id, name), customer:customers(id, name, phone), staff:staff(id, name), service:services(id, name, price_minor)')
      .order('starts_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    console.error('Error fetching appointments:', err);
    return { data: [], error: err.message || 'Unable to load appointments' };
  }
}
