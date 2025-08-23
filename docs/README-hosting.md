## Цели

Быстро развернуть SPA на shared‑хостинге (Apache, `/public_html`) и подключить Supabase. Без сборки, Tailwind через CDN.

## Предварительно

* Домен с **HTTPS** (обязательно для камер/микрофона)
* Файлы из `/public_html` залить в корень хостинга (`/public_html`)
* Заполнить `/config/config.js`
* В Supabase выполнить `docs/schema.sql`

## Настройка Apache (.htaccess)

Файл `/public_html/.htaccess`:

```apache
RewriteEngine On

# Кэшируем статику надолго (immutable)
<FilesMatch "\.(js|css|png|jpg|jpeg|svg|webp|ico|woff2)$">
  Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>

# SW и манифест не кешируем агрессивно
<FilesMatch "(service-worker\.js|manifest\.webmanifest)$">
  Header set Cache-Control "no-cache"
</FilesMatch>

# Если используете history‑роутинг — раскомментируйте fallback
# RewriteCond %{REQUEST_FILENAME} !-f
# RewriteCond %{REQUEST_FILENAME} !-d
# RewriteRule . /index.html [L]
```

> По умолчанию проект использует **hash‑роутинг** (`/#/room/...`), так что fallback не обязателен.

## Service Worker

* Версионируйте кэш: `const CACHE = 'app-v1'` → меняйте при релизах
* Не кэшируйте WebSocket/Realtime запросы
* Для обновления приложения используйте сообщение `SKIP_WAITING` → `self.skipWaiting()`

## Supabase чеклист

* [x] Проект создан; получены `SUPABASE_URL`, `anon` key
* [x] Выполнен `docs/schema.sql` (таблицы, RLS, политики, триггер)
* [x] Таблица `messages` **добавлена** в публикацию `supabase_realtime`
* [x] В клиенте используются:

  * Канал `room:<id>` c **presence** и **broadcast('signal')**
  * Подписка `postgres_changes` на INSERT `messages` c `filter: room_id=eq.<id>`

## Проверка продакшн‑сборки

1. Откройте `/` на домене по HTTPS
2. PWA: приложение устанавливается? (Chrome → Install)
3. Чат: отправка/получение работает между двумя вкладками
4. Звонок: медиадоступ запрашивается, каналы сигналинга работают, peer соединяется
5. SW: после деплоя появляется баннер «Обновить» (при изменении версии)

## Типичные проблемы

* **`getUserMedia` не работает** → проверьте HTTPS и разрешения браузера
* **Нет новых сообщений в UI** → `messages` не в публикации `supabase_realtime`
* **WebRTC зависает на Connecting** → попробуйте `relay` и рабочий TURN
* **CORS/Content Security Policy** → проверьте, что домен Supabase разрешён, а скрипты CDN подключаются

## Обновления без простоя

* Заливать новую версию **поверх** (immutable‑ассеты с хешами — опционально)
* Увеличивать версию в `APP_VERSION` и/или имени кэша в SW
* Сообщать SW `SKIP_WAITING` → перезагрузка клиентов по согласию

---

