"use client";

import { useCostStore } from "@/store/cost";
import { calculateCost, formatEok, formatWon } from "@/lib/calc/cost";
import { formatPyeongAsArea } from "@/lib/utils/area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";

const CHART_COLOR = {
  above: "#5f7a89",
  basement: "#2f3e46",
  parking: "#d9a441",
  soft: "#8d877c",
  farm: "#d97757",
  forest: "#9b6b46",
  dev: "#b6573e",
} as const;

export function CostResults() {
  const s = useCostStore();
  const r = calculateCost(s);

  const cards: {
    label: string;
    value: number;
    accent?: boolean;
  }[] = [
    { label: "지상 공사비", value: r.aboveCost },
    { label: "지하층 공사비", value: r.basementCost },
    { label: "주차장 설치비", value: r.parkingCost },
    { label: "설계·감리·인입·예비비", value: r.softCost },
    { label: "농지보전부담금", value: r.farmCost, accent: true },
    { label: "대체산림자원조성비", value: r.forestCost, accent: true },
    { label: "개발부담금", value: r.devCharge, accent: true },
  ];

  const chartData = [
    { name: "지상 공사비", value: r.aboveCost, fill: CHART_COLOR.above },
    { name: "지하층 공사비", value: r.basementCost, fill: CHART_COLOR.basement },
    { name: "주차장 설치비", value: r.parkingCost, fill: CHART_COLOR.parking },
    { name: "부대비", value: r.softCost, fill: CHART_COLOR.soft },
    { name: "농지보전부담금", value: r.farmCost, fill: CHART_COLOR.farm },
    { name: "대체산림자원조성비", value: r.forestCost, fill: CHART_COLOR.forest },
    { name: "개발부담금", value: r.devCharge, fill: CHART_COLOR.dev },
  ].filter((d) => d.value > 0);

  const perPyeong = r.totalArea > 0 ? r.total / r.totalArea : 0;

  return (
    <div className="space-y-4">
      {/* 총비용 보드 */}
      <div className="bg-foreground text-background rounded-xl p-5">
        <div className="text-[11px] text-background/70 mb-1">예상 총비용</div>
        <div className="text-3xl sm:text-4xl font-semibold tabular-nums tracking-tight">
          {formatEok(r.total)}
        </div>
        <div className="text-[12px] text-background/70 mt-1.5">
          연면적 평당{" "}
          <span className="font-medium text-background/90">
            {r.totalArea > 0 ? formatWon(perPyeong) : "0원"}
          </span>{" "}
          · 총 {formatPyeongAsArea(r.totalArea)}
        </div>
      </div>

      {/* 7 카드 */}
      <div className="grid grid-cols-2 gap-2">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`bg-card rounded-md p-3 border ${
              c.accent
                ? "border-border border-l-4 border-l-[#D97757]"
                : "border-border"
            }`}
          >
            <div className="text-[10.5px] text-muted-foreground mb-0.5">
              {c.label}
            </div>
            <div className="text-[15px] font-semibold tabular-nums">
              {formatEok(c.value)}
            </div>
          </div>
        ))}
      </div>

      {/* 차트 */}
      {chartData.length > 0 && (
        <div className="bg-card border border-border rounded-md p-4">
          <div className="text-[11px] text-muted-foreground font-medium mb-2">
            비용 구성 비교
          </div>
          <div style={{ width: "100%", height: chartData.length * 36 + 20 }}>
            <ResponsiveContainer>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 80, bottom: 4, left: 110 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 11, fill: "#5a5a5a" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => formatEok(typeof v === "number" ? v : Number(v))}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 6,
                    border: "1px solid rgba(0,0,0,0.12)",
                  }}
                />
                <Bar
                  dataKey="value"
                  radius={[2, 6, 6, 2]}
                  label={{
                    position: "right",
                    formatter: (v) => formatEok(typeof v === "number" ? v : Number(v)),
                    fontSize: 11,
                    fill: "#1a1a1a",
                  }}
                >
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 학습 패널 — 3 탭 */}
      <div className="bg-card border border-border rounded-md p-4">
        <div className="text-[11px] text-muted-foreground font-medium mb-2">
          📚 부담금 학습 — 공식과 현재값 비교
        </div>
        <Tabs defaultValue="farm">
          <TabsList>
            <TabsTrigger value="farm">농지보전부담금</TabsTrigger>
            <TabsTrigger value="forest">산림청 기준</TabsTrigger>
            <TabsTrigger value="dev">개발부담금 법령</TabsTrigger>
          </TabsList>

          <TabsContent value="farm" className="pt-3">
            <Learn
              title="농지보전부담금 계산 공식"
              desc="농지를 다른 용도로 전용할 때 농지 보전을 위해 부담하는 금액입니다. 수업용 기본 구조는 다음과 같습니다."
              formula="전용면적(㎡) × min(개별공시지가 × 적용률, ㎡당 상한) × (1 − 감면율)"
              rows={[
                ["전용면적", `${s.farmArea.toLocaleString("ko-KR")}㎡`],
                [
                  "㎡당 적용금액",
                  `min(${s.farmPrice.toLocaleString("ko-KR")} × ${s.farmRate}%, ${s.farmCap.toLocaleString("ko-KR")}) = ${r.farmUnit.toLocaleString("ko-KR")}원`,
                ],
                ["감면율", `${s.farmDiscount}%`],
                [
                  "현재 계산값",
                  s.farmEnabled
                    ? formatEok(r.farmCost)
                    : "비활성 (체크박스 OFF)",
                ],
              ]}
            />
          </TabsContent>

          <TabsContent value="forest" className="pt-3">
            <Learn
              title="대체산림자원조성비 계산 공식"
              desc="산지를 전용할 때 훼손되는 산림자원의 가치를 보전하기 위해 부담하는 금액입니다. 실제 단가는 산림청 고시와 산지 구분을 확인해야 합니다."
              formula="전용면적(㎡) × [(기본 단위금액 + 공시지가 × 반영률) × (1 + 보전산지 가산율)] × (1 − 감면율)"
              rows={[
                ["전용면적", `${s.forestArea.toLocaleString("ko-KR")}㎡`],
                ["기본 단위금액", `${s.forestBase.toLocaleString("ko-KR")}원/㎡`],
                [
                  "공시지가 반영분",
                  `${s.forestPrice.toLocaleString("ko-KR")} × ${s.forestPublicRate}% = ${((s.forestPrice * s.forestPublicRate) / 100).toLocaleString("ko-KR")}원/㎡`,
                ],
                [
                  "현재 계산값",
                  s.forestEnabled
                    ? formatEok(r.forestCost)
                    : "비활성 (체크박스 OFF)",
                ],
              ]}
            />
          </TabsContent>

          <TabsContent value="dev" className="pt-3">
            <Learn
              title="개발부담금 계산 공식"
              desc="개발사업으로 생긴 개발이익 중 일부를 환수하는 구조입니다. 대상사업 여부, 면적, 인허가, 비용 인정 범위 확인이 중요합니다."
              formula="max(0, 종료시점지가 − 개시시점지가 − 정상지가상승분 − 개발비용) × 부담률"
              rows={[
                ["종료시점 지가", `${s.endLandValue.toLocaleString("ko-KR")}만원`],
                ["개시시점 지가", `${s.startLandValue.toLocaleString("ko-KR")}만원`],
                ["정상지가상승분", `${s.normalIncrease.toLocaleString("ko-KR")}만원`],
                ["개발비용 인정액", `${s.devCost.toLocaleString("ko-KR")}만원`],
                ["부담률", `${s.devRate}%`],
                [
                  "현재 계산값",
                  s.devEnabled
                    ? formatEok(r.devCharge)
                    : "비활성 (체크박스 OFF)",
                ],
              ]}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* 3 details */}
      <div className="space-y-2">
        <Note q="지하층이 왜 비싸질까?">
          터파기, 흙막이, 흙 반출, 지하수·배수, 방수, 환기·배연, 구조 보강이
          추가됩니다. 지하층은 같은 평수라도 지상층보다 단가가 높아지는 경우가
          많습니다.
        </Note>
        <Note q="주차장 설치비는 왜 흔들릴까?">
          지상 평면 주차, 지하주차장, 기계식 주차는 비용 구조가 완전히 다릅니다.
          램프, 차로 폭, 회전 반경, 기계식 설비와 유지관리비까지 함께 봐야
          합니다.
        </Note>
        <Note q="부담금은 왜 직접 조정형이어야 할까?">
          농지·산지·개발부담금은 공시지가, 감면, 사업 종류, 면적, 지자체 판단에
          따라 달라집니다. 이 화면은 수업·검토용이며 최종 금액은 관할청 확인이
          필요합니다.
        </Note>
      </div>
    </div>
  );
}

function Learn({
  title,
  desc,
  formula,
  rows,
}: {
  title: string;
  desc: string;
  formula: string;
  rows: [string, string][];
}) {
  return (
    <div className="text-[13px] leading-relaxed text-foreground/90">
      <div className="font-medium text-foreground">{title}</div>
      <p className="mt-1 text-muted-foreground">{desc}</p>
      <div className="mt-3 px-3 py-2 rounded bg-secondary text-[12px] tabular-nums leading-relaxed">
        {formula}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-1">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex items-baseline justify-between gap-3 border-b border-border/60 last:border-0 py-1.5"
          >
            <span className="text-[11.5px] text-muted-foreground">{k}</span>
            <span className="text-[12.5px] font-medium tabular-nums text-right">
              {v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Note({
  q,
  children,
}: {
  q: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-md border border-border bg-card">
      <summary className="cursor-pointer list-none flex items-center justify-between px-3.5 py-2.5 hover:bg-secondary/50 rounded-md">
        <span className="text-[12.5px] font-medium">{q}</span>
        <span className="text-[10px] text-muted-foreground transition-transform group-open:rotate-180">
          ▼
        </span>
      </summary>
      <div className="px-3.5 pb-3.5 pt-1 text-[12px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </details>
  );
}
