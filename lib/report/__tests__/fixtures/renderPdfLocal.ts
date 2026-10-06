// 로컬 폰트로 @react-pdf/renderer PDF를 렌더하는 헬퍼.
//
// 왜: lib/pdf/fonts.ts(ensurePdfFonts)는 Pretendard를 jsdelivr CDN에서 내려받는다.
// 이 저장소 상태로는 원격 다운로드가 금지돼 있어(docs/report-trust-audit-20261006.md
// 작업 규칙), 레포에 이미 있는 로컬 폰트 파일(outputs/fonts/*.otf — 이전 세션 산출물,
// 힉스필드/영상 작업에서 받아둔 것)을 먼저 등록해 둔다.
//
// react-pdf의 Font.register는 같은 family에 소스를 "추가"만 한다(덮어쓰지 않음) —
// FontFamily.resolve()가 같은 weight의 첫 번째 일치 소스를 쓰므로, ensurePdfFonts()가
// 나중에 CDN 주소를 등록해도 먼저 등록해 둔 로컬 파일이 항상 먼저 선택된다. 그래서
// CDN 소스는 "등록은 되지만 실제로 로드되지는 않는" 상태가 되어 네트워크 요청이 없다.
import fs from "node:fs";
import path from "node:path";
import type { ReactElement } from "react";

const LOCAL_FONT_DIR = path.resolve(__dirname, "../../../../outputs/fonts");

let localFontsRegistered = false;

/** ensurePdfFonts()(CDN)보다 먼저 호출해야 한다 — 반드시 ReportDocument/OnePagerDocument를
 *  import하기 "전에" 호출할 것(모듈 평가 시점에 ensurePdfFonts가 실행되므로). */
export async function registerLocalPretendardFonts(): Promise<{ ok: boolean; reason?: string }> {
  if (localFontsRegistered) return { ok: true };
  const files: Record<number, string> = {
    400: "Pretendard-Regular.otf",
    500: "Pretendard-Medium.otf",
    700: "Pretendard-Bold.otf",
  };
  const missing = Object.values(files).filter((f) => !fs.existsSync(path.join(LOCAL_FONT_DIR, f)));
  if (missing.length > 0) {
    return { ok: false, reason: `로컬 폰트 파일 없음: ${missing.join(", ")} (${LOCAL_FONT_DIR})` };
  }
  const { Font } = await import("@react-pdf/renderer");
  Font.register({
    family: "Pretendard",
    fonts: Object.entries(files).map(([weight, file]) => ({
      src: path.join(LOCAL_FONT_DIR, file),
      fontWeight: Number(weight),
    })),
  });
  Font.registerHyphenationCallback((word) => [word]);
  localFontsRegistered = true;
  return { ok: true };
}

/** PDF 렌더 + 디스크 저장. 폰트 로컬 등록 → 문서 모듈 동적 import → 렌더 순서를 지킨다. */
export async function renderReportFixturePdf(
  element: ReactElement,
): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  return renderToBuffer(element as never);
}

export function ensureDirSync(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}
