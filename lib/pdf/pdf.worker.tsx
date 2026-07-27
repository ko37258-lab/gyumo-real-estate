/// <reference lib="webworker" />
// PDF 생성을 메인스레드(브라우저 탭) 밖에서 수행하는 모듈 워커.
//
// 왜: @react-pdf/renderer가 6~8페이지 분량의 표·SVG 다이어그램을 Yoga
// 레이아웃 엔진으로 계산하는 데 실측 최대 2분 넘게 걸리는데, 이걸 메인스레드에서
// 돌리면 그동안 탭이 완전히 멈춰 브라우저가 "페이지 응답 없음"을 띄운다
// (2026-07-27 실측·재현). @react-pdf/renderer 소스를 확인한 결과 DOM에
// 의존하지 않고(self/fetch만 사용, Node.js 서버사이드 렌더링도 지원하는
// 라이브러리라 애초에 DOM-free) 워커 이전이 가능함을 확인했다.
//
// 시간 자체는 줄지 않지만(여전히 무거운 계산), 계산이 워커 스레드에서 돌아가는
// 동안 탭은 완전히 정상 — "응답 없음" 자체가 뜨지 않는다.
import { pdf, Document, Page, Text } from "@react-pdf/renderer";
import { ReportDocument } from "@/components/report/ReportDocument";
import { ensurePdfFonts } from "./fonts";
import type { AIAnalysis, ReportInputs } from "@/lib/ai/types";
import type { BrandConfig } from "@/lib/branding/types";

ensurePdfFonts();

type Req =
  | { type: "warmup" }
  | {
      type: "generate";
      id: number;
      input: ReportInputs;
      analysis: AIAnalysis | null;
      brand: BrandConfig;
    };

type Res =
  | { type: "warmup-done" }
  | { type: "warmup-error"; error: string }
  | { type: "generate-done"; id: number; blob: Blob }
  | { type: "generate-error"; id: number; error: string };

self.onmessage = async (e: MessageEvent<Req>) => {
  const msg = e.data;
  try {
    if (msg.type === "warmup") {
      // 최소 문서 한 장으로 폰트 fetch+파싱 비용을 워커 안에서 미리 치른다
      // (워커는 메인스레드와 별도 JS 실행 컨텍스트라 캐시가 공유되지 않음).
      const doc = (
        <Document>
          <Page size="A4">
            <Text style={{ fontFamily: "Pretendard" }}>가</Text>
          </Page>
        </Document>
      );
      await pdf(doc).toBlob();
      postMessage({ type: "warmup-done" } satisfies Res);
      return;
    }

    if (msg.type === "generate") {
      const doc = (
        <ReportDocument input={msg.input} analysis={msg.analysis} brand={msg.brand} />
      );
      const blob = await pdf(doc).toBlob();
      postMessage({ type: "generate-done", id: msg.id, blob } satisfies Res);
      return;
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (msg.type === "generate") {
      postMessage({ type: "generate-error", id: msg.id, error } satisfies Res);
    } else {
      postMessage({ type: "warmup-error", error } satisfies Res);
    }
  }
};
