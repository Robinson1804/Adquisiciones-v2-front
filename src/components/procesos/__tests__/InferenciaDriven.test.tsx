/**
 * InferenciaDriven tests — REFINAMIENTO FASE 3
 *
 * Covers the inference-driven presentation layer across MapaProceso and FocoEtapa:
 *
 * MapaProceso (inference-driven = etapaActualAvance is a non-empty string):
 *  - E23 chip carries "ACTUAL" badge and green ring
 *  - E01b chip has NO "AHORA" badge and NO "Registrar avance" CTA
 *  - Legend shows only "Completado" + "Omitido / sin información" items
 *
 * MapaProceso (non-inference = etapaActualAvance is null/undefined):
 *  - E01b chip carries "AHORA" badge and blue ring (existing behavior preserved)
 *  - Legend shows EN_CURSO and PENDIENTE items (existing behavior preserved)
 *
 * FocoEtapa (inference-driven):
 *  - E23 nav row is marked aria-current="true" (NOT E01b)
 *  - E01b nav row has NO aria-current
 *
 * FocoEtapa (non-inference):
 *  - E01b nav row is aria-current="true" (existing behavior preserved)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MapaProceso } from "@/components/procesos/MapaProceso";
import { FocoEtapa } from "@/components/procesos/FocoEtapa";
import type { EtapaAgrupada, Progreso } from "@/types/etapa";

// --------------- mocks ---------------

vi.mock("@/hooks/useEtapas", () => ({
  useRegistrarEtapa: vi.fn(() => ({ mutate: vi.fn(), isPending: false, isError: false, error: null })),
  useActualizarEtapa: vi.fn(() => ({ mutate: vi.fn(), isPending: false, isError: false, error: null })),
}));

vi.mock("@/components/procesos/ModalRegistroEtapa", () => ({
  ModalRegistroEtapa: ({ open }: { open: boolean }) =>
    open ? React.createElement("div", { "data-testid": "modal-mock" }) : null,
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
    token: "t",
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  })),
}));

// --------------- helpers ---------------

function makeEtapa(cod: string, overrides: Partial<EtapaAgrupada> = {}): EtapaAgrupada {
  return {
    cod,
    nombre: `Etapa ${cod}`,
    area_responsable: "OTIN",
    es_bucle: false,
    por_area: false,
    estado: "PENDIENTE",
    filas: [],
    rondas: [],
    alerta_otpp: null,
    monto_total: null,
    ...overrides,
  };
}

const PROGRESO: Progreso = {
  etapa_actual: "E01b",
  porcentaje: 88,
  completadas: 23,
  total: 26,
};

/** Minimal set that covers all 5 phases (faseDeEtapa from fases.ts maps by prefix). */
const ETAPAS: EtapaAgrupada[] = [
  // Fase 1
  makeEtapa("E01a", { estado: "COMPLETADO" }),
  makeEtapa("E01b", { estado: "EN_CURSO" }),
  makeEtapa("E01c", { por_area: true, estado: "COMPLETADO" }),
  makeEtapa("E02", { estado: "COMPLETADO" }),
  makeEtapa("E02b", { estado: "COMPLETADO" }),
  // Fase 2
  makeEtapa("E03", { estado: "COMPLETADO" }),
  makeEtapa("E04", { estado: "COMPLETADO" }),
  makeEtapa("E07", { estado: "COMPLETADO" }),
  makeEtapa("E08", { estado: "COMPLETADO" }),
  // Fase 3
  makeEtapa("E09", { estado: "COMPLETADO" }),
  makeEtapa("E10", { estado: "COMPLETADO" }),
  makeEtapa("E11", { por_area: true, estado: "COMPLETADO" }),
  makeEtapa("E12", { estado: "COMPLETADO" }),
  makeEtapa("E13", { estado: "COMPLETADO" }),
  makeEtapa("E14", { estado: "COMPLETADO" }),
  makeEtapa("E15", { estado: "COMPLETADO" }),
  makeEtapa("E16", { estado: "COMPLETADO" }),
  // Fase 4
  makeEtapa("E17", { estado: "COMPLETADO" }),
  makeEtapa("E18", { estado: "COMPLETADO" }),
  makeEtapa("E19", { estado: "COMPLETADO" }),
  makeEtapa("E20", { estado: "COMPLETADO" }),
  makeEtapa("E21", { estado: "COMPLETADO" }),
  makeEtapa("E22", { estado: "COMPLETADO" }),
  // Fase 5
  makeEtapa("E23", { estado: "COMPLETADO" }),
  makeEtapa("E24", { por_area: true }),
  makeEtapa("E25"),
];

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

const baseMapaProps = {
  etapas: ETAPAS,
  progreso: PROGRESO,
  onSelect: vi.fn(),
};

const baseFocoProps = {
  procesoId: 1,
  etapas: ETAPAS,
  progreso: PROGRESO,
  etapaSeleccionada: null as EtapaAgrupada | null,
  onSelectEtapa: vi.fn(),
  onClose: vi.fn(),
};

// ===========================================================
// MapaProceso — inference-driven (etapaActualAvance = "E23")
// ===========================================================

describe("MapaProceso — inference-driven (etapaActualAvance='E23')", () => {
  beforeEach(() => vi.clearAllMocks());

  it("E23 chip shows 'ACTUAL' badge", () => {
    render(
      React.createElement(MapaProceso, { ...baseMapaProps, etapaActualAvance: "E23" }),
      { wrapper: Wrapper }
    );
    expect(screen.getByText("ACTUAL")).toBeInTheDocument();
  });

  it("E01b chip does NOT show 'AHORA' badge", () => {
    render(
      React.createElement(MapaProceso, { ...baseMapaProps, etapaActualAvance: "E23" }),
      { wrapper: Wrapper }
    );
    expect(screen.queryByText("AHORA")).not.toBeInTheDocument();
  });

  it("'Registrar avance' CTA is NOT present (E23 is already COMPLETADO)", () => {
    render(
      React.createElement(MapaProceso, { ...baseMapaProps, etapaActualAvance: "E23" }),
      { wrapper: Wrapper }
    );
    expect(screen.queryByText("Registrar avance")).not.toBeInTheDocument();
  });

  it("legend shows 'Completado' and 'Omitido / sin información' but NOT 'En Curso' or 'Pendiente'", () => {
    render(
      React.createElement(MapaProceso, { ...baseMapaProps, etapaActualAvance: "E23" }),
      { wrapper: Wrapper }
    );
    expect(screen.getByText("Completado")).toBeInTheDocument();
    expect(screen.getByText("Omitido / sin información")).toBeInTheDocument();
    expect(screen.queryByText("En Curso")).not.toBeInTheDocument();
    expect(screen.queryByText("Pendiente")).not.toBeInTheDocument();
  });

  it("legend keeps '↻ Bucle (reproceso)' item", () => {
    render(
      React.createElement(MapaProceso, { ...baseMapaProps, etapaActualAvance: "E23" }),
      { wrapper: Wrapper }
    );
    expect(screen.getByText(/Bucle/i)).toBeInTheDocument();
  });
});

// ===========================================================
// MapaProceso — non-inference (etapaActualAvance = null)
// ===========================================================

describe("MapaProceso — non-inference (etapaActualAvance=null)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("E01b chip shows 'AHORA' badge (existing behavior preserved)", () => {
    render(
      React.createElement(MapaProceso, { ...baseMapaProps, etapaActualAvance: null }),
      { wrapper: Wrapper }
    );
    expect(screen.getByText("AHORA")).toBeInTheDocument();
  });

  it("'Registrar avance' CTA is present on E01b (existing behavior preserved)", () => {
    render(
      React.createElement(MapaProceso, { ...baseMapaProps, etapaActualAvance: null }),
      { wrapper: Wrapper }
    );
    expect(screen.getByText("Registrar avance")).toBeInTheDocument();
  });

  it("legend shows 'En Curso' and 'Pendiente' (existing behavior preserved)", () => {
    render(
      React.createElement(MapaProceso, { ...baseMapaProps, etapaActualAvance: null }),
      { wrapper: Wrapper }
    );
    expect(screen.getByText("En Curso")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });

  it("no 'ACTUAL' badge visible", () => {
    render(
      React.createElement(MapaProceso, { ...baseMapaProps, etapaActualAvance: null }),
      { wrapper: Wrapper }
    );
    expect(screen.queryByText("ACTUAL")).not.toBeInTheDocument();
  });
});

// ===========================================================
// FocoEtapa — inference-driven (etapaActualAvance = "E23")
// ===========================================================

describe("FocoEtapa nav — inference-driven (etapaActualAvance='E23')", () => {
  beforeEach(() => vi.clearAllMocks());

  it("E23 nav row has aria-current='true'", () => {
    render(
      React.createElement(FocoEtapa, { ...baseFocoProps, etapaActualAvance: "E23" }),
      { wrapper: Wrapper }
    );
    expect(screen.getByTestId("nav-row-E23")).toHaveAttribute("aria-current", "true");
  });

  it("E01b nav row does NOT have aria-current (even though progreso.etapa_actual='E01b')", () => {
    render(
      React.createElement(FocoEtapa, { ...baseFocoProps, etapaActualAvance: "E23" }),
      { wrapper: Wrapper }
    );
    expect(screen.getByTestId("nav-row-E01b")).not.toHaveAttribute("aria-current");
  });
});

// ===========================================================
// FocoEtapa — non-inference (etapaActualAvance = null)
// ===========================================================

describe("FocoEtapa nav — non-inference (etapaActualAvance=null)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("E01b nav row is aria-current='true' (existing behavior preserved)", () => {
    render(
      React.createElement(FocoEtapa, { ...baseFocoProps, etapaActualAvance: null }),
      { wrapper: Wrapper }
    );
    expect(screen.getByTestId("nav-row-E01b")).toHaveAttribute("aria-current", "true");
  });

  it("E23 nav row does NOT have aria-current", () => {
    render(
      React.createElement(FocoEtapa, { ...baseFocoProps, etapaActualAvance: null }),
      { wrapper: Wrapper }
    );
    expect(screen.getByTestId("nav-row-E23")).not.toHaveAttribute("aria-current");
  });
});
