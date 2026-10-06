// E1 — 표본 fixture로 ReportDocument를 실제로 PDF 렌더해 tmp/report-check/ 에 저장한다.
// (docs/report-trust-audit-20261006.md E1)
//
// 기본 출력은 report-after.pdf(현재 코드 기준). 수정 전 스냅샷은
//   REPORT_FIXTURE_OUT=report-before.pdf npx vitest run lib/report/__tests__/reportFixtureRender.test.ts
// 로 한 번 떠 두고 보관한다(그 이후 코드를 고쳐도 이 파일 자체는 덮어쓰지 않는다 — 파일명이 다르므로).
//
// 네트워크가 막혀 있어도 렌더되도록 로컬 Pretendard(otf)를 CDN보다 먼저 등록한다
// (lib/report/__tests__/fixtures/renderPdfLocal.ts). 로컬 폰트가 없으면 스킵하고 그 사실을 남긴다.
import { describe, it, expect } from "vitest";
import path from "node:path";
import fs from "node:fs";
import React from "react";
import {
  primeStoresWithFixture,
  buildFixtureReportInputs,
  buildFixtureAnalysis,
} from "./fixtures/reportTrustAuditFixture";
import { registerLocalPretendardFonts, ensureDirSync } from "./fixtures/renderPdfLocal";

const OUT_DIR = path.resolve(__dirname, "../../../tmp/report-check");
const OUT_NAME = process.env.REPORT_FIXTURE_OUT || "report-after.pdf";

describe("E1 — 신뢰도 검수 표본 PDF 렌더", () => {
  it(`표본 입력을 ${OUT_NAME} 로 렌더한다`, async (ctx) => {
    const fontStatus = await registerLocalPretendardFonts();
    if (!fontStatus.ok) {
      console.warn(`[reportFixtureRender] ${fontStatus.reason} — 렌더 건너뜀`);
      ctx.skip();
      return;
    }

    primeStoresWithFixture();
    const input = await buildFixtureReportInputs();
    const analysis = buildFixtureAnalysis();

    const { renderToBuffer } = await import("@react-pdf/renderer");
    const { ReportDocument } = await import("@/components/report/ReportDocument");

    const element = React.createElement(ReportDocument, { input, analysis });
    const buf = await renderToBuffer(element as never);

    ensureDirSync(OUT_DIR);
    const outPath = path.join(OUT_DIR, OUT_NAME);
    fs.writeFileSync(outPath, buf);
    console.log(`[reportFixtureRender] ${outPath} (${buf.length} bytes)`);

    expect(buf.length).toBeGreaterThan(1000);
  }, 30000);
});
