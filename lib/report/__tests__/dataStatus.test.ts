import { describe, it, expect } from "vitest";
import {
  determineAddressStatus,
  buildReportTitle,
  EXAMPLE_ADDRESS,
} from "@/lib/report/dataStatus";

describe("determineAddressStatus", () => {
  it("초기 예시 주소 그대로면 example", () => {
    expect(determineAddressStatus({ address: EXAMPLE_ADDRESS, lotInfo: null })).toBe("example");
  });

  it("주소가 비어 있으면 example", () => {
    expect(determineAddressStatus({ address: "", lotInfo: null })).toBe("example");
  });

  it("조회 결과(lotInfo)가 있고 현재 주소와 같으면 fetched", () => {
    expect(
      determineAddressStatus({
        address: "서울 강동구 성내동 562",
        lotInfo: { address: "서울 강동구 성내동 562" },
      }),
    ).toBe("fetched");
  });

  it("조회 안 하고 주소 문자열만 입력하면 manual — 조회완료로 오인하지 않는다", () => {
    expect(determineAddressStatus({ address: "서울 강동구 성내동 562", lotInfo: null })).toBe(
      "manual",
    );
  });

  it("조회 후 주소를 다시 고치면(조회 결과와 불일치) manual — 과거 조회값을 최신으로 오인하지 않는다", () => {
    expect(
      determineAddressStatus({
        address: "다른 주소로 수정함",
        lotInfo: { address: "서울 강동구 성내동 562" },
      }),
    ).toBe("manual");
  });
});

describe("buildReportTitle", () => {
  it("조회완료면 주소를 제목으로, 배지는 없음", () => {
    const t = buildReportTitle({ status: "fetched", address: "서울 강동구 성내동 562" });
    expect(t.title).toBe("서울 강동구 성내동 562");
    expect(t.isVerified).toBe(true);
    expect(t.badgeLabel).toBeNull();
  });

  it("예시값이면 주소 대신 다른 제목 + '주소 미조회' 배지 — 제목과 배지가 같은 말을 반복하지 않는다", () => {
    const t = buildReportTitle({ status: "example", address: EXAMPLE_ADDRESS });
    expect(t.title).not.toBe(EXAMPLE_ADDRESS);
    expect(t.isVerified).toBe(false);
    expect(t.badgeLabel).toContain("주소 미조회");
    // 배지 문구를 제목에 그대로 다시 쓰지 않는다(중복 표기 방지)
    expect(t.title).not.toBe(t.badgeLabel);
    expect(t.badgeLabel).not.toContain(t.title);
  });

  it("미조회 사용자 입력이면 제목에 원 주소를 쓰지 않고, 입력 주소는 보조 문구로만", () => {
    const t = buildReportTitle({ status: "manual", address: "서울 강동구 성내동 562" });
    expect(t.title).not.toBe("서울 강동구 성내동 562");
    expect(t.addressNote).toContain("성내동 562");
  });

  it("사용자가 제목을 직접 입력했고 조회완료면 그 제목을 쓰고 배지 없음", () => {
    const t = buildReportTitle({
      status: "fetched",
      address: "서울 강동구 성내동 562",
      userHeadline: "성내동 다세대 신축 검토",
    });
    expect(t.title).toBe("성내동 다세대 신축 검토");
    expect(t.badgeLabel).toBeNull();
  });

  it("사용자가 제목을 직접 입력했지만 미조회(예시)면 그 제목을 쓰되 배지는 유지", () => {
    const t = buildReportTitle({
      status: "example",
      address: EXAMPLE_ADDRESS,
      userHeadline: "임의 검토 제목",
    });
    expect(t.title).toBe("임의 검토 제목");
    expect(t.isVerified).toBe(false);
    expect(t.badgeLabel).toContain("주소 미조회");
  });
});
