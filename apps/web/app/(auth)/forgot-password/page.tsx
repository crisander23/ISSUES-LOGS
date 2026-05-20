"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api.post("/api/auth/forgot-password", { email: form.get("email") }).catch(() => undefined);
    setSent(true);
  }

  return (
    <form onSubmit={submit} className="w-full rounded-[10px] border border-[var(--border)] bg-white p-7">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      <p className="mt-3 text-sm text-[var(--text-2)]">Enter your email and we will send a reset link if an account exists.</p>
      <label className="mt-6 block text-xs font-medium text-[var(--text-2)]">Email<input name="email" type="email" required className="input mt-2" /></label>
      {sent && <p className="mt-4 text-sm text-[var(--closed-text)]">If an account exists, a reset email has been sent.</p>}
      <button className="btn btn-primary mt-6 w-full">Send reset link</button>
      <Link className="mt-5 block text-center text-sm text-[var(--accent)]" href="/login">Back to sign in</Link>
    </form>
  );
}
