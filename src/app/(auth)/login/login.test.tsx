/**
 * Login page tests — Spec S-12 (frontend login flow).
 *
 * Mocks:
 *  - api (axios instance) via vitest.mock
 *  - next/navigation (useRouter)
 *  - authStore.login to verify it is called correctly
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mock next/navigation ──────────────────────────────────────────────────────
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ── Mock api ──────────────────────────────────────────────────────────────────
vi.mock("@/lib/api", () => ({
  api: {
    post: vi.fn(),
  },
}));

// ── Mock authStore ────────────────────────────────────────────────────────────
const mockLogin = vi.fn();
vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector?: (s: { login: typeof mockLogin }) => unknown) => {
    const state = { login: mockLogin };
    return selector ? selector(state) : state;
  },
}));

// Import AFTER mocks are set up.
import LoginPage from "./page";
import { api } from "@/lib/api";

const mockApiPost = api.post as ReturnType<typeof vi.fn>;

const TOKEN_RESPONSE = {
  data: {
    access_token: "test.jwt",
    token_type: "bearer",
    user: {
      id: 1,
      username: "admin",
      nombre_completo: "Administrador",
      rol: "ADMIN",
      area: null,
    },
  },
};

// Helpers — use label-associated inputs to avoid clashing with aria-label on the eye toggle.
function getUsernameInput() {
  return screen.getByLabelText("Usuario");
}
function getPasswordInput() {
  return screen.getByLabelText("Contraseña");
}
function getSubmitButton() {
  return screen.getByRole("button", { name: /iniciar sesión/i });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LoginPage", () => {
  it("renders username and password fields", () => {
    render(<LoginPage />);

    expect(getUsernameInput()).toBeInTheDocument();
    expect(getPasswordInput()).toBeInTheDocument();
    expect(getSubmitButton()).toBeInTheDocument();
  });

  it("submit with valid credentials calls api.post, authStore.login, and router.push", async () => {
    mockApiPost.mockResolvedValueOnce(TOKEN_RESPONSE);
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(getUsernameInput(), "admin");
    await user.type(getPasswordInput(), "admin123");
    await user.click(getSubmitButton());

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith("/auth/login", {
        username: "admin",
        password: "admin123",
      });
      expect(mockLogin).toHaveBeenCalledWith(
        "test.jwt",
        TOKEN_RESPONSE.data.user
      );
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows error message when login returns 401", async () => {
    const axiosError = Object.assign(new Error("Unauthorized"), {
      isAxiosError: true,
      response: {
        status: 401,
        data: { detail: "Credenciales inválidas" },
      },
    });
    mockApiPost.mockRejectedValueOnce(axiosError);

    // Make axios.isAxiosError recognise our synthetic error.
    const axios = await import("axios");
    vi.spyOn(axios.default, "isAxiosError").mockReturnValue(true);

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(getUsernameInput(), "admin");
    await user.type(getPasswordInput(), "wrong");
    await user.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Credenciales inválidas"
      );
    });
  });

  it("submit button is disabled while request is in flight", async () => {
    // Simulate a slow request that never resolves during the test.
    let resolveRequest!: (v: typeof TOKEN_RESPONSE) => void;
    mockApiPost.mockReturnValueOnce(
      new Promise((res) => {
        resolveRequest = res;
      })
    );

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(getUsernameInput(), "admin");
    await user.type(getPasswordInput(), "admin123");

    const button = getSubmitButton();
    await user.click(button);

    // While pending the button should be disabled.
    await waitFor(() => {
      expect(button).toBeDisabled();
    });

    // Resolve to clean up the pending promise.
    act(() => resolveRequest(TOKEN_RESPONSE));
  });
});
