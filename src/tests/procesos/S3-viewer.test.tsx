/**
 * T-17 — S3 VIEWER access guard test.
 * VIEWER should trigger a redirect to /procesos on mount.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("@/hooks/useProcesos", () => ({
  useCrearProceso: vi.fn(),
}));

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    replace: mockReplace,
  }),
}));

import { useAuthStore } from "@/stores/authStore";
import { useCrearProceso } from "@/hooks/useProcesos";
import NuevoProcesoPage from "@/app/(dashboard)/procesos/nuevo/page";

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("S3 — VIEWER access guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useCrearProceso).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      data: undefined,
      isSuccess: false,
      isError: false,
      isIdle: true,
      reset: vi.fn(),
      status: "idle",
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      submittedAt: 0,
      mutateAsync: vi.fn(),
    } as ReturnType<typeof useCrearProceso>);
  });

  it("calls router.replace('/procesos') when user is VIEWER", async () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 2, username: "viewer", nombre_completo: "Viewer", rol: "VIEWER", area: null },
      token: "t",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });

    // useEffect runs on mount — check replace was called
    await vi.waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/procesos");
    });
  });

  it("renders form for EDITOR user", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
      token: "t",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const { getByRole } = render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });

    expect(getByRole("button", { name: /Crear Proceso/i })).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
