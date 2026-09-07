"use client";

// 🗺️ 지도 필지 선택 — 엔진(카카오맵 / VWorld-leaflet)과 무관한 공통 부분.
//   · 클릭 좌표 → 필지 확정(연속지적도 point-in-polygon + 역지오코딩)  resolveParcelAt
//   · 단일/다중(합필) 선택 상태                                          useParcelPick
//   · 위성·지적도 토글 + 하단 바(후보 칩 / 합필 선택 칩)                  MapPickerChrome
// MapPicker(leaflet)·KakaoMapPicker 두 엔진이 이 파일만 공유하고, 지도 그리기만 각자 한다.

import { useState } from "react";
import { fetchParcelAtPoint } from "@/lib/vworld";

/** 클릭으로 확정된 필지 (후보/선택 공용) */
export type PickedParcel = {
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

/** 클릭 좌표(경도, 위도) → 필지. 지적 직격 질의(정확) + 역지오코딩(행정구역명) 병렬 */
export async function resolveParcelAt(lng: number, lat: number): Promise<PickedParcel | null> {
  const [parcel, rev] = await Promise.all([
    fetchParcelAtPoint(lng, lat).catch(() => null),
    fetch(`/api/revgeocode?x=${lng}&y=${lat}`)
      .then(async (r) => (r.ok ? ((await r.json()) as { address?: string }) : null))
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
  if (!address) return null;
  return {
    pnu: parcel?.pnu ?? `addr:${address}`,
    address,
    jibunLabel,
    ring: parcel?.ring ? parcel.ring.map(([lon, lat2]) => [lat2, lon] as [number, number]) : null,
  };
}

export interface MapPickerProps {
  onPick: (address: string) => void;
  /** 단일 모드 확인 버튼 라벨 */
  confirmLabel?: string;
  /** 다중 선택(합필) 모드 — 클릭=선택 토글, [전체 합치기]로 일괄 조회 */
  multiSelect?: boolean;
  /** 이미 조회된 대표 지번주소 — 합치기 시 자동 포함 표시용 */
  baseAddress?: string | null;
  /** 다중 선택 일괄 조회 콜백 (선택된 지번주소 배열) */
  onMergeAll?: (addresses: string[]) => void;
  /** 단일 모드에서 클릭 즉시 조회 (확인 버튼 생략, 조회 1회 차감) */
  autoLookup?: boolean;
}

/** 단일/다중 선택 상태 + 클릭 확정 처리 (두 엔진 공용) */
export function useParcelPick({ multiSelect = false, baseAddress = null, autoLookup = false, onPick }: MapPickerProps) {
  const [picking, setPicking] = useState(false);
  const [candidate, setCandidate] = useState<PickedParcel | null>(null);
  const [selections, setSelections] = useState<PickedParcel[]>([]);

  /** 클릭 확정 처리 — 단일: 후보 칩(즉시조회 모드면 바로 조회) / 다중: 선택 토글 */
  const handleResolved = (p: PickedParcel | null) => {
    if (!multiSelect) {
      setCandidate(p);
      if (autoLookup && p) onPick(p.address);
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

  /** 클릭 → 필지 확정까지 (picking 표시 포함) */
  const pickAt = async (lng: number, lat: number) => {
    setPicking(true);
    try {
      handleResolved(await resolveParcelAt(lng, lat));
    } finally {
      setPicking(false);
    }
  };

  return { picking, candidate, setCandidate, selections, setSelections, pickAt };
}

/** 위성·지적도 토글 + 하단 바 — 지도 위에 절대 배치되는 공통 UI */
export function MapPickerChrome({
  satellite,
  setSatellite,
  showCadastral,
  setShowCadastral,
  engineLabel,
  multiSelect = false,
  baseAddress = null,
  selections,
  setSelections,
  picking,
  candidate,
  setCandidate,
  autoLookup = false,
  confirmLabel = "이 필지 조회 →",
  onPick,
  onMergeAll,
}: MapPickerProps & {
  satellite: boolean;
  setSatellite: (v: boolean) => void;
  showCadastral: boolean;
  setShowCadastral: (v: boolean) => void;
  /** 우측 상단 작은 엔진 표시 ("카카오" / "브이월드") */
  engineLabel?: string;
  selections: PickedParcel[];
  setSelections: (f: (prev: PickedParcel[]) => PickedParcel[]) => void;
  picking: boolean;
  candidate: PickedParcel | null;
  setCandidate: (p: PickedParcel | null) => void;
}) {
  const baseJibun = baseAddress ? baseAddress.split(" ").pop() : null;
  return (
    <>
      {/* 레이어 토글 */}
      <div className="absolute top-2 right-2 z-[1000] flex gap-1 items-center">
        {engineLabel && (
          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,.85)", color: "#555" }}>
            {engineLabel}
          </span>
        )}
        <button
          type="button"
          onClick={() => setSatellite(!satellite)}
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
          onClick={() => setShowCadastral(!showCadastral)}
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
          <div className="rounded-md shadow border px-2.5 py-2 space-y-1.5" style={{ background: "var(--card)", borderColor: "#2563EB" }}>
            <div className="flex flex-wrap items-center gap-1">
              {baseJibun && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#F0997B33", color: "#993C1D", border: "1px solid #F0997B" }}>
                  대표 {baseJibun}
                </span>
              )}
              {selections.map((s) => (
                <span key={s.pnu} className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#60A5FA22", color: "#2563EB", border: "1px solid #60A5FA" }}>
                  {s.jibunLabel}
                  <button type="button" aria-label={`${s.jibunLabel} 선택 해제`} onClick={() => setSelections((prev) => prev.filter((x) => x.pnu !== s.pnu))} className="leading-none">
                    ✕
                  </button>
                </span>
              ))}
              <span className="text-[10px] text-muted-foreground ml-0.5">
                {picking ? "⏳ 필지 확인 중..." : selections.length === 0 ? "옆 필지들을 연달아 클릭해 선택하세요 (재클릭 = 해제)" : ""}
              </span>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={selections.length === 0}
                onClick={() => onMergeAll?.(selections.map((s) => s.address))}
                className="flex-1 text-[11.5px] font-bold px-2.5 py-1.5 rounded disabled:opacity-45"
                style={{ background: "#2563EB", color: "#fff" }}
              >
                🔗 전체 합치기 조회 ({baseJibun ? `대표 + ${selections.length}필지` : `${selections.length}필지`}) →
              </button>
              {selections.length > 0 && (
                <button type="button" onClick={() => setSelections(() => [])} className="shrink-0 text-[11px] px-2 py-1.5 rounded border text-muted-foreground" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                  전체 해제
                </button>
              )}
            </div>
          </div>
        ) : candidate ? (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md shadow border" style={{ background: "var(--card)", borderColor: "#2563EB" }}>
            <span className="min-w-0 truncate text-[11.5px] font-medium text-foreground">
              📍 {candidate.address}
              {autoLookup && <span className="ml-1 text-[10px]" style={{ color: "#2563EB" }}>— 조회 중...</span>}
            </span>
            {!autoLookup && (
              <button type="button" onClick={() => { onPick(candidate.address); setCandidate(null); }} className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded" style={{ background: "#2563EB", color: "#fff" }}>
                {confirmLabel}
              </button>
            )}
            <button type="button" onClick={() => setCandidate(null)} className="shrink-0 text-[11px] px-1.5 py-1 rounded text-muted-foreground" aria-label="선택 취소">
              ✕
            </button>
          </div>
        ) : (
          <div className="inline-block text-[10.5px] font-medium px-2 py-1 rounded shadow" style={{ background: "var(--card)", color: "var(--muted-foreground)" }}>
            {picking ? "⏳ 필지 확인 중..." : autoLookup ? "➕ 필지를 클릭하면 즉시 조회됩니다 (조회 1회 차감)" : "➕ 십자 커서로 필지를 클릭하면 지번을 확인한 뒤 조회할 수 있습니다"}
          </div>
        )}
      </div>
    </>
  );
}
