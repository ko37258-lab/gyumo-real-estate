import { describe, it, expect } from "vitest";
import { buildUserPrompt, SYSTEM_PROMPT } from "@/lib/ai/prompts";
import type { ReportInputs } from "@/lib/ai/types";

function minimalInput(): ReportInputs {
  return {
    reviewDate: "2026-10-06",
    scale: {
      landAreaSqm: 394.8,
      landAreaPyeong: 119.4,
      zoneCode: "ilsang",
      zoneName: "일반상업지역",
      coverRatio: 60,
      floorRatio: 800,
      roadWidth: 25,
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
    },
    cost: {
      abovePyeong: 955,
      basementPyeong: 304.6,
      aboveUnit: 850,
      basementPremium: 150,
      aboveCost: 8_117_500_000,
      basementCost: 3_883_650_000,
      parkingCost: 384_000_000,
      softCost: 1_490_000_000,
      farmEnabled: false,
      farmCost: 0,
      forestEnabled: false,
      forestCost: 0,
      devEnabled: false,
      devCharge: 0,
      total: 13_875_150_000,
      totalArea: 1259.6,
    },
    profit: {
      landPricePerPyeong: 4000,
      landAcquisitionCost: 5,
      revenueModel: "sales",
      salesPricePerPyeong: 4500,
      salesRate: 90,
      ltvRatio: 60,
      loanAmountEok: 109.55,
      annualInterestRate: 6,
      loanPeriodYears: 3,
      repaymentMethod: "bullet",
      projectDurationMonths: 18,
      salesStartMonth: 0,
      landCost: 5_016_000_000,
      buildingCost: 13_875_150_000,
      feesTotal: 0,
      loanInterest: 986_000_000,
      totalProjectCost: 19_244_000_000,
      equity: 8_289_000_000,
      loanAmount: 10_955_000_000,
      monthlyLoanPayment: 0,
      totalRevenue: 20_000_000_000,
      profitBeforeTax: 756_000_000,
      tax: 166_320_000,
      netProfit: 589_680_000,
      roe: 7.1,
      roic: 3.1,
      irr: 5,
      breakEvenSalesRate: 85,
      costPerPyeong: 2014,
      marginPerPyeong: 100,
      marginPercent: 2.5,
      isLoss: false,
      isHighRisk: true,
      ltcPct: 56.9,
      landPriceSource: "default",
      salesPriceSource: "default",
      verdict: {
        kind: "hold",
        title: "주요 가정 확인 전",
        reasons: ["평당 토지가 4,000만원은 초기 기본값입니다 — 실제 매입가(또는 매도 호가)를 입력하세요."],
      },
    },
  };
}

describe("buildUserPrompt — A11/A12 regression", () => {
  it("LTV 대신 LTC 로만 표기한다", () => {
    const prompt = buildUserPrompt(minimalInput());
    expect(prompt).not.toContain("LTV");
    expect(prompt).toContain("LTC");
  });

  it("판정 보류 사유를 프롬프트에 그대로 전달한다", () => {
    const prompt = buildUserPrompt(minimalInput());
    expect(prompt).toContain("판정 보류");
    expect(prompt).toContain("초기 기본값입니다");
  });

  it("시스템 프롬프트가 본문 외 수치 인용 금지·LTC 용어·평 재계산 금지를 명시한다", () => {
    expect(SYSTEM_PROMPT).toContain("지어내");
    expect(SYSTEM_PROMPT).toContain("LTC");
    // "LTV"는 "그 용어를 쓰지 말라"는 설명(금지 규칙 자체 + 정의 비교)에서만 등장해야 하고,
    // ROE·리스크·추천 등 실제 지표 가이드 문구에는 전혀 남아 있지 않아야 한다.
    const ltvCount = (SYSTEM_PROMPT.match(/LTV/g) ?? []).length;
    expect(ltvCount).toBe(2);
    expect(SYSTEM_PROMPT).toContain('"LTV"라는 용어를 쓰지 말 것');
  });
});
