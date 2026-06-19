/**
 * T13 — DetalleProceso new ficha fields.
 * flujo-real-otin-v2:
 * - Remove "Unidad solicitante" row
 * - Add "Área iniciadora" row
 * - Add "CMN del proceso" section (denominacion_cmn + clasificador_cmn, only when present)
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

vi.mock("@/hooks/useMontosProceso", () => ({
  useMontosProceso: vi.fn(() => ({ data: null, isLoading: false, isError: false })),
}));

vi.mock("@/hooks/useExport", () => ({
  useExportProcesoPdf: vi.fn(() => ({ trigger: vi.fn(), isLoading: false, error: null })),
}));

vi.mock("@/components/procesos/LineaTiempo", () => ({
  LineaTiempo: () =>
    React.createElement("div", { "data-testid": "linea-tiempo-mock" }, "Linea de Tiempo"),
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
  }) => React.createElement("a", { href, ...props }, children),
}));

import { useAuthStore } from "@/stores/authStore";
import { useProceso, useActualizarProceso, useEliminarProceso } from "@/hooks/useProcesos";
import DetalleProceso from "@/app/(dashboard)/procesos/[id]/page";
import type { Proceso } from "@/types";

const baseProceso: Proceso = {
  id: 1,
  id_proceso: "2026-001",
  requerimiento: "Switch de red Cisco",
  tipo: "BIEN",
  unidad_resp: "OTIN",
  areas_usuarias: ["DTDIS"],
  pim: "25000.00",
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

function setupMocks(proceso: Proceso) {
  vi.mocked(useAuthStore).mockReturnValue({
    user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
    token: "t",
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuthStore>);

  vi.mocked(useProceso).mockReturnValue({
    data: proceso,
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null,
  } as ReturnType<typeof useProceso>);

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
}

describe("T13 — DetalleProceso flujo-real-otin-v2 ficha fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does NOT render Unidad Solicitante label in ficha", () => {
    setupMocks(baseProceso);
    render(React.createElement(DetalleProceso), { wrapper: Wrapper });
    expect(screen.queryByText(/Unidad Solicitante/i)).not.toBeInTheDocument();
  });

  it("renders Área iniciadora row when area_iniciadora is set", () => {
    setupMocks({ ...baseProceso, area_iniciadora: "GOBERNANZA" });
    render(React.createElement(DetalleProceso), { wrapper: Wrapper });
    expect(screen.getByText(/Área iniciadora/i)).toBeInTheDocument();
    // GOBERNANZA only appears in area_iniciadora row, not in areas_usuarias
    expect(screen.getByText("GOBERNANZA")).toBeInTheDocument();
  });

  it("renders '—' for Área iniciadora when not set", () => {
    setupMocks({ ...baseProceso, area_iniciadora: null });
    render(React.createElement(DetalleProceso), { wrapper: Wrapper });
    expect(screen.getByText(/Área iniciadora/i)).toBeInTheDocument();
  });

  it("renders CMN section with denominacion_cmn when present", () => {
    setupMocks({
      ...baseProceso,
      denominacion_cmn: "SUSCRIPCION ANUAL A LICENCIA DE SOFTWARE",
      clasificador_cmn: "2.3.2.5.1.99",
    });
    render(React.createElement(DetalleProceso), { wrapper: Wrapper });
    expect(screen.getByText(/Denominación CMN/i)).toBeInTheDocument();
    expect(screen.getByText("SUSCRIPCION ANUAL A LICENCIA DE SOFTWARE")).toBeInTheDocument();
  });

  it("renders CMN clasificador_cmn when present", () => {
    setupMocks({
      ...baseProceso,
      denominacion_cmn: "SERVICIO DE NUBE",
      clasificador_cmn: "2.3.2.7.1.1",
    });
    render(React.createElement(DetalleProceso), { wrapper: Wrapper });
    expect(screen.getByText(/Clasificador de gasto/i)).toBeInTheDocument();
    expect(screen.getByText("2.3.2.7.1.1")).toBeInTheDocument();
  });

  it("does NOT render CMN section when denominacion_cmn and clasificador_cmn are absent", () => {
    setupMocks({ ...baseProceso, denominacion_cmn: null, clasificador_cmn: null });
    render(React.createElement(DetalleProceso), { wrapper: Wrapper });
    expect(screen.queryByText(/Denominación CMN/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Clasificador de gasto/i)).not.toBeInTheDocument();
  });
});
