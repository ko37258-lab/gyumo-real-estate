// 필지 폴리곤 기하 유틸 — 연속지적도(경위도) → 로컬 미터 좌표계 변환 + 기본 연산.
//
// 좌표계 규약: x = 동(+), y = 북(+), 원점 = 폴리곤 무게중심. 단위 m.
//   → 정북방향 = +y 고정이라 일조권 사선(북측 후퇴)을 y축 클리핑으로 계산할 수 있다.
//
// 정밀 측량이 아닌 규모검토용 근사(equirectangular, 위도 보정)를 쓴다.
// 서울 위도(37.5°)에서 필지 스케일(수십 m) 오차는 cm 단위 — 검토 목적에 충분.

export type Pt = [number, number]; // [x(m, 동+), y(m, 북+)]

export interface ParcelShape {
  /** 로컬 미터 좌표 외곽 링 (시계/반시계 무관, 닫는 점 중복 없음) */
  pts: Pt[];
  /** 폴리곤 면적 ㎡ (shoelace) */
  areaSqm: number;
  /** 로컬 좌표 bbox */
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  /** 원본 경위도 중심 (지도 연동용) */
  centerLon: number;
  centerLat: number;
  /** 원본 경위도 외곽 링 [[lon,lat],...] — 지도 하이라이트용 */
  ringLonLat: Array<[number, number]>;
}

const EARTH_R = 6378137; // m
const DEG = Math.PI / 180;

/** 경위도 링 → 로컬 미터 좌표 (원점 = 링 평균점) */
export function lonLatRingToLocal(ring: Array<[number, number]>): {
  pts: Pt[];
  centerLon: number;
  centerLat: number;
} {
  const n = ring.length;
  let cLon = 0;
  let cLat = 0;
  for (const [lon, lat] of ring) {
    cLon += lon;
    cLat += lat;
  }
  cLon /= n;
  cLat /= n;
  const cosLat = Math.cos(cLat * DEG);
  const pts: Pt[] = ring.map(([lon, lat]) => [
    (lon - cLon) * DEG * EARTH_R * cosLat,
    (lat - cLat) * DEG * EARTH_R,
  ]);
  return { pts, centerLon: cLon, centerLat: cLat };
}

/** shoelace 면적 (부호 없는 절대값, ㎡) */
export function polygonArea(pts: Pt[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

export function polygonBounds(pts: Pt[]): ParcelShape["bounds"] {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY };
}

/** 폴리곤 무게중심(면적 가중) */
export function polygonCentroid(pts: Pt[]): Pt {
  let a = 0,
    cx = 0,
    cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    const cross = x1 * y2 - x2 * y1;
    a += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  a /= 2;
  if (Math.abs(a) < 1e-9) return [0, 0];
  return [cx / (6 * a), cy / (6 * a)];
}

/**
 * 반평면 클리핑 (Sutherland–Hodgman 단일 평면): y <= yMax 영역만 남김.
 * 일조권 사선의 "정북측 인접대지경계선에서 h에 비례해 후퇴" 근사에 사용 —
 * 후퇴선 = 폴리곤 최북단(maxY) − setback.
 */
export function clipPolygonBelowY(pts: Pt[], yMax: number): Pt[] {
  const out: Pt[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const cur = pts[i];
    const nxt = pts[(i + 1) % n];
    const curIn = cur[1] <= yMax;
    const nxtIn = nxt[1] <= yMax;
    if (curIn) out.push(cur);
    if (curIn !== nxtIn) {
      const t = (yMax - cur[1]) / (nxt[1] - cur[1]);
      out.push([cur[0] + (nxt[0] - cur[0]) * t, yMax]);
    }
  }
  return out;
}

/**
 * 폴리곤을 무게중심 기준 scale배 축소/확대.
 * 건축면적(건폐율) footprint 근사: scale = sqrt(covPct/100).
 * (정식 내측 오프셋(buffer)이 아니라 근사 — 가설계 v1 수준. Phase D에서 offset으로 대체.)
 */
export function scalePolygon(pts: Pt[], scale: number): Pt[] {
  const [cx, cy] = polygonCentroid(pts);
  return pts.map(([x, y]) => [cx + (x - cx) * scale, cy + (y - cy) * scale]);
}

/** ParcelShape 조립 (경위도 외곽 링 입력) */
export function buildParcelShape(ring: Array<[number, number]>): ParcelShape {
  // 닫는 중복점 제거
  const cleaned = ring.filter((p, i) => {
    if (i === 0) return true;
    const prev = ring[i - 1];
    return Math.abs(p[0] - prev[0]) > 1e-10 || Math.abs(p[1] - prev[1]) > 1e-10;
  });
  const last = cleaned[cleaned.length - 1];
  const first = cleaned[0];
  if (
    cleaned.length > 1 &&
    Math.abs(last[0] - first[0]) < 1e-10 &&
    Math.abs(last[1] - first[1]) < 1e-10
  ) {
    cleaned.pop();
  }
  const { pts, centerLon, centerLat } = lonLatRingToLocal(cleaned);
  // 무게중심을 원점으로 재정렬 (3D 배치 안정화)
  const [cx, cy] = polygonCentroid(pts);
  const centered: Pt[] = pts.map(([x, y]) => [x - cx, y - cy]);
  return {
    pts: centered,
    areaSqm: Math.round(polygonArea(centered) * 100) / 100,
    bounds: polygonBounds(centered),
    centerLon,
    centerLat,
    ringLonLat: cleaned,
  };
}
