"use client";

// 🗺️ 지도 필지 선택 (Phase C) — VWorld 배경지도 + 지적편집도 오버레이 + 클릭 조회.
//
// - 배경: VWorld WMTS (서버 프록시 /api/tile — 키 비노출, CDN 캐시)
// - 지적: VWorld WMS lp_pa_cbnd_bubun (서버 프록시 /api/wms)
// - 클릭: 좌표 → /api/revgeocode (카카오) → 지번주소 → 부모 onPick → 자동 조회
// - 조회 성공 시 store.parcelShape.ringLonLat로 필지 하이라이트 + flyTo
//
// ⚠ leaflet은 window 필수 — 반드시 next/dynamic ssr:false로 로드할 것.

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  WMSTileLayer,
  Polygon,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useSimulatorStore } from "@/store/simulator";

const DEFAULT_CENTER: [number, number] = [37.5665, 126.978]; // 서울시청
const DEFAULT_ZOOM = 17;

function ClickHandler({
  onPick,
  setPicking,
}: {
  onPick: (address: string) => void;
  setPicking: (v: boolean) => void;
}) {
  useMapEvents({
    async click(e) {
      setPicking(true);
      try {
        const r = await fetch(
          `/api/revgeocode?x=${e.latlng.lng}&y=${e.latlng.lat}`,
        );
        const d = (await r.json().catch(() => null)) as
          | { address?: string; error?: string }
          | null;
        if (r.ok && d?.address) onPick(d.address);
      } finally {
        setPicking(false);
      }
    },
  });
  return null;
}

/** 조회된 필지로 지도 이동 */
function FlyToParcel() {
  const parcelShape = useSimulatorStore((s) => s.parcelShape);
  const map = useMap();
  useEffect(() => {
    if (parcelShape) {
      map.flyTo([parcelShape.centerLat, parcelShape.centerLon], 18, {
        duration: 0.8,
      });
    }
  }, [parcelShape, map]);
  return null;
}

export default function MapPicker({
  onPick,
}: {
  onPick: (address: string) => void;
}) {
  const parcelShape = useSimulatorStore((s) => s.parcelShape);
  const [picking, setPicking] = useState(false);
  const [showCadastral, setShowCadastral] = useState(true);
  const [satellite, setSatellite] = useState(false);

  const highlight: Array<[number, number]> | null = parcelShape
    ? parcelShape.ringLonLat.map(([lon, lat]) => [lat, lon])
    : null;

  return (
    <div className="relative rounded-md overflow-hidden border border-border">
      <MapContainer
        center={
          parcelShape
            ? [parcelShape.centerLat, parcelShape.centerLon]
            : DEFAULT_CENTER
        }
        zoom={DEFAULT_ZOOM}
        style={{ height: 320, width: "100%" }}
        maxZoom={19}
        minZoom={7}
        attributionControl={false}
      >
        <TileLayer
          url={`/api/tile/${satellite ? "Satellite" : "Base"}/{z}/{y}/{x}`}
          maxZoom={19}
        />
        {showCadastral && (
          <WMSTileLayer
            url="/api/wms"
            params={{
              layers: "lp_pa_cbnd_bubun",
              format: "image/png",
              transparent: true,
              version: "1.3.0",
            }}
            opacity={0.65}
            maxZoom={19}
          />
        )}
        {highlight && highlight.length >= 3 && (
          <Polygon
            positions={highlight}
            pathOptions={{
              color: "#993C1D",
              weight: 2.5,
              fillColor: "#F0997B",
              fillOpacity: 0.35,
            }}
          />
        )}
        <ClickHandler onPick={onPick} setPicking={setPicking} />
        <FlyToParcel />
      </MapContainer>

      {/* 레이어 토글 */}
      <div className="absolute top-2 right-2 z-[1000] flex gap-1">
        <button
          type="button"
          onClick={() => setSatellite((v) => !v)}
          className="text-[10px] font-semibold px-2 py-1 rounded shadow border"
          style={{
            background: satellite ? "var(--info)" : "var(--card)",
            color: satellite ? "var(--info-foreground, #fff)" : "var(--foreground)",
            borderColor: "var(--border)",
          }}
        >
          위성
        </button>
        <button
          type="button"
          onClick={() => setShowCadastral((v) => !v)}
          className="text-[10px] font-semibold px-2 py-1 rounded shadow border"
          style={{
            background: showCadastral ? "var(--info)" : "var(--card)",
            color: showCadastral ? "var(--info-foreground, #fff)" : "var(--foreground)",
            borderColor: "var(--border)",
          }}
        >
          지적도
        </button>
      </div>

      {/* 클릭 안내 / 로딩 */}
      <div
        className="absolute bottom-2 left-2 z-[1000] text-[10.5px] font-medium px-2 py-1 rounded shadow"
        style={{ background: "var(--card)", color: "var(--muted-foreground)" }}
      >
        {picking ? "⏳ 필지 확인 중..." : "🖱️ 지도에서 필지를 클릭하면 자동 조회됩니다"}
      </div>
    </div>
  );
}
