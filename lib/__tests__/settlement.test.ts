import { describe, it, expect, beforeEach } from "vitest";
import { findSettlement, limitsWithSettlement, settlementDensity, settlementSourceText } from "@/lib/settlement";
import { scaleConstraintsFrom } from "@/lib/plan/scaleConstraints";
import { buildRegulationChecklist } from "@/lib/regulation-checklist";
import { useSimulatorStore } from "@/store/simulator";
import { buildReportInputs } from "@/lib/report/buildInput";

// 제주시 한경면 조수리 364-3 — 확인서: 계획관리지역, 자연취락지구 / 736㎡
const JEJU = "5011031026003640003";
const SEOUL = "1168010100007370000";
const JEJU_ATTRS = ["가축사육제한구역", "자연취락지구", "지하수자원보전4등급", "계획관리지역"];

describe("취락지구 찾기", () => {
  it("포함 표기는 그대로 지구로 본다", () => {
    expect(findSettlement(JEJU_ATTRS)).toEqual({ name: "자연취락지구", kind: "natural", partial: false });
  });
  it("접함은 지정된 것이 아니므로 뺀다", () => {
    expect(findSettlement(["자연취락지구(접함)", "계획관리지역"])).toBeNull();
  });
  it("전부 포함을 일부 저촉보다 먼저 본다", () => {
    expect(findSettlement(["자연취락지구(저촉)", "자연취락지구"])?.partial).toBe(false);
  });
  it("목록을 못 받았으면 없음으로 본다", () => {
    expect(findSettlement(undefined)).toBeNull();
    expect(findSettlement(null)).toBeNull();
  });
});

describe("건폐율·용적률", () => {
  const rule = (pnu: string, zone: Parameters<typeof settlementDensity>[0]["zone"], baseCov: number, baseFar: number, attrs = JEJU_ATTRS, merged = false) =>
    settlementDensity({ pnu, zone, useAttrs: attrs, baseCov, baseFar, merged });

  it("제주 계획관리지역 → 60%·100%", () => {
    const r = rule(JEJU, "gyehoek", 40, 80);
    expect(r).toMatchObject({ applied: true, bc: 60, far: 100, baseCov: 40, baseFar: 80, unverified: false });
    expect(r?.source).toContain("제주특별자치도 도시계획 조례");
    expect(limitsWithSettlement(40, 80, r)).toEqual({ cov: 60, far: 100 });
  });
  it("제주 자연녹지지역은 조례가 달라 50%·100%", () => {
    expect(rule(JEJU, "jayeon", 20, 80)).toMatchObject({ bc: 50, far: 100 });
  });
  it("용적률 특례가 없는 지역은 용도지역 값을 그대로 둔다", () => {
    expect(rule(SEOUL, "jayeon", 20, 50)).toMatchObject({ applied: true, bc: 60, far: 50 });
  });
  it("지자체마다 건폐율이 다르다 — 부산 40%", () => {
    expect(rule("2611010100001000000", "gyehoek", 40, 100)).toMatchObject({ bc: 40, far: 100 });
  });
  it("조례 조항을 못 찾은 곳은 시행령 60% + 확인 필요", () => {
    const r = rule("4145010100001000000", "gyehoek", 40, 100);
    expect(r).toMatchObject({ applied: true, bc: 60, unverified: true });
    expect(settlementSourceText(r)).toContain("조례 확인 필요");
  });
  it("일부 저촉이면 값을 바꾸지 않는다", () => {
    const r = rule(JEJU, "gyehoek", 40, 80, ["자연취락지구(저촉)"]);
    expect(r).toMatchObject({ applied: false, partial: true, bc: 60, far: 100 });
    expect(limitsWithSettlement(40, 80, r)).toEqual({ cov: 40, far: 80 });
  });
  it("합필이면 값을 바꾸지 않는다", () => {
    const r = rule(JEJU, "gyehoek", 40, 80, JEJU_ATTRS, true);
    expect(r).toMatchObject({ applied: false, merged: true });
    expect(limitsWithSettlement(40, 80, r)).toEqual({ cov: 40, far: 80 });
  });
  it("집단취락지구는 개발제한구역법령 — 자동 적용하지 않는다", () => {
    const r = rule(SEOUL, "jayeon", 20, 50, ["집단취락지구"]);
    expect(r).toMatchObject({ kind: "group", applied: false, bc: null, far: null });
    expect(limitsWithSettlement(20, 50, r)).toEqual({ cov: 20, far: 50 });
  });
  it("지정 대상이 아닌 용도지역이면 없음", () => {
    expect(rule(SEOUL, "2il", 60, 250)).toBeNull();
  });
});

describe("규모검토 상태", () => {
  const lookup = (pnu: string, useAttrs?: string[], merged = false) => {
    const s = useSimulatorStore.getState();
    s.setParcelRegulation({ pnu, useAttrs, merged });
    s.setZone("gyehoek");
    s.applyLotInfo({ address: "시험", lotSqm: 736, zone: "gyehoek", roadM: 6, source: "vworld", pnu });
    return useSimulatorStore.getState();
  };

  beforeEach(() => useSimulatorStore.getState().setZone("2il"));

  it("조수리 364-3 — 60%·100%로 잡힌다", () => {
    const g = lookup(JEJU, JEJU_ATTRS);
    expect(g.covPct).toBe(60);
    expect(g.farPct).toBe(100);
    expect(g.settlement?.applied).toBe(true);
    expect((g.lotSqm * g.covPct) / 100).toBeCloseTo(441.6, 5);
    expect((g.lotSqm * g.farPct) / 100).toBeCloseTo(736, 5);
  });
  it("지구가 없으면 조례값 40%·80%", () => {
    const g = lookup(JEJU, ["계획관리지역"]);
    expect(g.covPct).toBe(40);
    expect(g.farPct).toBe(80);
    expect(g.settlement).toBeNull();
  });
  it("일부 저촉은 조례값 그대로 + 안내", () => {
    const g = lookup(JEJU, ["자연취락지구(저촉)"]);
    expect(g.covPct).toBe(40);
    expect(g.farPct).toBe(80);
    expect(g.settlement?.partial).toBe(true);
  });
  it("지역·지구를 못 받으면 조례값 그대로", () => {
    const g = lookup(JEJU, undefined);
    expect(g.covPct).toBe(40);
    expect(g.settlement).toBeNull();
  });
  it("용도지역을 손으로 바꾸면 그 용도지역 기준으로 다시 판정한다", () => {
    lookup(JEJU, JEJU_ATTRS);
    useSimulatorStore.getState().setZone("2il");
    expect(useSimulatorStore.getState().settlement).toBeNull();
    useSimulatorStore.getState().setZone("jayeon");
    expect(useSimulatorStore.getState().settlement).toMatchObject({ bc: 50, far: 100 });
  });
  it("다른 필지의 토지이용계획을 끌어 쓰지 않는다", () => {
    const s = useSimulatorStore.getState();
    s.setParcelRegulation({ pnu: JEJU, useAttrs: JEJU_ATTRS, merged: false });
    s.applyLotInfo({ address: "다른 필지", lotSqm: 300, zone: "gyehoek", roadM: 6, source: "vworld", pnu: "5011031026003650000" });
    expect(useSimulatorStore.getState().settlement).toBeNull();
  });
});

describe("규제 안내", () => {
  it("자연취락지구는 층수·용도 제한이 미확인으로 남는다", () => {
    expect(scaleConstraintsFrom(["자연취락지구"]).items.map((i) => i.key)).toContain("settlement-floors");
  });
  it("일부 저촉·집단취락은 미반영으로 표시한다", () => {
    expect(scaleConstraintsFrom(["자연취락지구(저촉)"]).items.map((i) => i.key)).toEqual(["settlement-partial"]);
    expect(scaleConstraintsFrom(["집단취락지구"]).items.map((i) => i.key)).toEqual(["settlement-group"]);
  });
  it("접함은 규제로 치지 않는다", () => {
    expect(scaleConstraintsFrom(["지구단위계획구역(접함)", "자연취락지구(접함)"]).items).toEqual([]);
    const items = buildRegulationChecklist({ useAttrs: ["개발제한구역(접함)"], areaSqm: 100 });
    expect(items.some((i) => i.level === "danger")).toBe(false);
  });
  it("체크리스트에 자연취락지구가 나온다", () => {
    const items = buildRegulationChecklist({ useAttrs: JEJU_ATTRS, areaSqm: 736, zoneCode: "gyehoek" });
    expect(items.some((i) => i.title === "자연취락지구")).toBe(true);
  });
});

describe("보고서·AI 입력", () => {
  it("상한·면적·근거 문구까지 화면과 같은 값이다", () => {
    const s = useSimulatorStore.getState();
    s.setParcelRegulation({ pnu: JEJU, useAttrs: JEJU_ATTRS, merged: false });
    s.setZone("gyehoek");
    s.applyLotInfo({ address: "시험", lotSqm: 736, zone: "gyehoek", roadM: 6, source: "vworld", pnu: JEJU });
    const { scale } = buildReportInputs();
    expect(scale).toMatchObject({ coverRatio: 60, floorRatio: 100, legalCovMax: 60, legalFarMax: 100 });
    expect(scale.buildingArea).toBeCloseTo(441.6, 1);
    expect(scale.legalFloorArea).toBeCloseTo(736, 1);
    expect(scale.ordinanceSource).toContain("자연취락지구 반영 — 건폐율 40→60%, 용적률 80→100%");
    expect(scale.ordinanceSource).toContain("제주특별자치도 도시계획 조례 제60조②1호·제61조①");
  });
});
