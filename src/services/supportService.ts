import { supabase } from './supabase';
import { SupportMessage, SupportMessageAnswer } from '../types/database';

export async function fetchSupportMessages(): Promise<{ data: SupportMessage[]; error: string | null }> {
  try {
    let rawMessages: any[] | null = null;

    // 1. First attempt joined query with shops
    const { data: joinedData, error: joinedErr } = await supabase
      .from('support_messages')
      .select('*, shop:shops(id, name)')
      .order('created_at', { ascending: false });

    if (joinedErr) {
      console.warn('Joined support_messages query failed, trying flat select:', joinedErr);
      const { data: flatData, error: flatErr } = await supabase
        .from('support_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (flatErr) throw flatErr;
      rawMessages = flatData || [];

      // Manually match shops if possible
      const shopIds = Array.from(new Set(rawMessages.map((m: any) => m.shop_id).filter(Boolean)));
      if (shopIds.length > 0) {
        const { data: shopsData } = await supabase
          .from('shops')
          .select('id, name')
          .in('id', shopIds);

        const shopMap = new Map((shopsData || []).map((s: any) => [s.id, s]));
        rawMessages = rawMessages.map((m: any) => ({
          ...m,
          shop: m.shop_id ? shopMap.get(m.shop_id) || null : null,
          shop_name: m.shop_id ? shopMap.get(m.shop_id)?.name || '' : '',
        }));
      }
    } else {
      rawMessages = (joinedData || []).map((m: any) => ({
        ...m,
        shop_name: m.shop?.name || '',
      }));
    }

    if (!rawMessages) return { data: [], error: null };

    // 2. Fetch existing answers without breaking the messages if answers query errors
    const answersMap = new Map<string, SupportMessageAnswer[]>();
    try {
      const { data: answers, error: answersErr } = await supabase
        .from('support_message_answers')
        .select('*')
        .order('created_at', { ascending: true });

      if (!answersErr && answers) {
        answers.forEach((ans: SupportMessageAnswer) => {
          if (ans.message_id) {
            const list = answersMap.get(ans.message_id) || [];
            list.push(ans);
            answersMap.set(ans.message_id, list);
          }
        });
      }
    } catch (ansErr) {
      console.warn('Could not load support_message_answers:', ansErr);
    }

    const enriched: SupportMessage[] = rawMessages.map((m: any) => ({
      ...m,
      shop_name: m.shop_name || m.shop?.name || '',
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
