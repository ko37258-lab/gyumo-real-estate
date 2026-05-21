import Link from "next/link";
import { LandLookup } from "@/components/simulator/LandLookup";
import { ZoneSelector } from "@/components/simulator/ZoneSelector";
import { ControlPanel } from "@/components/simulator/ControlPanel";
import { ScaleVisualizer } from "@/components/simulator/ScaleVisualizer";
import { ResultMetrics } from "@/components/simulator/ResultMetrics";
import { ParkingCalculator } from "@/components/simulator/ParkingCalculator";
import { LegalBasis } from "@/components/simulator/LegalBasis";
import { CostSimulator } from "@/components/simulator/cost/CostSimulator";
import { ProfitAnalyzer } from "@/components/simulator/profit/ProfitAnalyzer";
import { ReportDialog } from "@/components/report/ReportDialog";
import { ThemeQuickToggle } from "@/components/theme/ThemeQuickToggle";
import { SITE_HEADER } from "@/lib/branding/constants";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function SimulatorPage() {
  return (
    <main className="notranslate min-h-screen px-4 py-6" translate="no">
      <div className="max-w-5xl mx-auto bg-card rounded-xl p-6 border border-border">
        <header className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-border">
          <div>
            <h1 className="text-[22px] font-medium leading-tight">
              {SITE_HEADER.title}
            </h1>
            <div className="text-[11px] text-muted-foreground mt-1">
              {SITE_HEADER.subtitle}
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

        <Tabs defaultValue="scale">
          <TabsList className="mb-4 w-full grid grid-cols-3 gap-3 h-auto p-0 bg-transparent">
            <StepTrigger value="scale" step={1} label="규모 검토" sub="건폐율·용적률·일조" />
            <StepTrigger value="cost" step={2} label="비용·부담금" sub="건축비·농지·산지·개발" />
            <StepTrigger value="profit" step={3} label="사업성 분석" sub="IRR·수익률·대출" />
          </TabsList>

          <TabsContent value="scale">
            <div className="space-y-3.5">
              <LandLookup />
              <ZoneSelector />
              <ControlPanel />
              <ScaleVisualizer />
              <ResultMetrics />
              <ParkingCalculator />
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
      className="
        group relative flex items-center justify-start gap-3 px-3 md:px-4 py-3 rounded-xl
        bg-card border-2 transition-all duration-200 min-h-[3.5rem]
        data-[state=inactive]:opacity-60 data-[state=inactive]:border-border
        data-[state=inactive]:hover:opacity-100 data-[state=inactive]:hover:border-foreground/30
        data-[state=active]:border-[var(--info)] data-[state=active]:shadow-lg
        data-[state=active]:bg-gradient-to-br data-[state=active]:from-card data-[state=active]:to-[var(--info-bg)]
      "
    >
      <span
        className="
          flex-shrink-0 w-9 h-9 rounded-full text-white text-base font-bold
          flex items-center justify-center transition-colors
          group-data-[state=active]:bg-[var(--info)]
          group-data-[state=inactive]:bg-muted-foreground/60
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
