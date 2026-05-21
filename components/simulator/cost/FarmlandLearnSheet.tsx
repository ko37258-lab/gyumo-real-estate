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

const ACCENT = "#d97757";

export function FarmlandLearnSheet() {
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
          <SheetTitle>농지보전부담금 완전정복</SheetTitle>
          <SheetDescription>
            농지법 제38조 + 시행령 제53조. 농지전용 시 농지보전을 위해 부담하는
            금액으로, 농어촌공사가 위탁 징수합니다. 인허가·자치단체별 운용 차이가
            있어 최종 금액은 관할청 확인이 필요합니다.
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <Section
            num={1}
            title="법적 구조"
            summary="농지법 38조 → 시행령 53조 → 농어촌공사 위탁 징수."
          >
            <ul className="space-y-1.5">
              <li>
                · <b>농지법 제38조</b> — 농지보전부담금의 모법. 전용허가·협의·
                신고를 받은 자가 부담.
              </li>
              <li>
                · <b>농지법 시행령 제53조</b> — ㎡당 부과기준액 산정 방식
                (공시지가 × 30%, 상한 50,000원/㎡ 등).
              </li>
              <li>
                · <b>한국농어촌공사</b>가 위탁 징수. 부담금 납부확인이 있어야
                전용허가 효력 발생.
              </li>
              <li>
                · 다른 법률(국토계획법·개발제한구역법 등)에 따른{" "}
                <b>의제 처리</b>로 농지전용이 이뤄질 때도 동일하게 부과.
              </li>
            </ul>
          </Section>

          <Section
            num={2}
            title="적용 대상"
            summary="농지전용허가·협의·신고 모두 부과 대상."
          >
            <ul className="space-y-1.5">
              <li>
                · <b>농지전용허가</b> (제34조) — 시장·군수·구청장 허가 후 전용.
              </li>
              <li>
                · <b>농지전용협의</b> (제35조) — 도시계획·산업단지·택지개발 등에서
                관계행정청 협의.
              </li>
              <li>
                · <b>농지전용신고</b> (제35조의2) — 농어업인 주택·창고 등 일부
                유형은 신고 대상.
              </li>
              <li>
                · 다른 법률의 의제 처리 — 건축법·국토계획법 등에서 농지전용이
                의제되는 경우도 포함.
              </li>
            </ul>
          </Section>

          <Section
            num={3}
            title="계산 공식 + 예시"
            summary="㎡당 부과기준액 = min(공시지가×30%, 50,000원)."
          >
            <div className="px-3 py-2 rounded bg-secondary font-mono text-[12px] leading-relaxed">
              부담금 = 전용면적(㎡) × 부과기준액 × (1 − 감면율)
              <br />
              부과기준액 = MIN(개별공시지가 × 30%, ㎡당 50,000원)
            </div>
            <p className="mt-3 font-medium">예시</p>
            <div className="mt-1 px-3 py-2 rounded bg-card border border-border font-mono text-[12px] leading-relaxed">
              전용면적 660㎡ · 공시지가 150,000원/㎡ · 감면 0%
              <br />
              → 부과기준액 = MIN(150,000 × 30%, 50,000)
              <br />
              {"   "}= MIN(45,000, 50,000) = 45,000원/㎡
              <br />→ 부담금 = 660 × 45,000 = 29,700,000원 ≈ 2,970만원
            </div>
          </Section>

          <Section
            num={4}
            title="단가·요율 (현행 기준)"
            summary="공시지가의 30%, ㎡당 상한 50,000원."
          >
            <ul className="space-y-1.5">
              <li>
                · <b>적용률</b>: 개별공시지가의 30%
              </li>
              <li>
                · <b>㎡당 상한</b>: 50,000원 (시행령 별표 2 기준)
              </li>
              <li>
                · <b>농업진흥지역</b>: 상한 동일. 단 감면 대상이 다름
              </li>
              <li>
                · <b>일반 농지</b>: 상한 50,000원 적용이 일반적
              </li>
            </ul>
            <p className="mt-2 text-[12px] text-muted-foreground/90">
              공시지가는 매년 5월 결정·공시되므로 인허가 시점에 따라 부담금이
              달라질 수 있습니다. 시기 조정만으로도 부담금 변동 가능.
            </p>
          </Section>

          <Section
            num={5}
            title="감면·예외"
            summary="공익사업·농어업인 주택·중소기업 공장 등."
          >
            <ul className="space-y-1.5">
              <li>
                · <b>공익사업</b> — 일부 감면 또는 면제 (도로·철도·학교 등)
              </li>
              <li>
                · <b>농어업인 자기 주택 신축</b> — 660㎡까지 면제 (신고 대상)
              </li>
              <li>
                · <b>중소기업 공장</b> — 50% 감면 (요건 충족 시)
              </li>
              <li>
                · <b>농촌체험·휴양마을</b> — 감면 가능
              </li>
              <li>
                · <b>농지전용신고 대상 시설</b> — 100% 감면 (농어업인 주택
                660㎡ 이내 등)
              </li>
            </ul>
            <p className="mt-2 text-[12px] text-muted-foreground/90">
              ※ 감면 적용 여부는 사업 유형·면적·신청자 자격에 따라 다르므로
              관할청 사전 검토 필수.
            </p>
          </Section>

          <Section
            num={6}
            title="신고·납부 절차"
            summary="허가 신청 → 결정·통지 → 30일 이내 납부."
          >
            <ol className="space-y-1.5 list-decimal pl-5">
              <li>농지전용허가 신청 시 부담금 산정</li>
              <li>허가관청이 부담금 결정·통지</li>
              <li>한국농어촌공사에 납부 (30일 이내 원칙)</li>
              <li>분할납부 가능 (대규모 사업)</li>
              <li>미납 시 가산금 + 강제징수, 허가 효력 발생 불가</li>
            </ol>
          </Section>

          <Section
            num={7}
            title="실무 팁 — 공법의 신 인사이트"
            summary="공시지가 시점·진흥지역·면제 활용·분할납부."
          >
            <ul className="space-y-1.5">
              <li>
                · <b>공시지가 시점</b> — 매년 5월 결정. 1~4월 인허가가 유리한
                지역이 많음
              </li>
              <li>
                · <b>진흥지역 vs 일반농지</b> — 한국토지정보시스템(KLIS)에서 먼저
                확인. 진흥지역은 감면 대상이 좁음
              </li>
              <li>
                · <b>면적이 클수록 상한 적용 가능성 ↑</b> — 공시지가가 높을 때
                ㎡당 상한 50,000원이 발동하면 부담금 둔화
              </li>
              <li>
                · <b>농어업인 주택 660㎡ 면제</b> — 농지 인근 단독주택 사업의
                대표 활용 카드
              </li>
              <li>
                · <b>분할납부</b> — 대규모 사업은 자금 운용 유연성을 위해 활용
                권장
              </li>
            </ul>
          </Section>

          <Section
            num={8}
            title="자주 묻는 질문"
            summary="임야→농지 전환, 미납 효력, 환급 가능 여부."
          >
            <FAQ q="임야를 농지로 만든 후 다시 전용하면?">
              농지로 등록(지목변경)된 시점부터 농지법 적용 → 부담금 대상이
              됩니다. 산지 → 농지 전환 자체에도 별도 절차(산지전용)가 필요하므로
              두 단계 비용을 모두 고려해야 합니다.
            </FAQ>
            <FAQ q="부담금을 안 내면 어떻게 되나?">
              전용허가의 효력이 발생하지 않습니다. 가산금이 부과되고 강제징수
              대상이 됩니다. 사실상 사업 시작 자체가 막힙니다.
            </FAQ>
            <FAQ q="환급이 되나요?">
              전용 목적을 달성하지 못하거나 일정 사유에 해당하는 경우 환급이
              가능합니다(농지법 제42조). 사업 무산 시 환급 신청을 잊지 마세요.
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
