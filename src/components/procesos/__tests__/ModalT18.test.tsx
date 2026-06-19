/**
 * T18 — ModalRegistroEtapa fecha_limite_respuesta picker.
 * flujo-real-otin-v2: E01b and E10 show a date picker for fecha_limite_respuesta.
 * When set, the value is included in the payload.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModalRegistroEtapa } from "@/components/procesos/ModalRegistroEtapa";
import type { EtapaAgrupada } from "@/types/etapa";

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

vi.mock("@/components/procesos/TablaAreasE11", () => ({
  TablaAreasE11: () =>
    React.createElement("div", { "data-testid": "tabla-areas-e11-mock" }, "TablaAreasE11"),
}));

vi.mock("@/components/procesos/TablaAreasE24", () => ({
  TablaAreasE24: () =>
    React.createElement("div", { "data-testid": "tabla-areas-e24-mock" }, "TablaAreasE24"),
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

vi.mock("@/components/procesos/AdjuntosEtapa", () => ({
  AdjuntosEtapa: () => React.createElement("div", { "data-testid": "adjuntos-mock" }),
}));

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

describe("T18 — ModalRegistroEtapa fecha_limite_respuesta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegistrar.mockReset();
    mockActualizar.mockReset();
  });

  it("E01b modal shows fecha_limite_respuesta date picker", () => {
    const etapa = makeEtapa("E01b");
    render(
      React.createElement(ModalRegistroEtapa, {
        procesoId: 1,
        etapa,
        open: true,
        onClose: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByLabelText(/Fecha limite de respuesta/i)).toBeInTheDocument();
  });

  it("E01b payload includes fecha_limite_respuesta when set", () => {
    const etapa = makeEtapa("E01b");
    render(
      React.createElement(ModalRegistroEtapa, {
        procesoId: 1,
        etapa,
        open: true,
        onClose: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    // Fill required fecha_inicio
    fireEvent.change(screen.getByLabelText(/Fecha Inicio/i), {
      target: { value: "2026-05-01" },
    });

    // Set fecha_limite_respuesta
    fireEvent.change(screen.getByLabelText(/Fecha limite de respuesta/i), {
      target: { value: "2026-05-15" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Registrar avance/i }));

    expect(mockRegistrar).toHaveBeenCalledOnce();
    const [payload] = mockRegistrar.mock.calls[0] as [{ fecha_limite_respuesta?: string }];
    expect(payload.fecha_limite_respuesta).toBe("2026-05-15");
  });

  it("E01b payload does NOT include fecha_limite_respuesta when not set", () => {
    const etapa = makeEtapa("E01b");
    render(
      React.createElement(ModalRegistroEtapa, {
        procesoId: 1,
        etapa,
        open: true,
        onClose: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    fireEvent.change(screen.getByLabelText(/Fecha Inicio/i), {
      target: { value: "2026-05-01" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Registrar avance/i }));

    expect(mockRegistrar).toHaveBeenCalledOnce();
    const [payload] = mockRegistrar.mock.calls[0] as [{ fecha_limite_respuesta?: string }];
    expect(payload.fecha_limite_respuesta).toBeUndefined();
  });

  it("E02 modal does NOT show fecha_limite_respuesta picker", () => {
    const etapa = makeEtapa("E02");
    render(
      React.createElement(ModalRegistroEtapa, {
        procesoId: 1,
        etapa,
        open: true,
        onClose: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.queryByLabelText(/Fecha limite de respuesta/i)).not.toBeInTheDocument();
  });
});
