"use client";

// 아파트 단지 일조 검토 보고서 (PDF, A4 1~2쪽)
// 계산은 lib/calc/aptSunlight.ts 결과를 그대로 싣는다 — 여기서 다시 계산하지 않는다.

import { Document, Image as PdfImage, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { ensurePdfFonts } from "@/lib/pdf/fonts";
import { COLORS } from "@/lib/pdf/tokens";
import type { BrandConfig } from "@/lib/branding/types";

ensurePdfFonts();

export interface AptSunReportInput {
  placeTitle: string;
  address: string;
  reviewDate: string;
  /** 3D 캡처 — 동지 9시·12시·15시 (JPEG data URL) */
  snapshots: Array<{ label: string; dataUrl: string }>;
  rows: Array<{ label: string; floors: number; maxRunH: number; totalH: number; grade: string; color: string }>;
  summary: { pass: number; total: number; avg: number };
  /** 단지 동 판별 방식 설명 */
  selection: string;
  basis: string;
}

const F = "Pretendard";
const s = StyleSheet.create({
  page: { paddingTop: 30, paddingBottom: 30, paddingLeft: 28, paddingRight: 28, fontFamily: F, color: COLORS.DARK },
  band: { marginLeft: -28, marginRight: -28, marginTop: -30, paddingHorizontal: 28, paddingTop: 16, paddingBottom: 12, marginBottom: 16 },
  bandTitle: { color: "white", fontSize: 10, letterSpacing: 1.5, fontFamily: F },
  bandSub: { color: COLORS.CORAL_LIGHT, fontSize: 8, marginTop: 3, fontFamily: F },
  h1: { fontSize: 18, fontWeight: 700, marginBottom: 4, fontFamily: F },
  meta: { fontSize: 9, color: COLORS.GRAY, marginBottom: 12, fontFamily: F },
  h3: { fontSize: 11, fontWeight: 700, marginTop: 12, marginBottom: 5, fontFamily: F },
  table: { borderWidth: 1, borderColor: COLORS.LIGHT_GRAY, borderStyle: "solid" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLORS.LIGHT_GRAY, borderBottomStyle: "solid" },
  th: { padding: 5, fontSize: 8.5, fontWeight: 700, backgroundColor: COLORS.CREAM, fontFamily: F },
  td: { padding: 5, fontSize: 8.5, fontFamily: F },
  kpi: { flex: 1, borderWidth: 1, borderColor: COLORS.LIGHT_GRAY, borderStyle: "solid", borderRadius: 4, padding: 10 },
  kpiLabel: { fontSize: 8.5, color: COLORS.GRAY, fontFamily: F },
  kpiValue: { fontSize: 16, fontWeight: 700, marginTop: 3, fontFamily: F },
  muted: { fontSize: 8, color: COLORS.GRAY, lineHeight: 1.5, fontFamily: F },
  body: { fontSize: 9, lineHeight: 1.55, fontFamily: F },
  footer: { position: "absolute", bottom: 12, left: 28, right: 28, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: COLORS.LIGHT_GRAY, paddingTop: 5 },
  swatch: { width: 8, height: 8, borderRadius: 2, marginRight: 4, marginTop: 1 },
});

export function AptSunlightDocument({ input, brand }: { input: AptSunReportInput; brand: BrandConfig }) {
  const { summary } = input;
  return (
    <Document title={`아파트 일조 검토 보고서 ${input.placeTitle}`} author={`${brand.brandTagline} 시뮬레이터`}>
      <Page size="A4" style={s.page} wrap>
        <View style={[s.band, { backgroundColor: brand.primaryColor }]} fixed>
          <Text style={s.bandTitle}>{brand.companyNameEn} · {brand.brandTaglineEn}</Text>
          <Text style={s.bandSub}>APARTMENT SUNLIGHT REVIEW · 동지 9~15시 연속 일조</Text>
        </View>

        <Text style={s.h1}>아파트 단지 일조 검토 보고서</Text>
        <Text style={s.meta}>
          대상: {input.placeTitle}{input.address ? ` (${input.address})` : ""} · 검토일 {input.reviewDate}
        </Text>

        <View style={{ flexDirection: "row", gap: 8 }} wrap={false}>
          <View style={[s.kpi, { backgroundColor: brand.primaryColor, borderColor: brand.primaryColor }]}>
            <Text style={[s.kpiLabel, { color: COLORS.CORAL_LIGHT }]}>검토 동 수</Text>
            <Text style={[s.kpiValue, { color: "white" }]}>{summary.total}동</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>연속 2시간 이상 (판례 수인한도)</Text>
            <Text style={s.kpiValue}>{summary.pass} / {summary.total}동</Text>
            <Text style={s.kpiLabel}>{summary.total ? Math.round((summary.pass / summary.total) * 100) : 0}%</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>동별 최장 연속 일조 평균</Text>
            <Text style={[s.kpiValue, { color: summary.avg >= 2 ? "#2e7d32" : "#B91C1C" }]}>{summary.avg.toFixed(1)}시간</Text>
            <Text style={s.kpiLabel}>동지 09~15시 · 1층 기준</Text>
          </View>
        </View>

        {input.snapshots.length > 0 && (
          <View wrap={false}>
            <Text style={s.h3}>1. 시간대별 햇빛 · 그림자 (동지)</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {input.snapshots.map((sn) => (
                <View key={sn.label} style={{ flex: 1 }}>
                  <PdfImage src={sn.dataUrl} style={{ width: "100%", height: 112, objectFit: "cover", borderRadius: 3 }} />
                  <Text style={[s.muted, { marginTop: 2, textAlign: "center" }]}>{sn.label}</Text>
                </View>
              ))}
            </View>
            <Text style={[s.muted, { marginTop: 3 }]}>
              건물 색 = 동별 등급(진녹 4h 이상 · 녹 2h 이상 · 주황 1h 이상 · 빨강 1h 미만). 흰색은 단지 밖 건물. 상단 N = 정북.
            </Text>
          </View>
        )}

        <View>
          <View wrap={false}>
            <Text style={s.h3}>2. 동별 동지 일조 (09~15시, 1층 창 높이)</Text>
            <View style={[s.row, s.table, { borderBottomWidth: 0 }]}>
              <Text style={[s.th, { width: "22%" }]}>동</Text>
              <Text style={[s.th, { width: "12%", textAlign: "right" }]}>층수</Text>
              <Text style={[s.th, { width: "20%", textAlign: "right" }]}>최장 연속 일조</Text>
              <Text style={[s.th, { width: "18%", textAlign: "right" }]}>총 일조</Text>
              <Text style={[s.th, { width: "28%" }]}>등급</Text>
            </View>
          </View>
          <View style={[s.table, { borderTopWidth: 0 }]}>
            {input.rows.map((r, i) => (
              <View key={i} style={[s.row, i === input.rows.length - 1 ? { borderBottomWidth: 0 } : {}]} wrap={false}>
                <Text style={[s.td, { width: "22%", fontWeight: 700 }]}>{r.label}</Text>
                <Text style={[s.td, { width: "12%", textAlign: "right" }]}>{r.floors}층</Text>
                <Text style={[s.td, { width: "20%", textAlign: "right", fontWeight: 700 }]}>{r.maxRunH.toFixed(2)}h</Text>
                <Text style={[s.td, { width: "18%", textAlign: "right" }]}>{r.totalH.toFixed(2)}h</Text>
                <View style={{ width: "28%", flexDirection: "row", alignItems: "center", padding: 5 }}>
                  <View style={[s.swatch, { backgroundColor: r.color }]} />
                  <Text style={{ fontSize: 8.5, fontFamily: F }}>{r.grade}</Text>
                </View>
              </View>
            ))}
          </View>
          <Text style={[s.muted, { marginTop: 3 }]}>
            ※ 각 동의 외벽면 중 가장 유리한 면(보통 남향) 기준. 연속 = 그림자 없이 이어진 최장 시간, 총 = 9~15시 중 햇빛이 든 시간 합계.
          </Text>
        </View>

        <View wrap={false}>
          <Text style={s.h3}>3. 검토 조건 · 방법</Text>
          <Text style={s.body}>· 단지 동 판별: {input.selection}</Text>
          <Text style={s.body}>· 건물 형상: 국토정보 건물 폴리곤 + 지상 층수 × 3.0m(아파트 층고 근사). 위성 바닥은 VWorld.</Text>
          <Text style={s.body}>· 태양 위치: 동지 적위 −23.44°, 한국표준시 기준 경도 보정, 균시차 생략(±15분).</Text>
          <Text style={s.body}>· 일조 판정: {input.basis}.</Text>
          <Text style={s.body}>· 기준: 대법원 판례가 확립한 수인한도(동짓날 9~15시 사이 연속 2시간, 또는 8~16시 사이 총 4시간) 중 연속 2시간을 등급의 기준선으로 삼았다. 건축법 시행령 제86조 제3항 제2호도 같은 시간대를 인용한다.</Text>
        </View>

        <View wrap={false} style={{ marginTop: 12, padding: 9, backgroundColor: COLORS.CREAM, borderLeftWidth: 3, borderLeftColor: brand.primaryColor, borderLeftStyle: "solid" }}>
          <Text style={s.muted}>
            본 보고서는 {brand.companyName} 부동산공법 시뮬레이터가 공개 공간정보로 산정한 참고 자료입니다. 지형·수목·발코니·창 위치·실제 층고를 반영하지 않으며, 일조권 분쟁·인허가·감정의 근거가 아닙니다. 정밀 판단은 전문 일조 시뮬레이션과 현장 측정이 필요합니다. 작성: {brand.brandTagline} {brand.authorName} · 법률자문: {brand.legalAdvisor}
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.muted}>{brand.corporationName} · 아파트 일조 검토 보고서 · {input.reviewDate}</Text>
          <Text style={s.muted} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
