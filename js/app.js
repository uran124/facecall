import { openRoomChannel } from './rtc-signal.js';
import { loadMessages, sendMessage, subscribeMessages } from './chat.js';
import { renderPresence } from './ui.js';
import * as rtc from './rtc.js';

function renderMessages() {}
function appendMessage() {}
function toast(msg) { console.error(msg); }

export async function enterRoom(roomId) {
  const participantsEl = document.querySelector('#participants');
  const { channel, sendSignal, close } = openRoomChannel(roomId, {
    onSignal: msg => rtc.onSignal?.(msg, sendSignal),
    onPresence: state => {
      if (participantsEl) participantsEl.innerHTML = renderPresence(state);
    }
  });

  const history = await loadMessages(roomId, 100);
  renderMessages(history);

  subscribeMessages(roomId, msg => appendMessage(msg), channel);

  rtc.bindSignaling?.(sendSignal);
  await rtc.start?.(roomId);

  const input = document.querySelector('#message');
  document.querySelector('#sendBtn').onclick = async () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    try {
      await sendMessage(roomId, text, 'guest');
    } catch (e) {
      toast('Не удалось отправить сообщение');
      console.error(e);
    }
  };

  window.addEventListener('beforeunload', close);
}

enterRoom('test');
