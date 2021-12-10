const CACHE_NAME = 'static-cache-v1'
const DATA_CACHE_NAME = 'data-cache-v1'
const FILES_TO_CACHE = [
    '/',
    '/index.html',
    '/index.js',
    '/styles.css',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
]
// This will retreive static assets from the Cache Storage in the browser
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            return cache.addAll(FILES_TO_CACHE)
        })
    )
    self.skipWaiting()
})

self.addEventListener("activate", function(evt) {
    evt.waitUntil(
      caches.keys().then(keyList => {
        return Promise.all(
          keyList.map(key => {
            if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
              console.log("Removing old cache data", key);
              return caches.delete(key);
            }
          })
        );
      })
    );
  
    self.clients.claim();
  });

//This will listen for any fetch request made to the network
self.addEventListener("fetch", function(evt) {
    // cache successful requests to the API
    if (evt.request.url.includes("/api/transaction")) {
      evt.respondWith(
        caches.open(DATA_CACHE_NAME).then(cache => {
          return fetch(evt.request)
            .then(response => {
              // If the response was good, clone it and store it in the cache.
              if (response.status === 200) {
                cache.put(evt.request.url, response.clone());
              }
  
              return response;
            })
            .catch(err => {
              // Network request failed, try to get it from the cache.
              return cache.match(evt.request);
            });
        }).catch(err => console.log(err))
      );
  
      return;
    }
    // if the request is not for the API, serve static assets using "offline-first" approach.
    // see https://developers.google.com/web/fundamentals/instant-and-offline/offline-cookbook#cache-falling-back-to-network
    else {
      evt.respondWith(
        caches.match(evt.request).then(function(response) {
          return response || fetch(evt.request);
        })
      );

    }
  });
  
  