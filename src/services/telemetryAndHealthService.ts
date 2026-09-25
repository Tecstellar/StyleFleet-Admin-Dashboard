import { supabase } from './supabase';
import { TelemetryRecord, SystemHealthRecord, SystemLogRecord } from '../types/database';

export async function fetchTelemetryRecords(): Promise<{ data: TelemetryRecord[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('telemetry')
      .select('*, shop:shops(id, name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    console.error('Error fetching telemetry:', err);
    return { data: [], error: err.message || 'Unable to load telemetry' };
  }
}

export async function fetchSystemHealthRecords(): Promise<{ data: SystemHealthRecord[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('system_health')
      .select('*, shop:shops(id, name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    console.error('Error fetching system health:', err);
    return { data: [], error: err.message || 'Unable to load system health records' };
  }
}

export async function fetchSystemLogs(): Promise<{ data: SystemLogRecord[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('system_logs')
      .select('*, shop:shops(id, name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    console.error('Error fetching system logs:', err);
    return { data: [], error: err.message || 'Unable to load system logs' };
  }
}

export function subscribeToTelemetryAndHealth(onUpdate: () => void) {
  const channel = supabase
    .channel('telemetry_health_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'telemetry' }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'system_health' }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'system_logs' }, onUpdate)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
