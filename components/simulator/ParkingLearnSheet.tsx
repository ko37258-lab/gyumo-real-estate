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
import { PARKING_USAGE_LIST } from "@/lib/parking-standards";

export function ParkingLearnSheet() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5">
            <BookOpenIcon className="size-3.5" />
            <span>주차장법 공부하기</span>
          </Button>
        }
      />
      <SheetContent side="right">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full tracking-wide">
              학습 패널 · 공법의 신
            </span>
          </div>
          <SheetTitle>주차장법 · 한 시간 강의 요약</SheetTitle>
          <SheetDescription>
            디벨로퍼·중개사·수험생을 위한 핵심 정리. 모든 인용은 주차장법 ·
            시행령 · 서울특별시 조례 기준이며, 실제 인허가 시 해당 지자체 확인이
            필수입니다.
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <Section
            num={1}
            title="주차장법은 3단 구조다"
            summary="법률 → 시행령 → 시·도 조례. 핵심은 시행령 별표1, 변동은 조례에서."
          >
            <p>
              주차장법은 위에서부터 <b>법률 → 대통령령(시행령) → 시·도 조례</b>의
              3단 구조입니다. 디벨로퍼와 중개사가 매일 만지는 부설주차장
              설치기준은 결국 시행령 별표1을 기준으로 시작해서, 그 지자체의
              조례로 마무리됩니다.
            </p>
            <ul className="mt-2 space-y-1.5">
              <li>
                · <b>주차장법</b> (법률) — 큰 그림. 부설주차장 의무, 면제·완화의
                근거.
              </li>
              <li>
                · <b>주차장법 시행령</b> (대통령령) — 별표1이 실무의
                바이블입니다. 용도별 N㎡당 1대.
              </li>
              <li>
                · <b>시·도 조례</b> — 시행령 기준의 ±50% 범위에서 강화·완화
                가능 (주차장법 제19조 ⑤). 서울처럼 도심 차량 억제가 필요한
                도시는 강화, 외곽은 완화하는 식.
              </li>
            </ul>
            <p className="mt-2 text-[12px] text-muted-foreground/90">
              ※ 시·군·구 조례가 별도로 있는 경우 그 안에서 한 번 더 세부
              강화가 있을 수 있으므로 사업지의 자치구 조례까지 확인하세요.
            </p>
          </Section>

          <Section
            num={2}
            title="부설주차장 의무 — 19조 + 별표1"
            summary="시설 건축 시 부지 내 원칙, 부득이하면 직선 300m / 도보 600m 인근."
          >
            <p>
              <b>주차장법 제19조</b>가 부설주차장 설치 의무의 모법이고, 그
              구체 기준은 <b>시행령 제6조 별표1</b>에 표로 정리돼 있습니다.
            </p>
            <ul className="mt-2 space-y-1.5">
              <li>
                · <b>원칙</b> — 부지 내 설치. 지상이든 지하든 부지 안에서 해결.
              </li>
              <li>
                · <b>예외</b> — 부지가 좁거나 형상이 안 나오면 부지 인근의
                노외주차장으로 대체 가능. 부지로부터{" "}
                <b>직선 300m 또는 도보 600m</b> 이내.
              </li>
              <li>
                · <b>인근설치 조건</b> — 해당 토지의 소유권 또는 정당한 사용권
                확보가 필요합니다. 단순 임대차로는 인근설치 허가가 잘 안 나오는
                현장이 많아요.
              </li>
            </ul>
            <p className="mt-2 text-[12px] text-muted-foreground/90">
              현장 팁: 협소부지에서 지하 1개 층으로 안 풀리는 경우, 인접
              필지의 노외주차장을 미리 확보하는 게 사업 인허가 속도를
              크게 좌우합니다.
            </p>
          </Section>

          <Section
            num={3}
            title="용도별 설치기준 — 시행령 vs 서울조례"
            summary="100㎡당, 150㎡당, 200㎡당, 400㎡당 — 숫자만 외워도 절반은 풀린다."
          >
            <p>
              아래 표는 본 시뮬레이터가 사용하는 일반론입니다. 자치구 조례나
              특정 시설 분류(예: 1,000㎡ 이상 판매시설)에서 추가 강화가 있을
              수 있으니, 사업 직전엔 반드시 해당 조례 원문을 한 번 더 펴
              보세요.
            </p>
            <div className="mt-3 overflow-x-auto rounded-md border border-border">
              <table className="w-full text-[12px]">
                <thead className="bg-secondary text-muted-foreground">
                  <tr>
                    <th className="text-left px-2.5 py-2 font-medium">용도</th>
                    <th className="text-right px-2.5 py-2 font-medium">
                      시행령
                    </th>
                    <th className="text-right px-2.5 py-2 font-medium">
                      서울조례
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PARKING_USAGE_LIST.map((s) => (
                    <tr
                      key={s.code}
                      className="border-t border-border last:border-b-0"
                    >
                      <td className="px-2.5 py-1.5">{s.label}</td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums">
                        {s.mode === "area"
                          ? `${s.decreeAreaPerSpace}㎡/대`
                          : s.mode === "progressive"
                            ? `누진(${s.decree.firstUpTo}㎡↑ +${s.decree.addPerArea}㎡/대)`
                            : `${s.decreeTiers.length}구간`}
                      </td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums text-foreground/90">
                        {s.mode === "area"
                          ? `${s.seoulAreaPerSpace}㎡/대`
                          : s.mode === "progressive"
                            ? `누진(${s.seoul.firstUpTo}㎡↑ +${s.seoul.addPerArea}㎡/대)`
                            : `${s.seoulTiers.length}구간`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section
            num={4}
            title="산정 방법 — 시설면적·합산·절상"
            summary="시설면적이 분모. 다용도는 합산. 소수점은 무조건 올림."
          >
            <ul className="space-y-1.5">
              <li>
                · <b>시설면적</b>은 그 시설의 용도에 사용되는 면적의 합입니다.
                일반적으로 연면적과 같지만, 주차장·기계실·관리실 같은
                부속용도 면적은 제외하는 경우가 많아요.
              </li>
              <li>
                · <b>다용도 건물</b>은 용도별로 따로 산정한 뒤 합산. 1·2층은
                근린, 3~10층은 업무, 11~15층은 공동주택이면 세 번 계산해서
                더합니다.
              </li>
              <li>
                · <b>소수점 절상</b> — 1대 미만이라도 무조건 1대로 올립니다.
                16.5대 = 17대.
              </li>
              <li>
                · <b>강화·완화의 적용 순서</b> — 시행령으로 한 번 계산 → 조례
                기준으로 한 번 더. 일반적으로 두 값 중 강한 쪽을 적용합니다.
              </li>
            </ul>
            <p className="mt-2 text-[12px] text-muted-foreground/90">
              실무에서 자주 놓치는 부분: 부설주차장 자체의 면적을 시설면적에
              넣지 마세요. 순환 계산이 됩니다.
            </p>
          </Section>

          <Section
            num={5}
            title="면제·완화 — 받을 수 있으면 받자"
            summary="인근 노외주차장, 도시계획시설 주차장, 친환경 가산."
          >
            <ul className="space-y-1.5">
              <li>
                · <b>인근 노외주차장 활용</b> — 부지 인근에 일반 이용 가능한
                노외주차장이 있으면 의무 대수의 일부 또는 전부를 면제받을 수
                있습니다 (주차장법 시행령 제8조).
              </li>
              <li>
                · <b>도시계획시설(주차장) 인근</b> — 부지로부터 일정 거리 내에
                도시계획시설로 결정된 공영주차장이 있으면 추가 완화 여지가
                있습니다.
              </li>
              <li>
                · <b>친환경 가산</b> — 전기차 충전구역 설치, 카셰어링 운영,
                녹색건축 인증 등에 대해 조례에서 가산점·완화를 두는 경우가
                많아요. 서울시는 특히 적극적.
              </li>
            </ul>
            <p className="mt-2 text-[12px] text-muted-foreground/90">
              ※ 면제·완화 범위는 지자체 조례별로 폭이 큽니다. 일반론을
              현장에 그대로 적용하지 말고, 최종 인허가 시 해당 지자체 확인이
              필수입니다.
            </p>
          </Section>

          <Section
            num={6}
            title="실무 팁 — 디벨로퍼와 중개사용"
            summary="1대 25㎡. 지상은 싸고, 지하는 비싸지만 효율이 좋다."
          >
            <ul className="space-y-1.5">
              <li>
                · <b>1대당 약 25㎡</b> — 주차구획 2.5×5m 본체 + 차로 + 회전공간을
                다 합치면 대략 그 수준. 자주식과 기계식, 직각·평행에 따라 ±20%
                변동.
              </li>
              <li>
                · <b>지상 1층 주차장 시공비</b> — 일반적으로 1대당 약 1,200만 원
                전후. 단, 1층을 통째로 주차장으로 쓰면 매출 면적 손실이 크므로
                상업·업무 빌딩은 거의 지하로 보냅니다.
              </li>
              <li>
                · <b>지하주차장 시공비</b> — B1은 대당 약 2,500만 원, B2 이하는
                3,500만 원 이상으로 가는 경우가 일반적입니다. 토질·터파기
                조건에 따라 폭이 큼.
              </li>
              <li>
                · <b>인허가 전 사전 미팅</b> — 토지매입 직후, 건축사 선임 직후,
                인허가 신청 직전 — 세 번은 구청 건축과·교통과에 사전 협의를
                권합니다.
              </li>
            </ul>
          </Section>

          <Section
            num={7}
            title="자주 묻는 질문"
            summary="용도변경·리모델링·사용승인 후 변경 — 다 재산정."
          >
            <FAQ q="용도변경하면 주차대수가 다시 산정되나요?">
              네. 변경 후 용도 기준으로 재계산해서, 부족한 대수만큼 보충해야
              합니다. 사무실 → 음식점처럼 강화 방향 변경은 사전에 추가 주차
              확보 가능성을 꼭 검토하세요.
            </FAQ>
            <FAQ q="리모델링·증축은요?">
              증가한 시설면적에 비례해 추가 주차대수를 산정합니다. 기존 부족분이
              있다면 같이 보충해야 하는 케이스도 있어요.
            </FAQ>
            <FAQ q="사용승인 후 임의로 용도변경 하면?">
              위법 행위입니다. 시정명령 + 이행강제금이 부과되고, 매매·임대차
              실거래에서도 발견되면 분쟁의 원인이 됩니다.
            </FAQ>
            <FAQ q="공동주택과 오피스텔의 차이는?">
              공동주택은 주택건설기준규정에 따라 전용면적별 세대당 비율,
              오피스텔은 업무시설로 분류되지만 실무에서는 주택건설기준 준용으로
              세대당 산정하는 경우가 일반적입니다. 자치구별 운용 차이가
              있으니 확인 필수.
            </FAQ>
          </Section>

          <Section
            num={8}
            title="법령 원문 — 직접 확인하는 습관"
            summary="국가법령정보센터와 서울시 자치법규시스템, 한 번씩 직접 검색해 보세요."
          >
            <ul className="space-y-2">
              <li>
                · <b>국가법령정보센터</b> —{" "}
                <a
                  href="https://www.law.go.kr"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[var(--info)] underline"
                >
                  law.go.kr
                </a>
                . &ldquo;주차장법&rdquo;, &ldquo;주차장법 시행령&rdquo;,
                &ldquo;주차장법 시행규칙&rdquo;으로 검색.
              </li>
              <li>
                · <b>서울특별시 자치법규시스템</b> —{" "}
                <a
                  href="https://legal.seoul.go.kr"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[var(--info)] underline"
                >
                  legal.seoul.go.kr
                </a>
                . &ldquo;서울특별시 주차장 설치 및 관리 조례&rdquo;로 검색.
              </li>
              <li>
                · <b>자치구 조례</b> — 각 구 홈페이지의 법무 또는
                자치법규에서 &ldquo;주차장&rdquo; 검색.
              </li>
            </ul>
            <p className="mt-3 text-[12px] text-muted-foreground/90 bg-secondary px-3 py-2 rounded-md">
              모든 법령 인용·해석 자문: <b>법무법인 윤강</b> 부동산관련법률
              고문.
            </p>
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
        <span className="text-[11px] font-medium text-[var(--info)] mt-0.5 tabular-nums min-w-[18px]">
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
