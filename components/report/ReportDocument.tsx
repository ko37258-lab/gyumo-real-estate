"use client";

import {
  Document,
  Image as PdfImage,
  Page,
  Path,
  Rect,
  StyleSheet,
  Svg,
  Text as PdfText,
  Text as SvgText,
  View,
} from "@react-pdf/renderer";
import { createContext, Fragment, useContext } from "react";
import { ensurePdfFonts } from "@/lib/pdf/fonts";
import { COLORS } from "@/lib/pdf/tokens";
import type { AIAnalysis, ReportInputs } from "@/lib/ai/types";
import { formatArea, formatPyeongAsArea } from "@/lib/utils/area";
import {
  envelopeProfile,
  requiredSetbackM,
  SUNLIGHT_RULE_META,
  type SunlightRule,
} from "@/lib/calc/sunlight";
import { getBrandConfig } from "@/lib/branding/storage";
import type { BrandConfig } from "@/lib/branding/types";
import {
  buildReductionTips,
  compactCarAllowance,
  TIP_STATUS_LABEL,
} from "@/lib/parking/reduction";
import { buildReportTitle } from "@/lib/report/dataStatus";
import { AREA_TERMS } from "@/lib/report/areaTerms";
import { groupFloorRows } from "@/lib/report/floorTable";
import { sunlightSectionAllowed, capVerdictConfirmable } from "@/lib/report/consistency";

ensurePdfFonts();

const fmtNum = (v: number, d = 0) =>
  v.toLocaleString("ko-KR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
/** 억 단위 표시 — 토지가 시나리오표(C1)의 공시지가 기준 등에서 세후순이익이 음수로 수십억
 *  나올 수 있다. 부호 없는 비교(v >= 1e8)는 음수를 걸러내지 못해 "-15,135,719,207원"처럼
 *  억 단위 환산 없이 읽기 어려운 숫자가 그대로 나갔다 — 절대값으로 비교한다. */
const fmtEok = (v: number) =>
  Math.abs(v) >= 1e8
    ? `${(v / 1e8).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억원`
    : `${fmtNum(Math.round(v))}원`;
const fmtWon = (v: number) => `${fmtNum(Math.round(v))}원`;
/** 억 이상은 억, 그 아래는 만원 — 연 임대수입처럼 억 미만이 흔한 금액용 */
const fmtWonSmart = (v: number) =>
  v >= 1e8
    ? `${(v / 1e8).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억원`
    : `${fmtNum(Math.round(v / 1e4))}만원`;

const PLACEMENT_LABEL: Record<string, string> = {
  none: "없음",
  basement: "지하",
  above: "지상",
  mixed: "지상+지하 혼합",
};

const styles = StyleSheet.create({
  base: { fontFamily: "Pretendard", color: COLORS.DARK },
  innerPage: {
    paddingTop: 30,
    paddingBottom: 25,
    paddingLeft: 25,
    paddingRight: 25,
    fontFamily: "Pretendard",
    color: COLORS.DARK,
  },
  section: { marginBottom: 18 },
  h2: {
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.DARK,
    marginBottom: 6,
  },
  h2Underline: {
    height: 2,
    width: 28,
    backgroundColor: COLORS.CORAL_DARK,
    marginBottom: 10,
  },
  h3: { fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 4 },
  body: { fontSize: 10, lineHeight: 1.55, color: COLORS.DARK },
  muted: { fontSize: 9, color: COLORS.GRAY },
  pageHeader: {
    position: "absolute",
    top: 12,
    left: 25,
    right: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.LIGHT_GRAY,
    paddingBottom: 6,
  },
  pageFooter: {
    position: "absolute",
    bottom: 12,
    left: 25,
    right: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COLORS.LIGHT_GRAY,
    paddingTop: 6,
  },
  smallText: { fontSize: 8, color: COLORS.GRAY },
  brand: { fontSize: 8, color: COLORS.CORAL_DARK, fontWeight: 700 },
});

/** 섹션 번호 — 선택된 항목에 따라 1..N 으로 다시 매긴다 (예전: 5. 비용 다음 9. 부록) */
const SecCtx = createContext<Record<string, string>>({});
const useSec = () => useContext(SecCtx);

function sectionNumbers(input: ReportInputs, hasAnalysis: boolean): Record<string, string> {
  const out: Record<string, string> = {};
  let n = 0;
  const next = () => String(++n);
  out.overview = next();
  out.summary = next();
  out.scale = next();
  if (input.scale.parkingSpaces > 0) out.parking = next();
  if (input.includeCostPage !== false) out.cost = next();
  if (input.profit) out.profit = next();
  if (input.revenue) out.revenue = next();
  if (input.usePrices) out.usePrices = input.revenue ? `${out.revenue}-1` : next();
  if (hasAnalysis) out.ai = next();
  out.appendix = next();
  return out;
}

interface Props {
  input: ReportInputs;
  analysis: AIAnalysis | null;
  /** 사전 주입된 브랜드 설정 — 미제공 시 getBrandConfig() 호출. */
  brand?: BrandConfig;
}

export function ReportDocument({ input, analysis, brand }: Props) {
  const b = brand ?? getBrandConfig();
  return (
    <Document
      title={`${b.companyName} 검토보고서 ${input.reviewDate}`}
      author={`${b.brandTagline} 시뮬레이터`}
    >
      <CoverPage input={input} analysis={analysis} brand={b} />
      {/* 표지 이후는 하나의 흐르는 페이지 — 섹션이 이어 붙어 인쇄 시 빈 공간이 생기지 않는다.
          (섹션마다 <Page>를 쓰면 짧은 섹션 뒤에 반 페이지씩 공백이 남았다 — 2026-09-04 정리) */}
      <Page size="A4" style={styles.innerPage} wrap>
        <SecCtx.Provider value={sectionNumbers(input, Boolean(analysis))}>
        <FixedHeader input={input} brand={b} />
        <FixedFooter input={input} />
        <OverviewPage input={input} brand={b} />
        <SummaryPage input={input} analysis={analysis} brand={b} />
        <ScalePage input={input} brand={b} />
        {input.scale.floorTable && <FloorDetailPage input={input} brand={b} />}
        {input.scale.parkingSpaces > 0 && <ParkingPage input={input} brand={b} />}
        {input.includeCostPage !== false && <CostPage input={input} brand={b} />}
        {input.profit && <ProfitPage input={input} brand={b} />}
        {input.revenue && <RevenuePage input={input} brand={b} />}
        {input.usePrices && <UsePricesPage input={input} brand={b} />}
        {analysis && <AIPage input={input} analysis={analysis} brand={b} />}
        <AppendixPage input={input} brand={b} />
        </SecCtx.Provider>
      </Page>
    </Document>
  );
}

/* ─────────────────────────── 표지 ─────────────────────────── */
function CoverPage({
  input,
  analysis,
  brand,
}: {
  input: ReportInputs;
  analysis: AIAnalysis | null;
  brand: BrandConfig;
}) {
  // 조회 전(예시값·미조회 입력)이면 주소를 "검토 대상"에 그대로 쓰지 않는다 — 단일 판정원
  // lib/report/dataStatus. 한장 보고서와 같은 판정으로 제목·배지를 맞춘다.
  const titleInfo = buildReportTitle({
    status: input.addressStatus ?? "fetched",
    address: input.address ?? "",
  });
  return (
    <Page size="A4" style={{ backgroundColor: COLORS.CREAM, padding: 0 }}>
      {/* 상단 브랜드 풀블리드 띠 */}
      <View
        style={{
          height: 120,
          backgroundColor: brand.primaryColor,
          paddingHorizontal: 40,
          paddingVertical: 0,
          justifyContent: "flex-end",
          paddingBottom: 24,
        }}
      >
        <PdfText
          style={{
            color: "white",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: 2,
            fontFamily: "Pretendard",
          }}
        >
          {brand.companyNameEn} · {brand.brandTaglineEn}
        </PdfText>
        <PdfText
          style={{
            color: COLORS.CORAL_LIGHT,
            fontSize: 10,
            marginTop: 4,
            letterSpacing: 1.5,
            fontFamily: "Pretendard",
          }}
        >
          {brand.reportSubtitle}
        </PdfText>
      </View>

      <View
        style={{
          paddingHorizontal: 40,
          paddingTop: 30,
          paddingBottom: 26,
          flex: 1,
          justifyContent: "space-between",
          fontFamily: "Pretendard",
        }}
      >
        <View>
          <PdfText
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.DARK,
              lineHeight: 1.3,
              fontFamily: "Pretendard",
            }}
          >
            부동산 검토 보고서
          </PdfText>
          <PdfText
            style={{
              fontSize: 14,
              color: COLORS.GRAY,
              marginTop: 10,
              fontFamily: "Pretendard",
            }}
          >
            건축 규모 · 비용 · 부담금 · 종합 분석
          </PdfText>

          <View
            style={{
              height: 3,
              backgroundColor: COLORS.CORAL,
              width: 80,
              marginTop: 16,
              marginBottom: 16,
            }}
          />

          <View
            wrap={false}
            style={{
              backgroundColor: "white",
              padding: 20,
              borderLeftWidth: 4,
              borderLeftColor: brand.primaryColor,
              borderLeftStyle: "solid",
            }}
          >
            <PdfText style={{ fontSize: 10, color: COLORS.GRAY, fontFamily: "Pretendard" }}>
              검토 대상
            </PdfText>
            {!titleInfo.isVerified && titleInfo.badgeLabel ? (
              <View
                style={{
                  alignSelf: "flex-start",
                  marginTop: 3,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 3,
                  backgroundColor: "#F59E0B",
                }}
              >
                <PdfText style={{ fontSize: 8, fontWeight: 700, color: "white", fontFamily: "Pretendard" }}>
                  ⚠ {titleInfo.badgeLabel}
                </PdfText>
              </View>
            ) : null}
            <PdfText
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: COLORS.DARK,
                marginTop: 4,
                marginBottom: titleInfo.addressNote ? 2 : 14,
                fontFamily: "Pretendard",
              }}
            >
              {titleInfo.title}
            </PdfText>
            {titleInfo.addressNote ? (
              <PdfText style={{ fontSize: 8.5, color: "#8A5A12", marginBottom: 12, fontFamily: "Pretendard" }}>
                {titleInfo.addressNote}
              </PdfText>
            ) : null}
            <View style={{ flexDirection: "row", gap: 30 }}>
              <View>
                <PdfText style={{ fontSize: 9, color: COLORS.GRAY, fontFamily: "Pretendard" }}>
                  검토일
                </PdfText>
                <PdfText
                  style={{ fontSize: 11, fontWeight: 500, marginTop: 2, fontFamily: "Pretendard" }}
                >
                  {input.reviewDate}
                </PdfText>
              </View>
              <View>
                <PdfText style={{ fontSize: 9, color: COLORS.GRAY, fontFamily: "Pretendard" }}>
                  용도지역
                </PdfText>
                <PdfText
                  style={{ fontSize: 11, fontWeight: 500, marginTop: 2, fontFamily: "Pretendard" }}
                >
                  {input.scale.zoneName}
                </PdfText>
              </View>
              <View>
                <PdfText style={{ fontSize: 9, color: COLORS.GRAY, fontFamily: "Pretendard" }}>
                  대지면적
                </PdfText>
                <PdfText
                  style={{ fontSize: 11, fontWeight: 500, marginTop: 2, fontFamily: "Pretendard" }}
                >
                  {formatArea(input.scale.landAreaSqm)}
                </PdfText>
              </View>
            </View>
          </View>

          {/* 히어로 — 3D 렌더(크게) + 위치도(작게) 나란히 */}
          {input.visualization3D || input.locationMap ? (
            <View style={{ marginTop: 14, flexDirection: "row", gap: 8 }}>
              {input.visualization3D ? (
                <View style={{ flex: input.locationMap ? 1.7 : 1 }}>
                  <PdfImage
                    src={input.visualization3D}
                    style={{ width: "100%", height: 168, objectFit: "contain", borderRadius: 3 }}
                  />
                  <PdfText style={{ fontSize: 8, color: COLORS.GRAY, marginTop: 3, fontFamily: "Pretendard" }}>
                    3D 매스 — 건폐율·용적률{input.scale.sunlightApplied ? "·정북 일조사선" : ""}·주차 반영 (치수 m · 입력 조건 기준 이론상 규모)
                  </PdfText>
                </View>
              ) : null}
              {input.locationMap ? (
                <View style={{ flex: 1 }}>
                  <PdfImage
                    src={input.locationMap}
                    style={{ width: "100%", height: 168, objectFit: "cover", borderRadius: 3 }}
                  />
                  <PdfText style={{ fontSize: 8, color: COLORS.GRAY, marginTop: 3, fontFamily: "Pretendard" }}>
                    위치도 — 대상 필지(주황) · VWorld 위성 · 상단 N=정북 · 100m 축척
                  </PdfText>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* KPI 4타일 — 표지에서 규모·수익을 한눈에 */}
          <CoverKpiRow input={input} brand={brand} />
          {/* 미확인 사항 전체 목록은 "검토 요약" 1곳에만 — 표지는 한 줄 참조만(B2) */}
          <UnverifiedRef input={input} sectionNum={sectionNumbers(input, Boolean(analysis)).summary} />

          {analysis?.oneLiner ? (
            <View
              wrap={false}
              style={{
                backgroundColor: COLORS.CORAL_LIGHT,
                padding: 14,
                marginTop: 12,
              }}
            >
              <PdfText
                style={{
                  fontSize: 9,
                  color: brand.primaryColor,
                  fontWeight: 700,
                  marginBottom: 6,
                  letterSpacing: 1,
                  fontFamily: "Pretendard",
                }}
              >
                전문 한 줄 의견
              </PdfText>
              <PdfText style={{ fontSize: 13, color: COLORS.DARK, fontFamily: "Pretendard" }}>
                &ldquo;{analysis.oneLiner}&rdquo;
              </PdfText>
            </View>
          ) : null}
        </View>

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: COLORS.LIGHT_GRAY,
            paddingTop: 14,
          }}
        >
          <PdfText style={{ fontSize: 9, color: COLORS.GRAY, fontFamily: "Pretendard" }}>
            발행: {brand.brandTagline} {brand.authorName} · {brand.corporationName}
          </PdfText>
          <PdfText
            style={{ fontSize: 9, color: COLORS.GRAY, marginTop: 2, fontFamily: "Pretendard" }}
          >
            검수 상태: 자동 산정 보고서 — 건축사·법률 자문({brand.legalAdvisor}) 검토를 거치지 않음 · 전문 종합 분석 {input.aiStatus === "done" ? "포함" : input.aiStatus === "failed" ? "실패(미포함)" : "미실행"} · 검토일 {input.reviewDate}
          </PdfText>
        </View>
      </View>
    </Page>
  );
}

/* ─────────────────────────── 표지 KPI 타일 ─────────────────────────── */
function KpiTile({
  label,
  value,
  sub,
  accent,
  accentColor,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  accentColor?: string;
}) {
  const acc = accentColor ?? COLORS.CORAL_DARK;
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: accent ? acc : "white",
        borderWidth: 1,
        borderColor: accent ? acc : COLORS.LIGHT_GRAY,
        borderStyle: "solid",
        borderRadius: 4,
        paddingVertical: 9,
        paddingHorizontal: 10,
      }}
    >
      <PdfText style={{ fontSize: 8.5, color: accent ? COLORS.CORAL_LIGHT : COLORS.GRAY, fontFamily: "Pretendard" }}>
        {label}
      </PdfText>
      <PdfText
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: accent ? "white" : COLORS.DARK,
          marginTop: 2,
          fontFamily: "Pretendard",
        }}
      >
        {value}
      </PdfText>
      {sub ? (
        <PdfText style={{ fontSize: 8, color: accent ? COLORS.CORAL_LIGHT : COLORS.GRAY, marginTop: 1, fontFamily: "Pretendard" }}>
          {sub}
        </PdfText>
      ) : null}
    </View>
  );
}

function CoverKpiRow({ input, brand }: { input: ReportInputs; brand: BrandConfig }) {
  const s = input.scale;
  const py = (sqm: number) => Math.round(sqm / 3.305785).toLocaleString("ko-KR");
  const floorsTxt = s.floorCount ? `지상 ${s.floorCount}층` : "-";
  const rev = input.revenue;
  const thirdTile = s.totalUnits
    ? { label: "가설계 세대수", value: `${s.totalUnits}세대`, sub: `전용 ${s.unitExclusiveSqm ?? "-"}㎡ · ${floorsTxt}` }
    : { label: "층수 · 높이 (이론상)", value: floorsTxt, sub: `${s.floorLabel && s.floorLabel.includes("부분층") ? "최상층 부분층 · " : ""}H ${(s.heightM ?? 0).toFixed(1)}m · 법정 주차 ${s.parkingSpaces}대` };
  // C1/B8 — 토지가·분양가가 초기 기본값이라 판정이 보류 상태인데, 표지에서 가장 눈에 띄는
  // 4번째 타일에 큰 금액(총사업비 등)을 확정형으로 보여주면 바로 아래 "미확인 사항"·
  // "전문 한 줄 의견"과 스스로 모순된다(docs/report-trust-audit-20261006.md B8). 이 경우는
  // 금액 대신 판정 상태 자체를 타일로 보여준다.
  const landGateHold =
    rev?.sale === undefined &&
    Boolean(input.profit) &&
    input.profit?.verdict?.kind === "hold" &&
    (input.profit?.landPriceSource === "default" || input.profit?.salesPriceSource === "default");
  const fourth = rev?.sale
    ? { label: "예상 분양 총수입", value: fmtEok(rev.sale.totalWon), sub: `세대당 ${fmtEok(rev.sale.perUnitWon)} · 인근 실거래 기준` }
    : landGateHold
      ? {
          label: "사업성 판정",
          value: "판정 보류",
          sub: input.land?.landTrades
            ? `실거래 추정 토지가 ${(input.land.landTrades.estimatedPrice / 1e8).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억원(참고) · 가정값 확인 필요`
            : "토지가·분양가 가정값 확인 필요",
        }
      : input.profit
        ? { label: "토지비 포함 총사업비", value: fmtEok(input.profit.totalProjectCost), sub: `토지 ${fmtEok(input.profit.landCost)} · 금융비 포함` }
        : { label: "건축·부대비 소계", value: fmtEok(input.cost.total), sub: "토지비·금융비 미포함" };
  return (
    <View wrap={false} style={{ flexDirection: "row", gap: 6, marginTop: 12 }}>
      <KpiTile label="대지면적" value={`${fmtNum(s.landAreaSqm, 2)}㎡`} sub={`${(s.landAreaSqm / 3.305785).toFixed(2)}평 · ${s.zoneName}`} />
      <KpiTile
        label={AREA_TERMS.farEstimateGfa}
        value={`${py(s.actualFloorArea)}평`}
        sub={`상한 산술값 ${py(s.legalFloorArea)}평 · 건폐 ${s.coverRatio}% / 용적 ${s.floorRatio}%`}
      />
      <KpiTile label={thirdTile.label} value={thirdTile.value} sub={thirdTile.sub} />
      <KpiTile
        label={fourth.label}
        value={fourth.value}
        sub={fourth.sub}
        accent
        accentColor={landGateHold ? "#B45309" : brand.primaryColor}
      />
    </View>
  );
}

/* ─────────────────────────── 1. 사업 개요 ─────────────────────────── */
function OverviewPage({ input, brand }: { input: ReportInputs; brand: BrandConfig }) {
  const sec = useSec();
  const s = input.scale;
  const land = input.land;
  const py = (sqm: number) => Math.round(sqm / 3.305785).toLocaleString("ko-KR");
  const eok = (v: number) => `${(v / 1e8).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억원`;
  const floorsTxt = s.floorsExact
    ? Number.isInteger(s.floorsExact)
      ? `${s.floorsExact}층`
      : `${s.floorsExact.toFixed(1)}층`
    : "-";

  const addrStatus = input.addressStatus ?? "fetched";
  const landRows: [string, string][] = [
    [
      "소재지",
      `${input.address || "(미입력)"}${addrStatus !== "fetched" ? " · 주소 미조회(예시·확인 필요)" : ""}`,
    ],
    ["대지면적", `${fmtNum(s.landAreaSqm, 2)}㎡ (${(s.landAreaSqm / 3.305785).toFixed(2)}평) · ${s.lotAreaSource === "official" ? "공부상 면적(조회)" : s.lotAreaSource === "input" ? "사용자 입력" : "예시값"}${s.shapeAreaSqm ? ` · 지적도 도형 ${fmtNum(s.shapeAreaSqm, 2)}㎡(참고)` : ""}${land?.mergedCount && land.mergedCount > 1 ? ` · 합필 ${land.mergedCount}필지` : ""}`],
    [
      "용도지역 · 법정 상한",
      `${s.zoneName} — 건폐율 ${s.legalCovMax ?? "-"}% · 용적률 ${s.legalFarMax ?? "-"}%${s.sunlightApplied ? " · 정북 일조 적용" : ""}`,
    ],
  ];
  if (land?.jimok || land?.roadSide || land?.landShape) {
    landRows.push([
      "지목 · 형상 · 도로",
      [land?.jimok, land?.landShape ? `형상 ${land.landShape}` : null, land?.roadSide ? `도로접면 ${land.roadSide}` : null]
        .filter(Boolean)
        .join(" · "),
    ]);
  }
  if (land?.publicPricePerSqm && land.publicPricePerSqm > 0) {
    landRows.push([
      `개별공시지가${land.publicPriceYear ? ` (${land.publicPriceYear})` : ""}`,
      `${fmtNum(land.publicPricePerSqm)}원/㎡ · 총 ${eok(land.publicPricePerSqm * land.areaSqm)}`,
    ]);
  }
  if (land?.landTrades) {
    landRows.push([
      "실거래 기반 추정 토지가",
      `${eok(land.landTrades.estimatedPrice)} (표본 ${land.landTrades.sampleCount}건${land.landTrades.ratioToJiga > 0 ? ` · 공시지가 ${land.landTrades.ratioToJiga}배` : ""})`,
    ]);
  }

  const rev = input.revenue;

  return (
    <>

      <PdfText style={styles.h2} minPresenceAhead={170}>{sec.overview}. 사업 개요</PdfText>
      <View style={styles.h2Underline} />

      <PdfText style={styles.h3} minPresenceAhead={100}>(a) 대상 토지</PdfText>
      <TwoColTable rows={landRows} />

      {/* (b) 계획 규모 — 숫자 자체(72평·955평·14층·49m류)는 요약(2쪽)·규모 검토(3쪽)에
          이미 나온다(B4). 여기서는 한 줄 결론 + 포인터만 두어 같은 수치를 세 번째로
          반복하지 않는다. */}
      <PdfText style={[styles.h3, { marginTop: 12 }]} minPresenceAhead={60}>(b) 계획 규모</PdfText>
      <PdfText style={[styles.body, { fontFamily: "Pretendard" }]}>
        {`${s.floorLabel ?? floorsTxt} · 높이 약 ${(s.heightM ?? 0).toFixed(1)}m · ${AREA_TERMS.farEstimateGfa} ${py(s.actualFloorArea)}평 · 법정 주차 ${s.parkingSpaces}대${s.totalUnits ? ` · 가설계 ${s.totalUnits}세대` : ""}. 핵심 수치는 ${sec.summary}쪽 요약, 산정 상세는 ${sec.scale}쪽 참고.`}
      </PdfText>

      {rev ? (
        <View wrap={false} style={{ marginTop: 12 }}>
          <PdfText style={styles.h3} minPresenceAhead={100}>(d) 수익 요약 — 인근 실거래 기준</PdfText>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <KpiTile
              label="분양(매각) 총수입"
              value={rev.sale ? fmtEok(rev.sale.totalWon) : "표본 부족"}
              sub={rev.sale ? `세대당 ${fmtEok(rev.sale.perUnitWon)} · ${rev.sale.manPerPy.toLocaleString("ko-KR")}만원/평` : undefined}
              accent
              accentColor={brand.primaryColor}
            />
            <KpiTile
              label="월세 수입 (월 / 연)"
              value={rev.rent ? `${Math.round(rev.rent.monthlyWon / 1e4).toLocaleString("ko-KR")}만원` : "표본 부족"}
              sub={rev.rent ? `연 ${fmtWonSmart(rev.rent.yearlyWon)} · 세대당 월 ${Math.round(rev.rent.perUnitMonthlyWon / 1e4).toLocaleString("ko-KR")}만원` : undefined}
            />
            <KpiTile
              label="표면 임대수익률"
              value={rev.grossYieldPct > 0 ? `${rev.grossYieldPct.toFixed(1)}%/년` : "-"}
              sub="연 월세 ÷ 분양 총액 (보증금·공실 제외)"
            />
          </View>
          <PdfText style={[styles.muted, { marginTop: 4 }]}>
            ※ {rev.totalUnits}세대 × 전용 {rev.unitExclusiveSqm}㎡ 기준 · 최근 {rev.periodMonths}개월 실거래 중앙값 · 상세는 7장.
          </PdfText>
        </View>
      ) : null}
    <View style={{ height: 18 }} /></>
  );
}

/** 층별 면적 스택 — 가로 막대(위=최상층, 아래=지하). SVG 직접 렌더. */
function FloorStackDiagram({
  table,
  brand,
}: {
  table: NonNullable<ReportInputs["scale"]["floorTable"]>;
  brand: BrandConfig;
}) {
  const above = [...table.rows].sort((a, b) => b.floor - a.floor);
  const below = [...table.basement].sort((a, b) => a.level - b.level);
  const maxArea = Math.max(1, ...above.map((r) => r.areaSqm), ...below.map((r) => r.areaSqm));
  const W = 500;
  const BAR_H = 13;
  const GAP = 3;
  const LABEL_W = 34;
  const BAR_MAX = 300;
  const rowsN = above.length + below.length + (below.length ? 1 : 0);
  const H = rowsN * (BAR_H + GAP) + 6;
  const groundY = above.length * (BAR_H + GAP) + 1;
  let y = 2;
  const items: React.ReactNode[] = [];
  above.forEach((r, i) => {
    const w = Math.max(2, (r.areaSqm / maxArea) * BAR_MAX);
    const clipped = r.legalSetbackM > 1.5 && r.areaSqm < (above[above.length - 1]?.areaSqm ?? r.areaSqm) - 0.05;
    items.push(
      <SvgText key={`l${i}`} x={LABEL_W - 4} y={y + BAR_H - 3} style={{ fontSize: 8, fontFamily: "Pretendard" }} fill={COLORS.GRAY} textAnchor="end">
        {`${r.floor}F`}
      </SvgText>,
      <Rect key={`b${i}`} x={LABEL_W} y={y} width={w} height={BAR_H} fill={i === 0 ? brand.primaryColor : COLORS.CORAL} />,
      <SvgText key={`t${i}`} x={LABEL_W + w + 4} y={y + BAR_H - 3} style={{ fontSize: 8, fontFamily: "Pretendard" }} fill={COLORS.DARK}>
        {`${fmtNum(r.areaSqm, 1)}㎡${clipped ? ` · 이격 ${r.legalSetbackM.toFixed(1)}m` : ""}${r.portion < 1 ? ` (${Math.round(r.portion * 100)}%)` : ""}`}
      </SvgText>,
    );
    y += BAR_H + GAP;
  });
  if (below.length) {
    items.push(
      <Rect key="gl" x={LABEL_W} y={groundY} width={BAR_MAX + 8} height={1} fill={COLORS.DARK} />,
      <SvgText key="glt" x={LABEL_W + BAR_MAX + 12} y={groundY + 3} style={{ fontSize: 7, fontFamily: "Pretendard" }} fill={COLORS.GRAY}>
        GL
      </SvgText>,
    );
    y += 4;
    below.forEach((r, i) => {
      const w = Math.max(2, (r.areaSqm / maxArea) * BAR_MAX);
      items.push(
        <SvgText key={`bl${i}`} x={LABEL_W - 4} y={y + BAR_H - 3} style={{ fontSize: 8, fontFamily: "Pretendard" }} fill={COLORS.GRAY} textAnchor="end">
          {`B${r.level}`}
        </SvgText>,
        <Rect key={`bb${i}`} x={LABEL_W} y={y} width={w} height={BAR_H} fill="#9CA3AF" />,
        <SvgText key={`bt${i}`} x={LABEL_W + w + 4} y={y + BAR_H - 3} style={{ fontSize: 8, fontFamily: "Pretendard" }} fill={COLORS.DARK}>
          {`${fmtNum(r.areaSqm, 1)}㎡ · ${r.note}`}
        </SvgText>,
      );
      y += BAR_H + GAP;
    });
  }
  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {items}
    </Svg>
  );
}

/* ─────────────────────────── 7. 분양·임대 수익 추정 ─────────────────────────── */
function RevenuePage({ input, brand }: { input: ReportInputs; brand: BrandConfig }) {
  const sec = useSec();
  const rev = input.revenue!;
  const s = input.scale;
  const costTotal = input.cost.total;
  const saleTotal = rev.sale?.totalWon ?? 0;
  const diff = saleTotal - costTotal;
  const bars: Array<{ label: string; value: number; color: string }> = [];
  if (rev.sale) {
    bars.push({ label: "분양 총수입", value: saleTotal, color: brand.primaryColor });
    bars.push({ label: "총 사업비 (토지비 제외)", value: costTotal, color: "#5f7a89" });
    bars.push({ label: diff >= 0 ? "차액 (수입 − 사업비)" : "부족액 (사업비 − 수입)", value: Math.abs(diff), color: diff >= 0 ? "#2f8f5b" : "#DC2626" });
  }
  const maxV = Math.max(1, ...bars.map((b) => b.value));
  const BW = 500;
  const BH = bars.length * 22 + 4;

  return (
    <>

      <View wrap={false}>
      <PdfText style={styles.h2}>{sec.revenue}. 분양·임대 수익 추정</PdfText>
      <View style={styles.h2Underline} />

      <PdfText style={styles.h3}>(a) 계획 개요</PdfText>
      <TwoColTable
        rows={[
          ["건축물 용도", s.usageLabel ?? rev.usage],
          ["세대수 (⑥ 가설계)", `${rev.totalUnits}세대 · 층당 배치는 기준층 개략 배치도 기준`],
          ["세대 전용면적", `${rev.unitExclusiveSqm}㎡ (${rev.exclusivePy.toFixed(1)}평)`],
          ["전용률 · 공급면적", `${rev.efficiencyPct}% · ${rev.supplyPy.toFixed(1)}평`],
          ["시세 기준", `${rev.baseAddress ?? input.address ?? ""} 인근 · 최근 ${rev.periodMonths}개월 국토교통부 실거래 중앙값`],
        ]}
      />
      </View>

      <PdfText style={[styles.h3, { marginTop: 12 }]} minPresenceAhead={100}>(b) 분양(매각) 시나리오</PdfText>
      {rev.sale ? (
        <TwoColTable
          rows={[
            ["적용 단가", `${rev.sale.manPerPy.toLocaleString("ko-KR")}만원/평 (${rev.sale.exclusive ? "전용" : "공급"}면적 기준 · ${rev.sale.label} 매매 ${rev.sale.count}건)`],
            ["세대당 분양가", `${fmtEok(rev.sale.perUnitWon)} = ${rev.sale.manPerPy.toLocaleString("ko-KR")}만원 × ${rev.sale.areaPy.toFixed(1)}평`],
            ["총 분양수입", `${fmtEok(rev.sale.totalWon)} = 세대당 × ${rev.totalUnits}세대`],
          ]}
        />
      ) : (
        <PdfText style={styles.body}>인근에 비교할 매매 표본이 부족해 분양 시나리오를 산출하지 않았습니다.</PdfText>
      )}

      {rev.sale ? <PdfText style={[styles.muted, { marginTop: 3 }]}>표본: {rev.sale.basis} · 최근 {rev.periodMonths}개월</PdfText> : null}

      <PdfText style={[styles.h3, { marginTop: 10 }]} minPresenceAhead={100}>(c) 임대(월세) 시나리오</PdfText>
      {rev.rent ? (
        <TwoColTable
          rows={[
            ["적용 월세 단가", `${rev.rent.manPerPy.toLocaleString("ko-KR")}만원/평·월 (${rev.rent.exclusive ? "전용" : "공급"}면적 기준 · ${rev.rent.label} 월세 ${rev.rent.count}건)`],
            ["세대당 월세", `월 ${Math.round(rev.rent.perUnitMonthlyWon / 1e4).toLocaleString("ko-KR")}만원 (보증금 별도)`],
            ["월 합계 / 연 합계", `월 ${Math.round(rev.rent.monthlyWon / 1e4).toLocaleString("ko-KR")}만원 / 연 ${fmtWonSmart(rev.rent.yearlyWon)}`],
            ["표면 임대수익률", rev.grossYieldPct > 0 ? `${rev.grossYieldPct.toFixed(1)}%/년 (연 월세 ÷ 분양 총액)` : "— (분양 표본 없음)"],
          ]}
        />
      ) : (
        <PdfText style={styles.body}>인근에 비교할 월세 표본이 부족해 임대 시나리오를 산출하지 않았습니다.</PdfText>
      )}
      {rev.rent ? <PdfText style={[styles.muted, { marginTop: 3 }]}>표본: {rev.rent.basis} · 최근 {rev.periodMonths}개월</PdfText> : null}

      <View
        wrap={false}
        style={{
          marginTop: 10,
          padding: 12,
          backgroundColor: COLORS.CREAM,
          borderLeftWidth: 4,
          borderLeftColor: brand.primaryColor,
          borderLeftStyle: "solid",
        }}
      >
        <PdfText style={{ fontSize: 10, fontWeight: 700, color: brand.primaryColor, fontFamily: "Pretendard", marginBottom: 5 }}>
          ■ 한눈에 보는 수익
        </PdfText>
        {rev.sale ? (
          <PdfText style={[styles.body, { marginBottom: 3 }]}>
            1. 이 계획({rev.totalUnits}세대, 전용 {rev.unitExclusiveSqm}㎡)을 인근 시세대로 분양하면 총 약 {fmtEok(rev.sale.totalWon)}이 들어오고, 건축 사업비 {fmtEok(costTotal)}를 빼면 {diff >= 0 ? `약 ${fmtEok(diff)}이 남습니다` : `약 ${fmtEok(-diff)}이 모자랍니다`}(토지비 제외).
          </PdfText>
        ) : null}
        {rev.rent ? (
          <PdfText style={[styles.body, { marginBottom: 3 }]}>
            {rev.sale ? "2" : "1"}. 분양 대신 월세를 놓으면 월 약 {Math.round(rev.rent.monthlyWon / 1e4).toLocaleString("ko-KR")}만원, 연 {fmtWonSmart(rev.rent.yearlyWon)}의 임대수입이 예상됩니다{rev.grossYieldPct > 0 ? ` (분양가 대비 표면수익률 ${rev.grossYieldPct.toFixed(1)}%)` : ""}.
          </PdfText>
        ) : null}
        <PdfText style={styles.body}>
          {rev.sale && rev.rent ? "3" : "2"}. 신축 프리미엄·보증금 구조·공실·층향에 따라 실제 수입은 달라집니다. 감정평가·분양가 산정 자료가 아닌 실거래 통계 기반 참고치입니다.
        </PdfText>
      </View>
      {bars.length > 0 ? (
        <View wrap={false} style={{ marginTop: 12 }}>
          <PdfText style={styles.h3} minPresenceAhead={100}>(d) 분양 총수입 vs 총 사업비</PdfText>
          <View style={{ borderWidth: 1, borderColor: COLORS.LIGHT_GRAY, borderStyle: "solid", padding: 8, backgroundColor: "white" }}>
            <Svg width={BW} height={BH} viewBox={`0 0 ${BW} ${BH}`}>
              {bars.map((b, i) => {
                const w = Math.max(2, (b.value / maxV) * 300);
                const y = i * 22 + 2;
                return [
                  <SvgText key={`l${i}`} x={118} y={y + 13} style={{ fontSize: 8, fontFamily: "Pretendard" }} fill={COLORS.GRAY} textAnchor="end">
                    {b.label}
                  </SvgText>,
                  <Rect key={`r${i}`} x={124} y={y} width={w} height={17} fill={b.color} />,
                  <SvgText key={`v${i}`} x={124 + w + 5} y={y + 13} style={{ fontSize: 9, fontFamily: "Pretendard" }} fill={COLORS.DARK}>
                    {fmtEok(b.value)}
                  </SvgText>,
                ];
              })}
            </Svg>
            <PdfText style={[styles.muted, { marginTop: 4 }]}>
              ※ 총 사업비는 5장 비용·부담금 산정값(건축비·부담금, 토지비 제외). 토지 매입비까지 반영한 IRR·순이익은 6장 사업성 분석을 보세요.
            </PdfText>
          </View>
        </View>
      ) : null}

    <View style={{ height: 18 }} /></>
  );
}

/* ─────────────────────────── 공통 헤더/푸터 ─────────────────────────── */
function FixedHeader({
  input,
  brand,
}: {
  input: ReportInputs;
  brand: BrandConfig;
}) {
  return (
    <View fixed style={styles.pageHeader}>
      <PdfText
        style={[
          styles.brand,
          { color: brand.primaryColor, fontFamily: "Pretendard" },
        ]}
      >
        {brand.companyNameEn} · {brand.brandTagline}
      </PdfText>
      <PdfText style={styles.smallText}>
        {buildReportTitle({ status: input.addressStatus ?? "fetched", address: input.address ?? "" }).title}
      </PdfText>
    </View>
  );
}

function FixedFooter({ input }: { input: ReportInputs }) {
  return (
    <View fixed style={styles.pageFooter}>
      <PdfText style={styles.smallText}>
        부동산 검토 보고서 · {input.reviewDate}
      </PdfText>
      <PdfText
        style={styles.smallText}
        render={({ pageNumber, totalPages }) =>
          `${pageNumber} / ${totalPages}`
        }
      />
    </View>
  );
}

/* ─────────────────────────── 1. 검토 요약 ─────────────────────────── */
function SummaryPage({
  input,
  analysis,
  brand,
}: {
  input: ReportInputs;
  analysis: AIAnalysis | null;
  brand: BrandConfig;
}) {
  const sec = useSec();
  const totalEok = input.cost.total / 1e8;
  const perPy =
    input.cost.totalArea > 0 ? input.cost.total / input.cost.totalArea : 0;

  return (
    <>

      <View wrap={false}>
        <PdfText style={styles.h2}>{sec.summary}. 검토 요약 (Executive Summary)</PdfText>
        <View style={styles.h2Underline} />
        <PlainSummaryBox input={input} brand={brand} />
        <UnverifiedBox input={input} />
      </View>

      {/* 2x2 KPI 그리드 — 카드 폭 ~78mm로 긴 한국어 텍스트 잘림 방지 */}
      <View wrap={false} style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
          <Kpi2
            label="대지면적"
            value={`${fmtNum(input.scale.landAreaSqm, 1)}㎡`}
            sub={`${fmtNum(input.scale.landAreaPyeong, 0)}평`}
          />
          <Kpi2
            label="용도지역"
            value={input.scale.zoneName}
            valueFontSize={15}
            sub={`건폐율 ${input.scale.coverRatio}% · 용적률 ${input.scale.floorRatio}%`}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Kpi2
            label="건축·부대비 소계 (토지비 제외)"
            value={`${totalEok.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억`}
            sub={input.profit ? `토지비 포함 총사업비 ${fmtEok(input.profit.totalProjectCost)}` : `${fmtWon(input.cost.total)} · 토지비·금융비 미포함`}
            accent
            accentColor={brand.primaryColor}
          />
          <Kpi2
            label="건축·부대비 평당 (총연면적 기준)"
            value={
              input.cost.totalArea > 0
                ? `${fmtNum(Math.round(perPy / 10000))}만`
                : "—"
            }
            sub={
              input.cost.totalArea > 0
                ? `총 ${formatPyeongAsArea(input.cost.totalArea)} · 입력 공사비 ${fmtNum(input.cost.aboveUnit)}만원/평(지상)`
                : ""
            }
          />
        </View>
      </View>

      <PdfText style={styles.h3} minPresenceAhead={100}>전문 의견 요약</PdfText>
      <View
        wrap={false}
        style={{
          borderLeftWidth: 3,
          borderLeftColor: brand.primaryColor,
          borderLeftStyle: "solid",
          backgroundColor: COLORS.CORAL_LIGHT,
          padding: 12,
        }}
      >
        <PdfText style={{ ...styles.body, fontFamily: "Pretendard" }}>
          {analysis
            ? `"${analysis.oneLiner}" — 상세 종합 의견은 ${sec.ai}쪽 참고.`
            : input.aiStatus === "failed"
              ? "전문 종합 분석이 실패해 수록하지 않았습니다. 아래 수치는 자동 산정 결과입니다."
              : "전문 종합 분석을 실행하지 않았습니다. 아래 수치는 자동 산정 결과이며 전문가 검토를 거치지 않았습니다."}
        </PdfText>
      </View>

      <View wrap={false}>
      <PdfText style={[styles.h3, { marginTop: 14 }]} minPresenceAhead={100}>핵심 수치 한눈에</PdfText>
      <TwoColTable
        rows={[
          ["건폐율 / 용적률", `${input.scale.coverRatio}% / ${input.scale.floorRatio}%`],
          ["1층 총바닥면적", formatArea(input.scale.buildingArea)],
          [`${AREA_TERMS.farCapGfa} (산술값)`, formatArea(input.scale.legalFloorArea)],
          [AREA_TERMS.farEstimateGfa, formatArea(input.scale.actualFloorArea)],
          [AREA_TERMS.totalGfa, formatArea(input.scale.totalFloorArea ?? input.scale.actualFloorArea)],
          ["층수 · 높이", `${input.scale.floorLabel ?? "-"} · ${(input.scale.heightM ?? 0).toFixed(1)}m`],
          ["정북 일조", input.scale.sunlightApplied ? `적용 · 손실 ${input.scale.sunlightLoss.toFixed(1)}%` : "해당 없음 (용도지역)"],
          ["법정 주차 / 배치 가정", `${input.scale.parkingSpaces}대 / ${PLACEMENT_LABEL[input.scale.parkingPlacement] ?? input.scale.parkingPlacement} (배치 검토 미실시)`],
        ]}
      />
      </View>

      {input.land && <LandInfoBox land={input.land} brand={brand} />}

      {input.profit && <ProfitKpiBox profit={input.profit} brand={brand} sectionNum={sec.profit} />}
    <View style={{ height: 18 }} /></>
  );
}

/** 토지 정보·시세 (① 지번 조회 결과) — 지목·형상·도로접면·토지이용계획·추정가. */
function LandInfoBox({
  land,
  brand,
}: {
  land: NonNullable<ReportInputs["land"]>;
  brand: BrandConfig;
}) {
  const eok = (v: number) =>
    `${(v / 1e8).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억원`;
  const rows: [string, string][] = [];

  if (land.jimok || land.landUseSituation) {
    rows.push([
      "지목 / 이용상황",
      `${land.jimok ?? "미상"}${land.landUseSituation ? ` / ${land.landUseSituation}` : ""}`,
    ]);
  }
  const phys = [
    land.landShape ? `형상 ${land.landShape}` : null,
    land.landHeight ? `지세 ${land.landHeight}` : null,
    land.roadSide ? `도로접면 ${land.roadSide}` : null,
    land.roadVerdict ? `접도 ${land.roadVerdict}` : null,
  ].filter(Boolean);
  if (phys.length > 0) rows.push(["토지 특성", phys.join(" · ")]);
  if (land.useAttrs && land.useAttrs.length > 0) {
    rows.push([
      "토지이용계획",
      `${land.useAttrs.slice(0, 8).join(", ")}${land.useAttrs.length > 8 ? ` 외 ${land.useAttrs.length - 8}건` : ""}`,
    ]);
  }
  if (land.publicPricePerSqm && land.publicPricePerSqm > 0) {
    rows.push([
      `개별공시지가${land.publicPriceYear ? ` (${land.publicPriceYear})` : ""}`,
      `${fmtNum(land.publicPricePerSqm)}원/㎡ · 총 ${eok(land.publicPricePerSqm * land.areaSqm)}`,
    ]);
  }
  if (land.landTrades) {
    rows.push([
      "실거래 기반 추정 토지가",
      `${eok(land.landTrades.estimatedPrice)} (${land.landTrades.sampleCount}건${land.landTrades.ratioToJiga > 0 ? ` · 공시지가 ${land.landTrades.ratioToJiga}배` : ""})`,
    ]);
  }
  if (land.buildingPrice) {
    rows.push([
      "기존 건물 추정가",
      `${eok(land.buildingPrice.value)} (${land.buildingPrice.method})`,
    ]);
  }
  if (land.newbuild && land.newbuild.resTradeCount > 0) {
    rows.push([
      "인근 신축 주거 시세",
      `㎡당 ${fmtNum(Math.round(land.newbuild.resTradeUnitWon / 10000))}만원 (매매 ${land.newbuild.resTradeCount}건 중앙값)`,
    ]);
  }
  if (land.permits && land.permits.length > 0) {
    rows.push([
      "건축 인허가 이력",
      land.permits
        .map((p) => `${p.permitDay || ""} ${p.archGb || p.mainUse || "건축물"}(${p.status})`)
        .join(" / "),
    ]);
  }

  if (rows.length === 0) return null;

  return (
    <View wrap={false} style={{ marginTop: 14 }}>
      <PdfText style={styles.h3} minPresenceAhead={100}>
        토지 정보·시세 (지번 조회 · VWorld/국토부 실거래가)
      </PdfText>
      <TwoColTable rows={rows} />
      <PdfText style={[styles.muted, { marginTop: 4 }]}>
        ※ 추정가는 실거래 통계 기반 참고치로 감정평가가 아닙니다. 규제·저촉 여부는{" "}
        {brand.legalAdvisor} 및 관할청 확인을 권장합니다.
      </PdfText>
    </View>
  );
}

function ProfitKpiBox({
  profit,
  brand,
  sectionNum,
}: {
  profit: NonNullable<ReportInputs["profit"]>;
  brand: BrandConfig;
  sectionNum?: string;
}) {
  const irrColor =
    profit.irr < 0
      ? "#DC2626"
      : profit.irr < 10
        ? COLORS.GRAY
        : brand.primaryColor;
  const netColor = profit.netProfit < 0 ? "#DC2626" : COLORS.DARK;
  // C1/B8 — 토지가 가정값 미확정이면 여기서도 IRR·순이익 큰 숫자 대신 시나리오 비교로
  // 안내한다(표지·사업성 섹션과 같은 규칙). 큰 숫자만 보고 지나치는 독자가 많아서,
  // "판정 보류" 글자 바로 옆에 확정형 숫자를 크게 보여주면 그 글자가 무의미해진다.
  const landGate = Boolean(profit.landScenarios && profit.landScenarios.length > 1);
  return (
    <View
      wrap={false}
      style={{
        marginTop: 14,
        padding: 12,
        backgroundColor: COLORS.CORAL_LIGHT,
        borderLeftWidth: 3,
        borderLeftColor: brand.primaryColor,
        borderLeftStyle: "solid",
      }}
    >
      <PdfText
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: brand.primaryColor,
          marginBottom: 6,
          fontFamily: "Pretendard",
        }}
      >
        ■ 사업성 핵심 지표 {profit.verdict?.kind === "hold" ? "— 판정 보류(가정 미확인)" : ""}
      </PdfText>
      {landGate ? (
        <PdfText style={{ fontSize: 9.5, color: COLORS.DARK, fontFamily: "Pretendard" }}>
          토지가·분양가가 초기 기본값이라 IRR·순이익을 확정 수치로 보여드리지 않습니다.
          {sectionNum ? ` 토지가 가정별(입력/공시지가/실거래) 비교표는 ${sectionNum}쪽 참고.` : ""}
        </PdfText>
      ) : (
      <View style={{ flexDirection: "row", gap: 12 }}>
        <KpiMini label="자기자본 IRR(단순)" value={`${profit.irr.toFixed(1)}%`} valueColor={irrColor} />
        <KpiMini label="세후 순이익(가정 세율)" value={fmtEok(profit.netProfit)} valueColor={netColor} />
        <KpiMini label="ROE" value={`${profit.roe.toFixed(1)}%`} />
        <KpiMini label="손익분기 분양률" value={`${profit.breakEvenSalesRate.toFixed(0)}%`} />
      </View>
      )}
    </View>
  );
}

function KpiMini({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <PdfText
        style={{
          fontSize: 9,
          color: COLORS.GRAY,
          fontFamily: "Pretendard",
        }}
      >
        {label}
      </PdfText>
      <PdfText
        style={{
          fontSize: 18,
          fontWeight: 700,
          marginTop: 2,
          color: valueColor ?? COLORS.DARK,
          fontFamily: "Pretendard",
        }}
      >
        {value}
      </PdfText>
    </View>
  );
}

/** 2x2 KPI 카드 — flex:1로 폭 자동 분배, 긴 한국어 텍스트 잘림 방지. */
function Kpi2({
  label,
  value,
  sub,
  valueFontSize = 22,
  accent,
  accentColor,
}: {
  label: string;
  value: string;
  sub: string;
  valueFontSize?: number;
  accent?: boolean;
  accentColor?: string;
}) {
  const acc = accentColor ?? COLORS.CORAL_DARK;
  return (
    <View
      wrap={false}
      style={{
        flex: 1,
        backgroundColor: accent ? acc : "white",
        borderWidth: 1,
        borderColor: accent ? acc : COLORS.LIGHT_GRAY,
        borderStyle: "solid",
        borderRadius: 4,
        padding: 14,
      }}
    >
      <PdfText
        style={{
          fontSize: 10,
          color: accent ? COLORS.CORAL_LIGHT : COLORS.GRAY,
          marginBottom: 4,
          fontFamily: "Pretendard",
        }}
      >
        {label}
      </PdfText>
      <PdfText
        style={{
          fontSize: valueFontSize,
          fontWeight: 700,
          color: accent ? "white" : COLORS.DARK,
          fontFamily: "Pretendard",
        }}
      >
        {value}
      </PdfText>
      {sub ? (
        <PdfText
          style={{
            fontSize: 10,
            color: accent ? COLORS.CORAL_LIGHT : COLORS.GRAY,
            marginTop: 2,
            fontFamily: "Pretendard",
          }}
        >
          {sub}
        </PdfText>
      ) : null}
    </View>
  );
}

function TwoColTable({ rows }: { rows: [string, string][] }) {
  return (
    <View
      wrap={false}
      style={{
        borderWidth: 1,
        borderColor: COLORS.LIGHT_GRAY,
        borderStyle: "solid",
      }}
    >
      {rows.map(([k, v], i) => (
        <View
          key={i}
          wrap={false}
          style={{
            flexDirection: "row",
            borderBottomWidth: i === rows.length - 1 ? 0 : 1,
            borderBottomColor: COLORS.LIGHT_GRAY,
            borderBottomStyle: "solid",
          }}
        >
          <View
            style={{
              width: "40%",
              padding: 8,
              backgroundColor: COLORS.CREAM,
            }}
          >
            <PdfText style={{ fontSize: 10, color: COLORS.GRAY, fontFamily: "Pretendard" }}>
              {k}
            </PdfText>
          </View>
          <View style={{ width: "60%", padding: 8, backgroundColor: i % 2 === 1 ? "#FBFAF7" : "white" }}>
            <PdfText
              style={{ fontSize: 10, fontWeight: 500, fontFamily: "Pretendard" }}
            >
              {v}
            </PdfText>
          </View>
        </View>
      ))}
    </View>
  );
}

/* ─────────────────────────── 2. 건축 규모 검토 ─────────────────────────── */
function ScalePage({
  input,
  brand,
}: {
  input: ReportInputs;
  brand: BrandConfig;
}) {
  const sec = useSec();
  const s = input.scale;
  return (
    <>

      <PdfText style={styles.h2} minPresenceAhead={170}>{sec.scale}. 건축 규모 검토</PdfText>
      <View style={styles.h2Underline} />

      <PdfText style={styles.h3} minPresenceAhead={100}>(a) 입력 조건</PdfText>
      <TwoColTable
        rows={[
          ["대지면적", formatArea(s.landAreaSqm)],
          ["용도지역", s.zoneName],
          ["건폐율", `${s.coverRatio}%`],
          ["용적률", `${s.floorRatio}%`],
          [
            "전면도로",
            `${s.roadWidth}m${
              s.roadWidthSource === "assumed"
                ? " (가정값 — 인접 도로 존재만 조회, 폭 실측 아님)"
                : s.roadWidthSource === "roadside"
                  ? " (도로접면 코드 기준 추정 — 실측 아님)"
                  : " (사용자 입력)"
            }`,
          ],
          ["층고", `1층 ${s.floor1HeightM ?? 3.5}m · 기준층 ${s.floorHeightM ?? 3.5}m`],
        ]}
      />
      {s.ordinanceSource && (
        <PdfText style={[styles.smallText, { marginTop: 4, color: "#6b7280" }]}>
          ※ 상한 근거 — {s.ordinanceSource}
        </PdfText>
      )}

      <PdfText style={[styles.h3, { marginTop: 14 }]} minPresenceAhead={100}>(b) 산정 결과</PdfText>
      <TwoColTable
        rows={[
          ["1층 총바닥면적 (건폐율 입력값)", formatArea(s.buildingArea)],
          ...(s.groundParkingArea > 0
            ? ([
                [
                  `└ 1층 지상주차 점유 (${s.groundSpaces}대 × ${s.parkingUnitArea}㎡, ${s.pilotiMode ? "필로티" : "벽체식"})`,
                  `− ${formatArea(s.groundParkingArea)}`,
                ],
                [
                  s.floor1Indoor <= 0
                    ? "1층 주차 외 바닥면적 (1층 전체 주차)"
                    : "1층 주차 외 바닥면적 (코어·공용 미반영)",
                  formatArea(s.floor1Indoor),
                ],
              ] as [string, string][])
            : []),
          [`${AREA_TERMS.farCapGfa} (산술값)`, formatArea(s.legalFloorArea)],
          [AREA_TERMS.farEstimateGfa, formatArea(s.actualFloorArea)],
          [AREA_TERMS.totalGfa, formatArea(s.totalFloorArea ?? s.actualFloorArea)],
          ["층수 · 높이", `${s.floorLabel ?? "-"} · ${(s.heightM ?? 0).toFixed(1)}m (${s.heightNote ?? "층고 합"})`],
          ["정북 일조", s.sunlightApplied ? `적용 · 손실 ${s.sunlightLoss.toFixed(1)}%` : "해당 없음 (용도지역)"],
          [
            "주차장 배치",
            `지상 ${s.groundSpaces}대 / 지하 ${s.basementSpaces}대 (총 ${s.parkingSpaces}대, ${PLACEMENT_LABEL[s.parkingPlacement] ?? s.parkingPlacement})`,
          ],
        ]}
      />

      {s.isReducingFloor1 ? (
        <View
          wrap={false}
          style={{
            marginTop: 10,
            padding: 10,
            backgroundColor: COLORS.CORAL_LIGHT,
            borderLeftWidth: 3,
            borderLeftColor: brand.primaryColor,
            borderLeftStyle: "solid",
          }}
        >
          <PdfText
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: brand.primaryColor,
              fontFamily: "Pretendard",
            }}
          >
            필로티 구조 가정
          </PdfText>
          <PdfText
            style={{
              fontSize: 9.5,
              marginTop: 3,
              color: COLORS.DARK,
              fontFamily: "Pretendard",
            }}
          >
            1층 주차 {formatArea(s.groundParkingArea)}를 바닥면적 불산입으로 가정했습니다 (건축법 시행령 제119조 제1항 제3호 다목 — 필로티 등이 공중 통행·차량 통행·주차에 전용되는 경우 등 요건 충족 시). 개방 정도·용도 요건은 설계 단계에서 확인이 필요합니다.
          </PdfText>
        </View>
      ) : null}

      {s.sunlightApplied ? (
        <>
      <PdfText style={[styles.h3, { marginTop: 14 }]} minPresenceAhead={100}>
        (c) 일조권 손실 다이어그램 (정북단면도)
      </PdfText>
      <View
        wrap={false}
        style={{
          borderWidth: 1,
          borderColor: COLORS.LIGHT_GRAY,
          borderStyle: "solid",
          padding: 10,
        }}
      >
        <SunlightDiagram
          sunlightLoss={s.sunlightLoss}
          buildingArea={s.buildingArea}
          groundParkingArea={s.groundParkingArea}
          showParking={s.groundParkingArea > 0}
          heightM={s.heightM ?? (s.floorsExact ?? 1) * (s.floorHeightM ?? 3.5)}
          floorHeightM={s.floorHeightM ?? 3.5}
          rule={s.sunlightRule ?? "revised"}
        />
        <PdfText style={[styles.muted, { marginTop: 4 }]}>
          ※ 적용: {SUNLIGHT_RULE_META[s.sunlightRule ?? "legacy"].basis} · {SUNLIGHT_RULE_META[s.sunlightRule ?? "legacy"].effective}. 기준일 {s.ruleBasisDate ?? input.reviewDate}({s.ruleBasisIsPermitDate ? "허가·신고 신청 예정일" : "검토일"}) — 개정 규정은 2026.11.12 이후 신청분부터 적용(부칙). 정북단면 모식도입니다.
          {s.groundParkingArea > 0
            ? s.isReducingFloor1
              ? " 1층 남측 일부에 필로티 주차(시행령 119조 1항 2호 가목 4, 건축면적 제외)를 음영 표시."
              : " 1층 남측 일부에 벽체식 지상주차(건축면적 산입)를 음영 표시."
            : ""}
        </PdfText>
      </View>

        </>
      ) : (
        <PdfText style={[styles.smallText, { marginTop: 10 }]}>
          (c) 정북 일조 높이제한 — {s.zoneName}은 적용 대상(전용·일반주거지역)이 아니어서 단면도를 싣지 않습니다. 가로구역별 최고높이·지구단위계획 높이 기준은 별도 확인 대상입니다.
        </PdfText>
      )}

      {s.sunlightApplied && s.sunlightCompare ? (
        <SunlightCompareBlock s={s} brand={brand} />
      ) : null}

      {input.visualization3D ? (
        <View style={{ marginTop: 14 }}>
          {/* 기본 뷰와 남·북 정면을 별도 wrap 블록으로 — 한 덩어리(≈330pt)로 묶으면
              앞 페이지 하단이 통째로 비어 인쇄 시 공백이 컸다 (2026-09-04) */}
          <View wrap={false}>
            <PdfText style={styles.h3} minPresenceAhead={100}>(d) 3D 매스 시각화</PdfText>
            <View
              style={{
                backgroundColor: COLORS.CREAM,
                padding: 10,
                borderWidth: 1,
                borderColor: COLORS.LIGHT_GRAY,
                borderStyle: "solid",
              }}
            >
              <PdfImage
                src={input.visualization3D}
                style={{ width: "100%", height: 130, objectFit: "contain" }}
              />
            </View>
          </View>
          <View
            wrap={false}
            style={{
              backgroundColor: COLORS.CREAM,
              paddingHorizontal: 10,
              paddingBottom: 10,
              borderWidth: 1,
              borderTopWidth: 0,
              borderColor: COLORS.LIGHT_GRAY,
              borderStyle: "solid",
            }}
          >
            {input.visualization3DViews?.south || input.visualization3DViews?.north ? (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                {input.visualization3DViews?.south ? (
                  <View style={{ flex: 1 }}>
                    <PdfImage
                      src={input.visualization3DViews.south}
                      style={{ width: "100%", height: 105, objectFit: "contain", borderRadius: 2 }}
                    />
                    <PdfText style={[styles.muted, { marginTop: 3, textAlign: "center" }]}>남측(도로) 정면 — 층 번호·높이</PdfText>
                  </View>
                ) : null}
                {input.visualization3DViews?.north ? (
                  <View style={{ flex: 1 }}>
                    <PdfImage
                      src={input.visualization3DViews.north}
                      style={{ width: "100%", height: 105, objectFit: "contain", borderRadius: 2 }}
                    />
                    <PdfText style={[styles.muted, { marginTop: 3, textAlign: "center" }]}>{sunlightSectionAllowed(s) ? "북측 정면 — 정북 일조사선 후퇴(계단)" : "북측 정면"}</PdfText>
                  </View>
                ) : null}
              </View>
            ) : null}
            <PdfText style={[styles.muted, { marginTop: 6 }]}>
              ※ 입력된 건폐율·용적률{sunlightSectionAllowed(s) ? "·정북 일조사선" : ""}·주차 배치가 모두 반영된 3D 매스(치수 m·층 번호 표기). 회전 가능한 인터랙티브 버전은 시뮬레이터에서 확인하세요.
            </PdfText>
          </View>
        </View>
      ) : null}
    <View style={{ height: 18 }} /></>
  );
}

/* ─────────────────────── 주차장 계획 (전용 페이지) ─────────────────────── */

function ParkingPage({ input, brand }: { input: ReportInputs; brand: BrandConfig }) {
  const sec = useSec();
  const s = input.scale;
  const raw = s.parkingRawSpaces ?? s.parkingSpaces;
  const tips = buildReductionTips({
    spaces: s.parkingSpaces,
    rawSpaces: raw,
    usageLabel: s.usageLabel ?? "선택 용도",
    facilityAreaSqm: s.legalFloorArea,
    groundSpaces: s.groundSpaces,
    floor1IndoorSqm: s.floor1Indoor,
  });
  const compact = compactCarAllowance(s.parkingSpaces);
  const totalParkingArea = s.parkingSpaces * s.parkingUnitArea;

  const placeLabel =
    s.parkingPlacement === "basement"
      ? "전량 지하"
      : s.parkingPlacement === "above"
        ? "전량 지상"
        : s.parkingPlacement === "mixed"
          ? "지상·지하 혼합"
          : "미배치";

  // B6 — 조건부 섹션(1층 잠식 영향)이 빠지면 뒤 섹션의 알파벳이 밀린다. 고정 문자 대신
  // 공통 카운터로 동적 부여(비용 페이지의 (b)/(c) 패턴과 동일).
  const letters = ["a", "b", "c", "d", "e", "f"];
  let letterIdx = 0;
  const nextLetter = () => `(${letters[letterIdx++]})`;
  const letterParking = nextLetter();
  const letterFloor1 = s.groundParkingArea > 0 ? nextLetter() : null;
  const letterReduce = nextLetter();

  return (
    <>
      <View wrap={false}>
      <PdfText style={styles.h2} minPresenceAhead={170}>{sec.parking}. 주차장 계획</PdfText>

      {/* (a) 산정 결과 */}
      <PdfText style={styles.h3} minPresenceAhead={100}>{letterParking} 법정 주차대수 산정</PdfText>
      <TwoColTable
        rows={[
          ["적용 용도", s.usageLabel ?? "—"],
          ["산정 기준", s.parkingBasisLabel ?? "용도별 설치기준 (별표1)"],
          ["산정 근거(법령)", s.parkingLegalBasis ?? "주차장법 시행령 별표1 (근거 확인 필요)"],
          ["산정 모수(시설면적)", `${formatArea(s.legalFloorArea)} — 용적률 산정 연면적 상한 기준(주차시설 면적 제외 여부 확인 필요)`],
          ["법정 필요 대수", s.parkingRoundingNote ?? `${raw.toFixed(2)}대 → ${s.parkingSpaces}대`],
          ["1대당 계획면적 (계수)", `${s.parkingUnitArea}㎡ (주차칸 약 12.5㎡ + 차로·회전 — 화면과 같은 계수)`],
          ["주차장 계획면적 (계수 추정)", formatArea(totalParkingArea)],
          ["배치 가정", `${placeLabel} — 지상 ${s.groundSpaces}대 / 지하 ${s.basementSpaces}대${s.basementLevels && s.basementLevels.length ? ` → 지하 ${s.basementLevels.length}개 층` : ""}`],
          ["실제 배치 검토", "미실시 — 램프·차로·회전반경·기둥·코어·설비 공간 미반영"],
        ]}
      />
      </View>

      {/* (b) 1층 영향 */}
      {letterFloor1 ? (
        <>
          <PdfText style={[styles.h3, { marginTop: 14 }]} minPresenceAhead={100}>{letterFloor1} 1층 잠식 영향</PdfText>
          <TwoColTable
            rows={[
              ["1층 지상주차 점유", formatArea(s.groundParkingArea)],
              [
                s.floor1Indoor <= 0 ? "1층 영업 가능 면적" : "1층 영업 가능 면적",
                s.floor1Indoor <= 0
                  ? "0㎡ — 1층 전체가 주차"
                  : formatArea(s.floor1Indoor),
              ],
              ["구조 방식", s.pilotiMode ? "필로티 (연면적 제외)" : "벽체식 (연면적 산입)"],
            ]}
          />
        </>
      ) : null}

      <ParkingExplainBox input={input} brand={brand} />

      {/* (c) 절감 검토 */}
      <PdfText style={[styles.h3, { marginTop: 16 }]} minPresenceAhead={100}>
        {letterReduce} 주차대수·주차면적 줄이는 방법 — 법령 검토 체크리스트
      </PdfText>
      <PdfText
        style={{
          fontSize: 9,
          lineHeight: 1.5,
          color: COLORS.GRAY,
          fontFamily: "Pretendard",
          marginBottom: 8,
        }}
      >
        주차는 1층 영업면적과 지하 공사비를 동시에 잡아먹는 항목입니다. 아래는 현행 주차장법
        체계에서 검토할 수 있는 수단을 우선순위로 정리한 것입니다. 조례 위임 사항이 많아
        최종 적용은 관할 시·군·구 확인이 필요합니다.
      </PdfText>

      {tips.slice(0, 6).map((t) => (
        <View
          key={t.id}
          wrap={false}
          style={{
            marginBottom: 7,
            padding: 8,
            backgroundColor: t.status === "applicable" ? COLORS.CREAM : "#FFFFFF",
            borderWidth: 1,
            borderColor: t.status === "applicable" ? brand.primaryColor : COLORS.LIGHT_GRAY,
            borderStyle: "solid",
            borderRadius: 3,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
            <PdfText
              style={{
                fontSize: 7.5,
                fontWeight: 700,
                color: t.status === "applicable" ? "#FFFFFF" : COLORS.GRAY,
                backgroundColor:
                  t.status === "applicable" ? brand.primaryColor : COLORS.LIGHT_GRAY,
                paddingVertical: 1.5,
                paddingHorizontal: 5,
                borderRadius: 2,
                fontFamily: "Pretendard",
                marginRight: 5,
              }}
            >
              {TIP_STATUS_LABEL[t.status]}
            </PdfText>
            <PdfText
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: COLORS.DARK,
                fontFamily: "Pretendard",
                flex: 1,
              }}
            >
              {t.title}
            </PdfText>
          </View>
          <PdfText
            style={{
              fontSize: 8.5,
              lineHeight: 1.5,
              color: COLORS.GRAY,
              fontFamily: "Pretendard",
              marginBottom: 2,
            }}
          >
            {t.basis}
          </PdfText>
          <PdfText
            style={{
              fontSize: 9,
              lineHeight: 1.55,
              color: COLORS.DARK,
              fontFamily: "Pretendard",
            }}
          >
            {t.action}
          </PdfText>
          {t.effect ? (
            <PdfText
              style={{
                fontSize: 9,
                lineHeight: 1.5,
                color: brand.primaryColor,
                fontWeight: 700,
                fontFamily: "Pretendard",
                marginTop: 2,
              }}
            >
              → {t.effect}
            </PdfText>
          ) : null}
        </View>
      ))}

      {compact > 0 ? (
        <View
          wrap={false}
          style={{
            marginTop: 4,
            padding: 9,
            backgroundColor: COLORS.CREAM,
            borderLeftWidth: 3,
            borderLeftColor: brand.primaryColor,
            borderLeftStyle: "solid",
          }}
        >
          <PdfText
            style={{
              fontSize: 9.5,
              lineHeight: 1.6,
              color: COLORS.DARK,
              fontFamily: "Pretendard",
            }}
          >
            <PdfText style={{ fontWeight: 700, color: brand.primaryColor }}>
              가장 먼저 볼 것 ·{" "}
            </PdfText>
            법정 {s.parkingSpaces}대 중 <PdfText style={{ fontWeight: 700 }}>{compact}대</PdfText>
            까지는 경형 전용구획으로 채워도 설치기준을 충족한 것으로 봅니다(별표1 비고 12).
            조례 협의 없이 설계만으로 적용되는 유일한 수단이라, 1층 면적이 빠듯할 때 가장 먼저
            검토합니다.
          </PdfText>
        </View>
      ) : null}

      <PdfText
        style={{
          fontSize: 8,
          lineHeight: 1.5,
          color: COLORS.GRAY,
          fontFamily: "Pretendard",
          marginTop: 10,
        }}
      >
        ※ 기준일 2026-08-28 시행 법령(주차장법·시행령·별표1) 기준입니다. 부설주차장 설치기준은
        지자체 조례가 시행령 기준의 1/2 범위에서 강화·완화할 수 있어(영 제6조 제2항), 실제
        적용 대수는 관할 조례 확인 후 확정해야 합니다.
      </PdfText>

    <View style={{ height: 18 }} /></>
  );
}

/** 개정 전·후 비교 — 층별 이격 + 실제 연면적 차이. 시뮬레이터 [개정 전 보기] 카드와 같은 표. */
function SunlightCompareBlock({
  s,
  brand,
}: {
  s: ReportInputs["scale"];
  brand: BrandConfig;
}) {
  const c = s.sunlightCompare!;
  const diff = c.revisedActualFloorArea - c.legacyActualFloorArea;
  const gained = c.byFloor.filter((r) => r.gainM > 0.01);
  return (
    <View style={{ marginTop: 12 }}>
      <PdfText style={styles.h3}>(c-1) 일조 규칙 개정 전·후 비교 — 무엇이 좋아졌나</PdfText>
      <View wrap={false} style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
        {[
          { label: "개정 전 실제 연면적", value: formatArea(c.legacyActualFloorArea), sub: `손실 ${c.legacyLoss.toFixed(1)}%`, accent: false },
          { label: "개정 후 실제 연면적", value: formatArea(c.revisedActualFloorArea), sub: `손실 ${c.revisedLoss.toFixed(1)}%`, accent: true },
          {
            label: "차이 (개정 후 − 전)",
            value: `${diff >= 0 ? "+" : ""}${Math.round(diff).toLocaleString("ko-KR")}㎡`,
            sub: `${diff >= 0 ? "+" : ""}${(diff / 3.305785).toFixed(1)}평 · ${gained.length > 0 ? gained.map((r) => `${r.floor}F`).join("·") + " 이격 완화" : "차이 없음"}`,
            accent: diff > 0,
          },
        ].map((k) => (
          <View
            key={k.label}
            style={{
              flex: 1,
              padding: 8,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: k.accent ? brand.primaryColor : COLORS.LIGHT_GRAY,
              backgroundColor: k.accent ? COLORS.CREAM : "#FFFFFF",
            }}
          >
            <PdfText style={{ fontSize: 8, color: COLORS.GRAY, marginBottom: 2 }}>{k.label}</PdfText>
            <PdfText style={{ fontSize: 12, fontWeight: 700, color: k.accent ? brand.primaryColor : COLORS.DARK }}>{k.value}</PdfText>
            <PdfText style={{ fontSize: 7.5, color: COLORS.GRAY, marginTop: 2 }}>{k.sub}</PdfText>
          </View>
        ))}
      </View>
      <View style={{ borderWidth: 1, borderColor: COLORS.LIGHT_GRAY, borderStyle: "solid" }}>
        <DetailRow>
          <DetailCell header text="층" width="12%" align="center" />
          <DetailCell header text="층 상단 높이" width="22%" align="center" />
          <DetailCell header text="개정 전 이격" width="22%" align="center" />
          <DetailCell header text="개정 후 이격" width="22%" align="center" />
          <DetailCell header text="완화" width="22%" align="center" />
        </DetailRow>
        {c.byFloor.map((r, i) => (
          <DetailRow key={r.floor} last={i === c.byFloor.length - 1}>
            <DetailCell text={`${r.floor}F`} width="12%" align="center" />
            <DetailCell text={`${r.heightM.toFixed(1)}m`} width="22%" align="center" />
            <DetailCell text={`${r.legacyM.toFixed(2)}m`} width="22%" align="center" />
            <DetailCell text={`${r.revisedM.toFixed(2)}m`} width="22%" align="center" bold={r.gainM > 0.01} />
            <DetailCell text={r.gainM > 0.01 ? `−${r.gainM.toFixed(2)}m` : "—"} width="22%" align="center" bold={r.gainM > 0.01} />
          </DetailRow>
        ))}
      </View>
      <PdfText style={[styles.muted, { marginTop: 4 }]}>
        ※ 개정 전 = 시행령 제86조①(10m 이하 1.5m · 초과 h/2). 개정 후 = 건축법 제61조①(2026.8.11 개정 · 11.12 시행 — 10m 이하 1.5m · 10~17m 5m 고정 · 17m 초과 h/2). 17m에서 두 규칙이 만나므로 차이는 10~17m 구간(통상 3~4층)에서만 생기며, 개정 후가 불리해지는 높이는 없습니다. 조례가 더 큰 거리를 정할 수 있으니 관할 확인 필요.
       부칙 제4조(적용례): 개정 기준은 2026.11.12 이후 건축허가 신청(건축위원회 심의 신청 포함)·건축신고분부터 적용되고, 그 전 접수분은 개정 전 기준입니다. 조례로 더 큰 이격을 정할 수 있어 1.5m·5m는 최소치입니다.</PdfText>
    </View>
  );
}

function SunlightDiagram({
  sunlightLoss,
  buildingArea,
  groundParkingArea,
  showParking,
  heightM,
  floorHeightM,
  rule,
}: {
  sunlightLoss: number;
  buildingArea: number;
  groundParkingArea: number;
  showParking: boolean;
  heightM: number;
  floorHeightM: number;
  rule: SunlightRule;
}) {
  // 정북단면 모식도 — 남(좌) → 북(우). 정북 인접 대지경계선 x=400, 지면 y=180.
  // 스케일은 건물 높이와 17m 중 큰 쪽이 110px에 들어오게 잡는다.
  const baseY = 180;
  const xNorth = 400;
  const xSouth = 90;
  const topH = Math.max(heightM, 17);
  const sc = 110 / topH; // px per m
  const floors = Math.min(40, Math.max(1, Math.ceil(heightM / floorHeightM)));

  const prof = envelopeProfile(Math.max(heightM, 17) + 1, rule);
  const envPath = prof
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xNorth - p.d * sc} ${baseY - p.h * sc}`)
    .join(" ");
  const legacyPath =
    rule === "revised"
      ? envelopeProfile(Math.max(heightM, 17) + 1, "legacy")
          .map((p, i) => `${i === 0 ? "M" : "L"} ${xNorth - p.d * sc} ${baseY - p.h * sc}`)
          .join(" ")
      : null;

  // 1F 주차 영역: 남측(좌측) 끝부터 fraction × 1층 폭
  const fraction =
    buildingArea > 0 && showParking
      ? Math.min(1, Math.max(0, groundParkingArea / buildingArea))
      : 0;
  const f1Right = xNorth - requiredSetbackM(floorHeightM, rule) * sc;
  const f1H = Math.min(floorHeightM, heightM) * sc;
  const parkW = fraction * (f1Right - xSouth);

  return (
    <Svg width="100%" height={140} viewBox="0 0 500 200">
      <Path d="M 50 180 L 450 180" stroke={COLORS.DARK} strokeWidth={1.5} />
      {/* 경계선 */}
      <Path
        d={`M ${xNorth} ${baseY + 6} L ${xNorth} ${baseY - 118}`}
        stroke={COLORS.GRAY}
        strokeWidth={0.8}
        strokeDasharray="2 2"
      />
      {/* 층별 매스 — 층 상단 높이 기준 이격 */}
      {Array.from({ length: floors }).map((_, i) => {
        const fH = (i + 1) * floorHeightM;
        const portion = Math.min(1, heightM / floorHeightM - i);
        if (portion <= 0) return null;
        const right = xNorth - requiredSetbackM(fH, rule) * sc;
        const h = floorHeightM * portion * sc;
        const y = baseY - i * floorHeightM * sc - h;
        if (right <= xSouth) return null;
        return (
          <Rect
            key={i}
            x={xSouth}
            y={y}
            width={right - xSouth}
            height={h}
            fill={COLORS.CORAL}
            stroke={COLORS.CORAL_DARK}
            strokeWidth={0.8}
          />
        );
      })}
      {fraction > 0 && parkW > 0 && (
        <>
          <Rect
            x={xSouth}
            y={baseY - f1H}
            width={parkW}
            height={f1H}
            fill={COLORS.LIGHT_GRAY}
            stroke="#993C1D"
            strokeWidth={1.2}
            strokeDasharray="3 2"
          />
          <SvgText
            x={xSouth + parkW / 2}
            y={baseY - f1H / 2 + 3}
            textAnchor="middle"
            style={{ fontFamily: "Pretendard", fontSize: 8, fontWeight: 700, color: "#993C1D" }}
          >
            1층 주차
          </SvgText>
        </>
      )}
      {legacyPath && (
        <Path d={legacyPath} stroke={COLORS.GRAY} strokeWidth={0.8} strokeDasharray="2 2" fill="none" />
      )}
      <Path d={envPath} stroke={COLORS.CORAL_DARK} strokeWidth={1.2} strokeDasharray="4 3" fill="none" />
      <SvgText x={20} y={193} style={{ fontFamily: "Pretendard", fontSize: 9, color: COLORS.GRAY }}>
        남
      </SvgText>
      <SvgText x={475} y={193} style={{ fontFamily: "Pretendard", fontSize: 9, color: COLORS.GRAY }}>
        북
      </SvgText>
      <SvgText
        x={xNorth + 4}
        y={baseY - 10 * sc + 3}
        style={{ fontFamily: "Pretendard", fontSize: 7, color: COLORS.GRAY }}
      >
        10m
      </SvgText>
      {rule === "revised" && (
        <SvgText
          x={xNorth + 4}
          y={baseY - 17 * sc + 3}
          style={{ fontFamily: "Pretendard", fontSize: 7, color: COLORS.GRAY }}
        >
          17m
        </SvgText>
      )}
      <SvgText
        x={xSouth}
        y={45}
        style={{ fontFamily: "Pretendard", fontSize: 10, fontWeight: 700, color: COLORS.CORAL_DARK }}
      >
        {`일조권 손실 ${sunlightLoss.toFixed(1)}% · ${SUNLIGHT_RULE_META[rule].short}`}
      </SvgText>
      {legacyPath && (
        <SvgText
          x={xSouth}
          y={57}
          style={{ fontFamily: "Pretendard", fontSize: 7.5, color: COLORS.GRAY }}
        >
          회색 점선 = 개정 전 사선 · 코랄 점선 = 개정 후 사선
        </SvgText>
      )}
    </Svg>
  );
}

/* ─────────────────────────── 3. 비용·부담금 ─────────────────────────── */
function CostPage({
  input,
  brand,
}: {
  input: ReportInputs;
  brand: BrandConfig;
}) {
  const sec = useSec();
  const c = input.cost;
  const perPy = c.totalArea > 0 ? c.total / c.totalArea : 0;

  const items: {
    label: string;
    value: number;
    color: string;
  }[] = [
    { label: "지상 공사비", value: c.aboveCost, color: COLORS.ABOVE },
    { label: "지하층 공사비", value: c.basementCost, color: COLORS.BASEMENT },
    { label: "주차장 설치비", value: c.parkingCost, color: COLORS.PARKING },
    { label: "부대비", value: c.softCost, color: COLORS.SOFT },
    ...(c.farmEnabled
      ? [{ label: "농지보전부담금", value: c.farmCost, color: COLORS.FARM }]
      : []),
    ...(c.forestEnabled
      ? [
          {
            label: "대체산림자원조성비",
            value: c.forestCost,
            color: COLORS.FOREST,
          },
        ]
      : []),
    ...(c.devEnabled
      ? [{ label: "개발부담금", value: c.devCharge, color: COLORS.DEV }]
      : []),
  ].filter((i) => i.value > 0);

  return (
    <>

      <PdfText style={styles.h2} minPresenceAhead={170}>{sec.cost}. 비용·부담금 산정</PdfText>
      <View style={styles.h2Underline} />

      <PdfText style={styles.h3} minPresenceAhead={100}>(a) 기본 건축비</PdfText>
      <TwoColTable
        rows={[
          [
            "지상 공사비",
            `${formatPyeongAsArea(c.abovePyeong)} × ${c.aboveUnit}만원/평 = ${fmtEok(c.aboveCost)}`,
          ],
          [
            "지하층 공사비",
            `${formatPyeongAsArea(c.basementPyeong)} × ${c.aboveUnit}만원 × ${c.basementPremium}% = ${fmtEok(c.basementCost)}`,
          ],
          ["주차장 설치비 (지하층 공사비 외 대수)", fmtEok(c.parkingCost)],
          ["설계·감리·인입·예비비", fmtEok(c.softCost)],
        ]}
      />
      {c.linkNotes && c.linkNotes.length > 0 && (
        <PdfText style={[styles.smallText, { marginTop: 4 }]}>※ 수량 연결: {c.linkNotes.join(" · ")}</PdfText>
      )}

      {(c.farmEnabled || c.forestEnabled || c.devEnabled) && (
        <>
          <PdfText style={[styles.h3, { marginTop: 14 }]} minPresenceAhead={100}>(b) 부담금 (활성 항목)</PdfText>
          <TwoColTable
            rows={[
              ...(c.farmEnabled
                ? ([["농지보전부담금", fmtEok(c.farmCost)]] as [string, string][])
                : []),
              ...(c.forestEnabled
                ? ([
                    ["대체산림자원조성비", fmtEok(c.forestCost)],
                  ] as [string, string][])
                : []),
              ...(c.devEnabled
                ? ([["개발부담금", fmtEok(c.devCharge)]] as [string, string][])
                : []),
            ]}
          />
        </>
      )}

      <PdfText style={[styles.h3, { marginTop: 14 }]} minPresenceAhead={170}>{(c.farmEnabled || c.forestEnabled || c.devEnabled) ? "(c)" : "(b)"} 비용 분해 차트</PdfText>
      <View
        wrap={false}
        style={{
          borderWidth: 1,
          borderColor: COLORS.LIGHT_GRAY,
          borderStyle: "solid",
          padding: 10,
        }}
      >
        <CostBarChart items={items} />
      </View>

      <View
        wrap={false}
        style={{
          backgroundColor: brand.primaryColor,
          padding: 16,
          marginTop: 14,
        }}
      >
        <PdfText
          style={{
            color: COLORS.CORAL_LIGHT,
            fontSize: 10,
            fontFamily: "Pretendard",
          }}
        >
          건축·부대비 + 부담금 소계 (토지비·금융비 제외)
        </PdfText>
        <PdfText
          style={{
            color: "white",
            fontSize: 26,
            fontWeight: 700,
            marginTop: 4,
            fontFamily: "Pretendard",
          }}
        >
          {fmtEok(c.total)}
        </PdfText>
        <PdfText
          style={{
            color: COLORS.CORAL_LIGHT,
            fontSize: 9,
            marginTop: 4,
            fontFamily: "Pretendard",
          }}
        >
          연면적 평당 {c.totalArea > 0 ? fmtWon(perPy) : "0원"} · 총 {formatPyeongAsArea(c.totalArea)}
        </PdfText>
      </View>
    <View style={{ height: 18 }} /></>
  );
}

function CostBarChart({
  items,
}: {
  items: { label: string; value: number; color: string }[];
}) {
  if (items.length === 0) {
    return (
      <Svg width="100%" height={40} viewBox="0 0 500 40">
        <SvgText
          x={250}
          y={24}
          textAnchor="middle"
          style={{ fontFamily: "Pretendard", fontSize: 10, color: COLORS.GRAY }}
        >
          표시할 비용 항목이 없습니다.
        </SvgText>
      </Svg>
    );
  }
  // D5 — 막대가 너무 작던 원인 2가지: ① viewBox 높이(h)와 실제 렌더 높이(h*0.55)가 달라
  // 세로로 짜부라져 있었고 ② 각 행을 <View>(react-pdf SVG 밖 레이아웃 노드)로 감싸
  // "SVG node of type VIEW is not currently supported" 경고와 함께 일부가 비정상 렌더됐다.
  // <View> 대신 SVG 전용 그룹(Fragment, 추가 DOM 없음)을 쓰고 viewBox=실제 높이로 맞춘다.
  const max = Math.max(...items.map((i) => i.value));
  const total = items.reduce((sum, i) => sum + i.value, 0);
  const rowH = 30;
  const top = 10;
  const h = top + items.length * rowH + 6;
  return (
    <Svg width="100%" height={h} viewBox={`0 0 500 ${h}`}>
      {items.map((it, idx) => {
        const y = top + idx * rowH;
        const bar = max > 0 ? (it.value / max) * 260 : 0;
        const pct = total > 0 ? Math.round((it.value / total) * 100) : 0;
        return (
          <Fragment key={idx}>
            <SvgText
              x={5}
              y={y + 15}
              style={{
                fontFamily: "Pretendard",
                fontSize: 10,
                color: COLORS.DARK,
              }}
            >
              {it.label}
            </SvgText>
            <Rect x={108} y={y} width={260} height={20} fill={COLORS.LIGHT_GRAY} rx={3} />
            <Rect x={108} y={y} width={bar} height={20} fill={it.color} rx={3} />
            <SvgText
              x={108 + bar + 4}
              y={y + 14}
              style={{
                fontFamily: "Pretendard",
                fontSize: 10,
                color: COLORS.DARK,
              }}
            >
              {`${fmtEok(it.value)} (${pct}%)`}
            </SvgText>
          </Fragment>
        );
      })}
    </Svg>
  );
}

/* ─────────────────────────── 4. AI 종합 분석 ─────────────────────────── */
function AIPage({
  input,
  analysis,
  brand,
}: {
  input: ReportInputs;
  analysis: AIAnalysis;
  brand: BrandConfig;
}) {
  const sec = useSec();
  return (
    <>

      <PdfText style={styles.h2} minPresenceAhead={170}>{sec.ai}. 부동산 IT 전문 종합 분석</PdfText>
      <View style={styles.h2Underline} />

      <PdfText style={styles.h3} minPresenceAhead={100}>사업성 종합 평가</PdfText>
      <View
        wrap={false}
        style={{
          borderLeftWidth: 3,
          borderLeftColor: brand.primaryColor,
          borderLeftStyle: "solid",
          backgroundColor: COLORS.CORAL_LIGHT,
          padding: 12,
        }}
      >
        <PdfText style={{ ...styles.body, fontFamily: "Pretendard" }}>
          {analysis.summary}
        </PdfText>
      </View>

      <PdfText style={[styles.h3, { marginTop: 14 }]} minPresenceAhead={100}>핵심 리스크 3가지</PdfText>
      {analysis.risks.map((r, i) => (
        <NumberedRow key={`r-${i}`} num={i + 1} text={r} accent={brand.primaryColor} />
      ))}

      <PdfText style={[styles.h3, { marginTop: 14 }]} minPresenceAhead={100}>추천 검토 사항 3가지</PdfText>
      {analysis.recommendations.map((r, i) => (
        <NumberedRow key={`rec-${i}`} num={i + 1} text={r} accent={COLORS.CORAL} />
      ))}

      <PdfText style={[styles.h3, { marginTop: 14 }]} minPresenceAhead={100}>평당 사업비 적정성</PdfText>
      <View
        wrap={false}
        style={{
          borderLeftWidth: 3,
          borderLeftColor: COLORS.GRAY,
          borderLeftStyle: "solid",
          backgroundColor: COLORS.CREAM,
          padding: 12,
        }}
      >
        <PdfText style={{ ...styles.body, fontFamily: "Pretendard" }}>
          {analysis.costAdequacy}
        </PdfText>
      </View>

      <PdfText style={[styles.h3, { marginTop: 14 }]} minPresenceAhead={100}>다음 단계 권고</PdfText>
      <View wrap={false}>
        {analysis.nextSteps.map((step, i) => (
          <View
            key={`n-${i}`}
            style={{
              flexDirection: "row",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <PdfText
              style={{
                fontSize: 10,
                color: brand.primaryColor,
                fontFamily: "Pretendard",
              }}
            >
              □
            </PdfText>
            <PdfText
              style={{ ...styles.body, flex: 1, fontFamily: "Pretendard" }}
            >
              {step}
            </PdfText>
          </View>
        ))}
      </View>
    <View style={{ height: 18 }} /></>
  );
}

function NumberedRow({
  num,
  text,
  accent,
}: {
  num: number;
  text: string;
  accent: string;
}) {
  return (
    <View
      wrap={false}
      style={{
        flexDirection: "row",
        gap: 8,
        marginBottom: 6,
        alignItems: "flex-start",
      }}
    >
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: accent,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <PdfText
          style={{ fontSize: 9, color: "white", fontWeight: 700, fontFamily: "Pretendard" }}
        >
          {num}
        </PdfText>
      </View>
      <PdfText style={{ ...styles.body, flex: 1, fontFamily: "Pretendard" }}>
        {text}
      </PdfText>
    </View>
  );
}

/* ──────────────── 용도별 분양가·임대료 (선택 수록) ──────────────── */
function UsePricesPage({
  input,
  brand,
}: {
  input: ReportInputs;
  brand: BrandConfig;
}) {
  const sec = useSec();
  const up = input.usePrices;
  if (!up) return null;

  const priceRow = (r: {
    label: string;
    manPerPy: number;
    count: number;
    areaBasis: string;
    basis: string;
  }): [string, string] => [
    r.label,
    r.count > 0
      ? `${r.manPerPy.toLocaleString("ko-KR")}만원/평 (${r.areaBasis} · ${r.count}건 · ${r.basis})`
      : "주변 실거래 사례 없음",
  ];

  return (
    <>

      <PdfText style={styles.h2} minPresenceAhead={170}>{sec.usePrices}. 용도별 분양가·임대료 참고표</PdfText>
      <View style={styles.h2Underline} />
      <PdfText style={[styles.muted, { marginBottom: 10 }]}>
        국토교통부 실거래가 공개시스템 · 최근 {up.periodMonths}개월 ㎡당 중앙값의
        평당 환산 — 분양가·임대료 설정 참고용 (감정평가 아님)
      </PdfText>

      <PdfText style={styles.h3} minPresenceAhead={100}>(a) 용도별 분양가 (매매 실거래)</PdfText>
      <TwoColTable rows={up.sale.map(priceRow)} />

      <PdfText style={[styles.h3, { marginTop: 14 }]} minPresenceAhead={100}>
        (b) 용도별 임대료 (월세 실거래 · 평당 월세)
      </PdfText>
      <TwoColTable rows={up.rentMonthly.map(priceRow)} />

      <PdfText style={[styles.h3, { marginTop: 14 }]} minPresenceAhead={100}>(c) 상업 층별 매매</PdfText>
      <TwoColTable
        rows={up.commercial.map((r) => [
          r.label,
          r.count > 0
            ? `${r.manPerPy.toLocaleString("ko-KR")}만원/평 (건물면적 기준 · ${r.count}건 · ${r.basis})`
            : "주변 실거래 사례 없음",
        ])}
      />

      <PdfText style={[styles.muted, { marginTop: 10 }]}>
        ※ 전용면적 기준 단가는 공급면적 환산 시 전용률(통상 70~80%)만큼 낮아집니다.
        상업·업무 임대료는 실거래 수집 한계가 있어 한국부동산원 지역별 임대료
        통계를 함께 확인하세요.
      </PdfText>
    <View style={{ height: 18 }} /></>
  );
}

/* ─────────────────────────── 5. 부록 ─────────────────────────── */
/* ─────────────────────────── 4. 사업성 분석 ─────────────────────────── */
function ProfitPage({
  input,
  brand,
}: {
  input: ReportInputs;
  brand: BrandConfig;
}) {
  const sec = useSec();
  const p = input.profit;
  if (!p) return null;
  // C1 — 토지가가 초기 기본값이라 buildInput이 [입력/공시지가/실거래] 시나리오를 함께 계산해
  // 뒀으면(landScenarios), IRR·ROE 큰 숫자 카드 대신 시나리오 비교표를 보여준다.
  const landGate = Boolean(p.landScenarios && p.landScenarios.length > 1);

  const irrColor =
    p.irr < 0 ? "#DC2626" : p.irr < 10 ? COLORS.GRAY : brand.primaryColor;
  const methodLabel =
    p.repaymentMethod === "bullet"
      ? "만기일시"
      : p.repaymentMethod === "amortized"
        ? "원리금균등"
        : "1년 거치";
  const modelLabel =
    p.revenueModel === "sales"
      ? "분양"
      : p.revenueModel === "rent"
        ? "임대"
        : "혼합";

  return (
    <>

      <View wrap={false}>
      <PdfText style={styles.h2} minPresenceAhead={170}>{sec.profit}. 사업성 분석</PdfText>
      <View style={styles.h2Underline} />

      <PdfText style={styles.h3} minPresenceAhead={100}>(a) 총 사업비 구성</PdfText>
      <View
        wrap={false}
        style={{
          borderWidth: 1,
          borderColor: COLORS.LIGHT_GRAY,
          borderStyle: "solid",
        }}
      >
        {[
          ["토지비 (취득세·등기 등 부대비 포함)", p.landCost],
          ["건축비 (지상+지하+주차+부대)", p.buildingCost],
          ["부담금 합계 (농지·산지·개발)", p.feesTotal],
          [`대출 이자 (사업기간 ${p.projectDurationMonths}개월)`, p.loanInterest],
        ].map(([label, value], i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              borderBottomWidth: 1,
              borderBottomColor: COLORS.LIGHT_GRAY,
              borderBottomStyle: "solid",
              paddingVertical: 6,
              paddingHorizontal: 10,
            }}
          >
            <PdfText
              style={{
                flex: 2,
                fontSize: 10,
                fontFamily: "Pretendard",
                color: COLORS.GRAY,
              }}
            >
              {label as string}
            </PdfText>
            <PdfText
              style={{
                flex: 1,
                fontSize: 10,
                textAlign: "right",
                fontWeight: 500,
                fontFamily: "Pretendard",
              }}
            >
              {fmtEok(value as number)}
            </PdfText>
          </View>
        ))}
        <View
          style={{
            flexDirection: "row",
            paddingVertical: 8,
            paddingHorizontal: 10,
            backgroundColor: COLORS.CORAL_LIGHT,
          }}
        >
          <PdfText
            style={{
              flex: 2,
              fontSize: 11,
              fontWeight: 700,
              color: brand.primaryColor,
              fontFamily: "Pretendard",
            }}
          >
            토지비 포함 총사업비
          </PdfText>
          <PdfText
            style={{
              flex: 1,
              fontSize: 12,
              fontWeight: 700,
              textAlign: "right",
              color: brand.primaryColor,
              fontFamily: "Pretendard",
            }}
          >
            {fmtEok(p.totalProjectCost)}
          </PdfText>
        </View>
      </View>
      </View>

      <PdfText style={[styles.h3, { marginTop: 14 }]} minPresenceAhead={100}>(b) 자금 조달 구조</PdfText>
      <View wrap={false} style={{ flexDirection: "row", gap: 8 }}>
        <ProfitMiniCard
          label="자기자본 (Equity)"
          value={fmtEok(p.equity)}
          sub={`총 사업비의 ${((p.equity / Math.max(1, p.totalProjectCost)) * 100).toFixed(0)}%`}
        />
        <ProfitMiniCard
          label={`대출 (LTC ${(p.ltcPct ?? p.ltvRatio).toFixed(0)}% · 이자 제외 사업비 대비)`}
          value={fmtEok(p.loanAmount)}
          sub={`연 ${p.annualInterestRate}% · ${p.loanPeriodYears}년 · ${methodLabel} · 총사업비(이자포함) 대비 ${((p.loanAmount / Math.max(1, p.totalProjectCost)) * 100).toFixed(0)}%`}
        />
      </View>

      <PdfText style={[styles.h3, { marginTop: 14 }]} minPresenceAhead={100}>(c) 예상 수익</PdfText>
      <View
        wrap={false}
        style={{
          padding: 12,
          backgroundColor: COLORS.CREAM,
        }}
      >
        <PdfText style={{ fontSize: 10, fontFamily: "Pretendard" }}>
          {modelLabel} 모델
        </PdfText>
        <PdfText
          style={{
            fontSize: 9,
            color: COLORS.GRAY,
            marginTop: 4,
            fontFamily: "Pretendard",
          }}
        >
          {p.revenueModel === "sales"
            ? `분양 면적 가정(지상 추정 연면적) × 평당 ${p.salesPricePerPyeong.toLocaleString("ko-KR")}만원 × 분양률 ${p.salesRate}%`
            : p.revenueModel === "rent"
              ? `평당 월세 ${p.monthlyRentPerPyeong}만원 × ${p.loanPeriodYears}년 + 보증금 (가동률 ${p.annualOccupancy}%)`
              : "분양 + 임대 혼합 (절반씩 가정)"}
        </PdfText>
        <PdfText
          style={{
            fontSize: 18,
            fontWeight: 700,
            marginTop: 8,
            fontFamily: "Pretendard",
          }}
        >
          {fmtEok(p.totalRevenue)}
        </PdfText>
      </View>

      <PdfText style={[styles.h3, { marginTop: 14 }]} minPresenceAhead={100}>
        (d) 수익률 지표{landGate ? " — 토지가 가정값 미확정 (판정 보류)" : ""}
      </PdfText>
      {landGate && p.landScenarios ? (
        <LandScenarioTable scenarios={p.landScenarios} brand={brand} />
      ) : (
      <View wrap={false} style={{ flexDirection: "row", gap: 8 }}>
        <View
          style={{
            flex: 1,
            padding: 14,
            backgroundColor: brand.primaryColor,
          }}
        >
          <PdfText
            style={{
              fontSize: 9,
              color: COLORS.CORAL_LIGHT,
              fontFamily: "Pretendard",
            }}
          >
            자기자본 IRR (단순 2시점)
          </PdfText>
          <PdfText
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "white",
              marginTop: 4,
              fontFamily: "Pretendard",
            }}
          >
            {p.irr.toFixed(1)}%
          </PdfText>
          <PdfText
            style={{
              fontSize: 8,
              color: COLORS.CORAL_LIGHT,
              marginTop: 2,
              fontFamily: "Pretendard",
            }}
          >
            자기자본 대비 연 수익률
          </PdfText>
        </View>
        <ProfitMiniCard
          label="ROE"
          value={`${p.roe.toFixed(1)}%`}
          sub="자기자본 수익률"
          valueColor={irrColor}
        />
        <ProfitMiniCard
          label="손익분기 분양률"
          value={`${p.breakEvenSalesRate.toFixed(0)}%`}
          sub="최소 필요 분양률"
        />
      </View>
      )}

      <PdfText style={[styles.h3, { marginTop: 14 }]} minPresenceAhead={100}>(e) 평당 마진 분석{landGate ? " (입력 가정값 기준 참고 — 판정 보류)" : ""}</PdfText>
      <View
        wrap={false}
        style={{ padding: 12, backgroundColor: COLORS.CREAM }}
      >
        <ProfitRow
          label="평당 사업비 (분양가능면적 기준)"
          value={`${Math.round(p.costPerPyeong).toLocaleString("ko-KR")}만원/평`}
        />
        <ProfitRow
          label="평당 분양가"
          value={`${p.salesPricePerPyeong.toLocaleString("ko-KR")}만원/평`}
        />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingTop: 6,
            marginTop: 4,
            borderTopWidth: 1,
            borderTopColor: COLORS.LIGHT_GRAY,
            borderTopStyle: "solid",
          }}
        >
          <PdfText
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: brand.primaryColor,
              fontFamily: "Pretendard",
            }}
          >
            평당 마진
          </PdfText>
          <PdfText
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: p.marginPerPyeong < 0 ? "#DC2626" : brand.primaryColor,
              fontFamily: "Pretendard",
            }}
          >
            {p.marginPerPyeong > 0 ? "+" : ""}
            {Math.round(p.marginPerPyeong).toLocaleString("ko-KR")}만원/평 (
            {p.marginPercent.toFixed(1)}%)
          </PdfText>
        </View>
      </View>

      {/* (f) 주변 시세·임대료 — 국토부 실거래가 */}
      {input.market &&
        (input.market.aptTrade ||
          input.market.nrgTrade ||
          input.market.aptRent ||
          input.market.offiRent) && (
          <View wrap={false} style={{ marginTop: 14 }}>
            <PdfText style={styles.h3} minPresenceAhead={100}>
              (f) 주변 시세·임대료 (국토교통부 실거래가 · 최근 {input.market.months}
              개월 · 시군구 단위)
            </PdfText>
            <View style={{ padding: 12, backgroundColor: COLORS.CREAM }}>
              {input.market.aptTrade && (
                <ProfitRow
                  label={`아파트 매매 평균 (${input.market.aptTrade.count}건)`}
                  value={`${input.market.aptTrade.avgPy.toLocaleString("ko-KR")}만원/평 (중간 ${input.market.aptTrade.medianPy.toLocaleString("ko-KR")})`}
                />
              )}
              {input.market.nrgTrade && (
                <ProfitRow
                  label={`상업·업무 매매 평균 (${input.market.nrgTrade.count}건)`}
                  value={`${input.market.nrgTrade.avgPy.toLocaleString("ko-KR")}만원/평`}
                />
              )}
              {input.market.aptRent && input.market.aptRent.wolseCount > 0 && (
                <ProfitRow
                  label={`아파트 월세 평균 (${input.market.aptRent.wolseCount}건)`}
                  value={`평당 월 ${input.market.aptRent.avgMonthlyRentPerPy}만원 · 보증금 ${input.market.aptRent.avgWolseDeposit.toLocaleString("ko-KR")}만원`}
                />
              )}
              {input.market.offiRent && input.market.offiRent.wolseCount > 0 && (
                <ProfitRow
                  label={`오피스텔 월세 평균 (${input.market.offiRent.wolseCount}건)`}
                  value={`평당 월 ${input.market.offiRent.avgMonthlyRentPerPy}만원 · 보증금 ${input.market.offiRent.avgWolseDeposit.toLocaleString("ko-KR")}만원`}
                />
              )}
              <PdfText
                style={{
                  fontSize: 8,
                  color: COLORS.GRAY,
                  marginTop: 6,
                  fontFamily: "Pretendard",
                }}
              >
                ※ 시군구 단위 통계로 개별 입지·상품에 따라 차이가 큼. 설정 분양가{" "}
                {p.salesPricePerPyeong.toLocaleString("ko-KR")}만원/평의 시장 적정성
                판단 참고용.
              </PdfText>
            </View>
          </View>
        )}

      {/* 판정 — 주요 가정 확인 전에는 보류 (lib/plan/finance 와 같은 규칙) */}
      <View
        wrap={false}
        style={{
          marginTop: 12,
          padding: 12,
          backgroundColor: p.verdict?.kind === "loss" ? "#FEF2F2" : p.verdict?.kind === "ok" ? "#F0FDF4" : "#FFFBEB",
          borderLeftWidth: 4,
          borderLeftColor: p.verdict?.kind === "loss" ? "#DC2626" : p.verdict?.kind === "ok" ? "#16A34A" : "#F59E0B",
          borderLeftStyle: "solid",
        }}
      >
        <PdfText style={{ fontSize: 11, fontWeight: 700, color: COLORS.DARK, fontFamily: "Pretendard" }}>
          {p.verdict?.title ?? "사업성 판정 보류"}
        </PdfText>
        {(p.verdict?.reasons ?? []).map((r) => (
          <PdfText key={r} style={{ fontSize: 9.5, color: COLORS.DARK, marginTop: 3, fontFamily: "Pretendard" }}>
            · {r}
          </PdfText>
        ))}
      </View>
      {p.definitions && (
        <View wrap={false} style={{ marginTop: 8 }}>
          {[p.definitions.margin, p.definitions.irr, p.definitions.interest, p.definitions.tax, `${AREA_TERMS.saleableArea}: ${p.definitions.saleableArea}`].map((t) => (
            <PdfText key={t} style={[styles.smallText, { marginBottom: 2 }]}>※ {t}</PdfText>
          ))}
        </View>
      )}
    <View style={{ height: 18 }} /></>
  );
}

function ProfitMiniCard({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub: string;
  valueColor?: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        padding: 14,
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: COLORS.LIGHT_GRAY,
        borderStyle: "solid",
      }}
    >
      <PdfText
        style={{
          fontSize: 9,
          color: COLORS.GRAY,
          fontFamily: "Pretendard",
        }}
      >
        {label}
      </PdfText>
      <PdfText
        style={{
          fontSize: 22,
          fontWeight: 700,
          marginTop: 4,
          color: valueColor ?? COLORS.DARK,
          fontFamily: "Pretendard",
        }}
      >
        {value}
      </PdfText>
      <PdfText
        style={{
          fontSize: 8,
          color: COLORS.GRAY,
          marginTop: 2,
          fontFamily: "Pretendard",
        }}
      >
        {sub}
      </PdfText>
    </View>
  );
}

function ProfitRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
      }}
    >
      <PdfText style={{ fontSize: 10, fontFamily: "Pretendard" }}>
        {label}
      </PdfText>
      <PdfText
        style={{
          fontSize: 10,
          fontWeight: 500,
          fontFamily: "Pretendard",
        }}
      >
        {value}
      </PdfText>
    </View>
  );
}

/** C1 — 토지가 가정별 시나리오 비교표. [입력/공시지가/실거래] × [총사업비·세후순이익·ROE·손익분기분양률]. */
function LandScenarioTable({
  scenarios,
  brand,
}: {
  scenarios: NonNullable<ReportInputs["profit"]>["landScenarios"];
  brand: BrandConfig;
}) {
  if (!scenarios) return null;
  const W = { label: "22%", price: "18%", cost: "20%", profit: "20%", be: "20%" };
  return (
    <View style={{ borderWidth: 1, borderColor: COLORS.LIGHT_GRAY, borderStyle: "solid" }}>
      <DetailRow>
        <DetailCell header text="토지가 시나리오" width={W.label} />
        <DetailCell header text="평당 토지가" width={W.price} align="right" />
        <DetailCell header text="총사업비(이자포함)" width={W.cost} align="right" />
        <DetailCell header text="세후 순이익" width={W.profit} align="right" />
        <DetailCell header text="손익분기 분양률" width={W.be} align="right" />
      </DetailRow>
      {scenarios.map((sc, i) => (
        <DetailRow key={sc.key} last={i === scenarios.length - 1}>
          <DetailCell text={sc.label} width={W.label} bold={sc.key === "input"} color={sc.key === "input" ? brand.primaryColor : COLORS.DARK} />
          <DetailCell text={`${Math.round(sc.landPricePerPyeong).toLocaleString("ko-KR")}만원`} width={W.price} align="right" />
          <DetailCell text={fmtEok(sc.totalProjectCost)} width={W.cost} align="right" />
          <DetailCell text={fmtEok(sc.netProfit)} width={W.profit} align="right" color={sc.netProfit < 0 ? "#DC2626" : COLORS.DARK} />
          <DetailCell text={`${sc.breakEvenSalesRate.toFixed(0)}%`} width={W.be} align="right" />
        </DetailRow>
      ))}
    </View>
  );
}

function AppendixPage({
  input,
  brand,
}: {
  input: ReportInputs;
  brand: BrandConfig;
}) {
  const sec = useSec();
  return (
    <>

      <PdfText style={styles.h2}>{sec.appendix}. 부록</PdfText>
      <View style={styles.h2Underline} />
      <PdfText style={styles.h3}>(a) 적용 법령</PdfText>
      <View
        style={{
          borderWidth: 1,
          borderColor: COLORS.LIGHT_GRAY,
          borderStyle: "solid",
          padding: 12,
        }}
      >
        {[
          "국토계획법 시행령 제30조 · 84조 · 85조",
          "건축법 제61조① (2026.8.11 개정 · 2026.11.12 이후 신청분 적용 — 10m↓1.5m · 17m↓5m · 초과 h/2) / 개정 전: 시행령 제86조①",
          "건축법 시행령 제119조 (면적 산정 — 총연면적·용적률 산정 연면적 구분)",
          "주차장법 제19조 + 시행령 별표1",
          "농지법 제38조 + 시행령 제53조",
          "산지관리법 제19조 + 시행령 제24조",
          "개발이익환수에 관한 법률 제5조",
        ].map((line) => (
          <PdfText
            key={line}
            style={{ ...styles.body, marginBottom: 4, fontFamily: "Pretendard" }}
          >
            · {line}
          </PdfText>
        ))}
      </View>

      <PdfText style={[styles.h3, { marginTop: 14 }]} minPresenceAhead={100}>(b) 산정 공식</PdfText>
      <View
        wrap={false}
        style={{
          backgroundColor: COLORS.CREAM,
          padding: 12,
        }}
      >
        {[
          "건폐율 한도: 대지면적 × 건폐율",
          "용적률 한도: 대지면적 × 용적률",
          "농지부담금: 면적 × min(공시지가×30%, 50,000) × (1 − 감면)",
          "산지조성비: 면적 × [(기본 + 공시지가×반영률) × (1 + 가산율)] × (1 − 감면)",
          "개발부담금: max(0, 종료지가 − 개시지가 − 정상상승 − 개발비용) × 부담률",
        ].map((line) => (
          <PdfText
            key={line}
            style={{
              fontSize: 10,
              marginBottom: 4,
              fontFamily: "Pretendard",
              color: COLORS.DARK,
            }}
          >
            · {line}
          </PdfText>
        ))}
      </View>

      <PdfText style={[styles.h3, { marginTop: 14 }]} minPresenceAhead={100}>(c) 면책 조항</PdfText>
      <View
        wrap={false}
        style={{
          borderWidth: 1,
          borderColor: COLORS.LIGHT_GRAY,
          borderStyle: "solid",
          padding: 12,
        }}
      >
        <PdfText
          style={{
            fontSize: 9,
            lineHeight: 1.55,
            color: COLORS.GRAY,
            fontFamily: "Pretendard",
          }}
        >
          본 보고서는 부동산공법 데이터 분석 도구의 자동 산정 결과
          {input.aiStatus === "done" ? "와 전문 종합 분석" : "(전문 종합 분석 미포함)"}을 기반으로 작성되었으며, 건축사 배치 검토·법률 자문을 거치지 않았습니다. 최종 인허가·부담금·사업성은 관할
          행정청 확인 및 법률·세무 전문가 자문을 받아 결정하시기 바랍니다. 본
          자료는 참고용이며, 본 자료에 기반한 의사결정의 결과에 대해{" "}
          {brand.corporationName}는 책임을 지지 않습니다.
        </PdfText>
      </View>
    <View style={{ height: 18 }} /></>
  );
}


/* ============== 2-1. 층별 개요 · 법규 검토 (플렉시티식 상세) ============== */

function DetailCell({
  text,
  width,
  bold,
  color,
  align,
  header,
}: {
  text: string;
  width: number | string;
  bold?: boolean;
  color?: string;
  align?: "left" | "center" | "right";
  header?: boolean;
}) {
  return (
    <View
      style={{
        width,
        paddingVertical: 4,
        paddingHorizontal: 5,
        borderRightWidth: 0.5,
        borderRightColor: COLORS.LIGHT_GRAY,
        borderRightStyle: "solid",
        backgroundColor: header ? COLORS.CREAM : undefined,
        justifyContent: "center",
      }}
    >
      <PdfText
        style={{
          fontFamily: "Pretendard",
          fontSize: header ? 8.5 : 9,
          fontWeight: bold || header ? 700 : 400,
          color: color ?? COLORS.DARK,
          textAlign: align ?? "left",
        }}
      >
        {text}
      </PdfText>
    </View>
  );
}

function DetailRow({ children, last, fixed }: { children: React.ReactNode; last?: boolean; fixed?: boolean }) {
  return (
    <View
      wrap={false}
      fixed={fixed}
      style={{
        flexDirection: "row",
        borderBottomWidth: last ? 0 : 0.5,
        borderBottomColor: COLORS.LIGHT_GRAY,
        borderBottomStyle: "solid",
      }}
    >
      {children}
    </View>
  );
}

function FloorDetailPage({
  input,
  brand,
}: {
  input: ReportInputs;
  brand: BrandConfig;
}) {
  const sec = useSec();
  const s = input.scale;
  const ft = s.floorTable!;
  const W = { floor: "12%", area: "30%", setback: "20%", note: "38%" };
  const pilotiDeduct = s.isReducingFloor1 ? s.groundParkingArea : 0;
  const overCov = s.legalCovMax != null && s.coverRatio > s.legalCovMax;
  const overFar = s.legalFarMax != null && s.floorRatio > s.legalFarMax;
  // A8 — 지구단위계획구역 등 상한 자체가 바뀔 수 있는 미확인 규제가 남아 있으면 "상한
  // 이내"로 확정하지 않는다(판정 보류). 기준·근거란에 이미 "지구단위계획 미확인"이라고
  // 써 놓고 판정만 확정형으로 "상한 이내"라 적던 자기모순을 없앤다.
  const capConfirmable = capVerdictConfirmable(s);
  const capVerdict = (over: boolean) => (over ? "초과" : capConfirmable ? "상한 이내" : "판정 보류");

  const legal = [
    { item: "용도지역", plan: s.zoneName, basis: s.ordinanceSource ?? "조회값", verdict: "—", over: false },
    { item: "건폐율", plan: s.coverRatio + "%", basis: "조례·시행령 상한 " + (s.legalCovMax ?? "-") + "% 대비" + (capConfirmable ? "" : " (지구단위계획 확인 전)"), verdict: capVerdict(overCov), over: overCov },
    { item: "용적률", plan: s.floorRatio + "%", basis: "조례·시행령 상한 " + (s.legalFarMax ?? "-") + "% 대비 (기준·허용·상한용적률 미확인)", verdict: capVerdict(overFar), over: overFar },
    {
      item: "일조 높이제한",
      plan: sunlightSectionAllowed(s) ? `적용 (정북 사선 · ${SUNLIGHT_RULE_META[s.sunlightRule ?? "revised"].short})` : "미적용",
      basis: !sunlightSectionAllowed(s)
        ? "전용·일반주거지역만 적용 — 이 용도지역은 대상 아님"
        : s.sunlightRule === "legacy"
          ? "건축법 시행령 제86조① (2026.11.11 이전 신청분) — 10m 이하 1.5m · 초과부 h/2"
          : "건축법 제61조① (2026.11.12 이후 신청분) — 10m 이하 1.5m · 10~17m 5m · 17m 초과 h/2",
      verdict: sunlightSectionAllowed(s) ? "반영" : "해당 없음",
      over: false,
    },
    {
      item: "부설주차장",
      plan: s.parkingSpaces + "대 (지상 " + s.groundSpaces + " · 지하 " + s.basementSpaces + ")",
      basis: (s.parkingBasisLabel ?? "-") + ` (${s.parkingLegalBasis ?? "근거 확인 필요"}) · 배치 검토 미실시`,
      verdict: "대수 산정",
      over: false,
    },
    {
      item: "층수 · 높이",
      plan: (s.floorLabel ?? "-") + " · " + (s.heightM ?? 0).toFixed(1) + "m",
      basis: (s.heightNote ?? "층고 합") + " · 가로구역별 최고높이 등 별도 확인",
      verdict: "참고",
      over: false,
    },
  ];

  return (
    <>

      <PdfText style={styles.h2} minPresenceAhead={170}>{sec.scale}-1. 층별 개요 · 법규 검토</PdfText>
      <View style={styles.h2Underline} />

      <PdfText style={styles.h3} minPresenceAhead={100}>(a) 층별 개요표</PdfText>
      {/* 막대(한눈에 보는 비례) + 표(정확한 수치)를 한 곳에 — 1쪽(사업 개요)의 막대그래프와
          따로 중복해서 그리지 않는다(B5). */}
      <View
        wrap={false}
        style={{ borderWidth: 1, borderColor: COLORS.LIGHT_GRAY, borderStyle: "solid", padding: 8, backgroundColor: "white", marginBottom: 8 }}
      >
        <FloorStackDiagram table={ft} brand={brand} />
        <PdfText style={[styles.muted, { marginTop: 4 }]}>
          ※ 막대 길이 = 층별 바닥면적. {sunlightSectionAllowed(s) ? "정북 일조사선(건축법 61조① — 10m 이하 1.5m · 10~17m 5m · 초과 h/2)으로 상층부가 줄어드는 모습입니다. " : ""}
          지하는 주차 전용(용적률 산정 연면적 제외, 시행령 119조①4). 아래 표와 동일한 계산원입니다.
        </PdfText>
      </View>
      <View wrap={false} style={{ borderWidth: 1, borderColor: COLORS.LIGHT_GRAY, borderStyle: "solid" }}>
        <DetailRow>
          <DetailCell header text="층" width={W.floor} align="center" />
          <DetailCell header text="바닥면적" width={W.area} align="center" />
          <DetailCell header text="정북 법정이격" width={W.setback} align="center" />
          <DetailCell header text="비고" width={W.note} />
        </DetailRow>
        {groupFloorRows([...ft.rows].reverse().map((r) => ({ label: r.floor + "F", area: r.areaSqm, setback: r.legalSetbackM, note: r.note }))).map((g) => (
          <DetailRow key={"f" + g.label}>
            <DetailCell text={g.label} width={W.floor} align="center" bold />
            <DetailCell text={formatArea(g.area) + (g.count > 1 ? ` × ${g.count}개 층` : "")} width={W.area} align="right" />
            <DetailCell text={g.setback > 0 ? g.setback.toFixed(2) + "m" : "—"} width={W.setback} align="center" />
            <DetailCell text={g.note} width={W.note} color={COLORS.GRAY} />
          </DetailRow>
        ))}
        {groupFloorRows(ft.basement.map((b) => ({ label: "B" + b.level, area: b.areaSqm, setback: 0, note: b.note }))).map((g) => (
          <DetailRow key={"b" + g.label}>
            <DetailCell text={g.label} width={W.floor} align="center" bold color={COLORS.GRAY} />
            <DetailCell text={formatArea(g.area) + (g.count > 1 ? ` × ${g.count}개 층` : "")} width={W.area} align="right" color={COLORS.GRAY} />
            <DetailCell text="—" width={W.setback} align="center" color={COLORS.GRAY} />
            <DetailCell text={g.note} width={W.note} color={COLORS.GRAY} />
          </DetailRow>
        ))}
        <DetailRow>
          <DetailCell text="지상 합계" width={W.floor} align="center" bold header />
          <DetailCell text={formatArea(ft.sumGroundSqm)} width={W.area} align="right" bold header />
          <DetailCell text="" width={W.setback} header />
          <DetailCell
            text={"용적률 상한 산술값 " + formatArea(s.legalFloorArea) + (s.sunlightApplied ? " 대비 일조 손실 " + s.sunlightLoss.toFixed(1) + "%" : "")}
            width={W.note}
            header
          />
        </DetailRow>
        {pilotiDeduct > 0 && (
          <DetailRow>
            <DetailCell text="" width={W.floor} />
            <DetailCell text={"− " + formatArea(pilotiDeduct)} width={W.area} align="right" color={COLORS.GRAY} />
            <DetailCell text="" width={W.setback} />
            <DetailCell text="필로티 주차 — 바닥면적 불산입 가정 (요건 충족 시)" width={W.note} color={COLORS.GRAY} />
          </DetailRow>
        )}
        <DetailRow last>
          <DetailCell text="" width={W.floor} />
          <DetailCell text={formatArea(s.actualFloorArea)} width={W.area} align="right" bold color={brand.primaryColor} />
          <DetailCell text="" width={W.setback} />
          <DetailCell text="입력 조건 기준 추정 연면적 (화면 표시값과 같은 계산원)" width={W.note} bold color={brand.primaryColor} />
        </DetailRow>
      </View>
      <PdfText style={[styles.smallText, { marginTop: 4 }]}>
        {ft.precise
          ? "※ 실형상 정밀 계산 — 지적 폴리곤을 건폐율만큼 축소한 바닥판을 층별로 정북 인접 대지경계선 기준 법정 이격(법 제61조①)으로 클리핑해 산정했습니다. 화면 KPI·3D 매스와 동일 수식입니다."
          : "※ 층별 면적은 정북 깊이(√건축면적) 근사 모델로, 화면 KPI와 동일한 수식입니다. 지번 조회로 실형상을 반영하면 지적 폴리곤 기준 정밀 계산으로 전환됩니다."}
      </PdfText>

      <PdfText style={[styles.h3, { marginTop: 14 }]} minPresenceAhead={100}>(b) 법규 검토표</PdfText>
      <View style={{ borderWidth: 1, borderColor: COLORS.LIGHT_GRAY, borderStyle: "solid" }}>
        <DetailRow>
          <DetailCell header text="항목" width="16%" />
          <DetailCell header text="계획" width="26%" />
          <DetailCell header text="기준 · 근거" width="46%" />
          <DetailCell header text="판정" width="12%" align="center" />
        </DetailRow>
        {legal.map((r, i) => (
          <DetailRow key={r.item} last={i === legal.length - 1}>
            <DetailCell text={r.item} width="16%" bold />
            <DetailCell text={r.plan} width="26%" />
            <DetailCell text={r.basis} width="46%" color={COLORS.GRAY} />
            <DetailCell
              text={r.verdict}
              width="12%"
              align="center"
              bold
              color={r.over ? "#DC2626" : r.verdict === "적합" || r.verdict === "반영" ? "#15803D" : COLORS.GRAY}
            />
          </DetailRow>
        ))}
      </View>
      {input.land?.useAttrs && input.land.useAttrs.length > 0 && (
        <View wrap={false} style={{ marginTop: 14 }}>
          <PdfText style={styles.h3} minPresenceAhead={100}>(c) 토지이용계획 지역·지구 등 (전체)</PdfText>
          <View style={{ borderWidth: 1, borderColor: COLORS.LIGHT_GRAY, borderStyle: "solid" }}>
            <DetailRow>
              <DetailCell header text="#" width="8%" align="center" />
              <DetailCell header text="지역 · 지구 · 구역" width="66%" />
              <DetailCell header text="관계" width="26%" align="center" />
            </DetailRow>
            {input.land.useAttrs.map((raw, i) => {
              const conflict = raw.includes("(저촉)");
              const name = raw.replace("(저촉)", "").trim();
              return (
                <DetailRow key={raw + i} last={i === input.land!.useAttrs!.length - 1}>
                  <DetailCell text={String(i + 1)} width="8%" align="center" color={COLORS.GRAY} />
                  <DetailCell text={name} width="66%" />
                  <DetailCell
                    text={conflict ? "저촉" : "포함"}
                    width="26%"
                    align="center"
                    bold
                    color={conflict ? "#DC2626" : "#15803D"}
                  />
                </DetailRow>
              );
            })}
          </View>
          <PdfText style={[styles.smallText, { marginTop: 4 }]}>
            ※ 출처: VWorld NED 토지이용계획 속성. &quot;저촉&quot;은 해당 규제선이 필지 일부에 걸친다는 뜻입니다. 정확한 범위·행위제한은 토지이음(eum.go.kr) 확인이 필요합니다.
          </PdfText>
        </View>
      )}

      {s.sunlightImpact && (
        <View wrap={false} style={{ marginTop: 14 }}>
          <PdfText style={styles.h3} minPresenceAhead={100}>
            (d) 북측 일조 영향 진단 — 동지 9~15시{sunlightSectionAllowed(s) ? "" : " (참고용 — 법정 일조 기준 적용 대상 아님)"}
          </PdfText>
          <View style={{ borderWidth: 1, borderColor: COLORS.LIGHT_GRAY, borderStyle: "solid" }}>
            <DetailRow>
              <DetailCell header text="북측 경계에서" width="25%" align="center" />
              <DetailCell header text="최장 연속 일조" width="25%" align="center" />
              <DetailCell header text="총 일조" width="25%" align="center" />
              <DetailCell header text={sunlightSectionAllowed(s) ? "연속 2시간 기준" : "연속 2시간(참고)"} width="25%" align="center" />
            </DetailRow>
            {s.sunlightImpact.rows.map((r, i) => (
              <DetailRow key={r.offsetM} last={i === s.sunlightImpact!.rows.length - 1}>
                <DetailCell text={`${r.offsetM}m`} width="25%" align="center" bold />
                <DetailCell text={`${r.maxRunH}시간`} width="25%" align="center" />
                <DetailCell text={`${r.totalH}시간`} width="25%" align="center" color={COLORS.GRAY} />
                <DetailCell
                  text={r.pass ? "충족" : sunlightSectionAllowed(s) ? "미달" : "참고"}
                  width="25%"
                  align="center"
                  bold
                  color={r.pass ? "#15803D" : sunlightSectionAllowed(s) ? "#DC2626" : COLORS.GRAY}
                />
              </DetailRow>
            ))}
          </View>
          <PdfText style={[styles.smallText, { marginTop: 4 }]}>
            ※ {s.sunlightImpact.basis}.{" "}
            {sunlightSectionAllowed(s)
              ? ""
              : "이 용도지역은 정북 일조 높이제한 적용 대상이 아닙니다 — 이 표는 법적 기준 충족 여부가 아니라 인접 대지에 미치는 그림자 영향을 참고로 보여줍니다. "}
            주변 기존 건물·지형은 미반영 — 계획 참고용이며 일조 분쟁 판단은 정밀 시뮬레이션·전문가 감정이 필요합니다.
          </PdfText>
        </View>
      )}

      <PdfText style={[styles.smallText, { marginTop: 4 }]}>
        ※ 판정은 입력값 기준 자동 검토이며 인허가 판단이 아닙니다. 지구단위계획·가로구역별 높이제한·문화재 앙각 등 개별 규제는 토지이음과 관할 지자체에서 별도 확인이 필요합니다.
      </PdfText>
    <View style={{ height: 18 }} /></>
  );
}


/* ── ■ 한눈에 보는 결론 — 숫자를 문장으로 풀어 비전문가도 바로 읽히게 ── */
function PlainSummaryBox({ input, brand }: { input: ReportInputs; brand: BrandConfig }) {
  const s = input.scale;
  const py = (sqm: number) => (sqm / 3.305785).toLocaleString("ko-KR", { maximumFractionDigits: 1 });
  const unresolved = s.constraints?.items ?? [];
  const fetched = s.constraints?.fetched ?? false;

  // 확정형 표현 금지 — "입력 조건에서의 이론상 규모" 와 "무엇이 확인되면 그 규모가 가능해지는가" 로 쓴다.
  const lines: string[] = [];
  lines.push(
    `입력 조건(건폐율 ${s.coverRatio}% · 용적률 ${s.floorRatio}%)에서 이론상 규모는 1층 ${py(s.buildingArea)}평, ${s.floorLabel ?? "-"}, 높이 약 ${(s.heightM ?? 0).toFixed(1)}m입니다. 허가 가능 규모가 아닙니다.`,
  );
  if (s.sunlightApplied && s.sunlightLoss > 0.05) {
    lines.push(
      `정북 일조 높이제한(${SUNLIGHT_RULE_META[s.sunlightRule ?? "legacy"].short} 규정)을 반영하면 추정 연면적은 ${py(s.actualFloorArea)}평(용적률 상한 산술값 대비 ${s.sunlightLoss.toFixed(1)}% 감소)입니다.`,
    );
  } else if (!s.sunlightApplied) {
    lines.push(
      `정북 일조 높이제한은 이 용도지역에 적용되지 않습니다. 다만 그것만으로 상한 ${py(s.legalFloorArea)}평을 모두 실현할 수 있다는 뜻은 아닙니다.`,
    );
  }
  if (!fetched) {
    lines.push("토지이용계획을 조회하지 않아 지구단위계획·높이 제한 등 반영 여부를 판단할 수 없습니다.");
  } else if (unresolved.length > 0) {
    lines.push(
      `다음 항목이 확인되기 전까지 이 규모는 확정할 수 없습니다: ${unresolved.map((c) => c.label).join(", ")}.`,
    );
  }
  lines.push(
    `법정 주차는 ${s.parkingSpaces}대(면적계수 추정, 배치 검토 전)이며, 건축·부대비 소계는 약 ${(input.cost.total / 1e8).toFixed(1)}억원(토지비·금융비 제외)입니다.`,
  );

  return (
    <View
      wrap={false}
      style={{
        marginBottom: 14,
        padding: 12,
        backgroundColor: COLORS.CREAM,
        borderLeftWidth: 4,
        borderLeftColor: brand.primaryColor,
        borderLeftStyle: "solid",
      }}
    >
      <PdfText
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: brand.primaryColor,
          fontFamily: "Pretendard",
          marginBottom: 5,
        }}
      >
        ■ 한눈에 보는 결론
      </PdfText>
      {lines.map((t, i) => (
        <PdfText
          key={i}
          style={{
            fontSize: 10,
            lineHeight: 1.55,
            color: COLORS.DARK,
            fontFamily: "Pretendard",
            marginBottom: i === lines.length - 1 ? 0 : 3,
          }}
        >
          {i + 1}. {t}
        </PdfText>
      ))}
    </View>
  );
}


/* ── P  주차장 산정 해설 — 대수·배치가 어떻게 나왔고 무엇을 의미하는지 ── */
function ParkingExplainBox({ input, brand }: { input: ReportInputs; brand: BrandConfig }) {
  const s = input.scale;
  if (!s.parkingSpaces || s.parkingSpaces <= 0) return null;

  const placeTxt =
    s.parkingPlacement === "none"
      ? "주차 배치를 가정하지 않은 검토입니다."
      : s.parkingPlacement === "basement"
        ? `전량 지하 배치(${s.basementSpaces}대) — 지하층 주차장은 용적률 산정 연면적에서 제외되지만(건축법 시행령 제119조①4), 굴착·램프 공사비가 지상보다 큽니다.`
        : s.parkingPlacement === "above"
          ? `전량 지상 배치(${s.groundSpaces}대) — 1층 바닥의 약 ${Math.round(s.groundParkingArea)}㎡를 주차가 차지해 1층 영업 가능 면적이 ${Math.round(s.floor1Indoor)}㎡로 줄어듭니다.`
          : `지상 ${s.groundSpaces}대 + 지하 ${s.basementSpaces}대 혼합 배치 — 1층 일부(${Math.round(s.groundParkingArea)}㎡)를 주차로 쓰고 나머지는 지하로 내립니다.`;

  const pilotiTxt =
    s.groundParkingArea > 0
      ? s.pilotiMode
        ? "지상 주차를 필로티(벽 없는 개방형 기둥 구조)로 하면 그 면적이 연면적 산정에서도 빠져 분양 가능 면적 손실을 줄일 수 있습니다(시행령 제119조①4 요건 충족 시)."
        : "지상 주차를 벽체식(벽으로 둘러싼 구조)으로 하면 그 면적이 연면적에 그대로 산입됩니다 — 필로티 전환 시 연면적 차감 이득이 있는지 검토해 볼 만합니다."
      : null;

  return (
    <View
      wrap={false}
      style={{
        marginTop: 10,
        padding: 10,
        backgroundColor: COLORS.CREAM,
        borderLeftWidth: 3,
        borderLeftColor: brand.primaryColor,
        borderLeftStyle: "solid",
      }}
    >
      <PdfText
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: brand.primaryColor,
          fontFamily: "Pretendard",
          marginBottom: 4,
        }}
      >
        P  주차장 산정 해설
      </PdfText>
      <PdfText style={{ fontSize: 9.5, lineHeight: 1.55, color: COLORS.DARK, fontFamily: "Pretendard" }}>
        법정 대수 {s.parkingSpaces}대는 「{s.parkingBasisLabel ?? "용도별 설치 기준"}」으로 산정한 값입니다
        ({s.parkingLegalBasis ?? "주차장법 제19조·시행령 별표1, 지자체 주차 조례가 이를 강화할 수 있음"}).
        1대당 {s.parkingUnitArea}㎡는 주차칸(약 12.5㎡)에 차로·회전 공간을 더한 실무 소요 면적입니다.
      </PdfText>
      <PdfText style={{ fontSize: 9.5, lineHeight: 1.55, color: COLORS.DARK, fontFamily: "Pretendard", marginTop: 3 }}>
        {placeTxt}
      </PdfText>
      {pilotiTxt ? (
        <PdfText style={{ fontSize: 9.5, lineHeight: 1.55, color: COLORS.DARK, fontFamily: "Pretendard", marginTop: 3 }}>
          {pilotiTxt}
        </PdfText>
      ) : null}
      <PdfText style={{ fontSize: 8.5, lineHeight: 1.5, color: COLORS.GRAY, fontFamily: "Pretendard", marginTop: 4 }}>
        ※ 장애인·확장형·환경친화적 자동차 전용구획 비율, 기계식 인정 조건 등은 지자체 조례로 별도 확인이 필요합니다.
      </PdfText>
    </View>
  );
}


/** B2 — "미확인 사항" 목록을 만드는 단일 출처. UnverifiedBox(전체)·UnverifiedRef(한 줄 참조)가 공유한다. */
function unverifiedExtraNotes(input: ReportInputs): string[] {
  const s = input.scale;
  const extra: string[] = [];
  if (s.roadWidthSource === "assumed") extra.push(`전면도로 폭 ${s.roadWidth}m는 가정값(접도 유무만 확인, 실측 아님)`);
  else if (s.roadWidthSource === "roadside") extra.push(`전면도로 폭 ${s.roadWidth}m는 도로접면 코드 기준 추정값(실측 아님)`);
  if (input.profit?.verdict?.kind === "hold") extra.push("사업성 판정 보류(가정 미확인)");
  return extra;
}

function unverifiedCount(input: ReportInputs): number {
  const s = input.scale;
  const fetched = s.constraints?.fetched ?? false;
  const items = s.constraints?.items ?? [];
  return (fetched ? items.length : 1) + unverifiedExtraNotes(input).length;
}

/** 표지용 한 줄 참조 — 전체 목록은 요약(검토 요약) 페이지 1곳에만 둔다(B2, 같은 내용 반복 방지). */
function UnverifiedRef({ input, sectionNum }: { input: ReportInputs; sectionNum: string }) {
  const n = unverifiedCount(input);
  if (n === 0) return null;
  return (
    <View
      wrap={false}
      style={{
        marginTop: 10,
        padding: 8,
        borderWidth: 1,
        borderColor: "#B45309",
        borderStyle: "solid",
        backgroundColor: "#FFFBEB",
      }}
    >
      <PdfText style={{ fontSize: 9.5, fontWeight: 700, color: "#92400E", fontFamily: "Pretendard" }}>
        ■ 확인 필요 사항 {n}건 — {sectionNum}쪽 &ldquo;검토 요약&rdquo;에서 전체 확인
      </PdfText>
    </View>
  );
}

function UnverifiedBox({ input }: { input: ReportInputs }) {
  const s = input.scale;
  const items = s.constraints?.items ?? [];
  const fetched = s.constraints?.fetched ?? false;
  const always = s.alwaysUnverified ?? [];
  const extra = unverifiedExtraNotes(input);
  return (
    <View
      wrap={false}
      style={{
        marginTop: 8,
        marginBottom: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: "#B45309",
        borderStyle: "solid",
        backgroundColor: "#FFFBEB",
      }}
    >
      <PdfText style={{ fontSize: 10, fontWeight: 700, color: "#92400E", fontFamily: "Pretendard" }}>
        ■ 미확인 사항 — 아래가 확인되기 전 수치는 입력 조건에 따른 이론상 규모입니다
      </PdfText>
      {!fetched ? (
        <PdfText style={{ fontSize: 9, color: COLORS.DARK, marginTop: 3, fontFamily: "Pretendard" }}>
          · 토지이용계획 미조회 — 지역·지구 규제 반영 여부 판단 불가
        </PdfText>
      ) : items.length === 0 ? (
        <PdfText style={{ fontSize: 9, color: COLORS.DARK, marginTop: 3, fontFamily: "Pretendard" }}>
          · 조회된 지역·지구 중 높이·용적률을 바꾸는 항목 없음
        </PdfText>
      ) : (
        items.map((c) => (
          <PdfText key={c.label} style={{ fontSize: 9, color: COLORS.DARK, marginTop: 3, fontFamily: "Pretendard" }}>
            · {c.label} — {c.effect} (확인: {c.where})
          </PdfText>
        ))
      )}
      {extra.map((t) => (
        <PdfText key={t} style={{ fontSize: 9, color: COLORS.DARK, marginTop: 2, fontFamily: "Pretendard" }}>
          · {t}
        </PdfText>
      ))}
      {always.length > 0 && (
        <PdfText style={{ fontSize: 8.5, color: COLORS.GRAY, marginTop: 4, fontFamily: "Pretendard" }}>
          항상 별도 확인: {always.map((c) => c.label).join(" · ")}
        </PdfText>
      )}
    </View>
  );
}


/** 층별표 — 면적·이격·비고가 같은 연속 층을 "2F~13F × 12개 층" 한 줄로 묶는다(표가 한 쪽에 들어가 머리글 분리 없음) */
// groupFloorRows는 lib/report/floorTable에서 가져온다(한장 보고서와 같은 그룹화 규칙 공유).
