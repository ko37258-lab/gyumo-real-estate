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
import { ensurePdfFonts } from "@/lib/pdf/fonts";
import { COLORS } from "@/lib/pdf/tokens";
import type { AIAnalysis, ReportInputs } from "@/lib/ai/types";
import { formatArea, formatPyeongAsArea } from "@/lib/utils/area";
import { getBrandConfig } from "@/lib/branding/storage";
import type { BrandConfig } from "@/lib/branding/types";

ensurePdfFonts();

const fmtNum = (v: number, d = 0) =>
  v.toLocaleString("ko-KR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
const fmtEok = (v: number) =>
  v >= 1e8
    ? `${(v / 1e8).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억원`
    : `${fmtNum(Math.round(v))}원`;
const fmtWon = (v: number) => `${fmtNum(Math.round(v))}원`;

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
    marginBottom: 14,
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
      <SummaryPage input={input} analysis={analysis} brand={b} />
      <ScalePage input={input} brand={b} />
      {input.scale.floorTable && <FloorDetailPage input={input} brand={b} />}
      {input.includeCostPage !== false && <CostPage input={input} brand={b} />}
      {input.profit && <ProfitPage input={input} brand={b} />}
      {input.usePrices && <UsePricesPage input={input} brand={b} />}
      {analysis && <AIPage input={input} analysis={analysis} brand={b} />}
      <AppendixPage input={input} brand={b} />
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
          padding: 50,
          flex: 1,
          justifyContent: "space-between",
          fontFamily: "Pretendard",
        }}
      >
        <View>
          <PdfText
            style={{
              fontSize: 32,
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
              marginTop: 28,
              marginBottom: 28,
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
            <PdfText
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: COLORS.DARK,
                marginTop: 4,
                marginBottom: 14,
                fontFamily: "Pretendard",
              }}
            >
              {input.address || "(검토 대상 미입력)"}
            </PdfText>
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

          {input.locationMap ? (
            <View style={{ marginTop: 16 }}>
              <PdfImage
                src={input.locationMap}
                style={{ width: "100%", height: 170, objectFit: "cover" }}
              />
              <PdfText
                style={{ fontSize: 8, color: COLORS.GRAY, marginTop: 3, fontFamily: "Pretendard" }}
              >
                위치도 — 대상 필지(주황 표시) · VWorld 위성영상 · 상단 N=정북 · 우하단 100m 축척
              </PdfText>
            </View>
          ) : null}

          {analysis?.oneLiner ? (
            <View
              wrap={false}
              style={{
                backgroundColor: COLORS.CORAL_LIGHT,
                padding: 18,
                marginTop: 18,
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
            작성: {brand.brandTagline} {brand.authorName} · 법률자문: {brand.legalAdvisor}
          </PdfText>
          <PdfText
            style={{ fontSize: 9, color: COLORS.GRAY, marginTop: 2, fontFamily: "Pretendard" }}
          >
            {brand.corporationName} · {brand.ceoTitle} · 1차 보고서
          </PdfText>
        </View>
      </View>
    </Page>
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
        {input.address || "검토 대상 미입력"}
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
  const totalEok = input.cost.total / 1e8;
  const perPy =
    input.cost.totalArea > 0 ? input.cost.total / input.cost.totalArea : 0;

  return (
    <Page size="A4" style={styles.innerPage}>
      <FixedHeader input={input} brand={brand} />
      <FixedFooter input={input} />

      <PdfText style={styles.h2}>1. 검토 요약 (Executive Summary)</PdfText>
      <View style={styles.h2Underline} />

      <PlainSummaryBox input={input} brand={brand} />

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
            label="예상 총 사업비"
            value={`${totalEok.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억`}
            sub={fmtWon(input.cost.total)}
            accent
            accentColor={brand.primaryColor}
          />
          <Kpi2
            label="평당 사업비"
            value={
              input.cost.totalArea > 0
                ? `${fmtNum(Math.round(perPy / 10000))}만`
                : "—"
            }
            sub={
              input.cost.totalArea > 0
                ? `총 ${formatPyeongAsArea(input.cost.totalArea)}`
                : ""
            }
          />
        </View>
      </View>

      <PdfText style={styles.h3}>전문 종합 의견</PdfText>
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
          {analysis?.summary ||
            "전문 종합 분석을 건너뛰었습니다. 본 페이지의 KPI와 다음 페이지의 상세 산정만 보고서에 수록됩니다."}
        </PdfText>
      </View>

      <PdfText style={[styles.h3, { marginTop: 14 }]}>핵심 수치 한눈에</PdfText>
      <TwoColTable
        rows={[
          ["건폐율 / 용적률", `${input.scale.coverRatio}% / ${input.scale.floorRatio}%`],
          ["1층 건축면적", formatArea(input.scale.buildingArea)],
          ["법정 연면적", formatArea(input.scale.legalFloorArea)],
          ["실제 가능 연면적", formatArea(input.scale.actualFloorArea)],
          ["일조권 손실", `${input.scale.sunlightLoss.toFixed(1)}%`],
          ["주차 대수 / 배치", `${input.scale.parkingSpaces}대 / ${PLACEMENT_LABEL[input.scale.parkingPlacement] ?? input.scale.parkingPlacement}`],
        ]}
      />

      {input.land && <LandInfoBox land={input.land} brand={brand} />}

      {input.profit && <ProfitKpiBox profit={input.profit} brand={brand} />}
    </Page>
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
      <PdfText style={styles.h3}>
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
}: {
  profit: NonNullable<ReportInputs["profit"]>;
  brand: BrandConfig;
}) {
  const irrColor =
    profit.irr < 0
      ? "#DC2626"
      : profit.irr < 10
        ? COLORS.GRAY
        : brand.primaryColor;
  const netColor = profit.netProfit < 0 ? "#DC2626" : COLORS.DARK;
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
        📊 사업성 핵심 지표
      </PdfText>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <KpiMini label="예상 IRR" value={`${profit.irr.toFixed(1)}%`} valueColor={irrColor} />
        <KpiMini label="순이익 (세후)" value={fmtEok(profit.netProfit)} valueColor={netColor} />
        <KpiMini label="ROE" value={`${profit.roe.toFixed(1)}%`} />
        <KpiMini label="손익분기 분양률" value={`${profit.breakEvenSalesRate.toFixed(0)}%`} />
      </View>
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
          <View style={{ width: "60%", padding: 8 }}>
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
  const s = input.scale;
  return (
    <Page size="A4" style={styles.innerPage}>
      <FixedHeader input={input} brand={brand} />
      <FixedFooter input={input} />

      <PdfText style={styles.h2}>2. 건축 규모 검토</PdfText>
      <View style={styles.h2Underline} />

      <PdfText style={styles.h3}>(a) 입력 조건</PdfText>
      <TwoColTable
        rows={[
          ["대지면적", formatArea(s.landAreaSqm)],
          ["용도지역", `${s.zoneName} (${s.zoneCode})`],
          ["건폐율", `${s.coverRatio}%`],
          ["용적률", `${s.floorRatio}%`],
          ["전면도로", `${s.roadWidth}m`],
        ]}
      />
      {s.ordinanceSource && (
        <PdfText style={[styles.smallText, { marginTop: 4, color: "#6b7280" }]}>
          ⚖ 상한 근거 — {s.ordinanceSource}
        </PdfText>
      )}

      <PdfText style={[styles.h3, { marginTop: 14 }]}>(b) 산정 결과</PdfText>
      <TwoColTable
        rows={[
          ["1층 법정 건축면적", formatArea(s.buildingArea)],
          ...(s.groundParkingArea > 0
            ? ([
                [
                  `└ 1층 지상주차 점유 (${s.groundSpaces}대 × ${s.parkingUnitArea}㎡, ${s.pilotiMode ? "필로티" : "벽체식"})`,
                  `− ${formatArea(s.groundParkingArea)}`,
                ],
                [
                  s.floor1Indoor <= 0
                    ? "⚠️ 1층 영업 가능 면적 (1층 전체 주차)"
                    : "✓ 1층 영업 가능 면적",
                  formatArea(s.floor1Indoor),
                ],
              ] as [string, string][])
            : []),
          ["법정 연면적", formatArea(s.legalFloorArea)],
          ["실제 가능 연면적", formatArea(s.actualFloorArea)],
          ["일조권 손실", `${s.sunlightLoss.toFixed(1)}%`],
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
            ✓ 필로티 구조 적용
          </PdfText>
          <PdfText
            style={{
              fontSize: 9.5,
              marginTop: 3,
              color: COLORS.DARK,
              fontFamily: "Pretendard",
            }}
          >
            1층 주차 {formatArea(s.groundParkingArea)}가 연면적에서 추가 제외됩니다 (건축법 시행령 119조 1항 4호 — 벽 없는 개방형 주차 전용 구조 조건 충족 시).
          </PdfText>
        </View>
      ) : null}

      <ParkingExplainBox input={input} brand={brand} />

      <PdfText style={[styles.h3, { marginTop: 14 }]}>
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
        />
        <PdfText style={[styles.muted, { marginTop: 4 }]}>
          ※ 건축법 시행령 제86조 (2023.9.12 개정, 10m 기준). 정북 사선이 적용된 정북단면의 모식도입니다.
          {s.groundParkingArea > 0
            ? s.isReducingFloor1
              ? " 1층 남측 일부에 필로티 주차(시행령 119조 1항 2호 가목 4, 건축면적 제외)를 음영 표시."
              : " 1층 남측 일부에 벽체식 지상주차(건축면적 산입)를 음영 표시."
            : ""}
        </PdfText>
      </View>

      {input.visualization3D ? (
        <View wrap={false} style={{ marginTop: 14 }}>
          <PdfText style={styles.h3}>(d) 3D 매스 시각화</PdfText>
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
              style={{ width: "100%", height: 180, objectFit: "contain" }}
            />
            <PdfText style={[styles.muted, { marginTop: 6 }]}>
              ※ 입력된 건폐율·용적률·일조권 사선·주차 배치가 모두 반영된 3D 매스입니다. 회전 가능한 인터랙티브 버전은 시뮬레이터에서 확인하세요.
            </PdfText>
          </View>
        </View>
      ) : null}
    </Page>
  );
}

function SunlightDiagram({
  sunlightLoss,
  buildingArea,
  groundParkingArea,
  showParking,
}: {
  sunlightLoss: number;
  buildingArea: number;
  groundParkingArea: number;
  showParking: boolean;
}) {
  // 단순 모식도 — 정확한 수치보다 시각적 일관성에 초점.
  // 건물 폭 90~380 (=290), 바닥 y=180, 1층 상단 y=155, 건물 천장 y=60.
  const buildingPath = "M 90 180 L 90 60 L 210 60 L 270 130 L 380 130 L 380 180 Z";
  const sunlightLine = "M 90 180 L 90 130 L 380 60";

  // 1F 주차 영역: 남측(좌측) 끝부터 parkingFraction × 290px만큼
  const fraction =
    buildingArea > 0 && showParking
      ? Math.min(1, Math.max(0, groundParkingArea / buildingArea))
      : 0;
  const parkW = fraction * 290;
  return (
    <Svg width="100%" height={140} viewBox="0 0 500 200">
      <Path d="M 50 180 L 450 180" stroke={COLORS.DARK} strokeWidth={1.5} />
      <Path
        d={buildingPath}
        fill={COLORS.CORAL}
        stroke={COLORS.CORAL_DARK}
        strokeWidth={1.2}
      />
      {fraction > 0 && (
        <>
          {/* 1F 주차 영역 사선 패턴 박스 (1층: y=155~180, 높이 25) */}
          <Rect
            x={90}
            y={155}
            width={parkW}
            height={25}
            fill={COLORS.LIGHT_GRAY}
            stroke="#993C1D"
            strokeWidth={1.2}
            strokeDasharray="3 2"
          />
          <SvgText
            x={90 + parkW / 2}
            y={172}
            textAnchor="middle"
            style={{
              fontFamily: "Pretendard",
              fontSize: 8,
              fontWeight: 700,
              color: "#993C1D",
            }}
          >
            🚗 1층 주차
          </SvgText>
        </>
      )}
      <Path
        d={sunlightLine}
        stroke={COLORS.CORAL_DARK}
        strokeWidth={1}
        strokeDasharray="4 3"
        fill="none"
      />
      <SvgText
        x={20}
        y={193}
        style={{ fontFamily: "Pretendard", fontSize: 9, color: COLORS.GRAY }}
      >
        남
      </SvgText>
      <SvgText
        x={475}
        y={193}
        style={{ fontFamily: "Pretendard", fontSize: 9, color: COLORS.GRAY }}
      >
        북
      </SvgText>
      <SvgText
        x={210}
        y={45}
        style={{ fontFamily: "Pretendard", fontSize: 10, fontWeight: 700, color: COLORS.CORAL_DARK }}
      >
        {`일조권 손실 ${sunlightLoss.toFixed(1)}%`}
      </SvgText>
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
    <Page size="A4" style={styles.innerPage}>
      <FixedHeader input={input} brand={brand} />
      <FixedFooter input={input} />

      <PdfText style={styles.h2}>3. 비용·부담금 산정</PdfText>
      <View style={styles.h2Underline} />

      <PdfText style={styles.h3}>(a) 기본 건축비</PdfText>
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
          ["주차장 설치비", fmtEok(c.parkingCost)],
          ["설계·감리·인입·예비비", fmtEok(c.softCost)],
        ]}
      />

      {(c.farmEnabled || c.forestEnabled || c.devEnabled) && (
        <>
          <PdfText style={[styles.h3, { marginTop: 14 }]}>(b) 부담금 (활성 항목)</PdfText>
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

      <PdfText style={[styles.h3, { marginTop: 14 }]}>(c) 비용 분해 차트</PdfText>
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
          예상 총 사업비
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
    </Page>
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
  const max = Math.max(...items.map((i) => i.value));
  const rowH = 26;
  const top = 10;
  const h = top + items.length * rowH + 6;
  return (
    <Svg width="100%" height={h * 0.55} viewBox={`0 0 500 ${h}`}>
      {items.map((it, idx) => {
        const y = top + idx * rowH;
        const bar = max > 0 ? (it.value / max) * 280 : 0;
        return (
          <View key={idx}>
            <SvgText
              x={5}
              y={y + 14}
              style={{
                fontFamily: "Pretendard",
                fontSize: 9,
                color: COLORS.DARK,
              }}
            >
              {it.label}
            </SvgText>
            <Rect x={108} y={y} width={280} height={18} fill={COLORS.LIGHT_GRAY} rx={3} />
            <Rect x={108} y={y} width={bar} height={18} fill={it.color} rx={3} />
            <SvgText
              x={108 + bar + 4}
              y={y + 13}
              style={{
                fontFamily: "Pretendard",
                fontSize: 9,
                color: COLORS.DARK,
              }}
            >
              {fmtEok(it.value)}
            </SvgText>
          </View>
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
  return (
    <Page size="A4" style={styles.innerPage}>
      <FixedHeader input={input} brand={brand} />
      <FixedFooter input={input} />

      <PdfText style={styles.h2}>4. 부동산 IT 전문 종합 분석</PdfText>
      <View style={styles.h2Underline} />

      <PdfText style={styles.h3}>사업성 종합 평가</PdfText>
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

      <PdfText style={[styles.h3, { marginTop: 14 }]}>핵심 리스크 3가지</PdfText>
      {analysis.risks.map((r, i) => (
        <NumberedRow key={`r-${i}`} num={i + 1} text={r} accent={brand.primaryColor} />
      ))}

      <PdfText style={[styles.h3, { marginTop: 14 }]}>추천 검토 사항 3가지</PdfText>
      {analysis.recommendations.map((r, i) => (
        <NumberedRow key={`rec-${i}`} num={i + 1} text={r} accent={COLORS.CORAL} />
      ))}

      <PdfText style={[styles.h3, { marginTop: 14 }]}>평당 사업비 적정성</PdfText>
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

      <PdfText style={[styles.h3, { marginTop: 14 }]}>다음 단계 권고</PdfText>
      {analysis.nextSteps.map((step, i) => (
        <View
          key={`n-${i}`}
          wrap={false}
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
            ☐
          </PdfText>
          <PdfText
            style={{ ...styles.body, flex: 1, fontFamily: "Pretendard" }}
          >
            {step}
          </PdfText>
        </View>
      ))}

    </Page>
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
    <Page size="A4" style={styles.innerPage}>
      <FixedHeader input={input} brand={brand} />
      <FixedFooter input={input} />

      <PdfText style={styles.h2}>용도별 분양가·임대료 참고표</PdfText>
      <View style={styles.h2Underline} />
      <PdfText style={[styles.muted, { marginBottom: 10 }]}>
        국토교통부 실거래가 공개시스템 · 최근 {up.periodMonths}개월 ㎡당 중앙값의
        평당 환산 — 분양가·임대료 설정 참고용 (감정평가 아님)
      </PdfText>

      <PdfText style={styles.h3}>(a) 용도별 분양가 (매매 실거래)</PdfText>
      <TwoColTable rows={up.sale.map(priceRow)} />

      <PdfText style={[styles.h3, { marginTop: 14 }]}>
        (b) 용도별 임대료 (월세 실거래 · 평당 월세)
      </PdfText>
      <TwoColTable rows={up.rentMonthly.map(priceRow)} />

      <PdfText style={[styles.h3, { marginTop: 14 }]}>(c) 상업 층별 매매</PdfText>
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
    </Page>
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
  const p = input.profit;
  if (!p) return null;

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
    <Page size="A4" style={styles.innerPage}>
      <FixedHeader input={input} brand={brand} />
      <FixedFooter input={input} />

      <PdfText style={styles.h2}>4. 사업성 분석</PdfText>
      <View style={styles.h2Underline} />

      <PdfText style={styles.h3}>(a) 총 사업비 구성</PdfText>
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
            총 사업비
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

      <PdfText style={[styles.h3, { marginTop: 14 }]}>(b) 자금 조달 구조</PdfText>
      <View wrap={false} style={{ flexDirection: "row", gap: 8 }}>
        <ProfitMiniCard
          label="자기자본 (Equity)"
          value={fmtEok(p.equity)}
          sub={`총 사업비의 ${((p.equity / Math.max(1, p.totalProjectCost)) * 100).toFixed(0)}%`}
        />
        <ProfitMiniCard
          label={`대출 (LTV ${p.ltvRatio.toFixed(0)}%)`}
          value={fmtEok(p.loanAmount)}
          sub={`연 ${p.annualInterestRate}% · ${p.loanPeriodYears}년 · ${methodLabel}`}
        />
      </View>

      <PdfText style={[styles.h3, { marginTop: 14 }]}>(c) 예상 수익</PdfText>
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
            ? `분양 가능 면적 × 평당 ${p.salesPricePerPyeong.toLocaleString("ko-KR")}만원 × 분양률 ${p.salesRate}%`
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

      <PdfText style={[styles.h3, { marginTop: 14 }]}>(d) 수익률 지표</PdfText>
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
            IRR (내부수익률)
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

      <PdfText style={[styles.h3, { marginTop: 14 }]}>(e) 평당 마진 분석</PdfText>
      <View
        wrap={false}
        style={{ padding: 12, backgroundColor: COLORS.CREAM }}
      >
        <ProfitRow
          label="평당 사업비"
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
            <PdfText style={styles.h3}>
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

      {/* 경고/안내 */}
      {p.isLoss ? (
        <View
          wrap={false}
          style={{
            marginTop: 12,
            padding: 12,
            backgroundColor: "#FEF2F2",
            borderLeftWidth: 4,
            borderLeftColor: "#DC2626",
            borderLeftStyle: "solid",
          }}
        >
          <PdfText
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#991B1B",
              fontFamily: "Pretendard",
            }}
          >
            ⚠️ 손실 예상
          </PdfText>
          <PdfText
            style={{
              fontSize: 10,
              color: "#B91C1C",
              marginTop: 4,
              fontFamily: "Pretendard",
            }}
          >
            현재 가정으로는 순이익이 마이너스입니다. 분양가 상향, 공사비 절감,
            LTV 조정 등 재검토가 필요합니다.
          </PdfText>
        </View>
      ) : p.isHighRisk ? (
        <View
          wrap={false}
          style={{
            marginTop: 12,
            padding: 12,
            backgroundColor: "#FFFBEB",
            borderLeftWidth: 4,
            borderLeftColor: "#F59E0B",
            borderLeftStyle: "solid",
          }}
        >
          <PdfText
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#92400E",
              fontFamily: "Pretendard",
            }}
          >
            ⚠️ 손익분기 여유 부족
          </PdfText>
          <PdfText
            style={{
              fontSize: 10,
              color: "#B45309",
              marginTop: 4,
              fontFamily: "Pretendard",
            }}
          >
            손익분기 분양률({p.breakEvenSalesRate.toFixed(0)}%) 대비 가정
            분양률({p.salesRate}%)의 여유가 10% 미만입니다. 시장 변동 리스크에
            취약합니다.
          </PdfText>
        </View>
      ) : (
        <View
          wrap={false}
          style={{
            marginTop: 12,
            padding: 12,
            backgroundColor: "#F0FDF4",
            borderLeftWidth: 4,
            borderLeftColor: "#16A34A",
            borderLeftStyle: "solid",
          }}
        >
          <PdfText
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#15803D",
              fontFamily: "Pretendard",
            }}
          >
            ✅ 사업성 양호
          </PdfText>
          <PdfText
            style={{
              fontSize: 10,
              color: "#166534",
              marginTop: 4,
              fontFamily: "Pretendard",
            }}
          >
            현재 가정 기준 순이익 양수, 손익분기 여유 확보. 다만 실제 분양·
            공사비·금리 변동에 대비한 추가 시뮬레이션 권장.
          </PdfText>
        </View>
      )}
    </Page>
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

function AppendixPage({
  input,
  brand,
}: {
  input: ReportInputs;
  brand: BrandConfig;
}) {
  return (
    <Page size="A4" style={styles.innerPage}>
      <FixedHeader input={input} brand={brand} />
      <FixedFooter input={input} />

      <PdfText style={styles.h2}>5. 부록</PdfText>
      <View style={styles.h2Underline} />

      <PdfText style={styles.h3}>(a) 적용 법령</PdfText>
      <View
        wrap={false}
        style={{
          borderWidth: 1,
          borderColor: COLORS.LIGHT_GRAY,
          borderStyle: "solid",
          padding: 12,
        }}
      >
        {[
          "국토계획법 시행령 제30조 · 84조 · 85조",
          "건축법 제61조 + 시행령 제86조 (2023.9.12 개정 10m 기준)",
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

      <PdfText style={[styles.h3, { marginTop: 14 }]}>(b) 산정 공식</PdfText>
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

      <PdfText style={[styles.h3, { marginTop: 14 }]}>(c) 면책 조항</PdfText>
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
          본 보고서는 부동산공법 데이터 분석 도구의 산정 결과와 전문 종합
          분석을 기반으로 작성되었습니다. 최종 인허가·부담금·사업성은 관할
          행정청 확인 및 법률·세무 전문가 자문을 받아 결정하시기 바랍니다. 본
          자료는 참고용이며, 본 자료에 기반한 의사결정의 결과에 대해{" "}
          {brand.corporationName}는 책임을 지지 않습니다.
        </PdfText>
      </View>
    </Page>
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

function DetailRow({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <View
      wrap={false}
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
  const s = input.scale;
  const ft = s.floorTable!;
  const W = { floor: "12%", area: "30%", setback: "20%", note: "38%" };
  const pilotiDeduct = s.isReducingFloor1 ? s.groundParkingArea : 0;
  const overCov = s.legalCovMax != null && s.coverRatio > s.legalCovMax;
  const overFar = s.legalFarMax != null && s.floorRatio > s.legalFarMax;

  const legal = [
    { item: "용도지역", plan: s.zoneName, basis: s.ordinanceSource ?? "조회값", verdict: "—", over: false },
    { item: "건폐율", plan: s.coverRatio + "%", basis: "상한 " + (s.legalCovMax ?? "-") + "%", verdict: overCov ? "초과" : "적합", over: overCov },
    { item: "용적률", plan: s.floorRatio + "%", basis: "상한 " + (s.legalFarMax ?? "-") + "%", verdict: overFar ? "초과" : "적합", over: overFar },
    {
      item: "일조 높이제한",
      plan: s.sunlightApplied ? "적용 (정북 사선)" : "미적용",
      basis: "건축법 시행령 제86조① — 10m 이하 1.5m · 초과부 h/2 (전용·일반주거지역)",
      verdict: s.sunlightApplied ? "반영" : "해당 없음",
      over: false,
    },
    {
      item: "부설주차장",
      plan: s.parkingSpaces + "대 (지상 " + s.groundSpaces + " · 지하 " + s.basementSpaces + ")",
      basis: s.parkingBasisLabel ?? "-",
      verdict: "반영",
      over: false,
    },
    {
      item: "층수 · 높이",
      plan: (s.floorsExact ?? 0).toFixed(1) + "층 · " + ((s.floorsExact ?? 0) * (s.floorHeightM ?? 3.5)).toFixed(1) + "m",
      basis: "층고 " + (s.floorHeightM ?? 3.5) + "m 가정 · 가로구역별 높이제한 등은 별도 확인",
      verdict: "참고",
      over: false,
    },
  ];

  return (
    <Page size="A4" style={styles.innerPage}>
      <FixedHeader input={input} brand={brand} />
      <FixedFooter input={input} />

      <PdfText style={styles.h2}>2-1. 층별 개요 · 법규 검토</PdfText>
      <View style={styles.h2Underline} />

      <PdfText style={styles.h3}>(a) 층별 개요표</PdfText>
      <View style={{ borderWidth: 1, borderColor: COLORS.LIGHT_GRAY, borderStyle: "solid" }}>
        <DetailRow>
          <DetailCell header text="층" width={W.floor} align="center" />
          <DetailCell header text="바닥면적" width={W.area} align="center" />
          <DetailCell header text="정북 법정이격" width={W.setback} align="center" />
          <DetailCell header text="비고" width={W.note} />
        </DetailRow>
        {[...ft.rows].reverse().map((r) => (
          <DetailRow key={"f" + r.floor}>
            <DetailCell text={r.floor + "F"} width={W.floor} align="center" bold />
            <DetailCell text={formatArea(r.areaSqm)} width={W.area} align="right" />
            <DetailCell text={r.legalSetbackM > 0 ? r.legalSetbackM.toFixed(2) + "m" : "—"} width={W.setback} align="center" />
            <DetailCell text={r.note} width={W.note} color={COLORS.GRAY} />
          </DetailRow>
        ))}
        {ft.basement.map((b) => (
          <DetailRow key={"b" + b.level}>
            <DetailCell text={"B" + b.level} width={W.floor} align="center" bold color={COLORS.GRAY} />
            <DetailCell text={formatArea(b.areaSqm)} width={W.area} align="right" color={COLORS.GRAY} />
            <DetailCell text="—" width={W.setback} align="center" color={COLORS.GRAY} />
            <DetailCell text={b.note} width={W.note} color={COLORS.GRAY} />
          </DetailRow>
        ))}
        <DetailRow>
          <DetailCell text="지상 합계" width={W.floor} align="center" bold header />
          <DetailCell text={formatArea(ft.sumGroundSqm)} width={W.area} align="right" bold header />
          <DetailCell text="" width={W.setback} header />
          <DetailCell
            text={"법정 연면적 " + formatArea(s.legalFloorArea) + " 대비 손실 " + s.sunlightLoss.toFixed(1) + "%"}
            width={W.note}
            header
          />
        </DetailRow>
        {pilotiDeduct > 0 && (
          <DetailRow>
            <DetailCell text="" width={W.floor} />
            <DetailCell text={"− " + formatArea(pilotiDeduct)} width={W.area} align="right" color={COLORS.GRAY} />
            <DetailCell text="" width={W.setback} />
            <DetailCell text="필로티 주차 — 연면적 제외 (시행령 제119조①4)" width={W.note} color={COLORS.GRAY} />
          </DetailRow>
        )}
        <DetailRow last>
          <DetailCell text="" width={W.floor} />
          <DetailCell text={formatArea(s.actualFloorArea)} width={W.area} align="right" bold color={brand.primaryColor} />
          <DetailCell text="" width={W.setback} />
          <DetailCell text="✓ 실제 가능 연면적 (시뮬레이터 표시값과 동일)" width={W.note} bold color={brand.primaryColor} />
        </DetailRow>
      </View>
      <PdfText style={[styles.smallText, { marginTop: 4 }]}>
        {ft.precise
          ? "※ 실형상 정밀 계산 — 지적 폴리곤을 건폐율만큼 축소한 바닥판을 층별로 정북 인접 대지경계선 기준 법정 이격(제86조①)으로 클리핑해 산정했습니다. 화면 KPI·3D 매스와 동일 수식입니다."
          : "※ 층별 면적은 정북 깊이(√건축면적) 근사 모델로, 화면 KPI와 동일한 수식입니다. 지번 조회로 실형상을 반영하면 지적 폴리곤 기준 정밀 계산으로 전환됩니다."}
      </PdfText>

      <PdfText style={[styles.h3, { marginTop: 14 }]}>(b) 법규 검토표</PdfText>
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
          <PdfText style={styles.h3}>(c) 토지이용계획 지역·지구 등 (전체)</PdfText>
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
          <PdfText style={styles.h3}>(d) 북측 일조 영향 진단 — 동지 9~15시</PdfText>
          <View style={{ borderWidth: 1, borderColor: COLORS.LIGHT_GRAY, borderStyle: "solid" }}>
            <DetailRow>
              <DetailCell header text="북측 경계에서" width="25%" align="center" />
              <DetailCell header text="최장 연속 일조" width="25%" align="center" />
              <DetailCell header text="총 일조" width="25%" align="center" />
              <DetailCell header text="연속 2시간 기준" width="25%" align="center" />
            </DetailRow>
            {s.sunlightImpact.rows.map((r, i) => (
              <DetailRow key={r.offsetM} last={i === s.sunlightImpact!.rows.length - 1}>
                <DetailCell text={`${r.offsetM}m`} width="25%" align="center" bold />
                <DetailCell text={`${r.maxRunH}시간`} width="25%" align="center" />
                <DetailCell text={`${r.totalH}시간`} width="25%" align="center" color={COLORS.GRAY} />
                <DetailCell
                  text={r.pass ? "충족" : "미달"}
                  width="25%"
                  align="center"
                  bold
                  color={r.pass ? "#15803D" : "#DC2626"}
                />
              </DetailRow>
            ))}
          </View>
          <PdfText style={[styles.smallText, { marginTop: 4 }]}>
            ※ {s.sunlightImpact.basis}. 주변 기존 건물·지형은 미반영 — 계획 참고용이며 일조 분쟁 판단은 정밀 시뮬레이션·전문가 감정이 필요합니다.
          </PdfText>
        </View>
      )}

      <PdfText style={[styles.smallText, { marginTop: 4 }]}>
        ※ 판정은 입력값 기준 자동 검토이며 인허가 판단이 아닙니다. 지구단위계획·가로구역별 높이제한·문화재 앙각 등 개별 규제는 토지이음과 관할 지자체에서 별도 확인이 필요합니다.
      </PdfText>
    </Page>
  );
}


/* ── 📌 한눈에 보는 결론 — 숫자를 문장으로 풀어 비전문가도 바로 읽히게 ── */
function PlainSummaryBox({ input, brand }: { input: ReportInputs; brand: BrandConfig }) {
  const s = input.scale;
  const py = (sqm: number) => Math.round(sqm / 3.305785).toLocaleString();
  const floorsTxt = s.floorsExact
    ? (Number.isInteger(s.floorsExact) ? String(s.floorsExact) : s.floorsExact.toFixed(1))
    : "-";
  const totalEok = input.cost.total / 1e8;

  const lines: string[] = [];
  lines.push(
    `이 땅 ${py(s.landAreaSqm)}평에는 1층 바닥 ${py(s.buildingArea)}평(건폐율 ${s.coverRatio}%) 규모로 최대 ${floorsTxt}층까지 올릴 수 있습니다.`,
  );
  if (s.sunlightApplied && s.sunlightLoss > 0.05) {
    lines.push(
      `법으로 허용된 연면적은 ${py(s.legalFloorArea)}평이지만, 정북 일조사선으로 위층이 깎여 실제로는 ${py(s.actualFloorArea)}평(${s.sunlightLoss.toFixed(1)}% 손실)까지 지을 수 있습니다.`,
    );
  } else {
    lines.push(
      `이 용도지역은 일조 높이제한 대상이 아니어서, 법정 연면적 ${py(s.legalFloorArea)}평을 온전히 지을 수 있습니다.`,
    );
  }
  lines.push(
    `주차는 ${s.parkingSpaces}대(지상 ${s.groundSpaces} · 지하 ${s.basementSpaces})가 필요하고, 총 사업비는 약 ${totalEok.toFixed(1)}억원으로 추정됩니다.`,
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
        📌 한눈에 보는 결론
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


/* ── 🅿️ 주차장 산정 해설 — 대수·배치가 어떻게 나왔고 무엇을 의미하는지 ── */
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
        🅿️ 주차장 산정 해설
      </PdfText>
      <PdfText style={{ fontSize: 9.5, lineHeight: 1.55, color: COLORS.DARK, fontFamily: "Pretendard" }}>
        법정 대수 {s.parkingSpaces}대는 「{s.parkingBasisLabel ?? "용도별 설치 기준"}」으로 산정한 값입니다
        (주차장법 제19조·시행령 별표1, 지자체 주차 조례가 이를 강화할 수 있음).
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
