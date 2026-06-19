/**
 * authStore — Zustand auth state with localStorage persistence.
 *
 * Strategy (from design §5):
 *  - Token lives in localStorage (Zustand persist) for in-app reads.
 *  - Token is ALSO written to a non-HttpOnly cookie `auth_token` so the
 *    Next.js edge middleware (which cannot access localStorage) can gate
 *    protected routes.
 *  - Cookie is SameSite=Lax, 8 h max-age — no cross-site risk; signature
 *    validation happens server-side on every API call.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserOut } from "@/types";

const COOKIE_NAME = "auth_token";
const COOKIE_MAX_AGE = 28800; // 8 hours in seconds

function writeCookie(token: string): void {
  document.cookie = `${COOKIE_NAME}=${token}; path=/; SameSite=Lax; max-age=${COOKIE_MAX_AGE}`;
}

function deleteCookie(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; SameSite=Lax; max-age=0`;
}

interface AuthState {
  token: string | null;
  user: UserOut | null;
  isAuthenticated: boolean;
  login: (token: string, user: UserOut) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login(token, user) {
        set({ token, user, isAuthenticated: true });
        writeCookie(token);
      },

      logout() {
        set({ token: null, user: null, isAuthenticated: false });
        deleteCookie();
        // Clear the persisted localStorage entry.
        useAuthStore.persist.clearStorage();
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist token + user; isAuthenticated is derived on rehydration.
      partialize: (state) => ({ token: state.token, user: state.user }),
      // Recompute isAuthenticated from the rehydrated token.
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = !!state.token;
        }
      },
    }
  )
);
