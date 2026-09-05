import path from "node:path";
import type { NextConfig } from "next";

// 외부 자매 앱(공법규제분석 앱: real-estate-infographic.vercel.app / 372law.com)에서
// gyumo 데이터 API를 호출할 수 있게 CORS 허용. 허용 도메인이 둘 이상이라
// Access-Control-Allow-Origin 은 정적 헤더 대신 proxy.ts 가 요청 Origin 을 보고 붙인다.

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // 건축이야기(MR.K의 건축규제 이해하기)는 public/building-law/ 에 통째로 들어있는
  // 정적 사이트다. public 파일은 확장자까지 붙여야 열리므로, 사람이 쓰는 주소
  // /building-law 를 실제 파일로 연결한다.
  async rewrites() {
    return [
      { source: "/building-law", destination: "/building-law/index.html" },
    ];
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          { key: "Vary", value: "Origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
