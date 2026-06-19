/**
 * C3c — AdjuntosEtapa tests.
 *
 * Verifies:
 * - Hint shown when etapaId === 0 (no registration row yet)
 * - File input visible only for canEdit=true (EDITOR/ADMIN)
 * - List renders attachments with download button always, delete only canEdit
 * - Upload triggers api.subirArchivo via mutation mock
 * - Delete calls api.eliminarArchivo via mutation mock
 * - Error detail from 422 is surfaced
 * - CODIGOS_CON_ADJUNTOS drives gating (catalog sync)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdjuntosEtapa } from "@/components/procesos/AdjuntosEtapa";
import { CODIGOS_CON_ADJUNTOS } from "@/lib/constants";
import type { ArchivoMeta } from "@/types/etapa";

// ----------------------------------------------------------------
// Module-level mock refs (used in beforeEach to reconfigure)
// ----------------------------------------------------------------

const mockSubirMutate = vi.fn();
const mockEliminarMutate = vi.fn();
const mockDescargar = vi.fn();

// Default return values — overridden per describe block
let mockArchivosData: ArchivoMeta[] = [];
let mockSubirIsError = false;
let mockSubirError: unknown = null;

vi.mock("@/hooks/useArchivos", () => ({
  useArchivos: vi.fn(() => ({
    data: mockArchivosData,
    isLoading: false,
    isError: false,
  })),
  useSubirArchivo: vi.fn(() => ({
    mutate: mockSubirMutate,
    isPending: false,
    isError: mockSubirIsError,
    error: mockSubirError,
  })),
  useDescargarArchivo: vi.fn(() => mockDescargar),
  useEliminarArchivo: vi.fn(() => ({
    mutate: mockEliminarMutate,
    isPending: false,
    isError: false,
    error: null,
  })),
  extractApiDetail: vi.fn((err: unknown): string | undefined => {
    if (
      err != null &&
      typeof err === "object" &&
      "response" in err &&
      (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
    ) {
      return (err as { response: { data: { detail: string } } }).response.data
        .detail;
    }
    return undefined;
  }),
}));

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

function makeArchivo(overrides: Partial<ArchivoMeta> = {}): ArchivoMeta {
  return {
    id: 1,
    etapa_id: 10,
    nombre_original: "informe.pdf",
    content_type: "application/pdf",
    tamano_bytes: 204800,
    subido_por: "editor1",
    subido_en: "2026-05-25T12:00:00Z",
    ...overrides,
  };
}

// ----------------------------------------------------------------
// Hint when no registration row
// ----------------------------------------------------------------

describe("AdjuntosEtapa — hint when no registration row", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockArchivosData = [];
    mockSubirIsError = false;
    mockSubirError = null;
  });

  it("shows hint text when etapaId is 0", () => {
    render(
      React.createElement(AdjuntosEtapa, { etapaId: 0, canEdit: true }),
      { wrapper: Wrapper }
    );
    expect(screen.getByTestId("adjuntos-hint-sin-registro")).toBeInTheDocument();
    expect(screen.getByText(/Registrá el avance primero/i)).toBeInTheDocument();
  });

  it("does NOT show file input when etapaId is 0", () => {
    render(
      React.createElement(AdjuntosEtapa, { etapaId: 0, canEdit: true }),
      { wrapper: Wrapper }
    );
    expect(screen.queryByTestId("file-input")).not.toBeInTheDocument();
  });
});

// ----------------------------------------------------------------
// File input visibility by role
// ----------------------------------------------------------------

describe("AdjuntosEtapa — file input visibility by role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockArchivosData = [];
    mockSubirIsError = false;
    mockSubirError = null;
  });

  it("shows file input when canEdit=true (EDITOR/ADMIN)", () => {
    render(
      React.createElement(AdjuntosEtapa, { etapaId: 10, canEdit: true }),
      { wrapper: Wrapper }
    );
    expect(screen.getByTestId("file-input")).toBeInTheDocument();
  });

  it("does NOT show file input when canEdit=false (VIEWER)", () => {
    render(
      React.createElement(AdjuntosEtapa, { etapaId: 10, canEdit: false }),
      { wrapper: Wrapper }
    );
    expect(screen.queryByTestId("file-input")).not.toBeInTheDocument();
  });
});

// ----------------------------------------------------------------
// Attachment list rendering
// ----------------------------------------------------------------

describe("AdjuntosEtapa — attachment list rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubirIsError = false;
    mockSubirError = null;
    mockArchivosData = [
      makeArchivo({ id: 1, nombre_original: "informe.pdf" }),
      makeArchivo({ id: 2, nombre_original: "cuadro.xlsx" }),
    ];
  });

  it("renders list of attachments", () => {
    render(
      React.createElement(AdjuntosEtapa, { etapaId: 10, canEdit: false }),
      { wrapper: Wrapper }
    );
    expect(screen.getByTestId("adjuntos-lista")).toBeInTheDocument();
    expect(screen.getByText("informe.pdf")).toBeInTheDocument();
    expect(screen.getByText("cuadro.xlsx")).toBeInTheDocument();
  });

  it("download button always visible regardless of role", () => {
    render(
      React.createElement(AdjuntosEtapa, { etapaId: 10, canEdit: false }),
      { wrapper: Wrapper }
    );
    const downloadBtns = screen.getAllByText("Descargar");
    expect(downloadBtns.length).toBe(2);
  });

  it("delete button visible only for canEdit=true", () => {
    render(
      React.createElement(AdjuntosEtapa, { etapaId: 10, canEdit: true }),
      { wrapper: Wrapper }
    );
    const deleteBtns = screen.getAllByText("Eliminar");
    expect(deleteBtns.length).toBe(2);
  });

  it("delete button NOT visible for canEdit=false (VIEWER)", () => {
    render(
      React.createElement(AdjuntosEtapa, { etapaId: 10, canEdit: false }),
      { wrapper: Wrapper }
    );
    expect(screen.queryByText("Eliminar")).not.toBeInTheDocument();
  });

  it("shows 'Sin archivos adjuntos' when list is empty", () => {
    mockArchivosData = [];
    render(
      React.createElement(AdjuntosEtapa, { etapaId: 10, canEdit: false }),
      { wrapper: Wrapper }
    );
    expect(screen.getByTestId("adjuntos-vacio")).toBeInTheDocument();
  });
});

// ----------------------------------------------------------------
// Upload triggers mutation
// ----------------------------------------------------------------

describe("AdjuntosEtapa — upload triggers mutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockArchivosData = [];
    mockSubirIsError = false;
    mockSubirError = null;
  });

  it("upload mutation called with File when valid file selected", async () => {
    const user = userEvent.setup();
    render(
      React.createElement(AdjuntosEtapa, { etapaId: 10, canEdit: true }),
      { wrapper: Wrapper }
    );

    const input = screen.getByTestId("file-input");
    const file = new File(["hello"], "test.pdf", { type: "application/pdf" });
    await user.upload(input, file);

    expect(mockSubirMutate).toHaveBeenCalledWith(
      file,
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it("client-side validation rejects file >10MB", async () => {
    const user = userEvent.setup();
    render(
      React.createElement(AdjuntosEtapa, { etapaId: 10, canEdit: true }),
      { wrapper: Wrapper }
    );

    const input = screen.getByTestId("file-input");
    const bigFile = new File(["x".repeat(100)], "huge.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(bigFile, "size", { value: 11 * 1024 * 1024 });
    await user.upload(input, bigFile);

    // Mutation should NOT be called for oversized files
    expect(mockSubirMutate).not.toHaveBeenCalled();
    // Error message shown
    await waitFor(() => {
      expect(screen.getByTestId("adjuntos-error")).toBeInTheDocument();
    });
  });

  it("client-side validation rejects disallowed extension", async () => {
    // Use userEvent.setup with applyAccept:false to bypass the HTML accept
    // attribute filter so our JS validation layer is exercised instead.
    const user = userEvent.setup({ applyAccept: false });
    render(
      React.createElement(AdjuntosEtapa, { etapaId: 10, canEdit: true }),
      { wrapper: Wrapper }
    );

    const input = screen.getByTestId("file-input");
    const badFile = new File(["x"], "malware.exe", {
      type: "application/octet-stream",
    });
    await user.upload(input, badFile);

    expect(mockSubirMutate).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByTestId("adjuntos-error")).toBeInTheDocument();
    });
  });
});

// ----------------------------------------------------------------
// Delete triggers mutation (EDITOR/ADMIN only)
// ----------------------------------------------------------------

describe("AdjuntosEtapa — delete triggers mutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubirIsError = false;
    mockSubirError = null;
    mockArchivosData = [makeArchivo({ id: 5, nombre_original: "cert.pdf" })];
  });

  it("delete button calls eliminar mutation with archivoId", async () => {
    const user = userEvent.setup();
    render(
      React.createElement(AdjuntosEtapa, { etapaId: 10, canEdit: true }),
      { wrapper: Wrapper }
    );

    const deleteBtn = screen.getByTestId("btn-eliminar-5");
    await user.click(deleteBtn);

    expect(mockEliminarMutate).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ onSettled: expect.any(Function) })
    );
  });
});

// ----------------------------------------------------------------
// Download triggers handler
// ----------------------------------------------------------------

describe("AdjuntosEtapa — download triggers handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubirIsError = false;
    mockSubirError = null;
    mockArchivosData = [
      makeArchivo({ id: 3, nombre_original: "tdr.pdf" }),
    ];
  });

  it("download button calls descargar with archivoId and nombre_original", async () => {
    mockDescargar.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(
      React.createElement(AdjuntosEtapa, { etapaId: 10, canEdit: false }),
      { wrapper: Wrapper }
    );

    const downloadBtn = screen.getByTestId("btn-descargar-3");
    await user.click(downloadBtn);

    await waitFor(() => {
      expect(mockDescargar).toHaveBeenCalledWith(3, "tdr.pdf");
    });
  });
});

// ----------------------------------------------------------------
// Upload error surfacing
// ----------------------------------------------------------------

describe("AdjuntosEtapa — upload error surfacing", () => {
  it("surfaces backend 422 detail from upload error", () => {
    mockArchivosData = [];
    mockSubirIsError = true;
    mockSubirError = {
      response: { data: { detail: "Esta etapa no admite adjuntos" } },
    };

    render(
      React.createElement(AdjuntosEtapa, { etapaId: 10, canEdit: true }),
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId("adjuntos-error")).toBeInTheDocument();
    expect(
      screen.getByText("Esta etapa no admite adjuntos")
    ).toBeInTheDocument();
  });
});

// ----------------------------------------------------------------
// Catalog sync gating (CODIGOS_CON_ADJUNTOS)
// ----------------------------------------------------------------

describe("AdjuntosEtapa — catalog sync gating (CODIGOS_CON_ADJUNTOS)", () => {
  // flujo-real-otin-v2: 19 codes — E01a/E01b/E01c replace E01 (+2 net)
  it("CODIGOS_CON_ADJUNTOS has exactly 19 key stage codes", () => {
    expect(CODIGOS_CON_ADJUNTOS.size).toBe(19);
  });

  it("E01 is NOT in CODIGOS_CON_ADJUNTOS (removed in flujo-real-otin-v2)", () => {
    expect(CODIGOS_CON_ADJUNTOS.has("E01")).toBe(false);
  });

  it("E01a, E01b, E01c are in CODIGOS_CON_ADJUNTOS (replaced E01)", () => {
    expect(CODIGOS_CON_ADJUNTOS.has("E01a")).toBe(true);
    expect(CODIGOS_CON_ADJUNTOS.has("E01b")).toBe(true);
    expect(CODIGOS_CON_ADJUNTOS.has("E01c")).toBe(true);
  });

  it("E04 is NOT in CODIGOS_CON_ADJUNTOS", () => {
    expect(CODIGOS_CON_ADJUNTOS.has("E04")).toBe(false);
  });

  it("E02 IS in CODIGOS_CON_ADJUNTOS", () => {
    expect(CODIGOS_CON_ADJUNTOS.has("E02")).toBe(true);
  });

  it("E11 IS in CODIGOS_CON_ADJUNTOS (per-area key stage)", () => {
    expect(CODIGOS_CON_ADJUNTOS.has("E11")).toBe(true);
  });
});
