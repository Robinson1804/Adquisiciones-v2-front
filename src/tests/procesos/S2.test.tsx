/**
 * T-17 — S2 (lista de procesos) render + role-gating tests.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock hooks before importing the component
vi.mock("@/hooks/useProcesos", () => ({
  useProcesos: vi.fn(),
}));

vi.mock("@/hooks/useDashboard", () => ({
  useMetricas: vi.fn().mockReturnValue({
    data: null,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));

import { useProcesos } from "@/hooks/useProcesos";
import { useAuthStore } from "@/stores/authStore";
import ProcesosPage from "@/app/(dashboard)/procesos/page";
import type { PaginatedProcesos, Proceso } from "@/types";

const mockProceso: Proceso = {
  id: 1,
  id_proceso: "2026-001",
  requerimiento: "Switch de red para sala de servidores",
  tipo: "BIEN",
  unidad_resp: "OTIN",
  areas_usuarias: ["DTDIS"],
  pim: "15000.00",
  estado: "EN PROCESO",
  motivo_cancel: null,
  fecha_creacion: "2026-01-15T10:00:00",
  creado_por: "admin",
  anno: 2026,
};

const emptyPaginated: PaginatedProcesos = {
  items: [],
  total: 0,
  page: 1,
  page_size: 20,
  pages: 0,
};

const filledPaginated: PaginatedProcesos = {
  items: [mockProceso],
  total: 1,
  page: 1,
  page_size: 20,
  pages: 1,
};

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

function mockUseProcesos(data: PaginatedProcesos) {
  vi.mocked(useProcesos).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null,
  } as ReturnType<typeof useProcesos>);
}

describe("S2 — ProcesosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: EDITOR user
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: "OTIN" },
      token: "fake-token",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);
  });

  it("renders 5 metric cards", () => {
    mockUseProcesos(filledPaginated);

    render(React.createElement(ProcesosPage), { wrapper: Wrapper });

    expect(screen.getByText(/Total Procesos/i)).toBeInTheDocument();
    // "En Proceso" appears in card label and filter option — use getAllByText
    expect(screen.getAllByText(/En Proceso/i).length).toBeGreaterThanOrEqual(1);
    // "Culminados" card label + "culminados" sub-text in Días Promedio card — use getAllByText
    expect(screen.getAllByText(/Culminados/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Cancelados/i)).toBeInTheDocument();
    expect(screen.getByText(/PIM Total/i)).toBeInTheDocument();
  });

  it("EDITOR sees Nuevo Proceso button", () => {
    mockUseProcesos(emptyPaginated);

    render(React.createElement(ProcesosPage), { wrapper: Wrapper });

    expect(screen.getByText(/Nuevo Proceso/i)).toBeInTheDocument();
  });

  it("VIEWER does NOT see Nuevo Proceso button", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 2, username: "viewer", nombre_completo: "Viewer", rol: "VIEWER", area: null },
      token: "fake-token",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    mockUseProcesos(emptyPaginated);

    render(React.createElement(ProcesosPage), { wrapper: Wrapper });

    expect(screen.queryByText(/Nuevo Proceso/i)).not.toBeInTheDocument();
  });

  it("renders table rows for each proceso", () => {
    mockUseProcesos(filledPaginated);

    render(React.createElement(ProcesosPage), { wrapper: Wrapper });

    expect(screen.getByText("2026-001")).toBeInTheDocument();
    expect(screen.getByText(/Switch de red/i)).toBeInTheDocument();
  });
});
