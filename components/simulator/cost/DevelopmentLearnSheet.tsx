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

const ACCENT = "#b6573e";

export function DevelopmentLearnSheet() {
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
          <SheetTitle>개발부담금 완전정복</SheetTitle>
          <SheetDescription>
            개발이익환수에 관한 법률 제5조. 개발사업으로 발생한 개발이익의 일부를
            환수하는 구조이며, 대상사업 여부·면적·비용 인정 범위가 결과를 좌우합니다.
            국토교통부 운영, 최종 부과는 관할청 확인이 필요합니다.
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <Section
            num={1}
            title="법적 구조"
            summary="개발이익환수법 5조 → 시행령·시행규칙 → 국토부 운영."
          >
            <ul className="space-y-1.5">
              <li>
                · <b>개발이익 환수에 관한 법률</b> (개발이익환수법) — 모법.
              </li>
              <li>
                · <b>동법 시행령·시행규칙</b> — 대상사업·부담률·비용 인정 범위
                구체화.
              </li>
              <li>
                · <b>국토교통부</b> 운영, 시·군·구청장이 부과·징수.
              </li>
              <li>
                · 부과 시점은 <b>개발사업 준공</b>(준공인가·사용승인). 사업이
                완료되어야 정확한 산정 가능.
              </li>
            </ul>
          </Section>

          <Section
            num={2}
            title="적용 대상 — 대상사업 여부가 1순위"
            summary="택지·산단·관광·도시개발·지목변경(1,000㎡↑) 등."
          >
            <ul className="space-y-1.5">
              <li>
                · <b>택지개발사업</b> (1만㎡ 이상)
              </li>
              <li>
                · <b>산업단지개발사업</b>
              </li>
              <li>
                · <b>관광단지조성사업</b>
              </li>
              <li>
                · <b>도시개발사업</b>
              </li>
              <li>
                · <b>지목변경이 수반되는 사업</b> (1,000㎡ 이상) — 가장 빈번한
                실무 케이스
              </li>
              <li>
                · 학교용지조성사업, 골프장 조성 등
              </li>
            </ul>
            <p className="mt-2 text-[12px] text-muted-foreground/90">
              ⚠️ 사업이 대상에 해당하지 않으면 부담금이 아예 없습니다. 가장 먼저
              확인할 항목.
            </p>
          </Section>

          <Section
            num={3}
            title="계산 공식 + 예시"
            summary="개발이익 = 종료지가 − 개시지가 − 정상상승 − 개발비용."
          >
            <div className="px-3 py-2 rounded bg-secondary font-mono text-[12px] leading-relaxed">
              부담금 = MAX(0, 개발이익) × 부담률
              <br />
              개발이익 = 종료시점지가 − 개시시점지가 − 정상지가상승분 − 개발비용
            </div>
            <p className="mt-3 font-medium">예시</p>
            <div className="mt-1 px-3 py-2 rounded bg-card border border-border font-mono text-[12px] leading-relaxed">
              종료 120,000 · 개시 80,000 · 정상상승 5,000 · 개발비용 20,000 (만원)
              <br />→ 개발이익 = 120,000 − 80,000 − 5,000 − 20,000 = 15,000만원
              <br />→ 부담금 = 15,000 × 25% = 3,750만원
            </div>
            <p className="mt-2 text-[12px] text-muted-foreground/90">
              개발이익이 0 이하이면 부담금은 0 (MAX 함수). 사업이 손실이면
              부담금 없음.
            </p>
          </Section>

          <Section
            num={4}
            title="부담률"
            summary="일반 25%, 일부 공익성 20%."
          >
            <ul className="space-y-1.5">
              <li>
                · <b>일반 사업</b>: 25%
              </li>
              <li>
                · <b>일부 공익적 사업</b>: 20%
              </li>
              <li>
                · 정확한 분류는 법령 별표 참조. 사업 인허가서·고시문에 명시됨.
              </li>
            </ul>
          </Section>

          <Section
            num={5}
            title="비용 인정 범위 — 가장 중요한 변수"
            summary="토지·인허가·토목·설계·보상 모두 포함. 증빙이 결정적."
          >
            <ul className="space-y-1.5">
              <li>
                · <b>토지 매입비</b> (개시지가에 반영됨)
              </li>
              <li>
                · <b>인허가 비용</b> (각종 부담금·수수료 등)
              </li>
              <li>
                · <b>토목·조경 공사비</b>
              </li>
              <li>
                · <b>설계·감리비</b>
              </li>
              <li>
                · <b>보상비</b> (편입 토지·물건 보상)
              </li>
            </ul>
            <p className="mt-2 text-[12px] text-muted-foreground/90">
              ⚠️ <b>비용 인정이 부담금 결과를 좌우합니다.</b> 영수증·세금계산서·
              감정평가서 등 증빙을 사업 초기부터 철저히 모아야 합니다.
            </p>
          </Section>

          <Section
            num={6}
            title="신고·납부 절차"
            summary="준공 → 6개월 산정 → 60일 납부 → 분할 3년."
          >
            <ol className="space-y-1.5 list-decimal pl-5">
              <li>개발사업 준공 후 6개월 이내 부담금 산정</li>
              <li>국토부·지자체가 결정·통지</li>
              <li>60일 이내 납부</li>
              <li>분할납부 가능 — 3년 이내, 4회 분납</li>
              <li>이의신청 가능 — 결정 통지 후 90일 이내</li>
            </ol>
          </Section>

          <Section
            num={7}
            title="실무 팁 — 공법의 신 인사이트"
            summary="대상 확인·비용 인정 최대화·감정평가·분할납부·90일 시한."
          >
            <ul className="space-y-1.5">
              <li>
                · <b>대상사업 해당 여부</b>를 가장 먼저 확인. 해당 안 되면
                부담금 자체가 없음
              </li>
              <li>
                · <b>비용 인정 범위 최대화</b>가 부담금 최소화의 핵심. 모든
                지출의 증빙 자료 사업 초기부터 정리
              </li>
              <li>
                · <b>개시·종료 시점 지가는 감정평가</b> 기준. 평가서 검토를
                자체적으로도 한 번 더 진행할 것
              </li>
              <li>
                · <b>정상지가상승분</b>은 한국부동산원 지가지수 기준으로
                자동 산정됨
              </li>
              <li>
                · <b>분할납부 활용</b> — 사업 자금 운용 유연성에 큰 차이
              </li>
              <li>
                · <b>이의신청 90일 시한 엄수</b> — 지나면 다툴 수 없음
              </li>
            </ul>
          </Section>

          <Section
            num={8}
            title="자주 묻는 질문"
            summary="대상 외 사업·손실 사업·다른 부담금과 중복."
          >
            <FAQ q="대상사업 아니면 부담금 없나?">
              네. 개발부담금은 대상사업에 한정해서 부과됩니다. 단,
              농지·산지 부담금은 별개로 검토해야 합니다 (두 부담금은 서로
              독립).
            </FAQ>
            <FAQ q="사업이 손실인데도 부담금이 나오나?">
              아니요. 개발이익이 0 이하라면 부담금은 0입니다 (MAX 함수).
              다만 비용 인정 누락으로 &ldquo;장부상&rdquo; 이익이 잡혔다면
              실제 손실과 무관하게 부담금이 산정될 수 있으니 비용 자료가
              결정적입니다.
            </FAQ>
            <FAQ q="다른 부담금과 중복 부과되나?">
              개발부담금 vs 농지·산지 부담금은 별개로 둘 다 부과됩니다.
              단 일부 사업에서는 농지·산지 부담금이 &ldquo;개발비용&rdquo;에
              산입되어 개발부담금 산정 시 차감되는 경우가 있습니다.
              세부 적용은 관할청 확인 필수.
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
