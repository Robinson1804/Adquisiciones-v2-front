/**
 * S4-eliminar — Tests del botón "Eliminar proceso" y su modal de confirmación.
 * Cubre:
 *   (a) botón visible para ADMIN/EDITOR, oculto para VIEWER
 *   (b) click abre el modal de confirmación
 *   (c) "Cancelar" cierra el modal sin llamar a la mutación
 *   (d) "Eliminar" llama a la mutación con el id correcto
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
  useExportProcesoPdf: vi.fn(() => ({
    trigger: vi.fn(),
    isLoading: false,
    error: null,
  })),
}));

vi.mock("@/components/procesos/LineaTiempo", () => ({
  LineaTiempo: () =>
    React.createElement("div", { "data-testid": "linea-tiempo-mock" }, "Linea de Tiempo"),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ id: "42" }),
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

const mockProceso: Proceso = {
  id: 42,
  id_proceso: "2026-042",
  requerimiento: "Laptops para DTDIS",
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

const baseMutationResult = {
  isPending: false,
  error: null,
  data: undefined,
  isSuccess: false,
  isError: false,
  isIdle: true,
  reset: vi.fn(),
  status: "idle" as const,
  variables: undefined,
  context: undefined,
  failureCount: 0,
  failureReason: null,
  isPaused: false,
  submittedAt: 0,
  mutateAsync: vi.fn(),
};

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

function setupMocks({
  rol = "EDITOR" as "ADMIN" | "EDITOR" | "VIEWER",
  mutateEliminar = vi.fn(),
}: {
  rol?: "ADMIN" | "EDITOR" | "VIEWER";
  mutateEliminar?: ReturnType<typeof vi.fn>;
} = {}) {
  vi.mocked(useAuthStore).mockReturnValue({
    user: { id: 1, username: "u", nombre_completo: "U", rol, area: null },
    token: "t",
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuthStore>);

  vi.mocked(useProceso).mockReturnValue({
    data: mockProceso,
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null,
  } as ReturnType<typeof useProceso>);

  vi.mocked(useActualizarProceso).mockReturnValue({
    mutate: vi.fn(),
    ...baseMutationResult,
  } as ReturnType<typeof useActualizarProceso>);

  vi.mocked(useEliminarProceso).mockReturnValue({
    mutate: mutateEliminar,
    ...baseMutationResult,
  } as ReturnType<typeof useEliminarProceso>);
}

describe("S4 — Eliminar proceso", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // (a) Visibilidad del botón por rol
  it("muestra el botón 'Eliminar proceso' para rol ADMIN", () => {
    setupMocks({ rol: "ADMIN" });
    render(React.createElement(DetalleProceso), { wrapper: Wrapper });
    expect(screen.getByTestId("btn-eliminar-proceso")).toBeInTheDocument();
  });

  it("muestra el botón 'Eliminar proceso' para rol EDITOR", () => {
    setupMocks({ rol: "EDITOR" });
    render(React.createElement(DetalleProceso), { wrapper: Wrapper });
    expect(screen.getByTestId("btn-eliminar-proceso")).toBeInTheDocument();
  });

  it("NO muestra el botón 'Eliminar proceso' para rol VIEWER", () => {
    setupMocks({ rol: "VIEWER" });
    render(React.createElement(DetalleProceso), { wrapper: Wrapper });
    expect(screen.queryByTestId("btn-eliminar-proceso")).not.toBeInTheDocument();
  });

  // (b) Click abre el modal de confirmación
  it("click en 'Eliminar proceso' abre el modal de confirmación", () => {
    setupMocks();
    render(React.createElement(DetalleProceso), { wrapper: Wrapper });

    expect(screen.queryByTestId("modal-eliminar-proceso")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("btn-eliminar-proceso"));

    const modal = screen.getByTestId("modal-eliminar-proceso");
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveAttribute("role", "dialog");
    expect(modal).toHaveAttribute("aria-modal", "true");
    // El id_proceso aparece dentro del modal (como span.font-mono.font-semibold)
    // Puede haber múltiples elementos con ese texto en la página — usamos getAllByText
    const matches = screen.getAllByText(/2026-042/);
    // Al menos 3: breadcrumb, h1, y el span dentro del modal
    expect(matches.length).toBeGreaterThanOrEqual(3);
    // El heading del modal debe estar visible (h2 con id modal-eliminar-titulo)
    expect(
      screen.getByRole("heading", { name: /Eliminar proceso/i, level: 2 })
    ).toBeInTheDocument();
  });

  // (c) "Cancelar" cierra el modal sin llamar a la mutación
  it("'Cancelar' cierra el modal sin llamar a la mutación", () => {
    const mutateEliminar = vi.fn();
    setupMocks({ mutateEliminar });
    render(React.createElement(DetalleProceso), { wrapper: Wrapper });

    fireEvent.click(screen.getByTestId("btn-eliminar-proceso"));
    expect(screen.getByTestId("modal-eliminar-proceso")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("btn-cancelar-eliminar"));

    expect(screen.queryByTestId("modal-eliminar-proceso")).not.toBeInTheDocument();
    expect(mutateEliminar).not.toHaveBeenCalled();
  });

  // (d) "Eliminar" llama a la mutación con el id correcto
  it("'Eliminar' llama a la mutación con el id del proceso", () => {
    const mutateEliminar = vi.fn();
    setupMocks({ mutateEliminar });
    render(React.createElement(DetalleProceso), { wrapper: Wrapper });

    fireEvent.click(screen.getByTestId("btn-eliminar-proceso"));
    fireEvent.click(screen.getByTestId("btn-confirmar-eliminar"));

    expect(mutateEliminar).toHaveBeenCalledTimes(1);
    expect(mutateEliminar).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );
  });
});
