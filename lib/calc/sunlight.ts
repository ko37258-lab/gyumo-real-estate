import { FLOOR_HEIGHT_M } from "@/lib/constants";

/** 일조권 기준점 높이(m) — 2023.9.12 개정 시행령 86조 1항으로 9m → 10m 상향. */
export const SUNLIGHT_THRESHOLD_M = 10;

/**
 * 건축법 시행령 제86조 제1항 — 정북방향 일조권 사선제한 (2023.9.12 개정).
 *  - 높이 10m 이하: 인접대지경계선에서 1.5m 이상 이격
 *  - 높이 10m 초과: 해당 부분 높이의 1/2 이상 이격
 *
 * 단순화 가정: 건축면적이 정사각형이고 정북 방향 깊이 = √(건축면적).
 * 층별로 깎인 면적을 합산해서 "실제 가능 연면적"을 추정한다.
 */
export function calcActualGfaSqm(params: {
  bldAreaSqm: number;
  floors: number;
  northDepthM: number;
  sunlightOn: boolean;
}) {
  const { bldAreaSqm, floors, northDepthM, sunlightOn } = params;
  if (!sunlightOn) return bldAreaSqm * floors;

  let total = 0;
  const ceil = Math.ceil(floors);
  for (let i = 0; i < ceil; i++) {
    const fH = (i + 1) * FLOOR_HEIGHT_M;
    let setback = 0;
    if (fH > SUNLIGHT_THRESHOLD_M) setback = fH / 2 - 1.5;
    const effDepth = Math.max(0, northDepthM - setback);
    const widthRatio = northDepthM > 0 ? effDepth / northDepthM : 0;
    const floorPortion = i + 1 <= floors ? 1 : floors - i;
    total += bldAreaSqm * widthRatio * floorPortion;
  }
  return total;
}

/** 층별 정북 이격거리(m). 시각화·표시용. */
export function setbackByFloor(floorIndex: number): number {
  const fH = (floorIndex + 1) * FLOOR_HEIGHT_M;
  if (fH <= SUNLIGHT_THRESHOLD_M) return 1.5;
  return fH / 2 - 1.5;
}

/** 일조권 손실률 (%). 0이면 손실 없음. */
export function sunlightLossPct(legalGfa: number, actualGfa: number) {
  if (legalGfa <= 0) return 0;
  return (1 - actualGfa / legalGfa) * 100;
}
