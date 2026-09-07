"use client";

// 🗺️ 필지 선택 지도 — 카카오맵 우선, 안 되면(키 없음·도메인 미등록·일일 한도 초과·크롤러) VWorld(leaflet).
// 판정은 lib/kakaoMap.ts probeKakaoDetail 한 곳. 아파트 일조 보기(SunMapAuto)와 같은 규약.

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { probeKakaoDetail, type MapEngine } from "@/lib/kakaoMap";
import type { MapPickerProps } from "@/components/simulator/mapPickerShared";

const Loading = () => (
  <div className="rounded-md border border-border grid place-items-center text-xs text-muted-foreground" style={{ height: 320 }}>
    지도 불러오는 중…
  </div>
);
const LeafletPicker = dynamic(() => import("@/components/simulator/MapPicker"), { ssr: false, loading: Loading });
const KakaoPicker = dynamic(() => import("@/components/simulator/KakaoMapPicker"), { ssr: false, loading: Loading });

export default function MapPickerAuto(props: MapPickerProps & { engineKey?: string }) {
  const [engine, setEngine] = useState<MapEngine>("loading");
  useEffect(() => {
    let alive = true;
    probeKakaoDetail().then((r) => {
      if (alive) setEngine(r.engine);
    });
    return () => {
      alive = false;
    };
  }, []);
  if (engine === "loading") return <Loading />;
  return engine === "ok" ? <KakaoPicker {...props} /> : <LeafletPicker {...props} />;
}
