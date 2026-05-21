import { Font } from "@react-pdf/renderer";

let registered = false;

export function ensurePdfFonts() {
  if (registered) return;
  Font.register({
    family: "Pretendard",
    fonts: [
      {
        src: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/static/woff/Pretendard-Regular.woff",
        fontWeight: 400,
      },
      {
        src: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/static/woff/Pretendard-Medium.woff",
        fontWeight: 500,
      },
      {
        src: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/static/woff/Pretendard-Bold.woff",
        fontWeight: 700,
      },
    ],
  });
  // 한글 단어 분리 비활성화 — 자동 줄바꿈 시 자모 깨짐 방지.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
