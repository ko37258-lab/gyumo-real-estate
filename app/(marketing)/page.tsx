import Link from "next/link";
import { SITE_HEADER } from "@/lib/branding/constants";
import {
  BANK_INFO,
  CREDIT_PLANS,
  SIGNUP_CREDITS,
  CREDIT_VALID_MONTHS,
  formatWon,
} from "@/lib/credits";

const NAVY = "#020425";
const GOLD = "#FFCF0D";

export default function LandingPage() {
  return (
    <main>
      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden"
        style={{ minHeight: "100dvh", background: NAVY }}
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
          style={{ background: NAVY, opacity: 0.46, zIndex: 3 }}
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
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6"
            style={{
              background: "rgba(255,255,255,0.09)",
              border: "1px solid rgba(255,255,255,0.18)",
              backdropFilter: "blur(8px)",
              fontSize: 11,
              color: "rgba(255,255,255,0.68)",
            }}
          >
            <span className="size-1.5 rounded-full" style={{ background: GOLD }} />
            {SITE_HEADER.subtitle}
          </div>

          {/* 헤드라인 */}
          <h1
            style={{
              margin: 0,
              color: "#FFFFFF",
              fontSize: "clamp(30px, 5.2vw, 62px)",
              fontWeight: 700,
              letterSpacing: "-0.015em",
              lineHeight: 1.22,
              textShadow: "0 6px 34px rgba(0,0,0,0.60)",
              maxWidth: 820,
              marginBottom: 18,
            }}
          >
            지번 한 줄로
            <br />
            <span style={{ color: GOLD }}>땅값부터 사업성</span>까지.
          </h1>

          {/* 본문 */}
          <p
            style={{
              color: "rgba(255,255,255,0.78)",
              fontSize: "clamp(14px, 1.5vw, 18px)",
              fontWeight: 500,
              lineHeight: 1.68,
              maxWidth: 500,
              marginBottom: 30,
              textShadow: "0 2px 12px rgba(0,0,0,0.45)",
            }}
          >
            주변 실거래로 땅값을 추정하고, 건폐율·용적률·일조권을 계산해
            건축가능 규모와 수익률까지 한 화면에서 봅니다.
          </p>

          {/* CTA 버튼 */}
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <Link href="/signup">
              <button
                className="transition-opacity hover:opacity-85"
                style={{
                  background: GOLD,
                  color: NAVY,
                  padding: "14px 30px",
                  borderRadius: 9,
                  fontWeight: 700,
                  fontSize: 16,
                  border: "none",
                  cursor: "pointer",
                  letterSpacing: "-0.01em",
                }}
              >
                무료 {SIGNUP_CREDITS}회로 시작하기
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
                크레딧 안내
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 실제 작업 흐름 (세로 스텝 + 우측 설명) ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <h2 className="text-2xl sm:text-[32px] font-medium tracking-tight leading-snug max-w-lg">
          지번을 넣으면, 검토는 네 단계로 이어집니다.
        </h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-md">
          앞 단계의 결과가 다음 단계 입력값으로 그대로 넘어갑니다. 같은 숫자를
          두 번 옮겨 적을 일이 없습니다.
        </p>

        <div className="mt-12 divide-y divide-border border-t border-border">
          <Step
            no="01"
            title="토지가치분석"
            body="지도에서 필지를 클릭하면 면적·용도지역·지목·공시지가를 불러오고, 주변 실거래 중앙값으로 땅값을 추정합니다. 건축물대장, 인허가 이력, 신축 분양가·임대료 시세도 같이 봅니다."
            tags={["실거래 추정가", "건축물대장", "용도별 시세"]}
          />
          <Step
            no="02"
            title="규모 검토"
            body="건폐율·용적률과 정북 일조권 사선을 층별로 깎아 실제 가능 연면적을 냅니다. 지적도 실형상 그대로 2D 평면·정북단면과 3D 매스로 확인하고, 연접 필지는 합필해서 함께 검토합니다."
            tags={["일조권 사선", "실형상 3D", "합필 검토"]}
          />
          <Step
            no="03"
            title="비용·부담금"
            body="공사비에 농지보전부담금·대체산림자원조성비·개발부담금을 얹어 총 사업비를 잡습니다. 각 부담금은 산식과 감면 요건을 함께 펼쳐볼 수 있습니다."
            tags={["농지·산지", "개발부담금"]}
          />
          <Step
            no="04"
            title="사업성 분석"
            body="분양 또는 임대 수익 모델로 IRR·ROE·손익분기 분양률을 계산합니다. 결과는 미스터홈즈 브랜드 PDF 보고서로 내려받습니다."
            tags={["IRR·ROE", "PDF 보고서"]}
          />
        </div>
      </section>

      {/* ── 크레딧 제도 (신규) ── */}
      <section style={{ background: NAVY }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-xl">
            <h2
              className="text-2xl sm:text-[32px] font-medium tracking-tight leading-snug"
              style={{ color: "#FFFFFF" }}
            >
              구독료 없이, 쓴 만큼만.
            </h2>
            <p
              className="mt-3 text-sm leading-relaxed"
              style={{ color: "rgba(255,255,255,0.62)" }}
            >
              지번 조회 1건에 1크레딧이 차감됩니다. 조회한 물건의 규모검토·비용·
              사업성·보고서는 추가 차감 없이 계속 쓸 수 있습니다. 월 자동결제는
              없습니다.
            </p>
          </div>

          {/* 요금 */}
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <PriceTile
              label="가입 시"
              amount="무료"
              credits={`${SIGNUP_CREDITS}크레딧`}
              note="첫 가입 1회 지급"
            />
            {CREDIT_PLANS.map((p) => (
              <PriceTile
                key={p.id}
                label={p.label}
                amount={formatWon(p.priceWon)}
                credits={`${p.credits}크레딧`}
                note={p.note}
                highlighted={p.id === "30"}
              />
            ))}
          </div>

          {/* 신청 절차 */}
          <div
            className="mt-4 rounded-lg p-5 sm:p-7"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div
              className="text-[13px] font-semibold mb-4"
              style={{ color: "#FFFFFF" }}
            >
              충전 절차
            </div>
            <ol className="grid gap-4 sm:grid-cols-4">
              <Flow
                n={1}
                title="계좌로 송금"
                body={`${BANK_INFO.bank} ${BANK_INFO.account} (${BANK_INFO.holder})`}
              />
              <Flow
                n={2}
                title="신청서 작성"
                body="입금자 성함과 전화번호 뒤 4자리를 남깁니다."
              />
              <Flow
                n={3}
                title="확인 후 지급"
                body="입금 확인 후 3시간 안에 크레딧이 들어옵니다."
              />
              <Flow
                n={4}
                title="정회원 전환"
                body="지급과 동시에 정회원으로 바뀝니다."
              />
            </ol>
            <p
              className="mt-5 pt-4 text-[12px] leading-relaxed"
              style={{
                color: "rgba(255,255,255,0.52)",
                borderTop: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              유효기간은 지급 승인일로부터 {CREDIT_VALID_MONTHS}개월입니다.
              기간이 지나면 남은 크레딧은 자동 소멸하니, 신청 후{" "}
              {CREDIT_VALID_MONTHS}개월 안에 사용해 주세요.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link href="/credits">
              <button
                className="transition-opacity hover:opacity-85"
                style={{
                  background: GOLD,
                  color: NAVY,
                  padding: "12px 26px",
                  borderRadius: 9,
                  fontWeight: 700,
                  fontSize: 15,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                크레딧 신청하기
              </button>
            </Link>
            <Link
              href="/pricing"
              className="text-sm hover:underline"
              style={{ color: "rgba(255,255,255,0.68)" }}
            >
              자주 묻는 질문
            </Link>
          </div>
        </div>
      </section>

      {/* ── 운영자 ── */}
      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid sm:grid-cols-[1fr_1.1fr] gap-10 sm:gap-14 items-start">
          <div>
            <h2 className="text-2xl sm:text-[30px] font-medium tracking-tight leading-snug">
              부동산공법 28년 강의,
              <br />
              &ldquo;공법의 신&rdquo; 고상철 (高相喆).
            </h2>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              계산 결과 옆에는 언제나 근거 조문이 붙습니다. 국토계획법 시행령
              제84·85조, 건축법 시행령 제86조를 그대로 적용하고, 조례 강화
              규정은 지역별로 반영합니다.
            </p>
          </div>
          <dl className="text-sm">
            <Credential term="강의" desc="부동산공법 28년" />
            <Credential
              term="교수"
              desc="인하대학교 정책대학원 부동산학과 초빙교수"
            />
            <Credential
              term="자문"
              desc="법무법인 윤강 부동산관련법률 고문 — 법령 인용 전건 검수"
            />
            <Credential
              term="실무"
              desc="미스터홈즈 FC 전국 가맹점 중개사 현장 검증"
            />
          </dl>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative overflow-hidden" style={{ background: NAVY }}>
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
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2
              className="text-2xl sm:text-3xl font-medium tracking-tight"
              style={{ color: "#FFFFFF" }}
            >
              검토할 땅이 있으신가요.
            </h2>
            <p
              className="mt-2 text-sm max-w-md"
              style={{ color: "rgba(255,255,255,0.60)" }}
            >
              가입하면 무료 {SIGNUP_CREDITS}크레딧을 드립니다. 카드 등록은
              필요 없습니다.
            </p>
          </div>
          <Link href="/signup">
            <button
              className="transition-opacity hover:opacity-85 whitespace-nowrap"
              style={{
                background: GOLD,
                color: NAVY,
                padding: "14px 28px",
                borderRadius: 9,
                fontWeight: 700,
                fontSize: 16,
                border: "none",
                cursor: "pointer",
              }}
            >
              무료 {SIGNUP_CREDITS}회로 시작하기
            </button>
          </Link>
        </div>
      </section>
    </main>
  );
}

/* ── sub-components ── */

function Step({
  no,
  title,
  body,
  tags,
}: {
  no: string;
  title: string;
  body: string;
  tags: string[];
}) {
  return (
    <div className="grid sm:grid-cols-[auto_1fr] gap-4 sm:gap-8 py-7 sm:py-9">
      <div className="text-[13px] tabular-nums font-semibold text-[var(--info)] sm:w-10 sm:pt-1">
        {no}
      </div>
      <div>
        <h3 className="text-lg font-medium tracking-tight">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
          {body}
        </p>
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="text-[11px] px-2 py-0.5 rounded border border-border text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PriceTile({
  label,
  amount,
  credits,
  note,
  highlighted,
}: {
  label: string;
  amount: string;
  credits: string;
  note?: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className="rounded-lg p-5"
      style={{
        background: highlighted ? "rgba(255,207,13,0.10)" : "rgba(255,255,255,0.05)",
        border: highlighted
          ? `1px solid ${GOLD}`
          : "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.58)" }}>
        {label}
      </div>
      <div
        className="mt-2 text-xl font-semibold tabular-nums"
        style={{ color: "#FFFFFF" }}
      >
        {amount}
      </div>
      <div
        className="mt-1 text-sm font-medium tabular-nums"
        style={{ color: highlighted ? GOLD : "rgba(255,255,255,0.80)" }}
      >
        {credits}
      </div>
      {note && (
        <div
          className="mt-2.5 text-[11.5px] leading-relaxed"
          style={{ color: "rgba(255,255,255,0.48)" }}
        >
          {note}
        </div>
      )}
    </div>
  );
}

function Flow({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li>
      <div
        className="text-[11px] tabular-nums font-semibold"
        style={{ color: GOLD }}
      >
        {n}
      </div>
      <div className="mt-1 text-[13px] font-medium" style={{ color: "#FFFFFF" }}>
        {title}
      </div>
      <div
        className="mt-1 text-[12px] leading-relaxed"
        style={{ color: "rgba(255,255,255,0.58)" }}
      >
        {body}
      </div>
    </li>
  );
}

function Credential({ term, desc }: { term: string; desc: string }) {
  return (
    <div className="grid grid-cols-[3.5rem_1fr] gap-4 py-3 border-b border-border last:border-0">
      <dt className="text-[12px] text-muted-foreground pt-0.5">{term}</dt>
      <dd className="leading-relaxed">{desc}</dd>
    </div>
  );
}
