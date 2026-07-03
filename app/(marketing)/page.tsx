import Link from "next/link";
import { SITE_HEADER } from "@/lib/branding/constants";

export default function LandingPage() {
  return (
    <main>
      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden"
        style={{ minHeight: "100dvh", background: "#020425" }}
      >
        {/* 배경: 건물 사진 블러 충전 레이어 */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage: "url(/hero-building.png)",
            backgroundSize: "cover",
            backgroundPosition: "center 30%",
            filter: "blur(36px) brightness(0.80) saturate(1.1)",
            transform: "scale(1.28)",
            zIndex: 1,
          }}
        />
        {/* 배경: 건물 사진 선명 레이어 */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage: "url(/hero-building.png)",
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center top",
            filter: "brightness(0.95) saturate(1.05)",
            zIndex: 2,
          }}
        />
        {/* 네이비 오버레이 */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: "#020425", opacity: 0.46, zIndex: 3 }}
        />
        {/* 하단 그라디언트 */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, transparent 40%, rgba(2,4,37,0.38) 66%, rgba(2,4,37,0.90) 100%)",
            zIndex: 4,
          }}
        />

        {/* ── 자동차 애니메이션 ── */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>

          {/* car 1 – 세단 우측 */}
          <div className="hero-car" style={{ position: "absolute", bottom: 128, left: 0, animation: "hero-driveR 20s linear infinite", animationDelay: "-3s" }}>
            <div className="hero-carbob" style={{ animation: "hero-carbob 1.1s ease-in-out infinite" }}>
              <svg viewBox="0 0 220 90" style={{ display: "block", height: 62, width: "auto", color: "rgba(9,11,26,0.88)", filter: "drop-shadow(0 5px 8px rgba(0,0,0,0.38))" }}>
                <path fill="currentColor" d="M6 60 Q6 50 18 48 L60 46 L86 22 Q92 16 104 16 L142 16 Q154 16 162 24 L182 46 L206 50 Q214 52 214 62 L214 68 Q214 72 210 72 L12 72 Q6 72 6 66 Z"/>
                <circle fill="currentColor" cx="58" cy="72" r="16"/>
                <circle fill="currentColor" cx="166" cy="72" r="16"/>
              </svg>
            </div>
          </div>

          {/* car 2 – SUV 우측 */}
          <div className="hero-car" style={{ position: "absolute", bottom: 106, left: 0, animation: "hero-driveR 24s linear infinite", animationDelay: "-13s" }}>
            <div className="hero-carbob" style={{ animation: "hero-carbob 1.25s ease-in-out infinite" }}>
              <svg viewBox="0 0 220 90" style={{ display: "block", height: 72, width: "auto", color: "rgba(11,13,30,0.90)", filter: "drop-shadow(0 5px 8px rgba(0,0,0,0.38))" }}>
                <path fill="currentColor" d="M6 58 Q6 46 18 44 L54 42 L74 18 Q80 12 92 12 L150 12 Q164 12 172 20 L190 44 L206 46 Q214 48 214 58 L214 66 Q214 70 210 70 L12 70 Q6 70 6 64 Z"/>
                <circle fill="currentColor" cx="58" cy="70" r="17"/>
                <circle fill="currentColor" cx="168" cy="70" r="17"/>
              </svg>
            </div>
          </div>

          {/* car 3 – 세단 좌측 (원거리) */}
          <div className="hero-car" style={{ position: "absolute", bottom: 152, left: 0, animation: "hero-driveL 18s linear infinite", animationDelay: "-8s" }}>
            <div className="hero-carbob" style={{ animation: "hero-carbob 1.05s ease-in-out infinite" }}>
              <svg viewBox="0 0 220 90" style={{ display: "block", height: 54, width: "auto", transform: "scale(-0.82, 0.82)", transformOrigin: "bottom center", color: "rgba(20,23,42,0.82)", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.30))" }}>
                <path fill="currentColor" d="M6 60 Q6 50 18 48 L60 46 L86 22 Q92 16 104 16 L142 16 Q154 16 162 24 L182 46 L206 50 Q214 52 214 62 L214 68 Q214 72 210 72 L12 72 Q6 72 6 66 Z"/>
                <circle fill="currentColor" cx="58" cy="72" r="16"/>
                <circle fill="currentColor" cx="166" cy="72" r="16"/>
              </svg>
            </div>
          </div>

          {/* car 4 – SUV 우측 (근거리) */}
          <div className="hero-car" style={{ position: "absolute", bottom: 90, left: 0, animation: "hero-driveR 16s linear infinite", animationDelay: "-1s" }}>
            <div className="hero-carbob" style={{ animation: "hero-carbob 0.95s ease-in-out infinite" }}>
              <svg viewBox="0 0 220 90" style={{ display: "block", height: 80, width: "auto", color: "rgba(7,9,22,0.93)", filter: "drop-shadow(0 7px 10px rgba(0,0,0,0.42))" }}>
                <path fill="currentColor" d="M6 58 Q6 46 18 44 L54 42 L74 18 Q80 12 92 12 L150 12 Q164 12 172 20 L190 44 L206 46 Q214 48 214 58 L214 66 Q214 70 210 70 L12 70 Q6 70 6 64 Z"/>
                <circle fill="currentColor" cx="58" cy="70" r="17"/>
                <circle fill="currentColor" cx="168" cy="70" r="17"/>
              </svg>
            </div>
          </div>

          {/* car 5 – 세단 좌측 */}
          <div className="hero-car" style={{ position: "absolute", bottom: 118, left: 0, animation: "hero-driveL 22s linear infinite", animationDelay: "-16s" }}>
            <div className="hero-carbob" style={{ animation: "hero-carbob 1.15s ease-in-out infinite" }}>
              <svg viewBox="0 0 220 90" style={{ display: "block", height: 60, width: "auto", transform: "scale(-0.90, 0.90)", transformOrigin: "bottom center", color: "rgba(13,15,32,0.86)", filter: "drop-shadow(0 5px 7px rgba(0,0,0,0.32))" }}>
                <path fill="currentColor" d="M6 60 Q6 50 18 48 L60 46 L86 22 Q92 16 104 16 L142 16 Q154 16 162 24 L182 46 L206 50 Q214 52 214 62 L214 68 Q214 72 210 72 L12 72 Q6 72 6 66 Z"/>
                <circle fill="currentColor" cx="58" cy="72" r="16"/>
                <circle fill="currentColor" cx="166" cy="72" r="16"/>
              </svg>
            </div>
          </div>
        </div>

        {/* ── 텍스트 오버레이 ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
          style={{ zIndex: 10 }}
        >
          {/* 뱃지 */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5"
            style={{
              background: "rgba(255,255,255,0.09)",
              border: "1px solid rgba(255,255,255,0.18)",
              backdropFilter: "blur(8px)",
              fontSize: 11,
              color: "rgba(255,255,255,0.68)",
            }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ background: "#FFCF0D" }}
            />
            {SITE_HEADER.subtitle}
          </div>

          {/* 아이브로 */}
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.20em",
              textTransform: "uppercase",
              color: "#FFCF0D",
              textShadow: "0 2px 14px rgba(0,0,0,0.55)",
              marginBottom: 14,
            }}
          >
            # SCALE REVIEW · 건축가능 규모검토
          </div>

          {/* 헤드라인 */}
          <h1
            style={{
              margin: 0,
              color: "#FFFFFF",
              fontSize: "clamp(30px, 5.2vw, 66px)",
              fontWeight: 700,
              letterSpacing: "-0.015em",
              lineHeight: 1.2,
              textShadow: "0 6px 34px rgba(0,0,0,0.60)",
              maxWidth: 820,
              marginBottom: 18,
            }}
          >
            지번 한 줄 →
            <br />
            <span style={{ color: "#FFCF0D" }}>30초</span> 안에 건축가능
            규모까지.
          </h1>

          {/* 본문 */}
          <p
            style={{
              color: "rgba(255,255,255,0.78)",
              fontSize: "clamp(14px, 1.5vw, 18px)",
              fontWeight: 500,
              lineHeight: 1.68,
              maxWidth: 520,
              marginBottom: 30,
              textShadow: "0 2px 12px rgba(0,0,0,0.45)",
            }}
          >
            건폐율·용적률·일조권 사선제한을 자동 계산하고,
            <br className="hidden sm:block" />
            평면도와 정북단면을 시각화합니다.
            <br className="hidden sm:block" />
            디벨로퍼·토지투자자의 첫 번째 의사결정 도구.
          </p>

          {/* CTA 버튼 */}
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <Link href="/simulator">
              <button
                className="transition-opacity hover:opacity-85"
                style={{
                  background: "#FFCF0D",
                  color: "#020425",
                  padding: "14px 30px",
                  borderRadius: 9,
                  fontWeight: 700,
                  fontSize: 16,
                  border: "none",
                  cursor: "pointer",
                  letterSpacing: "-0.01em",
                }}
              >
                지번 조회 시작 →
              </button>
            </Link>
            <Link href="/pricing">
              <button
                className="transition-colors hover:border-white/60"
                style={{
                  background: "transparent",
                  color: "#FFFFFF",
                  padding: "14px 30px",
                  borderRadius: 9,
                  fontWeight: 600,
                  fontSize: 16,
                  border: "1.5px solid rgba(255,255,255,0.30)",
                  cursor: "pointer",
                  backdropFilter: "blur(4px)",
                }}
              >
                요금제 보기
              </button>
            </Link>
          </div>

          {/* 법령 */}
          <div style={{ color: "rgba(255,255,255,0.42)", fontSize: 12 }}>
            ⚖️ 국토계획법 시행령 제84·85조 · 건축법 시행령 제86조 자동 적용 ·
            법무법인 윤강 자문
          </div>

          {/* 금색 선 */}
          <div
            style={{
              width: 48,
              height: 3,
              background: "#FFCF0D",
              borderRadius: 2,
              opacity: 0.85,
              marginTop: 22,
            }}
          />
        </div>

        {/* 스크롤 힌트 */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          style={{
            zIndex: 10,
            color: "rgba(255,255,255,0.32)",
            fontSize: 12,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span style={{ letterSpacing: "0.08em" }}>SCROLL</span>
          <svg width="12" height="18" viewBox="0 0 12 18" fill="none">
            <path
              d="M6 1v16M1 11l5 6 5-6"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </section>

      {/* ── FEATURES ── */}
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

      {/* ── AUTHORITY ── */}
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
                <span className="font-medium">미스터홈즈 (미스터홈즈) FC</span>{" "}
                — 전국 가맹점 중개사 실무 검증
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* ── PRICING TEASER ── */}
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

      {/* ── FINAL CTA ── */}
      <section
        className="relative overflow-hidden"
        style={{ background: "#020425" }}
      >
        {/* 배경 건물 희미하게 */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage: "url(/hero-building.png)",
            backgroundSize: "cover",
            backgroundPosition: "center 20%",
            filter: "blur(20px) brightness(0.5) saturate(0.8)",
            transform: "scale(1.1)",
            opacity: 0.4,
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: "rgba(2,4,37,0.72)" }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2
              className="text-2xl sm:text-3xl font-medium tracking-tight"
              style={{ color: "#FFFFFF" }}
            >
              지번 한 줄, 지금 바로.
            </h2>
            <p className="mt-2 text-sm max-w-md" style={{ color: "rgba(255,255,255,0.60)" }}>
              회원가입 없이 일 3건까지 무료로 사용해 보세요.
            </p>
          </div>
          <Link href="/simulator">
            <button
              className="transition-opacity hover:opacity-85 whitespace-nowrap"
              style={{
                background: "#FFCF0D",
                color: "#020425",
                padding: "14px 28px",
                borderRadius: 9,
                fontWeight: 700,
                fontSize: 16,
                border: "none",
                cursor: "pointer",
              }}
            >
              시뮬레이터 열기 →
            </button>
          </Link>
        </div>
      </section>
    </main>
  );
}

/* ── sub-components ── */

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
      <div className="text-[11px] text-muted-foreground font-medium">{badge}</div>
      <div className="mt-2 text-base font-medium">{title}</div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
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
