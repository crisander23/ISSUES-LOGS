"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    setVerified(new URLSearchParams(window.location.search).has("verified"));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await api.post("/api/auth/login", {
        email: form.get("email"),
        password: form.get("password"),
      });
      setSession(response.data.data.user, response.data.data.accessToken);
      router.push(response.data.data.pendingApproval ? "/waiting" : "/board");
    } catch {
      setError("Unable to sign in with those credentials.");
    }
  }

  return (
    <form onSubmit={submit} className="w-full rounded-[10px] border border-[var(--border)] bg-white p-7">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      {verified && <p className="mt-3 text-sm text-[var(--closed-text)]">Email verified. You can sign in.</p>}
      <label className="mt-6 block text-xs font-medium text-[var(--text-2)]">Email</label>
      <input name="email" type="email" required className="input mt-2" />
      <label className="mt-4 block text-xs font-medium text-[var(--text-2)]">Password</label>
      <div className="mt-2 flex items-center gap-2">
        <input name="password" type="password" required className="input" />
        <button type="button" className="btn" title="Show password"><Eye size={15} /></button>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <label className="flex items-center gap-2"><input type="checkbox" /> Remember me</label>
        <Link href="/forgot-password" className="text-[var(--accent)]">Forgot password?</Link>
      </div>
      {error && <p className="mt-4 text-sm text-[var(--critical-text)]">{error}</p>}
      <button className="btn btn-primary mt-6 w-full">Sign in</button>
      <p className="mt-5 text-center text-sm text-[var(--text-2)]">
        New here? <Link href="/register" className="text-[var(--accent)]">Create an account</Link>
      </p>
    </form>
  );
}
