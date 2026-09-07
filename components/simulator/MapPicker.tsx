"use client";

// 🗺️ 지도 필지 선택 (Phase C) — VWorld 배경지도 + 지적편집도 오버레이 + 클릭 조회. (leaflet 엔진)
// 카카오맵이 안 될 때의 대체 엔진이다 — 엔진 선택은 MapPickerAuto, 클릭 확정·선택 상태·하단 UI 는
// mapPickerShared 에 있고 여기서는 지도 그리기만 한다.
//
// 두 가지 모드:
//   [단일] 클릭 → 후보 미리보기(파란 점선) + [이 필지 조회] 확인 → 조회
//   [다중 = 합필] 클릭 = 즉시 선택(파란 하이라이트), 재클릭 = 해제.
//          몇 필지든 연달아 선택 후 [전체 합치기 조회] 버튼 한 번으로 일괄 조회
// ⚠ leaflet은 window 필수 — 반드시 next/dynamic ssr:false로 로드할 것.

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, WMSTileLayer, Polygon, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useSimulatorStore } from "@/store/simulator";
import { MapPickerChrome, useParcelPick, type MapPickerProps } from "@/components/simulator/mapPickerShared";

const DEFAULT_CENTER: [number, number] = [37.5665, 126.978]; // 서울시청
const DEFAULT_ZOOM = 17;

function ClickHandler({ onClickAt }: { onClickAt: (lng: number, lat: number) => void }) {
  useMapEvents({
    click(e) {
      onClickAt(e.latlng.lng, e.latlng.lat);
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
      map.flyTo([parcelShape.centerLat, parcelShape.centerLon], 18, { duration: 0.8 });
    }
  }, [parcelShape, map]);
  return null;
}

export default function MapPicker(props: MapPickerProps) {
  const { multiSelect = false } = props;
  const parcelShape = useSimulatorStore((s) => s.parcelShape);
  const { picking, candidate, setCandidate, selections, setSelections, pickAt } = useParcelPick(props);
  const [showCadastral, setShowCadastral] = useState(true);
  const [satellite, setSatellite] = useState(false);

  const highlight: Array<[number, number]> | null = parcelShape
    ? parcelShape.ringLonLat.map(([lon, lat]) => [lat, lon])
    : null;

  return (
    <div className="parcel-map relative rounded-md overflow-hidden border border-border">
      {/* 십자 커서 — 클릭 지점 정밀 조준 (leaflet 기본 손바닥 커서 대체) */}
      <style>{`.parcel-map .leaflet-container, .parcel-map .leaflet-grab { cursor: crosshair !important; }
.parcel-map .leaflet-dragging .leaflet-container, .parcel-map .leaflet-dragging .leaflet-grab { cursor: grabbing !important; }`}</style>

      <MapContainer
        center={parcelShape ? [parcelShape.centerLat, parcelShape.centerLon] : DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: 320, width: "100%" }}
        maxZoom={19}
        minZoom={7}
        attributionControl={false}
      >
        <TileLayer url={`/api/tile/${satellite ? "Satellite" : "Base"}/{z}/{y}/{x}`} maxZoom={19} />
        {showCadastral && (
          <WMSTileLayer
            url="/api/wms"
            params={{ layers: "lp_pa_cbnd_bubun", format: "image/png", transparent: true, version: "1.3.0" }}
            opacity={0.65}
            maxZoom={19}
          />
        )}
        {/* 확정(조회 완료) 필지 — 코랄 */}
        {highlight && highlight.length >= 3 && (
          <Polygon positions={highlight} pathOptions={{ color: "#993C1D", weight: 2.5, fillColor: "#F0997B", fillOpacity: 0.35 }} />
        )}
        {/* 단일 모드 후보 — 파란 점선 */}
        {!multiSelect && candidate?.ring && candidate.ring.length >= 3 && (
          <Polygon positions={candidate.ring} pathOptions={{ color: "#2563EB", weight: 2.5, dashArray: "6 4", fillColor: "#60A5FA", fillOpacity: 0.25 }} />
        )}
        {/* 다중 선택 필지들 — 파란 실선 */}
        {multiSelect &&
          selections.map(
            (s) =>
              s.ring &&
              s.ring.length >= 3 && (
                <Polygon key={s.pnu} positions={s.ring} pathOptions={{ color: "#2563EB", weight: 2.5, fillColor: "#60A5FA", fillOpacity: 0.35 }} />
              ),
          )}
        <ClickHandler onClickAt={pickAt} />
        <FlyToParcel />
      </MapContainer>

      <MapPickerChrome
        {...props}
        engineLabel="브이월드"
        satellite={satellite}
        setSatellite={setSatellite}
        showCadastral={showCadastral}
        setShowCadastral={setShowCadastral}
        selections={selections}
        setSelections={setSelections}
        picking={picking}
        candidate={candidate}
        setCandidate={setCandidate}
      />
    </div>
  );
}
