import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import InstallBar from "@/components/InstallBar";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* 맨 위 — 「홈 화면에 추가」 줄(설치할 수 있을 때만 보인다) */}
      <InstallBar appName="규모검토" accent="#b8900a" />
      <Nav />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
