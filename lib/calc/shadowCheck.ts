// 북측 일조 영향 진단 — 동지(冬至) 9~15시 그림자 스캔.
//
// 왜: 일조 분쟁의 실무 기준은 "동짓날 9~15시 사이 연속 2시간 이상 일조 확보"
// (대법원 판례 확립 수인한도 기준, 시행령 제86조③2호도 동일 시간대 인용).
// 새 매스가 북측 이웃 땅에 그 기준을 얼마나 남겨주는지 계획 단계에서 가늠한다.
//
// 방법: 대상 매스를 층별 프리즘(일조사선 클리핑 반영)으로 보고, 북측 지점 P에서
// 태양 방향으로 광선을 쏘아 어느 층 프리즘에라도 막히면 그 시각은 그림자.
// 15분 간격으로 9~15시를 스캔해 연속 일조 최장 구간을 구한다.
//
// 한계(정직하게 표기할 것): 창 높이 1.5m 가정, 주변 기존 건물·지형·수목 미반영,
// 균시차 생략(±15분). 인허가·소송 판단이 아니라 계획 참고용.

import { sunPosition } from "@/lib/calc/sunPosition";
import { SUNLIGHT_THRESHOLD_M } from "@/lib/calc/sunlight";
import {
  scalePolygon,
  clipPolygonBelowY,
  polygonArea,
  pointInPolygon,
  type Pt,
} from "@/lib/geo/parcel";

const WINDOW_H = 1.5; // 수광점 높이(m) — 1층 창 높이 근사
const STEP_H = 0.25; // 15분
const FROM_H = 9;
const TO_H = 15;

export interface SunImpactRow {
  /** 북측 경계선에서의 거리(m) */
  offsetM: number;
  /** 최장 연속 일조(시간) — 해당 거리에서 가장 불리한 지점 기준 */
  maxRunH: number;
  /** 총 일조(시간) */
  totalH: number;
  /** 연속 2시간 기준 충족 여부 */
  pass: boolean;
}

export interface SunImpactResult {
  rows: SunImpactRow[];
  basis: string;
}

export function checkNorthSunlight(p: {
  shape: { pts: Pt[]; northY: number };
  bldAreaSqm: number;
  floors: number;
  floorHeightM: number;
  /** 대상지의 일조사선 적용 여부 — 매스 형상(계단)에 영향 */
  sunlightOn: boolean;
  latDeg: number;
  lonDeg: number;
}): SunImpactResult {
  const { shape, bldAreaSqm, floors, floorHeightM, sunlightOn, latDeg, lonDeg } = p;

  // ── 층별 프리즘 (floorAreas 실형상 분기와 동일 규칙) ──
  const shapeArea = polygonArea(shape.pts);
  const k = Math.sqrt(Math.max(bldAreaSqm, 0.01) / Math.max(shapeArea, 0.01));
  const fp = scalePolygon(shape.pts, Math.min(1, k));
  const prisms: Array<{ poly: Pt[]; h0: number; h1: number }> = [];
  const ceil = Math.ceil(floors);
  for (let i = 0; i < ceil; i++) {
    const fH = (i + 1) * floorHeightM;
    const req = sunlightOn ? (fH <= SUNLIGHT_THRESHOLD_M ? 1.5 : fH / 2) : 0;
    const poly = req > 0 ? clipPolygonBelowY(fp, shape.northY - req) : fp;
    if (poly.length < 3) break;
    const portion = Math.min(1, floors - i);
    if (portion <= 0) break;
    prisms.push({ poly, h0: i * floorHeightM, h1: (i + portion) * floorHeightM });
  }

  // ── 샘플 지점: 경계 북측 offset × 가로 5열 ──
  let minX = Infinity;
  let maxX = -Infinity;
  for (const [x] of shape.pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  const cols = [0.1, 0.3, 0.5, 0.7, 0.9].map((t) => minX + (maxX - minX) * t);
  const offsets = [2, 4, 8, 12, 20];

  const shadowedAt = (px: number, py: number, hourKST: number): boolean => {
    const sun = sunPosition({ latDeg, lonDeg, season: "winter", hourKST });
    if (sun.altitudeDeg <= 0) return true; // 해 없음 = 일조 미확보
    const az = (sun.azimuthDeg * Math.PI) / 180;
    const dirE = Math.sin(az);
    const dirN = Math.cos(az);
    const tanAlt = Math.tan((sun.altitudeDeg * Math.PI) / 180);
    for (const pr of prisms) {
      // 광선 높이 WINDOW_H + d·tanAlt 가 [h0,h1]에 드는 수평거리 구간
      const dMin = Math.max(0.05, (pr.h0 - WINDOW_H) / tanAlt);
      const dMax = (pr.h1 - WINDOW_H) / tanAlt;
      if (dMax <= dMin) continue;
      const step = Math.max(0.35, (dMax - dMin) / 24);
      for (let d = dMin; d <= dMax; d += step) {
        if (pointInPolygon([px + d * dirE, py + d * dirN], pr.poly)) return true;
      }
    }
    return false;
  };

  const rows: SunImpactRow[] = offsets.map((off) => {
    const py = shape.northY + off;
    let worstRun = Infinity;
    let worstTotal = Infinity;
    for (const px of cols) {
      let run = 0;
      let maxRun = 0;
      let total = 0;
      for (let t = FROM_H; t <= TO_H + 1e-9; t += STEP_H) {
        const lit = !shadowedAt(px, py, t);
        if (lit) {
          run += STEP_H;
          total += STEP_H;
          if (run > maxRun) maxRun = run;
        } else {
          run = 0;
        }
      }
      if (maxRun < worstRun) worstRun = maxRun;
      if (total < worstTotal) worstTotal = total;
    }
    return {
      offsetM: off,
      maxRunH: Math.round(worstRun * 100) / 100,
      totalH: Math.round(worstTotal * 100) / 100,
      pass: worstRun >= 2,
    };
  });

  return {
    rows,
    basis:
      "동지 9~15시 · 15분 간격 · 수광점 높이 1.5m · 가장 불리한 지점 기준 (연속 2시간 = 판례 수인한도)",
  };
}
