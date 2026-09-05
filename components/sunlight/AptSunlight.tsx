"use client";

// ☀️ 아파트 일조 보기 — 단지명 검색 → 주변 건물 3D → 시간대별 햇빛·그림자 + 동별 동지 일조 진단.
//
// 재사용: /api/vworld?kind=buildings(국토정보 건물 폴리곤+층수), /api/tile 위성 바닥(GroundImagery),
// lib/calc/sunPosition(태양 위치), lib/calc/aptSunlight(동별 일조 스캔).
// 좌표 규약은 규모검토 3D와 같다: 로컬 x=동, y=북 → 씬 (x, 높이, -북).

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Edges, Html } from "@react-three/drei";
import * as THREE from "three";
import { GroundImagery } from "@/components/three/GroundImagery";
import { lonLatRingToLocalAt, type Pt } from "@/lib/geo/parcel";
import { sunPosition, sunVector, SEASON_LABEL, type SunSeason } from "@/lib/calc/sunPosition";
import {
  computeBuildingSun,
  computeBuildingDetail,
  sunGrade,
  SUN_CHECK,
  SUN_SLOTS,
  type SunBuilding,
  type BuildingSun,
  type BuildingDetail,
} from "@/lib/calc/aptSunlight";

/** 보고서 하단 표기(사무소명·담당) — 기기별 localStorage 저장 */
const OFFICE_KEY = "gyumo_sunlight_office";
export interface OfficeInfo {
  name: string;
  contact: string;
}
const SEASON_KO: Record<SunSeason, string> = { winter: "동지", equinox: "춘·추분", summer: "하지" };
import { getBrandConfig } from "@/lib/branding/storage";
/** 아파트 층고 근사(m) — 규모검토의 FLOOR_HEIGHT_M(3.5, 일반 건축물)보다 낮다 */
const APT_FLOOR_M = 3.0;

// 카카오맵 우선 → 안 되면 VWorld(leaflet). 둘 다 window 가 필요해 SSR 제외
const SunMap = dynamic(() => import("@/components/sunlight/SunMapAuto"), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border grid place-items-center text-sm" style={{ height: 380, borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
      지도 불러오는 중…
    </div>
  ),
});

interface PlaceHit {
  title: string;
  category: string;
  address: string;
  lon: number;
  lat: number;
}

const RADIUS_M = 300;
const TINTS = ["#f4f2ec", "#efede6", "#f7f5f0", "#ebe9e2", "#f2efe8"];
const SEASONS: SunSeason[] = ["winter", "equinox", "summer"];

function fmtHour(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** 검색 제목에서 단지명 — "래미안대치팰리스1단지아파트/112동" → "래미안대치팰리스1단지" (동별 POI 재검색용) */
function complexName(title: string): string {
  return title
    .replace(/\/.*$/, "")
    .replace(/\(.*?\)/g, "")
    .replace(/입구|정류장|버스|주차장|정문|후문/g, "")
    .replace(/\s*\d{1,4}동\s*$/, "") // 도로명 검색 결과 "… 501동"
    .replace(/아파트$/, "")
    .replace(/\s+/g, "")
    .trim();
}

/** 건물 이름 대조용 핵심어 — 단지명에서 "1단지"·숫자까지 뺀 브랜드+지명 ("래미안대치팰리스") */
function coreName(title: string): string {
  return complexName(title).replace(/\d+단지/g, "").replace(/단지|아파트/g, "").replace(/\d+$/, "");
}

/** 동별 POI 제목에서 동 번호 — "…/112동" → "112동" */
function dongFromTitle(title: string): string | null {
  const m = title.match(/\/\s*([0-9]{1,4}(?:-[0-9]{1,3})?)\s*동\s*$/) || title.match(/\b([0-9]{1,4})동$/);
  return m ? `${m[1]}동` : null;
}

function pointInRing([px, py]: Pt, ring: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function centroid(pts: Pt[]): Pt {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of pts) {
    cx += x;
    cy += y;
  }
  return [cx / pts.length, cy / pts.length];
}

/** 동 이름 짧게 — "래미안대치팰리스101동" → "101동", 그 외는 이름 그대로(길면 앞 12자) */
function shortName(name: string): string {
  const m = name.match(/(\d{1,4})\s*동/);
  if (m) return `${m[1]}동`;
  const n = name.replace(/\s+/g, " ").trim();
  return n.length > 12 ? n.slice(0, 12) + "…" : n;
}

export default function AptSunlight() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [place, setPlace] = useState<PlaceHit | null>(null);
  const [buildings, setBuildings] = useState<SunBuilding[] | null>(null);
  const [loadingBld, setLoadingBld] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState<SunSeason>("winter");
  const [hour, setHour] = useState(12);
  const [playing, setPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sunMap, setSunMap] = useState<Map<string, BuildingSun> | null>(null);
  const [computing, setComputing] = useState(false);
  const [radiusM, setRadiusM] = useState(150);
  /** 건물 id → 동 번호 ("112동") — 검색 API의 동별 POI 좌표를 건물 폴리곤에 대응시켜 얻는다 */
  const [dongMap, setDongMap] = useState<Map<string, string>>(() => new Map());
  const [pdfBusy, setPdfBusy] = useState(false);
  /** 선택 동 상세(면·층별 타임라인) */
  const [detail, setDetail] = useState<BuildingDetail | null>(null);
  const [office, setOffice] = useState<OfficeInfo>({ name: "", contact: "" });

  // 사무소 표기 불러오기 (SSR 불일치를 피하려 마운트 뒤 비동기로)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const raw = localStorage.getItem(OFFICE_KEY);
        if (raw) setOffice(JSON.parse(raw) as OfficeInfo);
      } catch {
        /* 저장값 없음 */
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);
  function updateOffice(patch: Partial<OfficeInfo>) {
    setOffice((o) => {
      const next = { ...o, ...patch };
      try {
        localStorage.setItem(OFFICE_KEY, JSON.stringify(next));
      } catch {
        /* 사생활 모드 등 */
      }
      return next;
    });
  }

  // 선택 동 상세 계산 — 면(방향)별 × 1층/중간층/최상층 타임라인 + 그림자 원인 + 계절 비교
  useEffect(() => {
    const t = setTimeout(() => {
      if (!selectedId || !buildings || !place) {
        setDetail(null);
        return;
      }
      const subject = buildings.find((b) => b.id === selectedId);
      if (!subject) {
        setDetail(null);
        return;
      }
      setDetail(computeBuildingDetail({ subject, occluders: buildings, latDeg: place.lat, lonDeg: place.lon }));
    }, 30);
    return () => clearTimeout(t);
  }, [selectedId, buildings, place]);
  /** 건물 id → 경위도 링 [lat,lng] — 아래 지도 폴리곤용 */
  const [ringMap, setRingMap] = useState<Map<string, Array<[number, number]>>>(() => new Map());
  /** r3f 캔버스 — PDF 캡처용 (preserveDrawingBuffer 로 toDataURL 가능) */
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── 검색 ──
  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true);
    setError(null);
    try {
      const r = await fetch(`/api/sunlight/search?q=${encodeURIComponent(q)}`);
      const d = (await r.json()) as { items?: PlaceHit[]; error?: string };
      if (!r.ok) throw new Error(d.error || "검색 실패");
      setHits(d.items ?? []);
      if ((d.items ?? []).length === 0) setError("검색 결과가 없습니다. 단지명이나 지번 주소로 다시 검색해 보세요.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "검색 실패");
    } finally {
      setSearching(false);
    }
  }

  // ── 건물 불러오기 ──
  // (상태 초기화는 단지를 고르는 클릭 핸들러 choosePlace 에서 — 이펙트 본문에서는 fetch 만)
  useEffect(() => {
    if (!place) return;
    let alive = true;
    fetch(`/api/vworld?kind=buildings&x=${place.lon}&y=${place.lat}&r=${RADIUS_M}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { buildings?: Array<{ ring: Array<[number, number]>; floors: number; name?: string }> } | null) => {
        if (!alive) return;
        if (!d?.buildings || d.buildings.length === 0) {
          setError("이 위치 주변의 건물 정보를 찾지 못했습니다.");
          setBuildings([]);
          return;
        }
        const out: SunBuilding[] = [];
        const rings = new Map<string, Array<[number, number]>>();
        d.buildings.forEach((b, i) => {
          const pts = lonLatRingToLocalAt(b.ring, place.lon, place.lat);
          const [cx, cy] = centroid(pts);
          if (Math.hypot(cx, cy) > RADIUS_M + 20) return;
          rings.set(`b${i}`, b.ring.map(([lon, lat]) => [lat, lon] as [number, number]));
          out.push({
            id: `b${i}`,
            name: (b.name ?? "").trim(),
            pts,
            floors: b.floors,
            heightM: Math.max(3, b.floors * APT_FLOOR_M),
          });
        });
        setRingMap(rings);
        setBuildings(out);
      })
      .catch(() => alive && setError("건물 정보를 불러오지 못했습니다."))
      .finally(() => alive && setLoadingBld(false));
    return () => {
      alive = false;
    };
  }, [place]);

  // ── 동별 POI("…/112동") 재검색 → 건물 폴리곤에 동 번호 대응 ──
  useEffect(() => {
    if (!buildings || buildings.length === 0 || !place) return;
    let alive = true;
    const name = complexName(place.title);
    if (name.length < 2) return;
    fetch(`/api/sunlight/search?q=${encodeURIComponent(name)}&size=60`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { items?: PlaceHit[] } | null) => {
        if (!alive || !d?.items) return;
        const map = new Map<string, string>();
        for (const it of d.items) {
          const dong = dongFromTitle(it.title);
          if (!dong) continue;
          const [px, py] = lonLatRingToLocalAt([[it.lon, it.lat]], place.lon, place.lat)[0];
          // 폴리곤 안 → 그 건물, 없으면 30m 안 가장 가까운 건물
          let hit = buildings.find((b) => pointInRing([px, py], b.pts));
          if (!hit) {
            let best = 30;
            for (const b of buildings) {
              const [cx, cy] = centroid(b.pts);
              const dd = Math.hypot(cx - px, cy - py);
              if (dd < best) {
                best = dd;
                hit = b;
              }
            }
          }
          if (hit && !map.has(hit.id)) map.set(hit.id, dong);
        }
        setDongMap(map);
      })
      .catch(() => {
        /* 동 번호는 보조 정보 — 실패해도 이름·반경으로 진행 */
      });
    return () => {
      alive = false;
    };
  }, [buildings, place]);

  // ── 단지 동 판별: 동별 POI 대응 + 건물 이름 일치 → 없으면 반경 안 5층 이상 ──
  const { complexIds, byName } = useMemo(() => {
    if (!buildings || !place) return { complexIds: new Set<string>(), byName: false };
    const core = coreName(place.title);
    const named = new Set<string>(dongMap.keys());
    if (core.length >= 2) {
      for (const b of buildings) {
        if (b.name.replace(/\s+/g, "").includes(core)) named.add(b.id);
      }
    }
    if (named.size >= 1) return { complexIds: named, byName: true };
    const near = new Set<string>();
    for (const b of buildings) {
      const [cx, cy] = centroid(b.pts);
      if (Math.hypot(cx, cy) <= radiusM && b.floors >= 5) near.add(b.id);
    }
    return { complexIds: near, byName: false };
  }, [buildings, place, radiusM, dongMap]);

  // ── 동별 동지 일조 스캔 (UI 그린 뒤 계산) ──
  useEffect(() => {
    if (!buildings || !place || complexIds.size === 0) return;
    let alive = true;
    // "계산 중" 배지를 먼저 그리고(0ms) 무거운 스캔은 다음 틱(60ms)에
    const t0 = setTimeout(() => alive && setComputing(true), 0);
    const subjects = buildings
      .filter((b) => complexIds.has(b.id))
      .sort((a, b) => {
        const [ax, ay] = centroid(a.pts);
        const [bx, by] = centroid(b.pts);
        return Math.hypot(ax, ay) - Math.hypot(bx, by);
      })
      .slice(0, 60);
    const t = setTimeout(() => {
      const res = computeBuildingSun({
        subjects,
        occluders: buildings,
        latDeg: place.lat,
        lonDeg: place.lon,
        season: "winter",
      });
      if (!alive) return;
      setSunMap(new Map(res.map((r) => [r.id, r])));
      setComputing(false);
    }, 60);
    return () => {
      alive = false;
      clearTimeout(t0);
      clearTimeout(t);
    };
  }, [buildings, place, complexIds]);

  /** 단지 선택 — 이전 단지의 상태를 여기서 한 번에 비운다 */
  function choosePlace(h: PlaceHit) {
    setPlace(h);
    setHits([]);
    setLoadingBld(true);
    setBuildings(null);
    setSunMap(null);
    setSelectedId(null);
    setError(null);
    setPlaying(false);
    setDongMap(new Map());
    setRingMap(new Map());
  }

  /** 지도 클릭 → 그 지점을 새 검색 지점으로 (역지오코딩 주소를 제목으로) */
  async function pickFromMap(lat: number, lng: number) {
    let address = "";
    try {
      const r = await fetch(`/api/revgeocode?x=${lng}&y=${lat}`);
      if (r.ok) address = ((await r.json()) as { address?: string }).address ?? "";
    } catch {
      /* 주소는 표시용 */
    }
    choosePlace({ title: address || "지도에서 고른 위치", category: "지도 선택", address, lon: lng, lat });
  }
  const effectiveSunMap = complexIds.size > 0 ? sunMap : null;

  /** 동지 특정 시각으로 맞춘 뒤 한두 프레임 기다려 캔버스를 JPEG 로 */
  function captureAt(h: number): Promise<string | null> {
    return new Promise((resolve) => {
      setPlaying(false);
      setSeason("winter");
      setHour(h);
      setTimeout(() => {
        try {
          const d = canvasRef.current ? canvasRef.current.toDataURL("image/jpeg", 0.85) : null;
          // 탭이 숨겨져 캔버스가 그려지지 않았으면(빈 300×150) 캡처를 싣지 않는다
          resolve(d && d.length > 8000 ? d : null);
        } catch {
          resolve(null);
        }
      }, 450);
    });
  }

  /** 📄 일조 검토 보고서 PDF — 동지 9·12·15시 3D 캡처 + 동별 표 (이행강제금 PDF 와 같은 blob 패턴) */
  async function handleDownloadPdf() {
    if (!place || rows.length === 0 || pdfBusy) return;
    setPdfBusy(true);
    const prevSeason = season;
    const prevHour = hour;
    let url: string | null = null;
    try {
      const snapshots: Array<{ label: string; dataUrl: string }> = [];
      for (const h of [9, 12, 15]) {
        const d = await captureAt(h);
        if (d) snapshots.push({ label: `동지 ${fmtHour(h)}`, dataUrl: d });
      }
      setSeason(prevSeason);
      setHour(prevHour);
      const [{ pdf }, { AptSunlightDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/report/AptSunlightDocument"),
      ]);
      const reviewDate = new Date().toISOString().slice(0, 10);
      const blob = await pdf(
        <AptSunlightDocument
          input={{
            placeTitle: place.title,
            address: place.address,
            reviewDate,
            snapshots,
            rows: rows.map(({ b, s, label }) => {
              const g = sunGrade(s.best.maxRunH);
              return { label, floors: b.floors, maxRunH: s.best.maxRunH, totalH: s.best.totalH, grade: g.label, color: g.color };
            }),
            summary: summary ?? { pass: 0, total: 0, avg: 0 },
            selection: byName
              ? "국토정보 동별 위치(POI)·건물 이름이 단지명과 일치하는 건물"
              : `단지명이 건물 자료에 없어 검색 지점 반경 ${radiusM}m 안 5층 이상 건물`,
            basis: SUN_CHECK.basis,
            office: office.name.trim() ? { name: office.name.trim(), contact: office.contact.trim() } : undefined,
            detail:
              detail && selectedBuilding
                ? {
                    label: labelOfId(selectedBuilding.id),
                    floors: selectedBuilding.floors,
                    heightM: selectedBuilding.heightM,
                    bestFace: detail.bestFace,
                    faces: detail.faces.map((f) => ({
                      orientation: f.orientation,
                      lengthM: f.lengthM,
                      levels: f.levels.map((lv) => ({
                        label: lv.label,
                        heightM: lv.heightM,
                        totalH: lv.totalH,
                        maxRunH: lv.maxRunH,
                        timeline: lv.timeline,
                        blockers: lv.blockers.slice(0, 3).map((bk) => `${labelOfId(bk.id)}(${(bk.slots * SUN_CHECK.stepH).toFixed(2)}h)`),
                      })),
                    })),
                    seasons: detail.seasons.map((sn) => ({ label: SEASON_KO[sn.season], totalH: sn.totalH, maxRunH: sn.maxRunH })),
                    slots: SUN_SLOTS,
                  }
                : undefined,
          }}
          brand={getBrandConfig()}
        />,
      ).toBlob();
      url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `아파트일조검토_${place.title.replace(/[\\/:*?"<>|\s]/g, "_").slice(0, 30)}_${reviewDate.replace(/-/g, "")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error("[아파트 일조 PDF] 생성 실패:", e);
      alert("PDF 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPdfBusy(false);
      setTimeout(() => {
        if (url) URL.revokeObjectURL(url);
      }, 500);
    }
  }

  // ── 재생 ──
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setHour((h) => (h >= 19 ? 6 : Math.round((h + 0.25) * 4) / 4));
    }, 180);
    return () => clearInterval(id);
  }, [playing]);

  const sun = useMemo(
    () =>
      place
        ? sunPosition({ latDeg: place.lat, lonDeg: place.lon, season, hourKST: hour })
        : null,
    [place, season, hour],
  );

  // 동별 표 행 — 60행 이하라 매 렌더 계산해도 가볍다 (React 컴파일러가 알아서 메모)
  const rows =
    !buildings || !effectiveSunMap
      ? []
      : buildings
          .filter((b) => effectiveSunMap.has(b.id))
          .map((b) => ({
            b,
            s: effectiveSunMap.get(b.id)!,
            label: dongMap.get(b.id) ?? (b.name ? shortName(b.name) : `건물 ${b.id.slice(1)}`),
          }))
          .sort((a, c) => a.label.localeCompare(c.label, "ko", { numeric: true }));

  const selectedBuilding = selectedId && buildings ? buildings.find((b) => b.id === selectedId) ?? null : null;
  const labelOfId = (id: string) => {
    const b = buildings?.find((x) => x.id === id);
    return dongMap.get(id) ?? (b?.name ? shortName(b.name) : `건물 ${id.slice(1)}`);
  };

  const summary =
    rows.length === 0
      ? null
      : {
          pass: rows.filter((r) => r.s.best.maxRunH >= SUN_CHECK.passRunH).length,
          total: rows.length,
          avg: rows.reduce((a, r) => a + r.s.best.maxRunH, 0) / rows.length,
        };

  return (
    <div className="space-y-4">
      {/* 검색 */}
      <form onSubmit={runSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="아파트 단지명 또는 지번 주소 (예: 래미안대치팰리스, 대치동 1027)"
          className="flex-1 rounded-lg px-3.5 py-2.5 text-sm border outline-none"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        />
        <button
          type="submit"
          disabled={searching}
          className="rounded-lg px-5 py-2.5 text-sm font-bold transition-opacity hover:opacity-85 disabled:opacity-50"
          style={{ background: "#FFCF0D", color: "#020425" }}
        >
          {searching ? "검색 중…" : "검색"}
        </button>
      </form>

      {hits.length > 0 && !place && (
        <ul className="rounded-xl border divide-y text-sm" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          {hits.map((h, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => choosePlace(h)}
                className="w-full text-left px-4 py-3 hover:bg-secondary transition-colors"
              >
                <div className="font-medium">{h.title}</div>
                <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {h.address}
                  {h.category ? ` · ${h.category}` : ""}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)", color: "#dc2626" }}>
          {error}
        </div>
      )}

      {place && (
        <div className="flex items-center justify-between gap-3 flex-wrap text-sm">
          <div>
            <span className="font-semibold">{place.title}</span>
            <span className="ml-2 text-xs" style={{ color: "var(--muted-foreground)" }}>{place.address}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setPlace(null);
              setBuildings(null);
              setSunMap(null);
              setPlaying(false);
            }}
            className="text-xs px-3 py-1.5 rounded-lg border hover:bg-secondary"
            style={{ borderColor: "var(--border)" }}
          >
            다른 단지 검색
          </button>
        </div>
      )}

      {place && (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          {/* 3D */}
          <div className="rounded-2xl border overflow-hidden relative" style={{ borderColor: "var(--border)", background: "#dfe7ee", minHeight: 420 }}>
            <div className="w-full" style={{ aspectRatio: "16 / 11" }}>
              {buildings && buildings.length > 0 && sun && (
                <Canvas
                  shadows
                  dpr={[1, 1.5]}
                  camera={{ position: [220, 180, 260], fov: 40, near: 0.5, far: 3000 }}
                  gl={{ antialias: true, preserveDrawingBuffer: true }}
                  onCreated={(st) => {
                    canvasRef.current = st.gl.domElement;
                  }}
                >
                  <color attach="background" args={["#dfe7ee"]} />
                  <Scene
                    key={`${place.lon},${place.lat}`}
                    buildings={buildings}
                    complexIds={complexIds}
                    dongMap={dongMap}
                    sunMap={effectiveSunMap}
                    sun={sun}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    centerLon={place.lon}
                    centerLat={place.lat}
                  />
                </Canvas>
              )}
              {loadingBld && (
                <div className="absolute inset-0 grid place-items-center text-sm" style={{ color: "var(--muted-foreground)" }}>
                  주변 건물을 불러오는 중…
                </div>
              )}
            </div>
            {/* 시간 배지 */}
            {sun && (
              <div className="absolute top-3 left-3 rounded-lg px-3 py-2 text-xs shadow" style={{ background: "rgba(255,255,255,0.92)", color: "#111" }}>
                <div className="font-bold text-sm">
                  {SEASON_LABEL[season]} · {fmtHour(hour)}
                </div>
                <div style={{ color: "#555" }}>
                  {sun.altitudeDeg > 0
                    ? `태양 고도 ${sun.altitudeDeg.toFixed(1)}° · 방위 ${sun.azimuthDeg.toFixed(0)}°`
                    : "해가 지평선 아래 (밤)"}
                </div>
              </div>
            )}
            {computing && (
              <div className="absolute top-3 right-3 rounded-lg px-3 py-1.5 text-xs" style={{ background: "rgba(255,255,255,0.9)", color: "#333" }}>
                동별 일조 계산 중…
              </div>
            )}
          </div>

          {/* 지도 — 3D 아래 (모바일에서는 조작 패널 뒤) */}
          <div className="lg:col-start-1 lg:row-start-2">
            {buildings && buildings.length > 0 && (
              <SunMap
                center={[place.lat, place.lon]}
                buildings={buildings.map((b) => {
                  const s = effectiveSunMap?.get(b.id);
                  return {
                    id: b.id,
                    ring: ringMap.get(b.id) ?? [],
                    label: dongMap.get(b.id) ?? (b.name ? shortName(b.name) : ""),
                    isComplex: complexIds.has(b.id),
                    color: s ? sunGrade(s.best.maxRunH).color : null,
                    floors: b.floors,
                    maxRunH: s?.best.maxRunH,
                  };
                }).filter((b) => b.ring.length >= 3)}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onPick={pickFromMap}
              />
            )}
          </div>

          {/* 조작 패널 */}
          <div className="space-y-4">
            <div className="rounded-2xl border p-4 space-y-3" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="text-sm font-semibold">시간대별 햇빛</div>
              <div className="flex gap-1.5">
                {SEASONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeason(s)}
                    className="flex-1 text-xs font-semibold px-2 py-1.5 rounded-md border transition-colors"
                    style={
                      season === s
                        ? { background: "rgba(255,207,13,0.18)", borderColor: "#FFCF0D", color: "#8a6d00" }
                        : { borderColor: "var(--border)", color: "var(--muted-foreground)" }
                    }
                  >
                    {SEASON_LABEL[s]}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  className="text-xs font-bold px-3 py-1.5 rounded-md"
                  style={{ background: "#FFCF0D", color: "#020425" }}
                >
                  {playing ? "❚❚ 멈춤" : "▶ 하루 재생"}
                </button>
                <input
                  type="range"
                  min={6}
                  max={19}
                  step={0.25}
                  value={hour}
                  onChange={(e) => {
                    setPlaying(false);
                    setHour(Number(e.target.value));
                  }}
                  className="flex-1"
                  aria-label="시각"
                />
                <span className="text-sm font-semibold tabular-nums w-12 text-right">{fmtHour(hour)}</span>
              </div>
              <div className="flex gap-1.5">
                {[8, 9, 10, 12, 14, 15, 16].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      setPlaying(false);
                      setHour(h);
                    }}
                    className="flex-1 text-[11px] px-1 py-1 rounded border"
                    style={
                      hour === h
                        ? { background: "var(--secondary)", borderColor: "var(--border)", fontWeight: 700 }
                        : { borderColor: "var(--border)", color: "var(--muted-foreground)" }
                    }
                  >
                    {h}시
                  </button>
                ))}
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                동지·춘추분·하지의 태양 위치로 그림자를 그립니다. 시각은 한국표준시(경도 보정 반영), 균시차 생략 ±15분.
              </p>
            </div>

            {/* 동별 일조 결과 */}
            <div className="rounded-2xl border p-4 space-y-3" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">동별 동지 일조 (9~15시)</div>
                {summary && (
                  <div className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                    2h 이상 {summary.pass}/{summary.total}동 · 평균 {summary.avg.toFixed(1)}h
                  </div>
                )}
              </div>
              {!byName && buildings && buildings.length > 0 && (
                <label className="flex items-center gap-2 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                  단지 이름이 건물 자료에 없어 반경으로 골랐습니다
                  <select
                    value={radiusM}
                    onChange={(e) => setRadiusM(Number(e.target.value))}
                    className="rounded border px-1.5 py-0.5 text-[11px]"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    {[100, 150, 200, 250].map((r) => (
                      <option key={r} value={r}>
                        반경 {r}m
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="flex flex-wrap gap-2 text-[11px]">
                {[4, 2, 1, 0].map((h) => {
                  const g = sunGrade(h);
                  return (
                    <span key={h} className="inline-flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm" style={{ background: g.color }} />
                      {g.label}
                    </span>
                  );
                })}
              </div>
              {rows.length > 0 ? (
                <div className="max-h-72 overflow-auto -mx-1">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ color: "var(--muted-foreground)" }}>
                        <th className="text-left px-1 py-1 font-medium">동</th>
                        <th className="text-right px-1 py-1 font-medium">층</th>
                        <th className="text-right px-1 py-1 font-medium">연속</th>
                        <th className="text-right px-1 py-1 font-medium">총</th>
                        <th className="text-left px-1 py-1 font-medium">등급</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ b, s, label }) => {
                        const g = sunGrade(s.best.maxRunH);
                        const active = selectedId === b.id;
                        return (
                          <tr
                            key={b.id}
                            onClick={() => setSelectedId(active ? null : b.id)}
                            className="cursor-pointer"
                            style={{ background: active ? "rgba(255,207,13,0.12)" : undefined, borderTop: "1px solid var(--border)" }}
                          >
                            <td className="px-1 py-1.5 font-medium">{label}</td>
                            <td className="px-1 py-1.5 text-right tabular-nums">{b.floors}</td>
                            <td className="px-1 py-1.5 text-right tabular-nums font-semibold">{s.best.maxRunH.toFixed(2)}h</td>
                            <td className="px-1 py-1.5 text-right tabular-nums">{s.best.totalH.toFixed(2)}h</td>
                            <td className="px-1 py-1.5">
                              <span className="inline-flex items-center gap-1">
                                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: g.color }} />
                                {g.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {computing ? "계산 중…" : buildings && buildings.length > 0 ? "단지 동을 찾지 못했습니다. 반경을 넓혀 보세요." : "단지를 선택하면 동별 일조를 계산합니다."}
                </p>
              )}
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                {SUN_CHECK.basis}. 인허가·소송 판단이 아닌 참고용입니다.
              </p>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={rows.length === 0 || computing || pdfBusy}
                className="w-full rounded-lg py-2.5 text-sm font-bold transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ background: "#993C1D", color: "#fff" }}
              >
                {pdfBusy
                  ? "보고서 만드는 중… (동지 9·12·15시 캡처)"
                  : selectedBuilding
                    ? `📄 보고서 PDF (단지 + ${labelOfId(selectedBuilding.id)} 상세)`
                    : "📄 일조 검토 보고서 PDF 다운로드"}
              </button>
            </div>

            {/* 선택 동 상세 — 표·3D·지도 어디서든 동을 누르면 */}
            {selectedBuilding && (
              <div className="rounded-2xl border p-4 space-y-3" style={{ background: "var(--card)", borderColor: "rgba(255,207,13,0.6)" }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">🏢 {labelOfId(selectedBuilding.id)} 상세</div>
                  <button type="button" onClick={() => setSelectedId(null)} className="text-[11px] px-2 py-1 rounded border" style={{ borderColor: "var(--border)" }}>
                    닫기
                  </button>
                </div>
                <div className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                  {selectedBuilding.floors}층 · 높이 약 {selectedBuilding.heightM.toFixed(0)}m
                  {selectedBuilding.name ? ` · ${selectedBuilding.name}` : ""}
                </div>
                {!detail ? (
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>상세 계산 중…</p>
                ) : (
                  <>
                    {(() => {
                      const bf = detail.faces[detail.bestFace];
                      if (!bf) return null;
                      const g = sunGrade(bf.levels[0].maxRunH);
                      return (
                        <div className="rounded-lg px-3 py-2 text-xs" style={{ background: `${g.color}22`, border: `1px solid ${g.color}` }}>
                          <b>{bf.orientation} 면(1층)</b> 동지 연속 <b>{bf.levels[0].maxRunH.toFixed(2)}h</b> · 총 {bf.levels[0].totalH.toFixed(2)}h → <b style={{ color: g.color }}>{g.label}</b>
                          {bf.levels[0].blockers.length > 0 && (
                            <div className="mt-1" style={{ color: "var(--muted-foreground)" }}>
                              그림자 원인: {bf.levels[0].blockers.slice(0, 3).map((bk) => `${labelOfId(bk.id)} ${(bk.slots * SUN_CHECK.stepH).toFixed(2)}h`).join(" · ")}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* 층별 타임라인 (최적면) */}
                    <div className="space-y-1">
                      <div className="flex text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                        <span className="w-12 shrink-0" />
                        {[9, 10, 11, 12, 13, 14, 15].map((h) => (
                          <span key={h} className="flex-1 text-left">{h}시</span>
                        ))}
                      </div>
                      {detail.faces[detail.bestFace]?.levels.map((lv) => (
                        <div key={lv.label} className="flex items-center gap-1">
                          <span className="w-12 shrink-0 text-[11px] font-medium">{lv.label}</span>
                          <div className="flex-1 flex gap-px">
                            {lv.timeline.map((lit, i) => (
                              <span
                                key={i}
                                title={`${fmtHour(SUN_SLOTS[i])} ${lit ? "햇빛" : "그림자"}`}
                                className="flex-1 h-3 rounded-[2px]"
                                style={{ background: lit ? "#f5b431" : "#94a3b8" }}
                              />
                            ))}
                          </div>
                          <span className="w-14 shrink-0 text-[11px] text-right tabular-nums">{lv.maxRunH.toFixed(2)}h</span>
                        </div>
                      ))}
                      <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                        노랑 = 햇빛, 회색 = 그림자 (동지, 15분 단위). 오른쪽 = 최장 연속 일조.
                      </div>
                    </div>

                    {/* 면별 표 */}
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr style={{ color: "var(--muted-foreground)" }}>
                          <th className="text-left py-1 font-medium">면</th>
                          <th className="text-right py-1 font-medium">길이</th>
                          <th className="text-right py-1 font-medium">1층</th>
                          <th className="text-right py-1 font-medium">중간층</th>
                          <th className="text-right py-1 font-medium">최상층</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.faces.map((f, i) => (
                          <tr key={f.edgeIdx} style={{ borderTop: "1px solid var(--border)", fontWeight: i === detail.bestFace ? 700 : 400 }}>
                            <td className="py-1">{f.orientation}{i === detail.bestFace ? " ★" : ""}</td>
                            <td className="py-1 text-right tabular-nums">{f.lengthM.toFixed(0)}m</td>
                            {f.levels.map((lv) => (
                              <td key={lv.label} className="py-1 text-right tabular-nums" style={{ color: sunGrade(lv.maxRunH).color }}>
                                {lv.maxRunH.toFixed(2)}h
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* 계절 비교 */}
                    <div className="flex gap-1.5 text-[11px]">
                      {detail.seasons.map((sn) => (
                        <div key={sn.season} className="flex-1 rounded-lg px-2 py-1.5 text-center" style={{ background: "var(--secondary)" }}>
                          <div style={{ color: "var(--muted-foreground)" }}>{SEASON_KO[sn.season]}</div>
                          <div className="font-semibold tabular-nums">연속 {sn.maxRunH.toFixed(2)}h</div>
                          <div className="tabular-nums" style={{ color: "var(--muted-foreground)" }}>총 {sn.totalH.toFixed(2)}h</div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                      면 = 건물 외곽선의 각 변(★ 가장 유리한 면). 값은 해당 면 중앙의 창 높이에서 본 9~15시 최장 연속 일조. 계절 비교는 1층 최적면 기준.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* 보고서 표기 — 사무소명·담당 */}
            <div className="rounded-2xl border p-4 space-y-2" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="text-sm font-semibold">보고서 하단 표기</div>
              <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                입력하면 PDF 맨 아래 작성자 줄과 면책 문구에 사무소명이 들어갑니다. 비워 두면 기본 브랜드로 나갑니다. (이 기기에 저장)
              </p>
              <input
                value={office.name}
                onChange={(e) => updateOffice({ name: e.target.value })}
                placeholder="사무소명 (예: OO공인중개사사무소)"
                className="w-full rounded-lg px-3 py-2 text-sm border outline-none"
                style={{ background: "var(--secondary)", borderColor: "var(--border)" }}
              />
              <input
                value={office.contact}
                onChange={(e) => updateOffice({ contact: e.target.value })}
                placeholder="담당자·연락처 (예: 홍길동 대표 010-0000-0000)"
                className="w-full rounded-lg px-3 py-2 text-sm border outline-none"
                style={{ background: "var(--secondary)", borderColor: "var(--border)" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3D 장면
// ─────────────────────────────────────────────────────────────

function Scene({
  buildings,
  complexIds,
  dongMap,
  sunMap,
  sun,
  selectedId,
  onSelect,
  centerLon,
  centerLat,
}: {
  buildings: SunBuilding[];
  complexIds: Set<string>;
  dongMap: Map<string, string>;
  sunMap: Map<string, BuildingSun> | null;
  sun: { altitudeDeg: number; azimuthDeg: number };
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  centerLon: number;
  centerLat: number;
}) {
  const vec = useMemo(() => sunVector(sun), [sun]);
  const up = sun.altitudeDeg > 0;

  const geoms = useMemo(
    () =>
      buildings.map((b) => {
        let signed = 0;
        for (let i = 0; i < b.pts.length; i++) {
          const [x1, y1] = b.pts[i];
          const [x2, y2] = b.pts[(i + 1) % b.pts.length];
          signed += x1 * y2 - x2 * y1;
        }
        const pts = signed < 0 ? [...b.pts].reverse() : b.pts;
        const sh = new THREE.Shape();
        pts.forEach(([x, y], i) => (i === 0 ? sh.moveTo(x, y) : sh.lineTo(x, y)));
        const g = new THREE.ExtrudeGeometry(sh, { depth: b.heightM, bevelEnabled: false });
        g.computeVertexNormals();
        return g;
      }),
    [buildings],
  );
  useEffect(() => () => geoms.forEach((g) => g.dispose()), [geoms]);

  const labelInfo = useMemo(
    () =>
      buildings
        .filter((b) => complexIds.has(b.id))
        .map((b) => {
          const [cx, cy] = centroid(b.pts);
          const name = dongMap.get(b.id) ?? (b.name ? shortName(b.name) : "동");
          return { id: b.id, name, pos: [cx, b.heightM + 3, -cy] as [number, number, number] };
        })
        .slice(0, 60),
    [buildings, complexIds, dongMap],
  );

  const lightRef = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    lightRef.current?.target.position.set(0, 0, 0);
    lightRef.current?.target.updateMatrixWorld();
  }, []);

  return (
    <>
      <hemisphereLight args={["#dfefff", "#cfc7b8", up ? 0.35 : 0.5]} />
      <ambientLight intensity={up ? 0.22 : 0.3} color="#fff7ec" />
      <directionalLight
        ref={lightRef}
        position={up ? [vec[0] * 420, Math.max(vec[1] * 420, 4), vec[2] * 420] : [200, 300, 150]}
        intensity={up ? (sun.altitudeDeg < 12 ? 1.1 : 1.45) : 0.08}
        color={up && sun.altitudeDeg < 15 ? "#ffd9a0" : "#ffffff"}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-left={-340}
        shadow-camera-right={340}
        shadow-camera-top={340}
        shadow-camera-bottom={-340}
        shadow-camera-near={10}
        shadow-camera-far={1200}
        shadow-bias={-0.0006}
        shadow-normalBias={0.4}
      />
      <fog attach="fog" args={["#dfe7ee", 700, 1600]} />

      {/* 바닥: 위성 타일 + 그 아래 받침 평면 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]} receiveShadow>
        <planeGeometry args={[2400, 2400]} />
        <meshStandardMaterial color="#d6d9cf" roughness={1} />
      </mesh>
      <GroundImagery centerLon={centerLon} centerLat={centerLat} halfM={RADIUS_M + 40} />

      {/* 건물 */}
      {buildings.map((b, i) => {
        const isComplex = complexIds.has(b.id);
        const grade = sunMap?.get(b.id) ? sunGrade(sunMap.get(b.id)!.best.maxRunH) : null;
        const color = isComplex ? (grade ? grade.color : "#f3c9b8") : TINTS[i % TINTS.length];
        const selected = selectedId === b.id;
        return (
          <mesh
            key={b.id}
            geometry={geoms[i]}
            rotation={[-Math.PI / 2, 0, 0]}
            castShadow
            receiveShadow
            onClick={(e) => {
              e.stopPropagation();
              onSelect(selected ? null : b.id);
            }}
          >
            <meshStandardMaterial color={color} roughness={0.9} emissive={selected ? "#ffcf0d" : "#000000"} emissiveIntensity={selected ? 0.35 : 0} />
            <Edges color={selected ? "#8a6d00" : isComplex ? "#7d6a5a" : "#b9b3a6"} threshold={20} />
          </mesh>
        );
      })}

      {/* 동 라벨 */}
      {labelInfo.map((l) => {
        const s = sunMap?.get(l.id);
        const g = s ? sunGrade(s.best.maxRunH) : null;
        return (
          <Html key={l.id} position={l.pos} center distanceFactor={420} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.94)",
                border: `1.5px solid ${g ? g.color : "#c9a"}`,
                borderRadius: 8,
                padding: "2px 7px",
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: "nowrap",
                color: "#222",
                boxShadow: "0 1px 4px rgba(0,0,0,.18)",
              }}
            >
              {l.name}
              {s && <span style={{ color: g!.color, marginLeft: 4 }}>{s.best.maxRunH.toFixed(1)}h</span>}
            </div>
          </Html>
        );
      })}

      {/* 태양 구체 + 나침반 */}
      {up && (
        <mesh position={[vec[0] * 330, vec[1] * 330, vec[2] * 330]}>
          <sphereGeometry args={[7, 20, 14]} />
          <meshBasicMaterial color="#f5b431" />
        </mesh>
      )}
      <Html position={[0, 2, -(RADIUS_M + 30)]} center style={{ pointerEvents: "none" }}>
        <div style={{ color: "#c0392b", fontWeight: 800, fontSize: 14, textShadow: "0 0 3px #fff" }}>N 북</div>
      </Html>

      <OrbitControls
        makeDefault
        target={[0, 10, 0]}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={60}
        maxDistance={900}
        enableDamping
      />
    </>
  );
}
