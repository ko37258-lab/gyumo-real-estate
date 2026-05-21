import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_KR } from "next/font/google";
import { ThemeBootstrap } from "@/components/theme/ThemeBootstrap";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "건축가능 규모검토 PJ — 미스터홈즈 × 공법의 신",
  description:
    "지번 한 줄로 30초 안에 건폐율·용적률·일조권 사선제한까지 — 디벨로퍼·토지투자자의 첫 번째 의사결정 도구.",
  // Chrome 자동 번역기 차단 — 이 사이트는 이미 한국어이므로 번역이 용어를 망가뜨림.
  other: {
    google: "notranslate",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      translate="no"
      data-theme="mrhomes"
      className={`notranslate ${geistSans.variable} ${geistMono.variable} ${notoSansKR.variable} h-full antialiased`}
    >
      <head>
        <ThemeBootstrap />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
