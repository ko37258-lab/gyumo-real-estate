// 태양 위치(고도·방위) 계산 — 그림자 시뮬레이션용.
//
// 왜 절기 프리셋인가: 일조 분쟁·판례의 기준일이 동지(冬至)다. 시행령 제86조
// 제3항 제2호도 "동지 기준 9시~15시 사이 2시간 이상 연속 일조"를 기준으로 든다.
// 검토 목적상 동지·춘추분·하지 세 절기의 시각별 태양만 있으면 충분하다.
//
// 정밀도: 적위(δ)는 절기 대표값, 균시차(equation of time)는 생략 — 시각 오차
// ±15분 수준으로 교육·매스검토 목적에 충분하다. 경도 보정(KST 기준자오선
// 135°E와 현지 경도 차이)은 반영한다. 서울에서 약 -32분.

export type SunSeason = "winter" | "equinox" | "summer";

/** 절기별 태양 적위(도) — 동지 -23.44 / 춘·추분 0 / 하지 +23.44 */
const DECLINATION: Record<SunSeason, number> = {
  winter: -23.44,
  equinox: 0,
  summer: 23.44,
};

export const SEASON_LABEL: Record<SunSeason, string> = {
  winter: "동지",
  equinox: "춘·추분",
  summer: "하지",
};

const DEG = Math.PI / 180;

export interface SunPos {
  /** 지평선 위 고도(도). 0 이하면 해가 뜨지 않은 시각 */
  altitudeDeg: number;
  /** 방위각(도, 북=0 시계방향. 동=90, 남=180, 서=270) */
  azimuthDeg: number;
}

export function sunPosition(params: {
  latDeg: number;
  lonDeg: number;
  season: SunSeason;
  /** 한국표준시(KST) 시각. 소수 허용(13.5 = 13:30) */
  hourKST: number;
}): SunPos {
  const { latDeg, lonDeg, season, hourKST } = params;
  const phi = latDeg * DEG;
  const delta = DECLINATION[season] * DEG;

  // 지방 진태양시 근사: KST 기준자오선 135°E → 경도 1°당 4분
  const solarHour = hourKST + (lonDeg - 135) / 15;
  const H = (solarHour - 12) * 15 * DEG; // 시간각 (정오=0, 오후 +)

  const sinAlt =
    Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  // 방위각 (북=0 시계방향)
  const cosAz =
    (Math.sin(delta) - Math.sin(alt) * Math.sin(phi)) /
    (Math.cos(alt) * Math.cos(phi) || 1e-9);
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz))) / DEG;
  if (H > 0) az = 360 - az; // 오후엔 서쪽으로

  return { altitudeDeg: alt / DEG, azimuthDeg: az };
}

/** 태양 방향의 3D 씬 단위벡터 — 씬 규약: x=동(+), y=상(+), z=남(+) (z = -북) */
export function sunVector(p: SunPos): [number, number, number] {
  const alt = p.altitudeDeg * DEG;
  const az = p.azimuthDeg * DEG;
  const east = Math.cos(alt) * Math.sin(az);
  const north = Math.cos(alt) * Math.cos(az);
  return [east, Math.sin(alt), -north];
}
