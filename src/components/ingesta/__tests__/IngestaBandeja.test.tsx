/**
 * WARNING-1 FIX — IngestaBandeja tests
 * Cubre:
 *  - Sección "Pendientes" lista correos PENDIENTE
 *  - Sección "Auto-vinculados" lista correos APROBADO_AUTO con botón Desvincular
 *  - VIEWER no ve botón Desvincular en la sección de auto-vinculados
 *  - Estado loading / error / vacío
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock auth store
vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

// Mock hooks de ingesta
vi.mock("@/hooks/useIngesta", () => ({
  useIngesta: vi.fn(),
  useIngestaAprobadosAuto: vi.fn(),
  useAprobarIngesta: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useRechazarIngesta: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDesvincularIngesta: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useCorregirIngesta: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

import { useAuthStore } from "@/stores/authStore";
import { useIngesta, useIngestaAprobadosAuto } from "@/hooks/useIngesta";
import { IngestaBandeja } from "@/components/ingesta/IngestaBandeja";
import type { CorreoIngesta, IngestaPendientesResponse } from "@/types/ingesta";

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

const mockCorreoPendiente: CorreoIngesta = {
  id: 1,
  entry_id: "ENTRY001",
  subject: "Correo pendiente de revisión",
  sender_name: "Juan Perez",
  sender_email: "jperez@inei.gob.pe",
  received_at: "2026-06-01T09:00:00Z",
  nombre_servicio: "Servicio de mantenimiento",
  nombre_servicio_normalizado: "servicio de mantenimiento",
  numero_oficio_raw: "N°267-2026-INEI/OTIN",
  numero_oficio: "267-2026-INEI/OTIN",
  oss: [],
  siaf: null,
  proveedor: null,
  tipo: "SERVICIO",
  fecha_documento: "2026-05-30",
  fecha_recepcion: "2026-06-01",
  estado_revision: "PENDIENTE",
  match_confianza: null,
  proceso_id: null,
  motivo_rechazo: null,
  revisado_por: null,
  revisado_en: null,
  creado_en: "2026-06-01T10:00:00Z",
  documentos: [],
};

const mockCorreoAprobadoAuto: CorreoIngesta = {
  ...mockCorreoPendiente,
  id: 2,
  entry_id: "ENTRY002",
  subject: "Correo auto-vinculado",
  estado_revision: "APROBADO_AUTO",
  revisado_por: "INGESTA_AUTO",
  match_confianza: 0.95,
  proceso_id: 42,
};

const mockPendientesResponse: IngestaPendientesResponse = {
  items: [mockCorreoPendiente],
  total: 1,
};

const mockAprobadosAutoResponse: IngestaPendientesResponse = {
  items: [mockCorreoAprobadoAuto],
  total: 1,
};

const mockEmptyResponse: IngestaPendientesResponse = { items: [], total: 0 };

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

function mockEditor() {
  vi.mocked(useAuthStore).mockReturnValue({
    user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
    token: "tok",
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuthStore>);
}

function mockViewer() {
  vi.mocked(useAuthStore).mockReturnValue({
    user: { id: 2, username: "viewer", nombre_completo: "Viewer", rol: "VIEWER", area: null },
    token: "tok",
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuthStore>);
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe("IngestaBandeja — sección Pendientes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEditor();
  });

  it("muestra correos PENDIENTE en la sección correspondiente", async () => {
    vi.mocked(useIngesta).mockReturnValue({
      data: mockPendientesResponse,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useIngesta>);
    vi.mocked(useIngestaAprobadosAuto).mockReturnValue({
      data: mockEmptyResponse,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useIngestaAprobadosAuto>);

    render(<IngestaBandeja />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/correo pendiente de revisión/i)).toBeInTheDocument();
    });
  });

  it("muestra encabezado de sección Pendientes", async () => {
    vi.mocked(useIngesta).mockReturnValue({
      data: mockPendientesResponse,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useIngesta>);
    vi.mocked(useIngestaAprobadosAuto).mockReturnValue({
      data: mockEmptyResponse,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useIngestaAprobadosAuto>);

    render(<IngestaBandeja />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("seccion-pendientes")).toBeInTheDocument();
    });
  });

  it("muestra estado vacío cuando no hay pendientes ni auto-vinculados", async () => {
    vi.mocked(useIngesta).mockReturnValue({
      data: mockEmptyResponse,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useIngesta>);
    vi.mocked(useIngestaAprobadosAuto).mockReturnValue({
      data: mockEmptyResponse,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useIngestaAprobadosAuto>);

    render(<IngestaBandeja />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/no hay correos pendientes/i)).toBeInTheDocument();
    });
  });
});

describe("IngestaBandeja — sección Auto-vinculados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEditor();
  });

  it("muestra correos APROBADO_AUTO en la sección Auto-vinculados", async () => {
    vi.mocked(useIngesta).mockReturnValue({
      data: mockEmptyResponse,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useIngesta>);
    vi.mocked(useIngestaAprobadosAuto).mockReturnValue({
      data: mockAprobadosAutoResponse,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useIngestaAprobadosAuto>);

    render(<IngestaBandeja />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("seccion-aprobados-auto")).toBeInTheDocument();
      expect(screen.getByText(/correo auto-vinculado/i)).toBeInTheDocument();
    });
  });

  it("muestra botón Desvincular para EDITOR en correos APROBADO_AUTO", async () => {
    vi.mocked(useIngesta).mockReturnValue({
      data: mockEmptyResponse,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useIngesta>);
    vi.mocked(useIngestaAprobadosAuto).mockReturnValue({
      data: mockAprobadosAutoResponse,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useIngestaAprobadosAuto>);

    render(<IngestaBandeja />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /desvincular/i })).toBeInTheDocument();
    });
  });

  it("VIEWER no ve botón Desvincular en la sección Auto-vinculados", async () => {
    mockViewer();
    vi.mocked(useIngesta).mockReturnValue({
      data: mockEmptyResponse,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useIngesta>);
    vi.mocked(useIngestaAprobadosAuto).mockReturnValue({
      data: mockAprobadosAutoResponse,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useIngestaAprobadosAuto>);

    render(<IngestaBandeja />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/correo auto-vinculado/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /desvincular/i })).not.toBeInTheDocument();
  });
});

describe("IngestaBandeja — estados loading / error", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEditor();
  });

  it("muestra indicador de carga mientras fetchea", () => {
    vi.mocked(useIngesta).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useIngesta>);
    vi.mocked(useIngestaAprobadosAuto).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useIngestaAprobadosAuto>);

    render(<IngestaBandeja />, { wrapper: makeWrapper() });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("muestra mensaje de error si falla el fetch", () => {
    vi.mocked(useIngesta).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as ReturnType<typeof useIngesta>);
    vi.mocked(useIngestaAprobadosAuto).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useIngestaAprobadosAuto>);

    render(<IngestaBandeja />, { wrapper: makeWrapper() });
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
