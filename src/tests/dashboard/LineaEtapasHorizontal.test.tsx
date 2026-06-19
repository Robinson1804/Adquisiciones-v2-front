/**
 * BUG #6 — LineaEtapasHorizontal: chained-days calculation.
 *
 * Verifies that días per card = fecha_inicio[i+1] − fecha_inicio[i],
 * and total = lastDate − firstDate (not the sum of stored filas[0].dias).
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LineaEtapasHorizontal } from "@/components/dashboard/LineaEtapasHorizontal";
import type { EtapaAgrupada, EtapasResponse } from "@/types/etapa";

vi.mock("@/hooks/useEtapas", () => ({
  useEtapas: vi.fn(),
}));

import { useEtapas } from "@/hooks/useEtapas";

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

function makeEtapa(
  cod: string,
  fecha_inicio: string | null,
  fecha_fin: string | null = null,
  diasStored: number | null = null
): EtapaAgrupada {
  return {
    cod,
    nombre: `Etapa ${cod}`,
    area_responsable: 'OTIN',
    es_bucle: false,
    por_area: false,
    estado: 'COMPLETADO',
    filas: fecha_inicio
      ? [{
          id: Number(cod.slice(1)),
          area_usuaria: 'OTIN',
          estado_etapa: 'COMPLETADO',
          fecha_inicio,
          fecha_fin,
          dias: diasStored,
        }]
      : [],
    rondas: [],
    alerta_otpp: null,
    monto_total: null,
  };
}

describe("LineaEtapasHorizontal — BUG-6 chained days", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("computes dias as fecha_inicio[next] − fecha_inicio[current] (not stored dias)", () => {
    // E01: 2026-02-01 → next starts 2026-02-10  → 9 days
    // E02: 2026-02-10 → next starts 2026-03-05  → 23 days
    // E03: 2026-03-05 (last, no fecha_fin)       → 0 days
    const mockResponse: EtapasResponse = {
      etapas: [
        makeEtapa('E01', '2026-02-01', null, null),
        makeEtapa('E02', '2026-02-10', null, null),
        makeEtapa('E03', '2026-03-05', null, null),
      ],
      progreso: { etapa_actual: 'E03', porcentaje: 60, completadas: 2, total: 25 },
    };

    vi.mocked(useEtapas).mockReturnValue({
      data: mockResponse,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useEtapas>);

    render(React.createElement(LineaEtapasHorizontal, { procesoId: 1 }), { wrapper: Wrapper });

    // E01 card: 9 días
    const e01Card = screen.getByRole('article', { name: /Etapa E01/i });
    expect(e01Card.textContent).toMatch(/9/);

    // E02 card: 23 días
    const e02Card = screen.getByRole('article', { name: /Etapa E02/i });
    expect(e02Card.textContent).toMatch(/23/);
  });

  it("last stage with fecha_fin shows days = fecha_fin − fecha_inicio", () => {
    // E01: starts 2026-02-01, ends 2026-02-15 → 14 days (only stage)
    const mockResponse: EtapasResponse = {
      etapas: [
        makeEtapa('E01', '2026-02-01', '2026-02-15', null),
      ],
      progreso: { etapa_actual: null, porcentaje: 100, completadas: 1, total: 25 },
    };

    vi.mocked(useEtapas).mockReturnValue({
      data: mockResponse,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useEtapas>);

    render(React.createElement(LineaEtapasHorizontal, { procesoId: 1 }), { wrapper: Wrapper });

    const e01Card = screen.getByRole('article', { name: /Etapa E01/i });
    expect(e01Card.textContent).toMatch(/14/);
  });

  it("total reflects span from first to last date (approx 75 days for feb→may)", () => {
    // Simulates the reported bug: process ran ~feb→may but showed 4
    const mockResponse: EtapasResponse = {
      etapas: [
        makeEtapa('E01', '2026-02-01', null, null),
        makeEtapa('E02', '2026-02-15', null, null),
        makeEtapa('E03', '2026-03-10', null, null),
        makeEtapa('E04', '2026-04-20', '2026-05-17', null),
      ],
      progreso: { etapa_actual: 'E04', porcentaje: 80, completadas: 3, total: 25 },
    };

    vi.mocked(useEtapas).mockReturnValue({
      data: mockResponse,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useEtapas>);

    render(React.createElement(LineaEtapasHorizontal, { procesoId: 1 }), { wrapper: Wrapper });

    // Total should be fecha_fin(E04) − fecha_inicio(E01) = 2026-05-17 − 2026-02-01 = 105 days
    // (definitely NOT "4" which was the broken value).
    // The total pill has aria-label "Total" text followed by the bold number span.
    // Use getAllByText and find the one inside the total pill (has class text-xl).
    const boldNumbers = document.querySelectorAll('span.text-xl');
    const totalValue = parseInt(boldNumbers[0]?.textContent ?? '0', 10);
    expect(totalValue).toBeGreaterThan(50);
  });

  it("shows '—' dias for stage with no fecha_inicio when next stage exists", () => {
    // If a stage has no fecha_inicio, dias should be null/—
    const etapaNoFecha: EtapaAgrupada = {
      ...makeEtapa('E01', null),
    };
    const etapaConFecha = makeEtapa('E02', '2026-03-01', null, null);

    const mockResponse: EtapasResponse = {
      etapas: [etapaNoFecha, etapaConFecha],
      progreso: { etapa_actual: 'E02', porcentaje: 20, completadas: 0, total: 25 },
    };

    vi.mocked(useEtapas).mockReturnValue({
      data: mockResponse,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useEtapas>);

    render(React.createElement(LineaEtapasHorizontal, { procesoId: 1 }), { wrapper: Wrapper });

    // E01 has no fecha — card should show "—"
    const e01Card = screen.getByRole('article', { name: /Etapa E01/i });
    expect(e01Card.textContent).toContain('—');
  });
});
