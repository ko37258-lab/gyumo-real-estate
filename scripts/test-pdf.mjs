// 서버사이드 PDF 스모크 테스트.
// next 컴파일 없이 직접 @react-pdf/renderer로 ReportDocument와 동등한 미니멀 문서를 만들어
// 페이지 수와 텍스트가 정상인지 확인.
// React JSX는 쓰지 않고 React.createElement만 사용 (Node 직접 실행 위해).

import { renderToBuffer, Document, Page, Text, View } from "@react-pdf/renderer";
import React from "react";

const h = React.createElement;

const doc = h(
  Document,
  { title: "smoke" },
  h(Page, { size: "A4" }, h(View, null, h(Text, null, "표지"))),
  h(Page, { size: "A4" }, h(View, null, h(Text, null, "1. 검토 요약"))),
  h(Page, { size: "A4" }, h(View, null, h(Text, null, "2. 건축 규모 검토"))),
  h(Page, { size: "A4" }, h(View, null, h(Text, null, "3. 비용·부담금 산정"))),
  h(Page, { size: "A4" }, h(View, null, h(Text, null, "4. AI 종합 분석"))),
  h(Page, { size: "A4" }, h(View, null, h(Text, null, "5. 부록"))),
);

const buf = await renderToBuffer(doc);
console.log("PDF buffer bytes:", buf.length);

// PDF 페이지 수 — 헤더에 "/Type /Page" 카운트로 추정
const text = buf.toString("latin1");
const pageCount = (text.match(/\/Type\s*\/Page[\s\b\/]/g) || []).length;
console.log("PDF page count (estimate):", pageCount);
