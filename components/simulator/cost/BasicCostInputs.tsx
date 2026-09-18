"use client";

import { useCostStore, type CostLinkKey } from "@/store/cost";
import { useCostSnapshot } from "@/lib/plan/useSnapshots";
import { SliderInputPair } from "@/components/ui/slider-input-pair";
import { pyeongToSqmDisplay } from "@/lib/utils/area";

export function BasicCostInputs() {
  const s = useCostStore();
  const snap = useCostSnapshot();
  const eff = snap.inputs; // 연결 상태면 규모검토 값, 끊겼으면 사용자 값
  const link = (k: CostLinkKey) => (
    <span className="text-[10px]">
      {s.linked[k] ? (
        <span className="text-emerald-700">🔗 규모검토 연동</span>
      ) : (
        <>
          <span className="text-amber-700">✋ 수동 입력</span>{" "}
          <button type="button" onClick={() => s.relink(k)} className="text-[var(--info)] hover:underline">
            규모검토 값으로
          </button>
        </>
      )}
    </span>
  );
  return (
    <section className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold">기본 건축비</h3>
        <span className="text-[10.5px] text-muted-foreground">
          지상·지하·주차 + 부대비
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <SliderInputPair
          label="지상 연면적"
          hint={link("abovePyeong")}
          value={Math.round(eff.abovePyeong * 10) / 10}
          onChange={(v) => s.set("abovePyeong", v)}
          min={0}
          max={3000}
          step={10}
          unit="평"
          conversion={pyeongToSqmDisplay(eff.abovePyeong)}
          inputMin={0}
          inputMax={10000}
        />
        <SliderInputPair
          label="지하 연면적"
          hint={link("basementPyeong")}
          value={Math.round(eff.basementPyeong * 10) / 10}
          onChange={(v) => s.set("basementPyeong", v)}
          min={0}
          max={1500}
          step={10}
          unit="평"
          conversion={pyeongToSqmDisplay(eff.basementPyeong)}
          inputMin={0}
          inputMax={5000}
        />
        <SliderInputPair
          label="지상 평당 공사비"
          value={s.aboveUnit}
          onChange={(v) => s.set("aboveUnit", v)}
          min={300}
          max={2500}
          step={10}
          unit="만원/평"
          tooltip="공사비 시세 참고: 일반 800~1,200, 고급 1,500~2,000, 특수 2,500+ 만원/평"
          hint="💡 일반 5~10층 건물 기준 시장 평균 800~1,200만원/평. 고급·특수 자재 시 더 높음."
          inputMin={100}
          inputMax={10000}
        />
        <SliderInputPair
          label="지하층 가산율"
          value={s.basementPremium}
          onChange={(v) => s.set("basementPremium", v)}
          min={100}
          max={250}
          step={5}
          unit="%"
          hint="지상 단가 대비"
          inputMin={100}
          inputMax={500}
        />
        <SliderInputPair
          label="설계·감리·인입·예비비"
          value={s.softRate}
          onChange={(v) => s.set("softRate", v)}
          min={0}
          max={50}
          step={1}
          unit="%"
          inputMin={0}
          inputMax={100}
        />
        <SliderInputPair
          label="주차 설치비 대상 대수"
          hint={
            <>
              {link("parkingSpaces")}
              <span className="block text-muted-foreground">
                지하가 연동되면 지하 주차는 지하층 공사비(구조·램프 포함 가정)에 들어가므로 여기선 지상 대수만 셉니다 — 중복 계상 방지
              </span>
            </>
          }
          value={eff.parkingSpaces}
          onChange={(v) => s.set("parkingSpaces", v)}
          min={0}
          max={200}
          step={1}
          unit="대"
          inputMin={0}
          inputMax={1000}
        />
        <SliderInputPair
          label="주차 1대 설치비"
          value={s.parkingUnit}
          onChange={(v) => s.set("parkingUnit", v)}
          min={0}
          max={8000}
          step={100}
          unit="만원/대"
          inputMin={0}
          inputMax={30000}
        />
      </div>
    </section>
  );
}
