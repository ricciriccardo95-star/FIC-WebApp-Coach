// --- FILE SERVICE WORKER (sw.js) ---
// Questo file gestisce la cache e l'aggiornamento della PWA.

// MODIFICA CHIAVE: Versione Incrementata per forzare l'aggiornamento
const CACHE_NAME = 'fic-coach-cache-v1.15'; 

// 2. Elenco dei file fondamentali da salvare in cache.
const urlsToCache = [
  '/',
  'index.html', 
  'coach_home.html',
  'EFFICIENZA/efficienza_coach.html', // <--- PERCORSO AGGIORNATO CON LA CARTELLA
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
  // Forza l'attivazione immediata del nuovo SW senza aspettare la chiusura dei tab
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aperta, installazione file...');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Errore durante il caching dei file:', err);
      })
  );
});

// 4. Evento 'activate': Pulizia delle vecchie cache.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Se il nome della cache è diverso da quello attuale (es. v1.14), cancellalo.
          if (cacheName !== CACHE_NAME) {
            console.log('Cancellazione vecchia cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Prende il controllo immediato della pagina
      return self.clients.claim();
    })
  );
});

// 5. Evento 'fetch': Strategia Network falling back to Cache
self.addEventListener('fetch', event => {
  // Ignora richieste non GET (es. POST a Firebase) o estensioni browser
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Se la rete risponde, aggiorniamo la cache con la versione fresca
        // Clona la risposta perché il body può essere letto una sola volta
        const responseClone = networkResponse.clone();
        
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        
        return networkResponse;
      })
      .catch(() => {
        // Se la rete fallisce (offline), serviamo il file dalla cache
        return caches.match(event.request);
      })
  );
});
