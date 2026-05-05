// ════════════════════════════════════
// sw.js — Service Worker (PWA 오프라인 캐시)
// 경로: sw.js (루트)
// ════════════════════════════════════

const CACHE_NAME = "novel-viewer-v1";
const CACHE_TIMEOUT = 3000; // 네트워크 타임아웃 (ms)

// ── 캐시할 정적 파일 목록 ──────────────────────
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/src/css/base.css",
  "/src/css/themes.css",
  "/src/css/layout.css",
  "/src/css/components.css",
  "/src/js/firebase.js",
  "/src/js/firebase-config.js",
  "/src/js/parser.js",
  "/src/js/viewer.js",
  "/src/js/sync.js",
  "/src/js/bookmark.js",
  "/src/js/search.js",
  "/src/js/highlight.js",
  "/src/js/tts.js",
  "/src/js/settings.js",
];

// ── 설치 — 정적 파일 캐시 ──────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  // 즉시 활성화
  self.skipWaiting();
});

// ── 활성화 — 이전 캐시 정리 ───────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

// ── fetch — 캐시 우선 전략 ────────────────────
// 정적 파일: 캐시 우선 → 없으면 네트워크
// Firebase/외부 API: 네트워크 우선 → 실패 시 캐시
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Firebase, Google API → 네트워크 우선
  if (
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("firebaseapp.com") ||
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("gstatic.com")
  ) {
    e.respondWith(networkFirst(e.request));
    return;
  }

  // 정적 파일 → 캐시 우선
  e.respondWith(cacheFirst(e.request));
});

// ── 캐시 우선 전략 ────────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && request.method === "GET") {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("오프라인 상태예요. 캐시된 콘텐츠를 확인하세요.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

// ── 네트워크 우선 전략 ────────────────────────
async function networkFirst(request) {
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), CACHE_TIMEOUT),
      ),
    ]);
    // GET 요청만 캐시 (POST 등은 캐시 불가)
    if (response.ok && request.method === "GET") {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response("", { status: 503 });
  }
}
