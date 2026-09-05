// 아파트 단지 일조 진단 — 동(棟)별 "동지 9~15시 1층 연속 일조" 스캔 + 선택 동 상세(면·층별 타임라인).
//
// 왜: 일조 분쟁·판례의 수인한도 기준은 "동짓날 9시~15시 사이 연속 2시간 이상"이다
// (lib/calc/shadowCheck.ts 와 같은 기준). 단지 안 각 동의 외벽면 중 가장 유리한 면(보통 남향)이
// 이 기준을 몇 시간 확보하는지 계산해 색으로 보여준다.
//
// 방법: 각 동 외곽선의 변 중점을 바깥으로 0.8m 띄운 수광점(높이 1.5m = 1층 창)에서
// 태양 방향으로 광선을 쏘아, 다른 건물의 수직 프리즘(외곽선 × 높이)에 막히면 그림자.
// 15분 간격으로 9~15시를 스캔해 변별 총 일조·최장 연속 일조를 구하고, 최댓값을 그 동의 값으로 삼는다.
//
// 한계(화면에 반드시 표기): 층수×3m 높이 근사, 지형·수목·발코니 미반영, 균시차 생략(±15분),
// 국토정보 건물 폴리곤 기준. 인허가·소송 판단이 아니라 참고용.

import { sunPosition, sunVector, type SunSeason } from "@/lib/calc/sunPosition";
import type { Pt } from "@/lib/geo/parcel";

export interface SunBuilding {
  id: string;
  name: string;
  /** 로컬 미터 좌표 외곽 링 (x=동, y=북) */
  pts: Pt[];
  floors: number;
  heightM: number;
}

export interface FaceSun {
  edgeIdx: number;
  /** 변 중점 수광점 (로컬 좌표) */
  at: Pt;
  totalH: number;
  maxRunH: number;
}

export interface BuildingSun {
  id: string;
  /** 가장 유리한 면 */
  best: FaceSun;
  faces: FaceSun[];
}

export const SUN_CHECK = {
  fromH: 9,
  toH: 15,
  stepH: 0.25,
  windowH: 1.5,
  offsetM: 0.8,
  passRunH: 2,
  basis:
    "동지 9~15시 15분 간격 스캔 · 수광점 1층 창 높이 1.5m · 다른 건물의 그림자만 반영(지형·수목 제외) · 층수×3m 높이 근사 · 판례 수인한도 = 연속 2시간",
};

/** 스캔 시각 목록(9.0, 9.25, …, 15.0) — 타임라인 표시용 */
export const SUN_SLOTS: number[] = (() => {
  const out: number[] = [];
  for (let h = SUN_CHECK.fromH; h <= SUN_CHECK.toH + 1e-9; h += SUN_CHECK.stepH) out.push(Math.round(h * 100) / 100);
  return out;
})();

function signedArea(pts: Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

interface FaceSample {
  edgeIdx: number;
  at: Pt;
  /** 바깥 법선 (단위) */
  nx: number;
  ny: number;
  lengthM: number;
}

/** 변 중점을 바깥으로 띄운 수광점들 (3m 미만 짧은 변은 제외) */
function faceSamples(pts: Pt[]): FaceSample[] {
  const ccw = signedArea(pts) > 0;
  const out: FaceSample[] = [];
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 3) continue;
    // CCW 폴리곤의 바깥 법선 = (dy, -dx)
    let nx = dy / len;
    let ny = -dx / len;
    if (!ccw) {
      nx = -nx;
      ny = -ny;
    }
    out.push({
      edgeIdx: i,
      at: [(x1 + x2) / 2 + nx * SUN_CHECK.offsetM, (y1 + y2) / 2 + ny * SUN_CHECK.offsetM],
      nx,
      ny,
      lengthM: len,
    });
  }
  return out;
}

/** 바깥 법선 → 8방위 ("남향" 등) */
export function faceOrientation(nx: number, ny: number): string {
  const deg = ((Math.atan2(nx, ny) * 180) / Math.PI + 360) % 360; // 북=0 시계방향
  const names = ["북", "북동", "동", "남동", "남", "남서", "서", "북서"];
  return names[Math.round(deg / 45) % 8] + "향";
}

interface Occluder {
  id: string;
  pts: Pt[];
  h: number;
  cx: number;
  cy: number;
  r: number;
}

function toOccluders(list: SunBuilding[]): Occluder[] {
  return list.map((b) => {
    let cx = 0;
    let cy = 0;
    for (const [x, y] of b.pts) {
      cx += x;
      cy += y;
    }
    cx /= b.pts.length;
    cy /= b.pts.length;
    let r = 0;
    for (const [x, y] of b.pts) r = Math.max(r, Math.hypot(x - cx, y - cy));
    return { id: b.id, pts: b.pts, h: b.heightM, cx, cy, r: r + 1 };
  });
}

/** 수광점 P(높이 pz)에서 태양 방향 d로 나간 광선이 프리즘(폴리곤×높이)에 막히는가 */
function rayHitsPrism(px: number, py: number, pz: number, dx: number, dy: number, dz: number, o: Occluder): boolean {
  // 빠른 기각: 광선 뒤쪽이거나 궤적에서 멀리 떨어진 건물
  const vx = o.cx - px;
  const vy = o.cy - py;
  const along = vx * dx + vy * dy;
  if (along < -o.r) return false;
  const perp = Math.abs(vx * dy - vy * dx);
  if (perp > o.r) return false;
  // 그림자 최대 도달 거리: 높이 h 인 건물은 (h - pz)/dz 이내에서만 가릴 수 있다
  if (dz > 0 && along - o.r > (o.h - pz) / dz) return false;

  const pts = o.pts;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    const ex = bx - ax;
    const ey = by - ay;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const wx = ax - px;
    const wy = ay - py;
    const t = (wx * ey - wy * ex) / den;
    const s = (wx * dy - wy * dx) / den;
    if (t <= 1e-6 || s < 0 || s > 1) continue;
    const z = pz + t * dz;
    if (z >= 0 && z <= o.h) return true;
  }
  return false;
}

interface SunStep {
  h: number;
  /** 로컬 (동, 북, 상) 단위 벡터 */
  v: [number, number, number];
}

function sunSteps(latDeg: number, lonDeg: number, season: SunSeason): SunStep[] {
  const steps: SunStep[] = [];
  for (const h of SUN_SLOTS) {
    const p = sunPosition({ latDeg, lonDeg, season, hourKST: h });
    if (p.altitudeDeg <= 0) {
      steps.push({ h, v: [0, 0, -1] }); // 해가 없는 시각 — 항상 그림자
      continue;
    }
    const [e, up, sz] = sunVector(p); // 씬 벡터: x=동, y=상, z=남
    steps.push({ h, v: [e, -sz, up] });
  }
  return steps;
}

/** 한 수광점의 시각별 일조 여부 + 가린 건물 */
function scanPoint(
  at: Pt,
  z: number,
  selfId: string,
  occ: Occluder[],
  steps: SunStep[],
): { timeline: boolean[]; blockers: Map<string, number>; totalH: number; maxRunH: number } {
  const timeline: boolean[] = [];
  const blockers = new Map<string, number>();
  let total = 0;
  let run = 0;
  let maxRun = 0;
  for (const st of steps) {
    const [dx, dy, dz] = st.v;
    let lit = dz > 0;
    if (lit) {
      for (const o of occ) {
        if (o.id === selfId) continue;
        if (rayHitsPrism(at[0], at[1], z, dx, dy, dz, o)) {
          lit = false;
          blockers.set(o.id, (blockers.get(o.id) ?? 0) + 1);
          break;
        }
      }
    }
    timeline.push(lit);
    if (lit) {
      total += SUN_CHECK.stepH;
      run += SUN_CHECK.stepH;
      maxRun = Math.max(maxRun, run);
    } else {
      run = 0;
    }
  }
  // 마지막 슬롯(15:00)은 구간 끝점이라 시간 합산에서 한 칸 빼지 않는다 — 9~15시 = 6h 를 25칸으로 셈(끝점 포함, 최대 6.25h)
  return { timeline, blockers, totalH: total, maxRunH: maxRun };
}

/**
 * 대상 동들의 면별 일조를 계산한다. occluders 는 대상 포함 주변 전체 건물.
 * subjects 가 많을수록 오래 걸리므로 호출부는 단지 동만 넘긴다.
 */
export function computeBuildingSun(params: {
  subjects: SunBuilding[];
  occluders: SunBuilding[];
  latDeg: number;
  lonDeg: number;
  season?: SunSeason;
}): BuildingSun[] {
  const { subjects, occluders, latDeg, lonDeg } = params;
  const occ = toOccluders(occluders);
  const steps = sunSteps(latDeg, lonDeg, params.season ?? "winter");

  const out: BuildingSun[] = [];
  for (const b of subjects) {
    const faces: FaceSun[] = [];
    for (const f of faceSamples(b.pts)) {
      const r = scanPoint(f.at, SUN_CHECK.windowH, b.id, occ, steps);
      faces.push({ edgeIdx: f.edgeIdx, at: f.at, totalH: r.totalH, maxRunH: r.maxRunH });
    }
    if (faces.length === 0) continue;
    const best = faces.reduce((a, c) =>
      c.maxRunH > a.maxRunH || (c.maxRunH === a.maxRunH && c.totalH > a.totalH) ? c : a,
    );
    out.push({ id: b.id, best, faces });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// 선택 동 상세 — 면(방향)별 × 층(1층·중간층·최상층) 타임라인 + 그림자 원인 + 계절 비교
// ─────────────────────────────────────────────────────────────

export interface LevelDetail {
  label: string;
  heightM: number;
  timeline: boolean[];
  totalH: number;
  maxRunH: number;
  /** 가린 건물 id → 가린 슬롯 수 (많은 순) */
  blockers: Array<{ id: string; slots: number }>;
}

export interface FaceDetail {
  edgeIdx: number;
  orientation: string;
  lengthM: number;
  at: Pt;
  levels: LevelDetail[];
}

export interface BuildingDetail {
  id: string;
  faces: FaceDetail[];
  /** 1층 기준 가장 유리한 면 index (faces[]) */
  bestFace: number;
  /** 계절별 1층·최적면 일조 (동지·춘추분·하지) */
  seasons: Array<{ season: SunSeason; totalH: number; maxRunH: number }>;
}

export function computeBuildingDetail(params: {
  subject: SunBuilding;
  occluders: SunBuilding[];
  latDeg: number;
  lonDeg: number;
}): BuildingDetail {
  const { subject, occluders, latDeg, lonDeg } = params;
  const occ = toOccluders(occluders);
  const winter = sunSteps(latDeg, lonDeg, "winter");
  const levelsSpec = [
    { label: "1층", heightM: SUN_CHECK.windowH },
    { label: "중간층", heightM: Math.max(SUN_CHECK.windowH, subject.heightM / 2) },
    { label: "최상층", heightM: Math.max(SUN_CHECK.windowH, subject.heightM - 1.5) },
  ];

  const faces: FaceDetail[] = faceSamples(subject.pts).map((f) => ({
    edgeIdx: f.edgeIdx,
    orientation: faceOrientation(f.nx, f.ny),
    lengthM: f.lengthM,
    at: f.at,
    levels: levelsSpec.map((lv) => {
      const r = scanPoint(f.at, lv.heightM, subject.id, occ, winter);
      return {
        label: lv.label,
        heightM: lv.heightM,
        timeline: r.timeline,
        totalH: r.totalH,
        maxRunH: r.maxRunH,
        blockers: [...r.blockers.entries()].map(([id, slots]) => ({ id, slots })).sort((a, b) => b.slots - a.slots),
      };
    }),
  }));

  let bestFace = 0;
  faces.forEach((f, i) => {
    const a = faces[bestFace].levels[0];
    const c = f.levels[0];
    if (c.maxRunH > a.maxRunH || (c.maxRunH === a.maxRunH && c.totalH > a.totalH)) bestFace = i;
  });

  const seasons = (["winter", "equinox", "summer"] as SunSeason[]).map((season) => {
    const steps = season === "winter" ? winter : sunSteps(latDeg, lonDeg, season);
    const f = faces[bestFace];
    if (!f) return { season, totalH: 0, maxRunH: 0 };
    const r = scanPoint(f.at, SUN_CHECK.windowH, subject.id, occ, steps);
    return { season, totalH: r.totalH, maxRunH: r.maxRunH };
  });

  return { id: subject.id, faces, bestFace, seasons };
}

/** 등급 — 연속 일조 시간 기준 (판례 2시간 / 4시간 이상이면 매우 양호) */
export function sunGrade(maxRunH: number): { label: string; color: string; tone: "good" | "ok" | "bad" } {
  if (maxRunH >= 4) return { label: "매우 양호", color: "#2e9d5b", tone: "good" };
  if (maxRunH >= SUN_CHECK.passRunH) return { label: "양호(2h 이상)", color: "#7cb342", tone: "good" };
  if (maxRunH >= 1) return { label: "부족", color: "#f2a534", tone: "ok" };
  return { label: "매우 부족", color: "#d9534f", tone: "bad" };
}
