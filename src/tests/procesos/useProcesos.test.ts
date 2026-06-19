/**
 * T-17 — useProcesos hook tests.
 * Mocks api.getProcesos to verify the hook surfaces items and pagination.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useProcesos } from "@/hooks/useProcesos";
import type { PaginatedProcesos, Proceso } from "@/types";

// Mock the entire api module
vi.mock("@/lib/api", () => ({
  getProcesos: vi.fn(),
  getProceso: vi.fn(),
  createProceso: vi.fn(),
  updateProceso: vi.fn(),
  deleteProceso: vi.fn(),
}));

import { getProcesos } from "@/lib/api";

const mockProceso: Proceso = {
  id: 1,
  id_proceso: "2026-001",
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

const mockPaginatedResponse: PaginatedProcesos = {
  items: [mockProceso],
  total: 1,
  page: 1,
  page_size: 20,
  pages: 1,
};

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe("useProcesos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns items from api.getProcesos", async () => {
    vi.mocked(getProcesos).mockResolvedValueOnce(mockPaginatedResponse);

    const { result } = renderHook(() => useProcesos(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.items[0].id_proceso).toBe("2026-001");
  });

  it("exposes total and pagination fields", async () => {
    vi.mocked(getProcesos).mockResolvedValueOnce(mockPaginatedResponse);

    const { result } = renderHook(() => useProcesos({ page: 1, page_size: 20 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.total).toBe(1);
    expect(result.current.data?.page).toBe(1);
    expect(result.current.data?.pages).toBe(1);
  });

  it("calls getProcesos with provided filtros", async () => {
    vi.mocked(getProcesos).mockResolvedValueOnce(mockPaginatedResponse);

    const { result } = renderHook(
      () => useProcesos({ anno: 2026, estado: "EN PROCESO" }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getProcesos).toHaveBeenCalledWith({ anno: 2026, estado: "EN PROCESO" });
  });

  it("is in error state when api throws", async () => {
    vi.mocked(getProcesos).mockRejectedValueOnce(new Error("Network Error"));

    const { result } = renderHook(() => useProcesos(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
