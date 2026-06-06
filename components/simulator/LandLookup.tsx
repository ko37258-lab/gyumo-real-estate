"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSimulatorStore } from "@/store/simulator";
import {
  fetchParcelInfo,
  fetchNearbyRoads,
  fetchZoneByCoord,
  hasVworldKey,
  type ParcelInfo,
  type RoadCheck,
} from "@/lib/vworld";
import { findZoneCodeByName, ZONES } from "@/lib/zones";
import {
  getJimokInfo,
  isBuiltJimok,
  VALUE_LABEL,
  RISK_LABEL,
} from "@/lib/jimok";

type BuildingArea = {
  area: number | null; // 대지면적 ㎡ (건축물대장 platArea)
  source: "building" | "landledger" | null;
  bcRat?: number;
  vlRat?: number;
  mainUse?: string;
  grndFloors?: number;
  ugrndFloors?: number;
  bldName?: string;
};

type ApiResult = {
  parcel: ParcelInfo | null;
  roads: RoadCheck | null;
  zoneFromVworld: string | null;
  zoneFromLanduse: string | null;
  landprice: number | null;
  landpriceArea: number | null;
  buildingArea: BuildingArea | null;
  pnu: string | null;
  refinedAddress: string | null;
  errors: string[];
};

export function LandLookup() {
  const address = useSimulatorStore((s) => s.address);
  const lotInfo = useSimulatorStore((s) => s.lotInfo);
  const setAddress = useSimulatorStore((s) => s.setAddress);
  const applyLotInfo = useSimulatorStore((s) => s.applyLotInfo);
  const setZone = useSimulatorStore((s) => s.setZone);
  const setLotPy = useSimulatorStore((s) => s.setLotPy);
  const setRoadM = useSimulatorStore((s) => s.setRoadM);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);

  const onLookup = async () => {
    const q = address.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResult(null);

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
      const useVworld = hasVworldKey();

      // 2) VWorld (클라이언트) + 공공데이터 (서버) 동시
      const [parcel, roads, zoneVW, landuseRes, landpriceRes, landareaRes] =
        await Promise.all([
        useVworld
          ? fetchParcelInfo(geo.x, geo.y).catch((e: unknown) => {
              errors.push(`지적: ${e instanceof Error ? e.message : "실패"}`);
              return null;
            })
          : Promise.resolve(null),
        useVworld
          ? fetchNearbyRoads(geo.x, geo.y).catch((e: unknown) => {
              errors.push(`도로: ${e instanceof Error ? e.message : "실패"}`);
              return null;
            })
          : Promise.resolve(null),
        useVworld
          ? fetchZoneByCoord(geo.x, geo.y)
              .then((z) => z.zone)
              .catch(() => null)
          : Promise.resolve(null),
        fetch(`/api/landuse?pnu=${geo.pnu}`)
          .then(async (r) =>
            r.ok ? ((await r.json()) as { zone?: string }).zone ?? null : null,
          )
          .catch(() => null),
        fetch(`/api/landprice?pnu=${geo.pnu}`)
          .then(async (r) =>
            r.ok
              ? (await r.json()) as { price?: number; area?: number }
              : null,
          )
          .catch(() => null),
        // 대지면적 — 승인된 건축물대장 기반 (다중 소스 순차 시도). 면적 자동화 1순위.
        fetch(`/api/landarea?pnu=${geo.pnu}`)
          .then(async (r) =>
            r.ok ? ((await r.json()) as BuildingArea) : null,
          )
          .catch(() => null),
      ]);

      const out: ApiResult = {
        parcel,
        roads,
        zoneFromVworld: zoneVW,
        zoneFromLanduse: landuseRes,
        landprice: landpriceRes?.price ?? null,
        landpriceArea: landpriceRes?.area ?? null,
        buildingArea: landareaRes ?? null,
        pnu: geo.pnu,
        refinedAddress: geo.refined,
        errors,
      };
      setResult(out);

      // 3) store에 반영 — 각각 독립적으로 적용. zone 매칭 실패해도 면적·주소는 들어감.
      setAddress(geo.refined);

      const zoneName = out.zoneFromLanduse || out.zoneFromVworld;
      const zoneCode = findZoneCodeByName(zoneName);
      if (zoneCode) {
        setZone(zoneCode);
      }

      // 면적 우선순위: ① 건축물대장 platArea(승인됨) → ② VWorld parcel.area → ③ landprice.area
      const areaSqm =
        (landareaRes?.area && landareaRes.area > 0 ? landareaRes.area : 0) ||
        (parcel?.area && parcel.area > 0 ? parcel.area : 0) ||
        (landpriceRes?.area && landpriceRes.area > 0 ? landpriceRes.area : 0);
      if (areaSqm > 0) {
        setLotPy(Math.round(areaSqm / 3.305785));
      }

      // 도로: 직접 검출 OR 건축 지목으로 접도 추정 → 6m 기본값. 그 외 0m.
      const directRoad = roads?.hasRoad ?? false;
      const presumed = !directRoad && parcel ? isBuiltJimok(parcel.jimokName) : false;
      const roadM = directRoad || presumed ? 6 : 0;
      setRoadM(roadM);

      // 전체 LotInfo 동기화 (lotInfo 카드 표시용)
      if (zoneCode && areaSqm > 0) {
        applyLotInfo({
          address: geo.refined,
          lotSqm: areaSqm,
          zone: zoneCode,
          roadM,
          source: "vworld",
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  };

  // 도로 판정 (LandRiskCheck 로직)
  let roadVerdict: {
    icon: string;
    label: string;
    sub: string;
    tone: "ok" | "warn" | "uncertain";
  } | null = null;
  if (result?.parcel && result.roads) {
    const directRoad = result.roads.hasRoad;
    const isBuilt = isBuiltJimok(result.parcel.jimokName);
    const presumed = !directRoad && isBuilt;
    const accessible = directRoad || presumed;
    const jimokKnown =
      result.parcel.jimokName && result.parcel.jimokName !== "미상";
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
        sub: `지목 "${result.parcel.jimokName}" — 건축 지목, 접도 사실상 확정`,
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

  const zoneShown = result?.zoneFromLanduse || result?.zoneFromVworld;
  const matchedZoneCode = findZoneCodeByName(zoneShown);

  // 면적 단일 소스 of truth — 우선순위: 건축물대장 → VWorld → 공시지가
  const resolvedArea =
    (result?.buildingArea?.area && result.buildingArea.area > 0
      ? result.buildingArea.area
      : 0) ||
    (result?.parcel?.area && result.parcel.area > 0 ? result.parcel.area : 0) ||
    (result?.landpriceArea && result.landpriceArea > 0
      ? result.landpriceArea
      : 0);
  const areaSourceLabel =
    resolvedArea > 0 && result?.buildingArea?.area
      ? "건축물대장"
      : resolvedArea > 0 && result?.parcel?.area
        ? "지적도"
        : resolvedArea > 0
          ? "공시지가"
          : null;
  const bld = result?.buildingArea;

  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1.5 font-medium">
        ① 지번 조회
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
        <Button onClick={onLookup} disabled={loading || !address.trim()} variant="outline">
          {loading ? "조회 중..." : "조회"}
        </Button>
      </div>

      {error && (
        <div className="mt-2.5 px-3 py-2 rounded-md text-xs bg-red-50 border-l-4 border-red-500 text-red-700">
          ⚠ {error}
          {error.includes("키") && (
            <div className="mt-1 text-[10.5px] text-red-600">
              💡 /.env.local에 NEXT_PUBLIC_VWORLD_KEY · DATAGO_KEY · KAKAO_KEY 설정 필요
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

          {/* 지목 + 도로 카드 */}
          {result.parcel && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* 지목 */}
              <div className="rounded-md bg-card border border-border p-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-base">
                    {getJimokInfo(result.parcel.jimokName).emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-muted-foreground">지목</div>
                    <div className="font-bold text-sm">
                      {result.parcel.jimokName || "미상"}
                    </div>
                    <div className="text-[10.5px] text-muted-foreground">
                      가치{" "}
                      <b className="text-foreground">
                        {VALUE_LABEL[getJimokInfo(result.parcel.jimokName).value]}
                      </b>{" "}
                      · 리스크 {RISK_LABEL[getJimokInfo(result.parcel.jimokName).risk]}
                    </div>
                  </div>
                </div>
              </div>

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

          {/* 공시지가 */}
          {result.landprice !== null && result.landprice > 0 && (() => {
            const area = resolvedArea;
            return (
              <div className="px-3 py-1.5 rounded-md bg-secondary/50 border border-border text-[11px]">
                💰 개별공시지가{" "}
                <b className="text-foreground">
                  {result.landprice.toLocaleString("ko-KR")}원/㎡
                </b>
                {area > 0
                  ? ` · 토지가 추정 ${Math.round((result.landprice * area) / 1e8 * 100) / 100}억원`
                  : ""}
              </div>
            );
          })()}

          {/* 부분 실패 안내 */}
          {result.errors.length > 0 && (
            <div className="px-3 py-1.5 rounded-md bg-amber-50 border border-amber-300 text-[10.5px] text-amber-800">
              ⚠ 일부 데이터 조회 실패: {result.errors.join(" · ")}
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

      {/* 키 미설정 안내 (첫 진입 시) */}
      {!result && !error && !loading && !hasVworldKey() && (
        <div className="mt-2.5 px-3 py-2 rounded-md text-[10.5px] bg-amber-50 border border-amber-300 text-amber-800">
          💡 .env.local에 NEXT_PUBLIC_VWORLD_KEY · DATAGO_KEY · KAKAO_KEY 설정 시 자동 조회. 미설정 시 아래 항목을 수동 입력.
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
