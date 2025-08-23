import { openRoomChannel } from './rtc-signal.js';
import { loadMessages, sendMessage, subscribeMessages } from './chat.js';
import * as rtc from './rtc.js';
import { renderMessageList, appendMessage } from './ui.js';

function renderPresence() {}
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
 renderMessageList(history);

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

function parseRoomId() {
  const match = location.hash.match(/^#\/room\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : '';
}

function renderJoinForm(app) {
  app.innerHTML = `
    <form id="joinForm" class="flex gap-2">
      <input id="roomInput" class="flex-1 border p-2" required />
      <button type="submit" class="px-4 py-2 bg-blue-600 text-white">Войти/Создать</button>
    </form>
  `;

  app.querySelector('#joinForm').addEventListener('submit', e => {
    e.preventDefault();
    const id = app.querySelector('#roomInput').value.trim();
    if (!id) return;
    currentRoomId = id;
    location.hash = `#/room/${encodeURIComponent(id)}`;
    enterRoom(id);
  });
}

let currentRoomId;
function handleHashChange() {
  const app = document.querySelector('#app');
  const roomId = parseRoomId();
  if (roomId) {
    if (roomId !== currentRoomId) {
      currentRoomId = roomId;
      app.innerHTML = '';
      enterRoom(roomId);
    }
  } else {
    currentRoomId = undefined;
    renderJoinForm(app);
  }
}

window.addEventListener('hashchange', handleHashChange);
handleHashChange();
