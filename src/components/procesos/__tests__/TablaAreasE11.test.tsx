/**
 * C3a — TablaAreasE11 tests.
 * WU-12: Shows running total; 2 rows + footer sum.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TablaAreasE11 } from "@/components/procesos/TablaAreasE11";
import type { FilaArea } from "@/types/etapa";


const mockRegistrar = vi.fn();
const mockActualizar = vi.fn();

// Mock hooks
vi.mock("@/hooks/useEtapas", () => ({
  useRegistrarEtapa: vi.fn(() => ({
    mutate: mockRegistrar,
    isPending: false,
  })),
  useActualizarEtapa: vi.fn(() => ({
    mutate: mockActualizar,
    isPending: false,
  })),
  useReiniciarTdr: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 1, username: "admin", nombre_completo: "Admin", rol: "ADMIN", area: null },
    token: "t",
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  })),
}));

vi.mock("@/components/procesos/AdjuntosEtapa", () => ({
  AdjuntosEtapa: () => React.createElement("div", { "data-testid": "adjuntos-mock" }),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

const areasUsuarias = ['DTDIS', 'GOBERNANZA'];

const filas: FilaArea[] = [
  {
    id: 1,
    area_usuaria: 'DTDIS',
    estado_etapa: 'COMPLETADO',
    fecha_inicio: '2026-05-01',
    fecha_fin: null,
    dias: null,
    monto_cert: 80000,
  },
  {
    id: 2,
    area_usuaria: 'GOBERNANZA',
    estado_etapa: 'COMPLETADO',
    fecha_inicio: '2026-05-02',
    fecha_fin: null,
    dias: null,
    monto_cert: 70000,
  },
];

describe("TablaAreasE11", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegistrar.mockReset();
    mockActualizar.mockReset();
  });

  it("renders 2 rows for 2 areas", () => {
    render(
      React.createElement(TablaAreasE11, { procesoId: 1, filas, areasUsuarias }),
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId("e11-row-DTDIS")).toBeInTheDocument();
    expect(screen.getByTestId("e11-row-GOBERNANZA")).toBeInTheDocument();
  });

  it("shows running total of monto_cert across all rows", () => {
    render(
      React.createElement(TablaAreasE11, { procesoId: 1, filas, areasUsuarias }),
      { wrapper: Wrapper }
    );

    // Total = 80000 + 70000 = 150000
    const totalEl = screen.getByTestId("e11-total");
    expect(totalEl.textContent).toMatch(/150[,.]?000/);
  });

  it("renders Registrar button for area with no existing fila", () => {
    render(
      React.createElement(TablaAreasE11, {
        procesoId: 1,
        filas: [],
        areasUsuarias: ['DTDIS'],
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByRole('button', { name: /Registrar DTDIS/i })).toBeInTheDocument();
  });

  it("renders Editar button for area with existing fila", () => {
    render(
      React.createElement(TablaAreasE11, {
        procesoId: 1,
        filas: [filas[0]],
        areasUsuarias: ['DTDIS'],
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByRole('button', { name: /Editar DTDIS/i })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------
  // BUG #5: No aplica per row in E11
  // ---------------------------------------------------------------

  it("BUG-5: shows 'No aplica' button for PENDIENTE area (no existing fila)", () => {
    render(
      React.createElement(TablaAreasE11, {
        procesoId: 1,
        filas: [],
        areasUsuarias: ['DTDIS'],
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByRole('button', { name: /Marcar DTDIS como No aplica en E11/i })).toBeInTheDocument();
  });

  it("BUG-5: clicking 'No aplica' on area without fila calls registrar with NO_APLICA", () => {
    render(
      React.createElement(TablaAreasE11, {
        procesoId: 1,
        filas: [],
        areasUsuarias: ['DTDIS'],
      }),
      { wrapper: Wrapper }
    );

    fireEvent.click(screen.getByRole('button', { name: /Marcar DTDIS como No aplica en E11/i }));

    expect(mockRegistrar).toHaveBeenCalledOnce();
    const [callArgs] = mockRegistrar.mock.calls;
    expect(callArgs[0].estado_etapa).toBe('NO_APLICA');
    expect(callArgs[0].area_usuaria).toBe('DTDIS');
    expect(callArgs[0].codigo_etapa).toBe('E11');
  });

  it("BUG-5: clicking 'No aplica' on area with existing fila calls actualizar with NO_APLICA", () => {
    const filaExistente = filas[0]!; // DTDIS, id=1
    render(
      React.createElement(TablaAreasE11, {
        procesoId: 1,
        filas: [filaExistente],
        areasUsuarias: ['DTDIS'],
      }),
      { wrapper: Wrapper }
    );

    fireEvent.click(screen.getByRole('button', { name: /Marcar DTDIS como No aplica en E11/i }));

    expect(mockActualizar).toHaveBeenCalledOnce();
    const [callArgs] = mockActualizar.mock.calls;
    expect(callArgs[0].etapaId).toBe(1);
    expect(callArgs[0].payload.estado_etapa).toBe('NO_APLICA');
  });

  it("BUG-5: row with estado NO_APLICA shows 'No aplica' badge and Editar button (not 'No aplica' button)", () => {
    const filaNoAplica: FilaArea = {
      id: 3,
      area_usuaria: 'DTDIS',
      estado_etapa: 'NO_APLICA',
      fecha_inicio: '2026-05-10',
      fecha_fin: null,
      dias: null,
    };

    render(
      React.createElement(TablaAreasE11, {
        procesoId: 1,
        filas: [filaNoAplica],
        areasUsuarias: ['DTDIS'],
      }),
      { wrapper: Wrapper }
    );

    // Badge should say "No aplica"
    expect(screen.getByText('No aplica')).toBeInTheDocument();

    // "No aplica" action button must be hidden (stage already in NO_APLICA)
    expect(screen.queryByRole('button', { name: /Marcar DTDIS como No aplica en E11/i })).not.toBeInTheDocument();

    // "Editar" button must be present to allow reversing
    expect(screen.getByRole('button', { name: /Editar DTDIS en E11/i })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------
  // Bug #5: savingArea is per-row — guardar A no bloquea B
  // ---------------------------------------------------------------

  it("BUG-5: while saving area A, Guardar button for area B stays enabled", () => {
    // Override: mutate for registrar hangs (never calls onSuccess/onError).
    // This keeps savingArea === 'DTDIS' so we can assert GOBERNANZA is unaffected.
    mockRegistrar.mockImplementation(() => {
      // intentionally does nothing — simulates in-flight network request
    });

    render(
      React.createElement(TablaAreasE11, {
        procesoId: 1,
        filas: [],
        areasUsuarias: ['DTDIS', 'GOBERNANZA'],
      }),
      { wrapper: Wrapper }
    );

    // Open edit mode for DTDIS and fill required fields
    fireEvent.click(screen.getByRole('button', { name: /Registrar DTDIS/i }));
    fireEvent.change(screen.getByLabelText(/Monto certificado para DTDIS/i), { target: { value: '50000' } });
    fireEvent.change(screen.getByLabelText(/Fecha para DTDIS/i), { target: { value: '2026-05-10' } });

    // Trigger save for DTDIS — mutate hangs, so savingArea stays 'DTDIS'
    fireEvent.click(screen.getByRole('button', { name: /Guardar DTDIS/i }));

    // DTDIS Guardar must be disabled
    expect(screen.getByRole('button', { name: /Guardar DTDIS/i })).toBeDisabled();

    // Open edit mode for GOBERNANZA — its Guardar must be independent
    fireEvent.click(screen.getByRole('button', { name: /Registrar GOBERNANZA/i }));
    expect(screen.getByRole('button', { name: /Guardar GOBERNANZA/i })).not.toBeDisabled();
  });

  // ---------------------------------------------------------------
  // Bug #8: runningTotal from filas (confirmed), not rowState (local)
  // ---------------------------------------------------------------

  it("BUG-8: running total uses confirmed filas, not unconfirmed local input", () => {
    // Only DTDIS has a confirmed fila (monto_cert=80000). GOBERNANZA is PENDIENTE (no fila).
    render(
      React.createElement(TablaAreasE11, {
        procesoId: 1,
        filas: [filas[0]!],
        areasUsuarias: ['DTDIS', 'GOBERNANZA'],
      }),
      { wrapper: Wrapper }
    );

    // Initial total should be 80000 (only DTDIS confirmed)
    expect(screen.getByTestId('e11-total').textContent).toMatch(/80[,.]?000/);

    // User types a monto for GOBERNANZA without saving
    fireEvent.click(screen.getByRole('button', { name: /Registrar GOBERNANZA/i }));
    const montoInput = screen.getByLabelText(/Monto certificado para GOBERNANZA/i);
    fireEvent.change(montoInput, { target: { value: '99999' } });

    // Total must still be 80000 — local state does NOT affect the running total
    expect(screen.getByTestId('e11-total').textContent).toMatch(/80[,.]?000/);
    expect(screen.getByTestId('e11-total').textContent).not.toMatch(/179[,.]?999/);
  });
});
