// 규모에 영향을 주지만 이 도구가 자동 반영하지 못하는 규제 — "미확인" 목록 (2026-09-18)
//
// 원칙: 목록에 하나라도 있으면 규모·사업성 결론을 확정형으로 쓰지 않는다.
//       "없음"은 조회 결과 규제가 안 나온 경우에만. 조회 자체를 안 했으면 "토지이용계획 미조회".

export interface ScaleConstraint {
  key: string;
  label: string;
  /** 무엇이 바뀔 수 있는지 */
  effect: string;
  /** 어디서 확인하는지 */
  where: string;
}

const PATTERNS: Array<{ re: RegExp; c: ScaleConstraint }> = [
  { re: /지구단위계획/, c: { key: "dup", label: "지구단위계획구역", effect: "기준·허용·상한용적률, 건축선·벽면선, 용도·높이 지침이 규모를 바꿀 수 있음", where: "결정도·시행지침(관할 구청)" } },
  { re: /가로구역별\s*최고높이|최고높이/, c: { key: "street-height", label: "가로구역별 최고높이 제한", effect: "층수·높이 상한이 입력 조건보다 낮을 수 있음", where: "가로구역별 최고높이 고시" } },
  { re: /고도지구|최고고도/, c: { key: "altitude", label: "고도지구", effect: "건축물 높이 상한", where: "도시관리계획 결정도" } },
  { re: /대공방어|비행안전|군사/, c: { key: "military", label: "대공방어협조구역·군사 관련 구역", effect: "일정 높이 이상 협의 필요", where: "관할 부대 협의" } },
  { re: /경관지구/, c: { key: "view", label: "경관지구", effect: "높이·형태·색채 제한", where: "도시계획 조례" } },
  { re: /문화[유재]|역사문화/, c: { key: "heritage", label: "문화유산 관련 구역", effect: "앙각·높이 제한, 현상변경 허가", where: "국가유산청·지자체" } },
  { re: /개발제한구역/, c: { key: "gb", label: "개발제한구역", effect: "건축 원칙적 제한", where: "관할 지자체" } },
  // "(한강)폐기물매립시설 설치제한지역(저촉)" 같은 제한지역·권역은 대지 축소와 무관 → 제외
  { re: /^(?!.*(제한지역|권역)).*(도로|[소중대광]로|공원|녹지|광장|주차장|학교|하천|철도|시설).*\(저촉\)/, c: { key: "conflict", label: "도시계획시설 등 저촉", effect: "저촉 부분 대지면적·건축 가능 범위 축소", where: "토지이음 도면" } },
  { re: /정비구역|재정비촉진/, c: { key: "renewal", label: "정비구역", effect: "정비계획에 따른 규모·용도", where: "정비계획 고시" } },
];

/** 조회 여부와 무관하게 이 도구가 확인하지 않는 설계 제약 */
export const ALWAYS_UNVERIFIED: ScaleConstraint[] = [
  { key: "setback", label: "건축선·대지 안의 공지", effect: "건축 가능 영역 축소", where: "건축 조례·지구단위계획" },
  { key: "access", label: "접도·차량 출입 위치", effect: "주차 램프·출입구 배치", where: "현황측량·도로관리청" },
  { key: "core", label: "코어·피난·설비·조경·공개공지", effect: "전용 가능 면적·1층 배치", where: "건축사 배치 검토" },
];

export function scaleConstraintsFrom(useAttrs: string[] | undefined | null): {
  fetched: boolean;
  items: ScaleConstraint[];
} {
  if (!useAttrs) return { fetched: false, items: [] };
  const out: ScaleConstraint[] = [];
  const seen = new Set<string>();
  for (const a of useAttrs) {
    for (const { re, c } of PATTERNS) {
      if (re.test(a) && !seen.has(c.key)) {
        seen.add(c.key);
        out.push(c);
      }
    }
  }
  return { fetched: true, items: out };
}
