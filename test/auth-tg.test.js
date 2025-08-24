import test from 'node:test';
import assert from 'node:assert/strict';

function createLocalStorage() {
  return {
    store: {},
    getItem(k) { return this.store[k] ?? null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  };
}

test('restores and signs out in Node environment', async () => {
  globalThis.localStorage = createLocalStorage();
  localStorage.setItem('sb_tg_token', 'token123');
  const auth = await import('../js/auth-tg.js');
  assert.equal(auth.isAuthenticated(), true);
  auth.signOut();
  assert.equal(auth.isAuthenticated(), false);
});

test('init and login in browser-like environment', async () => {
  const elements = {};
  const container = { id: 'login-root', children: [], appendChild(el){ this.children.push(el); elements[el.id]=el; } };
  const body = { appendChild(el){ this.children.push(el); elements[el.id]=el; }, children:[] };
  const document = {
    body,
    getElementById(id){ return elements[id]; },
    createElement(tag){ return { tagName: tag.toUpperCase(), style:{}, setAttribute(k,v){ this[k]=v; }, appendChild(child){ (this.children||(this.children=[])).push(child); elements[child.id]=child; } }; }
  };
  elements['login-root'] = container;
  globalThis.document = document;
  globalThis.window = { document };
  globalThis.localStorage = createLocalStorage();
  window.localStorage = localStorage;
  globalThis.fetch = async () => ({
    ok: true,
    headers: { get: () => 'application/json' },
    text: async () => JSON.stringify({ access_token: 'abc', profile: {} })
  });

  const auth = await import('../js/auth-tg.js');
  auth.initTelegramAuthUI({ botUsername: 'bot', functionUrl: '/func', containerId: 'login-root' });
  assert.ok(container.children.find(c => c.id === 'tg-login-wrap'));
  await window.onTelegramAuth({ id: 1 });
  assert.equal(auth.isAuthenticated(), true);
});
