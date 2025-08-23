import { openRoomChannel } from './rtc-signal.js';
import { loadMessages, sendMessage, subscribeMessages } from './chat.js';
import * as rtc from './rtc.js';
import { renderMessageList, appendMessage, renderPresence } from './ui.js';

function toast(msg) { console.error(msg); }

function renderChatUI() {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div id="messages" class="message-list"></div>
    <form id="messageForm" class="layout-stack p-4">
      <input id="message" class="input mb-2" type="text" autocomplete="off" />
      <button id="sendBtn" type="button" class="btn">Send</button>
    </form>
  `;
}

function renderJoinForm() {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <form id="roomForm" class="layout-stack p-4">
      <input id="roomId" class="input mb-2" type="text" autocomplete="off" />
      <button type="submit" class="btn">Войти/Создать</button>
    </form>
  `;
  const form = document.getElementById('roomForm');
  const input = document.getElementById('roomId');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    const id = input.value.trim();
    if (!id) return;
    location.hash = `/room/${id}`;
    enterRoom(id);
  });
}

export async function enterRoom(roomId) {
  renderChatUI();
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

function getRoomIdFromHash() {
  const match = location.hash.match(/^#\/room\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : '';
}

function handleHashChange() {
  const roomId = getRoomIdFromHash();
  if (roomId) {
    enterRoom(roomId);
  } else {
    renderJoinForm();
  }
}

window.addEventListener('hashchange', handleHashChange);
handleHashChange();
