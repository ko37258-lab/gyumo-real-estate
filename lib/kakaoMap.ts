/* eslint-disable @typescript-eslint/no-explicit-any */
// 🗺️ 카카오맵 JS SDK 로더 (mrk-realestate lib/kakaoMap.ts 와 같은 규약, 한 번만 로드해 재사용)
//
// JS 키는 "도메인 제한" 공개 키 — 카카오 콘솔(내 애플리케이션 > 플랫폼 > Web > 사이트 도메인)에
// 등록된 도메인에서만 동작한다. gyumo 는 https://gyumo.vercel.app, http://localhost:3021 등록 필요.
// 값은 NEXT_PUBLIC_KAKAO_JS_KEY 에서만 읽고 없으면 즉시 실패 → 호출부가 VWorld(leaflet) 지도로 넘어간다.
const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "";

/** 검색엔진·AI 크롤러 — SDK 일일 한도만 축내므로 카카오 지도를 주지 않는다 */
export function isCrawler(): boolean {
  if (typeof navigator === "undefined") return false;
  return /bot|crawl|spider|slurp|yeti|daumoa|facebookexternalhit|linkedinbot|twitterbot|embedly|pinterest|whatsapp|telegrambot|kakaotalk-scrap|headlesschrome|lighthouse|gptbot|claudebot|claude-user|chatgpt-user|perplexity|bingpreview/i.test(
    navigator.userAgent,
  );
}

let loadPromise: Promise<any> | null = null;

export function loadKakaoMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (isCrawler()) return Promise.reject(new Error("crawler"));
  if (!KAKAO_JS_KEY) return Promise.reject(new Error("NEXT_PUBLIC_KAKAO_JS_KEY 미설정"));
  const w = window as any;
  if (w.kakao?.maps?.LatLng) return Promise.resolve(w.kakao);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const ready = () => w.kakao.maps.load(() => resolve(w.kakao));
    const existing = document.getElementById("kakao-maps-sdk") as HTMLScriptElement | null;
    if (existing) {
      if (w.kakao?.maps) ready();
      else existing.addEventListener("load", ready, { once: true });
      return;
    }
    const fail = (why: string) => {
      clearTimeout(timer);
      loadPromise = null;
      reject(new Error(why));
    };
    // 한도 초과·도메인 미등록은 onerror/onload 로 즉시 잡힌다. 타이머는 "아무 응답도 없는" 경우만.
    const timer = setTimeout(() => fail("카카오맵 SDK 응답 없음"), 15000);
    const s = document.createElement("script");
    s.id = "kakao-maps-sdk";
    s.async = true;
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false`;
    s.onload = () => {
      if (!w.kakao?.maps) {
        s.remove();
        fail("카카오맵 SDK 초기화 실패(일일 한도 초과 가능)");
        return;
      }
      clearTimeout(timer);
      ready();
    };
    s.onerror = () => {
      s.remove();
      fail("카카오맵 SDK 로드 실패(일일 한도 초과 또는 도메인 미등록)");
    };
    document.head.appendChild(s);
  });
  return loadPromise;
}

/** "ok" → 카카오 지도, "free" → VWorld(leaflet) 대체 지도 */
export type MapEngine = "loading" | "ok" | "free";
export function probeKakao(): Promise<MapEngine> {
  return loadKakaoMaps()
    .then((): MapEngine => "ok")
    .catch((): MapEngine => "free");
}

/** 폴백 이유까지 — 화면에 "왜 카카오맵이 아닌지" 표시해 원인(키·도메인·한도)을 바로 알 수 있게 */
export function probeKakaoDetail(): Promise<{ engine: MapEngine; reason: string }> {
  return loadKakaoMaps()
    .then(() => ({ engine: "ok" as MapEngine, reason: "" }))
    .catch((e: unknown) => ({ engine: "free" as MapEngine, reason: e instanceof Error ? e.message : String(e) }));
}
