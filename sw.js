const V='ls-v76';const CORE=['./','index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;if(e.request.url.indexOf('/audio/clips/')>-1)return;
// Never intercept a top-level navigation to a different origin — e.g. the
// Google sign-in round-trip (this page -> accounts.google.com -> back).
// Re-fetching that navigation through this handler and falling back to
// the cached app shell on any hiccup (the existing .catch() below) would
// silently swap the real sign-in page for this app's own cached HTML,
// which is exactly what was breaking redirect-based sign-in. Cross-origin
// navigations are left alone for the browser to handle natively.
if(e.request.mode==='navigate'&&new URL(e.request.url).origin!==location.origin)return;
e.respondWith(fetch(e.request).then(r=>{if(r.ok&&new URL(e.request.url).origin===location.origin){const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));}return r;}).catch(()=>caches.match(e.request).then(m=>m||caches.match('index.html'))));});
