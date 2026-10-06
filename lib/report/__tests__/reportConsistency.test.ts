// E3 — 출력 전 자동 일관성 검사 + A·B 항목 재발 방지 회귀 테스트
// (docs/report-trust-audit-20261006.md E3)
//
// 1) C4 checkReportConsistency를 실제 buildReportInputs() 결과에 돌려 규칙이 의도대로
//    작동하는지 확인한다(이 표본은 토지가가 기본값이라 "판정 보류" block 경고가
//    "있어야 정상"이다 — 경고가 없으면 오히려 실패).
// 2) 렌더된 PDF 전체 텍스트에서 이 지시서의 A·B 항목이 재발하면 실패하는 문자열 검사.
import { describe, it, expect } from "vitest";
import {
  primeStoresWithFixture,
  buildFixtureReportInputs,
  buildFixtureAnalysis,
} from "./fixtures/reportTrustAuditFixture";
import { registerLocalPretendardFonts } from "./fixtures/renderPdfLocal";
import { extractPdfPages, joinAllText } from "./fixtures/pdfTextExtract";
import { checkReportConsistency } from "@/lib/report/consistency";

describe("E3 — C4 규칙 적용 확인 (실제 buildReportInputs 결과)", () => {
  it("토지가 기본값 표본은 'default-land-price-divergence' block 경고를 낸다", async () => {
    primeStoresWithFixture();
    const input = await buildFixtureReportInputs();
    const warnings = checkReportConsistency(input);
    const landWarning = warnings.find((w) => w.rule === "default-land-price-divergence");
    expect(landWarning, "토지가 기본값·실거래 괴리 경고가 나와야 한다").toBeTruthy();
    expect(landWarning?.level).toBe("block");
  });

  it("일반상업지역 표본은 sunlight-flag-mismatch·road-width-mismatch·basement 경고가 없다(정상 처리됐다는 뜻)", async () => {
    primeStoresWithFixture();
    const input = await buildFixtureReportInputs();
    const warnings = checkReportConsistency(input);
    expect(warnings.find((w) => w.rule === "sunlight-flag-mismatch")).toBeUndefined();
    expect(warnings.find((w) => w.rule === "road-width-mismatch")).toBeUndefined();
    expect(warnings.find((w) => w.rule === "basement-last-level-too-small")).toBeUndefined();
  });
});

describe("E3 — PDF 본문 회귀 검사 (A·B 항목 재발 방지)", () => {
  it("일반상업지역 표본 PDF에 금지 패턴이 없다", async (ctx) => {
    const fontStatus = await registerLocalPretendardFonts();
    if (!fontStatus.ok) {
      console.warn(`[reportConsistency] ${fontStatus.reason} — 건너뜀`);
      ctx.skip();
      return;
    }

    primeStoresWithFixture();
    const input = await buildFixtureReportInputs();
    const analysis = buildFixtureAnalysis();
    expect(input.scale.sunlightApplied, "표본은 일반상업지역 — 일조 미적용이어야 전제가 맞다").toBe(false);
    expect(
      input.scale.constraints?.items.some((c) => c.label === "지구단위계획구역"),
      "표본은 지구단위계획구역 포함 — 용적률 상한 확정 불가 전제가 맞다",
    ).toBe(true);

    const { renderToBuffer } = await import("@react-pdf/renderer");
    const { ReportDocument } = await import("@/components/report/ReportDocument");
    const React = await import("react");
    const element = React.createElement(ReportDocument, { input, analysis });
    const buf = await renderToBuffer(element as never);
    const pages = extractPdfPages(buf);
    const all = joinAllText(pages);

    // B1 — sunlightApplied=false 인데 "일조권 사선"이 적용된 것처럼 쓰면 안 된다.
    expect(all).not.toContain("일조권 사선");

    // A11 — AI 분석·템플릿 어디에도 LTV라는 용어가 남아 있으면 안 된다(LTC로 통일).
    expect(all).not.toContain("LTV");

    // A5 — 지하 마지막 층이 4평(12.48㎡)짜리로 잘려 나오면 안 된다.
    expect(all).not.toContain("12.48");
    // 같은 증상의 다른 표현(B5류 잔여층 라벨)도 없어야 한다.
    expect(all).not.toMatch(/\bB5\b/);

    // A8 — 지구단위계획구역이 미확인인데 "상한 이내"로 확정해서 판정하면 안 된다.
    expect(all).not.toContain("상한 이내");
    expect(all).toContain("판정 보류");

    // B3 — "전문 종합 의견"(AI summary) 문단이 요약·AI 분석 페이지에 토씨 하나 안 틀리고
    // 두 번 반복되면 안 된다(요약은 한 줄 포인터만 쓰고 전문은 AI 섹션 1곳에만 있어야 한다).
    const summaryOccurrences = all.split(analysis.summary).length - 1;
    expect(summaryOccurrences, "analysis.summary 전체 문단이 2회 이상 나오면 안 된다").toBeLessThanOrEqual(1);

    // A7 — 서울 조례 강화값(100㎡당 1대)을 적용했으면 근거도 그 조례를 가리켜야 한다
    // (시행령 별표1만 반복 인용하는 자기모순 재발 방지).
    expect(all).toContain("서울특별시 주차장 설치 및 관리 조례");

    // A6 — 도로접면 코드(광대세각)가 있는데 "6m 가정값"(접도 유무만 확인한 고정 가정값)을
    // 그대로 쓰면 안 된다 — 도로접면 코드 기준 추정으로 바뀌어야 한다.
    expect(all).not.toContain("6m (가정값 — 인접 도로 존재만 조회, 폭 실측 아님)");
    expect(all).toContain("도로접면 코드 기준 추정");
  }, 30000);
});
