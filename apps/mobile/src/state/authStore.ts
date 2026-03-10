import { create } from "zustand";
import type { Role, User } from "@healthguard/shared-types";

export type AuthUser = Pick<User, "id" | "email" | "role" | "aadhaarLast4"> & {
  aadhaarLast4?: string | null;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  setAuth: (p: { token: string; user: AuthUser }) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setAuth: ({ token, user }) => set({ token, user }),
  clear: () => set({ token: null, user: null })
}));

export const isRole = (role: Role | string | undefined, target: Role) => role === target;

