/**
 * T12 — ProcesoForm new fields tests.
 * flujo-real-otin-v2: remove unidad_resp; add area_iniciadora, denominacion_cmn, clasificador_cmn.
 *
 * - No "Unidad Solicitante" field visible
 * - area_iniciadora: single-select combobox from DEPENDENCIAS (required)
 * - denominacion_cmn: optional text input
 * - clasificador_cmn: optional text input
 * - onSubmit includes new fields, excludes unidad_resp
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

describe("T12 — ProcesoForm flujo-real-otin-v2 fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks("EDITOR");
  });

  it("does NOT render Unidad Solicitante field", () => {
    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });
    expect(screen.queryByLabelText(/Unidad Solicitante/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Unidad Solicitante/i)).not.toBeInTheDocument();
  });

  it("renders area_iniciadora select/combobox (required)", () => {
    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });
    // Should find a combobox or select for area_iniciadora
    const select = screen.getByLabelText(/Área iniciadora/i);
    expect(select).toBeInTheDocument();
  });

  it("renders denominacion_cmn optional text input", () => {
    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });
    const input = screen.getByLabelText(/Denominación CMN/i);
    expect(input).toBeInTheDocument();
  });

  it("renders clasificador_cmn optional text input", () => {
    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });
    const input = screen.getByLabelText(/Clasificador de gasto/i);
    expect(input).toBeInTheDocument();
  });

  it("area_iniciadora is required — shows error on submit if empty", async () => {
    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });

    // Fill required fields except area_iniciadora
    fireEvent.change(screen.getByLabelText(/Descripción del Requerimiento/i), {
      target: { value: "Laptops Dell para oficina" },
    });
    fireEvent.click(screen.getByDisplayValue("BIEN"));
    fireEvent.click(screen.getByRole("button", { name: /^Area DTDIS$/i }));

    fireEvent.click(screen.getByRole("button", { name: /Crear Proceso/i }));

    await waitFor(() => {
      expect(screen.getByText(/área iniciadora/i)).toBeInTheDocument();
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("submit includes area_iniciadora, denominacion_cmn, clasificador_cmn in payload", async () => {
    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });

    // Required fields
    fireEvent.change(screen.getByLabelText(/Descripción del Requerimiento/i), {
      target: { value: "Laptops Dell para oficina" },
    });
    fireEvent.click(screen.getByDisplayValue("BIEN"));
    fireEvent.click(screen.getByRole("button", { name: /^Area DTDIS$/i }));

    // New fields
    const areaIniciadora = screen.getByLabelText(/Área iniciadora/i);
    fireEvent.change(areaIniciadora, { target: { value: "OTIN" } });

    fireEvent.change(screen.getByLabelText(/Denominación CMN/i), {
      target: { value: "SUSCRIPCION ANUAL A LICENCIA DE SOFTWARE" },
    });
    fireEvent.change(screen.getByLabelText(/Clasificador de gasto/i), {
      target: { value: "2.3.2.5.1.99" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Crear Proceso/i }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });

    const callArg = mockMutate.mock.calls[0][0] as Record<string, unknown>;
    expect(callArg.area_iniciadora).toBe("OTIN");
    expect(callArg.denominacion_cmn).toBe("SUSCRIPCION ANUAL A LICENCIA DE SOFTWARE");
    expect(callArg.clasificador_cmn).toBe("2.3.2.5.1.99");
    expect(callArg).not.toHaveProperty("unidad_resp");
  });

  it("submit works without optional denominacion_cmn and clasificador_cmn", async () => {
    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });

    fireEvent.change(screen.getByLabelText(/Descripción del Requerimiento/i), {
      target: { value: "Laptops Dell para oficina" },
    });
    fireEvent.click(screen.getByDisplayValue("BIEN"));
    fireEvent.click(screen.getByRole("button", { name: /^Area DTDIS$/i }));

    const areaIniciadora = screen.getByLabelText(/Área iniciadora/i);
    fireEvent.change(areaIniciadora, { target: { value: "OTIN" } });

    fireEvent.click(screen.getByRole("button", { name: /Crear Proceso/i }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });

    const callArg = mockMutate.mock.calls[0][0] as Record<string, unknown>;
    expect(callArg.area_iniciadora).toBe("OTIN");
  });
});
