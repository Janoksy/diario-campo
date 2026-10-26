/* Diario de Campo · funciona sin señal */
const CACHE='diario-campo-v1';
const BASE=['./','index.html','manifest.webmanifest','jszip.min.js','iconos/icono-192.png','iconos/icono-512.png','iconos/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(BASE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET')return;
  const url=new URL(req.url);
  const fuente=/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if(url.origin!==location.origin&&!fuente)return;
  // primero la red (para recibir actualizaciones), si no hay señal usa la copia guardada
  e.respondWith(fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque')){const c=r.clone();caches.open(CACHE).then(k=>k.put(req,c));}return r;})
    .catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||(req.mode==='navigate'?caches.match('index.html'):undefined))));
});
