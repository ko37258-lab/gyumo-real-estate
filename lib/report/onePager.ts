// 한장 요약 보고서(A4 가로)에 들어갈 값 — ReportInputs 하나만 받아 표시용 문자열로 바꾼다. (2026-09-21)
//
// 원칙(2026-09-18 규모 일관성 작업과 동일):
//  - 계산은 여기서 하지 않는다. buildReportInputs(=computePlan 단일 계산원)가 만든 값만 표시한다.
//  - 확인되지 않은 값을 확정형으로 쓰지 않는다. "추정"·"미확인"·출처를 그대로 달고 나간다.

import type { ReportInputs } from "@/lib/ai/types";
import { formatArea, sqmToPyeong } from "@/lib/utils/area";
import { AREA_TERMS } from "@/lib/report/areaTerms";
import { buildReportTitle, type AddressStatus } from "@/lib/report/dataStatus";
import { describeParkingNote } from "@/lib/report/parkingNote";
import { groupFloorRows } from "@/lib/report/floorTable";

export interface OnePagerRow {
  label: string;
  value: string;
  /** 값 아래 작은 글씨 — 출처·전제 */
  note?: string;
}

export interface OnePagerKpi {
  label: string;
  value: string;
  sub?: string;
}

export interface OnePagerFields {
  title: string;
  subtitle: string;
  /** 조회 전(예시값·미조회 입력)이면 true — 상단에 눈에 띄는 배지를 그려야 한다 */
  showUnverifiedBadge: boolean;
  /** 배지 문구 (showUnverifiedBadge=false면 null) */
  badgeLabel: string | null;
  addressStatus: AddressStatus;
  kpis: OnePagerKpi[];
  landRows: OnePagerRow[];
  scaleRows: OnePagerRow[];
  /** 층별 개요 — 상세 보고서(FloorDetailPage)와 같은 floorTable·같은 그룹화 규칙에서 파생 */
  floorRows: OnePagerRow[];
  /** floorRows에서 자르고 남은(표시 안 한) 구간 수 — "외 N건" 표시용 */
  floorRowsOmitted: number;
  costRows: OnePagerRow[];
  verdict?: { kind: "hold" | "loss" | "risk" | "ok"; title: string; reason?: string };
  /** 하단 "확인 전 전제" 목록 */
  cautions: string[];
  reviewDate: string;
}

const num = (v: number, d = 0) =>
  v.toLocaleString("ko-KR", { minimumFractionDigits: d, maximumFractionDigits: d });

export const eok = (won: number): string =>
  Math.abs(won) >= 1e8
    ? `${(won / 1e8).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억원`
    : `${num(Math.round(won / 1e4))}만원`;

/** 층별 개요(요약) 비고 압축 — 괄호 안 법령 근거는 떼고 핵심(용도·부분층)만 남긴다. */
const MAX_FLOOR_NOTE_LEN = 26;
function shortenFloorNote(note: string): string {
  const base = note.split(" (")[0];
  return base.length > MAX_FLOOR_NOTE_LEN ? `${base.slice(0, MAX_FLOOR_NOTE_LEN - 1)}…` : base;
}

const LOT_SOURCE_LABEL: Record<string, string> = {
  official: "공부(토지대장) 면적",
  input: "직접 입력",
  default: "기본값 — 지번 조회 전",
};

const PLACEMENT_LABEL: Record<string, string> = {
  none: "없음",
  basement: "지하",
  above: "지상",
  mixed: "지상+지하",
};

export function buildOnePagerFields(input: ReportInputs): OnePagerFields {
  const s = input.scale;
  const land = input.land;
  const addr = (input.address || land?.address || "").trim();

  // 조회 전(예시값·미조회 입력)이면 주소를 제목으로 쓰지 않는다 — lib/report/dataStatus 단일 판정원.
  // buildInput.ts가 채운 input.addressStatus 가 있으면 그대로, 없으면(테스트 등) 기존처럼 주소를 신뢰한다.
  const addressStatus = input.addressStatus ?? "fetched";
  const titleInfo = buildReportTitle({ status: addressStatus, address: addr });
  const title = titleInfo.title;
  const subtitle = [
    s.zoneName,
    `대지 ${formatArea(s.landAreaSqm, 1)}`,
    `건폐율 ${num(s.coverRatio)}% · 용적률 ${num(s.floorRatio)}%`,
  ]
    .filter(Boolean)
    .join("  ·  ");

  /* ── 핵심 4칸 ── */
  const kpis: OnePagerKpi[] = [
    {
      label: AREA_TERMS.buildingFootprint,
      value: `${num(s.buildingArea, 1)}㎡`,
      sub: `${num(sqmToPyeong(s.buildingArea))}평 · 건폐율 ${num(s.coverRatio)}% 적용`,
    },
    {
      // ⚠️ 이 값은 "지상 연면적"(aboveGroundGfa, 주차 포함)이 아니라 지상 부속주차를
      // 제외한 용적률 산정용 추정치다 — 라벨을 AREA_TERMS.farEstimateGfa로 고정해
      // 다른 화면·상세 보고서와 같은 이름을 쓴다(과거 "지상 연면적(추정)"으로 표기되어
      // 값과 이름이 어긋났던 문제). 이름 안에 이미 "추정"이 있으니 "(추정)"을 또 붙이지 않는다.
      label: AREA_TERMS.farEstimateGfa,
      value: `${num(s.actualFloorArea, 1)}㎡`,
      sub: `${num(sqmToPyeong(s.actualFloorArea))}평 · ${AREA_TERMS.farCapGfa} ${num(s.legalFloorArea, 1)}㎡`,
    },
    {
      label: "층수 · 높이",
      value: s.floorLabel ?? `지상 ${num(s.floorsExact ?? 0, 1)}층`,
      sub: s.heightM ? `약 ${num(s.heightM, 1)}m (지표면 기준)` : undefined,
    },
    {
      label: "법정 주차",
      value: `${num(s.parkingSpaces)}대`,
      sub: s.parkingRoundingNote ?? s.parkingBasisLabel,
    },
  ];

  /* ── 토지 ── */
  const landRows: OnePagerRow[] = [];
  landRows.push({
    label: "대지면적",
    value: formatArea(s.landAreaSqm, 1),
    note: LOT_SOURCE_LABEL[s.lotAreaSource ?? "input"],
  });
  landRows.push({ label: "용도지역", value: s.zoneName, note: s.ordinanceSource });
  if (land?.jimok) landRows.push({ label: "지목", value: land.jimok });
  if (land?.landUseSituation)
    landRows.push({ label: "이용상황", value: land.landUseSituation });
  if (land?.publicPricePerSqm) {
    const total = land.publicPricePerSqm * (land.areaSqm || s.landAreaSqm);
    landRows.push({
      label: "공시지가",
      value: `${num(land.publicPricePerSqm)}원/㎡`,
      note: `${land.publicPriceYear ?? ""} 기준 · 총 ${eok(total)}`.trim(),
    });
  }
  if (land?.landShape || land?.landHeight)
    landRows.push({
      label: "형상 · 지세",
      value: [land?.landShape, land?.landHeight].filter(Boolean).join(" · "),
    });
  landRows.push({
    label: "도로 폭(가정)",
    value: `${num(s.roadWidth, 1)}m`,
    note:
      s.roadWidthSource === "input"
        ? "직접 입력"
        : "현황 미확인 — 도로대장·현황측량 확인 필요",
  });
  if (land?.roadSide) landRows.push({ label: "도로접면", value: land.roadSide });
  if (land?.landTrades) {
    const t = land.landTrades;
    landRows.push({
      label: "인근 토지 실거래",
      value: `${num(t.medianUnitWon)}원/㎡ (중앙값)`,
      note: `${t.basis} · ${t.sampleCount}건/${t.periodMonths}개월 · 추정 토지가 ${eok(t.estimatedPrice)}`,
    });
  }

  /* ── 규모 ── */
  const scaleRows: OnePagerRow[] = [];
  scaleRows.push({
    label: AREA_TERMS.buildingFootprint,
    value: `${num(s.buildingArea, 1)}㎡`,
    note: `건폐율 ${num(s.coverRatio)}% 적용 (상한 ${num(s.legalCovMax ?? s.coverRatio)}%)`,
  });
  scaleRows.push({
    label: AREA_TERMS.farCapGfa,
    value: `${num(s.legalFloorArea, 1)}㎡`,
    note: `용적률 ${num(s.floorRatio)}% (상한 ${num(s.legalFarMax ?? s.floorRatio)}%)`,
  });
  scaleRows.push({
    label: AREA_TERMS.farEstimateGfa,
    value: `${num(s.actualFloorArea, 1)}㎡`,
    note:
      s.sunlightApplied && s.sunlightLoss > 0
        ? `정북 일조 적용 — 상한 대비 ${num(s.sunlightLoss, 1)}% 감소`
        : "지상 층별 바닥면적 합",
  });
  if (s.totalFloorArea)
    scaleRows.push({
      label: AREA_TERMS.totalGfa,
      value: `${num(s.totalFloorArea, 1)}㎡`,
      note: s.basementLevels?.length
        ? `지하 ${s.basementLevels.length}개 층 포함`
        : undefined,
    });
  scaleRows.push({
    label: "층수 · 높이",
    value: `${s.floorLabel ?? `${num(s.floorsExact ?? 0, 1)}층`}${s.heightM ? ` · ${num(s.heightM, 1)}m` : ""}`,
    note: s.heightNote ?? (s.floorHeightM ? `기준층 층고 ${num(s.floorHeightM, 1)}m 가정` : undefined),
  });
  // 주차는 대수·배치를 한 줄로 합친다 (한장 보고서는 줄 수가 곧 페이지 수)
  // 설명 문구는 실제 배치 형식에 맞춰 생성(lib/report/parkingNote 단일 출처) — 지하 전량 배치인데
  // "1층 필로티 가정"이 남아 있던 문제(필로티는 지상 배치일 때만 의미가 있다)를 여기서 고친다.
  scaleRows.push({
    label: "법정 주차",
    value:
      `${num(s.parkingSpaces)}대` +
      (s.parkingPlacement !== "none"
        ? ` · ${PLACEMENT_LABEL[s.parkingPlacement] ?? s.parkingPlacement} (지상 ${num(s.groundSpaces)}/지하 ${num(s.basementSpaces)})`
        : ""),
    note: describeParkingNote(s),
  });
  if (s.sunlightApplied)
    scaleRows.push({
      label: "정북 일조 기준",
      value: s.sunlightRule === "revised" ? "개정 후 (2026.11.12 시행)" : "개정 전",
      note: s.ruleBasisDate
        ? `${s.ruleBasisDate} 기준${s.ruleBasisIsPermitDate ? " (허가 신청 예정일)" : " (검토일)"}`
        : undefined,
    });

  /* ── 층별 개요(요약) ── 상세 보고서(ReportDocument FloorDetailPage)와 같은 floorTable ·
     같은 groupFloorRows 규칙에서 파생한다 — 두 보고서의 층별 숫자가 서로 어긋나지 않게. */
  const floorRowsAll: OnePagerRow[] = [];
  if (s.floorTable) {
    const ft = s.floorTable;
    const groundGroups = groupFloorRows(
      [...ft.rows].reverse().map((r) => ({
        label: `${r.floor}F`,
        area: r.areaSqm,
        setback: r.legalSetbackM,
        note: r.note,
      })),
    );
    const basementGroups = groupFloorRows(
      ft.basement.map((b) => ({ label: `B${b.level}`, area: b.areaSqm, setback: 0, note: b.note })),
    );
    for (const g of [...groundGroups, ...basementGroups]) {
      floorRowsAll.push({
        label: g.label,
        value: `${num(g.area, 1)}㎡${g.count > 1 ? ` ×${g.count}개 층` : ""}`,
        // 한장 보고서는 줄 수가 곧 공간이라 법령 근거 괄호는 떼고 용도·부분층만 남긴다
        // (전체 근거는 상세 보고서 층별표에 그대로 있다 — 상세 보고서는 그대로 두었다).
        note: shortenFloorNote(g.note),
      });
    }
  }
  const FLOOR_ROWS_MAX = 6;
  const floorRows = floorRowsAll.slice(0, FLOOR_ROWS_MAX);
  const floorRowsOmitted = Math.max(0, floorRowsAll.length - FLOOR_ROWS_MAX);

  /* ── 비용·사업성 ── */
  const costRows: OnePagerRow[] = [];
  if (input.includeCostPage !== false && input.cost) {
    const c = input.cost;
    costRows.push({
      label: "건축·부대비 + 부담금",
      value: eok(c.total),
      note: `지상 ${num(c.abovePyeong)}평 · 지하 ${num(c.basementPyeong)}평 (토지비·금융비 제외)`,
    });
  }
  const p = input.profit;
  if (p) {
    // 토지비는 총사업비 설명 줄에 넣고 행 하나를 아껴 세전이익까지 한 장에 담는다
    costRows.push({
      label: "총사업비",
      value: eok(p.totalProjectCost),
      note: `토지 ${eok(p.landCost)} 포함 · 자기자본 ${eok(p.equity)} / 대출 ${eok(p.loanAmount)}${p.ltcPct ? ` (LTC ${num(p.ltcPct, 1)}%)` : ""}`,
    });
    costRows.push({
      label: "예상 매출",
      value: eok(p.totalRevenue),
      note: `분양률 ${num(p.salesRate)}% 가정 · 평당 ${num(p.salesPricePerPyeong)}만원`,
    });
    costRows.push({
      label: "세전이익",
      value: eok(p.profitBeforeTax),
      note: `손익분기 분양률 ${num(p.breakEvenSalesRate, 1)}%`,
    });
  }

  const verdict = p?.verdict
    ? { kind: p.verdict.kind, title: p.verdict.title, reason: p.verdict.reasons[0] }
    : undefined;

  /* ── 확인 전 전제 ── */
  const cautions: string[] = [];
  if (s.lotAreaSource === "default")
    cautions.push("대지면적이 기본값입니다 — 토지대장 면적으로 확인 필요");
  if (s.roadWidthSource !== "input")
    cautions.push(`도로 폭 ${num(s.roadWidth, 1)}m는 가정값 — 현황 확인 필요`);
  if (s.constraints && !s.constraints.fetched) cautions.push("토지이용계획 미조회");
  for (const c of s.constraints?.items ?? []) cautions.push(`${c.label} — ${c.effect}`);
  for (const w of s.parkingWarnings ?? []) cautions.push(w);
  for (const a of s.alwaysUnverified ?? []) cautions.push(`${a.label} 미반영 (${a.where})`);

  return {
    title,
    subtitle,
    showUnverifiedBadge: !titleInfo.isVerified,
    badgeLabel: titleInfo.badgeLabel,
    addressStatus,
    kpis,
    landRows,
    scaleRows,
    floorRows,
    floorRowsOmitted,
    costRows,
    verdict,
    cautions,
    reviewDate: input.reviewDate,
  };
}
