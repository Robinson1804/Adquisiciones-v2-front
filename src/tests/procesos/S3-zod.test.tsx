/**
 * T-17 — S3 Zod validation tests.
 * Verifies: empty requerimiento → error, empty areas → error,
 * valid payload calls createProceso with correct cmn_por_area.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("@/hooks/useProcesos", () => ({
  useCrearProceso: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));

import { useAuthStore } from "@/stores/authStore";
import { useCrearProceso } from "@/hooks/useProcesos";
import NuevoProcesoPage from "@/app/(dashboard)/procesos/nuevo/page";

const mockMutate = vi.fn();

function setupMocks(rol: "ADMIN" | "EDITOR" | "VIEWER" = "EDITOR") {
  vi.mocked(useAuthStore).mockReturnValue({
    user: { id: 1, username: "u", nombre_completo: "U", rol, area: null },
    token: "t",
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuthStore>);

  vi.mocked(useCrearProceso).mockReturnValue({
    mutate: mockMutate,
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
}

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("S3 — NuevoProcesoPage Zod validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks("EDITOR");
  });

  it("shows error when requerimiento is empty on submit", async () => {
    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });

    const submitBtn = screen.getByRole("button", { name: /Crear Proceso/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/al menos 3 caracteres/i)
      ).toBeInTheDocument();
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("shows error when areas_usuarias is empty on submit", async () => {
    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });

    // Fill requerimiento and tipo to isolate areas error
    const reqInput = screen.getByLabelText(/Descripción del Requerimiento/i);
    fireEvent.change(reqInput, { target: { value: "Test requerimiento valido" } });

    const tipoRadio = screen.getByDisplayValue("BIEN");
    fireEvent.click(tipoRadio);

    const submitBtn = screen.getByRole("button", { name: /Crear Proceso/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/al menos un área usuaria/i)
      ).toBeInTheDocument();
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("calls mutate with correct cmn_por_area when form is valid", async () => {
    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });

    // Fill requerimiento
    const reqInput = screen.getByLabelText(/Descripción del Requerimiento/i);
    fireEvent.change(reqInput, { target: { value: "Laptops Dell para oficina" } });

    // Select tipo
    const tipoRadio = screen.getByDisplayValue("BIEN");
    fireEvent.click(tipoRadio);

    // Select area DTDIS via the searchable list (aria-label="Area DTDIS")
    const dtdisBtn = screen.getByRole("button", { name: /^Area DTDIS$/i });
    fireEvent.click(dtdisBtn);

    // Select area_iniciadora (now required)
    const areaIniciadora = screen.getByLabelText(/Área iniciadora/i);
    fireEvent.change(areaIniciadora, { target: { value: "OTIN" } });

    // Submit
    const submitBtn = screen.getByRole("button", { name: /Crear Proceso/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });

    const callArg = mockMutate.mock.calls[0][0] as { cmn_por_area: { area: string; cmn_adjunto: string }[] };
    expect(callArg.cmn_por_area).toHaveLength(1);
    expect(callArg.cmn_por_area[0].area).toBe("DTDIS");
    expect(callArg.cmn_por_area[0].cmn_adjunto).toBe("NO"); // default
  });
});
