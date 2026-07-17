// VWorld 조회 — 클라이언트는 서버 프록시(/api/vworld)만 호출한다.
//
// 이전: 브라우저에서 api.vworld.kr를 직접 호출 → CORS 차단 + JSONP fallback(콘솔 에러 다수).
// 변경: 면적·공시지가·지목·용도지역·도로 모두 서버사이드(/api/vworld, /api/landarea)에서 조회.
//   → VWorld 키가 클라이언트 번들에 노출되지 않고(NEXT_PUBLIC 제거), CORS 에러도 사라진다.

export interface ParcelInfo {
  pnu: string;
  jibun: string;
  jimokName: string;
  area: number;
  price?: number; // 개별공시지가 원/㎡
}

export interface RoadCheck {
  hasRoad: boolean;
  roads: Array<{ jibun: string }>;
  totalParcels: number;
}

/** VWorld 토지특성정보(면적·공시지가·지목) — 서버 프록시 경유 */
export async function fetchLandCharByPnu(
  pnu: string,
): Promise<ParcelInfo | null> {
  const r = await fetch(`/api/vworld?kind=landchar&pnu=${pnu}`).catch(() => null);
  if (!r || !r.ok) return null;
  const d = (await r.json().catch(() => null)) as
    | { pnu?: string; jibun?: string; jimok?: string; area?: number; price?: number }
    | null;
  if (!d) return null;
  return {
    pnu: d.pnu ?? pnu,
    jibun: d.jibun ?? "",
    jimokName: d.jimok || "미상",
    area: d.area ?? 0,
    price: d.price,
  };
}

/** VWorld 용도지역 — 서버 프록시 경유 */
export async function fetchZoneByCoord(
  x: number | string,
  y: number | string,
): Promise<string | null> {
  const r = await fetch(`/api/vworld?kind=zone&x=${x}&y=${y}`).catch(() => null);
  if (!r || !r.ok) return null;
  const d = (await r.json().catch(() => null)) as { zone?: string } | null;
  return d?.zone ?? null;
}

/** VWorld 주변 도로 접면 판정 — 서버 프록시 경유 */
export async function fetchNearbyRoads(
  x: number | string,
  y: number | string,
): Promise<RoadCheck | null> {
  const r = await fetch(`/api/vworld?kind=roads&x=${x}&y=${y}`).catch(() => null);
  if (!r || !r.ok) return null;
  const d = (await r.json().catch(() => null)) as RoadCheck | null;
  return d;
}

/** 연속지적도 필지 폴리곤 (경위도 외곽 링) — 서버 프록시 경유. 실형상 2D/3D용 */
export async function fetchParcelPolygon(
  pnu: string,
): Promise<{ ring: Array<[number, number]>; jibun: string } | null> {
  const r = await fetch(`/api/vworld?kind=parcel&pnu=${pnu}`).catch(() => null);
  if (!r || !r.ok) return null;
  const d = (await r.json().catch(() => null)) as {
    ring?: Array<[number, number]>;
    jibun?: string;
  } | null;
  if (!d?.ring || d.ring.length < 3) return null;
  return { ring: d.ring, jibun: d.jibun ?? "" };
}
