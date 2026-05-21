import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SITE_HEADER } from "@/lib/branding/constants";

export default function LandingPage() {
  return (
    <main>
      {/* HERO */}
      <section className="border-b border-border bg-gradient-to-b from-background to-secondary/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border text-[11px] text-muted-foreground mb-6">
            <span className="size-1.5 rounded-full bg-[var(--success)]" />
            {SITE_HEADER.subtitle}
          </div>
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.15] max-w-2xl">
            지번 한 줄 →
            <br />
            <span className="text-[var(--info)]">30초</span> 안에
            건축가능 규모까지.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
            건폐율·용적률·일조권 사선제한을 자동 계산하고, 평면도와 정북단면을
            시각화합니다. 디벨로퍼·토지투자자의 첫 번째 의사결정 도구.
          </p>
          <div className="mt-7 flex items-center gap-3">
            <Button asChild size="lg">
              <Link href="/simulator">지번 조회 시작 →</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/pricing">요금제 보기</Link>
            </Button>
          </div>
          <div className="mt-8 text-[12px] text-muted-foreground">
            ⚖️ 국토계획법 시행령 제84·85조 · 건축법 시행령 제86조 자동 적용 ·
            법무법인 윤강 자문
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-[12px] text-muted-foreground font-medium mb-3">
          핵심 기능
        </div>
        <h2 className="text-2xl sm:text-3xl font-medium tracking-tight max-w-xl">
          현장 디벨로퍼가 매일 쓰는 의사결정 흐름.
        </h2>
        <div className="grid sm:grid-cols-3 gap-3 sm:gap-4 mt-10">
          <Feature
            badge="① 조회"
            title="지번 → 용도지역 자동"
            body="주소만 입력하면 VWorld 오픈 API로 대지면적·용도지역·전면도로폭을 가져와 그대로 시뮬레이터에 채웁니다."
            note="v0.3 — VWorld 인증 후 활성화"
          />
          <Feature
            badge="② 계산"
            title="일조권 사선제한 시각화"
            body="건축법 시행령 제86조 정북방향 1.5m / h·½ - 1.5m 규정을 층별로 깎고, 실제 가능 연면적과 손실률을 함께 보여줍니다."
          />
          <Feature
            badge="③ 검증"
            title="법령 근거 인용"
            body="모든 수치 옆에 시행령 조문 번호. 법무법인 윤강 부동산법률 자문으로 강화·예외 규정도 점진 반영."
          />
        </div>
      </section>

      {/* AUTHORITY */}
      <section className="border-y border-border bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-16 grid sm:grid-cols-2 gap-10 items-start">
          <div>
            <div className="text-[12px] text-muted-foreground font-medium mb-3">
              왜 이 도구가 신뢰할 수 있는가
            </div>
            <h2 className="text-2xl sm:text-3xl font-medium tracking-tight leading-snug">
              부동산공법 28년 강의,
              <br />
              &ldquo;공법의 신&rdquo; 고상철 (高相喆).
            </h2>
          </div>
          <ul className="space-y-3.5 text-sm leading-relaxed">
            <li className="flex gap-3">
              <span className="text-[var(--info)] mt-0.5">●</span>
              <span>
                <span className="font-medium">28년</span> — 부동산공법 강의
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[var(--info)] mt-0.5">●</span>
              <span>
                <span className="font-medium">인하대학교</span> 정책대학원
                부동산학과 초빙교수
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[var(--info)] mt-0.5">●</span>
              <span>
                <span className="font-medium">법무법인 윤강</span> 부동산관련법률
                고문 — 모든 법령 인용 자문
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[var(--info)] mt-0.5">●</span>
              <span>
                <span className="font-medium">미스터홈즈 (미스터홈즈) FC</span> —
                전국 가맹점 중개사 실무 검증
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* PRICING TEASER */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[12px] text-muted-foreground font-medium mb-2">
              요금제
            </div>
            <h2 className="text-2xl sm:text-3xl font-medium tracking-tight">
              일 3건은 무료, 무제한은 월 19,900원.
            </h2>
          </div>
          <Link
            href="/pricing"
            className="text-sm text-[var(--info)] hover:underline hidden sm:inline"
          >
            전체 비교 →
          </Link>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
          <PlanCard
            name="Free"
            price="0원"
            sub="일 3건 조회"
            features={["기본 시뮬레이션", "용도지역 13개 프리셋", "일조권 사선 시각화"]}
          />
          <PlanCard
            name="Pro"
            price="월 19,900원"
            sub="무제한 조회"
            highlighted
            features={[
              "Free의 모든 기능",
              "PDF 리포트 (미스터홈즈 브랜드)",
              "사업성 분석 · IRR",
              "조회 이력 저장",
            ]}
          />
          <PlanCard
            name="Business"
            price="월 99,000원"
            sub="팀 5명"
            features={["Pro의 모든 기능", "팀 5인 공유", "비교분석 · API"]}
          />
        </div>
        <div className="mt-4 grid sm:grid-cols-2 gap-3 sm:gap-4">
          <SpecialPlan
            name="미스터홈즈 가맹점"
            price="무료"
            body="Pro 자동 부여 — 가맹가치 강화"
          />
          <SpecialPlan
            name="부동산멘토스쿨 수강생"
            price="3개월 무료"
            body="Pro 체험 — 수료 후 자율 결제"
          />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-t border-border bg-foreground text-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-medium tracking-tight">
              지번 한 줄, 지금 바로.
            </h2>
            <p className="mt-2 text-sm text-background/70 max-w-md">
              회원가입 없이 일 3건까지 무료로 사용해 보세요.
            </p>
          </div>
          <Button asChild size="lg" variant="secondary" className="text-foreground">
            <Link href="/simulator">시뮬레이터 열기 →</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

function Feature({
  badge,
  title,
  body,
  note,
}: {
  badge: string;
  title: string;
  body: string;
  note?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 sm:p-6">
      <div className="text-[11px] text-muted-foreground font-medium">
        {badge}
      </div>
      <div className="mt-2 text-base font-medium">{title}</div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        {body}
      </p>
      {note && (
        <div className="mt-3 text-[11px] text-[var(--info)]">{note}</div>
      )}
    </div>
  );
}

function PlanCard({
  name,
  price,
  sub,
  features,
  highlighted,
}: {
  name: string;
  price: string;
  sub: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg p-5 sm:p-6 border " +
        (highlighted
          ? "border-[var(--info)] bg-[var(--info-bg)]"
          : "border-border bg-card")
      }
    >
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-medium">{name}</div>
        {highlighted && (
          <span className="text-[10px] text-[var(--info)] bg-card border border-[var(--info)]/40 px-2 py-0.5 rounded-full">
            추천
          </span>
        )}
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums">{price}</div>
      <div className="text-[12px] text-muted-foreground">{sub}</div>
      <ul className="mt-5 space-y-2 text-[13px]">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="text-[var(--success)] mt-0.5">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SpecialPlan({
  name,
  price,
  body,
}: {
  name: string;
  price: string;
  body: string;
}) {
  return (
    <div className="bg-secondary rounded-lg p-4 sm:p-5 flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{name}</div>
        <div className="text-[12px] text-muted-foreground mt-0.5">{body}</div>
      </div>
      <div className="text-base font-semibold text-[var(--success)] whitespace-nowrap">
        {price}
      </div>
    </div>
  );
}
