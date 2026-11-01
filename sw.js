/* Service worker : met l'application en cache pour un fonctionnement hors ligne.
   Aucune donnée client/prix ne transite ici (elles restent dans le localStorage de l'appareil). */
const CACHE = 'propositions-pa-v4';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'pdf.js', 'demo.js', 'manifest.webmanifest',
  'vendor/jspdf.umd.min.js', 'vendor/jspdf.plugin.autotable.min.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Cache d'abord (démarrage instantané même sans réseau), mise à jour en arrière-plan pour le lancement suivant
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const cached = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; });
    if (cached) { e.waitUntil(net.catch(() => {})); return cached; }
    return net.catch(() => c.match('index.html'));
  }));
});
