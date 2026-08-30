/**
 * 부설주차장 주차대수 절감 검토
 *
 * 현행 법령(2026-08-28 시행) 원문 대조 기준:
 *  - 주차장법 제19조 (부설주차장의 설치·지정)
 *  - 주차장법 시행령 제6조 (설치기준) · 제7조 (인근 설치) · 제8조 (설치의무 면제 등)
 *  - 주차장법 시행령 별표1 (설치대상 시설물 종류 및 설치기준) 비고 1~15
 *
 * ⚠️ 조례 위임이 많은 영역이라, 각 항목은 "검토 단서"이지 확정 결론이 아니다.
 *    최종 적용 여부는 관할 시·군·구 조례와 사전협의로 확정해야 한다.
 */

export type TipStatus =
  /** 현재 입력값에서 바로 검토 실익이 있는 항목 */
  | "applicable"
  /** 조건을 갖추면 가능 — 조례·관할 협의 필요 */
  | "conditional"
  /** 지금 조건에는 해당 없음(참고용) */
  | "reference";

export interface ReductionTip {
  id: string;
  /** 목록 정렬용 — 낮을수록 먼저 */
  rank: number;
  title: string;
  /** 법령 근거 (조문까지 명시) */
  basis: string;
  /** 한 줄 요약 */
  summary: string;
  /** 실행 방법 */
  action: string;
  status: TipStatus;
  /** 이번 건에 적용했을 때의 대략적 효과 */
  effect?: string;
}

export interface ReductionContext {
  /** 법정 산정 주차대수(반올림 후) */
  spaces: number;
  /** 반올림 전 소수 대수 */
  rawSpaces: number;
  /** 주차 기준 용도 라벨 */
  usageLabel: string;
  /** 시설면적(㎡) — 주차시설 면적 제외 기준 */
  facilityAreaSqm: number;
  /** 지상 주차 대수 (1층 잠식분) */
  groundSpaces?: number;
  /** 1층 영업 가능 면적(㎡) */
  floor1IndoorSqm?: number;
}

/** 경형자동차 전용구획으로 인정 가능한 최대 대수 (별표1 비고12 — 전체의 10%) */
export function compactCarAllowance(spaces: number): number {
  if (spaces <= 0) return 0;
  return Math.floor(spaces * 0.1);
}

/**
 * 현재 산정 결과를 놓고 검토할 만한 절감 수단을 우선순위대로 돌려준다.
 * 숫자를 바꿔주는 게 아니라, "무엇을 확인하면 줄일 수 있는지"를 정리한다.
 */
export function buildReductionTips(ctx: ReductionContext): ReductionTip[] {
  const { spaces, rawSpaces, usageLabel, facilityAreaSqm } = ctx;
  const tips: ReductionTip[] = [];

  // ── 1. 경형자동차 전용구획 (별표1 비고12) — 조례 없이 바로 적용되는 가장 확실한 수단
  const compact = compactCarAllowance(spaces);
  tips.push({
    id: "compact",
    rank: 1,
    title: "경형자동차 전용구획 10% 활용",
    basis: "주차장법 시행령 별표1 비고 12",
    summary:
      "경형자동차 전용으로 설치한 주차단위구획은 전체 구획 수의 10%까지 설치기준에 따라 설치된 것으로 본다.",
    action:
      compact > 0
        ? `${spaces}대 중 ${compact}대까지 경형 전용구획으로 계획하면, 일반 구획(폭 2.5m×5.0m)보다 작은 경형 구획(2.0m×3.6m)으로 같은 법정 대수를 채울 수 있습니다. 대수 자체가 줄지는 않지만 주차장 소요면적이 줄어 1층 영업면적·지하 굴착량이 함께 줄어듭니다.`
        : "법정 대수가 10대 미만이라 경형 인정 구획이 나오지 않습니다(10대부터 1대 인정).",
    status: compact > 0 ? "applicable" : "reference",
    effect:
      compact > 0
        ? `경형 ${compact}대 적용 시 주차구획 면적 약 ${Math.round(compact * 5.3)}㎡ 절감 여지 (일반형 12.5㎡ → 경형 7.2㎡, 차로 면적은 별도)`
        : undefined,
  });

  // ── 2. 총 1대 미만이면 0대 (별표1 비고6 단서) — 소규모의 완전 면제
  const under1 = rawSpaces > 0 && rawSpaces < 1;
  tips.push({
    id: "under-one",
    rank: 2,
    title: "총 주차대수 1대 미만 → 0대 처리",
    basis: "주차장법 시행령 별표1 비고 6 단서",
    summary:
      "시설물 전체에 설치기준을 적용해 산정한 총주차대수가 1대 미만이면 주차대수를 0으로 본다.",
    action: under1
      ? `현재 산정값이 ${rawSpaces.toFixed(2)}대로 1대 미만이라 부설주차장 설치의무가 없습니다. 다만 증축·용도변경으로 1대를 넘기면 즉시 의무가 생기니 여유를 확인하세요.`
      : `현재 산정값 ${rawSpaces.toFixed(2)}대로 1대 이상이라 해당하지 않습니다. 규모를 줄여 1대 미만으로 맞추는 방식은 사업성과 함께 따져야 합니다.`,
    status: under1 ? "applicable" : "reference",
  });

  // ── 3. 시설면적에서 주차시설 면적 제외 (별표1 비고2) — 실무에서 자주 놓치는 계산 기초
  tips.push({
    id: "exclude-parking-area",
    rank: 3,
    title: "산정 모수에서 주차시설 면적 제외",
    basis: "주차장법 시행령 별표1 비고 2",
    summary:
      "시설면적은 바닥면적 합계이되, 시설물 안의 주차를 위한 시설의 바닥면적은 시설면적에서 제외한다.",
    action: `지하주차장·필로티 주차 면적을 연면적에 그대로 넣고 산정하면 주차대수가 과다 산정됩니다. 현재 시설면적 ${Math.round(
      facilityAreaSqm,
    ).toLocaleString()}㎡ 기준이 주차시설을 뺀 값인지 확인하세요. 주차 램프·차로도 주차를 위한 시설에 포함됩니다.`,
    status: "applicable",
  });

  // ── 4. 용도 구성 재검토 (별표1 본문) — 설계 단계에서 가장 큰 폭으로 움직임
  tips.push({
    id: "usage-mix",
    rank: 4,
    title: "용도 구성 재검토 (기준 배수 차이 활용)",
    basis: "주차장법 시행령 별표1 (시설물 종류별 설치기준)",
    summary:
      "같은 면적이라도 용도에 따라 위락 100㎡/대 ~ 창고·기숙사·데이터센터 400㎡/대로 4배까지 차이가 난다.",
    action: `현재 «${usageLabel}» 기준으로 산정 중입니다. 근생(200㎡/대)·업무(150㎡/대)·창고(400㎡/대)처럼 기준이 낮은 용도의 비중을 조정하면 대수가 크게 줄어듭니다. 복합용도는 용도별로 소수점 첫째자리까지 산정해 합산합니다(비고 4).`,
    status: "applicable",
  });

  // ── 5. 조례 완화 (영 §6②) — 1/2 범위
  tips.push({
    id: "ordinance-relax",
    rank: 5,
    title: "지자체 조례 완화 규정 확인 (±1/2)",
    basis: "주차장법 시행령 제6조 제2항",
    summary:
      "지자체는 별표1 설치기준의 2분의 1 범위에서 조례로 강화하거나 완화할 수 있고, 구역별로 다르게 정할 수 있다.",
    action:
      "서울처럼 강화하는 지역이 있는 반면, 주차난이 없는 지역·구역은 완화하는 경우가 있습니다. 관할 시·군·구 주차장 조례에서 해당 용도·구역의 완화 조항을 반드시 확인하세요. 역세권·대중교통 중심지에 별도 완화를 두는 조례도 있습니다.",
    status: "conditional",
  });

  // ── 6. 인근 부설주차장 (법 §19④, 영 §7)
  const canOffsite = spaces <= 300;
  tips.push({
    id: "offsite",
    rank: 6,
    title: "부지 인근에 부설주차장 설치",
    basis: "주차장법 제19조 제4항 · 시행령 제7조",
    summary:
      "주차대수 300대 이하면 시설물 부지가 아닌 인근에 단독·공동으로 설치할 수 있다. 범위는 직선 300m 또는 도보 600m 이내에서 조례로 정한다.",
    action: canOffsite
      ? `현재 ${spaces}대로 300대 이하라 검토 대상입니다. 부지 안 주차를 줄이고 인근 대지에 확보하면 1층 영업면적과 지하층 공사비를 줄일 수 있습니다. 다만 그 부지의 소유권을 취득해 주차장 전용으로 제공해야 합니다(별표1 비고 3).`
      : `현재 ${spaces}대로 300대를 초과해 원칙적으로 해당하지 않습니다. 다만 접한 대지·통로 연결 대지, 12m 이하 도로 맞은편 등은 300대 제한 없이 가능합니다(영 §7①).`,
    status: canOffsite ? "conditional" : "reference",
  });

  // ── 7. 설치의무 면제 + 설치비용 납부 (법 §19⑤, 영 §8)
  tips.push({
    id: "exemption-fee",
    rank: 7,
    title: "설치의무 면제 후 설치비용 납부로 갈음",
    basis: "주차장법 제19조 제5항 · 시행령 제8조",
    summary:
      "차량통행 금지 장소나 간선도로변 혼잡 우려 지역 등에서 300대 이하이면, 설치비용을 납부하고 설치의무를 갈음할 수 있다.",
    action:
      "위치 요건(통행금지·간선도로변 혼잡 인정)과 용도·규모 요건을 함께 충족해야 합니다. 연면적 1만㎡ 이상 판매·운수시설이거나 1만5천㎡ 이상 문화집회(공연·집회·관람)·위락·숙박·업무시설이면 제외됩니다. 납부 시 노외주차장 무상사용권을 받을 수 있습니다(법 §19⑥).",
    status: spaces <= 300 ? "conditional" : "reference",
  });

  // ── 8. 증축·용도변경은 증가분만 (영 §6④, 별표1 비고5·7)
  tips.push({
    id: "change-of-use",
    rank: 8,
    title: "증축·용도변경은 증가분에만 부과",
    basis: "주차장법 시행령 제6조 제4항 · 별표1 비고 5·7",
    summary:
      "용도변경·증축으로 추가할 주차대수는 변경·증가하는 부분에만 기준을 적용해 산정한다. 사용승인 후 5년이 지난 연면적 1천㎡ 미만 건축물은 추가 확보 없이 용도변경할 수 있다(일부 용도 제외).",
    action:
      "신축 대신 기존 건물 활용을 검토할 여지가 있습니다. 다만 5년·1천㎡ 특례는 공연장·집회장·관람장·위락시설·다세대·다가구로의 변경에는 적용되지 않습니다. 같은 건물 안 용도 상호변경도 기준이 높은 용도의 면적이 늘지 않으면 추가 확보가 없습니다.",
    status: "reference",
  });

  // ── 9. 기계식주차장 (영 §6①4호)
  tips.push({
    id: "mechanical",
    rank: 9,
    title: "기계식주차장 설치 시 별도 기준",
    basis: "주차장법 시행령 제6조 제1항 제4호",
    summary:
      "기계식주차장을 설치하는 경우, 지역의 주차장 확보율·이용 실태·교통 여건을 고려해 조례로 별표1과 다른 기준을 정할 수 있다.",
    action:
      "같은 면적에 더 많은 대수를 넣어 부지 여유를 확보하는 방식입니다. 다만 설치비·유지관리비와 이용 편의(회전율) 저하를 함께 따져야 하고, 조례에 별도 기준이 있는지 먼저 확인해야 합니다.",
    status: "conditional",
  });

  // ── 10. 설치의무 자체가 없는 시설물 (별표1 비고1)
  tips.push({
    id: "excluded-facility",
    rank: 10,
    title: "부설주차장을 두지 않아도 되는 시설물",
    basis: "주차장법 시행령 별표1 비고 1",
    summary:
      "변전소·양수장·정수장·대피소·공중화장실, 수도원·수녀원·사당, 동식물 관련 시설, 송수신·중계시설, 도시철도 역사, 전통한옥 밀집지역의 전통한옥 등은 설치하지 않을 수 있다.",
    action:
      "해당 용도가 계획에 포함된다면 그 부분은 산정에서 제외되는지 확인하세요. 복합용도라면 제외 대상 면적을 분리해 산정해야 합니다.",
    status: "reference",
  });

  return tips.sort((a, b) => {
    const order: Record<TipStatus, number> = {
      applicable: 0,
      conditional: 1,
      reference: 2,
    };
    const d = order[a.status] - order[b.status];
    return d !== 0 ? d : a.rank - b.rank;
  });
}

export const TIP_STATUS_LABEL: Record<TipStatus, string> = {
  applicable: "바로 검토",
  conditional: "조건부 가능",
  reference: "참고",
};
