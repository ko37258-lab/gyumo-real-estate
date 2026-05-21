import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Nav() {
  return (
    <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full tracking-wide">
            SCALE REVIEW
          </span>
          <span className="font-medium text-sm">건축가능 규모검토</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/pricing"
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-secondary transition"
          >
            가격
          </Link>
          <Link
            href="/simulator"
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-secondary transition"
          >
            시뮬레이터
          </Link>
          <Button asChild size="sm">
            <Link href="/simulator">지번 조회 시작</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
