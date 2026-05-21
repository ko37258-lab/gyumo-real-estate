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

export function SunlightLearnSheet() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5">
            <BookOpenIcon className="size-3.5" />
            <span>일조권 공부하기</span>
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
          <SheetTitle>일조권 사선제한 · 한 시간 강의 요약</SheetTitle>
          <SheetDescription>
            2023.9.12 개정으로 기준점이 9m → 10m로 상향됐습니다. 디벨로퍼·중개사·
            수험생을 위한 핵심 정리. 모든 인용은 헌법 35조 환경권부터 건축법
            시행령 86조까지의 실정법 기준이며, 실제 인허가 시 해당 지자체
            확인이 필수입니다.
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <Section
            num={1}
            title="일조권의 법적 구조 — 헌법부터 시행령까지"
            summary="환경권(헌법 35조) → 건축법 61조 → 시행령 86조. 판례가 보강한 영역."
          >
            <p>
              일조권은 단순한 사선제한이 아닙니다. 우리 헌법{" "}
              <b>제35조 환경권</b>이 모법이고, 그 구체화로 <b>건축법 제61조</b>가
              일조 등의 확보를 위한 건축 제한을 두며, 그 실무 기준은{" "}
              <b>건축법 시행령 제86조</b>가 정합니다.
            </p>
            <ul className="mt-2 space-y-1.5">
              <li>
                · <b>헌법 35조</b> — 모든 국민은 건강하고 쾌적한 환경에서 생활할
                권리. 일조권은 이로부터 파생된 환경권의 한 갈래.
              </li>
              <li>
                · <b>건축법 제61조</b> — 일조 등의 확보를 위해 건축물의 높이를
                제한할 수 있다는 모법 조항.
              </li>
              <li>
                · <b>건축법 시행령 제86조</b> — 1항(정북), 2항(적용 제외),
                3항(채광 — 공동주택), 4항(정남 특례)로 구성된 실무의 핵심.
              </li>
              <li>
                · <b>판례</b> — 대법원은 일조시간 침해(동지일 기준 연속 2시간 /
                총 4시간 미달 등)를 손해배상 사유로 일관되게 인정해 왔습니다.
                공법상 적법해도 사법상 손해배상 책임은 별도라는 점이 중요.
              </li>
            </ul>
            <p className="mt-2 text-[12px] text-muted-foreground/90">
              실무 포인트: 일조권 분쟁은 인허가 이후에도 민사상 분쟁으로 이어집니다.
              인허가 통과 = 분쟁 종결이 아닙니다.
            </p>
          </Section>

          <Section
            num={2}
            title="2023.9.12 개정 — 9m에서 10m로"
            summary="저층부 1.5m 이격 기준이 9m → 10m로 상향. 사실상 3층까지 자유."
          >
            <p>
              <b>2023년 9월 12일 시행령 개정</b>으로 정북 일조권 사선의 기준점이{" "}
              <s className="text-muted-foreground">9m</s> → <b>10m</b>로
              상향됐습니다. 작은 숫자 변화 같지만 디벨로퍼에게는 상당한 의미가
              있는 변화입니다.
            </p>
            <ul className="mt-2 space-y-1.5">
              <li>
                · <b>개정 전</b> (~2023.9.11): 높이 9m 이하 1.5m 이격 / 9m 초과
                h/2−1.5 이격
              </li>
              <li>
                · <b>개정 후</b> (2023.9.12~): 높이 <b>10m</b> 이하 1.5m 이격 /
                <b>10m</b> 초과 h/2−1.5 이격
              </li>
              <li>
                · 통상 1개 층이 3~3.5m 안팎이므로 9m → 10m 상향은 사실상{" "}
                <b>저층 3개 층까지 사선 적용을 받지 않는다</b>는 효과.
              </li>
            </ul>
            <p className="mt-2 text-[12px] text-muted-foreground/90">
              개정 배경: 협소부지·저층 주거의 일조권 사선이 사업성을 과도하게 압박해 왔다는
              현장 의견을 반영한 완화. 단, 도시계획조례에서 더 강하게 둘 수
              있으므로 지자체 조례는 별도 확인 필수.
            </p>
          </Section>

          <Section
            num={3}
            title="정북방향 일조권 (86조 1항)"
            summary="전용·일반주거지역만 적용. 10m 단계별 이격."
          >
            <p>
              가장 자주 만나는 규제. <b>전용주거지역</b>과{" "}
              <b>일반주거지역</b>에 적용되며, <b>준주거지역·상업·공업지역은
              비적용</b>입니다.
            </p>
            <div className="mt-3 rounded-md border border-border bg-card overflow-hidden">
              <table className="w-full text-[12px]">
                <thead className="bg-secondary text-muted-foreground">
                  <tr>
                    <th className="text-left px-2.5 py-1.5 font-medium">
                      높이 구간
                    </th>
                    <th className="text-left px-2.5 py-1.5 font-medium">
                      필요 이격거리
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border">
                    <td className="px-2.5 py-1.5">10m 이하</td>
                    <td className="px-2.5 py-1.5 tabular-nums">1.5m 이상</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-2.5 py-1.5">10m 초과</td>
                    <td className="px-2.5 py-1.5 tabular-nums">
                      해당 부분 높이의 1/2 이상
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2">
              예시: 4층 14m 건물의 4층 부분은 14m의 1/2 = 7m, 거기서 1.5m를 뺀
              5.5m 이상 이격이 필요합니다. (정확히는 해당 부분 높이의 1/2 이상.
              조례에 따라 −1.5 보정 인정 방식 차이 있음)
            </p>
          </Section>

          <Section
            num={4}
            title="채광방향 일조권 (86조 3항) — 공동주택 전용"
            summary="동간 이격(인동거리). 채광창에서 경계선까지 2배(준주거·근린상업은 4배)."
          >
            <p>
              정북 일조권과는 별개로 <b>공동주택</b>에는 채광방향 일조권이
              추가로 작용합니다. 동(棟)과 동 사이 인동거리, 그리고 인접대지경계선과의
              관계를 함께 봅니다.
            </p>
            <ul className="mt-2 space-y-1.5">
              <li>
                · <b>채광창 → 인접대지경계선</b> — 채광창이 있는 벽면이
                인접대지경계선까지 띄워야 하는 거리. 일반 주거지역은 채광창
                높이의 2배, 준주거·근린상업지역은 4배 이상이 기본입니다.
              </li>
              <li>
                · <b>동간 인동거리</b> — 같은 대지의 두 동 사이도 충분한
                일조·채광이 되도록 이격해야 합니다. 「주택건설기준규정」 제33조와
                지자체 조례가 함께 작용.
              </li>
              <li>
                · <b>회전배치 기법</b> — 정북 또는 정남 축에 수직으로 동을
                배치하면 채광방향 이격 부담이 줄어드는 경우가 많습니다. 단지
                마스터플랜 단계에서 자주 활용.
              </li>
            </ul>
            <p className="mt-2 text-[12px] text-muted-foreground/90">
              주의: 채광방향 일조권은 단지형 공동주택에서 사업성을 정북 사선보다
              더 강하게 압박하는 경우가 많습니다. 동 배치 + 평면 계획 단계에서
              검토 필수.
            </p>
          </Section>

          <Section
            num={5}
            title="적용 제외 (86조 2항)"
            summary="도로·공원·철도 인접, 정북 인접대지가 비주거, 너비 2m 이하."
          >
            <p>
              모든 대지가 정북 일조권을 받는 건 아닙니다. 시행령 86조 2항이 적용
              제외 케이스를 두고 있습니다.
            </p>
            <ul className="mt-2 space-y-1.5">
              <li>
                · <b>정북방향이 도로(너비 4m 이상)·공원·철도부지·하천·녹지 등</b>일
                때 — 일조 침해 대상이 없으므로 비적용.
              </li>
              <li>
                · <b>정북 인접대지가 비주거지역</b>인 경우 — 상업·공업지역과
                인접한 주거지역 끝단은 일조권에서 자유로워질 수 있음. (조례별
                추가 조건)
              </li>
              <li>
                · <b>인접대지의 너비가 2m 이하의 좁고 긴 형상</b>인 경우.
              </li>
              <li>
                · <b>같은 단지 내</b> 다른 건물과의 관계는 정북 일조권이 아니라
                채광 일조권(86조 3항)으로 따로 검토.
              </li>
            </ul>
            <p className="mt-2 text-[12px] text-muted-foreground/90">
              실무 팁: 코너 부지(2면 도로)나 공원·녹지에 면한 부지는 정북 일조권
              해방으로 사업성이 크게 개선될 수 있습니다. 토지매입 단계에서 꼭
              확인하세요.
            </p>
          </Section>

          <Section
            num={6}
            title="정남방향 특례 (86조 4항)"
            summary="택지개발지구·대지조성사업지구 등 일률 적용 단지에서 가능."
          >
            <p>
              일반적으로 일조권은 정북 기준이지만, 시행령 86조 4항은{" "}
              <b>정남 기준 사선제한을 일률 적용</b>할 수 있는 예외를 둡니다.
            </p>
            <ul className="mt-2 space-y-1.5">
              <li>
                · <b>택지개발지구</b>(택지개발촉진법),{" "}
                <b>대지조성사업지구</b>(주택법), 도시개발구역, 정비구역 등
                <b> 단지 전체가 동일 기준으로 개발되는 구역</b>에서 — 단지
                마스터플랜이 정남 기준으로 짜여 있다면 정남 적용 가능.
              </li>
              <li>
                · 적용 시 위 면 일조도가 균질해지지만, 단지의 일조 컨셉 자체를
                정남으로 바꿔야 가능. 단일 필지 차원에서 임의 선택할 수 있는
                옵션이 아닙니다.
              </li>
            </ul>
          </Section>

          <Section
            num={7}
            title="실무 팁 — 사업성에 미치는 영향"
            summary="좁고 깊은 부지에 치명적. 회전배치·인접대지 확보·사전협의로 완화."
          >
            <ul className="space-y-1.5">
              <li>
                · <b>좁고 깊은 부지(예: 8m × 25m)</b>에서 정북 사선은 치명적입니다.
                상부층 손실률 30% 이상도 흔합니다. 본 시뮬레이터의 &ldquo;일조권
                손실 %&rdquo; 메트릭을 토지 매입 전에 꼭 확인하세요.
              </li>
              <li>
                · <b>인접대지 확보·합필</b> — 정북 인접대지를 매입하거나 합필하면
                일조권 기준점이 더 멀어져서 사업성이 크게 개선됩니다. 비용 대비
                효과가 좋은 옵션.
              </li>
              <li>
                · <b>코너부지·도로 인접</b>으로 86조 2항 적용 제외를 활용하면
                일조권에서 완전 자유로워질 수 있습니다.
              </li>
              <li>
                · <b>채광방향(86조 3항)</b>은 공동주택에서 정북 사선보다 더 강한
                제약일 때가 많습니다. 동 배치를 회전 또는 ㄱ자·□자 등으로 풀어내는
                기법이 효과적.
              </li>
              <li>
                · <b>인허가 사전협의</b> — 일조권은 조례·심의 단계에서 추가 강화가
                흔합니다. 매입 직후 1회, 건축사 선임 직후 1회는 구청 건축과·심의
                담당과 사전 미팅을 권합니다.
              </li>
            </ul>
          </Section>

          <Section
            num={8}
            title="자주 묻는 질문 + 법령 원문"
            summary="개정 적용일·조례 강화·민사 손해배상 등."
          >
            <FAQ q="2023.9.12 이전 인허가 받은 건물은 9m 기준 그대로?">
              네. 인허가 시점 법령이 적용됩니다. 다만 사용승인 전이라도 변경허가가
              필요한 경우는 변경 시점 법령으로 다시 봅니다.
            </FAQ>
            <FAQ q="지자체 조례가 시행령보다 강하면 어느 쪽?">
              조례가 시행령보다 더 강한 기준을 둘 수 있고, 그 경우 조례가 적용됩니다.
              완화는 일반적으로 허용되지 않습니다. 서울시처럼 도심부 일조 보호가
              필요한 곳은 추가 강화 사례가 있습니다.
            </FAQ>
            <FAQ q="공법상 적법한데 민사 일조권 소송 가능한가요?">
              가능합니다. 대법원은 공법상 적법성과 사법상 일조 침해를 별개로 판단합니다.
              동지일 기준 연속 2시간 또는 총 4시간 이상의 일조가 보장되어야 한다는
              일조시간 기준이 판례상 자리잡혀 있습니다.
            </FAQ>
            <FAQ q="옥상 펜트하우스·옥탑은 일조권 계산에 포함되나요?">
              주거용 옥탑(다락 포함)은 일조권 사선 적용 대상이 됩니다. 비주거용
              물탱크·승강기탑 등 옥탑 부속은 일정 면적 이하면 제외될 수 있으나,
              자치구별 운용 차이가 있어 확인 필수.
            </FAQ>

            <div className="mt-4 space-y-2 text-[13px] leading-relaxed">
              <div className="font-medium">법령 원문</div>
              <ul className="space-y-1.5">
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
                  . &ldquo;건축법&rdquo;, &ldquo;건축법 시행령 86조&rdquo;,
                  &ldquo;주택건설기준규정 33조&rdquo;로 검색.
                </li>
                <li>
                  · <b>지자체 도시계획조례</b> — 자치구·시 홈페이지 자치법규에서
                  &ldquo;일조권&rdquo;, &ldquo;사선&rdquo;, &ldquo;채광&rdquo;
                  검색.
                </li>
              </ul>
              <div className="mt-3 text-[12px] text-muted-foreground/90 bg-secondary px-3 py-2 rounded-md">
                모든 법령 인용·해석 자문: <b>법무법인 윤강</b> 부동산관련법률
                고문.
              </div>
            </div>
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
