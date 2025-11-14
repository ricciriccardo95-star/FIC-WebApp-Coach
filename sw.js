// --- FILE SERVICE WORKER (sw.js) ---
// Questo file gestisce la cache e l'aggiornamento della PWA.

// MODIFICA CHIAVE: Ho cambiato la versione da v5 a v6.
// Questo forzerà il browser a eliminare la vecchia cache (che contiene
// il file coach_home.html rotto) e a installare questa nuova versione.
const CACHE_NAME = 'fic-coach-cache-v1.6';

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
        console.log('Cache v6 aperta');
        // Usiamo addAll. Se ANCHE SOLO UN file fallisce, l'installazione si blocca.
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Impossibile aggiungere i file alla cache v6:', err);
      })
  );
});

// 4. Evento 'fetch': si attiva ogni volta che l'app chiede un file.
// (Strategia Cache-First, va bene per ora)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se troviamo una corrispondenza in cache, la restituiamo
        if (response) {
          return response;
        }
        // Altrimenti, facciamo la richiesta alla rete
        return fetch(event.request);
      }
    )
  );
});

// 5. Evento 'activate': si attiva quando il nuovo Service Worker prende il controllo.
// Cancella tutte le vecchie cache (come 'fic-coach-cache-v5').
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME]; // Mantiene solo la cache v6
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Se la cache non è nella "lista bianca" (cioè è vecchia, es. v5), la cancelliamo.
            console.log('Cancellazione vecchia cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
