/**
 * C3a — useEtapas hook tests.
 * WU-12: Design §PLAN DE PRUEBAS (Frontend Vitest+RTL)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useEtapas, useRegistrarEtapa, useReiniciarTdr } from "@/hooks/useEtapas";
import type { EtapasResponse, EtapaOut } from "@/types/etapa";

// Mock the entire api module
vi.mock("@/lib/api", () => ({
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
}));

import { getEtapas, registrarEtapa, reiniciarTdr } from "@/lib/api";

function makeEtapa(cod: string, estado = 'PENDIENTE') {
  return {
    cod,
    nombre: `Etapa ${cod}`,
    area_responsable: 'OTIN',
    es_bucle: false,
    por_area: false,
    estado,
    filas: [],
    rondas: [],
    alerta_otpp: null,
    monto_total: null,
  };
}

const mockEtapasResponse: EtapasResponse = {
  etapas: ['E01','E02','E03','E04','E05','E06','E07','E08','E08a','E08b',
           'E09','E10','E11','E12','E13','E14','E15','E16','E17','E18',
           'E19','E20','E21','E22','E23','E24','E25'].map((cod) => makeEtapa(cod)),
  progreso: {
    etapa_actual: 'E01',
    porcentaje: 0,
    completadas: 0,
    total: 25,
  },
};

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe("useEtapas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns etapas list from getEtapas", async () => {
    vi.mocked(getEtapas).mockResolvedValueOnce(mockEtapasResponse);

    const { result } = renderHook(() => useEtapas(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.etapas).toHaveLength(27);
    expect(result.current.data?.progreso.total).toBe(25);
  });

  it("is disabled when procesoId is 0", () => {
    const { result } = renderHook(() => useEtapas(0), {
      wrapper: createWrapper(),
    });

    // query is disabled — fetchStatus is idle
    expect(result.current.fetchStatus).toBe('idle');
    expect(getEtapas).not.toHaveBeenCalled();
  });

  it("is in error state when api throws", async () => {
    vi.mocked(getEtapas).mockRejectedValueOnce(new Error("Network Error"));

    const { result } = renderHook(() => useEtapas(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ----------------------------------------------------------------
// C3b WU-F6 — useReiniciarTdr
// ----------------------------------------------------------------

describe("useReiniciarTdr", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls reiniciarTdr and invalidates etapas + proceso caches on success", async () => {
    const mockEtapaOut: EtapaOut = {
      id: 99,
      codigo_etapa: 'E02',
      nro_ronda: 2,
      area_usuaria: null,
      estado_etapa: 'PENDIENTE',
      fecha_inicio: null,
      fecha_fin: null,
      dias: null,
    };
    vi.mocked(reiniciarTdr).mockResolvedValueOnce(mockEtapaOut);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useReiniciarTdr(5), { wrapper });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(reiniciarTdr).toHaveBeenCalledWith(5);
    // Both etapas and proceso caches should be invalidated
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['etapas', 5] })
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['proceso', 5] })
    );
  });

  it("surfaces error when reiniciarTdr rejects", async () => {
    vi.mocked(reiniciarTdr).mockRejectedValueOnce(new Error("409 Conflict"));

    const { result } = renderHook(() => useReiniciarTdr(5), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useRegistrarEtapa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls registrarEtapa and invalidates cache on success", async () => {
    const mockEtapaOut: EtapaOut = {
      id: 42,
      codigo_etapa: 'E02',
      nro_ronda: null,
      area_usuaria: null,
      estado_etapa: 'EN_CURSO',
      fecha_inicio: '2026-05-01',
      fecha_fin: null,
      dias: null,
    };
    vi.mocked(getEtapas).mockResolvedValue(mockEtapasResponse);
    vi.mocked(registrarEtapa).mockResolvedValueOnce(mockEtapaOut);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useRegistrarEtapa(1), { wrapper });

    await act(async () => {
      result.current.mutate({
        codigo_etapa: 'E02',
        nombre_etapa: 'Elaboracion TDR',
        fecha_inicio: '2026-05-01',
        estado_etapa: 'EN_CURSO',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(registrarEtapa).toHaveBeenCalledWith(1, expect.objectContaining({
      codigo_etapa: 'E02',
    }));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['etapas', 1] })
    );
  });
});
