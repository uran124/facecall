function createMessageElement(msg) {
  const el = document.createElement('div');
  el.className = 'message' + (msg.author === 'me' ? ' me' : '');
  el.textContent = msg.content ?? '';
  return el;
}

function scrollToBottom(container) {
  container.scrollTop = container.scrollHeight;
}

export function renderMessageList(messages) {
  const container = document.getElementById('messages');
  if (!container) return;
  container.innerHTML = '';
  const fragment = document.createDocumentFragment();
  for (const msg of messages) {
    fragment.appendChild(createMessageElement(msg));
  }
  container.appendChild(fragment);
  scrollToBottom(container);
}

export function appendMessage(msg) {
  const container = document.getElementById('messages');
  if (!container) return;
  container.appendChild(createMessageElement(msg));
  scrollToBottom(container);
}

export function renderPresence(state) {
  const keys = Object.keys(state || {});
  if (!keys.length) return '<p>Нет участников</p>';
  const items = keys.map((_, idx) => `<li>Участник ${idx + 1}</li>`).join('');
  return `<ul>${items}</ul>`;
}

