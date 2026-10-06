// E2 — 출력 전 레이아웃(공백) 자동 검사 (docs/report-trust-audit-20261006.md E2)
//
// pdfjs-dist가 설치돼 있지 않아(npm install 승인 불가) ./fixtures/pdfTextExtract.ts 로 직접
// 페이지별 텍스트·Y좌표를 뽑아 세 규칙을 검사한다:
//   1) 마지막 쪽 제외, 본문 최하단 텍스트가 쪽 높이의 70% 미만인 쪽이 있으면 실패
//      (머리말/꼬리말 fixed 텍스트 제외 — y<25 또는 y>820 은 본문에서 뺀다)
//   2) 쪽 하단 15% 안에 장 제목("n. ...")이 있고 그 아래 본문이 없으면 실패
//   3) 표지 다음 쪽(2쪽)에 본문 텍스트가 2줄 이하면 실패
import { describe, it, expect } from "vitest";
import {
  primeStoresWithFixture,
  buildFixtureReportInputs,
  buildFixtureAnalysis,
} from "./fixtures/reportTrustAuditFixture";
import { registerLocalPretendardFonts } from "./fixtures/renderPdfLocal";
import { extractPdfPages, groupRunsIntoLines, type PdfPageText } from "./fixtures/pdfTextExtract";

const FIXED_TOP = 25;
const FIXED_BOTTOM = 820;

function bodyRuns(p: PdfPageText) {
  return p.runs.filter((r) => r.yFromTop > FIXED_TOP && r.yFromTop < FIXED_BOTTOM);
}

/**
 * 알려진 잔여 이슈(known issue) 허용 목록 — docs/report-trust-audit-20261006-RESULT.md 참고.
 *
 * page 11(AI 분석 섹션 마지막 쪽)이 36%에서 끝나고 "8. 부록"이 다음 쪽에서 시작한다.
 * 원인 조사: 동일 JSX를 필러 텍스트로 재현해도 재현되지 않고(이 구조 자체의 문제가 아님),
 * wrap={false} 제거·minPresenceAhead 제거·블록 통합 등 여러 구조 변경을 가해도 분기점이
 * 1pt도 움직이지 않아 — react-pdf(v4.5.1)가 긴 단일 Page(흐르는 문서) 끝부분에서 보이는
 * 내부 페이지네이션 특이동작으로 추정된다(라이브러리 내부 문제로 판단, 이 리포의 JSX
 * 구조로는 재현 경로를 못 찾음). 원본(report-before.pdf)에는 이 종류의 공백이 2곳(4%,
 * 12%) 있었고 이번 작업(B4/B5/D4 중복 제거)으로 1곳으로 줄었다 — 신규 회귀가 아니라
 * 이미 개선된 기존 이슈로 보고 허용 목록에 둔다. 새로운 쪽에서 추가로 발생하면
 * 아래 allowlist에 없으므로 테스트가 실패한다(회귀 감지는 유지).
 */
const KNOWN_LAYOUT_ISSUES: Array<{
  rule: 1 | 2 | 3;
  /** 바로 "앞" 쪽의 마지막 본문 줄(허용 대상 식별용 — 고정 페이지 번호 대신 내용으로 식별) */
  precedingLastLineIncludes: string;
  reason: string;
}> = [
  // 2026-10-06: 섹션 루트 <View> 래퍼를 Fragment로 평탄화해 해결 — 허용 예외 없음.
];

describe("E2 — 레이아웃(공백) 자동 검사", () => {
  it("본문 하단 채움 · 장제목 고아 · 표지 다음 쪽 공백 규칙", async (ctx) => {
    const fontStatus = await registerLocalPretendardFonts();
    if (!fontStatus.ok) {
      console.warn(`[reportLayout] ${fontStatus.reason} — 건너뜀`);
      ctx.skip();
      return;
    }

    primeStoresWithFixture();
    const input = await buildFixtureReportInputs();
    const analysis = buildFixtureAnalysis();

    const { renderToBuffer } = await import("@react-pdf/renderer");
    const { ReportDocument } = await import("@/components/report/ReportDocument");
    const React = await import("react");

    const element = React.createElement(ReportDocument, { input, analysis });
    const buf = await renderToBuffer(element as never);
    const pages = extractPdfPages(buf);
    expect(pages.length).toBeGreaterThan(5);

    // ── 규칙 1 ──
    const rule1Failures: string[] = [];
    for (let i = 0; i < pages.length - 1; i++) {
      const p = pages[i];
      const br = bodyRuns(p);
      const lines = groupRunsIntoLines(br);
      const lastY = lines.length ? Math.max(...lines.map((l) => l.yFromTop)) : 0;
      const pct = (lastY / p.height) * 100;
      if (pct >= 70) continue;
      const lastLine = lines.reduce((a, b) => (b.yFromTop > a.yFromTop ? b : a), lines[0]);
      const allowed = KNOWN_LAYOUT_ISSUES.some(
        (k) => k.rule === 1 && lastLine && lastLine.text.includes(k.precedingLastLineIncludes),
      );
      if (!allowed) rule1Failures.push(`page ${i + 1}: ${pct.toFixed(0)}% (last line: "${lastLine?.text ?? ""}")`);
    }
    expect(rule1Failures, `규칙1 위반(마지막 쪽 제외 70% 미만):\n${rule1Failures.join("\n")}`).toEqual([]);

    // ── 규칙 2 ──
    const rule2Failures: string[] = [];
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      const lines = groupRunsIntoLines(bodyRuns(p));
      const threshold = p.height * 0.85;
      for (const line of lines) {
        if (line.yFromTop >= threshold && /^\d+\.\s/.test(line.text.trim())) {
          const after = lines.filter((x) => x.yFromTop > line.yFromTop + 1);
          if (after.length === 0) rule2Failures.push(`page ${i + 1}: 제목 고아 "${line.text}"`);
        }
      }
    }
    expect(rule2Failures, `규칙2 위반(쪽 하단 장제목 고아):\n${rule2Failures.join("\n")}`).toEqual([]);

    // ── 규칙 3 ──
    const page2 = pages[1];
    const page2Lines = groupRunsIntoLines(bodyRuns(page2));
    expect(page2Lines.length, "규칙3 위반(표지 다음 쪽 본문 2줄 이하)").toBeGreaterThan(2);
  }, 30000);
});
