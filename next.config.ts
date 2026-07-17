import path from "node:path";
import type { NextConfig } from "next";

// 외부 자매 앱에서 gyumo 데이터 API를 호출할 수 있게 CORS 허용.
// (real-estate-infographic = 공법규제분석 앱 — 토지·인허가·실거래 데이터 공유)
const ALLOWED_CORS_ORIGIN = "https://real-estate-infographic.vercel.app";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: ALLOWED_CORS_ORIGIN },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          { key: "Vary", value: "Origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
