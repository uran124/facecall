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
