"use client";

import { ensurePdfFonts } from "./fonts";

let warmed = false;

/**
 * Pretendard 폰트(3종, CDN) fetch + fontkit 파싱 비용을 실제 보고서 생성 전에
 * 미리 치른다 — 실측 결과 이 워밍업 자체는 약 0.9초로 끝난다(2026-07-27 확인).
 *
 * ⚠️ 참고: 컨설팅 보고서 전체 생성이 오래 걸리는(수십 초~수 분) 주된 원인은
 * 폰트가 아니라 @react-pdf/renderer가 6~8페이지 분량의 표·SVG 다이어그램을
 * Yoga 레이아웃 엔진으로 계산하는 과정 자체다(실측: 폰트 워밍업 적용 후에도
 * 전체 생성 시간은 거의 그대로). 그래도 폰트 비용을 앞당기는 것 자체는
 * 공짜 개선이라 유지한다 — 근본 해결(워커 이전·페이지 경량화)은 별도 과제.
 *
 * 실패해도 조용히 무시 — 실제 생성 시점에 정상적으로 다시 시도된다.
 */
export function warmUpPdfFonts() {
  if (warmed || typeof window === "undefined") return;
  warmed = true;

  const run = async () => {
    try {
      ensurePdfFonts();
      const [{ pdf, Document, Page, Text }, React] = await Promise.all([
        import("@react-pdf/renderer"),
        import("react"),
      ]);
      const doc = React.createElement(
        Document,
        null,
        React.createElement(
          Page,
          { size: "A4" },
          React.createElement(Text, { style: { fontFamily: "Pretendard" } }, "가"),
        ),
      );
      await pdf(doc).toBlob();
    } catch {
      // 워밍업 실패는 무시 — 실제 생성 시 정상 폴백
    }
  };

  if ("requestIdleCallback" in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
      .requestIdleCallback(run, { timeout: 4000 });
  } else {
    setTimeout(run, 1500);
  }
}
