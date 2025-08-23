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


export async function loadMessages(roomId, limit = 100) {
  const { data, error } = await sb
    .from('messages')
    .select('id, room_id, author, content, created_at')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).reverse();
}


export function subscribeMessages(roomId, onInsert, channel) {
  // Если канал не передали — создадим свой (но лучше передавать общий канал комнаты)
  const chan = channel ?? sb.channel(`msgs:${roomId}`);

  chan.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
    payload => {
      // payload.new = { id, room_id, author, content, created_at }
      onInsert?.(payload.new);
    }
  );

  // Если канал свой — подпишем и вернём функцию отписки
  if (!channel) {
    chan.subscribe();
    return () => sb.removeChannel(chan);
  }

  // Если используем общий канал — возвращаем "пустую" отписку (закроете общий канал снаружи)
  return () => {};