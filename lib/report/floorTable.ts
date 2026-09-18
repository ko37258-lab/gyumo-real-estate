// 층별 개요표 계산 — 플렉시티식 상세 보고서의 핵심 표.
//
// 정밀도 2단계:
//  - shape 제공(실형상): 지적 폴리곤을 건폐율만큼 축소한 footprint를 층별로
//    정북 경계선 기준 절대 이격(requiredSetbackM — 개정 후 3단계 / 개정 전 2단계)으로
//    클리핑해 면적을 적분한다. 3D ParcelMass와 동일 규칙.
//  - shape 없음(수동 입력): 정북 깊이 √건축면적 근사(calcActualGfaSqm과 동일).
//
// ⚠️ 이 모듈이 유일한 계산원이다 — 화면 KPI(ResultMetrics)·PDF 층별표·
//    보고서 요약이 전부 여기서 나온 같은 숫자를 써야 한다.

import {
  requiredSetbackM,
  extraSetbackM,
  DEFAULT_SUNLIGHT_RULE,
  type SunlightRule,
} from "@/lib/calc/sunlight";
import {
  scalePolygon,
  clipPolygonBelowY,
  polygonArea,
  type Pt,
} from "@/lib/geo/parcel";

export interface ShapeForGfa {
  /** 필지 로컬 미터 외곽 링 (x=동+, y=북+) */
  pts: Pt[];
  /** 정북측 인접 대지경계선 = bounds.maxY */
  northY: number;
}

export interface FloorRow {
  floor: number;
  areaSqm: number;
  portion: number;
  /** 정북측 인접 대지경계선 기준 법정 이격(m) — 일조 미적용이면 0 */
  legalSetbackM: number;
  note: string;
}

export interface BasementRow {
  level: number;
  areaSqm: number;
  note: string;
}

export interface FloorTableResult {
  rows: FloorRow[];
  basement: BasementRow[];
  /** 지상 바닥면적 합 (필로티 차감 전) */
  sumGroundSqm: number;
  /** 실형상 정밀 계산 여부 */
  precise: boolean;
}

/** 층별 바닥면적 배열 — 화면 KPI와 표가 공유하는 단일 계산원 */
export function floorAreas(p: {
  bldAreaSqm: number;
  floors: number;
  floorHeightM: number;
  /** 1층 층고(m) — 생략 시 기준층 층고와 같음 */
  floor1HeightM?: number;
  sunlightOn: boolean;
  shape?: ShapeForGfa | null;
  rule?: SunlightRule;
}): Array<{ floor: number; areaSqm: number; portion: number; legalSetbackM: number }> {
  const { bldAreaSqm, floors, floorHeightM, sunlightOn, shape } = p;
  const h1 = p.floor1HeightM && p.floor1HeightM > 0 ? p.floor1HeightM : floorHeightM;
  // i번째(0부터) 층 상단 높이 = 1층 층고 + 기준층 층고 × i
  const topOf = (i: number) => h1 + i * floorHeightM;
  const rule = p.rule ?? DEFAULT_SUNLIGHT_RULE;
  const out: Array<{ floor: number; areaSqm: number; portion: number; legalSetbackM: number }> = [];
  const ceil = Math.ceil(floors);

  if (shape && shape.pts.length >= 3) {
    // 실형상: footprint = 지적 폴리곤 × √(건축면적/필지면적)
    const shapeArea = polygonArea(shape.pts);
    const k = Math.sqrt(Math.max(bldAreaSqm, 0.01) / Math.max(shapeArea, 0.01));
    const fp = scalePolygon(shape.pts, Math.min(1, k));
    for (let i = 0; i < ceil; i++) {
      const fH = topOf(i);
      const req = sunlightOn ? requiredSetbackM(fH, rule) : 0;
      const pts = req > 0 ? clipPolygonBelowY(fp, shape.northY - req) : fp;
      const portion = Math.min(1, floors - i);
      if (portion <= 0) break;
      const area = (pts.length >= 3 ? polygonArea(pts) : 0) * portion;
      out.push({ floor: i + 1, areaSqm: area, portion, legalSetbackM: req });
      if (pts.length < 3) break; // 위로 갈수록 더 깎이므로 이후 층은 전부 0
    }
    return out;
  }

  // 근사(박스): calcActualGfaSqm과 동일 — 북측 벽 1.5m 가정의 상대 후퇴
  const northDepth = Math.sqrt(Math.max(bldAreaSqm, 0.01));
  for (let i = 0; i < ceil; i++) {
    const fH = topOf(i);
    const extra = sunlightOn ? extraSetbackM(fH, rule) : 0;
    const ratio = Math.max(0, (northDepth - extra) / northDepth);
    const portion = Math.min(1, floors - i);
    if (portion <= 0) break;
    out.push({
      floor: i + 1,
      areaSqm: bldAreaSqm * (sunlightOn ? ratio : 1) * portion,
      portion,
      legalSetbackM: sunlightOn ? requiredSetbackM(fH, rule) : 0,
    });
  }
  return out;
}

/** 실제 가능 연면적(필로티 차감 전) — 화면 KPI용 단일 진입점 */
export function actualGfaPrecise(p: Parameters<typeof floorAreas>[0]): number {
  return floorAreas(p).reduce((s, r) => s + r.areaSqm, 0);
}

export function computeFloorTable(p: {
  bldAreaSqm: number;
  floors: number;
  floorHeightM: number;
  sunlightOn: boolean;
  groundParkingArea: number;
  pilotiMode: boolean;
  basementParkingArea: number;
  usageLabel: string;
  shape?: ShapeForGfa | null;
  rule?: SunlightRule;
  floor1HeightM?: number;
  /** computePlan 의 지하층 배열 — 주면 그대로 쓴다(화면·2D·비용과 같은 값) */
  basementLevels?: Array<{ level: number; areaSqm: number }>;
}): FloorTableResult {
  const areas = floorAreas(p);
  const rows: FloorRow[] = areas.map((a) => {
    let note = p.usageLabel;
    if (a.floor === 1 && p.groundParkingArea > 0) {
      note = `${p.usageLabel} + 주차 ${Math.round(p.groundParkingArea)}㎡ (${p.pilotiMode ? "필로티 — 요건 충족 시 바닥면적 불산입" : "벽체식 — 바닥면적 산입, 용적률 산정에선 제외"})`;
    }
    if (a.portion < 1) note += ` · 부분층 ${(a.portion * 100).toFixed(0)}%`;
    return { ...a, note };
  });
  const sum = rows.reduce((s, r) => s + r.areaSqm, 0);

  const basement: BasementRow[] = [];
  const BASEMENT_NOTE = "주차장 — 용적률 산정 연면적 제외, 총연면적에는 포함 (건축법 시행령 제119조①4)";
  if (p.basementLevels) {
    for (const l of p.basementLevels) basement.push({ level: l.level, areaSqm: l.areaSqm, note: BASEMENT_NOTE });
    return { rows, basement, sumGroundSqm: sum, precise: Boolean(p.shape && p.shape.pts.length >= 3) };
  }
  let rem = Math.max(0, p.basementParkingArea);
  let lv = 1;
  while (rem > 0.5 && lv <= 5) {
    const a = Math.min(p.bldAreaSqm, rem);
    basement.push({
      level: lv,
      areaSqm: a,
      note: BASEMENT_NOTE,
    });
    rem -= a;
    lv++;
  }

  return { rows, basement, sumGroundSqm: sum, precise: Boolean(p.shape && p.shape.pts.length >= 3) };
}
