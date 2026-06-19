/**
 * C4 — useDashboard hooks tests.
 * Mocks api module, verifies hooks surface typed data and respect enabled:!!anno.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useMetricas,
  useFlujoProcesos,
  useTiemposEtapa,
  usePresupuesto,
  useDemoraAreas,
} from "@/hooks/useDashboard";
import type {
  Metricas,
  FlujoProcesosResponse,
  TiemposEtapaResponse,
  PresupuestoResponse,
  DemoraAreasResponse,
} from "@/types/dashboard";

// Mock the entire api module
vi.mock("@/lib/api", () => ({
  getMetricas: vi.fn(),
  getFlujoProcesos: vi.fn(),
  getTiemposEtapa: vi.fn(),
  getPresupuesto: vi.fn(),
  getDemoraAreas: vi.fn(),
  // Pass-through stubs for other imports
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
}));

import {
  getMetricas,
  getFlujoProcesos,
  getTiemposEtapa,
  getPresupuesto,
  getDemoraAreas,
} from "@/lib/api";

const mockMetricas: Metricas = {
  anno: 2026,
  total: 10,
  en_proceso: 5,
  culminados: 3,
  cancelados: 2,
  pim_total: 150000,
  dias_promedio: 45.3,
};

const mockFlujo: FlujoProcesosResponse = {
  procesos: [
    {
      id: 1,
      id_proceso: "2026-001",
      requerimiento: "Laptops DTDIS",
      estado: "EN PROCESO",
      fase_actual: "F3",
      porcentaje: 60,
      fases: [
        { fase: "F1", label: "Requerimiento y TDR",        completada: true,  actual: false },
        { fase: "F2", label: "Indagación y Evaluación",    completada: true,  actual: false },
        { fase: "F3", label: "Presupuesto y Certificación",completada: false, actual: true  },
        { fase: "F4", label: "Orden y Ejecución",          completada: false, actual: false },
        { fase: "F5", label: "Conformidad",                completada: false, actual: false },
      ],
    },
  ],
};

const mockTiempos: TiemposEtapaResponse = {
  anno: 2026,
  promedio_global: 12.5,
  etapas: [
    { codigo: "E01", nombre: "Solicitud requerimiento", area_responsable: "AREAS", dias_promedio: 5.0, n: 3 },
    { codigo: "E02", nombre: "Elaboración TDR",          area_responsable: "OTIN",  dias_promedio: 8.2, n: 3 },
  ],
};

const mockPresupuesto: PresupuestoResponse = {
  anno: 2026,
  totales: { pim: 150000, valor_em: 140000, monto_cert_total: 138000, monto_ocs: 135000 },
  procesos: [
    {
      id: 1,
      id_proceso: "2026-001",
      requerimiento: "Laptops",
      estado: "CULMINADO",
      pim: 50000,
      valor_em: 48000,
      monto_cert_total: 47000,
      monto_ocs: 46500,
      var_em_vs_pim: -4.0,
      var_cert_vs_em: -2.1,
      var_ocs_vs_em: -3.1,
    },
  ],
};

const mockDemora: DemoraAreasResponse = {
  anno: 2026,
  areas: [
    {
      area_usuaria: "DTDIS",
      e11_dias_promedio: 5.0,
      e11_n: 3,
      semaforo_e11: "verde",
      e24_dias_promedio: 20.0,
      e24_n: 3,
      semaforo_e24: "rojo",
    },
  ],
};

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe("useMetricas", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns metricas data from api", async () => {
    vi.mocked(getMetricas).mockResolvedValueOnce(mockMetricas);
    const { result } = renderHook(() => useMetricas(2026), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(10);
    expect(result.current.data?.pim_total).toBe(150000);
    expect(result.current.data?.dias_promedio).toBe(45.3);
  });

  it("does not fire when anno is null", () => {
    const { result } = renderHook(() => useMetricas(null), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
    expect(getMetricas).not.toHaveBeenCalled();
  });
});

describe("useFlujoProcesos", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns proceso flujo data", async () => {
    vi.mocked(getFlujoProcesos).mockResolvedValueOnce(mockFlujo);
    const { result } = renderHook(() => useFlujoProcesos(2026), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.procesos).toHaveLength(1);
    expect(result.current.data?.procesos[0].fases).toHaveLength(5);
  });

  it("does not fire when anno is null", () => {
    const { result } = renderHook(() => useFlujoProcesos(null), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useTiemposEtapa", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns tiempos data with promedio_global", async () => {
    vi.mocked(getTiemposEtapa).mockResolvedValueOnce(mockTiempos);
    const { result } = renderHook(() => useTiemposEtapa(2026), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.etapas).toHaveLength(2);
    expect(result.current.data?.promedio_global).toBe(12.5);
  });
});

describe("usePresupuesto", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns presupuesto with totales and procesos", async () => {
    vi.mocked(getPresupuesto).mockResolvedValueOnce(mockPresupuesto);
    const { result } = renderHook(() => usePresupuesto(2026), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totales.pim).toBe(150000);
    expect(result.current.data?.procesos[0].var_em_vs_pim).toBe(-4.0);
  });
});

describe("useDemoraAreas", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns demora areas with semaforos", async () => {
    vi.mocked(getDemoraAreas).mockResolvedValueOnce(mockDemora);
    const { result } = renderHook(() => useDemoraAreas(2026), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.areas[0].semaforo_e11).toBe("verde");
    expect(result.current.data?.areas[0].semaforo_e24).toBe("rojo");
  });
});
