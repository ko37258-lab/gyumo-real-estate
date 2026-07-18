import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BANK_INFO,
  CREDIT_PLANS,
  CREDIT_VALID_MONTHS,
  SIGNUP_CREDITS,
  formatWon,
} from "@/lib/credits";

export default function PricingPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <div className="max-w-2xl">
        <h1 className="text-3xl sm:text-[40px] font-semibold tracking-tight leading-tight">
          쓴 만큼만 차감되는
          <br />
          크레딧 방식입니다.
        </h1>
        <p className="mt-5 text-muted-foreground leading-relaxed">
          월 구독료와 자동결제가 없습니다. 지번 조회 1건에 1크레딧이 차감되고,
          조회한 물건의 규모검토·비용·사업성 분석과 PDF 보고서는 추가 차감 없이
          계속 쓸 수 있습니다.
        </p>
      </div>

      {/* 요금 */}
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        <PlanTile
          name="가입 무료"
          price="0원"
          credits={SIGNUP_CREDITS}
          note="첫 가입 시 1회 지급"
          cta={{ label: "가입하고 받기", href: "/signup" }}
        />
        {CREDIT_PLANS.map((p) => (
          <PlanTile
            key={p.id}
            name={p.label}
            price={formatWon(p.priceWon)}
            credits={p.credits}
            note={p.note}
            highlighted={p.id === "30"}
            cta={{ label: "신청하기", href: "/credits" }}
          />
        ))}
      </div>

      <p className="mt-4 text-[12px] text-muted-foreground">
        크레딧 유효기간은 지급 승인일로부터 {CREDIT_VALID_MONTHS}개월이며, 기간이
        지나면 남은 크레딧은 자동 소멸합니다. 관리자·스텝 계정은 차감 없이
        사용합니다.
      </p>

      {/* 충전 절차 */}
      <section className="mt-16 border-t border-border pt-12">
        <h2 className="text-2xl font-medium tracking-tight">충전 절차</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-4">
          <Flow
            n={1}
            title="계좌로 송금"
            body={`${BANK_INFO.bank} ${BANK_INFO.account} (예금주 ${BANK_INFO.holder})`}
          />
          <Flow
            n={2}
            title="신청서 작성"
            body="크레딧 신청 화면에서 입금자 성함과 전화번호 뒤 4자리를 남깁니다."
          />
          <Flow
            n={3}
            title="확인 후 지급"
            body="입금이 확인되면 3시간 안에 크레딧이 계정에 들어옵니다."
          />
          <Flow
            n={4}
            title="정회원 전환"
            body="지급과 동시에 일반회원에서 정회원으로 바뀝니다."
          />
        </ol>
      </section>

      {/* FAQ */}
      <section className="mt-16 border-t border-border pt-12">
        <h2 className="text-2xl font-medium tracking-tight">자주 묻는 질문</h2>
        <div className="mt-8 grid sm:grid-cols-2 gap-x-12 gap-y-7 text-[13px] text-muted-foreground leading-relaxed">
          <FAQItem
            q="크레딧은 언제 차감되나요?"
            a="지번을 새로 조회할 때 1크레딧입니다. 이미 조회한 물건을 이력에서 다시 열면 재조회로 처리되어 1크레딧이 차감됩니다."
          />
          <FAQItem
            q="규모검토나 보고서도 차감되나요?"
            a="아닙니다. 조회를 마친 물건의 규모검토·비용·사업성 분석과 PDF 보고서 생성은 몇 번을 해도 추가 차감이 없습니다."
          />
          <FAQItem
            q="남은 크레딧은 언제 사라지나요?"
            a={`지급 승인일로부터 ${CREDIT_VALID_MONTHS}개월입니다. 신청 후 ${CREDIT_VALID_MONTHS}개월 안에 사용해 주세요. 서로 다른 시기에 받은 크레딧은 만료가 빠른 것부터 차감됩니다.`}
          />
          <FAQItem
            q="결제 수단은 계좌이체뿐인가요?"
            a="현재는 계좌 송금 후 관리자 확인 방식으로만 운영합니다. 카드 결제는 준비 중입니다."
          />
          <FAQItem
            q="법령 인용은 어디까지 정확한가요?"
            a="국토계획법 시행령 제84·85조, 건축법 시행령 제86조를 그대로 적용하며, 법무법인 윤강 부동산법률 고문이 조문 인용을 검토합니다."
          />
          <FAQItem
            q="산출 결과를 감정평가로 쓸 수 있나요?"
            a="아닙니다. 실거래·공시지가 기반 추정치이며 감정평가나 인허가 확약이 아닙니다. 실제 인허가는 관할 지자체 협의가 필요합니다."
          />
        </div>
      </section>

      <div className="mt-16 flex flex-wrap items-center gap-4">
        <Button asChild size="lg">
          <Link href="/signup">무료 {SIGNUP_CREDITS}회로 시작하기</Link>
        </Button>
        <Link
          href="/credits"
          className="text-sm text-[var(--info)] hover:underline"
        >
          이미 회원이라면 크레딧 신청
        </Link>
      </div>
    </main>
  );
}

function PlanTile({
  name,
  price,
  credits,
  note,
  highlighted,
  cta,
}: {
  name: string;
  price: string;
  credits: number;
  note?: string;
  highlighted?: boolean;
  cta: { label: string; href: string };
}) {
  return (
    <div
      className={
        "rounded-lg border p-6 flex flex-col " +
        (highlighted
          ? "border-[var(--info)] bg-[var(--info-bg)]"
          : "border-border bg-card")
      }
    >
      <div className="text-sm font-medium">{name}</div>
      <div className="mt-3 text-3xl font-semibold tabular-nums">{price}</div>
      <div className="mt-1.5 text-base font-medium tabular-nums text-[var(--info)]">
        {credits}크레딧
      </div>
      <div className="mt-2 text-[12px] text-muted-foreground flex-1">
        {note ?? `조회 ${credits}건`}
      </div>
      <div className="mt-6">
        <Button
          asChild
          variant={highlighted ? "default" : "outline"}
          className="w-full"
        >
          <Link href={cta.href}>{cta.label}</Link>
        </Button>
      </div>
    </div>
  );
}

function Flow({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li>
      <div className="text-[12px] tabular-nums font-semibold text-[var(--info)]">
        {n}
      </div>
      <div className="mt-1.5 text-sm font-medium">{title}</div>
      <div className="mt-1.5 text-[12.5px] text-muted-foreground leading-relaxed">
        {body}
      </div>
    </li>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <div className="font-medium text-foreground text-sm">{q}</div>
      <div className="mt-1.5">{a}</div>
    </div>
  );
}
