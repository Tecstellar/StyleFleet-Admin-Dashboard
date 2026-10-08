import { supabase } from './supabase';
import { Bill, Payment, Expense } from '../types/database';

export async function fetchBills(): Promise<{ data: Bill[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('bills')
      .select('*, shop:shops(id, name), customer:customers(id, name, phone)')
      .not('shop_id', 'is', null)
      .order('issued_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    console.error('Error fetching bills:', err);
    return { data: [], error: err.message || 'Unable to load bills' };
  }
}

export async function fetchPayments(): Promise<{ data: Payment[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*, shop:shops(id, name), bill:bills(id, invoice_number, total_minor, status)')
      .not('shop_id', 'is', null)
      .order('paid_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    console.error('Error fetching payments:', err);
    return { data: [], error: err.message || 'Unable to load payment records' };
  }
}

export async function fetchExpenses(): Promise<{ data: Expense[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, category:expense_categories(id, name)')
      .order('expense_date', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    console.error('Error fetching expenses:', err);
    return { data: [], error: err.message || 'Unable to load expenses' };
  }
}

export async function fetchSubscriptions(): Promise<{ data: any[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, shop:shops(id, name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    console.error('Error fetching subscriptions:', err);
    return { data: [], error: err.message || 'Unable to load subscriptions' };
  }
}

