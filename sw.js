/* Трекер привычек — Service Worker */
const CACHE = 'tracker-v3';
const SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL).catch(() => null))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(cached => {
      const fetching = fetch(req).then(res => {
        if(res && res.status === 200 && res.type === 'basic'){
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || fetching;
    })
  );
});

/* Сообщения от страницы: показать уведомление */
self.addEventListener('message', event => {
  const data = event.data || {};
  if(data.type === 'show-notification'){
    self.registration.showNotification(data.title || 'Трекер', {
      body: data.body || '',
      icon: data.icon,
      badge: data.badge,
      tag: data.tag || 'reminder',
      data: { url: data.url || './' }
    });
  }
});

/* Клик по уведомлению — фокус или открытие */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for(const c of list){
        if('focus' in c) return c.focus();
      }
      if(self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

/* Push от сервера (задел на будущее, если добавите backend) */
self.addEventListener('push', event => {
  let payload = { title: 'Трекер', body: 'Не забудьте отметить привычки' };
  try { if(event.data) payload = Object.assign(payload, event.data.json()); } catch(_) {}
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag || 'push',
      data: { url: payload.url || './' }
    })
  );
});