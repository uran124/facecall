# Facecall

Мини‑веб‑мессенджер с чатами и 1:1 аудио/видео‑звонками прямо в браузере. PWA, Supabase (DB + Realtime), WebRTC, деплой на shared‑хостинг в `/public_html`. Минимально зависимостей: Tailwind CDN, Supabase JS.

## Возможности

* Текстовый чат (история до 100 последних сообщений на комнату)
* 1:1 аудио/видео‑звонки на WebRTC
* Канал комнаты: Realtime **Broadcast** для сигналинга (SDP/ICE) + **Presence**
* Чат: хранение в Postgres (`messages`) + подписка через **postgres_changes** (INSERT)
* PWA: манифест, service worker, оффлайн‑кэш статики

## Структура проекта

```
/public_html
├── index.html             # SPA входная точка
├── manifest.webmanifest   # PWA-манифест
├── service-worker.js      # оффлайн-кэш статики
├── .htaccess              # Cache-Control + SPA fallback (опц.)
├── /assets                # иконки, изображения
├── /css/globals.css       # свои стили поверх Tailwind
├── /config/config.js      # ключи Supabase, ICE-сервера, лимиты
└── /js                    # модули: app, rtc, chat, supabase, ui, features/*
```

## Быстрый старт

1. Клонировать проект.
2. Скопировать файл конфигурации:

   ```bash
   cp /config/config.example.js /config/config.js
   ```
3. В `config.js` вставить свои данные:

   ```js
   export const SUPABASE_URL = 'https://YOUR.supabase.co';
   export const SUPABASE_ANON_KEY = 'public-anon-key';
   export const ICE_SERVERS = [
     { urls: ['stun:stun.l.google.com:19302'] }
   ];
   export const ROOM_MESSAGE_LIMIT = 100;
   export const APP_VERSION = '0.1.0';
   ```
4. В Supabase выполнить SQL‑скрипт `docs/schema.sql`.
5. Проверить, что таблица `messages` добавлена в публикацию `supabase_realtime`.
6. Запустить локально: `http-server` в папке `/public_html` или открыть `index.html` в браузере (работает через `http://localhost`).

   * Для доступа к камере/микрофону требуется HTTPS (или `http://localhost`).

## Подключения в index.html

```html
<script src="https://cdn.tailwindcss.com"></script>
<script defer src="https://unpkg.com/@supabase/supabase-js@2"></script>
```

## Основные модули

* `js/app.js` — инициализация, hash‑роутинг `#/room/:id`, регистрация SW
* `js/supabase.js` — Supabase клиент, хелперы select/insert/subscribe
* `js/rtc.js` — RTCPeerConnection: медиа, ICE‑рестарт, mute, audio‑only
* `js/rtc-signal.js` — `openRoomChannel(roomId)` с broadcast/presence
* `js/chat.js` — загрузка истории, отправка, подписка на INSERT
* `js/ui.js` — рендер сообщений, тосты, статусы звонка
* `js/pwa.js` — SW, обновления, web‑push (позже)

## Безопасность

* RLS включён; клиенту разрешены только SELECT/INSERT.
* SDP/ICE не сохраняются в БД.
* Минимум логов.

## Roadmap

* Auth (email/OTP), приватные комнаты
* Свой TURN (coturn)
* Web Push уведомления
* Профили и аватары
* Групповые звонки (SFU)

