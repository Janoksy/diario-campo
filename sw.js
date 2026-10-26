/* Diario de Campo · funciona sin señal */
const CACHE='diario-campo-v2';
const BASE=['./','index.html','manifest.webmanifest','jszip.min.js','transcriptor.js','iconos/icono-192.png','iconos/icono-512.png','iconos/apple-touch-icon.png'];
// En Chrome/Android se activa el modo aislado para que la transcripción use varios núcleos (más rápida)
const AISLAR=/Chrome\/\d+/.test(self.navigator.userAgent);
function aislar(r){
  if(!AISLAR||!r||r.type==='opaque'||r.status===0)return r;
  const h=new Headers(r.headers);
  h.set('Cross-Origin-Embedder-Policy','credentialless');
  h.set('Cross-Origin-Opener-Policy','same-origin');
  return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h});
}
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(BASE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k.startsWith('diario-campo')).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET')return;
  const url=new URL(req.url);
  const propio=url.origin===location.origin;
  const fuente=/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if(!propio&&!fuente)return; // los modelos de transcripción los guarda el propio transcriptor
  if(propio&&url.pathname.includes('/vendor/')){
    // archivos grandes que no cambian: primero la copia guardada
    e.respondWith(caches.match(req).then(r=>r||fetch(req).then(n=>{if(n.ok){const c=n.clone();caches.open(CACHE).then(k=>k.put(req,c));}return n;})).then(r=>propio?aislar(r):r));
    return;
  }
  // primero la red (para recibir actualizaciones); sin señal usa la copia guardada
  e.respondWith(fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque')){const c=r.clone();caches.open(CACHE).then(k=>k.put(req,c));}return r;})
    .catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||(req.mode==='navigate'?caches.match('index.html'):undefined)))
    .then(r=>propio?aislar(r):r));
});
