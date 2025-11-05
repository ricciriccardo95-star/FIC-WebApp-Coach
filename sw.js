// --- FILE SERVICE WORKER (sw.js) ---
// Questo file gestisce la cache e l'aggiornamento della PWA.

// 1. Definiamo il nome e la versione della nostra cache.
// IMPORTANTE: Versione aggiornata a 'v4' per forzare l'aggiornamento
const CACHE_NAME = 'fic-coach-cache-v4';

// 2. Elenco dei file fondamentali da salvare in cache.
// CORREZIONE: Aggiornati percorsi immagini e aggiunte pagine login/home
const urlsToCache = [
  '/',
  'coach_login.html',
  'coach_home.html',
  'manifest.json',
  'logo.png',
  'images/COACH R4P (192).png',
  'images/COACH R4P (512).png',
  'CALENDARIO/calendario.html',
  'CONVOCAZIONI/convocazioni.html',
  'DISPENDIO/dispendi.html',
  'RANKING/home_ranking.html'
];

// 3. Evento 'install': si attiva quando il Service Worker viene installato.
// Apre la cache e aggiunge tutti i nostri file.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aperta');
        // Usiamo addAll. Se ANCHE SOLO UN file fallisce, l'installazione si blocca.
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Impossibile aggiungere i file alla cache:', err);
      })
  );
});

// 4. Evento 'fetch': si attiva ogni volta che l'app chiede un file.
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
// Questo è FONDAMENTALE per gli aggiornamenti.
// Cancella tutte le vecchie cache che non corrispondono al nuovo CACHE_NAME.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME]; // Mantiene solo la cache v4
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Se la cache non è nella "lista bianca" (cioè è vecchia, es. v1, v2, v3), la cancelliamo.
            console.log('Cancellazione vecchia cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});