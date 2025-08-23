import { sb } from './supabase.js';

export async function loadMessages(roomId, limit = 50) {
  const { data, error } = await sb
    .from('messages')
    .select()
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(roomId, content, author = 'guest') {
  const { data, error } = await sb
    .from('messages')
    .insert([{ room_id: roomId, content, author }])
    .select()
    .single();
  if (error) throw error;
  return data; // {id, room_id, content, author, created_at}
}

export function subscribeMessages(roomId, callback, channel) {
  const ch = channel ?? sb.channel(`messages:${roomId}`);
  ch.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `room_id=eq.${roomId}`
    },
    payload => callback(payload.new)
  );
  if (!channel) ch.subscribe();
  return ch;
}
