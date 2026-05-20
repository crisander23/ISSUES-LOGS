"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await api.post(`/api/auth/invite/${params.token}/accept`, {
      firstName: form.get("firstName"),
      lastName: form.get("lastName"),
      password: form.get("password"),
    });
    setSession(response.data.data.user, response.data.data.accessToken);
    router.push("/board");
  }

  return (
    <form onSubmit={submit} className="w-full rounded-[10px] border border-[var(--border)] bg-white p-7">
      <h1 className="text-2xl font-semibold">Accept invitation</h1>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <label className="block text-xs font-medium text-[var(--text-2)]">First name<input name="firstName" required className="input mt-2" /></label>
        <label className="block text-xs font-medium text-[var(--text-2)]">Last name<input name="lastName" required className="input mt-2" /></label>
      </div>
      <label className="mt-4 block text-xs font-medium text-[var(--text-2)]">Password<input name="password" type="password" required minLength={8} className="input mt-2" /></label>
      <label className="mt-4 block text-xs font-medium text-[var(--text-2)]">Confirm password<input name="confirm" type="password" required minLength={8} className="input mt-2" /></label>
      <button className="btn btn-primary mt-6 w-full">Join workspace</button>
    </form>
  );
}
