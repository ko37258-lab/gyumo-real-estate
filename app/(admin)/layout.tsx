import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/admin");

  const { data: profile } = await supabase
    .from("gyumo_profiles")
    .select("is_admin, role, full_name, email")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin && profile?.role !== "스텝") redirect("/");

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* 관리자 헤더 */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{ background: "rgba(2,4,37,0.96)", borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "#FFCF0D", color: "#020425" }}>
              ADMIN
            </span>
            <Link href="/" className="text-white/80 text-sm font-medium hover:text-white">
              규모검토 관리자
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/admin" className="px-3 py-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                대시보드
              </Link>
              <Link href="/admin/users" className="px-3 py-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                회원 관리
              </Link>
              <Link href="/admin/credits" className="px-3 py-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                크레딧 신청
              </Link>
            </nav>
            <div className="flex items-center gap-2 pl-3 border-l border-white/10">
              <span className="text-xs text-white/40">{profile.full_name || profile.email}</span>
              <form action={signOut}>
                <button type="submit" className="text-xs px-2 py-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                  로그아웃
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
