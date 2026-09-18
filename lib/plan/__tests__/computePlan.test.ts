import { describe, it, expect } from "vitest";
import { computePlan, floorLabel, type PlanInputs } from "@/lib/plan/computePlan";
import { computeCostSnapshot, computeProfitSnapshot } from "@/lib/plan/finance";
import { sunlightRuleForDate } from "@/lib/calc/sunlight";
import { legalRoundSpaces } from "@/lib/calc/parking";
import { SQM_PER_PYEONG } from "@/lib/utils/area";
import { PARKING_STANDARDS } from "@/lib/parking-standards";
import type { CostInputs } from "@/lib/calc/cost";

// 검토 사례: 서울 강남구 역삼동 825-3 — 공부상 394.8㎡, 일반상업, 건폐 60 / 용적 800, 업무시설
const YEOKSAM: PlanInputs = {
  lotSqm: 394.8,
  covPct: 60,
  farPct: 800,
  sunlightOn: false,
  sunlightRule: "legacy",
  shape: null,
  floor1HeightM: 3.5,
  typicalFloorHeightM: 3.5,
  parkingUsage: "업무",
  parkingAreaPerSpace: 100,
  parkingProgressiveSpec: { baseStart: 50, firstUpTo: 150, firstSpaces: 1, addPerArea: 100 },
  parkingHouseholds: [],
  parkingTierRatios: [],
  parkingMode: "basement",
  parkingGroundRatio: 30,
  parkingUnitArea: 30,
  parkingPilotiMode: true,
};

const COST: CostInputs = {
  abovePyeong: 300, basementPyeong: 0, aboveUnit: 850, basementPremium: 150, softRate: 12,
  parkingSpaces: 8, parkingUnit: 1200,
  farmEnabled: false, farmArea: 0, farmPrice: 0, farmRate: 30, farmCap: 50000, farmDiscount: 0,
  forestEnabled: false, forestArea: 0, forestBase: 8340, forestPrice: 0, forestPublicRate: 0.1, forestAddRate: 0, forestDiscount: 0,
  devEnabled: false, endLandValue: 0, startLandValue: 0, normalIncrease: 0, devCost: 0, devRate: 25,
};
const LINKED = { abovePyeong: true, basementPyeong: true, parkingSpaces: true };

describe("대지면적 — 원본 ㎡ 보존", () => {
  it("394.8㎡ 가 정수 평을 거쳐 줄지 않는다 (예전: 119평 → 393.39㎡)", () => {
    const p = computePlan(YEOKSAM);
    expect(p.lotSqm).toBe(394.8);
    expect(p.footprintSqm).toBeCloseTo(236.88, 2);
    expect(p.farCapSqm).toBeCloseTo(3158.4, 2);
  });
  it("㎡ ↔ 평 반복 변환 후에도 원본 동일", () => {
    let sqm = 394.8;
    for (let i = 0; i < 50; i++) sqm = (sqm / SQM_PER_PYEONG) * SQM_PER_PYEONG;
    expect(sqm).toBeCloseTo(394.8, 9);
  });
  it("평은 표시값일 뿐 정수로 반올림하지 않는다", () => {
    expect(computePlan(YEOKSAM).lotPy).toBeCloseTo(119.43, 2);
  });
});

describe("층수·높이", () => {
  const p = computePlan(YEOKSAM);
  it("환산층수 13.33 과 실제 층수 14 를 분리", () => {
    expect(p.floorsEquivalent).toBeCloseTo(13.333, 3);
    expect(p.floorCount).toBe(14);
    expect(p.topFloorPortion).toBeCloseTo(0.333, 2);
    expect(floorLabel(p)).toBe("지상 14층 (최상층 부분층 33%)");
  });
  it("높이 = 층고 합 (부분층도 층고 전체) → 49m, 46.7m 아님", () => {
    expect(p.heightM).toBeCloseTo(49, 6);
  });
  it("1층 층고를 따로 두면 높이에 반영", () => {
    const q = computePlan({ ...YEOKSAM, floor1HeightM: 5 });
    expect(q.heightM).toBeCloseTo(5 + 13 * 3.5, 6);
  });
  it("정수 층 (용적 600 / 건폐 60 = 10층)", () => {
    const q = computePlan({ ...YEOKSAM, farPct: 600 });
    expect(q.floorCount).toBe(10);
    expect(floorLabel(q)).toBe("지상 10층");
    expect(q.heightM).toBeCloseTo(35, 6);
  });
  it("지상 바닥면적 합 = 용적률 산정 상한 (일조 미적용)", () => {
    expect(p.aboveGroundSumSqm).toBeCloseTo(p.farCapSqm, 6);
  });
});

describe("주차 → 지하층 → 비용 연결", () => {
  const p = computePlan(YEOKSAM);
  it("법정 필요 대수 = 31.584 → 32대 (비고 6: 0.5 이상 1대)", () => {
    expect(p.parking.rawSpaces).toBeCloseTo(31.584, 3);
    expect(p.parking.requiredSpaces).toBe(32);
  });
  it("주차 면적은 한 계수(30㎡)만 쓴다", () => {
    expect(p.parking.unitAreaSqm).toBe(30);
    expect(p.parking.planAreaSqm).toBe(960);
    expect(p.basement.totalSqm).toBeCloseTo(960, 6);
  });
  it("지하층 수와 면적 (1개 층 = 건축면적 가정)", () => {
    expect(p.basement.levels.length).toBe(5);
    expect(p.basement.levels[0].areaSqm).toBeCloseTo(236.88, 2);
  });
  it("총연면적 = 지상 + 지하", () => {
    expect(p.totalFloorAreaSqm).toBeCloseTo(3158.4 + 960, 3);
  });
  it("비용 탭 지하 연면적이 0이 아니고 지하 공사비가 생긴다", () => {
    const c = computeCostSnapshot(COST, LINKED, p);
    expect(c.inputs.basementPyeong).toBeCloseTo(960 / SQM_PER_PYEONG, 6);
    expect(c.result.basementCost).toBeGreaterThan(0);
    // 지하 주차는 지하 구조체 공사비에 포함 → 대당 설치비는 지상 대수(0)만
    expect(c.inputs.parkingSpaces).toBe(0);
  });
  it("지하를 수동 입력으로 끊으면 대당 설치비는 전체 대수", () => {
    const c = computeCostSnapshot(COST, { ...LINKED, basementPyeong: false }, p);
    expect(c.inputs.parkingSpaces).toBe(32);
    expect(c.inputs.basementPyeong).toBe(0);
  });
  it("주차 변경 → 지하·비용 즉시 갱신", () => {
    const q = computePlan({ ...YEOKSAM, parkingAreaPerSpace: 150 });
    expect(q.parking.requiredSpaces).toBe(legalRoundSpaces(3158.4 / 150));
    const c1 = computeCostSnapshot(COST, LINKED, p).result.basementCost;
    const c2 = computeCostSnapshot(COST, LINKED, q).result.basementCost;
    expect(c2).toBeLessThan(c1);
  });
  it("'주차 없음'이어도 법정 대수와 경고는 남는다", () => {
    const q = computePlan({ ...YEOKSAM, parkingMode: "none" });
    expect(q.parking.requiredSpaces).toBe(32);
    expect(q.basement.totalSqm).toBe(0);
    expect(q.parking.warnings[0]).toMatch(/법정 설치의무 32대/);
  });
  it("혼합 배치: 지상+지하 = 법정 대수", () => {
    const q = computePlan({ ...YEOKSAM, parkingMode: "mixed", parkingGroundRatio: 30 });
    expect(q.parking.groundSpaces + q.parking.basementSpaces).toBe(32);
    expect(q.parking.groundSpaces).toBe(10);
  });
  it("지상 부속 주차는 필로티·벽체식 모두 용적률 산정에서 제외 (영 119조①4호 나목)", () => {
    const piloti = computePlan({ ...YEOKSAM, parkingMode: "ground", parkingPilotiMode: true });
    const wall = computePlan({ ...YEOKSAM, parkingMode: "ground", parkingPilotiMode: false });
    expect(piloti.estimatedFarAreaSqm).toBeCloseTo(piloti.aboveGroundSumSqm - 960, 6);
    expect(wall.estimatedFarAreaSqm).toBeCloseTo(wall.aboveGroundSumSqm - 960, 6);
    expect(piloti.floor1NonParkingSqm).toBe(0);
  });
  it("필로티(바닥면적 불산입)만 총연면적에서도 빠진다 (영 119조①3호 다목)", () => {
    const piloti = computePlan({ ...YEOKSAM, parkingMode: "ground", parkingPilotiMode: true });
    const wall = computePlan({ ...YEOKSAM, parkingMode: "ground", parkingPilotiMode: false });
    expect(wall.totalFloorAreaSqm - piloti.totalFloorAreaSqm).toBeCloseTo(960, 6);
  });
  it("배치 검토 미실시 표시", () => {
    expect(p.parking.layoutVerified).toBe(false);
    expect(p.parking.warnings.join(" ")).toMatch(/램프/);
  });
});

describe("주차 끝수 경계 (별표1 비고 6)", () => {
  it.each([
    [10.49, 10], [10.5, 11], [10.51, 11], [0.99, 0], [1, 1],
  ])("%s대 → %s대", (raw, out) => {
    expect(legalRoundSpaces(raw)).toBe(out);
  });
  it("서울 업무시설 기준이 100㎡당 1대인지(표 데이터)", () => {
    const s = PARKING_STANDARDS["업무"];
    expect(s.mode).toBe("area");
  });
});

describe("일조 규칙 기준일 (부칙: 시행일 이후 신청분부터)", () => {
  it("검토일 2026-09-18 → 개정 전", () => {
    expect(sunlightRuleForDate("2026-09-18")).toBe("legacy");
  });
  it("2026-11-11 → 개정 전 / 2026-11-12 → 개정 후", () => {
    expect(sunlightRuleForDate("2026-11-11")).toBe("legacy");
    expect(sunlightRuleForDate("2026-11-12")).toBe("revised");
  });
  it("주거지역 12m 높이 층: 개정 전 6m / 개정 후 5m 이격", () => {
    const base = { ...YEOKSAM, farPct: 200, covPct: 60, sunlightOn: true, floor1HeightM: 3, typicalFloorHeightM: 3 };
    const legacy = computePlan({ ...base, sunlightRule: "legacy" });
    const revised = computePlan({ ...base, sunlightRule: "revised" });
    const f4L = legacy.floors.find((f) => f.floor === 4)!;
    const f4R = revised.floors.find((f) => f.floor === 4)!;
    expect(f4L.topM).toBe(12);
    expect(f4L.legalSetbackM).toBe(6);
    expect(f4R.legalSetbackM).toBe(5);
  });
});

describe("사업성 — 미검증 기본값이면 판정 보류", () => {
  const plan = computePlan(YEOKSAM);
  const cost = computeCostSnapshot(COST, LINKED, plan);
  const base = {
    landPricePerPyeong: 4000, landAcquisitionCost: 5, revenueModel: "sales" as const,
    salesPricePerPyeong: 4500, salesRate: 90, monthlyRentPerPyeong: 20, deposit: 12, annualOccupancy: 95,
    ltvRatio: 60, loanAmountOverride: null, annualInterestRate: 6, loanPeriodYears: 3,
    repaymentMethod: "bullet" as const, projectDurationMonths: 18, salesStartMonth: 0,
  };
  it("토지가·분양가 모두 기본값 → 보류", () => {
    const s = computeProfitSnapshot({ plan, cost, profit: { ...base, sources: {} }, usage: "업무" });
    expect(s.verdict.kind).toBe("hold");
    expect(s.verdict.reasons.join(" ")).toMatch(/초기 기본값/);
  });
  it("주거 시세를 업무 분양가로 쓰면 보류", () => {
    const s = computeProfitSnapshot({
      plan, cost, usage: "업무",
      profit: { ...base, sources: { landPricePerPyeong: "user", salesPricePerPyeong: "estimate-newbuild-res" } },
    });
    expect(s.verdict.kind).toBe("hold");
    expect(s.verdict.reasons.join(" ")).toMatch(/주거 시세/);
  });
  it("미확인 규제가 있으면 보류", () => {
    const s = computeProfitSnapshot({
      plan, cost, usage: "업무", unresolvedRegulations: ["지구단위계획구역"],
      profit: { ...base, sources: { landPricePerPyeong: "user", salesPricePerPyeong: "user" } },
    });
    expect(s.verdict.kind).toBe("hold");
  });
  it("대출비율은 LTC(총사업비 대비), 이자는 사업기간 18개월", () => {
    const s = computeProfitSnapshot({ plan, cost, profit: { ...base, sources: {} }, usage: "업무" });
    expect(s.ltcPct).toBeCloseTo(60, 6);
    const loan = s.loanAmountEok * 1e8;
    expect(s.result.loanInterest).toBeCloseTo(loan * 0.06 * 1.5, 0);
  });
  it("세전이익률은 (분양률 반영) 매출 기준", () => {
    const s = computeProfitSnapshot({ plan, cost, profit: { ...base, sources: {} }, usage: "업무" });
    expect(s.pretaxMarginOnRevenuePct).toBeCloseTo((s.result.profitBeforeTax / s.result.totalRevenue) * 100, 6);
  });
  it("토지면적은 정밀 평(119.43), 정수 119 아님", () => {
    const s = computeProfitSnapshot({ plan, cost, profit: { ...base, sources: {} }, usage: "업무" });
    expect(s.landAreaPyeong).toBeCloseTo(119.43, 2);
  });
});

import { scaleConstraintsFrom } from "@/lib/plan/scaleConstraints";
describe("미확인 규제 목록", () => {
  const attrs = ["대공방어협조구역", "(한강)폐기물매립시설 설치제한지역(저촉)", "도시지역", "일반상업지역", "지구단위계획구역", "과밀억제권역", "토지거래계약에관한허가구역", "리모델링지구", "가로구역별 최고높이 제한지역"];
  it("역삼동 825-3: 지구단위·최고높이·대공방어 3건, 폐기물 제한지역은 제외", () => {
    const r = scaleConstraintsFrom(attrs);
    expect(r.items.map((i) => i.key).sort()).toEqual(["dup", "military", "street-height"]);
  });
  it("도로 저촉은 잡는다", () => {
    expect(scaleConstraintsFrom(["소로2류(폭 8m~10m)(저촉)"]).items.map((i) => i.key)).toContain("conflict");
  });
  it("조회 안 했으면 fetched=false (없음과 구분)", () => {
    expect(scaleConstraintsFrom(undefined).fetched).toBe(false);
    expect(scaleConstraintsFrom([]).fetched).toBe(true);
  });
});
