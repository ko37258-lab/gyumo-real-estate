import { describe, it, expect } from "vitest";
import {
  checkReportConsistency,
  estimateRoadWidthFromRoadSide,
  sunlightSectionAllowed,
  capVerdictConfirmable,
} from "@/lib/report/consistency";
import type { ReportInputs } from "@/lib/ai/types";

function baseInput(): ReportInputs {
  return {
    reviewDate: "2026-10-06",
    scale: {
      landAreaSqm: 394.8,
      landAreaPyeong: 119.4,
      zoneCode: "ilsang",
      zoneName: "일반상업지역",
      coverRatio: 60,
      floorRatio: 800,
      roadWidth: 6,
      roadWidthSource: "assumed",
      buildingArea: 236.88,
      legalFloorArea: 3158.4,
      actualFloorArea: 3158.4,
      sunlightLoss: 0,
      sunlightApplied: false,
      parkingPlacement: "basement",
      parkingSpaces: 32,
      groundSpaces: 0,
      basementSpaces: 32,
      groundParkingArea: 0,
      floor1Indoor: 236.88,
      isReducingFloor1: false,
      parkingUnitArea: 30,
      pilotiMode: true,
      basementLevels: [
        { level: 1, areaSqm: 236.88 },
        { level: 2, areaSqm: 236.88 },
        { level: 3, areaSqm: 236.88 },
        { level: 4, areaSqm: 236.88 },
        { level: 5, areaSqm: 12.48 },
      ],
    },
    cost: {
      abovePyeong: 955,
      basementPyeong: 290,
      aboveUnit: 850,
      basementPremium: 150,
      aboveCost: 8_117_500_000,
      basementCost: 3_698_000_000,
      parkingCost: 384_000_000,
      softCost: 1_457_940_000,
      farmEnabled: false,
      farmCost: 0,
      forestEnabled: false,
      forestCost: 0,
      devEnabled: false,
      devCharge: 0,
      total: 13_657_440_000,
      totalArea: 1245,
    },
  };
}

describe("checkReportConsistency — C4 규칙 5종", () => {
  it("1) 기본값 토지가인데 실거래 추정과 3배 이상 차이면 block", () => {
    const input = baseInput();
    input.land = {
      address: "x",
      pnu: "x",
      fetchedAt: "2026-10-05",
      areaSqm: 394.8,
      landTrades: {
        sampleCount: 5,
        periodMonths: 12,
        basis: "x",
        medianUnitWon: 142_800_000,
        estimatedPrice: 56_390_000_000,
        jigaTotal: 35_836_000_000,
        ratioToJiga: 1.57,
      },
    };
    input.profit = minimalProfit({ landPriceSource: "default", landPricePerPyeong: 4000, landCost: 5_016_000_000 });
    const warnings = checkReportConsistency(input);
    expect(warnings.some((w) => w.rule === "default-land-price-divergence")).toBe(true);
  });

  it("실거래 추정과 3배 미만 차이면 통과", () => {
    const input = baseInput();
    input.land = {
      address: "x",
      pnu: "x",
      fetchedAt: "2026-10-05",
      areaSqm: 394.8,
      landTrades: {
        sampleCount: 5,
        periodMonths: 12,
        basis: "x",
        medianUnitWon: 1,
        estimatedPrice: 6_000_000_000,
        jigaTotal: 3_500_000_000,
        ratioToJiga: 1.57,
      },
    };
    input.profit = minimalProfit({ landPriceSource: "default", landPricePerPyeong: 4000, landCost: 5_016_000_000 });
    const warnings = checkReportConsistency(input);
    expect(warnings.some((w) => w.rule === "default-land-price-divergence")).toBe(false);
  });

  it("2) sunlightApplied=false 인데 손실·비교 데이터가 있으면 block", () => {
    const input = baseInput();
    input.scale.sunlightApplied = false;
    input.scale.sunlightLoss = 12.3;
    const warnings = checkReportConsistency(input);
    expect(warnings.some((w) => w.rule === "sunlight-flag-mismatch")).toBe(true);
    expect(sunlightSectionAllowed(input.scale)).toBe(false);
  });

  it("sunlightApplied=true 면 가드 통과", () => {
    const input = baseInput();
    input.scale.sunlightApplied = true;
    input.scale.sunlightLoss = 5;
    expect(sunlightSectionAllowed(input.scale)).toBe(true);
    expect(checkReportConsistency(input).some((w) => w.rule === "sunlight-flag-mismatch")).toBe(false);
  });

  it("3) 도로접면 코드(광대)와 가정 폭(6m)이 어긋나면 warn", () => {
    const input = baseInput();
    input.land = { address: "x", pnu: "x", fetchedAt: "2026-10-05", areaSqm: 394.8, roadSide: "광대세각" };
    const warnings = checkReportConsistency(input);
    expect(warnings.some((w) => w.rule === "road-width-mismatch")).toBe(true);
  });

  it("도로 폭을 사용자가 직접 입력했으면 모순 검사를 건너뛴다", () => {
    const input = baseInput();
    input.scale.roadWidthSource = "input";
    input.land = { address: "x", pnu: "x", fetchedAt: "2026-10-05", areaSqm: 394.8, roadSide: "광대세각" };
    const warnings = checkReportConsistency(input);
    expect(warnings.some((w) => w.rule === "road-width-mismatch")).toBe(false);
  });

  it("estimateRoadWidthFromRoadSide — 등급별 하한 폭", () => {
    expect(estimateRoadWidthFromRoadSide("광대세각")).toBe(25);
    expect(estimateRoadWidthFromRoadSide("중로한면")).toBe(12);
    expect(estimateRoadWidthFromRoadSide("소로각지")).toBe(8);
    expect(estimateRoadWidthFromRoadSide("세로(가)")).toBe(4);
    expect(estimateRoadWidthFromRoadSide("맹지")).toBe(0);
    expect(estimateRoadWidthFromRoadSide(undefined)).toBeNull();
  });

  it("4) 지하 마지막 층이 다른 층 평균의 절반 미만이면 warn (B5 12.48㎡류)", () => {
    const input = baseInput(); // basementLevels 마지막 12.48㎡ vs 평균 236.88㎡
    const warnings = checkReportConsistency(input);
    expect(warnings.some((w) => w.rule === "basement-last-level-too-small")).toBe(true);
  });

  it("지하층 면적이 고르면(수정 후 로직) warn 없음", () => {
    const input = baseInput();
    input.scale.basementLevels = [
      { level: 1, areaSqm: 335.58 },
      { level: 2, areaSqm: 335.58 },
      { level: 3, areaSqm: 335.58 },
    ];
    const warnings = checkReportConsistency(input);
    expect(warnings.some((w) => w.rule === "basement-last-level-too-small")).toBe(false);
  });

  it("5) 대출 비율 라벨과 총사업비(이자포함) 대비 실제 비율이 1%p 넘게 어긋나면 warn", () => {
    const input = baseInput();
    // 192.44억 총사업비, 이자 9.86억 제외 182.58억의 60% = 109.55억 대출 → 라벨 60%
    // 192.44억 대비 실제 비율 = 109.55/192.44 ≈ 56.9%
    input.profit = minimalProfit({
      ltcPct: 60,
      loanAmount: 10_955_000_000,
      totalProjectCost: 19_244_000_000,
    });
    const warnings = checkReportConsistency(input);
    expect(warnings.some((w) => w.rule === "loan-ratio-label-mismatch")).toBe(true);
  });

  it("라벨과 실제 비율이 1%p 이내면 통과", () => {
    const input = baseInput();
    input.profit = minimalProfit({ ltcPct: 60, loanAmount: 6_000_000_000, totalProjectCost: 10_000_000_000 });
    const warnings = checkReportConsistency(input);
    expect(warnings.some((w) => w.rule === "loan-ratio-label-mismatch")).toBe(false);
  });

  it("capVerdictConfirmable — 지구단위계획구역 미확인 시 false", () => {
    const input = baseInput();
    input.scale.constraints = { fetched: true, items: [{ label: "지구단위계획구역", effect: "x", where: "x" }] };
    expect(capVerdictConfirmable(input.scale)).toBe(false);
    input.scale.constraints = { fetched: true, items: [] };
    expect(capVerdictConfirmable(input.scale)).toBe(true);
  });
});

function minimalProfit(overrides: Partial<NonNullable<ReportInputs["profit"]>>): NonNullable<ReportInputs["profit"]> {
  return {
    landPricePerPyeong: 4000,
    landAcquisitionCost: 5,
    revenueModel: "sales",
    salesPricePerPyeong: 4500,
    salesRate: 90,
    ltvRatio: 60,
    loanAmountEok: 60,
    annualInterestRate: 6,
    loanPeriodYears: 3,
    repaymentMethod: "bullet",
    projectDurationMonths: 18,
    salesStartMonth: 0,
    landCost: 5_016_000_000,
    buildingCost: 13_242_000_000,
    feesTotal: 0,
    loanInterest: 986_000_000,
    totalProjectCost: 19_244_000_000,
    equity: 8_289_000_000,
    loanAmount: 10_955_000_000,
    monthlyLoanPayment: 0,
    totalRevenue: 0,
    profitBeforeTax: 0,
    tax: 0,
    netProfit: 0,
    roe: 0,
    roic: 0,
    irr: 0,
    breakEvenSalesRate: 0,
    costPerPyeong: 0,
    marginPerPyeong: 0,
    marginPercent: 0,
    isLoss: false,
    isHighRisk: false,
    landPriceSource: "default",
    salesPriceSource: "default",
    ...overrides,
  };
}
