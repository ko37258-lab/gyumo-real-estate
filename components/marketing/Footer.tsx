import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border mt-20 py-10 text-[12px] text-muted-foreground">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
        <div className="col-span-2">
          <div className="font-medium text-foreground text-sm">
            미스터홈즈 (미스터홈즈) FC · 공법의 신
          </div>
          <div className="mt-1.5 leading-relaxed">
            고상철 (高相喆) 대표<br />
            부동산공법 28년 강의 · 인하대학교 정책대학원 부동산학과 초빙교수<br />
            법무법인 윤강 부동산관련법률 고문
          </div>
        </div>
        <div>
          <div className="font-medium text-foreground mb-2">서비스</div>
          <ul className="space-y-1">
            <li>
              <Link href="/simulator" className="hover:text-foreground">
                규모 시뮬레이터
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-foreground">
                요금제
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-medium text-foreground mb-2">법령 근거</div>
          <ul className="space-y-1">
            <li>국토계획법 시행령 제84조</li>
            <li>국토계획법 시행령 제85조</li>
            <li>건축법 제61조 · 시행령 제86조</li>
          </ul>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 pt-6 border-t border-border flex flex-col sm:flex-row gap-2 justify-between text-[11px] text-muted-foreground/80">
        <span>© 2026 미스터홈즈 (미스터홈즈) FC. All rights reserved.</span>
        <span>
          본 결과는 참고용입니다. 실시설계 전 건축사·인허가 사전협의 필수.
        </span>
      </div>
    </footer>
  );
}
