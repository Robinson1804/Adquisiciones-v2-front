/**
 * T-17 — S3 CMN dynamic section tests.
 * Selecting areas generates matching CMN rows; marking all SI shows green banner.
 *
 * NOTE: Section 2 usa el multi-select buscable (AreaSelector).
 * Los botones de área tienen aria-label="Area {ABREV}" (sin acento en "Area").
 * Las áreas usadas aquí son DTDIS y OTIN, ambas en DEPENDENCIAS.
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

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("S3 — CMN dynamic section", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
      token: "t",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

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

  it("renders CMN row for each selected area", async () => {
    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });

    // Initially no CMN rows (no area selected — placeholder text shown)
    expect(screen.queryByText(/Seleccioná áreas usuarias/i)).toBeInTheDocument();

    // Select DTDIS via the searchable list
    fireEvent.click(screen.getByRole("button", { name: /^Area DTDIS$/i }));
    // Select OTIN via the searchable list
    fireEvent.click(screen.getByRole("button", { name: /^Area OTIN$/i }));

    await waitFor(() => {
      // 2 areas → 2 fieldsets (one per area). Each has 2 radios: SI/NO.
      // Check by counting "Sin CMN" labels (one per area row)
      expect(screen.getAllByText(/Sin CMN/i)).toHaveLength(2);
    });
  });

  it("shows green banner when all areas have CMN = SI", async () => {
    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });

    // Select DTDIS via the searchable list
    fireEvent.click(screen.getByRole("button", { name: /^Area DTDIS$/i }));

    await waitFor(() => {
      // 1 area → 1 "Sin CMN" label
      expect(screen.getAllByText(/Sin CMN/i)).toHaveLength(1);
    });

    // Mark CMN as SI for DTDIS.
    // tipo radios use "BIEN"/"SERVICIO". CMN radios use "SI"/"NO".
    // getAllByDisplayValue("SI") returns only the CMN radios.
    const allSiRadios = screen.getAllByDisplayValue("SI");
    fireEvent.click(allSiRadios[0]);

    await waitFor(() => {
      expect(
        screen.getByText(/Todas las áreas tienen CMN adjunto confirmado/i)
      ).toBeInTheDocument();
    });
  });

  it("removes CMN row when area is deselected", async () => {
    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });

    // Select DTDIS
    fireEvent.click(screen.getByRole("button", { name: /^Area DTDIS$/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Sin CMN/i)).toHaveLength(1);
    });

    // Deselect DTDIS by clicking the toggle button again in the list
    fireEvent.click(screen.getByRole("button", { name: /^Area DTDIS$/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Sin CMN/i)).not.toBeInTheDocument();
    });
  });
});
