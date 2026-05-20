"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { api } from "@/lib/api";

export default function RegisterPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    try {
      await api.post("/api/auth/register", {
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        email: form.get("email"),
        password: form.get("password"),
        organizationCode: form.get("organizationCode"),
      });
      setSent(true);
    } catch {
      setError("Could not create the account. Check the organization code and try again.");
    }
  }

  if (sent) {
    return (
      <div className="w-full rounded-[10px] border border-[var(--border)] bg-white p-7">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="mt-3 text-sm text-[var(--text-2)]">Verify your address, then your Admin can approve your project access.</p>
        <Link className="btn mt-6 inline-flex" href="/login">Back to sign in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="w-full rounded-[10px] border border-[var(--border)] bg-white p-7">
      <h1 className="text-2xl font-semibold">Create account</h1>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <label className="block text-xs font-medium text-[var(--text-2)]">First name<input name="firstName" required className="input mt-2" /></label>
        <label className="block text-xs font-medium text-[var(--text-2)]">Last name<input name="lastName" required className="input mt-2" /></label>
      </div>
      <label className="mt-4 block text-xs font-medium text-[var(--text-2)]">Email<input name="email" type="email" required className="input mt-2" /></label>
      <label className="mt-4 block text-xs font-medium text-[var(--text-2)]">Password<input name="password" type="password" required minLength={8} className="input mt-2" /></label>
      <p className="mt-2 text-xs text-[var(--text-3)]">Use at least 8 characters.</p>
      <label className="mt-4 block text-xs font-medium text-[var(--text-2)]">Organization Code<input name="organizationCode" required placeholder="DEMO" className="input mono mt-2 uppercase" /></label>
      {error && <p className="mt-4 text-sm text-[var(--critical-text)]">{error}</p>}
      <button className="btn btn-primary mt-6 w-full">Sign up</button>
      <p className="mt-5 text-center text-sm text-[var(--text-2)]">
        Already registered? <Link href="/login" className="text-[var(--accent)]">Sign in</Link>
      </p>
    </form>
  );
}
