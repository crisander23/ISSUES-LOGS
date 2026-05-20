"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

export function LogoutButton() {
  const router = useRouter();
  const clear = useAuthStore((state) => state.clear);

  async function logout() {
    await api.post("/api/auth/logout").catch(() => undefined);
    clear();
    router.push("/login");
  }

  return (
    <button className="btn mt-3 w-full justify-center" onClick={logout}>
      <LogOut size={13} />
      Logout
    </button>
  );
}
