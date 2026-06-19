/**
 * T14 — EtapaCard new variant tests.
 * flujo-real-otin-v2:
 * - E01b: shows countdown badge when fecha_limite_respuesta set
 * - E01c: shows cmn_siga_confirmado flag per area in filas
 * - E02b/E06c: embeds FirmaSecuencialPanel (mocked)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EtapaCard } from "@/components/procesos/EtapaCard";
import type { EtapaAgrupada, FilaArea } from "@/types/etapa";

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("@/components/procesos/AdjuntosEtapa", () => ({
  AdjuntosEtapa: ({ etapaId }: { etapaId: number }) =>
    React.createElement("div", { "data-testid": `adjuntos-mock-${etapaId}` }, "Adjuntos mock"),
}));

vi.mock("@/components/procesos/FirmaSecuencialPanel", () => ({
  FirmaSecuencialPanel: ({ etapaCod }: { etapaCod: string }) =>
    React.createElement(
      "div",
      { "data-testid": `firma-panel-${etapaCod}` },
      `FirmaSecuencialPanel for ${etapaCod}`
    ),
}));

vi.mock("@/hooks/useEtapas", () => ({
  useAgregarRonda: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useReiniciarTdr: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useRegistrarEtapa: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useActualizarEtapa: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

import { useAuthStore } from "@/stores/authStore";

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

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

function editorAuth() {
  vi.mocked(useAuthStore).mockReturnValue({
    user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
    token: "t",
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuthStore>);
}

describe("T14 — EtapaCard new variants (flujo-real-otin-v2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    editorAuth();
  });

  // ---------------------------------------------------------------
  // E01b: fecha_limite_respuesta countdown badge
  // ---------------------------------------------------------------

  it("E01b shows countdown badge when fecha_limite_respuesta is set in fila", () => {
    // Set a future date so countdown is positive
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);
    const fechaStr = futureDate.toISOString().slice(0, 10);

    const etapa = makeEtapa("E01b", {
      area_responsable: "OTIN",
      estado: "EN_CURSO",
      filas: [
        {
          id: 10,
          area_usuaria: "OTIN",
          estado_etapa: "EN_CURSO",
          fecha_inicio: "2026-01-01",
          fecha_fin: null,
          dias: null,
          fecha_limite_respuesta: fechaStr,
        } as FilaArea,
      ],
    });

    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    // Should show countdown or date indicator
    expect(screen.getByText(/Vence en|Venc[eó]|días|limite/i)).toBeInTheDocument();
  });

  it("E01b without fecha_limite_respuesta shows no countdown badge", () => {
    const etapa = makeEtapa("E01b", {
      area_responsable: "OTIN",
      estado: "PENDIENTE",
      filas: [],
    });

    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.queryByText(/Vence en/i)).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------
  // E01c: cmn_siga_confirmado per-area badge
  // ---------------------------------------------------------------

  // Cambio 6: cmn_siga_confirmado is now tri-state ('SI' | 'NO' | 'EN_CURSO' | null)
  it("E01c shows cmn_siga_confirmado badge per area in filas (tri-state)", () => {
    const etapa = makeEtapa("E01c", {
      area_responsable: "AREAS",
      por_area: true,
      estado: "EN_CURSO",
      filas: [
        {
          id: 20,
          area_usuaria: "DTDIS",
          estado_etapa: "COMPLETADO",
          fecha_inicio: "2026-01-05",
          fecha_fin: null,
          dias: null,
          cmn_siga_confirmado: "SI",
        } as FilaArea,
        {
          id: 21,
          area_usuaria: "GOBERNANZA",
          estado_etapa: "PENDIENTE",
          fecha_inicio: null,
          fecha_fin: null,
          dias: null,
          cmn_siga_confirmado: "NO",
        } as FilaArea,
      ],
    });

    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    // Should show SI badge (green) and NO badge (red) in per-area summary
    expect(screen.getByText(/DTDIS: CMN SI/i)).toBeInTheDocument();
    expect(screen.getByText(/GOBERNANZA: CMN NO/i)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------
  // E02b: FirmaSecuencialPanel embedded
  // ---------------------------------------------------------------

  it("E02b card renders FirmaSecuencialPanel", () => {
    const etapa = makeEtapa("E02b", {
      area_responsable: "AREAS",
      estado: "EN_CURSO",
      filas: [
        {
          id: 30,
          area_usuaria: "DTDIS",
          estado_etapa: "EN_CURSO",
          fecha_inicio: "2026-01-10",
          fecha_fin: null,
          dias: null,
        } as FilaArea,
      ],
    });

    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 5,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId("firma-panel-E02b")).toBeInTheDocument();
    expect(screen.getByText(/FirmaSecuencialPanel for E02b/i)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------
  // E06c: FirmaSecuencialPanel embedded (bucle)
  // ---------------------------------------------------------------

  it("E06c card renders FirmaSecuencialPanel", () => {
    const etapa = makeEtapa("E06c", {
      area_responsable: "AREAS",
      es_bucle: true,
      estado: "EN_CURSO",
      filas: [],
      rondas: [],
    });

    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 5,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId("firma-panel-E06c")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------
  // E03 (non-firma) does NOT show FirmaSecuencialPanel
  // ---------------------------------------------------------------

  it("non-firma stage (E03) does NOT render FirmaSecuencialPanel", () => {
    const etapa = makeEtapa("E03", { area_responsable: "OTIN" });

    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.queryByTestId(/firma-panel/)).not.toBeInTheDocument();
  });
});
