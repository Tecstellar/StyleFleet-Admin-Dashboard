import { supabase } from './supabase';
import { SupportMessage, SupportMessageAnswer } from '../types/database';

export async function fetchSupportMessages(): Promise<{ data: SupportMessage[]; error: string | null }> {
  try {
    const { data: messages, error } = await supabase
      .from('support_messages')
      .select('*, shop:shops(id, name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!messages) return { data: [], error: null };

    // Fetch existing answers to associate with tickets
    const { data: answers } = await supabase
      .from('support_message_answers')
      .select('*')
      .order('created_at', { ascending: true });

    const answersMap = new Map<string, SupportMessageAnswer[]>();
    if (answers) {
      answers.forEach((ans: SupportMessageAnswer) => {
        if (ans.message_id) {
          const list = answersMap.get(ans.message_id) || [];
          list.push(ans);
          answersMap.set(ans.message_id, list);
        }
      });
    }

    const enriched = messages.map((m: any) => ({
      ...m,
      answers: answersMap.get(m.id) || [],
    }));

    return { data: enriched, error: null };
  } catch (err: any) {
    console.error('Error fetching support messages:', err);
    return { data: [], error: err.message || 'Unable to load support messages' };
  }
}

export async function fetchSupportMessageAnswers(messageId?: string, shopId?: string): Promise<{ data: SupportMessageAnswer[]; error: string | null }> {
  try {
    let query = supabase
      .from('support_message_answers')
      .select('*')
      .order('created_at', { ascending: true });

    if (messageId) {
      query = query.eq('message_id', messageId);
    } else if (shopId) {
      query = query.eq('shop_id', shopId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    console.error('Error fetching answers:', err);
    return { data: [], error: err.message || 'Unable to load answers' };
  }
}

export async function submitSupportMessageAnswer(params: {
  message_id: string;
  shop_id?: string | null;
  answer: string;
  admin_name?: string;
  newStatus?: 'open' | 'in_progress' | 'resolved' | 'closed';
}): Promise<{ data: SupportMessageAnswer | null; error: string | null; isRlsBlocked?: boolean }> {
  try {
    let targetShopId = params.shop_id;
    if (!targetShopId) {
      // Try to get shop_id from the parent support_message
      const { data: parentMsg } = await supabase
        .from('support_messages')
        .select('shop_id')
        .eq('id', params.message_id)
        .single();
      if (parentMsg?.shop_id) {
        targetShopId = parentMsg.shop_id;
      } else {
        // Fallback to primary registered shop
        const { data: primaryShop } = await supabase
          .from('shops')
          .select('id')
          .limit(1)
          .single();
        if (primaryShop?.id) targetShopId = primaryShop.id;
      }
    }

    const payload: any = {
      message_id: params.message_id,
      shop_id: targetShopId,
      answer: params.answer.trim(),
      admin_name: params.admin_name || 'StyleFleet Super Admin',
      is_read: false,
    };

    const { data, error } = await supabase
      .from('support_message_answers')
      .insert(payload)
      .select()
      .single();

    if (error) {
      const isRls = error.code === '42501' || error.message?.includes('violates row-level security');
      return { data: null, error: error.message, isRlsBlocked: isRls };
    }

    // Automatically update the ticket status if requested
    if (params.newStatus) {
      await updateSupportMessageStatus(params.message_id, params.newStatus);
    }

    return { data: data as SupportMessageAnswer, error: null };
  } catch (err: any) {
    console.error('Error submitting support answer:', err);
    const isRls = err.code === '42501' || err.message?.includes('violates row-level security');
    return { data: null, error: err.message || 'Failed to submit answer', isRlsBlocked: isRls };
  }
}

export async function updateSupportMessageStatus(
  id: string,
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('support_messages')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error updating support message status:', err);
    return { success: false, error: err.message || 'Failed to update message status' };
  }
}

export function subscribeToSupportMessages(onUpdate: () => void) {
  const channel = supabase
    .channel('support_messages_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'support_messages' },
      () => {
        onUpdate();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'support_message_answers' },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
