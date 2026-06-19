/**
 * RondasList tests — Cambio 4: titulo_ronda field + display.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RondasList } from "@/components/procesos/RondasList";
import type { RondaBucle } from "@/types/etapa";

const mockAgregarRondaMutate = vi.fn();

vi.mock("@/hooks/useEtapas", () => ({
  useAgregarRonda: vi.fn(() => ({
    mutate: mockAgregarRondaMutate,
    isPending: false,
  })),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

const baseRonda: RondaBucle = {
  id: 1,
  nro_ronda: 1,
  motivo_bucle: "Falta especificación técnica",
  titulo_ronda: null,
  estado_etapa: "COMPLETADO",
  fecha_inicio: "2026-04-01",
  fecha_fin: "2026-04-10",
  dias: 9,
};

describe("RondasList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------
  // Cambio 4 — titulo_ronda display
  // ---------------------------------------------------------------

  it("Cambio-4: shows 'Ronda 1' without title when titulo_ronda is null", () => {
    render(
      React.createElement(RondasList, {
        rondas: [{ ...baseRonda, titulo_ronda: null }],
        procesoId: 1,
        cod: "E05",
        canAddRonda: false,
        blockedReason: null,
      }),
      { wrapper: Wrapper }
    );

    // Expand to see rondas
    fireEvent.click(screen.getByRole("button", { name: /Ver 1 ronda/i }));

    expect(screen.getByText("Ronda 1")).toBeInTheDocument();
    expect(screen.queryByText(/Ronda 1 —/)).not.toBeInTheDocument();
  });

  it("Cambio-4: shows 'Ronda 1 — {titulo}' when titulo_ronda is set", () => {
    render(
      React.createElement(RondasList, {
        rondas: [{ ...baseRonda, titulo_ronda: "Faltó costo total de licenciamiento" }],
        procesoId: 1,
        cod: "E05",
        canAddRonda: false,
        blockedReason: null,
      }),
      { wrapper: Wrapper }
    );

    fireEvent.click(screen.getByRole("button", { name: /Ver 1 ronda/i }));

    expect(screen.getByText("Ronda 1 — Faltó costo total de licenciamiento")).toBeInTheDocument();
  });

  it("Cambio-4: add-ronda form includes 'Título de la ronda' input", () => {
    render(
      React.createElement(RondasList, {
        rondas: [],
        procesoId: 1,
        cod: "E06",
        canAddRonda: true,
        blockedReason: null,
      }),
      { wrapper: Wrapper }
    );

    fireEvent.click(screen.getByRole("button", { name: /Agregar ronda/i }));

    expect(screen.getByLabelText(/Título de la ronda/i)).toBeInTheDocument();
  });

  it("Cambio-4: titulo_ronda input has maxLength 200 and is optional", () => {
    render(
      React.createElement(RondasList, {
        rondas: [],
        procesoId: 1,
        cod: "E06b",
        canAddRonda: true,
        blockedReason: null,
      }),
      { wrapper: Wrapper }
    );

    fireEvent.click(screen.getByRole("button", { name: /Agregar ronda/i }));

    const input = screen.getByLabelText(/Título de la ronda/i);
    expect(input).toHaveAttribute("maxlength", "200");
    expect(input).not.toHaveAttribute("required");
  });

  it("Cambio-4: titulo_ronda sends null when left empty", () => {
    mockAgregarRondaMutate.mockClear();

    render(
      React.createElement(RondasList, {
        rondas: [],
        procesoId: 1,
        cod: "E08a",
        canAddRonda: true,
        blockedReason: null,
      }),
      { wrapper: Wrapper }
    );

    fireEvent.click(screen.getByRole("button", { name: /Agregar ronda/i }));

    const motivoInput = screen.getByLabelText(/Motivo de la ronda/i);
    fireEvent.change(motivoInput, { target: { value: "Observación de prueba" } });

    // Leave titulo_ronda empty
    fireEvent.click(screen.getByRole("button", { name: /Guardar ronda/i }));

    expect(mockAgregarRondaMutate).toHaveBeenCalledOnce();
    const [callArg] = mockAgregarRondaMutate.mock.calls[0] as [{ cod: string; payload: { motivo_bucle: string; titulo_ronda?: string | null } }];
    expect(callArg.payload.titulo_ronda).toBeNull();
  });

  it("Cambio-4: titulo_ronda sends the entered value when filled", () => {
    mockAgregarRondaMutate.mockClear();

    render(
      React.createElement(RondasList, {
        rondas: [],
        procesoId: 1,
        cod: "E08b",
        canAddRonda: true,
        blockedReason: null,
      }),
      { wrapper: Wrapper }
    );

    fireEvent.click(screen.getByRole("button", { name: /Agregar ronda/i }));

    fireEvent.change(screen.getByLabelText(/Motivo de la ronda/i), {
      target: { value: "Subsanación pendiente" },
    });
    fireEvent.change(screen.getByLabelText(/Título de la ronda/i), {
      target: { value: "Falta firma del gerente" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Guardar ronda/i }));

    expect(mockAgregarRondaMutate).toHaveBeenCalledOnce();
    const [callArg] = mockAgregarRondaMutate.mock.calls[0] as [{ cod: string; payload: { titulo_ronda?: string | null } }];
    expect(callArg.payload.titulo_ronda).toBe("Falta firma del gerente");
  });
});
