const CACHE='zain-photo-ai-v2.3-flow-upload-fix';
const LOCAL=['./','./index.html','./styles.css','./optimizer.js','./ai-local.js','./app.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(LOCAL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{if(new URL(e.request.url).origin===location.origin){const cp=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,cp))}return resp}).catch(()=>r)))})
