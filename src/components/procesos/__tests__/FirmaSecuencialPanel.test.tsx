/**
 * T12a — FirmaSecuencialPanel tests.
 * flujo-real-otin-v2: V°B° secuencial para E02b y E06c.
 *
 * Note: No GET endpoint for firmas — panel receives firmas via props derived
 * from the proceso payload. PATCH endpoint available for state transitions.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FirmaSecuencialPanel } from "@/components/procesos/FirmaSecuencialPanel";
import type { FirmaSecuencial } from "@/types/etapa";
import { useAuthStore } from "@/stores/authStore";

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
    token: "t",
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  })),
}));

vi.mock("@/lib/api", () => ({
  api: {
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

function makeFirma(overrides: Partial<FirmaSecuencial> = {}): FirmaSecuencial {
  return {
    id: 1,
    proceso_id: 10,
    etapa_cod: "E02b",
    area: "DTDIS",
    orden: 1,
    estado: "PENDIENTE",
    ronda: 1,
    fecha_recibido: null,
    fecha_firmado: null,
    ...overrides,
  };
}

describe("FirmaSecuencialPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a list of firmas in orden sequence", () => {
    const firmas: FirmaSecuencial[] = [
      makeFirma({ id: 1, area: "DTDIS", orden: 1, estado: "FIRMADO" }),
      makeFirma({ id: 2, area: "OTIN", orden: 2, estado: "PENDIENTE" }),
    ];

    render(
      React.createElement(FirmaSecuencialPanel, {
        procesoId: 10,
        etapaCod: "E02b",
        firmas,
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByText("DTDIS")).toBeInTheDocument();
    expect(screen.getByText("OTIN")).toBeInTheDocument();
  });

  it("shows FIRMADO badge for signed area", () => {
    const firmas: FirmaSecuencial[] = [
      makeFirma({ id: 1, area: "DTDIS", orden: 1, estado: "FIRMADO" }),
    ];

    render(
      React.createElement(FirmaSecuencialPanel, {
        procesoId: 10,
        etapaCod: "E02b",
        firmas,
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByText("FIRMADO")).toBeInTheDocument();
  });

  it("shows 'Esperando firma anterior' for area with orden > 1 when prior is PENDIENTE", () => {
    const firmas: FirmaSecuencial[] = [
      makeFirma({ id: 1, area: "DTDIS", orden: 1, estado: "PENDIENTE" }),
      makeFirma({ id: 2, area: "OTIN", orden: 2, estado: "PENDIENTE" }),
    ];

    render(
      React.createElement(FirmaSecuencialPanel, {
        procesoId: 10,
        etapaCod: "E02b",
        firmas,
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByText(/Esperando firma anterior/i)).toBeInTheDocument();
  });

  it("shows COMPLETADO banner when all firmas are FIRMADO", () => {
    const firmas: FirmaSecuencial[] = [
      makeFirma({ id: 1, area: "DTDIS", orden: 1, estado: "FIRMADO" }),
      makeFirma({ id: 2, area: "OTIN", orden: 2, estado: "FIRMADO" }),
    ];

    render(
      React.createElement(FirmaSecuencialPanel, {
        procesoId: 10,
        etapaCod: "E02b",
        firmas,
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByText(/Todas las áreas firmaron/i)).toBeInTheDocument();
  });

  it("shows empty state when no firmas yet", () => {
    render(
      React.createElement(FirmaSecuencialPanel, {
        procesoId: 10,
        etapaCod: "E02b",
        firmas: [],
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByText(/Sin firmas registradas/i)).toBeInTheDocument();
  });

  it("VIEWER does not see action buttons", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 2, username: "viewer", nombre_completo: "Viewer", rol: "VIEWER", area: null },
      token: "t",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const firmas: FirmaSecuencial[] = [
      makeFirma({ id: 1, area: "DTDIS", orden: 1, estado: "PENDIENTE" }),
    ];

    render(
      React.createElement(FirmaSecuencialPanel, {
        procesoId: 10,
        etapaCod: "E02b",
        firmas,
      }),
      { wrapper: Wrapper }
    );

    expect(screen.queryByRole("button", { name: /Marcar firmado/i })).not.toBeInTheDocument();
  });
});
