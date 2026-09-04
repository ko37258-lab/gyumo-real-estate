import { FLOOR_HEIGHT_M } from "@/lib/constants";

/**
 * 정북방향 일조 높이제한 — 규칙 버전.
 *
 *  revised : 건축법 제61조 제1항 (2026.8.11 개정 · 2026.11.12 시행)
 *            이격 기준이 시행령에서 법률 본문으로 올라오면서 3단계로 재편.
 *              ① 높이 10m 이하           → 1.5m 이상
 *              ② 높이 10m 초과 17m 이하  → 5m 이상   ← 신설(고정값)
 *              ③ 높이 17m 초과           → 높이의 1/2 이상
 *            + 정북 인접대지가 전용·일반주거지역이 아니면 적용 제외(법 단서로 승격)
 *
 *  legacy  : 건축법 시행령 제86조 제1항 (2023.9.12 개정, 2026.11.11까지)
 *              ① 높이 10m 이하 → 1.5m 이상
 *              ② 높이 10m 초과 → 높이의 1/2 이상
 *
 * 두 규칙은 17m에서 만난다(17/2 = 8.5m). 차이는 10~17m 구간뿐이며,
 * 개정 후가 항상 같거나 완화된다(4~5층 규모에서 체감이 크다).
 */
export type SunlightRule = "revised" | "legacy";

export const DEFAULT_SUNLIGHT_RULE: SunlightRule = "revised";

/** 저층부 기준 높이(m) — 2023.9.12 시행령 개정으로 9m → 10m. 두 규칙 공통. */
export const SUNLIGHT_THRESHOLD_M = 10;
/** 개정 후 중간 구간 상한(m) — 이 높이까지는 5m 고정 이격. */
export const SUNLIGHT_TIER2_M = 17;
/** 개정 후 중간 구간 고정 이격(m). */
export const SUNLIGHT_TIER2_SETBACK_M = 5;
/** 저층부 최소 이격(m). 두 규칙 공통. */
export const SUNLIGHT_BASE_SETBACK_M = 1.5;

export const SUNLIGHT_RULE_META: Record<
  SunlightRule,
  {
    label: string;
    short: string;
    basis: string;
    effective: string;
    tiers: Array<{ range: string; setback: string }>;
  }
> = {
  revised: {
    label: "개정 후 (원칙)",
    short: "개정 후",
    basis: "건축법 제61조 제1항 (2026.8.11 개정)",
    effective: "2026.11.12 시행",
    tiers: [
      { range: "높이 10m 이하", setback: "1.5m 이상" },
      { range: "10m 초과 ~ 17m 이하", setback: "5m 이상 (고정)" },
      { range: "17m 초과", setback: "높이의 1/2 이상" },
    ],
  },
  legacy: {
    label: "개정 전",
    short: "개정 전",
    basis: "건축법 시행령 제86조 제1항 (2023.9.12 개정)",
    effective: "2026.11.11까지 적용",
    tiers: [
      { range: "높이 10m 이하", setback: "1.5m 이상" },
      { range: "10m 초과", setback: "높이의 1/2 이상" },
    ],
  },
};

/**
 * 높이 h(m)인 부분이 정북 인접 대지경계선에서 띄어야 하는 **절대** 거리(m).
 * 모든 시각화·면적 계산은 이 함수 하나를 쓴다.
 */
export function requiredSetbackM(
  heightM: number,
  rule: SunlightRule = DEFAULT_SUNLIGHT_RULE,
): number {
  if (heightM <= SUNLIGHT_THRESHOLD_M) return SUNLIGHT_BASE_SETBACK_M;
  if (rule === "revised" && heightM <= SUNLIGHT_TIER2_M) {
    return SUNLIGHT_TIER2_SETBACK_M;
  }
  return heightM / 2;
}

/**
 * 저층부 기준(1.5m) 대비 **추가** 후퇴 거리(m).
 * 박스 근사 모델은 북측 벽이 이미 1.5m 떨어져 있다고 보고 이 값만큼 더 깎는다.
 */
export function extraSetbackM(
  heightM: number,
  rule: SunlightRule = DEFAULT_SUNLIGHT_RULE,
): number {
  return Math.max(0, requiredSetbackM(heightM, rule) - SUNLIGHT_BASE_SETBACK_M);
}

/**
 * 정북 단면 envelope 꼭짓점 — 경계선에서의 거리 d(m)와 그 지점의 허용 높이 h(m).
 * 2D/3D 사선면을 같은 모양으로 그리기 위한 단일 출처.
 *   legacy : (1.5,0) → (1.5,10) → (5,10) → 사선 h=2d
 *   revised: (1.5,0) → (1.5,10) → (5,10) → (5,17) → (8.5,17) → 사선 h=2d
 * 마지막 점은 topH까지 사선을 연장한 위치.
 */
export function envelopeProfile(
  topH: number,
  rule: SunlightRule = DEFAULT_SUNLIGHT_RULE,
): Array<{ d: number; h: number }> {
  const pts: Array<{ d: number; h: number }> = [
    { d: SUNLIGHT_BASE_SETBACK_M, h: 0 },
    { d: SUNLIGHT_BASE_SETBACK_M, h: Math.min(topH, SUNLIGHT_THRESHOLD_M) },
  ];
  if (topH <= SUNLIGHT_THRESHOLD_M) return pts;

  // 10m에서 1.5m → 5m로 수평 이동 (두 규칙 공통: 10/2 = 5)
  pts.push({ d: SUNLIGHT_TIER2_SETBACK_M, h: SUNLIGHT_THRESHOLD_M });

  if (rule === "revised") {
    const h2 = Math.min(topH, SUNLIGHT_TIER2_M);
    pts.push({ d: SUNLIGHT_TIER2_SETBACK_M, h: h2 }); // 5m 고정 수직
    if (topH <= SUNLIGHT_TIER2_M) return pts;
    pts.push({ d: SUNLIGHT_TIER2_M / 2, h: SUNLIGHT_TIER2_M }); // 17m에서 8.5m로 수평
  }
  pts.push({ d: topH / 2, h: topH }); // 사선 h = 2d
  return pts;
}

/**
 * 박스 근사 실제 가능 연면적.
 * 단순화 가정: 건축면적이 정사각형이고 정북 방향 깊이 = √(건축면적).
 * 층별로 깎인 면적을 합산한다.
 */
export function calcActualGfaSqm(params: {
  bldAreaSqm: number;
  floors: number;
  northDepthM: number;
  sunlightOn: boolean;
  rule?: SunlightRule;
}) {
  const { bldAreaSqm, floors, northDepthM, sunlightOn } = params;
  const rule = params.rule ?? DEFAULT_SUNLIGHT_RULE;
  if (!sunlightOn) return bldAreaSqm * floors;

  let total = 0;
  const ceil = Math.ceil(floors);
  for (let i = 0; i < ceil; i++) {
    const fH = (i + 1) * FLOOR_HEIGHT_M;
    const setback = extraSetbackM(fH, rule);
    const effDepth = Math.max(0, northDepthM - setback);
    const widthRatio = northDepthM > 0 ? effDepth / northDepthM : 0;
    const floorPortion = i + 1 <= floors ? 1 : floors - i;
    total += bldAreaSqm * widthRatio * floorPortion;
  }
  return total;
}

/** 층별 정북 이격거리(m, 절대값). 시각화·표시용. */
export function setbackByFloor(
  floorIndex: number,
  rule: SunlightRule = DEFAULT_SUNLIGHT_RULE,
): number {
  return requiredSetbackM((floorIndex + 1) * FLOOR_HEIGHT_M, rule);
}

/** 일조권 손실률 (%). 0이면 손실 없음. */
export function sunlightLossPct(legalGfa: number, actualGfa: number) {
  if (legalGfa <= 0) return 0;
  return (1 - actualGfa / legalGfa) * 100;
}

/**
 * 개정 전·후 층별 비교표. 화면 비교 카드와 보고서가 같은 표를 쓴다.
 * 층 높이는 층 상단 기준(층 내 최엄격 지점)으로 잡는다 — 다른 계산과 동일.
 */
export function compareRulesByFloor(
  floors: number,
  floorHeightM: number = FLOOR_HEIGHT_M,
): Array<{
  floor: number;
  heightM: number;
  legacyM: number;
  revisedM: number;
  gainM: number;
}> {
  const out: Array<{
    floor: number;
    heightM: number;
    legacyM: number;
    revisedM: number;
    gainM: number;
  }> = [];
  const ceil = Math.ceil(floors);
  for (let i = 0; i < ceil; i++) {
    const h = (i + 1) * floorHeightM;
    const legacyM = requiredSetbackM(h, "legacy");
    const revisedM = requiredSetbackM(h, "revised");
    out.push({
      floor: i + 1,
      heightM: h,
      legacyM,
      revisedM,
      gainM: Math.max(0, legacyM - revisedM),
    });
  }
  return out;
}
