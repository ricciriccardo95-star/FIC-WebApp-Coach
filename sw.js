// --- FILE SERVICE WORKER (sw.js) ---
// Questo file gestisce la cache e l'aggiornamento della PWA.

// 1. Definiamo il nome e la versione della nostra cache.
// IMPORTANTE: Quando aggiorni l'app, devi cambiare questo nome (es. 'v2', 'v3').
const CACHE_NAME = 'fic-coach-cache-v1';

// 2. Elenco dei file fondamentali da salvare in cache.
const urlsToCache = [
  '/',
  'index.html',
  'manifest.json',
  'logo.png',
  'LOGO FIC APP (192).png',
  'LOGO FIC APP (512).png',
  'CALENDARIO/calendario.html',
  'CONVOCAZIONI/convocazioni.html',
  'DISPENDIO/dispendi.html',
  'RANKING/home_ranking.html',
  'RANKING/ranking_bike.html',
  'RANKING/ranking_boat.html',
  'RANKING/ranking_ergo.html'
  // Aggiungi qui altri file/immagini importanti se necessario
];

// 3. Evento 'install': si attiva quando il Service Worker viene installato.
// Apre la cache e aggiunge tutti i nostri file.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aperta');
        return cache.addAll(urlsToCache);
      })
  );
});

// 4. Evento 'fetch': si attiva ogni volta che l'app chiede un file (es. un'immagine, un .html).
// Questo codice controlla prima la cache. Se il file c'è, lo restituisce dalla cache (velocissimo, funziona offline).
// Se non c'è, lo chiede alla rete.
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
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Se la cache non è nella "lista bianca" (cioè è vecchia), la cancelliamo.
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
