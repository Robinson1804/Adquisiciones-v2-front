/**
 * T-17 — S4 (detalle proceso) render tests.
 * Verifies: ficha fields render, EtapasPanelPlaceholder is visible,
 * "próximamente" text present.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("@/hooks/useProcesos", () => ({
  useProceso: vi.fn(),
  useActualizarProceso: vi.fn(),
  useEliminarProceso: vi.fn(),
}));

// C3b: mock useMontosProceso so S4 tests don't need a real backend
vi.mock("@/hooks/useMontosProceso", () => ({
  useMontosProceso: vi.fn(() => ({ data: null, isLoading: false, isError: false })),
}));

// Mock LineaTiempo so S4 tests stay focused on the ficha panel
vi.mock("@/components/procesos/LineaTiempo", () => ({
  LineaTiempo: () =>
    React.createElement("div", { "data-testid": "linea-tiempo-mock" }, "Linea de Tiempo del Proceso"),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ id: "1" }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) =>
    React.createElement("a", { href, ...props }, children),
}));

import { useAuthStore } from "@/stores/authStore";
import { useProceso, useActualizarProceso, useEliminarProceso } from "@/hooks/useProcesos";
import DetalleProceso from "@/app/(dashboard)/procesos/[id]/page";
import type { Proceso } from "@/types";

const mockProceso: Proceso = {
  id: 1,
  id_proceso: "2026-001",
  requerimiento: "Switch de red Cisco para sala de servidores",
  tipo: "BIEN",
  unidad_resp: "OTIN",
  areas_usuarias: ["DTDIS", "GOBERNANZA"],
  pim: "25000.50",
  estado: "EN PROCESO",
  motivo_cancel: null,
  fecha_creacion: "2026-01-15T10:00:00",
  creado_por: "admin",
  anno: 2026,
};

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("S4 — DetalleProceso", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
      token: "t",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    vi.mocked(useActualizarProceso).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      data: undefined,
      isSuccess: false,
      isError: false,
      isIdle: true,
      reset: vi.fn(),
      status: "idle",
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      submittedAt: 0,
      mutateAsync: vi.fn(),
    } as ReturnType<typeof useActualizarProceso>);

    vi.mocked(useEliminarProceso).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      data: undefined,
      isSuccess: false,
      isError: false,
      isIdle: true,
      reset: vi.fn(),
      status: "idle",
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      submittedAt: 0,
      mutateAsync: vi.fn(),
    } as ReturnType<typeof useEliminarProceso>);
  });

  it("renders proceso ficha fields from useProceso data", () => {
    vi.mocked(useProceso).mockReturnValue({
      data: mockProceso,
      isLoading: false,
      isError: false,
      isSuccess: true,
      error: null,
    } as ReturnType<typeof useProceso>);

    render(React.createElement(DetalleProceso), { wrapper: Wrapper });

    // id_proceso appears in breadcrumb + h1 — use getAllByText
    expect(screen.getAllByText("2026-001").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Switch de red Cisco/i)).toBeInTheDocument();
    expect(screen.getByText("EN PROCESO")).toBeInTheDocument();
    // PIM formatted (S/ prefix + numeric portion)
    expect(screen.getByText(/S\/.*25/i)).toBeInTheDocument();
    // Areas
    expect(screen.getByText("DTDIS")).toBeInTheDocument();
    expect(screen.getByText("GOBERNANZA")).toBeInTheDocument();
  });

  it("renders LineaTiempo (right panel — C3a)", () => {
    vi.mocked(useProceso).mockReturnValue({
      data: mockProceso,
      isLoading: false,
      isError: false,
      isSuccess: true,
      error: null,
    } as ReturnType<typeof useProceso>);

    render(React.createElement(DetalleProceso), { wrapper: Wrapper });

    expect(
      screen.getByTestId("linea-tiempo-mock")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Linea de Tiempo del Proceso/i)
    ).toBeInTheDocument();
  });

  it("shows 404 state when proceso is not found", () => {
    vi.mocked(useProceso).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isSuccess: false,
      error: new Error("Not found"),
    } as ReturnType<typeof useProceso>);

    render(React.createElement(DetalleProceso), { wrapper: Wrapper });

    expect(screen.getByText(/Proceso no encontrado/i)).toBeInTheDocument();
    expect(screen.getByText(/← Volver a Procesos/i)).toBeInTheDocument();
  });

  it("shows loading state", () => {
    vi.mocked(useProceso).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      isSuccess: false,
      error: null,
    } as ReturnType<typeof useProceso>);

    render(React.createElement(DetalleProceso), { wrapper: Wrapper });

    expect(screen.getByText(/Cargando proceso/i)).toBeInTheDocument();
  });
});
