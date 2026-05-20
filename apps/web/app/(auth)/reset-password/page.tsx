"use client";

import { useRouter } from "next/navigation";
import { FormEvent } from "react";
import { api } from "@/lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const token = new URLSearchParams(window.location.search).get("token");
    await api.post("/api/auth/reset-password", { token, password: form.get("password") });
    router.push("/login?reset=true");
  }
  return (
    <form onSubmit={submit} className="w-full rounded-[10px] border border-[var(--border)] bg-white p-7">
      <h1 className="text-2xl font-semibold">Choose a new password</h1>
      <label className="mt-6 block text-xs font-medium text-[var(--text-2)]">New password<input name="password" type="password" required minLength={8} className="input mt-2" /></label>
      <label className="mt-4 block text-xs font-medium text-[var(--text-2)]">Confirm password<input name="confirm" type="password" required minLength={8} className="input mt-2" /></label>
      <p className="mt-3 text-xs text-[var(--text-3)]">Minimum 8 characters.</p>
      <button className="btn btn-primary mt-6 w-full">Reset password</button>
    </form>
  );
}
