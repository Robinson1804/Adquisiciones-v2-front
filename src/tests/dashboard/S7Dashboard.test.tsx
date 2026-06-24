/**
 * Dashboard Gerencial — page component tests.
 * Verifies KPI cards, acquisition selector, table, and empty state.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardPage from "@/app/(dashboard)/dashboard/page";
import type { Metricas, FlujoProcesosResponse, PresupuestoResponse } from "@/types/dashboard";
import type { PaginatedProcesos } from "@/types";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) =>
    React.createElement("a", { href, ...props }, children),
}));

// Mock api
vi.mock("@/lib/api", () => ({
  getMetricas: vi.fn(),
  getFlujoProcesos: vi.fn(),
  getProcesos: vi.fn(),
  getProceso: vi.fn(),
  createProceso: vi.fn(),
  updateProceso: vi.fn(),
  deleteProceso: vi.fn(),
  getEtapas: vi.fn(),
  registrarEtapa: vi.fn(),
  actualizarEtapa: vi.fn(),
  agregarRonda: vi.fn(),
  reiniciarTdr: vi.fn(),
  getMontosProceso: vi.fn(),
  getArchivos: vi.fn(),
  subirArchivo: vi.fn(),
  descargarArchivo: vi.fn(),
  eliminarArchivo: vi.fn(),
  getTiemposEtapa: vi.fn(),
  getPresupuesto: vi.fn(),
  getDemoraAreas: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

// Mock authStore
vi.mock("@/stores/authStore", () => ({
  useAuthStore: () => ({
    token: "mock-token",
    user: { username: "admin", rol: "ADMIN" },
    logout: vi.fn(),
  }),
}));

import { getMetricas, getFlujoProcesos, getProcesos, getEtapas, getPresupuesto } from "@/lib/api";

const mockMetricas: Metricas = {
  anno: 2026,
  total: 8,
  en_proceso: 4,
  culminados: 3,
  cancelados: 1,
  pim_total: 250000,
  dias_promedio: 38.5,
};

const mockFlujoProcesos: FlujoProcesosResponse = {
  procesos: [
    {
      id: 1,
      id_proceso: "2026-001",
      requerimiento: "Laptops para DTDIS",
      estado: "EN PROCESO",
      fase_actual: "F2",
      porcentaje: 40,
      fases: [
        { fase: "F1", label: "Requerimiento y TDR",        completada: true,  actual: false },
        { fase: "F2", label: "Indagación y Evaluación",    completada: false, actual: true  },
        { fase: "F3", label: "Presupuesto y Certificación",completada: false, actual: false },
        { fase: "F4", label: "Orden y Ejecución",          completada: false, actual: false },
        { fase: "F5", label: "Conformidad",                completada: false, actual: false },
      ],
    },
  ],
};

const mockProcesos: PaginatedProcesos = {
  items: [
    {
      id: 1,
      id_proceso: "2026-001",
      requerimiento: "Laptops para DTDIS",
      tipo: "BIEN",
      unidad_resp: "OTIN",
      areas_usuarias: ["DTDIS"],
      pim: "250000",
      estado: "EN PROCESO",
      motivo_cancel: null,
      fecha_creacion: "2026-01-15",
      creado_por: "admin",
      anno: 2026,
    },
  ],
  total: 1,
  page: 1,
  page_size: 200,
  pages: 1,
};

const mockPresupuesto: PresupuestoResponse = {
  anno: 2026,
  totales: {
    pim: 250000,
    valor_em: 210000,
    monto_cert_total: 180000,
    monto_ocs: 150000,
  },
  procesos: [],
};

const emptyFlujo: FlujoProcesosResponse = { procesos: [] };
const emptyProcesos: PaginatedProcesos = { items: [], total: 0, page: 1, page_size: 200, pages: 0 };

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe("S7 DashboardPage (Gerencial)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getProcesos).mockResolvedValue(mockProcesos);
    vi.mocked(getPresupuesto).mockResolvedValue(mockPresupuesto);
    // getEtapas is called by LineaEtapasHorizontal; return empty to keep tests simple
    vi.mocked(getEtapas).mockResolvedValue({ etapas: [], progreso: { etapa_actual: null, porcentaje: 0, completadas: 0, total: 0 } });
  });

  it("renders the page title with the current year", () => {
    vi.mocked(getMetricas).mockResolvedValue(mockMetricas);
    vi.mocked(getFlujoProcesos).mockResolvedValue(mockFlujoProcesos);
    render(<DashboardPage />, { wrapper: createWrapper() });
    expect(screen.getByText(/Dashboard Adquisiciones TIC/i)).toBeTruthy();
  });

  it("shows budget execution summary labels", () => {
    vi.mocked(getMetricas).mockResolvedValue(mockMetricas);
    vi.mocked(getFlujoProcesos).mockResolvedValue(mockFlujoProcesos);
    render(<DashboardPage />, { wrapper: createWrapper() });
    expect(screen.getByText(/^PIA$/i)).toBeTruthy();
    expect(screen.getByText(/^PIM$/i)).toBeTruthy();
    expect(screen.getByText(/Certificación/i)).toBeTruthy();
    expect(screen.getByText(/Compromiso Anual/i)).toBeTruthy();
    expect(screen.getByText(/Atención de Compromiso Mensual/i)).toBeTruthy();
    expect(screen.getByText(/Devengado/i)).toBeTruthy();
    expect(screen.getByText(/Girado/i)).toBeTruthy();
    expect(screen.getByText(/Avance %/i)).toBeTruthy();
  });

  it("shows budget values after data loads", async () => {
    vi.mocked(getMetricas).mockResolvedValue(mockMetricas);
    vi.mocked(getFlujoProcesos).mockResolvedValue(mockFlujoProcesos);
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/250,000/)).toBeTruthy();
    });
    expect(screen.getByText(/180,000/)).toBeTruthy();
    expect(screen.getByText(/150,000/)).toBeTruthy();
  });

  it("shows acquisition in the selector and the table", async () => {
    vi.mocked(getMetricas).mockResolvedValue(mockMetricas);
    vi.mocked(getFlujoProcesos).mockResolvedValue(mockFlujoProcesos);
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Laptops para DTDIS")).toBeTruthy();
    });
    expect(screen.getByText("2026-001")).toBeTruthy();
  });

  it("shows empty state when no procesos", async () => {
    vi.mocked(getMetricas).mockResolvedValue({
      ...mockMetricas,
      total: 0,
      en_proceso: 0,
      culminados: 0,
      cancelados: 0,
    });
    vi.mocked(getFlujoProcesos).mockResolvedValue(emptyFlujo);
    vi.mocked(getProcesos).mockResolvedValue(emptyProcesos);
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/Sin datos para/i)).toBeTruthy();
    });
  });

  it("shows the acquisition selector dropdown", async () => {
    vi.mocked(getMetricas).mockResolvedValue(mockMetricas);
    vi.mocked(getFlujoProcesos).mockResolvedValue(mockFlujoProcesos);
    render(<DashboardPage />, { wrapper: createWrapper() });
    expect(screen.getByLabelText(/Seleccionar adquisición/i)).toBeTruthy();
  });

  it("shows Modo Presentación link", () => {
    vi.mocked(getMetricas).mockResolvedValue(mockMetricas);
    vi.mocked(getFlujoProcesos).mockResolvedValue(mockFlujoProcesos);
    render(<DashboardPage />, { wrapper: createWrapper() });
    const link = screen.getByRole("link", { name: /Modo Presentación/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/presentacion");
  });
});
