"use client";

// 🗺️ 아파트 일조 보기 — 3D 아래 지도. VWorld 배경(일반/위성) + 건물 폴리곤(동별 등급 색) + 동 라벨.
// 지도를 클릭하면 그 지점을 새 검색 지점으로 삼아 단지를 다시 불러온다(단지명 검색이 안 될 때의 우회).
// ⚠ leaflet은 window 필수 — AptSunlight 에서 next/dynamic ssr:false 로 로드한다.

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polygon, Tooltip, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export interface SunMapBuilding {
  id: string;
  /** [lat, lng] 링 */
  ring: Array<[number, number]>;
  label: string;
  isComplex: boolean;
  /** 등급 색 (계산 전이면 null) */
  color: string | null;
  floors: number;
  maxRunH?: number;
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, Math.max(map.getZoom(), 16));
  }, [map, center]);
  return null;
}

function ClickToPick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function SunMap({
  center,
  buildings,
  selectedId,
  onSelect,
  onPick,
  fallbackReason,
}: {
  center: [number, number];
  buildings: SunMapBuilding[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPick: (lat: number, lng: number) => void;
  /** 카카오맵 대신 이 지도를 쓰게 된 이유 (SunMapAuto) */
  fallbackReason?: string;
}) {
  const [satellite, setSatellite] = useState(true);

  return (
    <div className="rounded-2xl border overflow-hidden relative" style={{ borderColor: "var(--border)" }}>
      <MapContainer
        key={`${center[0]},${center[1]}`}
        center={center}
        zoom={17}
        style={{ height: 380, width: "100%" }}
        maxZoom={19}
        minZoom={9}
        attributionControl={false}
      >
        <TileLayer url={`/api/tile/${satellite ? "Satellite" : "Base"}/{z}/{y}/{x}`} maxZoom={19} />
        {buildings.map((b) => (
          <Polygon
            key={b.id}
            positions={b.ring}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                onSelect(selectedId === b.id ? null : b.id);
              },
            }}
            pathOptions={{
              color: selectedId === b.id ? "#8a6d00" : b.isComplex ? (b.color ?? "#c47a5a") : "#8a8f99",
              weight: selectedId === b.id ? 3 : b.isComplex ? 2 : 1,
              fillColor: b.isComplex ? (b.color ?? "#f3c9b8") : "#d9dce3",
              fillOpacity: b.isComplex ? 0.55 : 0.35,
            }}
          >
            {b.isComplex && (
              <Tooltip permanent direction="center" className="sunmap-label" opacity={1}>
                <span style={{ fontSize: 11, fontWeight: 700 }}>
                  {b.label}
                  {typeof b.maxRunH === "number" ? ` ${b.maxRunH.toFixed(1)}h` : ""}
                </span>
              </Tooltip>
            )}
          </Polygon>
        ))}
        <CircleMarker center={center} radius={6} pathOptions={{ color: "#fff", weight: 2, fillColor: "#e11d48", fillOpacity: 1 }} />
        <Recenter center={center} />
        <ClickToPick onPick={onPick} />
      </MapContainer>

      <div className="absolute top-2 right-2 z-[1000] flex gap-1">
        {(["위성", "일반"] as const).map((k) => {
          const on = satellite === (k === "위성");
          return (
            <button
              key={k}
              type="button"
              onClick={() => setSatellite(k === "위성")}
              className="text-[11px] font-semibold px-2 py-1 rounded shadow"
              style={{ background: on ? "#FFCF0D" : "rgba(255,255,255,0.92)", color: "#111" }}
            >
              {k}
            </button>
          );
        })}
      </div>
      <div className="absolute bottom-2 left-2 z-[1000] text-[11px] px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.9)", color: "#333" }}>
        브이월드 지도{fallbackReason ? ` (카카오맵 불가: ${fallbackReason})` : ""} · 색 = 동지 9~15시 연속 일조 등급 · 지도를 누르면 그 지점 주변 단지를 다시 불러옵니다
      </div>
      <style jsx global>{`
        .sunmap-label {
          background: rgba(255, 255, 255, 0.92) !important;
          border: 0 !important;
          border-radius: 6px !important;
          padding: 1px 5px !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25) !important;
          color: #222 !important;
        }
        .sunmap-label::before {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
