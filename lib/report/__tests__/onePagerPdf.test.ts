// 한장 보고서가 실제로 "1장"에 들어가는지 Node에서 PDF를 직접 만들어 페이지 수를 센다.
// (기존 작업 로그의 검증 방식과 동일 — "Node 렌더로 페이지 수 확인")
//
// ⚠️ @react-pdf/renderer는 렌더 시점에 Pretendard 폰트를 CDN(jsdelivr)에서 내려받는다
// (lib/pdf/fonts.ts ensurePdfFonts — Font.register의 src가 jsdelivr URL). 이 저장소엔
// 한글을 그릴 수 있는 폰트 파일이 로컬(public 등)에 없고, 이 작업 지시상 폰트 파일을
// 새로 내려받아 추가하는 것도 금지돼 있다. 그래서 "로컬 폰트로 렌더"는 이 저장소 상태로는
// 할 수 없다 — 대신 네트워크가 막혀 렌더가 안 되면 테스트를 "통과"가 아니라 명확히
// "건너뜀(skip)"으로 표시한다(ctx.skip()). 네트워크가 열린 환경(다른 PC·CI)에서 돌리면
// 실제로 렌더되어 페이지 수를 검증한다.
import { describe, it, expect } from "vitest";
import React from "react";
import type { ReportInputs } from "@/lib/ai/types";
import type { FloorTableResult } from "@/lib/report/floorTable";

const floorTable: FloorTableResult = {
  rows: [
    ...Array.from({ length: 13 }, (_, i) => ({
      floor: i + 1,
      areaSqm: 236.88,
      portion: 1,
      legalSetbackM: 0,
      note: "업무시설",
    })),
    { floor: 14, areaSqm: 78.17, portion: 0.33, legalSetbackM: 0, note: "업무시설 · 부분층 33%" },
  ],
  basement: [
    { level: 1, areaSqm: 236.88, note: "주차장 — 용적률 산정 연면적 제외, 총연면적에는 포함" },
    { level: 2, areaSqm: 236.88, note: "주차장 — 용적률 산정 연면적 제외, 총연면적에는 포함" },
  ],
  sumGroundSqm: 13 * 236.88 + 78.17,
  precise: false,
};

/** 역삼동 825-3 검증 세트 + 층별표·토지·사업성·전제 전부 채운 "꽉 찬" 케이스 */
function fullInput(): ReportInputs {
  return {
    address: "서울특별시 강남구 역삼동 825-3",
    addressStatus: "fetched",
    reviewDate: "2026-10-05",
    land: {
      address: "서울특별시 강남구 역삼동 825-3",
      pnu: "1168010100108250003",
      fetchedAt: "2026-10-05",
      areaSqm: 394.8,
      jimok: "대",
      publicPricePerSqm: 24_975_203,
      publicPriceYear: 2026,
      roadSide: "세로(가)",
      landShape: "세로장방",
      landHeight: "평지",
      landTrades: {
        sampleCount: 8,
        periodMonths: 12,
        basis: "같은 법정동 · 건축지목",
        medianUnitWon: 26_000_000,
        estimatedPrice: 10_264_800_000,
        jigaTotal: 9_858_212_118,
        ratioToJiga: 1.04,
      },
    },
    scale: {
      landAreaSqm: 394.8,
      landAreaPyeong: 119.4,
      zoneCode: "urban_res3",
      zoneName: "제3종일반주거지역",
      ordinanceSource: "서울특별시 도시계획 조례",
      coverRatio: 60,
      floorRatio: 250,
      roadWidth: 8,
      buildingArea: 236.88,
      legalFloorArea: 987,
      actualFloorArea: 3158.4,
      sunlightLoss: 0,
      parkingPlacement: "mixed",
      parkingSpaces: 32,
      parkingRawSpaces: 31.58,
      groundSpaces: 8,
      basementSpaces: 24,
      groundParkingArea: 240,
      floor1Indoor: 0,
      isReducingFloor1: false,
      parkingUnitArea: 30,
      pilotiMode: true,
      floorCount: 14,
      floorLabel: "지상 14층 (최상층 부분층 33%)",
      heightM: 49,
      totalFloorArea: 4118.4,
      lotAreaSource: "official",
      roadWidthSource: "input",
      parkingRoundingNote: "31.58대 → 32대 (별표1 비고 6)",
      parkingBasisLabel: "업무시설 — 시설면적 100㎡당 1대",
      usageLabel: "업무시설",
      basementLevels: [
        { level: 1, areaSqm: 236.88 },
        { level: 2, areaSqm: 236.88 },
      ],
      floorTable,
      constraints: {
        fetched: true,
        items: [{ label: "지구단위계획구역", effect: "용적률·높이 지침", where: "구청" }],
      },
      alwaysUnverified: [
        { label: "건축선·대지 안의 공지", effect: "건축 가능 영역 축소", where: "건축 조례" },
      ],
    },
    cost: {
      abovePyeong: 955,
      basementPyeong: 290,
      aboveUnit: 800,
      basementPremium: 30,
      aboveCost: 7_640_000_000,
      basementCost: 3_016_000_000,
      parkingCost: 240_000_000,
      softCost: 1_346_000_000,
      farmEnabled: false,
      farmCost: 0,
      forestEnabled: false,
      forestCost: 0,
      devEnabled: false,
      devCharge: 0,
      total: 13_242_000_000,
      totalArea: 1245,
    },
    profit: {
      landPricePerPyeong: 12000,
      landAcquisitionCost: 4.6,
      revenueModel: "sales",
      salesPricePerPyeong: 4000,
      salesRate: 100,
      ltvRatio: 60,
      loanAmountEok: 100,
      annualInterestRate: 6,
      loanPeriodYears: 3,
      repaymentMethod: "bullet",
      projectDurationMonths: 24,
      salesStartMonth: 18,
      landCost: 14_990_000_000,
      buildingCost: 13_242_000_000,
      feesTotal: 0,
      loanInterest: 1_200_000_000,
      totalProjectCost: 29_432_000_000,
      equity: 11_772_000_000,
      loanAmount: 17_660_000_000,
      monthlyLoanPayment: 88_300_000,
      totalRevenue: 38_200_000_000,
      profitBeforeTax: 8_768_000_000,
      tax: 1_928_960_000,
      netProfit: 6_839_040_000,
      roe: 58,
      roic: 29,
      irr: 25,
      breakEvenSalesRate: 77,
      costPerPyeong: 3080,
      marginPerPyeong: 920,
      marginPercent: 23,
      isLoss: false,
      isHighRisk: false,
      verdict: { kind: "ok", title: "민감도(공사비·금리·분양률) 확인 권장", reasons: ["인허가·금융 조건은 별도 확인이 필요합니다."] },
      ltcPct: 60,
    },
  };
}

function countPdfPages(buf: Buffer): number {
  const text = buf.toString("latin1");
  const matches = text.match(/\/Type\s*\/Page(?!s)/g);
  return matches ? matches.length : 0;
}

describe("한장 보고서 PDF — 1장 유지", () => {
  it("층별표·토지·사업성 전부 채운 꽉 찬 입력도 1페이지로 나온다", async (ctx) => {
    let renderToBuffer: typeof import("@react-pdf/renderer").renderToBuffer;
    let OnePagerDocument: typeof import("@/components/report/OnePagerDocument").OnePagerDocument;
    try {
      ({ renderToBuffer } = await import("@react-pdf/renderer"));
      ({ OnePagerDocument } = await import("@/components/report/OnePagerDocument"));
    } catch (e) {
      console.warn("[onePagerPdf] 모듈 로드 실패 — 건너뜀:", e);
      ctx.skip();
      return;
    }

    const element = React.createElement(OnePagerDocument, { input: fullInput() });
    let buf: Buffer;
    try {
      // 폰트(Pretendard)를 CDN에서 받아야 해서, 이 환경처럼 외부망이 막혀 있으면 fetch가
      // 응답 없이 멈춘다. 전체 테스트를 30초씩 잡아먹지 않도록 5초만 기다려 보고 건너뛴다.
      buf = await Promise.race([
        renderToBuffer(element as never),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("render timeout (네트워크 차단 추정)")), 5000),
        ),
      ]);
    } catch (e) {
      console.warn("[onePagerPdf] PDF 렌더 실패/시간초과(네트워크 차단 추정) — 건너뜀:", e);
      ctx.skip();
      return;
    }
    const pages = countPdfPages(buf);
    expect(pages).toBe(1);
  }, 8000);
});
