// 출력 전 자동 일관성 검사 — docs/report-trust-audit-20261006.md C4.
//
// ReportInputs(= 화면·PDF가 쓰는 값)만 보고 "이 보고서를 그대로 내보내도 되는가"를 점검한다.
// 계산을 다시 하지 않는다 — 이미 계산된 값들 사이에 모순이 있는지만 본다.
// ReportDocument는 이 모듈의 가드 함수(shouldShowSunlightSection 등)를 그대로 써서,
// "조건을 어디서 어떻게 판단하는지"가 템플릿 곳곳에 흩어지지 않고 한 곳에 모이게 한다.

import type { ReportInputs } from "@/lib/ai/types";

export type ConsistencyLevel = "block" | "warn";

export interface ConsistencyWarning {
  rule: string;
  level: ConsistencyLevel;
  message: string;
}

/** 도로접면 코드(광대/중로/소로/세로/맹지) → 토지가격비준표 통용 하한 폭(m). 모르는 코드는 null. */
export function estimateRoadWidthFromRoadSide(roadSide?: string | null): number | null {
  if (!roadSide) return null;
  if (roadSide.includes("맹지")) return 0;
  if (roadSide.includes("광대")) return 25;
  if (roadSide.includes("중로")) return 12;
  if (roadSide.includes("소로")) return 8;
  if (roadSide.includes("세로")) return 4;
  return null;
}

/** 정북 일조 섹션(단면도·법규표의 "적용" 표기·북측 일조 진단 등 강한 법적 주장)을 보여줘도 되는가.
 *  sunlightApplied=false 인 용도지역에서 "일조 사선이 반영됐다"는 문구를 내보내지 않도록
 *  템플릿이 전부 이 함수 하나만 참조한다. */
export function sunlightSectionAllowed(scale: ReportInputs["scale"]): boolean {
  return Boolean(scale.sunlightApplied);
}

/** 용적률·건폐율을 "상한 이내"로 확정해도 되는가 — 지구단위계획구역 등 상한 자체가
 *  달라질 수 있는 미확인 규제가 남아 있으면 확정 판정을 내리지 않는다. */
export function capVerdictConfirmable(scale: ReportInputs["scale"]): boolean {
  const items = scale.constraints?.items ?? [];
  return !items.some((c) => c.label === "지구단위계획구역");
}

const LOAN_RATIO_TOLERANCE_PCT = 1;
const LAND_PRICE_DIVERGENCE_RATIO = 3;
const ROAD_WIDTH_TOLERANCE_M = 0.5;

export function checkReportConsistency(input: ReportInputs): ConsistencyWarning[] {
  const out: ConsistencyWarning[] = [];
  const s = input.scale;
  const p = input.profit;
  const land = input.land;

  // 1) 기본값 토지가인데 실거래 추정과 3배 이상 차이 — C1 게이트 발동 조건
  if (p && land?.landTrades && p.landPriceSource === "default" && p.landCost > 0) {
    const ratio = land.landTrades.estimatedPrice / p.landCost;
    if (ratio >= LAND_PRICE_DIVERGENCE_RATIO || ratio <= 1 / LAND_PRICE_DIVERGENCE_RATIO) {
      out.push({
        rule: "default-land-price-divergence",
        level: "block",
        message: `토지가가 초기 기본값(평당 ${p.landPricePerPyeong.toLocaleString("ko-KR")}만원)인데 실거래 기반 추정가와 ${ratio.toFixed(1)}배 차이가 있습니다 — 사업성 판정 확정 금지(판정 보류).`,
      });
    }
  }

  // 2) sunlightApplied=false 인데 일조 손실·비교 데이터가 섞여 있으면 차단
  if (!s.sunlightApplied && (s.sunlightLoss > 0.01 || s.sunlightCompare)) {
    out.push({
      rule: "sunlight-flag-mismatch",
      level: "block",
      message: "정북 일조 미적용 용도지역인데 일조 손실·개정 전후 비교 데이터가 존재합니다 — sunlightApplied 가드를 거치지 않은 출력이 있는지 확인하세요.",
    });
  }

  // 3) 도로접면 코드와 전면도로 가정 폭 모순
  const roadSideWidth = estimateRoadWidthFromRoadSide(land?.roadSide);
  if (s.roadWidthSource !== "input" && roadSideWidth != null && Math.abs(s.roadWidth - roadSideWidth) > ROAD_WIDTH_TOLERANCE_M) {
    out.push({
      rule: "road-width-mismatch",
      level: "warn",
      message: `도로접면(${land?.roadSide}) 기준 통상 폭은 약 ${roadSideWidth}m인데 전면도로 가정값은 ${s.roadWidth}m입니다 — 가정값을 도로접면 코드 기준으로 갱신하세요.`,
    });
  }

  // 4) 지하 마지막 층 바닥면적이 다른 지하층 평균의 50% 미만 — 비현실적 잔여층
  const levels = s.basementLevels ?? [];
  if (levels.length >= 2) {
    const last = levels[levels.length - 1];
    const others = levels.slice(0, -1);
    const othersAvg = others.reduce((sum, l) => sum + l.areaSqm, 0) / others.length;
    if (othersAvg > 0 && last.areaSqm < othersAvg * 0.5) {
      out.push({
        rule: "basement-last-level-too-small",
        level: "warn",
        message: `지하 마지막 층(B${last.level}) 면적 ${last.areaSqm.toFixed(1)}㎡이 다른 지하층 평균(${othersAvg.toFixed(1)}㎡)의 절반 미만입니다 — 지하 바닥 산정 기준을 재검토하세요.`,
      });
    }
  }

  // 5) 대출 비율 라벨(LTC, 이자 제외 기준)과 총사업비(이자 포함) 대비 실제 비율의 차이
  if (p) {
    const labeledPct = p.ltcPct ?? p.ltvRatio;
    const actualPctOfTotalProjectCost = p.totalProjectCost > 0 ? (p.loanAmount / p.totalProjectCost) * 100 : 0;
    if (Math.abs(labeledPct - actualPctOfTotalProjectCost) > LOAN_RATIO_TOLERANCE_PCT) {
      out.push({
        rule: "loan-ratio-label-mismatch",
        level: "warn",
        message: `대출 비율 라벨 ${labeledPct.toFixed(1)}%(이자 제외 사업비 기준)와 총사업비(이자 포함) 대비 실제 비율 ${actualPctOfTotalProjectCost.toFixed(1)}%의 차이가 ${LOAN_RATIO_TOLERANCE_PCT}%p를 넘습니다 — 라벨에 기준을 함께 표기하세요.`,
      });
    }
  }

  return out;
}
