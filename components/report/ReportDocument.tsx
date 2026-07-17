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
      <CostPage input={input} brand={b} />
      {input.profit && <ProfitPage input={input} brand={b} />}
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
