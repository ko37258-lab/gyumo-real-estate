import { describe, it, expect } from "vitest";
import { buildOnePagerFields, eok } from "@/lib/report/onePager";
import type { ReportInputs } from "@/lib/ai/types";

/** 역삼동 825-3 검증 세트(2026-09-18)에 가까운 값 */
function makeInput(over: Partial<ReportInputs> = {}): ReportInputs {
  const base: ReportInputs = {
    address: "서울특별시 강남구 역삼동 825-3",
    reviewDate: "2026-09-21",
    scale: {
      landAreaSqm: 394.8,
      landAreaPyeong: 119.4,
      zoneCode: "urban_res3",
      zoneName: "제3종일반주거지역",
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
      basementLevels: [
        { level: 1, areaSqm: 236.88 },
        { level: 2, areaSqm: 236.88 },
      ],
      constraints: { fetched: true, items: [] },
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
  };
  return { ...base, ...over, scale: { ...base.scale, ...(over.scale ?? {}) } };
}

describe("buildOnePagerFields", () => {
  it("주소가 제목, 용도지역·대지면적·건폐/용적이 부제로 들어간다", () => {
    const f = buildOnePagerFields(makeInput());
    expect(f.title).toBe("서울특별시 강남구 역삼동 825-3");
    expect(f.subtitle).toContain("제3종일반주거지역");
    expect(f.subtitle).toContain("394.8㎡");
    expect(f.subtitle).toContain("건폐율 60% · 용적률 250%");
  });

  it("주소가 없으면 '주소 미입력'", () => {
    const f = buildOnePagerFields(makeInput({ address: undefined }));
    expect(f.title).toBe("주소 미입력");
  });

  it("핵심 4칸은 규모검토 값을 그대로 쓴다(재계산 없음)", () => {
    const f = buildOnePagerFields(makeInput());
    expect(f.kpis).toHaveLength(4);
    expect(f.kpis[0].value).toBe("236.9㎡");
    expect(f.kpis[1].value).toBe("3,158.4㎡");
    expect(f.kpis[2].value).toBe("지상 14층 (최상층 부분층 33%)");
    expect(f.kpis[3].value).toBe("32대");
    expect(f.kpis[3].sub).toContain("31.58대 → 32대");
  });

  it("연면적은 '추정'으로만 표기한다(확정형 금지)", () => {
    const f = buildOnePagerFields(makeInput());
    expect(f.kpis[1].label).toContain("추정");
    expect(f.scaleRows.some((r) => r.label.includes("입력 조건 기준 추정 연면적"))).toBe(true);
  });

  it("대지면적 기본값·도로 폭 가정은 '확인 전 전제'로 내려간다", () => {
    const f = buildOnePagerFields(
      makeInput({ scale: { lotAreaSource: "default", roadWidthSource: "assumed" } as never }),
    );
    expect(f.cautions.some((c) => c.includes("대지면적이 기본값"))).toBe(true);
    expect(f.cautions.some((c) => c.includes("도로 폭"))).toBe(true);
  });

  it("토지이용계획 미조회면 그대로 '미조회'라고 쓴다", () => {
    const f = buildOnePagerFields(
      makeInput({ scale: { constraints: { fetched: false, items: [] } } as never }),
    );
    expect(f.cautions).toContain("토지이용계획 미조회");
  });

  it("조회된 미확인 규제는 효과와 함께 전제 목록에 들어간다", () => {
    const f = buildOnePagerFields(
      makeInput({
        scale: {
          constraints: {
            fetched: true,
            items: [{ label: "지구단위계획구역", effect: "용적률·높이 지침", where: "구청" }],
          },
        } as never,
      }),
    );
    expect(f.cautions[0]).toContain("지구단위계획구역");
    expect(f.cautions[0]).toContain("용적률·높이 지침");
  });

  it("사업성 입력이 없으면 비용 1줄만, 판정은 없음", () => {
    const f = buildOnePagerFields(makeInput());
    expect(f.costRows).toHaveLength(1);
    expect(f.costRows[0].value).toBe("132.4억원");
    expect(f.verdict).toBeUndefined();
  });

  it("사업성 판정은 kind와 첫 사유를 그대로 전달한다", () => {
    const f = buildOnePagerFields(
      makeInput({
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
          verdict: {
            kind: "hold",
            title: "주요 가정 확인 전",
            reasons: ["평당 토지가 12,000만원은 초기 기본값입니다."],
          },
          ltcPct: 60,
        },
      }),
    );
    expect(f.verdict?.kind).toBe("hold");
    // 제목이 "판정 보류"라는 배지 문구를 다시 반복하지 않는다 — 화면에서 배지(v.label)로
    // 따로 그려지므로 title에는 그 말을 섞지 않는다(중복 표기 방지).
    expect(f.verdict?.title).not.toContain("판정 보류");
    expect(f.verdict?.title).toContain("주요 가정 확인 전");
    expect(f.verdict?.reason).toContain("기본값");
    expect(f.costRows.some((r) => r.label === "총사업비")).toBe(true);
  });

  it("공시지가는 단가와 총액을 함께 보여준다", () => {
    const f = buildOnePagerFields(
      makeInput({
        land: {
          address: "서울특별시 강남구 역삼동 825-3",
          pnu: "1168010100108250003",
          fetchedAt: "2026-09-21",
          areaSqm: 394.8,
          publicPricePerSqm: 24_975_203,
          publicPriceYear: 2026,
        },
      }),
    );
    const row = f.landRows.find((r) => r.label === "공시지가");
    expect(row?.value).toBe("24,975,203원/㎡");
    expect(row?.note).toContain("2026 기준");
    expect(row?.note).toContain("억원");
  });

  it("eok(): 억 이상은 억원, 그 아래는 만원", () => {
    expect(eok(13_242_000_000)).toBe("132.4억원");
    expect(eok(5_000_000)).toBe("500만원");
  });

  describe("층별 개요(요약) — 상세 보고서와 같은 floorTable·그룹화 규칙", () => {
    const floorTableFixture = {
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
        { level: 1, areaSqm: 236.88, note: "주차장 — 용적률 산정 연면적 제외" },
        { level: 2, areaSqm: 236.88, note: "주차장 — 용적률 산정 연면적 제외" },
      ],
      sumGroundSqm: 13 * 236.88 + 78.17,
      precise: false,
    };

    it("같은 면적·비고의 연속 층은 한 행으로 묶이고, 다른 층(최상층 부분층)은 따로 나온다", () => {
      const f = buildOnePagerFields(makeInput({ scale: { floorTable: floorTableFixture } as never }));
      expect(f.floorRows.map((r) => r.label)).toEqual(["14F", "1F~13F", "B1~B2"]);
      expect(f.floorRows[1].value).toContain("×13개 층");
      expect(f.floorRows[2].value).toContain("×2개 층");
      expect(f.floorRowsOmitted).toBe(0);
    });

    it("표의 합계(지상 그룹 면적×개수 합)는 floorTable 지상 합계와 일치한다 — 표와 요약 불일치 방지", () => {
      const f = buildOnePagerFields(makeInput({ scale: { floorTable: floorTableFixture } as never }));
      const groundRows = f.floorRows.filter((r) => !r.label.startsWith("B"));
      const sum = groundRows.reduce((acc, r) => {
        const m = r.value.match(/^([\d,.]+)㎡(?: ×(\d+)개 층)?$/);
        if (!m) throw new Error(`unexpected value format: ${r.value}`);
        const area = Number(m[1].replace(/,/g, ""));
        const count = m[2] ? Number(m[2]) : 1;
        return acc + area * count;
      }, 0);
      expect(sum).toBeCloseTo(floorTableFixture.sumGroundSqm, 0);
    });

    it("floorTable이 없으면 floorRows는 빈 배열(한장 보고서가 없는 값을 지어내지 않는다)", () => {
      const f = buildOnePagerFields(makeInput());
      expect(f.floorRows).toEqual([]);
      expect(f.floorRowsOmitted).toBe(0);
    });

    it("그룹이 6개를 넘으면 6개만 담고 나머지 수를 floorRowsOmitted로 돌린다", () => {
      const manyRows = Array.from({ length: 10 }, (_, i) => ({
        floor: i + 1,
        areaSqm: 100 + i, // 전부 면적이 달라 그룹화되지 않음 → 10개 그룹
        portion: 1,
        legalSetbackM: 0,
        note: `${i}층 용도`,
      }));
      const f = buildOnePagerFields(
        makeInput({
          scale: {
            floorTable: { rows: manyRows, basement: [], sumGroundSqm: 0, precise: false },
          } as never,
        }),
      );
      expect(f.floorRows).toHaveLength(6);
      expect(f.floorRowsOmitted).toBe(4);
    });
  });
});
