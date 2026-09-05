"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

// 🗺️ 아파트 일조 보기 — 카카오맵 버전 (SunMap 과 같은 props). 위성(HYBRID)/일반 전환,
// 건물 폴리곤(동별 등급 색)·동 라벨(CustomOverlay)·검색 지점 마커·지도 클릭 → 지점 재선택.
// SDK 는 SunMapAuto 가 미리 로드해 두고(probeKakao) 여기서는 window.kakao 를 바로 쓴다.

import { useEffect, useRef, useState } from "react";
import type { SunMapBuilding } from "@/components/sunlight/SunMap";

export default function KakaoSunMap({
  center,
  buildings,
  selectedId,
  onSelect,
  onPick,
}: {
  center: [number, number];
  buildings: SunMapBuilding[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPick: (lat: number, lng: number) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [satellite, setSatellite] = useState(true);
  // 최신 콜백을 ref 로 — 지도 이벤트 리스너는 한 번만 단다
  const cbRef = useRef({ onSelect, onPick, selectedId });
  useEffect(() => {
    cbRef.current = { onSelect, onPick, selectedId };
  }, [onSelect, onPick, selectedId]);

  // 지도 생성 (지점이 바뀌면 중심 이동)
  useEffect(() => {
    const kakao = (window as any).kakao;
    if (!kakao?.maps || !boxRef.current) return;
    if (!mapRef.current) {
      const map = new kakao.maps.Map(boxRef.current, {
        center: new kakao.maps.LatLng(center[0], center[1]),
        level: 3,
        mapTypeId: kakao.maps.MapTypeId.HYBRID,
      });
      map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
      kakao.maps.event.addListener(map, "click", (e: any) => {
        cbRef.current.onPick(e.latLng.getLat(), e.latLng.getLng());
      });
      mapRef.current = map;
    } else {
      mapRef.current.setCenter(new kakao.maps.LatLng(center[0], center[1]));
    }
  }, [center]);

  useEffect(() => {
    const kakao = (window as any).kakao;
    const map = mapRef.current;
    if (!kakao?.maps || !map) return;
    map.setMapTypeId(satellite ? kakao.maps.MapTypeId.HYBRID : kakao.maps.MapTypeId.ROADMAP);
  }, [satellite]);

  // 폴리곤·라벨·마커 다시 그리기
  useEffect(() => {
    const kakao = (window as any).kakao;
    const map = mapRef.current;
    if (!kakao?.maps || !map) return;
    for (const o of overlaysRef.current) o.setMap(null);
    overlaysRef.current = [];

    for (const b of buildings) {
      const selected = selectedId === b.id;
      const poly = new kakao.maps.Polygon({
        path: b.ring.map(([lat, lng]) => new kakao.maps.LatLng(lat, lng)),
        strokeWeight: selected ? 3 : b.isComplex ? 2 : 1,
        strokeColor: selected ? "#8a6d00" : b.isComplex ? (b.color ?? "#c47a5a") : "#8a8f99",
        strokeOpacity: 0.95,
        fillColor: b.isComplex ? (b.color ?? "#f3c9b8") : "#d9dce3",
        fillOpacity: b.isComplex ? 0.55 : 0.35,
      });
      poly.setMap(map);
      kakao.maps.event.addListener(poly, "click", () => {
        cbRef.current.onSelect(cbRef.current.selectedId === b.id ? null : b.id);
      });
      overlaysRef.current.push(poly);

      if (b.isComplex && b.label) {
        let cx = 0;
        let cy = 0;
        for (const [lat, lng] of b.ring) {
          cx += lat;
          cy += lng;
        }
        cx /= b.ring.length;
        cy /= b.ring.length;
        const hours = typeof b.maxRunH === "number" ? ` ${b.maxRunH.toFixed(1)}h` : "";
        const ov = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(cx, cy),
          content: `<div style="background:rgba(255,255,255,.92);border-radius:6px;padding:1px 5px;font-size:11px;font-weight:700;color:#222;box-shadow:0 1px 3px rgba(0,0,0,.25);white-space:nowrap;pointer-events:none">${b.label}${hours}</div>`,
          yAnchor: 0.5,
          zIndex: 3,
        });
        ov.setMap(map);
        overlaysRef.current.push(ov);
      }
    }

    const dot = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(center[0], center[1]),
      content: `<div style="width:12px;height:12px;border-radius:50%;background:#e11d48;border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,.4);pointer-events:none"></div>`,
      yAnchor: 0.5,
      zIndex: 4,
    });
    dot.setMap(map);
    overlaysRef.current.push(dot);
  }, [buildings, selectedId, center]);

  // 언마운트 정리
  useEffect(
    () => () => {
      for (const o of overlaysRef.current) o.setMap(null);
      overlaysRef.current = [];
    },
    [],
  );

  return (
    <div className="rounded-2xl border overflow-hidden relative" style={{ borderColor: "var(--border)" }}>
      <div ref={boxRef} style={{ height: 380, width: "100%" }} />
      <div className="absolute top-2 left-2 z-[5] flex gap-1">
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
      <div className="absolute bottom-2 left-2 z-[5] text-[11px] px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.9)", color: "#333" }}>
        카카오맵 · 색 = 동지 9~15시 연속 일조 등급 · 지도를 누르면 그 지점 주변 단지를 다시 불러옵니다
      </div>
    </div>
  );
}
