// --- FILE SERVICE WORKER (sw.js) ---
// Questo file gestisce la cache e l'aggiornamento della PWA.

// MODIFICA CHIAVE: Versione v1.7
// Nuova strategia: "Network falling back to Cache"
// Aggiunto self.skipWaiting() e self.clients.claim() per aggiornamenti più rapidi.
const CACHE_NAME = 'fic-coach-cache-v1.8';

// 2. Elenco dei file fondamentali da salvare in cache.
const urlsToCache = [
  '/',
  'index.html', 
  'coach_home.html',
  'manifest.json',
  'images/logo.png',
  'images/COACH R4P (192).png',
  'images/COACH R4P (512).png',
  'CALENDARIO/calendario.html',
  'CONVOCAZIONI/convocazioni.html',
  'DISPENDIO/dispendi.html',
  'RANKING/home_ranking.html',
  'GYM/gym_coach.html'
];

// 3. Evento 'install': si attiva quando il Service Worker viene installato.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache v1.7 aperta, installazione...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Forza il nuovo Service Worker ad attivarsi subito
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('Impossibile aggiungere i file alla cache v1.7:', err);
      })
  );
});

// 4. Evento 'activate': si attiva quando il nuovo Service Worker prende il controllo.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME]; // Mantiene solo la cache v1.7
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Se la cache non è nella "lista bianca" (cioè è vecchia, es. v1.6), la cancelliamo.
            console.log('Cancellazione vecchia cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Prende il controllo immediato di tutte le pagine aperte
      return self.clients.claim();
    })
  );
});

// 5. Evento 'fetch': si attiva ogni volta che l'app chiede un file.
// NUOVA STRATEGIA: Network falling back to Cache
self.addEventListener('fetch', event => {
  event.respondWith(
    // 1. Prova prima la Rete
    fetch(event.request)
      .then(networkResponse => {
        // 2. Rete OK: Aggiorna la cache e restituisci la risposta fresca
        return caches.open(CACHE_NAME).then(cache => {
          // Non memorizziamo richieste non-GET (es. POST a Firebase)
          if (event.request.method === 'GET') {
             cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      })
      .catch(() => {
        // 3. Rete Fallita: Prova a prendere la versione in Cache
        return caches.match(event.request).then(cachedResponse => {
          return cachedResponse; // Restituisce il file in cache (o undefined se non c'è)
        });
      })
  );
});
