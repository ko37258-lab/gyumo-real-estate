// 📱 홈 화면에 추가(PWA) — 첫 화면 맨 위 InstallBar 가 이 설정으로 설치 창을 띄운다(2026-11-13).
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "건축가능 규모검토 — 미스터홈즈 × 공법의 신",
    short_name: "규모검토",
    description: "지번 한 줄로 건폐율·용적률·일조권 사선제한까지 확인하는 규모검토 도구",
    start_url: "/",
    display: "standalone",
    background_color: "#020425",
    theme_color: "#020425",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
