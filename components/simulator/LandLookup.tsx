"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// leaflet은 window 필수 — SSR 제외 lazy 로드
const MapPicker = dynamic(() => import("@/components/simulator/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[320px] flex items-center justify-center text-[12px] text-muted-foreground bg-card border border-border rounded-md">
      지도 로드 중...
    </div>
  ),
});
import { useSimulatorStore } from "@/store/simulator";
import {
  fetchZoneByCoord,
  fetchNearbyRoads,
  fetchParcelPolygon,
  type RoadCheck,
} from "@/lib/vworld";
import { buildParcelShape, buildMergedParcelShape } from "@/lib/geo/parcel";
import { findZoneCodeByName, ZONES, isLikelyCBD } from "@/lib/zones";
import { useCostStore } from "@/store/cost";
import { useProfitStore } from "@/store/profit";
import {
  getJimokInfo,
  isBuiltJimok,
  VALUE_LABEL,
  RISK_LABEL,
} from "@/lib/jimok";

// /api/landarea 응답 — 건축물대장(building) 또는 VWorld 토지특성(vworld).
type LandArea = {
  area: number | null; // 대지면적 ㎡
  source: "building" | "vworld" | null;
  bcRat?: number;
  vlRat?: number;
  mainUse?: string;
  grndFloors?: number;
  ugrndFloors?: number;
  bldName?: string;
  price?: number; // 개별공시지가 원/㎡ (VWorld)
  priceYear?: number;
  jimok?: string; // 지목 (VWorld)
  zone?: string; // 용도지역 (NED — 비도시지역 포함)
  transient?: boolean; // 일시 장애 (재시도 안내)
  message?: string;
};

type MergedParcelRow = {
  label: string;
  areaSqm: number;
  zone: string | null;
  price: number | null;
  /** 연속지적도 링 (union 실형상용, null = 폴리곤 없음) */
  ring?: Array<[number, number]> | null;
};

// /api/land-trades 응답 — 토지 실거래 + 추정가
type LandTrades = {
  trades: Array<{
    yearMonth: string;
    jibun: string;
    umdNm: string;
    jimok: string;
    landUse: string;
    areaSqm: number;
    amountWon: number;
    unitWon: number;
    dealingGbn: string;
  }>;
  sampleCount: number;
  periodMonths: number;
  basis: string;
  medianUnitWon: number;
  estimatedPrice: number;
  jigaTotal: number;
  ratioToJiga: number;
};

// /api/newbuild-price 응답 — 신축 시세 (실거래 집계)
type NewbuildPrice = {
  periodMonths: number;
  residential: {
    tradeUnitWon: number;
    tradeCount: number;
    tradeBasis: string;
    jeonseUnitWon: number;
    jeonseCount: number;
    jeonseBasis: string;
  };
  commercial: {
    basis: string;
    f1: { unitWon: number; count: number };
    f2: { unitWon: number; count: number };
    f3plus: { unitWon: number; count: number };
    b: { unitWon: number; count: number };
  };
};

// /api/permits 응답 — 건축HUB 건축인허가 기본개요
type Permit = {
  pk: string;
  bldName: string;
  archGb: string;
  mainUse: string;
  totArea: number;
  hhldCnt: number;
  permitDay: string;
  realStcnsDay: string;
  stcnsSchedDay: string;
  useAprDay: string;
};

type ApiResult = {
  roads: RoadCheck | null;
  zone: string | null;
  landArea: LandArea | null;
  pnu: string | null;
  refinedAddress: string | null;
  errors: string[];
  /** 건축 인허가 이력 (건축HUB, null = 조회 실패) */
  permits: Permit[] | null;
  /** 토지 실거래 + 추정가 (국토부 실거래가, null = 조회 실패) */
  landTrades: LandTrades | null;
  /** 신축 시세 (연립다세대·상업 실거래 집계, null = 조회 실패) */
  newbuild: NewbuildPrice | null;
  /** 기존 건물 추정가 (건축물대장 시가표준액 최신연도 합계, 원. null = 없음/조회실패) */
  buildingPrice: number | null;
  /** 합필 조회 결과 (2필지 이상) */
  merged?: {
    parcels: MergedParcelRow[];
    totalSqm: number;
    zoneMismatch: boolean;
  };
};

/** 전체 주소에서 지번만 추출 (예: "서울 강남구 역삼동 825-3" → "825-3") */
const jibunOf = (full: string) => full.split(" ").pop() ?? full;

export function LandLookup() {
  const address = useSimulatorStore((s) => s.address);
  const lotInfo = useSimulatorStore((s) => s.lotInfo);
  const setAddress = useSimulatorStore((s) => s.setAddress);
  const applyLotInfo = useSimulatorStore((s) => s.applyLotInfo);
  const setZone = useSimulatorStore((s) => s.setZone);
  const setIsCBD = useSimulatorStore((s) => s.setIsCBD);
  const setLotPy = useSimulatorStore((s) => s.setLotPy);
  const setRoadM = useSimulatorStore((s) => s.setRoadM);
  const setMergedParcels = useSimulatorStore((s) => s.setMergedParcels);
  const setParcelShape = useSimulatorStore((s) => s.setParcelShape);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);
  /** 사업성 탭 적용 여부 표시 (land = 토지가, sales = 분양가) */
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const [mergeMode, setMergeMode] = useState(false);
  const [extraAddresses, setExtraAddresses] = useState<string[]>([""]);
  /** 🗺️ 지도 필지 선택 패널 표시 여부 */
  const [showMap, setShowMap] = useState(false);
  /** 딥링크(?address=) 1회 실행 가드 */
  const deepLinkRan = useRef(false);
  const [usage, setUsage] = useState<{
    isLoggedIn: boolean; used: number; limit: number; remaining: number; allowed: boolean; role: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then(setUsage)
      .catch(() => null);
  }, []);

  const onLookup = async (overrideAddr?: string, overrideExtras?: string[]) => {
    // 지도 클릭/딥링크에서 넘어온 주소·합필목록은 state 반영 전이라 인자로 직접 받는다 (stale closure 방지)
    const q = (overrideAddr ?? address).trim();
    if (!q) return;

    // 로그인 체크
    if (usage !== null && !usage.isLoggedIn) {
      window.location.href = "/login?redirect=/simulator";
      return;
    }

    // 한도 체크 (클라이언트 사전 검사)
    if (usage !== null && usage.isLoggedIn && !usage.allowed) {
      setError(`오늘 사용 한도(${usage.limit}회)를 모두 사용하셨습니다. 내일 다시 이용하거나 등급을 업그레이드하세요.`);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setApplied({});

    // 사용량 증가 (서버에서 원자적으로 처리)
    if (usage?.isLoggedIn) {
      const incRes = await fetch("/api/usage", { method: "POST" });
      if (incRes.status === 429) {
        const data = await incRes.json().catch(() => ({})) as { limit?: number };
        setError(`오늘 사용 한도(${data.limit ?? usage.limit}회)를 모두 사용하셨습니다.`);
        setLoading(false);
        setUsage((prev) => prev ? { ...prev, allowed: false, remaining: 0 } : prev);
        return;
      }
      const updated = await incRes.json().catch(() => null) as typeof usage | null;
      if (updated) setUsage((prev) => prev ? { ...prev, ...updated } : prev);
    }

    try {
      // 1) 주소 → 좌표 + PNU (서버 프록시, KAKAO_KEY)
      const geoRes = await fetch(`/api/geocode?address=${encodeURIComponent(q)}`);
      if (!geoRes.ok) {
        const j = (await geoRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `주소 변환 실패 (${geoRes.status})`);
      }
      const geo = (await geoRes.json()) as {
        x: string;
        y: string;
        pnu: string;
        refined: string;
      };

      const errors: string[] = [];

      // 2) 모든 외부 조회는 서버사이드 경유 (CORS 회피).
      //    면적·공시지가·지목 = /api/landarea (건축물대장 → VWorld 토지특성 순차)
      //    용도지역·도로      = /api/vworld (VWorld 서버 프록시)
      const [landAreaRes, zoneVW, roads, parcelPoly, permits] = await Promise.all([
        fetch(`/api/landarea?pnu=${geo.pnu}`)
          .then(async (r) => (r.ok ? ((await r.json()) as LandArea) : null))
          .catch(() => null),
        fetchZoneByCoord(geo.x, geo.y).catch(() => {
          errors.push("용도지역 조회 실패");
          return null;
        }),
        fetchNearbyRoads(geo.x, geo.y).catch(() => {
          errors.push("도로 조회 실패");
          return null;
        }),
        // 연속지적도 실형상 폴리곤 — 실패해도 시뮬레이션은 정사각형 가정으로 진행
        fetchParcelPolygon(geo.pnu).catch(() => null),
        // 건축 인허가 이력 (건축HUB) — best-effort
        fetch(`/api/permits?pnu=${geo.pnu}`)
          .then(async (r) =>
            r.ok ? ((await r.json()) as { permits: Permit[] }).permits : null,
          )
          .catch(() => null),
      ]);

      if (landAreaRes?.transient) {
        errors.push(
          landAreaRes.message ?? "면적 조회 일시 불안정 — 잠시 후 다시 시도",
        );
      }

      // 용도지역: NED 토지특성(비도시 포함) 우선 → 좌표 기반(LT_C_UQ111) 폴백.
      const zoneName = landAreaRes?.zone || zoneVW;

      const primaryArea =
        landAreaRes?.area && landAreaRes.area > 0 ? landAreaRes.area : 0;

      // 합필: 추가 지번들 조회 + 면적 합산 (지도 클릭 합류 시 overrideExtras 우선)
      const extras = mergeMode
        ? (overrideExtras ?? extraAddresses).map((a) => a.trim()).filter(Boolean)
        : [];
      let merged: ApiResult["merged"] = undefined;
      if (extras.length > 0) {
        const extraResults = await Promise.all(
          extras.map(async (addr) => {
            try {
              const gRes = await fetch(`/api/geocode?address=${encodeURIComponent(addr)}`);
              if (!gRes.ok) throw new Error();
              const g = (await gRes.json()) as { pnu: string; refined: string };
              const [la, poly] = await Promise.all([
                fetch(`/api/landarea?pnu=${g.pnu}`)
                  .then(async (r) => (r.ok ? ((await r.json()) as LandArea) : null))
                  .catch(() => null),
                // union 실형상용 폴리곤 (실패해도 합필 자체는 진행)
                fetchParcelPolygon(g.pnu).catch(() => null),
              ]);
              return {
                label: jibunOf(g.refined),
                areaSqm: la?.area && la.area > 0 ? la.area : 0,
                zone: la?.zone ?? null,
                price: la?.price ?? null,
                ring: poly?.ring ?? null,
              };
            } catch {
              errors.push(`합필 지번 "${addr}" 조회 실패`);
              return null;
            }
          }),
        );
        const okExtras = extraResults.filter(Boolean) as MergedParcelRow[];
        okExtras
          .filter((e) => e.areaSqm === 0)
          .forEach((e) => errors.push(`합필 지번 "${e.label}" 면적 정보 없음 — 합산에서 제외`));
        const valid = okExtras.filter((e) => e.areaSqm > 0);
        if (valid.length > 0 && primaryArea > 0) {
          const parcels: MergedParcelRow[] = [
            { label: jibunOf(geo.refined), areaSqm: primaryArea, zone: zoneName, price: landAreaRes?.price ?? null },
            ...valid,
          ];
          const totalSqm = parcels.reduce((s, p) => s + p.areaSqm, 0);
          const zoneMismatch = parcels.some(
            (p) => p.zone && zoneName && p.zone !== zoneName,
          );
          merged = { parcels, totalSqm, zoneMismatch };
        }
      }

      // 토지 실거래 + 추정가 — 동명·용도지역·면적·공시지가 확정 후 조회 (best-effort)
      const umdName = (() => {
        const parts = geo.refined.split(" ").filter(Boolean);
        return parts.length >= 2 ? parts[parts.length - 2] : "";
      })();
      const [landTrades, newbuild, buildingPrice] = await Promise.all([
        fetch(
          `/api/land-trades?pnu=${geo.pnu}&umd=${encodeURIComponent(umdName)}` +
            `&zone=${encodeURIComponent(zoneName ?? "")}` +
            `&areaSqm=${primaryArea || 0}&jiga=${landAreaRes?.price ?? 0}`,
        )
          .then(async (r) => (r.ok ? ((await r.json()) as LandTrades) : null))
          .catch(() => null),
        fetch(`/api/newbuild-price?pnu=${geo.pnu}&umd=${encodeURIComponent(umdName)}`)
          .then(async (r) => (r.ok ? ((await r.json()) as NewbuildPrice) : null))
          .catch(() => null),
        // 기존 건물 추정가 — 건축물대장 시가표준액(주택가격) 최신연도 합계 (플렉시티 벤치마킹)
        fetch(`/api/building?pnu=${geo.pnu}`)
          .then(async (r) => {
            if (!r.ok) return null;
            const d = (await r.json()) as {
              buildings?: Array<{ priceHistory?: Array<{ year: string; price: number }> }>;
            };
            if (!d.buildings?.length) return null;
            const total = d.buildings.reduce((sum, b) => {
              const hist = (b.priceHistory ?? []).filter((h) => h.price > 0);
              if (!hist.length) return sum;
              const latest = hist.reduce((a, c) =>
                Number(c.year) > Number(a.year) ? c : a,
              );
              return sum + latest.price;
            }, 0);
            return total > 0 ? total : null;
          })
          .catch(() => null),
      ]);

      const out: ApiResult = {
        roads,
        zone: zoneName,
        landArea: landAreaRes,
        pnu: geo.pnu,
        refinedAddress: geo.refined,
        errors,
        permits,
        landTrades,
        newbuild,
        buildingPrice,
        merged,
      };
      setResult(out);

      // 3) store 반영 — 각각 독립 적용.
      setAddress(geo.refined);
      // 서울도심(종로구·중구) 자동 판별 — 그 외 지역은 CBD 토글 OFF
      setIsCBD(isLikelyCBD(geo.refined));

      const zoneCode = findZoneCodeByName(zoneName);
      if (zoneCode) setZone(zoneCode);

      // 합필이면 합산 면적으로 시뮬레이션
      const areaSqm = merged ? merged.totalSqm : primaryArea;
      if (areaSqm > 0) setLotPy(Math.round(areaSqm / 3.305785));

      // 2D/3D 필지 경계 표시용
      setMergedParcels(
        merged
          ? merged.parcels.map((p) => ({ label: p.label, areaSqm: p.areaSqm }))
          : [],
      );

      // 실형상 폴리곤 → store.
      // 단독: 해당 필지 링 그대로 / 합필: 전 필지 링 union (연접 단일 폴리곤일 때만).
      if (parcelPoly && !merged) {
        try {
          setParcelShape(buildParcelShape(parcelPoly.ring));
        } catch {
          setParcelShape(null);
        }
      } else if (parcelPoly && merged) {
        const memberParcels = [
          { ring: parcelPoly.ring, label: jibunOf(geo.refined) },
          ...merged.parcels
            .slice(1)
            .map((p) => ({ ring: p.ring ?? [], label: p.label })),
        ];
        const allRings = memberParcels.every(
          (m) => m.ring && m.ring.length >= 3,
        );
        // 링이 하나라도 없거나 비연접이면 null → 정사각형 근사 유지
        setParcelShape(allRings ? buildMergedParcelShape(memberParcels) : null);
      } else {
        setParcelShape(null);
      }

      // 도로: 직접 검출 OR 건축 지목으로 접도 추정 → 6m, 그 외 0m.
      const jimokName = landAreaRes?.jimok ?? null;
      const directRoad = roads?.hasRoad ?? false;
      const presumed = !directRoad && jimokName ? isBuiltJimok(jimokName) : false;
      const roadM = directRoad || presumed ? 6 : 0;
      setRoadM(roadM);

      // 공시지가: 합필 시 면적 가중 평균
      const pricedParcels = merged
        ? merged.parcels.filter((p) => p.price && p.areaSqm > 0)
        : [];
      const effectivePrice = merged && pricedParcels.length > 0
        ? Math.round(
            pricedParcels.reduce((s, p) => s + p.price! * p.areaSqm, 0) /
              pricedParcels.reduce((s, p) => s + p.areaSqm, 0),
          )
        : landAreaRes?.price ?? undefined;

      if (zoneCode && areaSqm > 0) {
        applyLotInfo({
          address: geo.refined,
          lotSqm: areaSqm,
          zone: zoneCode,
          roadM,
          source: "vworld",
          pnu: geo.pnu,
          publicPricePerSqm: effectivePrice,
          publicPriceYear: landAreaRes?.priceYear ?? undefined,
        });
        // 비용 탭 연면적 자동 동기화 (lotPy × defFar)
        const z = ZONES[zoneCode];
        const gfaPy = Math.round((areaSqm / 3.305785) * z.defFar / 100);
        if (gfaPy > 0) useCostStore.getState().set("abovePyeong", gfaPy);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  };

  /** 지도 단일 선택: 대표 지번 교체 + 새 조회 */
  const onMapPick = (addr: string) => {
    const picked = addr.trim();
    if (!picked || loading) return;
    setAddress(picked);
    void onLookup(picked);
  };

  /**
   * 지도 다중 선택 일괄 합필 (운영자 피드백 2026-07-17: "선택, 선택, 전체 합치기").
   * 이미 조회된 대표가 있으면 자동 포함, 없으면 첫 선택이 대표.
   * 필지당 재조회 없이 조회 1회만 소모.
   */
  const onMergeAllFromMap = (addresses: string[]) => {
    if (loading) return;
    const base = result?.refinedAddress?.trim() ?? "";
    const uniq: string[] = [];
    for (const a of [base, ...addresses]) {
      const t = a.trim();
      if (t && !uniq.includes(t)) uniq.push(t);
    }
    if (uniq.length === 0) return;
    const [main, ...rest] = uniq;
    setAddress(main);
    setExtraAddresses(rest.length ? rest : [""]);
    void onLookup(main, rest);
  };

  // 딥링크: /simulator?address=... → 주소 채움 + (로그인 상태면) 자동 조회.
  // real-estate-infographic 등 외부 앱에서 지번을 들고 넘어오는 연동 진입점.
  useEffect(() => {
    if (deepLinkRan.current || usage === null) return;
    deepLinkRan.current = true;
    const addr = new URLSearchParams(window.location.search).get("address");
    if (!addr) return;
    setAddress(addr);
    if (usage.isLoggedIn && usage.allowed) {
      // 렌더 사이클 밖에서 조회 시작 (effect 내 동기 setState 회피)
      setTimeout(() => void onLookup(addr), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usage]);

  const bld = result?.landArea;
  const jimokName = bld?.jimok ?? null;
  const resolvedArea = bld?.area && bld.area > 0 ? bld.area : 0;
  const areaSourceLabel =
    resolvedArea > 0 && bld?.source === "building"
      ? "건축물대장"
      : resolvedArea > 0 && bld?.source === "vworld"
        ? "토지특성정보"
        : null;

  // 도로 판정
  let roadVerdict: {
    icon: string;
    label: string;
    sub: string;
    tone: "ok" | "warn" | "uncertain";
  } | null = null;
  if (result?.roads) {
    const directRoad = result.roads.hasRoad;
    const isBuilt = jimokName ? isBuiltJimok(jimokName) : false;
    const presumed = !directRoad && isBuilt;
    const accessible = directRoad || presumed;
    const jimokKnown = jimokName && jimokName !== "미상";
    const maengji =
      !accessible && !!jimokKnown && result.roads.totalParcels >= 8;
    if (directRoad) {
      roadVerdict = {
        icon: "🛣️",
        label: "도로 접면",
        sub: `주변 도로 ${result.roads.roads.length}개 확인`,
        tone: "ok",
      };
    } else if (presumed) {
      roadVerdict = {
        icon: "✅",
        label: "도로 접면 (추정)",
        sub: `지목 "${jimokName}" — 건축 지목, 접도 사실상 확정`,
        tone: "ok",
      };
    } else if (maengji) {
      roadVerdict = {
        icon: "⛔",
        label: "맹지 가능성",
        sub: `주변 ${result.roads.totalParcels}개 필지 중 도로 없음`,
        tone: "warn",
      };
    } else {
      roadVerdict = {
        icon: "❓",
        label: "확인 필요",
        sub: "VWorld 데이터 부족 — 현지 답사 권장",
        tone: "uncertain",
      };
    }
  }

  const zoneShown = result?.zone ?? null;
  const matchedZoneCode = findZoneCodeByName(zoneShown);

  const usageBadge = usage?.isLoggedIn
    ? usage.remaining === 0
      ? { text: `오늘 ${usage.used}/${usage.limit}회 사용`, color: "text-red-500" }
      : { text: `오늘 ${usage.used}/${usage.limit}회 사용`, color: "text-muted-foreground" }
    : usage !== null
      ? { text: "로그인 후 이용", color: "text-amber-500" }
      : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-xs text-muted-foreground font-medium">① 지번 조회</div>
        {usageBadge && (
          <span className={`text-[10px] ${usageBadge.color}`}>{usageBadge.text}</span>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="예: 서울특별시 강남구 역삼동 825-3"
          className="flex-1"
          onKeyDown={(e) => e.key === "Enter" && !loading && onLookup()}
          disabled={loading}
        />
        <Button
          onClick={() => onLookup()}
          disabled={loading || !address.trim() || (usage !== null && usage.isLoggedIn && !usage.allowed)}
          variant="outline"
        >
          {loading
            ? "조회 중..."
            : usage !== null && !usage.isLoggedIn
              ? "로그인 후 조회"
              : mergeMode
                ? "합필 조회"
                : "조회"}
        </Button>
      </div>

      {/* 지도 선택 + 합필 토글 */}
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setShowMap((v) => !v)}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
            showMap
              ? "bg-[var(--info)] text-[var(--info-foreground,#fff)] border-[var(--info)]"
              : "bg-transparent text-[var(--info)] border-[var(--info)] hover:bg-[var(--info-bg)]"
          }`}
        >
          {showMap ? "🗺️ 지도 닫기" : "🗺️ 지도에서 필지 선택"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMergeMode((v) => {
              const next = !v;
              if (!next) {
                setMergedParcels([]);
                setExtraAddresses([""]);
              }
              return next;
            });
          }}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
            mergeMode
              ? "bg-[var(--info)] text-[var(--info-foreground,#fff)] border-[var(--info)]"
              : "bg-transparent text-[var(--info)] border-[var(--info)] hover:bg-[var(--info-bg)]"
          }`}
        >
          {mergeMode ? "🔗 합필 모드 ON — 취소하기" : "➕ 합필하실 경우 (옆 필지 합쳐서 검토)"}
        </button>
      </div>

      {/* 🗺️ 지도 필지 선택 패널 — key로 합필 모드 전환 시 선택 상태 리셋 */}
      {showMap && (
        <div className="mt-2">
          <MapPicker
            key={mergeMode ? "multi" : "single"}
            onPick={onMapPick}
            multiSelect={mergeMode}
            baseAddress={mergeMode ? (result?.refinedAddress ?? null) : null}
            onMergeAll={onMergeAllFromMap}
          />
          {mergeMode && (
            <p className="mt-1 text-[10px]" style={{ color: "var(--info)" }}>
              🔗 합필 모드 — 옆 필지들을 연달아 클릭해 선택(재클릭=해제)한 뒤 [전체 합치기 조회]를 누르세요. 조회 횟수는 1회만 차감됩니다.
            </p>
          )}
        </div>
      )}

      {/* 합필 추가 지번 입력 */}
      {mergeMode && (
        <div
          className="mt-2 rounded-md p-2.5 space-y-1.5 border border-dashed"
          style={{ borderColor: "var(--info)", background: "var(--info-bg)" }}
        >
          <div className="text-[10.5px] font-medium" style={{ color: "var(--info)" }}>
            🔗 합필 검토 — 위 대표 지번 + 아래 지번들의 면적을 합산해 하나의 대지로 시뮬레이션합니다.
          </div>
          {extraAddresses.map((a, i) => (
            <div key={i} className="flex gap-1.5">
              <Input
                value={a}
                onChange={(e) =>
                  setExtraAddresses((prev) =>
                    prev.map((v, idx) => (idx === i ? e.target.value : v)),
                  )
                }
                placeholder={`추가 지번 ${i + 1} — 예: 서울 강남구 역삼동 825-4`}
                className="flex-1 h-8 text-xs bg-card"
                onKeyDown={(e) => e.key === "Enter" && !loading && onLookup()}
                disabled={loading}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setExtraAddresses((prev) =>
                    prev.length <= 1 ? [""] : prev.filter((_, idx) => idx !== i),
                  )
                }
                disabled={loading}
                className="h-8 px-2 text-xs"
              >
                ✕
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExtraAddresses((prev) => [...prev, ""])}
              disabled={loading || extraAddresses.length >= 9}
              className="h-7 text-[11px]"
            >
              + 지번 추가
            </Button>
            <span className="text-[10px] text-muted-foreground">
              용도지역·도로는 대표 지번 기준 (최대 10필지)
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2.5 px-3 py-2 rounded-md text-xs bg-red-50 border-l-4 border-red-500 text-red-700">
          ⚠ {error}
          {error.includes("키") && (
            <div className="mt-1 text-[10.5px] text-red-600">
              💡 .env.local에 VWORLD_DATA_KEY · DATAGO_KEY · KAKAO_KEY 설정 필요
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="mt-2.5 space-y-2 text-[12px]">
          {/* 기본 정보 */}
          <div className="px-3 py-2 rounded-md bg-[var(--info-bg)] text-[var(--info)]">
            <div className="font-semibold">📍 {result.refinedAddress}</div>
            <div className="mt-0.5 text-[11px] opacity-90">
              {resolvedArea > 0
                ? `${resolvedArea.toLocaleString("ko-KR")}㎡ (${Math.round(resolvedArea / 3.305785)}평)${areaSourceLabel ? ` · ${areaSourceLabel}` : ""}`
                : bld?.transient
                  ? "⏳ 면적 조회 일시 불안정 — 잠시 후 다시 시도"
                  : "면적 정보 없음 (수동 입력 필요)"}
              {zoneShown ? ` · ${zoneShown}` : ""}
              {matchedZoneCode
                ? ` (${ZONES[matchedZoneCode].name} 자동 매칭)`
                : zoneShown
                  ? " (gyumo 미지원 용도지역)"
                  : ""}
            </div>
            <div className="mt-0.5 text-[10px] opacity-80">PNU: {result.pnu}</div>
          </div>

          {/* 합필 결과 카드 */}
          {result.merged && (
            <div
              className="rounded-md border p-2.5"
              style={{ borderColor: "var(--info)", background: "var(--card)" }}
            >
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[11px] font-bold" style={{ color: "var(--info)" }}>
                  🔗 합필 {result.merged.parcels.length}필지 검토
                </span>
                <span className="text-[12px] font-bold">
                  합계 {result.merged.totalSqm.toLocaleString("ko-KR")}㎡ (
                  {Math.round(result.merged.totalSqm / 3.305785)}평)
                </span>
              </div>
              <div className="space-y-0.5">
                {result.merged.parcels.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-secondary/50"
                  >
                    <span>
                      <b
                        className="inline-block w-4 text-center mr-1 rounded text-[9px] font-bold"
                        style={{ background: "var(--info-bg)", color: "var(--info)" }}
                      >
                        {String.fromCharCode(65 + i)}
                      </b>
                      {p.label}
                      {i === 0 && (
                        <span className="ml-1 text-[9px] text-muted-foreground">(대표)</span>
                      )}
                    </span>
                    <span className="text-muted-foreground">
                      {p.areaSqm.toLocaleString("ko-KR")}㎡
                      {p.zone ? ` · ${p.zone}` : ""}
                    </span>
                  </div>
                ))}
              </div>
              {result.merged.zoneMismatch && (
                <div className="mt-1.5 px-2 py-1 rounded bg-amber-50 border border-amber-300 text-[10px] text-amber-800">
                  ⚠ 필지별 용도지역이 다릅니다 — 시뮬레이션은 대표 지번 기준. 실제 합필 시 관할청 확인 필수
                </div>
              )}
              <div className="mt-1 text-[9.5px] text-muted-foreground">
                ※ 합필은 지적법상 동일 소유자·연접 필지 등 요건 충족 시 가능 — 정식 검토는 토지이동 신청 전 확인
              </div>
            </div>
          )}

          {/* 지목 + 도로 카드 */}
          {(jimokName || roadVerdict) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* 지목 */}
              {jimokName && (
                <div className="rounded-md bg-card border border-border p-2.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-base">
                      {getJimokInfo(jimokName).emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-muted-foreground">지목</div>
                      <div className="font-bold text-sm">{jimokName}</div>
                      <div className="text-[10.5px] text-muted-foreground">
                        가치{" "}
                        <b className="text-foreground">
                          {VALUE_LABEL[getJimokInfo(jimokName).value]}
                        </b>{" "}
                        · 리스크 {RISK_LABEL[getJimokInfo(jimokName).risk]}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 도로 접면 */}
              {roadVerdict && (
                <div
                  className={`rounded-md border p-2.5 ${
                    roadVerdict.tone === "ok"
                      ? "bg-emerald-50 border-emerald-300"
                      : roadVerdict.tone === "warn"
                        ? "bg-red-50 border-red-300"
                        : "bg-amber-50 border-amber-300"
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-base">{roadVerdict.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-muted-foreground">
                        도로 접면 (60m 반경)
                      </div>
                      <div className="font-bold text-sm">{roadVerdict.label}</div>
                      <div className="text-[10.5px] text-muted-foreground leading-tight">
                        {roadVerdict.sub}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 건축물대장 참고 정보 (실제 건폐율·용적률·주용도) */}
          {bld?.source === "building" &&
            (bld.bcRat || bld.vlRat || bld.mainUse) && (
              <div className="px-3 py-2 rounded-md bg-card border border-border text-[11px]">
                <div className="text-[10px] text-muted-foreground mb-1">
                  🏢 등록 건축물 (건축물대장 · 참고용)
                  {bld.bldName ? ` — ${bld.bldName}` : ""}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {bld.mainUse && (
                    <span>
                      주용도 <b className="text-foreground">{bld.mainUse}</b>
                    </span>
                  )}
                  {bld.bcRat ? (
                    <span>
                      건폐율 <b className="text-foreground">{bld.bcRat}%</b>
                    </span>
                  ) : null}
                  {bld.vlRat ? (
                    <span>
                      용적률 <b className="text-foreground">{bld.vlRat}%</b>
                    </span>
                  ) : null}
                  {bld.grndFloors ? (
                    <span>
                      지상 <b className="text-foreground">{bld.grndFloors}층</b>
                      {bld.ugrndFloors ? ` · 지하 ${bld.ugrndFloors}층` : ""}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground/80">
                  ※ 기존 건물 실측값입니다. 시뮬레이션 법정 한도는 용도지역 기준을 따릅니다.
                </div>
              </div>
            )}

          {/* 건축 인허가 이력 (건축HUB) */}
          {result.permits && result.permits.length > 0 && (
            <div className="px-3 py-2 rounded-md bg-card border border-border text-[11px]">
              <div className="text-[10px] text-muted-foreground mb-1">
                📋 건축 인허가 이력 (건축HUB · 최근 {Math.min(result.permits.length, 3)}건
                {result.permits.length > 3 ? ` / 총 ${result.permits.length}건` : ""})
              </div>
              <div className="space-y-1">
                {result.permits.slice(0, 3).map((p) => {
                  const status = p.useAprDay
                    ? { label: "사용승인", cls: "bg-emerald-100 text-emerald-700" }
                    : p.realStcnsDay
                      ? { label: "착공", cls: "bg-blue-100 text-blue-700" }
                      : { label: "허가", cls: "bg-amber-100 text-amber-700" };
                  return (
                    <div
                      key={p.pk}
                      className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-secondary/50"
                    >
                      <span className="min-w-0 truncate">
                        <span
                          className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mr-1.5 ${status.cls}`}
                        >
                          {status.label}
                        </span>
                        {p.permitDay && (
                          <span className="text-muted-foreground mr-1">
                            {p.permitDay}
                          </span>
                        )}
                        <b className="text-foreground">
                          {p.archGb || p.mainUse || p.bldName || "건축물"}
                        </b>
                        {p.archGb && p.mainUse ? (
                          <span className="text-muted-foreground"> · {p.mainUse}</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {p.totArea > 0
                          ? `연면적 ${p.totArea.toLocaleString("ko-KR")}㎡`
                          : ""}
                        {p.useAprDay ? ` · 승인 ${p.useAprDay}` : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 text-[9.5px] text-muted-foreground/80">
                ※ 국토교통부 건축HUB 건축인허가정보. 허가 이력이 있다고 현재 유효한 것은 아니며, 실효·취소 여부는 관할청 확인 필요.
              </div>
            </div>
          )}

          {/* 공시지가 (VWorld 토지특성정보) */}
          {bld?.price && bld.price > 0 && (
            <div className="px-3 py-1.5 rounded-md bg-secondary/50 border border-border text-[11px]">
              💰 개별공시지가{" "}
              <b className="text-foreground">
                {bld.price.toLocaleString("ko-KR")}원/㎡
              </b>
              {bld.priceYear ? (
                <span className="text-muted-foreground"> ({bld.priceYear}년)</span>
              ) : null}
              {resolvedArea > 0
                ? ` · 토지가 추정 ${Math.round((bld.price * resolvedArea) / 1e8 * 100) / 100}억원`
                : ""}
            </div>
          )}

          {/* 토지 실거래 + 추정가 (국토부 실거래가공개시스템) */}
          {result.landTrades && result.landTrades.sampleCount > 0 && (
            <div className="rounded-md border p-2.5" style={{ borderColor: "var(--info)", background: "var(--card)" }}>
              <div className="text-[10px] text-muted-foreground mb-1.5">
                💹 토지 실거래 기반 추정가
                <span className="ml-1 opacity-80">
                  ({result.landTrades.basis} · 최근 {result.landTrades.periodMonths}개월 {result.landTrades.sampleCount}건)
                </span>
              </div>
              {/* 플렉시티식 3분할 가격보드: 추정 토지가 / 공시지가 / 기존 건물 */}
              <div className="grid grid-cols-3 gap-2 mb-1.5">
                <div className="rounded bg-[var(--info-bg)] px-2.5 py-1.5">
                  <div className="text-[9.5px] font-semibold" style={{ color: "var(--info)" }}>
                    추정 토지 가격
                  </div>
                  <div className="text-[15px] font-bold" style={{ color: "var(--info)" }}>
                    {result.landTrades.estimatedPrice > 0
                      ? `${(result.landTrades.estimatedPrice / 1e8).toFixed(1)}억`
                      : "—"}
                  </div>
                  <div className="text-[9.5px] text-muted-foreground">
                    {result.landTrades.ratioToJiga > 0
                      ? `공시지가 대비 ${result.landTrades.ratioToJiga}배`
                      : `㎡당 중앙 ${Math.round(result.landTrades.medianUnitWon / 10000).toLocaleString("ko-KR")}만`}
                  </div>
                </div>
                <div className="rounded bg-emerald-50 border border-emerald-200 px-2.5 py-1.5">
                  <div className="text-[9.5px] font-semibold text-emerald-700">공시지가</div>
                  <div className="text-[15px] font-bold text-emerald-700">
                    {result.landTrades.jigaTotal > 0
                      ? `${(result.landTrades.jigaTotal / 1e8).toFixed(1)}억`
                      : "—"}
                  </div>
                  <div className="text-[9.5px] text-muted-foreground">
                    {bld?.price
                      ? `${Math.round(bld.price / 10000).toLocaleString("ko-KR")}만원/㎡`
                      : ""}
                  </div>
                </div>
                <div className="rounded bg-secondary/60 px-2.5 py-1.5">
                  <div className="text-[9.5px] font-semibold text-muted-foreground">
                    기존 건물 추정가
                  </div>
                  <div className="text-[15px] font-bold text-foreground">
                    {result.buildingPrice
                      ? `${(result.buildingPrice / 1e8).toFixed(1)}억`
                      : "—"}
                  </div>
                  <div className="text-[9.5px] text-muted-foreground">
                    {result.buildingPrice ? "시가표준액 기준" : "건물 없음(나대지)"}
                  </div>
                </div>
              </div>
              {result.landTrades.trades.length > 0 && (() => {
                const myJiga = bld?.price ?? 0; // 대상 필지 공시지가 원/㎡
                return (
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[9px] text-muted-foreground px-2">
                      <span>계약 · 소재지 (지목·용도지역)</span>
                      <span>면적 · 거래가 (㎡당 · 배수*)</span>
                    </div>
                    {result.landTrades.trades.slice(0, 4).map((t, i) => (
                      <div key={i} className="flex items-center justify-between text-[10.5px] px-2 py-0.5 rounded bg-secondary/40">
                        <span className="min-w-0 truncate text-muted-foreground">
                          {t.yearMonth} · {t.umdNm} {t.jibun || "—"} ({t.jimok}
                          {t.landUse ? ` · ${t.landUse.replace("지역", "")}` : ""})
                        </span>
                        <span className="shrink-0 font-medium text-foreground">
                          {t.areaSqm}㎡ · {(t.amountWon / 1e8).toFixed(2)}억
                          <span className="text-muted-foreground">
                            {" "}({Math.round(t.unitWon / 10000).toLocaleString("ko-KR")}만
                            {myJiga > 0 ? ` · ${(t.unitWon / myJiga).toFixed(1)}배` : ""})
                          </span>
                        </span>
                      </div>
                    ))}
                    {myJiga > 0 && (
                      <div className="text-[9px] text-muted-foreground/80 px-2">
                        * 배수 = 거래 ㎡당가 ÷ 대상 필지 공시지가(㎡당) — 시세 수준 참고용
                      </div>
                    )}
                  </div>
                );
              })()}
              <div className="mt-1 text-[9.5px] text-muted-foreground/80">
                ※ 국토부 실거래가공개시스템 신고 자료 기반 통계 추정치 — 감정평가가 아니며 개별 필지 조건(도로·형상·개발계획)에 따라 달라질 수 있음.
              </div>
              {result.landTrades.estimatedPrice > 0 && resolvedArea > 0 && (
                <button
                  type="button"
                  disabled={applied.land}
                  onClick={() => {
                    const py = resolvedArea / 3.305785;
                    const manPerPy = Math.round(
                      result.landTrades!.estimatedPrice / py / 10000,
                    );
                    if (manPerPy > 0) {
                      useProfitStore.getState().set("landPricePerPyeong", manPerPy);
                      setApplied((p) => ({ ...p, land: true }));
                    }
                  }}
                  className="mt-1.5 w-full text-[11px] font-semibold px-2.5 py-1.5 rounded-md border transition-colors disabled:opacity-70"
                  style={
                    applied.land
                      ? { background: "var(--info-bg)", borderColor: "var(--info)", color: "var(--info)" }
                      : { background: "var(--info)", borderColor: "var(--info)", color: "var(--info-foreground, #fff)" }
                  }
                >
                  {applied.land
                    ? "✓ 사업성 탭 토지가에 적용됨"
                    : `📊 사업성 탭 평당 토지가로 적용 (${Math.round(result.landTrades.estimatedPrice / (resolvedArea / 3.305785) / 10000).toLocaleString("ko-KR")}만원/평)`}
                </button>
              )}
            </div>
          )}

          {/* 신축 시세 참고 (연립다세대·상업 실거래 집계) */}
          {result.newbuild &&
            (result.newbuild.residential.tradeCount > 0 ||
              result.newbuild.commercial.f1.count > 0) && (
              <div className="rounded-md border border-border bg-card p-2.5">
                <div className="text-[10px] text-muted-foreground mb-1.5">
                  🏘️ 신축 시세 참고 (최근 {result.newbuild.periodMonths}개월 실거래 ㎡당 중앙값)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {result.newbuild.residential.tradeCount > 0 && (
                    <div className="rounded bg-secondary/60 px-2.5 py-1.5">
                      <div className="text-[9.5px] text-muted-foreground">
                        주거 매매 (연립·다세대 {result.newbuild.residential.tradeCount}건)
                      </div>
                      <div className="text-[14px] font-bold text-foreground">
                        {Math.round(result.newbuild.residential.tradeUnitWon / 10000).toLocaleString("ko-KR")}만/㎡
                        <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                          (평당 {Math.round((result.newbuild.residential.tradeUnitWon * 3.305785) / 10000).toLocaleString("ko-KR")}만)
                        </span>
                      </div>
                      <div className="text-[9px] text-muted-foreground">
                        {result.newbuild.residential.tradeBasis}
                      </div>
                    </div>
                  )}
                  {result.newbuild.residential.jeonseCount > 0 && (
                    <div className="rounded bg-secondary/60 px-2.5 py-1.5">
                      <div className="text-[9.5px] text-muted-foreground">
                        주거 전세 ({result.newbuild.residential.jeonseCount}건)
                      </div>
                      <div className="text-[14px] font-bold text-foreground">
                        {Math.round(result.newbuild.residential.jeonseUnitWon / 10000).toLocaleString("ko-KR")}만/㎡
                      </div>
                      <div className="text-[9px] text-muted-foreground">
                        {result.newbuild.residential.jeonseBasis}
                      </div>
                    </div>
                  )}
                  {result.newbuild.commercial.f1.count > 0 && (
                    <div className="rounded bg-secondary/60 px-2.5 py-1.5 col-span-2">
                      <div className="text-[9.5px] text-muted-foreground mb-0.5">
                        상가 매매 ({result.newbuild.commercial.basis})
                      </div>
                      <div className="flex flex-wrap gap-x-3 text-[11px]">
                        <span>
                          1층 <b>{Math.round(result.newbuild.commercial.f1.unitWon / 10000).toLocaleString("ko-KR")}만/㎡</b>
                          <span className="text-muted-foreground"> ({result.newbuild.commercial.f1.count}건)</span>
                        </span>
                        {result.newbuild.commercial.f2.count > 0 && (
                          <span>
                            2층 <b>{Math.round(result.newbuild.commercial.f2.unitWon / 10000).toLocaleString("ko-KR")}만/㎡</b>
                            <span className="text-muted-foreground"> ({result.newbuild.commercial.f2.count}건)</span>
                          </span>
                        )}
                        {result.newbuild.commercial.f3plus.count > 0 && (
                          <span>
                            3층+ <b>{Math.round(result.newbuild.commercial.f3plus.unitWon / 10000).toLocaleString("ko-KR")}만/㎡</b>
                            <span className="text-muted-foreground"> ({result.newbuild.commercial.f3plus.count}건)</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {result.newbuild.residential.tradeCount > 0 && (
                  <button
                    type="button"
                    disabled={applied.sales}
                    onClick={() => {
                      const manPerPy = Math.round(
                        (result.newbuild!.residential.tradeUnitWon * 3.305785) / 10000,
                      );
                      if (manPerPy > 0) {
                        useProfitStore.getState().set("salesPricePerPyeong", manPerPy);
                        setApplied((p) => ({ ...p, sales: true }));
                      }
                    }}
                    className="mt-1.5 w-full text-[11px] font-semibold px-2.5 py-1.5 rounded-md border transition-colors disabled:opacity-70"
                    style={
                      applied.sales
                        ? { background: "var(--info-bg)", borderColor: "var(--info)", color: "var(--info)" }
                        : { background: "var(--card)", borderColor: "var(--info)", color: "var(--info)" }
                    }
                  >
                    {applied.sales
                      ? "✓ 사업성 탭 분양가에 적용됨"
                      : `📊 사업성 탭 평당 분양가로 적용 (${Math.round((result.newbuild.residential.tradeUnitWon * 3.305785) / 10000).toLocaleString("ko-KR")}만원/평)`}
                  </button>
                )}
                <div className="mt-1 text-[9.5px] text-muted-foreground/80">
                  ※ 신축 분양가·임대료 산정 참고용 — 상품 기획·마감 수준에 따라 달라질 수 있음.
                </div>
              </div>
            )}

          {/* 부분 실패 안내 */}
          {result.errors.length > 0 && (
            <div className="px-3 py-1.5 rounded-md bg-amber-50 border border-amber-300 text-[10.5px] text-amber-800">
              ⚠ {result.errors.join(" · ")}
            </div>
          )}

          {/* zone 매핑 안내 */}
          {zoneShown && !matchedZoneCode && (
            <div className="px-3 py-1.5 rounded-md bg-amber-50 border border-amber-300 text-[10.5px] text-amber-800">
              ⚠ 비도시지역(녹지·관리·농림·자연환경) 또는 미지원 용도지역 — gyumo 현재 13개 도시지역 지원
            </div>
          )}
        </div>
      )}

      {/* mock fallback (이전 동작 유지) */}
      {!result && lotInfo && lotInfo.source === "mock" && (
        <div className="mt-2.5 px-3 py-2 rounded-md text-xs bg-secondary/50 border border-border">
          <div className="font-medium">📍 {lotInfo.address} (mock)</div>
          <div className="text-[11px] text-muted-foreground">
            대지면적 {lotInfo.lotSqm.toLocaleString("ko-KR")}㎡ · 전면도로 {lotInfo.roadM}m
          </div>
        </div>
      )}
    </div>
  );
}
