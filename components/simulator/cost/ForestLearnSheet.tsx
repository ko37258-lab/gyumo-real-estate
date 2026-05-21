"use client";

import { useState, type ReactNode } from "react";
import { BookOpenIcon, ChevronDownIcon } from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const ACCENT = "#9b6b46";

export function ForestLearnSheet() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5">
            <BookOpenIcon className="size-3.5" />
            <span>공부하기</span>
          </Button>
        }
      />
      <SheetContent side="right">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] px-2 py-0.5 rounded-full tracking-wide text-white"
              style={{ background: ACCENT }}
            >
              학습 패널 · 공법의 신
            </span>
          </div>
          <SheetTitle>대체산림자원조성비 완전정복</SheetTitle>
          <SheetDescription>
            산지관리법 제19조 + 시행령 제24조. 산지전용 시 훼손되는 산림자원을
            보전하기 위해 부담하는 금액이며, 산림청 고시 단위금액이 매년 1월에
            갱신됩니다. 최종 금액은 산림청·자치단체 확인이 필요합니다.
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <Section
            num={1}
            title="법적 구조"
            summary="산지관리법 19조 → 시행령 24조 → 산림청 고시 단위금액."
          >
            <ul className="space-y-1.5">
              <li>
                · <b>산지관리법 제19조</b> — 대체산림자원조성비의 모법. 산지전용
                허가·신고·일시사용 시 부과.
              </li>
              <li>
                · <b>산지관리법 시행령 제24조</b> — ㎡당 부과금액 산정 방식
                (기본 단위금액 + 공시지가 반영분 × 보전산지 가산).
              </li>
              <li>
                · <b>산림청 고시</b> — 기본 단위금액은 매년 1월 1일 갱신.
                사업 시점이 결정적으로 중요.
              </li>
              <li>
                · 다른 법률에 의한 의제 처리 시에도 동일 부과.
              </li>
            </ul>
          </Section>

          <Section
            num={2}
            title="적용 대상"
            summary="산지전용·일시사용 전반."
          >
            <ul className="space-y-1.5">
              <li>
                · <b>산지전용허가</b> (제14조) — 영구 전용.
              </li>
              <li>
                · <b>산지전용신고</b> (제15조) — 농어업인 시설 등 신고 대상.
              </li>
              <li>
                · <b>산지일시사용허가</b> (제15조의2) — 1년 이하 일시 사용,
                별도 산정 (낮음).
              </li>
              <li>
                · 다른 법률(국토계획법·건축법 등)에 따른 의제 처리도 포함.
              </li>
            </ul>
          </Section>

          <Section
            num={3}
            title="계산 공식 + 예시"
            summary="㎡당 = (기본 + 공시지가×반영률) × (1+보전산지 가산)."
          >
            <div className="px-3 py-2 rounded bg-secondary font-mono text-[12px] leading-relaxed">
              부담금 = 전용면적(㎡) × ㎡당 부과금액 × (1 − 감면율)
              <br />
              ㎡당 = (기본 단위금액 + 공시지가 × 반영률) × (1 + 보전산지 가산율)
            </div>
            <p className="mt-3 font-medium">예시</p>
            <div className="mt-1 px-3 py-2 rounded bg-card border border-border font-mono text-[12px] leading-relaxed">
              660㎡ · 기본 10,000원 · 공시지가 80,000원 × 1% · 보전산지 0%
              <br />→ ㎡당 = (10,000 + 800) × 1.0 = 10,800원
              <br />→ 부담금 = 660 × 10,800 = 7,128,000원 ≈ 713만원
            </div>
          </Section>

          <Section
            num={4}
            title="단가·요율 (매년 1월 변동)"
            summary="기본 약 10,000원/㎡, 보전산지 30% 가산."
          >
            <ul className="space-y-1.5">
              <li>
                · <b>기본 단위금액</b> — 산림청 고시 (현재 약 10,000원/㎡ 수준).
                매년 1월 1일 갱신.
              </li>
              <li>
                · <b>공시지가 반영률</b> — 1% (시행령 별표 4)
              </li>
              <li>
                · <b>보전산지 가산율</b> — 30% (보전산지는 일반산지 대비 30%
                가산)
              </li>
              <li>
                · 산지 구분(공익용/임업용/준보전산지)에 따라 단가·가산이 다름.
              </li>
            </ul>
          </Section>

          <Section
            num={5}
            title="감면·예외"
            summary="공익사업 50% 감면, 산림사업 면제 등."
          >
            <ul className="space-y-1.5">
              <li>
                · <b>공익사업</b> — 50% 감면 또는 면제
              </li>
              <li>
                · <b>농림어업인 시설</b> — 일정 면적까지 감면
              </li>
              <li>
                · <b>광물자원 개발</b> — 산지복구비 별도, 일부 감면
              </li>
              <li>
                · <b>사방사업·산림 관련 사업</b> — 면제
              </li>
              <li>
                · <b>도로·철도·공항 등 사회기반시설</b> — 별도 기준 적용
              </li>
            </ul>
          </Section>

          <Section
            num={6}
            title="신고·납부 절차"
            summary="허가 신청 → 결정·통지 → 허가 전 납부."
          >
            <ol className="space-y-1.5 list-decimal pl-5">
              <li>산지전용허가 신청 시 부담금 산정</li>
              <li>산림청·지자체가 부담금 결정·통지</li>
              <li>납부 (허가 전 납부 원칙)</li>
              <li>분할납부 가능 (대규모 사업)</li>
              <li>미납 시 허가 효력 발생 불가</li>
            </ol>
          </Section>

          <Section
            num={7}
            title="실무 팁 — 공법의 신 인사이트"
            summary="보전산지 확인·1월 고시 변동·복구비 별도 검토."
          >
            <ul className="space-y-1.5">
              <li>
                · <b>보전산지 vs 준보전산지</b> — 산지정보시스템에서 먼저 확인.
                보전산지는 30% 가산 → 사업비 영향 큼
              </li>
              <li>
                · <b>1월 고시 변동</b> — 매년 1월 1일 기본 단위금액 갱신.
                12월 인허가 vs 1월 인허가로 부담금이 달라질 수 있음
              </li>
              <li>
                · <b>산지일시사용</b> — 1년 이하 일시 사용은 별도 산정으로 훨씬
                낮음. 가설건축물·임시진입로 등 검토
              </li>
              <li>
                · <b>산지복구비</b> — 대체산림자원조성비와 <b>별도</b>로 부과되는
                금액. 두 항목을 함께 검토해야 진짜 산지 비용이 나옴
              </li>
              <li>
                · <b>토지보상감정</b>과 산지 단가는 별개 — 혼동 주의
              </li>
            </ul>
          </Section>

          <Section
            num={8}
            title="자주 묻는 질문"
            summary="농지 전환, 임도, 단가 사전 확인."
          >
            <FAQ q="산지를 농지로 등록하면 산지관리법 적용은 끝?">
              지목변경 후에는 산지관리법이 아닌 농지법이 적용됩니다. 단 산지를
              농지로 전환하는 절차 자체(산지전용)에서 이미 이 부담금이 부과되므로,
              순서가 중요합니다.
            </FAQ>
            <FAQ q="임도(林道) 개설은 부담금 부과?">
              산림사업으로 분류되는 임도는 면제 또는 감면 대상입니다. 사업 목적이
              산림 자체의 관리·이용일 때 적용.
            </FAQ>
            <FAQ q="단가를 미리 알 수 있나?">
              산림청 홈페이지에서 &ldquo;대체산림자원조성비 단위금액 고시&rdquo;로
              검색. 매년 1월 1일 새 고시가 올라옵니다.
            </FAQ>
          </Section>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  num,
  title,
  summary,
  children,
}: {
  num: number;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-lg border border-border bg-card mb-2.5 open:bg-secondary/40">
      <summary className="list-none cursor-pointer flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 rounded-lg">
        <span
          className="text-[11px] font-medium mt-0.5 tabular-nums min-w-[18px]"
          style={{ color: ACCENT }}
        >
          {String(num).padStart(2, "0")}
        </span>
        <span className="flex-1">
          <span className="block text-sm font-medium leading-snug">
            {title}
          </span>
          <span className="block text-[12px] text-muted-foreground mt-0.5 leading-snug">
            {summary}
          </span>
        </span>
        <ChevronDownIcon className="size-4 text-muted-foreground mt-1 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pt-1 pb-4 pl-[42px] text-[13px] leading-relaxed text-foreground/90">
        {children}
      </div>
    </details>
  );
}

function FAQ({ q, children }: { q: string; children: ReactNode }) {
  return (
    <div className="mt-3 first:mt-0">
      <div className="font-medium text-sm">Q. {q}</div>
      <div className="mt-1 text-[12.5px] text-muted-foreground leading-relaxed">
        {children}
      </div>
    </div>
  );
}
