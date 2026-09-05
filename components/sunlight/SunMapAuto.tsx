"use client";

// 🗺️ 지도 엔진 자동 선택 — 카카오맵 우선, 안 되면(키 미설정·도메인 미등록·일일 한도 초과·크롤러)
// VWorld(leaflet) 지도로. 판정은 probeKakao 한 곳(lib/kakaoMap.ts).

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { probeKakao, type MapEngine } from "@/lib/kakaoMap";
import type { SunMapBuilding } from "@/components/sunlight/SunMap";

const Loading = () => (
  <div className="rounded-2xl border grid place-items-center text-sm" style={{ height: 380, borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
    지도 불러오는 중…
  </div>
);
const LeafletMap = dynamic(() => import("@/components/sunlight/SunMap"), { ssr: false, loading: Loading });
const KakaoMap = dynamic(() => import("@/components/sunlight/KakaoSunMap"), { ssr: false, loading: Loading });

export default function SunMapAuto(props: {
  center: [number, number];
  buildings: SunMapBuilding[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPick: (lat: number, lng: number) => void;
}) {
  const [engine, setEngine] = useState<MapEngine>("loading");
  useEffect(() => {
    let alive = true;
    probeKakao().then((e) => {
      if (alive) setEngine(e);
    });
    return () => {
      alive = false;
    };
  }, []);
  if (engine === "loading") return <Loading />;
  return engine === "ok" ? <KakaoMap {...props} /> : <LeafletMap {...props} />;
}
