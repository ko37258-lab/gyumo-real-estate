"use client";

import { useState } from "react";
import Link from "next/link";
import { LandLookup } from "@/components/simulator/LandLookup";
import { ProjectHistory } from "@/components/simulator/ProjectHistory";
import { DevParcelMock } from "@/components/simulator/DevParcelMock";
import { ZoneSelector } from "@/components/simulator/ZoneSelector";
import { ControlPanel } from "@/components/simulator/ControlPanel";
import { ScaleVisualizer } from "@/components/simulator/ScaleVisualizer";
import { ResultMetrics } from "@/components/simulator/ResultMetrics";
import { ParkingCalculator } from "@/components/simulator/ParkingCalculator";
import { SchematicPlanner } from "@/components/simulator/SchematicPlanner";
import { LegalBasis } from "@/components/simulator/LegalBasis";
import { CostSimulator } from "@/components/simulator/cost/CostSimulator";
import { ProfitAnalyzer } from "@/components/simulator/profit/ProfitAnalyzer";
import { ReportDialog } from "@/components/report/ReportDialog";
import { ThemeQuickToggle } from "@/components/theme/ThemeQuickToggle";
import { SITE_HEADER } from "@/lib/branding/constants";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useSimulatorStore } from "@/store/simulator";
import { useCostStore } from "@/store/cost";
import { useLandInfoStore } from "@/store/landinfo";

export default function SimulatorPage() {
  // 플렉시티식 단계 흐름: ① 토지가치분석(지도·추정가) → ② 규모검토 → ③ 비용 → ④ 사업성
  const [tab, setTab] = useState("land");

  // 탭 전환 시 simulator → cost store 동기화
  const handleTabChange = (next: string) => {
    if (next === "cost") {
      const { lotPy, farPct } = useSimulatorStore.getState();
      const gfaPy = Math.round(lotPy * farPct / 100);
      if (gfaPy > 0) useCostStore.getState().set("abovePyeong", gfaPy);
    }
    setTab(next);
  };

  return (
    <main className="notranslate min-h-screen px-4 py-6" translate="no">
      <div className="max-w-5xl mx-auto bg-card rounded-xl p-6 border border-border">
        <header className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="flex-shrink-0 inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md border border-border hover:bg-secondary transition-colors"
              aria-label="홈으로"
              title="홈으로"
            >
              <span aria-hidden>←</span>
              <span className="hidden sm:inline">홈</span>
            </Link>
            <div className="min-w-0">
              <h1 className="text-[22px] font-medium leading-tight">
                <Link
                  href="/"
                  className="hover:text-[var(--info)] hover:underline underline-offset-4 transition-colors"
                >
                  {SITE_HEADER.title}
                </Link>
              </h1>
              <div className="text-[11px] text-muted-foreground mt-1">
                {SITE_HEADER.subtitle}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ReportDialog />
            <ThemeQuickToggle />
            <Link
              href="/settings"
              className="text-[18px] text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary"
              aria-label="설정"
              title="설정"
            >
              ⚙️
            </Link>
          </div>
        </header>

        <Tabs value={tab} onValueChange={handleTabChange}>
          {/* h-auto! — base-ui TabsList의 내장 h-8(group-data-horizontal 변형)보다 우선해야 2줄 배치가 안 겹침 */}
          <TabsList className="mb-4 w-full grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 h-auto! p-0 bg-transparent">
            <StepTrigger value="land" step={1} label="토지가치분석" sub="지도·추정가·실거래" />
            <StepTrigger value="scale" step={2} label="규모 검토" sub="건폐율·용적률·일조" />
            <StepTrigger value="cost" step={3} label="비용·부담금" sub="건축비·농지·산지·개발" />
            <StepTrigger value="profit" step={4} label="사업성 분석" sub="IRR·수익률·대출" />
          </TabsList>

          {/* ① 토지가치분석 — 지도 클릭/지번 입력 → 추정가·실거래·건축물대장 (플렉시티식) */}
          <TabsContent value="land">
            <div className="space-y-3.5">
              <LandLookup defaultShowMap />
              <DevParcelMock />
              <ProceedToScale onProceed={() => handleTabChange("scale")} />
              <ProjectHistory />
            </div>
          </TabsContent>

          {/* ② 규모 검토 */}
          <TabsContent value="scale">
            <div className="space-y-3.5">
              <ZoneSelector />
              <ControlPanel />
              <ScaleVisualizer />
              <ResultMetrics />
              <ParkingCalculator />
              <SchematicPlanner />
              <LegalBasis />
            </div>
          </TabsContent>

          <TabsContent value="cost">
            <CostSimulator />
          </TabsContent>

          <TabsContent value="profit">
            <ProfitAnalyzer />
          </TabsContent>
        </Tabs>
      </div>

      <div className="max-w-5xl mx-auto text-center text-[11px] text-muted-foreground mt-4">
        © 2026 미스터홈즈 (미스터홈즈) FC · 공법의 신 · v0.3
      </div>
    </main>
  );
}

/** ① 하단 CTA — 플렉시티 [기획설계 하기] 대응. 조회 완료 시 자동 반영 안내와 함께 ②로 이동. */
function ProceedToScale({ onProceed }: { onProceed: () => void }) {
  const land = useLandInfoStore((s) => s.data);
  return (
    <div className="rounded-xl border-2 border-[var(--info)] bg-[var(--info-bg)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[13px] font-bold text-foreground">
          {land
            ? `📍 ${land.address} — 토지가치분석 완료`
            : "지도를 클릭하거나 지번을 입력해 토지가치를 먼저 확인하세요"}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {land
            ? "면적·용도지역·공시지가가 규모검토에 자동 반영되었습니다. 이어서 건축 가능 규모를 확인하세요."
            : "조회 없이도 규모검토에서 직접 조건을 입력할 수 있습니다."}
        </div>
      </div>
      <Button
        onClick={onProceed}
        size="lg"
        className="shrink-0 bg-[#993C1D] hover:bg-[#7A2F16] text-white font-bold"
      >
        🏗️ 규모검토 하기 →
      </Button>
    </div>
  );
}

function StepTrigger({
  value,
  step,
  label,
  sub,
}: {
  value: string;
  step: number;
  label: string;
  sub: string;
}) {
  return (
    <TabsTrigger
      value={value}
      /* base-ui Tabs는 data-state 대신 data-active(활성)·aria-selected를 씀 — 변형 선택자 주의 */
      className="
        group relative flex items-center justify-start gap-3 px-3 md:px-4 py-3 rounded-xl
        bg-card border-2 transition-all duration-200 min-h-[3.5rem]
        aria-[selected=false]:opacity-60 aria-[selected=false]:border-border
        aria-[selected=false]:hover:opacity-100 aria-[selected=false]:hover:border-foreground/30
        data-active:border-[var(--info)] data-active:shadow-lg
        data-active:bg-gradient-to-br data-active:from-card data-active:to-[var(--info-bg)]
      "
    >
      <span
        className="
          flex-shrink-0 w-9 h-9 rounded-full text-white text-base font-bold
          flex items-center justify-center transition-colors
          group-data-active:bg-[var(--info)]
          group-aria-[selected=false]:bg-muted-foreground/60
        "
      >
        {step}
      </span>
      <span className="flex flex-col items-start text-left min-w-0">
        <span className="text-[13px] font-bold leading-tight text-foreground">
          {label}
        </span>
        <span className="text-[10px] text-muted-foreground mt-0.5 hidden md:block leading-tight">
          {sub}
        </span>
      </span>
    </TabsTrigger>
  );
}
