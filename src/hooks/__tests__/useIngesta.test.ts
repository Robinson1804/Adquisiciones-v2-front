/**
 * T28 — Tests for useIngesta hooks (RED phase)
 * Covers: useIngesta, useCorregirIngesta, useAprobarIngesta, useRechazarIngesta,
 * useDesvincularIngesta, useDocumentosProceso
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock API module before importing hooks
vi.mock("@/lib/api", () => ({
  getIngestaPendientes: vi.fn(),
  patchIngesta: vi.fn(),
  aprobarIngesta: vi.fn(),
  rechazarIngesta: vi.fn(),
  desvincularIngesta: vi.fn(),
  getDocumentosProceso: vi.fn(),
  getIngestaAprobadosAuto: vi.fn(),
}));

import {
  useIngesta,
  useIngestaAprobadosAuto,
  useCorregirIngesta,
  useAprobarIngesta,
  useRechazarIngesta,
  useDesvincularIngesta,
  useDocumentosProceso,
} from "@/hooks/useIngesta";
import {
  getIngestaPendientes,
  getIngestaAprobadosAuto,
  patchIngesta,
  aprobarIngesta,
  rechazarIngesta,
  desvincularIngesta,
  getDocumentosProceso,
} from "@/lib/api";

import type { CorreoIngesta, DocumentoIngesta, IngestaPendientesResponse } from "@/types/ingesta";

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

const mockDocumento: DocumentoIngesta = {
  id: 10,
  ingesta_correo_id: 1,
  nombre_original: "TDR Servicio.pdf",
  nombre_almacenado: "abc123.pdf",
  ruta_relativa: "ingesta_staging/abc123.pdf",
  content_type: "application/pdf",
  tamano_bytes: 12345,
  tipo_clasificado: "TDR",
  confianza: 0.95,
  proceso_id: null,
  creado_en: "2026-06-01T10:00:00Z",
};

const mockCorreo: CorreoIngesta = {
  id: 1,
  entry_id: "ENTRY123",
  subject: "Oficio 267-2026-INEI/OTIN",
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
  documentos: [mockDocumento],
};

const mockPendientesResponse: IngestaPendientesResponse = {
  items: [mockCorreo],
  total: 1,
};

// ----------------------------------------------------------------
// Test wrapper
// ----------------------------------------------------------------

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

// ----------------------------------------------------------------
// useIngesta — fetches pendientes
// ----------------------------------------------------------------

describe("useIngesta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches pendientes from API", async () => {
    vi.mocked(getIngestaPendientes).mockResolvedValue(mockPendientesResponse);

    const { result } = renderHook(() => useIngesta(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getIngestaPendientes).toHaveBeenCalledOnce();
    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.items[0].estado_revision).toBe("PENDIENTE");
  });

  it("exposes isLoading while fetching", () => {
    vi.mocked(getIngestaPendientes).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useIngesta(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});

// ----------------------------------------------------------------
// useCorregirIngesta — PATCH mutation + invalidate
// ----------------------------------------------------------------

describe("useCorregirIngesta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls patchIngesta and returns updated correo on success", async () => {
    const updated = { ...mockCorreo, nombre_servicio: "Servicio corregido" };
    vi.mocked(patchIngesta).mockResolvedValue(updated);

    const { result } = renderHook(() => useCorregirIngesta(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        id: 1,
        payload: { nombre_servicio: "Servicio corregido" },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(patchIngesta).toHaveBeenCalledWith(1, { nombre_servicio: "Servicio corregido" });
  });
});

// ----------------------------------------------------------------
// useAprobarIngesta — POST /aprobar mutation + invalidate
// ----------------------------------------------------------------

describe("useAprobarIngesta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls aprobarIngesta with correo id and proceso_id", async () => {
    const approved = { ...mockCorreo, estado_revision: "APROBADO" as const };
    vi.mocked(aprobarIngesta).mockResolvedValue(approved);

    const { result } = renderHook(() => useAprobarIngesta(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 1, proceso_id: 42 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(aprobarIngesta).toHaveBeenCalledWith(1, { proceso_id: 42 });
  });
});

// ----------------------------------------------------------------
// useRechazarIngesta — POST /rechazar mutation + invalidate
// ----------------------------------------------------------------

describe("useRechazarIngesta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls rechazarIngesta with id and motivo", async () => {
    const rejected = { ...mockCorreo, estado_revision: "RECHAZADO" as const };
    vi.mocked(rechazarIngesta).mockResolvedValue(rejected);

    const { result } = renderHook(() => useRechazarIngesta(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 1, motivo: "No corresponde" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rechazarIngesta).toHaveBeenCalledWith(1, { motivo: "No corresponde" });
  });
});

// ----------------------------------------------------------------
// useDesvincularIngesta — POST /desvincular mutation + invalidate
// ----------------------------------------------------------------

describe("useDesvincularIngesta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls desvincularIngesta with correo id", async () => {
    const desvinculado = { ...mockCorreo, estado_revision: "PENDIENTE" as const };
    vi.mocked(desvincularIngesta).mockResolvedValue(desvinculado);

    const { result } = renderHook(() => useDesvincularIngesta(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      result.current.mutate(1);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(desvincularIngesta).toHaveBeenCalledWith(1);
  });
});

// ----------------------------------------------------------------
// useDocumentosProceso — fetches documentos of a proceso
// ----------------------------------------------------------------

describe("useDocumentosProceso", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches documentos for a proceso id", async () => {
    vi.mocked(getDocumentosProceso).mockResolvedValue([mockDocumento]);

    const { result } = renderHook(() => useDocumentosProceso(99), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getDocumentosProceso).toHaveBeenCalledWith(99);
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].tipo_clasificado).toBe("TDR");
  });

  it("is disabled when procesoId is 0 or negative", () => {
    const { result } = renderHook(() => useDocumentosProceso(0), {
      wrapper: makeWrapper(),
    });
    // Should not have fired
    expect(getDocumentosProceso).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });
});

// ----------------------------------------------------------------
// useIngestaAprobadosAuto — WARNING-1 FIX
// ----------------------------------------------------------------

describe("useIngestaAprobadosAuto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches APROBADO_AUTO items from API", async () => {
    const aprobadoAuto = {
      ...mockCorreo,
      id: 99,
      estado_revision: "APROBADO_AUTO" as const,
      revisado_por: "INGESTA_AUTO",
      match_confianza: 0.95,
      proceso_id: 42,
    };
    const response = { items: [aprobadoAuto], total: 1 };
    vi.mocked(getIngestaAprobadosAuto).mockResolvedValue(response);

    const { result } = renderHook(() => useIngestaAprobadosAuto(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getIngestaAprobadosAuto).toHaveBeenCalledOnce();
    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.items[0].estado_revision).toBe("APROBADO_AUTO");
  });

  it("exposes isLoading while fetching", () => {
    vi.mocked(getIngestaAprobadosAuto).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useIngestaAprobadosAuto(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});
