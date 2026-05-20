import Link from "next/link";

export default function WaitingPage() {
  return (
    <div className="w-full rounded-[10px] border border-[var(--border)] bg-white p-7 text-center">
      <div className="badge mx-auto bg-[var(--pending-bg)] text-[var(--pending-text)]">Pending Approval</div>
      <h1 className="mt-4 text-2xl font-semibold">Your account is pending approval by your Admin</h1>
      <p className="mt-3 text-sm text-[var(--text-2)]">You will be able to enter the workspace once an Admin assigns you to QA or DEV.</p>
      <Link href="/login" className="btn mt-6 inline-flex">Return to sign in</Link>
    </div>
  );
}
