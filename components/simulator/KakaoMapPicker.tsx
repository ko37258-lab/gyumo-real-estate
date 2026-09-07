"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

// 🗺️ 지도 필지 선택 — 카카오맵 엔진. MapPicker(leaflet/VWorld)와 같은 props·같은 하단 UI.
// 지적편집도는 카카오 내장 오버레이(USE_DISTRICT), 위성은 HYBRID. 클릭 → 공통 resolveParcelAt.
// SDK 는 MapPickerAuto 가 미리 로드해 두고(probeKakao) 여기서는 window.kakao 를 바로 쓴다.

import { useEffect, useRef, useState } from "react";
import { useSimulatorStore } from "@/store/simulator";
import { MapPickerChrome, useParcelPick, type MapPickerProps, type PickedParcel } from "@/components/simulator/mapPickerShared";

const DEFAULT_CENTER: [number, number] = [37.5665, 126.978]; // 서울시청
const DEFAULT_LEVEL = 3; // ≈ 웹 지도 zoom 17

export default function KakaoMapPicker(props: MapPickerProps) {
  const { multiSelect = false } = props;
  const parcelShape = useSimulatorStore((s) => s.parcelShape);
  const { picking, candidate, setCandidate, selections, setSelections, pickAt } = useParcelPick(props);
  const [showCadastral, setShowCadastral] = useState(true);
  const [satellite, setSatellite] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const polysRef = useRef<any[]>([]);
  const pickRef = useRef(pickAt);
  useEffect(() => {
    pickRef.current = pickAt;
  }, [pickAt]);

  // 지도 생성 (한 번)
  useEffect(() => {
    const kakao = (window as any).kakao;
    if (!kakao?.maps || !boxRef.current || mapRef.current) return;
    const center = parcelShape ? [parcelShape.centerLat, parcelShape.centerLon] : DEFAULT_CENTER;
    const map = new kakao.maps.Map(boxRef.current, {
      center: new kakao.maps.LatLng(center[0], center[1]),
      level: DEFAULT_LEVEL,
    });
    map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.LEFT);
    map.setCursor("crosshair");
    kakao.maps.event.addListener(map, "click", (e: any) => {
      pickRef.current(e.latLng.getLng(), e.latLng.getLat());
    });
    mapRef.current = map;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 최초 1회 생성
  }, []);

  // 위성 / 지적편집도
  useEffect(() => {
    const kakao = (window as any).kakao;
    const map = mapRef.current;
    if (!kakao?.maps || !map) return;
    map.setMapTypeId(satellite ? kakao.maps.MapTypeId.HYBRID : kakao.maps.MapTypeId.ROADMAP);
  }, [satellite]);
  useEffect(() => {
    const kakao = (window as any).kakao;
    const map = mapRef.current;
    if (!kakao?.maps || !map) return;
    if (showCadastral) map.addOverlayMapTypeId(kakao.maps.MapTypeId.USE_DISTRICT);
    else map.removeOverlayMapTypeId(kakao.maps.MapTypeId.USE_DISTRICT);
  }, [showCadastral]);

  // 조회된 필지로 이동
  useEffect(() => {
    const kakao = (window as any).kakao;
    const map = mapRef.current;
    if (!kakao?.maps || !map || !parcelShape) return;
    map.setLevel(2);
    map.panTo(new kakao.maps.LatLng(parcelShape.centerLat, parcelShape.centerLon));
  }, [parcelShape]);

  // 폴리곤 다시 그리기 — 확정(코랄) / 단일 후보(파란 점선) / 다중 선택(파란 실선)
  useEffect(() => {
    const kakao = (window as any).kakao;
    const map = mapRef.current;
    if (!kakao?.maps || !map) return;
    for (const p of polysRef.current) p.setMap(null);
    polysRef.current = [];
    const draw = (ring: Array<[number, number]>, opt: Record<string, unknown>) => {
      const poly = new kakao.maps.Polygon({
        path: ring.map(([lat, lng]) => new kakao.maps.LatLng(lat, lng)),
        strokeOpacity: 0.95,
        ...opt,
      });
      poly.setMap(map);
      // 폴리곤 위 클릭도 지도 클릭처럼 — 카카오는 폴리곤이 이벤트를 먹는다
      kakao.maps.event.addListener(poly, "click", (e: any) => {
        pickRef.current(e.latLng.getLng(), e.latLng.getLat());
      });
      polysRef.current.push(poly);
    };
    if (parcelShape) {
      const ring = parcelShape.ringLonLat.map(([lon, lat]) => [lat, lon] as [number, number]);
      if (ring.length >= 3) draw(ring, { strokeColor: "#993C1D", strokeWeight: 2.5, fillColor: "#F0997B", fillOpacity: 0.35 });
    }
    if (!multiSelect && candidate?.ring && candidate.ring.length >= 3) {
      draw(candidate.ring, { strokeColor: "#2563EB", strokeWeight: 2.5, strokeStyle: "shortdash", fillColor: "#60A5FA", fillOpacity: 0.25 });
    }
    if (multiSelect) {
      for (const s of selections as PickedParcel[]) {
        if (s.ring && s.ring.length >= 3) draw(s.ring, { strokeColor: "#2563EB", strokeWeight: 2.5, fillColor: "#60A5FA", fillOpacity: 0.35 });
      }
    }
  }, [parcelShape, candidate, selections, multiSelect]);

  useEffect(
    () => () => {
      for (const p of polysRef.current) p.setMap(null);
      polysRef.current = [];
    },
    [],
  );

  return (
    <div className="parcel-map relative rounded-md overflow-hidden border border-border">
      <div ref={boxRef} style={{ height: 320, width: "100%" }} />
      <MapPickerChrome
        {...props}
        engineLabel="카카오맵"
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
