/**
 * FocoEtapa tests — TDD Red → Green
 * Covers:
 *  - Nav renders 5 phases
 *  - Click on nav row calls onSelectEtapa
 *  - Null selection shows empty prompt
 *  - Simple etapa shows hero + inline form
 *  - por_area etapa shows "Abrir editor completo" button
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
  etapa_actual: "E01a",
  porcentaje: 0,
  completadas: 0,
  total: 26,
};

// Minimal set: at least one etapa per fase
const ETAPAS: EtapaAgrupada[] = [
  // Fase 1
  makeEtapa("E01a", { estado: "COMPLETADO" }),
  makeEtapa("E01b"),
  makeEtapa("E01c", { por_area: true }),
  makeEtapa("E02"),
  makeEtapa("E02b"),
  // Fase 2
  makeEtapa("E03"),
  makeEtapa("E04"),
  makeEtapa("E07"),
  makeEtapa("E08"),
  // Fase 3
  makeEtapa("E09"),
  makeEtapa("E10"),
  makeEtapa("E11", { por_area: true }),
  makeEtapa("E12"),
  makeEtapa("E13"),
  makeEtapa("E14"),
  makeEtapa("E15"),
  makeEtapa("E16"),
  // Fase 4
  makeEtapa("E17"),
  makeEtapa("E18"),
  makeEtapa("E19"),
  makeEtapa("E20"),
  makeEtapa("E21"),
  makeEtapa("E22"),
  // Fase 5
  makeEtapa("E23"),
  makeEtapa("E24", { por_area: true }),
  makeEtapa("E25"),
];

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

const baseProps = {
  procesoId: 1,
  etapas: ETAPAS,
  progreso: PROGRESO,
  etapaSeleccionada: null as EtapaAgrupada | null,
  onSelectEtapa: vi.fn(),
  onClose: vi.fn(),
};

describe("FocoEtapa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------------
  // Nav rendering
  // ----------------------------------------------------------------

  it("renders left nav with all 5 phase headers", () => {
    render(React.createElement(FocoEtapa, baseProps), { wrapper: Wrapper });

    expect(screen.getByText(/Requerimiento/i)).toBeInTheDocument();
    expect(screen.getByText(/Indagación/i)).toBeInTheDocument();
    expect(screen.getByText(/Presupuesto/i)).toBeInTheDocument();
    expect(screen.getByText(/Orden/i)).toBeInTheDocument();
    expect(screen.getByText(/Conformidad/i)).toBeInTheDocument();
  });

  it("renders E01a nav row with its code", () => {
    render(React.createElement(FocoEtapa, baseProps), { wrapper: Wrapper });

    expect(screen.getByTestId("nav-row-E01a")).toBeInTheDocument();
  });

  it("clicking a nav row calls onSelectEtapa with the correct etapa", () => {
    const onSelectEtapa = vi.fn();
    render(
      React.createElement(FocoEtapa, { ...baseProps, onSelectEtapa }),
      { wrapper: Wrapper }
    );

    fireEvent.click(screen.getByTestId("nav-row-E01a"));
    expect(onSelectEtapa).toHaveBeenCalledOnce();
    expect(onSelectEtapa).toHaveBeenCalledWith(expect.objectContaining({ cod: "E01a" }));
  });

  it("nav row for current etapa has aria-current='true'", () => {
    const progresoCurrent = { ...PROGRESO, etapa_actual: "E01b" };
    render(
      React.createElement(FocoEtapa, { ...baseProps, progreso: progresoCurrent }),
      { wrapper: Wrapper }
    );

    const row = screen.getByTestId("nav-row-E01b");
    expect(row).toHaveAttribute("aria-current", "true");
  });

  // ----------------------------------------------------------------
  // Panel — no selection
  // ----------------------------------------------------------------

  it("shows selection prompt when etapaSeleccionada is null", () => {
    render(React.createElement(FocoEtapa, baseProps), { wrapper: Wrapper });

    expect(screen.getByTestId("foco-empty-prompt")).toBeInTheDocument();
  });

  // ----------------------------------------------------------------
  // Panel — simple etapa
  // ----------------------------------------------------------------

  it("shows hero card and inline form for a simple (non-por_area, non-bucle) etapa", () => {
    const etapaSimple = makeEtapa("E02");
    render(
      React.createElement(FocoEtapa, {
        ...baseProps,
        etapaSeleccionada: etapaSimple,
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId("foco-hero")).toBeInTheDocument();
    expect(screen.getByTestId("foco-inline-form")).toBeInTheDocument();
    // No modal trigger button for simple etapas
    expect(screen.queryByTestId("foco-open-modal-btn")).not.toBeInTheDocument();
  });

  it("inline form shows estado and fecha_inicio fields for a simple etapa", () => {
    const etapaSimple = makeEtapa("E02");
    render(
      React.createElement(FocoEtapa, {
        ...baseProps,
        etapaSeleccionada: etapaSimple,
      }),
      { wrapper: Wrapper }
    );

    // Labels
    expect(screen.getByLabelText(/estado/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha inicio/i)).toBeInTheDocument();
  });

  // ----------------------------------------------------------------
  // Panel — por_area etapa
  // ----------------------------------------------------------------

  it("shows 'Abrir editor completo' button for por_area etapa instead of inline form", () => {
    const etapaPorArea = makeEtapa("E11", { por_area: true });
    render(
      React.createElement(FocoEtapa, {
        ...baseProps,
        etapaSeleccionada: etapaPorArea,
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId("foco-open-modal-btn")).toBeInTheDocument();
    expect(screen.queryByTestId("foco-inline-form")).not.toBeInTheDocument();
  });

  it("clicking 'Abrir editor completo' on por_area etapa opens ModalRegistroEtapa", () => {
    const etapaPorArea = makeEtapa("E11", { por_area: true });
    render(
      React.createElement(FocoEtapa, {
        ...baseProps,
        etapaSeleccionada: etapaPorArea,
      }),
      { wrapper: Wrapper }
    );

    expect(screen.queryByTestId("modal-mock")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("foco-open-modal-btn"));
    expect(screen.getByTestId("modal-mock")).toBeInTheDocument();
  });

  // ----------------------------------------------------------------
  // Panel — bucle etapa
  // ----------------------------------------------------------------

  it("shows 'Abrir editor completo' button for bucle etapa instead of inline form", () => {
    const etapaBucle = makeEtapa("E05", {
      es_bucle: true,
      rondas: [{ id: 1, nro_ronda: 1, motivo_bucle: "obs", estado_etapa: "EN_CURSO", fecha_inicio: null, fecha_fin: null, dias: null }],
    });
    render(
      React.createElement(FocoEtapa, {
        ...baseProps,
        etapaSeleccionada: etapaBucle,
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId("foco-open-modal-btn")).toBeInTheDocument();
    expect(screen.queryByTestId("foco-inline-form")).not.toBeInTheDocument();
  });

  // ----------------------------------------------------------------
  // Breadcrumb
  // ----------------------------------------------------------------

  it("renders breadcrumb with fase name and etapa code when etapa is selected", () => {
    const etapaE10 = makeEtapa("E10", { estado: "EN_CURSO" });
    render(
      React.createElement(FocoEtapa, {
        ...baseProps,
        etapaSeleccionada: etapaE10,
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId("foco-breadcrumb")).toBeInTheDocument();
    // Should contain "E10"
    expect(screen.getByTestId("foco-breadcrumb")).toHaveTextContent("E10");
  });

  // ----------------------------------------------------------------
  // Edit mode: etapa with existing fila → PUT mode indicator
  // ----------------------------------------------------------------

  it("inline form shows 'Actualizar' submit when etapa already has a fila (edit mode)", () => {
    const etapaConFila = makeEtapa("E02", {
      estado: "EN_CURSO",
      filas: [{ id: 5, area_usuaria: "", estado_etapa: "EN_CURSO", fecha_inicio: "2026-01-01", fecha_fin: null, dias: null }],
    });
    render(
      React.createElement(FocoEtapa, {
        ...baseProps,
        etapaSeleccionada: etapaConFila,
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByRole("button", { name: /actualizar/i })).toBeInTheDocument();
  });

  it("inline form shows 'Guardar' submit when etapa has no fila (create mode)", () => {
    const etapaSinFila = makeEtapa("E03");
    render(
      React.createElement(FocoEtapa, {
        ...baseProps,
        etapaSeleccionada: etapaSinFila,
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByRole("button", { name: /guardar/i })).toBeInTheDocument();
  });

  // ----------------------------------------------------------------
  // Bug fix: form hydration from filas[0] (inferencia / manual)
  // ----------------------------------------------------------------

  it("inline form pre-fills all fields from filas[0] when etapa is COMPLETADO (inference)", () => {
    const etapaCompletada = makeEtapa("E03", {
      estado: "COMPLETADO",
      filas: [
        {
          id: 13190,
          area_usuaria: "",
          estado_etapa: "COMPLETADO",
          fecha_inicio: "2026-04-07",
          fecha_fin: "2026-04-07",
          dias: null,
          responsable: "Eduardo Corilla Baquerizo",
          oficio_correo: "267-2026-INEI/OTIN",
          observaciones: "[INGESTA_INFER corr=964] resumen de inferencia",
        },
      ],
    });

    render(
      React.createElement(FocoEtapa, {
        ...baseProps,
        etapaSeleccionada: etapaCompletada,
      }),
      { wrapper: Wrapper }
    );

    // Estado select debe mostrar COMPLETADO
    expect(screen.getByLabelText(/estado/i)).toHaveValue("COMPLETADO");
    // Responsable
    expect(screen.getByLabelText(/responsable/i)).toHaveValue("Eduardo Corilla Baquerizo");
    // Fecha inicio
    expect(screen.getByLabelText(/fecha inicio/i)).toHaveValue("2026-04-07");
    // Fecha fin
    expect(screen.getByLabelText(/fecha fin/i)).toHaveValue("2026-04-07");
    // Oficio / Correo
    expect(screen.getByLabelText(/oficio/i)).toHaveValue("267-2026-INEI/OTIN");
    // Observaciones
    expect(screen.getByLabelText(/observaciones/i)).toHaveValue("[INGESTA_INFER corr=964] resumen de inferencia");
  });

  it("inline form re-hydrates fields when switching between etapas (stale useState bug)", () => {
    const etapaA = makeEtapa("E03", {
      estado: "COMPLETADO",
      filas: [
        {
          id: 100,
          area_usuaria: "",
          estado_etapa: "COMPLETADO",
          fecha_inicio: "2026-03-01",
          fecha_fin: "2026-03-02",
          dias: null,
          responsable: "Responsable A",
          oficio_correo: "OF-001",
          observaciones: "Obs A",
        },
      ],
    });

    const etapaB = makeEtapa("E04", {
      estado: "PENDIENTE",
      filas: [],
    });

    const { rerender } = render(
      React.createElement(FocoEtapa, {
        ...baseProps,
        etapaSeleccionada: etapaA,
      }),
      { wrapper: Wrapper }
    );

    // First: form shows etapaA data
    expect(screen.getByLabelText(/responsable/i)).toHaveValue("Responsable A");

    // Switch to etapaB (no fila → defaults)
    rerender(
      React.createElement(Wrapper, null,
        React.createElement(FocoEtapa, {
          ...baseProps,
          etapaSeleccionada: etapaB,
        })
      )
    );

    // Form must NOT retain stale "Responsable A" — must show empty default
    expect(screen.getByLabelText(/responsable/i)).toHaveValue("");
    // Estado must reset to default EN_CURSO (no fila)
    expect(screen.getByLabelText(/estado/i)).toHaveValue("EN_CURSO");
  });
});
