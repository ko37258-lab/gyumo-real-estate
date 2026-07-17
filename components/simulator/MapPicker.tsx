"use client";

// 🗺️ 지도 필지 선택 (Phase C) — VWorld 배경지도 + 지적편집도 오버레이 + 클릭 조회.
//
// 두 가지 모드:
//   [단일] 클릭 → 후보 미리보기(파란 점선) + [이 필지 조회] 확인 → 조회
//   [다중 = 합필] 클릭 = 즉시 선택(파란 하이라이트), 재클릭 = 해제.
//          몇 필지든 연달아 선택 후 [전체 합치기 조회] 버튼 한 번으로 일괄 조회
//          (필지당 재조회 없음 — 조회 횟수 1회만 소모. 운영자 피드백 2026-07-17)
//
// 클릭 좌표 → 연속지적도 point-in-polygon(/api/vworld?kind=parcelat)으로 필지 확정,
// 지번은 지적 데이터 우선 (역지오코딩 행정구역 + 지적 지번 결합).
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
import { fetchParcelAtPoint } from "@/lib/vworld";

const DEFAULT_CENTER: [number, number] = [37.5665, 126.978]; // 서울시청
const DEFAULT_ZOOM = 17;

/** 클릭으로 확정된 필지 (후보/선택 공용) */
type PickedParcel = {
  pnu: string;
  address: string; // 조회에 사용할 지번주소
  jibunLabel: string; // 표시용 지번 (예: 562, 산1-2)
  ring: Array<[number, number]> | null; // [lat, lng]
};

/** VWorld jibun("562대", "1-20전") → 순수 지번 문자열. 산지(pnu 11번째=2)는 "산" 접두. */
function jibunNumber(jibun: string, pnu: string): string {
  const num = jibun.replace(/[가-힣]+\s*$/, "").trim();
  if (!num) return "";
  return (pnu.length === 19 && pnu[10] === "2" ? "산" : "") + num;
}

function ClickHandler({
  onResolved,
  setPicking,
}: {
  onResolved: (p: PickedParcel | null) => void;
  setPicking: (v: boolean) => void;
}) {
  useMapEvents({
    async click(e) {
      setPicking(true);
      try {
        // 지적 직격 질의(정확) + 역지오코딩(행정구역명) 병렬
        const [parcel, rev] = await Promise.all([
          fetchParcelAtPoint(e.latlng.lng, e.latlng.lat).catch(() => null),
          fetch(`/api/revgeocode?x=${e.latlng.lng}&y=${e.latlng.lat}`)
            .then(async (r) =>
              r.ok ? ((await r.json()) as { address?: string }) : null,
            )
            .catch(() => null),
        ]);

        const revAddr = rev?.address ?? "";
        let address = revAddr;
        let jibunLabel = revAddr.split(" ").pop() ?? "";

        // 지적 필지의 지번을 신뢰 — 역지오코딩 주소의 마지막 토큰(지번)만 교체
        if (parcel) {
          const num = jibunNumber(parcel.jibun, parcel.pnu);
          if (num && revAddr) {
            const parts = revAddr.split(" ");
            parts[parts.length - 1] = num;
            address = parts.join(" ");
            jibunLabel = num;
          }
        }

        if (!address) {
          onResolved(null);
          return;
        }
        onResolved({
          pnu: parcel?.pnu ?? `addr:${address}`,
          address,
          jibunLabel,
          ring: parcel?.ring
            ? parcel.ring.map(([lon, lat]) => [lat, lon] as [number, number])
            : null,
        });
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
  confirmLabel = "이 필지 조회 →",
  multiSelect = false,
  baseAddress = null,
  onMergeAll,
}: {
  onPick: (address: string) => void;
  /** 단일 모드 확인 버튼 라벨 */
  confirmLabel?: string;
  /** 다중 선택(합필) 모드 — 클릭=선택 토글, [전체 합치기]로 일괄 조회 */
  multiSelect?: boolean;
  /** 이미 조회된 대표 지번주소 — 합치기 시 자동 포함 표시용 */
  baseAddress?: string | null;
  /** 다중 선택 일괄 조회 콜백 (선택된 지번주소 배열) */
  onMergeAll?: (addresses: string[]) => void;
}) {
  const parcelShape = useSimulatorStore((s) => s.parcelShape);
  const [picking, setPicking] = useState(false);
  const [candidate, setCandidate] = useState<PickedParcel | null>(null);
  const [selections, setSelections] = useState<PickedParcel[]>([]);
  const [showCadastral, setShowCadastral] = useState(true);
  const [satellite, setSatellite] = useState(false);

  const highlight: Array<[number, number]> | null = parcelShape
    ? parcelShape.ringLonLat.map(([lon, lat]) => [lat, lon])
    : null;

  const baseJibun = baseAddress ? baseAddress.split(" ").pop() : null;

  /** 클릭 확정 처리 — 단일: 후보 칩 / 다중: 선택 토글 */
  const handleResolved = (p: PickedParcel | null) => {
    if (!multiSelect) {
      setCandidate(p);
      return;
    }
    if (!p) return;
    setSelections((prev) => {
      const exists = prev.some((s) => s.pnu === p.pnu);
      if (exists) return prev.filter((s) => s.pnu !== p.pnu); // 재클릭 = 해제
      if (baseAddress && p.address === baseAddress) return prev; // 대표는 자동 포함
      return [...prev, p];
    });
  };

  return (
    <div className="parcel-map relative rounded-md overflow-hidden border border-border">
      {/* 십자 커서 — 클릭 지점 정밀 조준 (leaflet 기본 손바닥 커서 대체) */}
      <style>{`.parcel-map .leaflet-container, .parcel-map .leaflet-grab { cursor: crosshair !important; }
.parcel-map .leaflet-dragging .leaflet-container, .parcel-map .leaflet-dragging .leaflet-grab { cursor: grabbing !important; }`}</style>

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
        {/* 확정(조회 완료) 필지 — 코랄 */}
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
        {/* 단일 모드 후보 — 파란 점선 */}
        {!multiSelect && candidate?.ring && candidate.ring.length >= 3 && (
          <Polygon
            positions={candidate.ring}
            pathOptions={{
              color: "#2563EB",
              weight: 2.5,
              dashArray: "6 4",
              fillColor: "#60A5FA",
              fillOpacity: 0.25,
            }}
          />
        )}
        {/* 다중 선택 필지들 — 파란 실선 */}
        {multiSelect &&
          selections.map(
            (s) =>
              s.ring &&
              s.ring.length >= 3 && (
                <Polygon
                  key={s.pnu}
                  positions={s.ring}
                  pathOptions={{
                    color: "#2563EB",
                    weight: 2.5,
                    fillColor: "#60A5FA",
                    fillOpacity: 0.35,
                  }}
                />
              ),
          )}
        <ClickHandler onResolved={handleResolved} setPicking={setPicking} />
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

      {/* 하단 바 */}
      <div className="absolute bottom-2 left-2 right-2 z-[1000]">
        {multiSelect ? (
          <div
            className="rounded-md shadow border px-2.5 py-2 space-y-1.5"
            style={{ background: "var(--card)", borderColor: "#2563EB" }}
          >
            <div className="flex flex-wrap items-center gap-1">
              {baseJibun && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "#F0997B33", color: "#993C1D", border: "1px solid #F0997B" }}
                >
                  대표 {baseJibun}
                </span>
              )}
              {selections.map((s) => (
                <span
                  key={s.pnu}
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "#60A5FA22", color: "#2563EB", border: "1px solid #60A5FA" }}
                >
                  {s.jibunLabel}
                  <button
                    type="button"
                    aria-label={`${s.jibunLabel} 선택 해제`}
                    onClick={() =>
                      setSelections((prev) => prev.filter((x) => x.pnu !== s.pnu))
                    }
                    className="leading-none"
                  >
                    ✕
                  </button>
                </span>
              ))}
              <span className="text-[10px] text-muted-foreground ml-0.5">
                {picking
                  ? "⏳ 필지 확인 중..."
                  : selections.length === 0
                    ? "옆 필지들을 연달아 클릭해 선택하세요 (재클릭 = 해제)"
                    : ""}
              </span>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={selections.length === 0}
                onClick={() => {
                  if (onMergeAll) onMergeAll(selections.map((s) => s.address));
                }}
                className="flex-1 text-[11.5px] font-bold px-2.5 py-1.5 rounded disabled:opacity-45"
                style={{ background: "#2563EB", color: "#fff" }}
              >
                🔗 전체 합치기 조회 (
                {baseJibun ? `대표 + ${selections.length}필지` : `${selections.length}필지`}
                ) →
              </button>
              {selections.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelections([])}
                  className="shrink-0 text-[11px] px-2 py-1.5 rounded border text-muted-foreground"
                  style={{ borderColor: "var(--border)", background: "var(--card)" }}
                >
                  전체 해제
                </button>
              )}
            </div>
          </div>
        ) : candidate ? (
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md shadow border"
            style={{ background: "var(--card)", borderColor: "#2563EB" }}
          >
            <span className="min-w-0 truncate text-[11.5px] font-medium text-foreground">
              📍 {candidate.address}
            </span>
            <button
              type="button"
              onClick={() => {
                onPick(candidate.address);
                setCandidate(null);
              }}
              className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded"
              style={{ background: "#2563EB", color: "#fff" }}
            >
              {confirmLabel}
            </button>
            <button
              type="button"
              onClick={() => setCandidate(null)}
              className="shrink-0 text-[11px] px-1.5 py-1 rounded text-muted-foreground"
              aria-label="선택 취소"
            >
              ✕
            </button>
          </div>
        ) : (
          <div
            className="inline-block text-[10.5px] font-medium px-2 py-1 rounded shadow"
            style={{ background: "var(--card)", color: "var(--muted-foreground)" }}
          >
            {picking
              ? "⏳ 필지 확인 중..."
              : "➕ 십자 커서로 필지를 클릭하면 지번을 확인한 뒤 조회할 수 있습니다"}
          </div>
        )}
      </div>
    </div>
  );
}
