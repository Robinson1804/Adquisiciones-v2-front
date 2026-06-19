/**
 * T-17 — S2 (lista de procesos) render + role-gating tests.
 *
 * Updated: old bottom procesos list table removed — page now uses
 * useMatrizTiempos as the primary data source. Tests updated accordingly.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock hooks before importing the component
vi.mock("@/hooks/useMatrizTiempos", () => ({
  useMatrizTiempos: vi.fn(),
}));

vi.mock("@/hooks/useDashboard", () => ({
  useMetricas: vi.fn().mockReturnValue({
    data: null,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/useExport", () => ({
  useExportExcel: vi.fn().mockReturnValue({
    trigger: vi.fn(),
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) =>
    React.createElement("a", { href, ...props }, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));

import { useMatrizTiempos } from "@/hooks/useMatrizTiempos";
import { useAuthStore } from "@/stores/authStore";
import ProcesosPage from "@/app/(dashboard)/procesos/page";
import type { MatrizTiempos } from "@/types/etapa";

// ---------------------------------------------------------------------------
// Matrix fixture
// ---------------------------------------------------------------------------
const emptyMatriz: MatrizTiempos = {
  columnas: [
    { key: "cmn", label: "CMN", cod: "E01c" },
    { key: "total", label: "TOTAL", cod: null },
  ],
  filas: [],
  promedios: [null, null],
  promedio_total: null,
};

const filledMatriz: MatrizTiempos = {
  columnas: [
    { key: "cmn", label: "CMN", cod: "E01c" },
    { key: "total", label: "TOTAL", cod: null },
  ],
  filas: [
    {
      proceso_id: 1,
      id_proceso: "2026-001",
      requerimiento: "Switch de red para sala de servidores",
      pim: 15000,
      estado: "EN PROCESO",
      tipo: "BIEN",
      celdas: [10],
      total_dias: 10,
    },
  ],
  promedios: [10, 10],
  promedio_total: 10,
};

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

function mockMatriz(data: MatrizTiempos | undefined, loading = false, error = false) {
  vi.mocked(useMatrizTiempos).mockReturnValue({
    data,
    isLoading: loading,
    isError: error,
    isSuccess: !loading && !error,
    error: null,
  } as ReturnType<typeof useMatrizTiempos>);
}

describe("S2 — ProcesosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: EDITOR user
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: "OTIN" },
      token: "fake-token",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);
  });

  it("renders 5 metric cards", () => {
    mockMatriz(filledMatriz);

    render(React.createElement(ProcesosPage), { wrapper: Wrapper });

    expect(screen.getByText(/Total Procesos/i)).toBeInTheDocument();
    // "En Proceso" appears in card label and filter option — use getAllByText
    expect(screen.getAllByText(/En Proceso/i).length).toBeGreaterThanOrEqual(1);
    // "Culminados" card label + "culminados" sub-text in Días Promedio card — use getAllByText
    expect(screen.getAllByText(/Culminados/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Cancelados/i)).toBeInTheDocument();
    expect(screen.getByText(/PIM Total/i)).toBeInTheDocument();
  });

  it("EDITOR sees Nuevo Proceso button", () => {
    mockMatriz(emptyMatriz);

    render(React.createElement(ProcesosPage), { wrapper: Wrapper });

    expect(screen.getByText(/Nuevo Proceso/i)).toBeInTheDocument();
  });

  it("VIEWER does NOT see Nuevo Proceso button", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 2, username: "viewer", nombre_completo: "Viewer", rol: "VIEWER", area: null },
      token: "fake-token",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    mockMatriz(emptyMatriz);

    render(React.createElement(ProcesosPage), { wrapper: Wrapper });

    expect(screen.queryByText(/Nuevo Proceso/i)).not.toBeInTheDocument();
  });

  it("renders matrix rows for each proceso — id_proceso and requerimiento visible", () => {
    mockMatriz(filledMatriz);

    render(React.createElement(ProcesosPage), { wrapper: Wrapper });

    expect(screen.getByText("2026-001")).toBeInTheDocument();
    expect(screen.getByText(/Switch de red/i)).toBeInTheDocument();
  });

  it("filter bar renders Buscar, Estado, Tipo, Año controls above the matrix", () => {
    mockMatriz(emptyMatriz);

    render(React.createElement(ProcesosPage), { wrapper: Wrapper });

    // Search input
    expect(screen.getByLabelText(/Buscar por ID o requerimiento/i)).toBeInTheDocument();
    // Select controls
    expect(screen.getByLabelText(/Estado/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tipo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Año/i)).toBeInTheDocument();
  });
});
