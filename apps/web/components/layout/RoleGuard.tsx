"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

export function RoleGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, setUser, clear } = useAuthStore();

  const { data: currentUser, isLoading, error } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const res = await api.get("/api/auth/me");
      return res.data.data;
    },
    retry: false,
    staleTime: 5000,
  });

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
      if (currentUser.role === "UNASSIGNED") {
        router.replace("/waiting");
      }
    }
  }, [currentUser, setUser, router]);

  useEffect(() => {
    if (error) {
      clear();
      router.replace("/login");
    }
  }, [error, clear, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <span className="text-xs text-[var(--t3)]">Loading workspace...</span>
        </div>
      </div>
    );
  }

  // If there's no user in store and query finished/errored, don't render children to avoid flash
  if (!user) {
    return null;
  }

  return <>{children}</>;
}
