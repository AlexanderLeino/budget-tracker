console.log('Hello from service worker')

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
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(FILES_TO_CACHE)
        })
    )
    self.skipWaiting()
})

//This will listen for any fetch request made to the network
self.addEventListener('fetch', function(event){
    event.respondeWith(
        caches.match(event.request)
        .then(response => {
            return response || fetch(event.request)
        })
    )
})
