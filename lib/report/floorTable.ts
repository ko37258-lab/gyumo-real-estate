// 층별 개요표 계산 — 플렉시티식 상세 보고서의 핵심 표.
//
// ⚠️ 수식은 화면 KPI("실제 가능 연면적")를 만드는 calcActualGfaSqm과 반드시
// 동일해야 한다. 보고서의 층별 합계와 화면 숫자가 다르면 신뢰가 무너진다.
// (같은 가정: 정북 깊이 = √건축면적, 북측 벽은 경계선에서 1.5m — 상대 후퇴
//  fH/2−1.5. 실형상 3D의 절대 클리핑과는 근사 차이가 있을 수 있어 각주로 명시.)

import { SUNLIGHT_THRESHOLD_M } from "@/lib/calc/sunlight";

export interface FloorRow {
  /** 지상 층 번호 (1~) */
  floor: number;
  /** 바닥면적 ㎡ (일조 후퇴·최상층 부분층 반영) */
  areaSqm: number;
  /** 최상층 부분층 비율 (1 = 온전한 층) */
  portion: number;
  /** 정북측 인접 대지경계선에서의 법정 이격(m) — 제86조① (일조 미적용이면 0) */
  legalSetbackM: number;
  note: string;
}

export interface BasementRow {
  /** 지하 층 번호 (1 = B1) */
  level: number;
  areaSqm: number;
  note: string;
}

export interface FloorTableResult {
  rows: FloorRow[];
  basement: BasementRow[];
  /** 지상 바닥면적 합 (= calcActualGfaSqm 결과, 필로티 차감 전) */
  sumGroundSqm: number;
}

export function computeFloorTable(p: {
  bldAreaSqm: number;
  floors: number; // 소수 허용 (3.33층)
  floorHeightM: number;
  sunlightOn: boolean;
  groundParkingArea: number;
  pilotiMode: boolean;
  /** 지하 주차 소요 면적 ㎡ (지하 배치분) */
  basementParkingArea: number;
  usageLabel: string;
}): FloorTableResult {
  const { bldAreaSqm, floors, floorHeightM, sunlightOn } = p;
  const northDepth = Math.sqrt(Math.max(bldAreaSqm, 0.01));
  const rows: FloorRow[] = [];
  let sum = 0;

  const ceil = Math.ceil(floors);
  for (let i = 0; i < ceil; i++) {
    const fH = (i + 1) * floorHeightM;
    // calcActualGfaSqm과 동일한 상대 후퇴 (북측 벽 1.5m 가정)
    const extra = sunlightOn && fH > SUNLIGHT_THRESHOLD_M ? fH / 2 - 1.5 : 0;
    const ratio = Math.max(0, (northDepth - extra) / northDepth);
    const portion = Math.min(1, floors - i);
    if (portion <= 0) break;
    const area = bldAreaSqm * (sunlightOn ? ratio : 1) * portion;
    sum += area;
    const legalSetbackM = sunlightOn ? (fH <= SUNLIGHT_THRESHOLD_M ? 1.5 : fH / 2) : 0;
    let note = p.usageLabel;
    if (i === 0 && p.groundParkingArea > 0) {
      note = `${p.usageLabel} + 주차 ${Math.round(p.groundParkingArea)}㎡ (${p.pilotiMode ? "필로티 — 연면적 제외" : "벽체식 — 연면적 산입"})`;
    }
    if (portion < 1) note += ` · 부분층 ${(portion * 100).toFixed(0)}%`;
    rows.push({ floor: i + 1, areaSqm: area, portion, legalSetbackM, note });
  }

  // 지하 — 주차 소요면적을 건축면적 크기의 층으로 분할
  const basement: BasementRow[] = [];
  let rem = Math.max(0, p.basementParkingArea);
  let lv = 1;
  while (rem > 0.5 && lv <= 5) {
    const a = Math.min(bldAreaSqm, rem);
    basement.push({
      level: lv,
      areaSqm: a,
      note: "주차장 — 용적률 산정 연면적 제외 (건축법 시행령 제119조①4)",
    });
    rem -= a;
    lv++;
  }

  return { rows, basement, sumGroundSqm: sum };
}
