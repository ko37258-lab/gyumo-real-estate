import Link from "next/link";
import AptSunlight from "@/components/sunlight/AptSunlight";

export const metadata = {
  title: "아파트 일조 보기 | 규모검토",
  description: "아파트 단지를 검색해 시간대별 햇빛과 그림자, 동별 동지 일조 시간을 3D로 확인합니다.",
};

/**
 * ☀️ 아파트 일조 보기 — 단지명 검색 → 주변 건물 3D → 시간대별 햇빛 + 동별 동지 일조 진단.
 * 규모검토 3D(주변 건물·위성 바닥·태양 위치)를 재사용한 독립 페이지. 크레딧 차감 없음.
 */
export default function SunlightPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header
        className="sticky top-0 z-40 border-b"
        style={{ background: "rgba(2,4,37,0.96)", borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/simulator" className="text-white/70 text-sm hover:text-white">
            ← 시뮬레이터
          </Link>
          <span className="text-white font-semibold text-sm">☀️ 아파트 일조 보기</span>
          <Link href="/account" className="text-xs text-white/50 hover:text-white px-3 py-1.5 rounded hover:bg-white/10 transition-colors">
            마이페이지
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold">아파트 단지 햇빛, 시간대별로 보기</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            단지명을 검색하면 주변 건물을 3D로 세우고, 동지·춘추분·하지의 시각별 그림자와 동별 동지 일조 시간(9~15시 연속)을 보여줍니다.
            드래그로 회전, 휠로 확대. 건물을 누르면 강조됩니다.
          </p>
        </div>
        <AptSunlight />
      </main>
    </div>
  );
}
