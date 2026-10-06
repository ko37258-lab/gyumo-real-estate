import { describe, it, expect } from "vitest";
import { describeParkingNote } from "@/lib/report/parkingNote";

describe("describeParkingNote", () => {
  it("전량 지하 배치면 필로티 문구를 붙이지 않는다 (지상주차가 없으므로 적용 대상이 없음)", () => {
    const note = describeParkingNote({
      parkingPlacement: "basement",
      groundSpaces: 0,
      parkingRawSpaces: 12.6,
      parkingBasisLabel: "업무시설 — 시설면적 100㎡당 1대",
      pilotiMode: true,
    });
    expect(note).not.toContain("필로티");
    expect(note).toContain("12.60대");
    expect(note).toContain("업무시설");
  });

  it("주차 없음(none)이어도 필로티 문구를 붙이지 않는다", () => {
    const note = describeParkingNote({
      parkingPlacement: "none",
      groundSpaces: 0,
      pilotiMode: true,
    });
    expect(note).not.toContain("필로티");
  });

  it("지상 배치 + 필로티면 '1층 필로티 가정'을 붙인다", () => {
    const note = describeParkingNote({
      parkingPlacement: "above",
      groundSpaces: 8,
      pilotiMode: true,
    });
    expect(note).toContain("1층 필로티 가정");
  });

  it("지상 배치 + 벽체식이면 벽체식 문구를 붙인다", () => {
    const note = describeParkingNote({
      parkingPlacement: "above",
      groundSpaces: 8,
      pilotiMode: false,
    });
    expect(note).toContain("벽체식");
    expect(note).not.toContain("필로티 가정");
  });

  it("혼합 배치는 지상 대수가 있으면 필로티/벽체식을 판단한다", () => {
    const note = describeParkingNote({
      parkingPlacement: "mixed",
      groundSpaces: 4,
      pilotiMode: true,
    });
    expect(note).toContain("필로티");
  });

  it("혼합 배치인데 지상 대수가 0이면 필로티 문구가 없다", () => {
    const note = describeParkingNote({
      parkingPlacement: "mixed",
      groundSpaces: 0,
      pilotiMode: true,
    });
    expect(note).not.toContain("필로티");
  });
});
