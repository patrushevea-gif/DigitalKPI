const CACHE='ar-model-v1';

self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));

self.addEventListener('fetch',e=>{
  if(e.request.url.includes('/kpi-model-ar.glb')){
    e.respondWith(
      caches.open(CACHE)
        .then(c=>c.match('kpi-model-ar.glb'))
        .then(r=>r||new Response('Not ready',{status:503}))
    );
  }
});

self.addEventListener('message',e=>{
  if(e.data&&e.data.type==='CACHE_GLB'){
    caches.open(CACHE).then(cache=>{
      const res=new Response(e.data.buffer,{
        headers:{
          'Content-Type':'model/gltf-binary',
          'Content-Length':String(e.data.buffer.byteLength)
        }
      });
      cache.put('kpi-model-ar.glb',res);
      if(e.ports&&e.ports[0]) e.ports[0].postMessage({ok:true});
    });
  }
});
