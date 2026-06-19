/**
 * authStore tests — Spec S-12, S-13.
 *
 * jsdom provides document.cookie; we test the real store (not mocked).
 * localStorage is provided by vitest's jsdom environment.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "./authStore";
import type { UserOut } from "@/types";

const mockUser: UserOut = {
  id: 1,
  username: "admin",
  nombre_completo: "Administrador",
  rol: "ADMIN",
  area: null,
};

const MOCK_TOKEN = "test.jwt.token";

function getStore() {
  return useAuthStore.getState();
}

beforeEach(() => {
  // Reset store state between tests.
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
  // Clear cookies.
  document.cookie = "auth_token=; max-age=0; path=/";
  // Clear localStorage.
  localStorage.clear();
});

describe("authStore — login()", () => {
  it("sets token, user, and isAuthenticated", () => {
    getStore().login(MOCK_TOKEN, mockUser);

    expect(getStore().token).toBe(MOCK_TOKEN);
    expect(getStore().user).toEqual(mockUser);
    expect(getStore().isAuthenticated).toBe(true);
  });

  it("writes auth_token cookie to document.cookie", () => {
    getStore().login(MOCK_TOKEN, mockUser);

    expect(document.cookie).toContain(`auth_token=${MOCK_TOKEN}`);
  });
});

describe("authStore — logout()", () => {
  beforeEach(() => {
    // Pre-populate state as if login happened.
    getStore().login(MOCK_TOKEN, mockUser);
  });

  it("clears token, user, and isAuthenticated", () => {
    getStore().logout();

    expect(getStore().token).toBeNull();
    expect(getStore().user).toBeNull();
    expect(getStore().isAuthenticated).toBe(false);
  });

  it("removes auth_token cookie by setting max-age=0", () => {
    // jsdom does not expire max-age=0 cookies the same way a browser does,
    // but we can verify that the logout cookie string was emitted.
    // We spy on the cookie setter to capture the raw value written.
    const written: string[] = [];
    const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");

    Object.defineProperty(document, "cookie", {
      set(value: string) {
        written.push(value);
        descriptor?.set?.call(document, value);
      },
      get() {
        return descriptor?.get?.call(document);
      },
      configurable: true,
    });

    getStore().logout();

    Object.defineProperty(document, "cookie", descriptor!);

    const deletionCall = written.find(
      (v) => v.includes("auth_token") && v.includes("max-age=0")
    );
    expect(deletionCall).toBeDefined();
  });
});
