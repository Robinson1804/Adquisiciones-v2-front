/**
 * C3a — ModalRegistroEtapa tests.
 * WU-12: contextual fields per stage code.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModalRegistroEtapa } from "@/components/procesos/ModalRegistroEtapa";
import type { EtapaAgrupada, RondaBucle } from "@/types/etapa";

const mockRegistrar = vi.fn();
const mockActualizar = vi.fn();

vi.mock("@/hooks/useEtapas", () => ({
  useRegistrarEtapa: vi.fn(() => ({
    mutate: mockRegistrar,
    isPending: false,
    isError: false,
    error: null,
  })),
  useActualizarEtapa: vi.fn(() => ({
    mutate: mockActualizar,
    isPending: false,
    isError: false,
    error: null,
  })),
  useReiniciarTdr: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

// TablaAreasE11/E24 are mocked to avoid double-testing per-area logic here
vi.mock("@/components/procesos/TablaAreasE11", () => ({
  TablaAreasE11: () =>
    React.createElement("div", { "data-testid": "tabla-areas-e11-mock" }, "TablaAreasE11"),
}));

vi.mock("@/components/procesos/TablaAreasE24", () => ({
  TablaAreasE24: () =>
    React.createElement("div", { "data-testid": "tabla-areas-e24-mock" }, "TablaAreasE24"),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

function makeEtapa(cod: string, overrides: Partial<EtapaAgrupada> = {}): EtapaAgrupada {
  return {
    cod,
    nombre: `Etapa ${cod}`,
    area_responsable: 'OTIN',
    es_bucle: false,
    por_area: false,
    estado: 'PENDIENTE',
    filas: [],
    rondas: [],
    alerta_otpp: null,
    monto_total: null,
    ...overrides,
  };
}

// Mock authStore (needed after we call useAuthStore inside the modal)
vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
    token: "t",
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  })),
}));

vi.mock("@/components/procesos/AdjuntosEtapa", () => ({
  AdjuntosEtapa: () => React.createElement("div", { "data-testid": "adjuntos-mock" }),
}));

describe("ModalRegistroEtapa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegistrar.mockReset();
    mockActualizar.mockReset();
  });

  // flujo-real-otin-v2: E01 removed. E01c is por_area → delegates to TablaAreasE24.
  // E01b has fecha_limite_respuesta campo.
  it("E01c modal delegates to TablaAreasE24 (por_area stage)", () => {
    const etapa = makeEtapa('E01c', { por_area: true });
    render(
      React.createElement(ModalRegistroEtapa, {
        procesoId: 1,
        etapa,
        open: true,
        onClose: vi.fn(),
        areasUsuarias: ['DTDIS'],
      }),
      { wrapper: Wrapper }
    );

    // E01c is por_area → delegates to TablaAreasE24
    expect(screen.getByTestId("tabla-areas-e24-mock")).toBeInTheDocument();
    // Should NOT render the standard form fields
    expect(screen.queryByLabelText(/Fecha Inicio/i)).not.toBeInTheDocument();
  });

  it("E01b modal shows common fields and fecha_limite_respuesta picker", () => {
    const etapa = makeEtapa('E01b');
    render(
      React.createElement(ModalRegistroEtapa, {
        procesoId: 1,
        etapa,
        open: true,
        onClose: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    // Common fields present
    expect(screen.getByLabelText(/Fecha Inicio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Estado/i)).toBeInTheDocument();
    // E01b has fecha_limite_respuesta campo shown in the modal (T18)
    expect(screen.getByLabelText(/Fecha limite de respuesta/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Monto Cert/i)).not.toBeInTheDocument();
  });

  it("E11 modal delegates to TablaAreasE11 (no generic form)", () => {
    const etapa = makeEtapa('E11', { por_area: true });
    render(
      React.createElement(ModalRegistroEtapa, {
        procesoId: 1,
        etapa,
        open: true,
        onClose: vi.fn(),
        areasUsuarias: ['DTDIS'],
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId("tabla-areas-e11-mock")).toBeInTheDocument();
    // Should NOT render the standard form fields
    expect(screen.queryByLabelText(/Fecha Inicio/i)).not.toBeInTheDocument();
  });

  it("E24 modal delegates to TablaAreasE24", () => {
    const etapa = makeEtapa('E24', { por_area: true });
    render(
      React.createElement(ModalRegistroEtapa, {
        procesoId: 1,
        etapa,
        open: true,
        onClose: vi.fn(),
        areasUsuarias: ['DTDIS'],
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId("tabla-areas-e24-mock")).toBeInTheDocument();
  });

  it("E05 modal shows motivo_bucle textarea (bucle stage)", () => {
    const etapa = makeEtapa('E05', { es_bucle: true });
    render(
      React.createElement(ModalRegistroEtapa, {
        procesoId: 1,
        etapa,
        open: true,
        onClose: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    // motivo_bucle textarea
    expect(screen.getByLabelText(/Motivo de la Ronda/i)).toBeInTheDocument();
    // nro_ronda should be display-only (not a form field)
    expect(screen.getByText(/Ronda 1 — asignado por el sistema/i)).toBeInTheDocument();
    // No monto or CMN fields
    expect(screen.queryByLabelText(/Monto Cert/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/CMN/i)).not.toBeInTheDocument();
  });

  it("E02 modal shows only common fields (no campos_extra)", () => {
    const etapa = makeEtapa('E02');
    render(
      React.createElement(ModalRegistroEtapa, {
        procesoId: 1,
        etapa,
        open: true,
        onClose: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    // Common fields present
    expect(screen.getByLabelText(/Fecha Inicio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Estado/i)).toBeInTheDocument();
    // No campos_extra for E02
    expect(screen.queryByLabelText(/CMN/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Monto Cert/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Motivo/i)).not.toBeInTheDocument();
  });

  it("E19 modal shows nro_ocs, monto_ocs and plazo_entrega fields", () => {
    const etapa = makeEtapa('E19');
    render(
      React.createElement(ModalRegistroEtapa, {
        procesoId: 1,
        etapa,
        open: true,
        onClose: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByLabelText(/N. OCS/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Monto OCS/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Plazo Entrega/i)).toBeInTheDocument();
  });

  it("E16 modal shows fecha_envio_otpp field", () => {
    const etapa = makeEtapa('E16');
    render(
      React.createElement(ModalRegistroEtapa, {
        procesoId: 1,
        etapa,
        open: true,
        onClose: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByLabelText(/Fecha Envio OTPP/i)).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    const etapa = makeEtapa('E02');
    const { container } = render(
      React.createElement(ModalRegistroEtapa, {
        procesoId: 1,
        etapa,
        open: false,
        onClose: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(container.firstChild).toBeNull();
  });

  // ---------------------------------------------------------------
  // BUG #2: bucle modal must PUT last ronda when rondas exist (no duplicates)
  // ---------------------------------------------------------------

  it("BUG-2: bucle modal with existing ronda calls actualizar (PUT) not registrar (POST)", () => {
    const rondaExistente: RondaBucle = {
      id: 42,
      nro_ronda: 1,
      motivo_bucle: 'Observaciones iniciales',
      estado_etapa: 'PENDIENTE',
      fecha_inicio: '2026-04-01',
      fecha_fin: null,
      dias: null,
    };
    const etapa = makeEtapa('E05', {
      es_bucle: true,
      rondas: [rondaExistente],
    });

    render(
      React.createElement(ModalRegistroEtapa, {
        procesoId: 1,
        etapa,
        open: true,
        onClose: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    // Fill required motivo_bucle field
    const motivoTextarea = screen.getByLabelText(/Motivo de la Ronda/i);
    fireEvent.change(motivoTextarea, { target: { value: 'Corrección enviada' } });

    // Fill fecha_inicio
    const fechaInput = screen.getByLabelText(/Fecha Inicio/i);
    fireEvent.change(fechaInput, { target: { value: '2026-04-05' } });

    fireEvent.click(screen.getByRole('button', { name: /Registrar avance/i }));

    // Must call actualizar (PUT), NOT registrar (POST)
    expect(mockActualizar).toHaveBeenCalledOnce();
    expect(mockRegistrar).not.toHaveBeenCalled();

    // Must target the existing ronda's id
    const [callArgs] = mockActualizar.mock.calls;
    expect(callArgs[0].etapaId).toBe(42);
  });

  it("BUG-2: bucle modal with NO existing rondas calls registrar (POST)", () => {
    const etapa = makeEtapa('E05', {
      es_bucle: true,
      rondas: [],
    });

    render(
      React.createElement(ModalRegistroEtapa, {
        procesoId: 1,
        etapa,
        open: true,
        onClose: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    const motivoTextarea = screen.getByLabelText(/Motivo de la Ronda/i);
    fireEvent.change(motivoTextarea, { target: { value: 'Primera observación' } });

    const fechaInput = screen.getByLabelText(/Fecha Inicio/i);
    fireEvent.change(fechaInput, { target: { value: '2026-04-01' } });

    fireEvent.click(screen.getByRole('button', { name: /Registrar avance/i }));

    // No rondas → POST (first creation)
    expect(mockRegistrar).toHaveBeenCalledOnce();
    expect(mockActualizar).not.toHaveBeenCalled();
  });

  it("BUG-2: bucle modal with existing ronda shows its nro_ronda (not +1)", () => {
    const rondaExistente: RondaBucle = {
      id: 7,
      nro_ronda: 3,
      motivo_bucle: 'Tercera vuelta',
      estado_etapa: 'PENDIENTE',
      fecha_inicio: '2026-04-15',
      fecha_fin: null,
      dias: null,
    };
    const etapa = makeEtapa('E06', {
      es_bucle: true,
      rondas: [
        { id: 5, nro_ronda: 1, motivo_bucle: 'R1', estado_etapa: 'COMPLETADO', fecha_inicio: '2026-04-01', fecha_fin: '2026-04-05', dias: 4 },
        { id: 6, nro_ronda: 2, motivo_bucle: 'R2', estado_etapa: 'COMPLETADO', fecha_inicio: '2026-04-06', fecha_fin: '2026-04-10', dias: 4 },
        rondaExistente,
      ],
    });

    render(
      React.createElement(ModalRegistroEtapa, {
        procesoId: 1,
        etapa,
        open: true,
        onClose: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    // Should show "Ronda 3" (existing), NOT "Ronda 4" (next new)
    expect(screen.getByText(/Ronda 3 — asignado por el sistema/i)).toBeInTheDocument();
  });
});
