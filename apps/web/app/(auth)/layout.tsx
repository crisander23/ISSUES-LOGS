export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--sidebar-bg)] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-[460px] items-center">{children}</div>
    </main>
  );
}
