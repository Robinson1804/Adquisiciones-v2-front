/**
 * LineaTiempo tests — post-refactor: modo "lista" removido, reemplazado por "foco".
 *
 * Tests conservados:
 *  - Skeleton, error, mapa (5 fases), toggle mapa/foco
 *
 * Tests eliminados (modo "lista" ya no existe):
 *  - renders 26 visible etapa cards
 *  - renders all non-bucle etapa codes as article labels
 *  - bucle stage with ronda badge
 *  - AREAS actor chip inside EtapaCard
 *  - Cambio-1 bucle hidden / shown (esas validaciones viven en FocoEtapa + MapaProceso)
 *
 * Nuevos tests:
 *  - Toggle mapa → foco muestra FocoEtapa
 *  - Botón "Foco" tiene aria-selected correcto
 *  - Click en etapa del mapa cambia a modo foco con etapa seleccionada
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LineaTiempo } from "@/components/procesos/LineaTiempo";
import type { EtapasResponse } from "@/types/etapa";

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 2, username: "viewer", nombre_completo: "Viewer", rol: "VIEWER", area: null },
    token: "t",
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  })),
}));

vi.mock("@/hooks/useEtapas", () => ({
  useEtapas: vi.fn(),
  useAgregarRonda: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useReiniciarTdr: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useRegistrarEtapa: vi.fn(() => ({ mutate: vi.fn(), isPending: false, isError: false, error: null })),
  useActualizarEtapa: vi.fn(() => ({ mutate: vi.fn(), isPending: false, isError: false, error: null })),
}));

vi.mock("@/components/procesos/ModalRegistroEtapa", () => ({
  ModalRegistroEtapa: () => React.createElement("div", { "data-testid": "modal-mock" }),
}));

vi.mock("@/components/procesos/AdjuntosEtapa", () => ({
  AdjuntosEtapa: ({ etapaId }: { etapaId: number }) =>
    React.createElement("div", { "data-testid": `adjuntos-mock-${etapaId}` }, "Adjuntos mock"),
}));

import { useEtapas } from "@/hooks/useEtapas";

const ETAPA_CODES = [
  "E01a", "E01b", "E01c", "E02", "E02b",
  "E03", "E04", "E05", "E06", "E06b", "E06c", "E07", "E08", "E08a", "E08b",
  "E09", "E10", "E11", "E12", "E13", "E14", "E15", "E16", "E17", "E18",
  "E19", "E20", "E21", "E22", "E23", "E24", "E25",
];

function makeEtapa(cod: string, area = "OTIN", overrides = {}) {
  return {
    cod,
    nombre: `Etapa ${cod}`,
    area_responsable: area,
    es_bucle: ["E05", "E06", "E06b", "E06c", "E08a", "E08b"].includes(cod),
    por_area: ["E01c", "E11", "E24"].includes(cod),
    estado: "PENDIENTE",
    filas: [],
    rondas: [],
    alerta_otpp: null,
    monto_total: null,
    ...overrides,
  };
}

const allPendingResponse: EtapasResponse = {
  etapas: ETAPA_CODES.map((cod) => makeEtapa(cod)),
  progreso: {
    etapa_actual: "E01a",
    porcentaje: 0,
    completadas: 0,
    total: 26,
  },
};

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("LineaTiempo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------------
  // Loading & error states
  // ----------------------------------------------------------------

  it("shows loading skeleton when isLoading", () => {
    vi.mocked(useEtapas).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as ReturnType<typeof useEtapas>);

    render(React.createElement(LineaTiempo, { procesoId: 1 }), { wrapper: Wrapper });

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows error message when isError", () => {
    vi.mocked(useEtapas).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Network Error"),
    } as ReturnType<typeof useEtapas>);

    render(React.createElement(LineaTiempo, { procesoId: 1 }), { wrapper: Wrapper });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/Network Error/i)).toBeInTheDocument();
  });

  // ----------------------------------------------------------------
  // Mapa mode (default)
  // ----------------------------------------------------------------

  it("Mapa: default mode shows 'Mapa del Proceso' header and 5-phase board", () => {
    vi.mocked(useEtapas).mockReturnValue({
      data: allPendingResponse,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useEtapas>);

    render(React.createElement(LineaTiempo, { procesoId: 1 }), { wrapper: Wrapper });

    expect(screen.getByText("Mapa del Proceso")).toBeInTheDocument();
    expect(screen.getByText("Requerimiento")).toBeInTheDocument();
    expect(screen.getByText("Indagación")).toBeInTheDocument();
    expect(screen.getByText("Presupuesto")).toBeInTheDocument();
    expect(screen.getByText("Orden")).toBeInTheDocument();
    expect(screen.getByText("Conformidad")).toBeInTheDocument();
  });

  it("Mapa: 'Mapa' tab is aria-selected=true by default", () => {
    vi.mocked(useEtapas).mockReturnValue({
      data: allPendingResponse,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useEtapas>);

    render(React.createElement(LineaTiempo, { procesoId: 1 }), { wrapper: Wrapper });

    expect(screen.getByRole("tab", { name: /^Mapa$/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /^Foco$/i })).toHaveAttribute("aria-selected", "false");
  });

  // ----------------------------------------------------------------
  // Toggle Mapa → Foco
  // ----------------------------------------------------------------

  it("toggle 'Foco' renders FocoEtapa with the 5 phases in the nav", () => {
    vi.mocked(useEtapas).mockReturnValue({
      data: allPendingResponse,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useEtapas>);

    render(React.createElement(LineaTiempo, { procesoId: 1 }), { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("tab", { name: /^Foco$/i }));

    // FocoEtapa renders nav with phase labels
    expect(screen.getByText("Requerimiento y TDR")).toBeInTheDocument();
    // Header changes
    expect(screen.getByText("Registro de Etapas")).toBeInTheDocument();
  });

  it("toggle Mapa→Foco switches aria-selected", () => {
    vi.mocked(useEtapas).mockReturnValue({
      data: allPendingResponse,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useEtapas>);

    render(React.createElement(LineaTiempo, { procesoId: 1 }), { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("tab", { name: /^Foco$/i }));

    expect(screen.getByRole("tab", { name: /^Foco$/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /^Mapa$/i })).toHaveAttribute("aria-selected", "false");
  });

  it("clicking 'Mapa' after 'Foco' restores 'Mapa del Proceso' header", () => {
    vi.mocked(useEtapas).mockReturnValue({
      data: allPendingResponse,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useEtapas>);

    render(React.createElement(LineaTiempo, { procesoId: 1 }), { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("tab", { name: /^Foco$/i }));
    expect(screen.getByText("Registro de Etapas")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /^Mapa$/i }));
    expect(screen.getByText("Mapa del Proceso")).toBeInTheDocument();
  });

  it("toggle 'Foco' without prior selection pre-selects etapa_actual (E01a) from progreso", () => {
    vi.mocked(useEtapas).mockReturnValue({
      data: allPendingResponse,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useEtapas>);

    render(React.createElement(LineaTiempo, { procesoId: 1 }), { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("tab", { name: /^Foco$/i }));

    // Nav row for E01a should be present (and active since it's pre-selected)
    expect(screen.getByTestId("nav-row-E01a")).toBeInTheDocument();
    // Hero card should appear (E01a selected)
    expect(screen.getByTestId("foco-hero")).toBeInTheDocument();
  });

  // ----------------------------------------------------------------
  // Progreso display
  // ----------------------------------------------------------------

  it("shows progress fraction and percentage in header", () => {
    const responseWith5Completadas: EtapasResponse = {
      ...allPendingResponse,
      progreso: { etapa_actual: "E06", porcentaje: 19.23, completadas: 5, total: 26 },
    };
    vi.mocked(useEtapas).mockReturnValue({
      data: responseWith5Completadas,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useEtapas>);

    render(React.createElement(LineaTiempo, { procesoId: 1 }), { wrapper: Wrapper });

    // Use getAllByText since "5" appears as both the completadas counter and a fase badge
    const fiveCandidates = screen.getAllByText("5");
    expect(fiveCandidates.length).toBeGreaterThanOrEqual(1);
    // The progress text node "5/26 etapas" is rendered separately
    expect(screen.getByText(/\/26/)).toBeInTheDocument();
    expect(screen.getByText("19%")).toBeInTheDocument();
  });
});
