/**
 * LineaEtapasHorizontal — phase summary cards.
 *
 * Verifies that the dashboard timeline groups stages into the 5 executive
 * phases and keeps the chained-days calculation for accumulated phase days.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LineaEtapasHorizontal } from "@/components/dashboard/LineaEtapasHorizontal";
import type { EstadoEtapa, EtapaAgrupada, EtapasResponse } from "@/types/etapa";

vi.mock("@/hooks/useEtapas", () => ({
  useEtapas: vi.fn(),
}));

import { useEtapas } from "@/hooks/useEtapas";

const MAIN_CHAIN = [
  "E01a", "E01b", "E01c", "E02", "E02b",
  "E03", "E04", "E07", "E08",
  "E09", "E10", "E11", "E12", "E13", "E14", "E15", "E16",
  "E17", "E18", "E19", "E20", "E21", "E22",
  "E23", "E24", "E25",
] as const;

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

function makeEtapa(
  cod: string,
  estado: EstadoEtapa = "PENDIENTE",
  fecha_inicio: string | null = null,
  fecha_fin: string | null = null,
  diasStored: number | null = null
): EtapaAgrupada {
  return {
    cod,
    nombre: `Etapa ${cod}`,
    area_responsable: "OTIN",
    es_bucle: false,
    por_area: false,
    estado,
    filas: fecha_inicio
      ? [{
          id: Number(cod.replace(/\D/g, "") || 1),
          area_usuaria: "OTIN",
          estado_etapa: estado,
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

function makeResponse(etapas: EtapaAgrupada[]): EtapasResponse {
  return {
    etapas,
    progreso: { etapa_actual: null, porcentaje: 0, completadas: 0, total: 26 },
  };
}

describe("LineaEtapasHorizontal — phase cards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the 5 phase cards with progress counters", () => {
    const etapas = MAIN_CHAIN.map((cod) => makeEtapa(cod));
    for (const cod of ["E01a", "E01b", "E01c", "E02", "E02b", "E03", "E04"]) {
      const idx = etapas.findIndex((e) => e.cod === cod);
      etapas[idx] = makeEtapa(cod, "COMPLETADO");
    }
    etapas[etapas.findIndex((e) => e.cod === "E07")] = makeEtapa("E07", "EN_CURSO");

    vi.mocked(useEtapas).mockReturnValue({
      data: makeResponse(etapas),
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useEtapas>);

    render(React.createElement(LineaEtapasHorizontal, { procesoId: 1 }), { wrapper: Wrapper });

    expect(screen.getByRole("article", { name: /Fase 1: Requerimiento, 5 de 5 etapas/i })).toBeTruthy();
    expect(screen.getByRole("article", { name: /Fase 2: Indagación, 2 de 4 etapas/i })).toBeTruthy();
    expect(screen.getByRole("article", { name: /Fase 3: Presupuesto, 0 de 8 etapas/i })).toBeTruthy();
    expect(screen.getByRole("article", { name: /Fase 4: Orden, 0 de 6 etapas/i })).toBeTruthy();
    expect(screen.getByRole("article", { name: /Fase 5: Conformidad, 0 de 3 etapas/i })).toBeTruthy();
  });

  it("computes accumulated phase days from chained start dates", () => {
    const etapas = MAIN_CHAIN.map((cod) => makeEtapa(cod));
    const datedF1 = [
      makeEtapa("E01a", "COMPLETADO", "2026-02-01"),
      makeEtapa("E01b", "COMPLETADO", "2026-02-10"),
      makeEtapa("E01c", "COMPLETADO", "2026-02-15"),
      makeEtapa("E02", "COMPLETADO", "2026-02-20"),
      makeEtapa("E02b", "COMPLETADO", "2026-02-25", "2026-03-01"),
    ];

    for (const etapa of datedF1) {
      const idx = etapas.findIndex((e) => e.cod === etapa.cod);
      etapas[idx] = etapa;
    }

    vi.mocked(useEtapas).mockReturnValue({
      data: makeResponse(etapas),
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useEtapas>);

    render(React.createElement(LineaEtapasHorizontal, { procesoId: 1 }), { wrapper: Wrapper });

    const fase1 = screen.getByRole("article", { name: /Fase 1: Requerimiento/i });
    expect(fase1.textContent).toContain("28 días");
    expect(fase1.textContent).toContain("100%");
  });

  it("shows partial progress and pending status by phase", () => {
    const etapas = MAIN_CHAIN.map((cod) => makeEtapa(cod));
    etapas[etapas.findIndex((e) => e.cod === "E03")] =
      makeEtapa("E03", "COMPLETADO", "2026-03-01");
    etapas[etapas.findIndex((e) => e.cod === "E04")] =
      makeEtapa("E04", "EN_CURSO", "2026-03-06");

    vi.mocked(useEtapas).mockReturnValue({
      data: makeResponse(etapas),
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useEtapas>);

    render(React.createElement(LineaEtapasHorizontal, { procesoId: 1 }), { wrapper: Wrapper });

    const fase2 = screen.getByRole("article", { name: /Fase 2: Indagación, 1 de 4 etapas/i });
    expect(within(fase2).getByText("1/4")).toBeTruthy();
    expect(within(fase2).getByRole("progressbar", { name: /Avance fase 2/i }).getAttribute("aria-valuenow")).toBe("25");

    const fase5 = screen.getByRole("article", { name: /Fase 5: Conformidad, 0 de 3 etapas/i });
    expect(fase5.textContent).toContain("Sin iniciar");
  });
});
