"use client";

import { create } from "zustand";

export type UserRole = "ADMIN" | "QA" | "DEV" | "UNASSIGNED";

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string | null;
}

interface AuthState {
  user: AuthUser | null;
  setSession: (user: AuthUser, accessToken: string) => void;
  setUser: (user: AuthUser | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setSession: (user, accessToken) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("user", JSON.stringify(user));
    set({ user });
  },
  setUser: (user) => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
    set({ user });
  },
  clear: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    set({ user: null });
  },
}));
