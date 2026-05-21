import Link from "next/link";
import { Button } from "@/components/ui/button";

type Plan = {
  name: string;
  price: string;
  priceNote?: string;
  description: string;
  features: string[];
  cta: { label: string; href: string };
  tone?: "default" | "highlight" | "free" | "muted";
  badge?: string;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "0원",
    description: "일 3건 조회 · 회원가입 불필요",
    features: [
      "용도지역 13개 프리셋",
      "건폐율·용적률·도로폭 조정",
      "일조권 사선제한 시각화",
      "평면도 + 정북단면 입면도",
    ],
    cta: { label: "지금 시작", href: "/simulator" },
    tone: "free",
  },
  {
    name: "Pro",
    price: "월 19,900원",
    priceNote: "VAT 포함",
    description: "혼자 작업하는 디벨로퍼·토지투자자",
    features: [
      "Free의 모든 기능",
      "무제한 조회",
      "PDF 리포트 (미스터홈즈 브랜드)",
      "사업성 분석 · IRR · 손익분기",
      "조회 이력 저장 + 즐겨찾기",
      "이메일 우선 지원",
    ],
    cta: { label: "Pro 시작하기", href: "/simulator" },
    tone: "highlight",
    badge: "가장 인기",
  },
  {
    name: "Business",
    price: "월 99,000원",
    priceNote: "팀 5명 기준 · VAT 포함",
    description: "법인·중개법인·디벨로퍼 팀",
    features: [
      "Pro의 모든 기능",
      "팀 5명 동시 사용",
      "프로젝트 비교분석",
      "REST API 액세스",
      "전용 슬랙 채널",
    ],
    cta: { label: "팀 도입 문의", href: "/simulator" },
    tone: "default",
  },
];

const SPECIAL: Plan[] = [
  {
    name: "미스터홈즈 가맹점",
    price: "무료",
    description: "Pro 자동 부여 — 가맹가치 강화",
    features: [
      "Pro의 모든 기능 무제한",
      "가맹점 전용 브랜드 리포트",
      "본사 우선 지원",
    ],
    cta: { label: "가맹 정보", href: "/simulator" },
    tone: "muted",
  },
  {
    name: "부동산멘토스쿨 수강생",
    price: "3개월 무료",
    description: "Pro 체험 — 수료 후 자율 결제",
    features: [
      "수강 기간 + 3개월 Pro 제공",
      "수업 사례 실습용 워크북 연동",
      "동기·강사 공유 기능",
    ],
    cta: { label: "수강생 인증", href: "/simulator" },
    tone: "muted",
  },
];

export default function PricingPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <div className="text-center max-w-2xl mx-auto">
        <div className="text-[12px] text-muted-foreground font-medium mb-3">
          요금제
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          현장에서 쓰는 만큼만 결제.
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          모든 플랜은 동일한 법령 근거(국토계획법 시행령 제84·85조 · 건축법
          시행령 제86조)와 법무법인 윤강 자문 위에 동작합니다.
        </p>
      </div>

      <div className="mt-12 grid sm:grid-cols-3 gap-4">
        {PLANS.map((p) => (
          <PlanCard key={p.name} plan={p} />
        ))}
      </div>

      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        {SPECIAL.map((p) => (
          <PlanCard key={p.name} plan={p} />
        ))}
      </div>

      <div className="mt-16 grid sm:grid-cols-2 gap-x-10 gap-y-3 text-[13px] text-muted-foreground max-w-3xl mx-auto leading-relaxed">
        <FAQItem
          q="결제 수단은?"
          a="토스페이먼츠 정기결제(빌링키). 신용·체크카드, 계좌이체 지원."
        />
        <FAQItem
          q="환불 정책은?"
          a="결제 후 7일 이내 미사용 시 전액 환불. 사용 내역이 있으면 일할 계산."
        />
        <FAQItem
          q="법령 인용이 어디까지 정확한가요?"
          a="법무법인 윤강 부동산법률 고문이 모든 조문 인용을 검토합니다."
        />
        <FAQItem
          q="VWorld API는 언제 활성화?"
          a="v0.3 (2026-05 말 예정). 그 전까지는 mock 데이터로 UI 검증 가능."
        />
      </div>

      <div className="mt-16 text-center">
        <Button asChild size="lg">
          <Link href="/simulator">먼저 무료로 사용해 보기 →</Link>
        </Button>
      </div>
    </main>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const isHighlight = plan.tone === "highlight";
  const isMuted = plan.tone === "muted";
  const cardCls = isHighlight
    ? "border-[var(--info)] bg-[var(--info-bg)] ring-1 ring-[var(--info)]/30"
    : isMuted
      ? "border-border bg-secondary"
      : "border-border bg-card";

  return (
    <div className={`rounded-lg border p-6 ${cardCls} flex flex-col`}>
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-medium">{plan.name}</div>
        {plan.badge && (
          <span className="text-[10px] text-[var(--info)] bg-card border border-[var(--info)]/40 px-2 py-0.5 rounded-full">
            {plan.badge}
          </span>
        )}
      </div>
      <div className="mt-3 text-3xl font-semibold tabular-nums">
        {plan.price}
      </div>
      {plan.priceNote && (
        <div className="text-[11px] text-muted-foreground">
          {plan.priceNote}
        </div>
      )}
      <div className="mt-2 text-[13px] text-muted-foreground">
        {plan.description}
      </div>
      <ul className="mt-6 space-y-2 text-[13px] flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="text-[var(--success)] mt-0.5">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Button
          asChild
          variant={isHighlight ? "default" : "outline"}
          className="w-full"
        >
          <Link href={plan.cta.href}>{plan.cta.label}</Link>
        </Button>
      </div>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <div className="font-medium text-foreground text-sm">{q}</div>
      <div className="mt-1">{a}</div>
    </div>
  );
}
