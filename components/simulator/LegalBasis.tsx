export function LegalBasis() {
  return (
    <div className="bg-card border border-border rounded-md px-3.5 py-3 text-[11px] text-muted-foreground leading-relaxed">
      <div className="font-medium text-foreground mb-1.5 text-xs">
        ⚖️ 법적 근거
      </div>
      <ul className="space-y-0.5">
        <li>
          · 용도지역별 건폐율 —{" "}
          <code className="bg-secondary px-1 py-px rounded text-[10px]">
            국토계획법 시행령 제84조
          </code>
        </li>
        <li>
          · 용도지역별 용적률 —{" "}
          <code className="bg-secondary px-1 py-px rounded text-[10px]">
            국토계획법 시행령 제85조
          </code>
        </li>
        <li>
          · 일조권 사선제한 —{" "}
          <code className="bg-secondary px-1 py-px rounded text-[10px]">
            건축법 제61조 + 시행령 제86조 (2023.9.12 개정, 10m 기준)
          </code>
        </li>
        <li>
          · 주차장 설치기준 —{" "}
          <code className="bg-secondary px-1 py-px rounded text-[10px]">
            주차장법 제19조 + 시행령 제6조 별표1
          </code>
        </li>
        <li>
          · 지하주차장 연면적 제외 —{" "}
          <code className="bg-secondary px-1 py-px rounded text-[10px]">
            건축법 시행령 119조 1항 4호
          </code>
        </li>
        <li>
          · 시·군·구 조례 강화 가능 (기본값:{" "}
          <code className="bg-secondary px-1 py-px rounded text-[10px]">
            서울특별시 주차장 설치 및 관리 조례
          </code>
          )
        </li>
      </ul>
      <div className="mt-1.5 text-muted-foreground/70">
        ※ 도시계획조례에 따라 지자체별 강화 가능. 가각전제·채광방향·도로너비 가산
        미반영. 실시설계 전 건축사·인허가 사전협의 필수. 자문: 법무법인 윤강.
      </div>
    </div>
  );
}
