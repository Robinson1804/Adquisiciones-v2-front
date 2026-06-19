/**
 * T35 — DocumentosTab tests (RED phase)
 * Covers: render index, link de descarga, estado vacío
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/hooks/useIngesta", () => ({
  useDocumentosProceso: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  getDocumentoUrlDescarga: vi.fn((id: number) => `http://localhost:8000/ingesta/documentos/${id}`),
  getDocumentosProceso: vi.fn(),
}));

import { useDocumentosProceso } from "@/hooks/useIngesta";
import { DocumentosTab } from "@/components/ingesta/DocumentosTab";
import type { DocumentoIngesta } from "@/types/ingesta";

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

const mockDocumentos: DocumentoIngesta[] = [
  {
    id: 1,
    ingesta_correo_id: 10,
    nombre_original: "TDR Servicio.pdf",
    nombre_almacenado: "uuid1.pdf",
    ruta_relativa: "proc_42/uuid1.pdf",
    content_type: "application/pdf",
    tamano_bytes: 98765,
    tipo_clasificado: "TDR",
    confianza: 0.95,
    proceso_id: 42,
    creado_en: "2026-06-01T10:00:00Z",
  },
  {
    id: 2,
    ingesta_correo_id: 10,
    nombre_original: "Conformidad Firmada.pdf",
    nombre_almacenado: "uuid2.pdf",
    ruta_relativa: "proc_42/uuid2.pdf",
    content_type: "application/pdf",
    tamano_bytes: 45000,
    tipo_clasificado: "CONFORMIDAD",
    confianza: 0.88,
    proceso_id: 42,
    creado_en: "2026-06-05T14:00:00Z",
  },
];

describe("DocumentosTab — render de índice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra los documentos del proceso con nombre y tipo", () => {
    vi.mocked(useDocumentosProceso).mockReturnValue({
      data: mockDocumentos,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useDocumentosProceso>);

    render(<DocumentosTab procesoId={42} />, { wrapper: Wrapper });

    expect(screen.getByText(/TDR Servicio\.pdf/i)).toBeInTheDocument();
    expect(screen.getByText(/Conformidad Firmada\.pdf/i)).toBeInTheDocument();
    // TDR appears both in badge and filename, use getAllByText
    expect(screen.getAllByText(/^TDR$/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/^CONFORMIDAD$/i)).toBeInTheDocument();
  });

  it("muestra enlace de descarga para cada documento", () => {
    vi.mocked(useDocumentosProceso).mockReturnValue({
      data: mockDocumentos,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useDocumentosProceso>);

    render(<DocumentosTab procesoId={42} />, { wrapper: Wrapper });

    const links = screen.getAllByRole("link", { name: /descargar/i });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "http://localhost:8000/ingesta/documentos/1");
    expect(links[1]).toHaveAttribute("href", "http://localhost:8000/ingesta/documentos/2");
  });

  it("muestra estado vacío cuando no hay documentos", () => {
    vi.mocked(useDocumentosProceso).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useDocumentosProceso>);

    render(<DocumentosTab procesoId={42} />, { wrapper: Wrapper });

    expect(
      screen.getByText(/sin documentos vinculados/i)
    ).toBeInTheDocument();
  });

  it("muestra estado de carga mientras fetcha", () => {
    vi.mocked(useDocumentosProceso).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useDocumentosProceso>);

    render(<DocumentosTab procesoId={42} />, { wrapper: Wrapper });

    expect(screen.getByText(/cargando documentos/i)).toBeInTheDocument();
  });
});
