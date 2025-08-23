import { sb } from './supabase.js';

export function openRoomChannel(roomId, { onSignal, onPresence }) {
  // Можно держать 1 канал на комнату и для сигналинга, и для postgres_changes (чата)
  const channel = sb.channel(`room:${roomId}`, {
    config: { presence: { key: crypto.randomUUID() } } // уникальный ключ участника
  });

  // PRESENCE: кто в комнате
  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState(); // { <presence_key>: [{...}, ...], ... }
    onPresence?.(state);
  });

  // BROADCAST: сигналинг для SDP/ICE
  channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
    // payload = { type: 'offer'|'answer'|'ice', data: any, from?: string }
    onSignal?.(payload);
  });

  // Подписка
  channel.subscribe(async status => {
    if (status === 'SUBSCRIBED') {
      // объявиться в presence
      await channel.track({ at: Date.now() });
    }
  });

  // Ф-я отправки сигналов
  function sendSignal(payload) {
    // НИЧЕГО не пишем в БД — чисто эфемерные сообщения
    channel.send({ type: 'broadcast', event: 'signal', payload });
  }

  // Закрытие канала
  function close() {
    sb.removeChannel(channel);
  }

  return { channel, sendSignal, close };
}
