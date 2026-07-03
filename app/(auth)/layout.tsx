export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #020425 0%, #0d1125 60%, #1a1e3a 100%)" }}>
      {children}
    </div>
  );
}
