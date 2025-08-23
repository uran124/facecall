import { sb } from './supabase.js';

export async function sendMessage(roomId, content, author = 'guest') {
  const { data, error } = await sb
    .from('messages')
    .insert([{ room_id: roomId, content, author }])
    .select()
    .single();
  if (error) throw error;
  return data; // {id, room_id, content, author, created_at}
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
