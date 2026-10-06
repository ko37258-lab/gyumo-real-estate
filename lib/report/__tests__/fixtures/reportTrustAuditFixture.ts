// 신뢰도 검수 지시서(docs/report-trust-audit-20261006.md) E1 표본 fixture.
//
// 원칙: 손으로 ReportInputs를 통째로 베껴 쓰지 않는다. 실제 zustand 스토어(시뮬레이터·비용·
// 사업성·지번 조회)에 표본 값을 그대로 넣고, 화면·PDF가 쓰는 것과 동일한 buildReportInputs()를
// 그대로 호출한다 — computePlan·finance.ts를 고치면 이 fixture의 출력도 자동으로 따라 바뀐다
// (수정 전/후를 같은 코드 경로로 비교하기 위함).
//
// 표본 스펙(지시서 E1 그대로): 대지 394.8㎡ · 일반상업지역 · 건폐 60%/용적 800% ·
// 층고 3.5/3.5 · 업무시설 · 주차 100㎡당 1대(서울 조례) · 전량 지하 · 공사비 850만/평 ·
// 지하 150% · 토지 평당 4,000만(기본값) · 분양 4,500만/평(기본값) · 분양률 90% ·
// LTC 60% · 금리 6% · 사업기간 18개월 · 공시지가 90,770,000원/㎡ ·
// 실거래 추정 ratioToJiga 1.57배(5건) · 토지이용계획 9개 · 도로접면 광대세각 · 형상 사다리형.
//
// 이 파일은 거의 전부 스토어 "기본값"만으로 재현된다 — 실제 감사 대상 PDF도
// 지번 조회 한 번 외에는 아무 것도 손대지 않은 기본 상태에서 나온 것이었기 때문.

import { useSimulatorStore } from "@/store/simulator";
import { useCostStore } from "@/store/cost";
import { useProfitStore } from "@/store/profit";
import { useMarketStore } from "@/store/market";
import { useLandInfoStore } from "@/store/landinfo";
import { useUsePricesStore } from "@/store/useprices";
import type { ReportInputs, ReportLandInfo, AIAnalysis } from "@/lib/ai/types";

export const FIXTURE_ADDRESS = "서울특별시 강남구 역삼동 825-3";
const FIXTURE_PNU = "1168010100108250003";
const LAND_AREA_SQM = 394.8;
const PUBLIC_PRICE_PER_SQM = 90_770_000;
const JIGA_TOTAL = PUBLIC_PRICE_PER_SQM * LAND_AREA_SQM;
const RATIO_TO_JIGA = 1.57;
const ESTIMATED_PRICE = Math.round(JIGA_TOTAL * RATIO_TO_JIGA);

/** 지시서 E1의 "토지이용계획 9개" — 순서 그대로. */
export const FIXTURE_USE_ATTRS = [
  "대공방어협조구역",
  "(한강)폐기물매립시설 설치제한지역(저촉)",
  "도시지역",
  "일반상업지역",
  "지구단위계획구역",
  "과밀억제권역",
  "토지거래계약에관한허가구역",
  "리모델링지구",
  "가로구역별 최고높이 제한지역",
];

function buildLandInfo(): ReportLandInfo {
  return {
    address: FIXTURE_ADDRESS,
    pnu: FIXTURE_PNU,
    fetchedAt: "2026-10-05",
    areaSqm: LAND_AREA_SQM,
    jimok: "대",
    zone: "일반상업지역",
    publicPricePerSqm: PUBLIC_PRICE_PER_SQM,
    publicPriceYear: 2026,
    roadSide: "광대세각",
    landShape: "사다리형",
    useAttrs: FIXTURE_USE_ATTRS,
    landTrades: {
      sampleCount: 5,
      periodMonths: 12,
      basis: "같은 법정동 · 건축지목",
      medianUnitWon: Math.round(ESTIMATED_PRICE / LAND_AREA_SQM),
      estimatedPrice: ESTIMATED_PRICE,
      jigaTotal: Math.round(JIGA_TOTAL),
      ratioToJiga: RATIO_TO_JIGA,
    },
  };
}

/** 모든 store를 리셋하고 표본 입력을 채운다. buildReportInputs()를 호출하기 직전에 쓸 것. */
export function primeStoresWithFixture(): void {
  useCostStore.getState().reset();
  useProfitStore.getState().reset();
  useMarketStore.getState().setMarket(null, null);
  useUsePricesStore.getState().clear();

  // 지번 조회 결과 그대로 반영 — covPct/farPct는 zone의 법정 상한(60%/800%)으로 자동 설정되고,
  // parkingAreaPerSpace는 lawdCd(11680xx, 서울)로 서울 조례값(100㎡/대)이 자동 적용된다.
  useSimulatorStore.getState().applyLotInfo({
    address: FIXTURE_ADDRESS,
    lotSqm: LAND_AREA_SQM,
    zone: "ilsang",
    roadM: 6,
    source: "vworld",
    pnu: FIXTURE_PNU,
    publicPricePerSqm: PUBLIC_PRICE_PER_SQM,
    publicPriceYear: 2026,
  });

  useLandInfoStore.getState().setLandInfo(buildLandInfo());
}

/** 고정 AI 분석 텍스트 — 실제 API 호출 없이 "분석 완료" 경로를 렌더하기 위한 것.
 *  올바른 용어(LTC)와 본문에 실제로 있는 수치만 인용하는 "모범 응답" 형태로 작성한다
 *  (잘못된 응답을 재현하는 게 목적이 아니라, AI 단계가 있어도 템플릿이 깨지지 않는지 보는 것). */
export function buildFixtureAnalysis(): AIAnalysis {
  return {
    summary:
      "일반상업지역 업무시설 기준 이론상 연면적은 약 3,158㎡이며, 지구단위계획·과밀억제권역 등 확인 전 항목이 남아 있어 사업성은 판정 보류 상태입니다. 토지가·분양가가 초기 기본값이라 실제 매입·분양 조건 확인이 선행되어야 합니다.",
    risks: [
      "토지 평당가가 초기 기본값(4,000만원)으로, 실거래 추정가와 큰 차이가 있을 수 있습니다.",
      "지구단위계획구역 포함으로 기준·허용·상한 용적률이 입력값과 다를 수 있습니다.",
      "과밀억제권역 포함으로 취득세 중과 가능성이 있어 토지 취득부대비 재검토가 필요합니다.",
    ],
    recommendations: [
      "관할 구청에서 지구단위계획 지침(용적률·높이·건축선)을 확인하세요.",
      "인근 실거래 기반 추정 토지가를 반영해 사업성을 재계산하세요.",
      "업무시설 분양가·임대가 비교사례를 확보해 분양가 가정을 검증하세요.",
    ],
    costAdequacy:
      "건축·부대비 평당 단가는 입력한 공사비(850만원/평)를 기준으로 산출됐습니다. 지하 전량 배치로 지하 공사비 비중이 커서, 지상 주차 전환 여지가 있는지 검토가 필요합니다.",
    nextSteps: [
      "지구단위계획 수립 현황 열람(관할 구청)",
      "토지 실거래 기반 추정가로 사업성 재산정",
      "업무시설 분양·임대 비교사례 확보",
    ],
    oneLiner: "토지가·분양가 가정 확인 전 — 판정 보류",
    provider: "gemini",
    generatedAt: "2026-10-05T09:00:00.000Z",
  };
}

/** buildReportInputs()를 직접 호출해 ReportInputs를 만든다. 호출 전 primeStoresWithFixture() 필요.
 *  3D 매스·위치도는 실제 브라우저 캡쳐 없이는 만들 수 없어 회색 placeholder PNG로 채운다
 *  (E1 — "3D/위치도 이미지는 회색 placeholder PNG"). 이 섹션들이 레이아웃 테스트 대상이라
 *  이미지가 없으면 조건부 렌더 분기 자체가 빠져 검증이 안 된다. */
export async function buildFixtureReportInputs(): Promise<ReportInputs> {
  const { buildReportInputs } = await import("@/lib/report/buildInput");
  const { buildGrayPngDataUrl } = await import("./grayPng");
  const input = buildReportInputs();
  input.visualization3D = buildGrayPngDataUrl(480, 320);
  input.visualization3DViews = {
    iso: buildGrayPngDataUrl(480, 320),
    south: buildGrayPngDataUrl(320, 240),
    north: buildGrayPngDataUrl(320, 240),
  };
  input.locationMap = buildGrayPngDataUrl(320, 320);
  return input;
}
