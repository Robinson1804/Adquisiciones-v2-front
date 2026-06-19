/**
 * T29 — CorreoCard tests (RED phase)
 * Covers: extraccion render, badge de confianza, badge APROBADO_AUTO + btn Desvincular,
 * rol VIEWER no ve acciones, documentos list
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("@/hooks/useIngesta", () => ({
  useAprobarIngesta: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useRechazarIngesta: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDesvincularIngesta: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useCorregirIngesta: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

import { useAuthStore } from "@/stores/authStore";
import { CorreoCard } from "@/components/ingesta/CorreoCard";
import type { CorreoIngesta } from "@/types/ingesta";

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

const mockCorreoPendiente: CorreoIngesta = {
  id: 1,
  entry_id: "ENTRY001",
  subject: "Oficio N° 267-2026 - Servicio de mantenimiento",
  sender_name: "Juan Perez",
  sender_email: "jperez@inei.gob.pe",
  received_at: "2026-06-01T09:00:00Z",
  nombre_servicio: "Servicio de mantenimiento de servidores",
  nombre_servicio_normalizado: "servicio de mantenimiento de servidores",
  numero_oficio_raw: "N°267-2026-INEI/OTIN",
  numero_oficio: "267-2026-INEI/OTIN",
  oss: ["OS-001"],
  siaf: null,
  proveedor: "Proveedor SA",
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
  documentos: [
    {
      id: 10,
      ingesta_correo_id: 1,
      nombre_original: "TDR Mantenimiento.pdf",
      nombre_almacenado: "abc123.pdf",
      ruta_relativa: "ingesta_staging/abc123.pdf",
      content_type: "application/pdf",
      tamano_bytes: 12345,
      tipo_clasificado: "TDR",
      confianza: 0.92,
      proceso_id: null,
      creado_en: "2026-06-01T10:00:00Z",
    },
    {
      id: 11,
      ingesta_correo_id: 1,
      nombre_original: "Cotizacion.xlsx",
      nombre_almacenado: "def456.xlsx",
      ruta_relativa: "ingesta_staging/def456.xlsx",
      content_type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      tamano_bytes: 8000,
      tipo_clasificado: "COTIZACION",
      confianza: 0.45, // low confidence → should be highlighted
      proceso_id: null,
      creado_en: "2026-06-01T10:00:00Z",
    },
  ],
};

const mockCorreoAprobadoAuto: CorreoIngesta = {
  ...mockCorreoPendiente,
  estado_revision: "APROBADO_AUTO",
  revisado_por: "INGESTA_AUTO",
  match_confianza: 0.95,
  proceso_id: 42,
};

function mockEditor() {
  vi.mocked(useAuthStore).mockReturnValue({
    user: {
      id: 1,
      username: "editor",
      nombre_completo: "Editor",
      rol: "EDITOR",
      area: null,
    },
    token: "tok",
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuthStore>);
}

function mockViewer() {
  vi.mocked(useAuthStore).mockReturnValue({
    user: {
      id: 2,
      username: "viewer",
      nombre_completo: "Viewer",
      rol: "VIEWER",
      area: null,
    },
    token: "tok",
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuthStore>);
}

// ----------------------------------------------------------------

describe("CorreoCard — extracción IA render", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEditor();
  });

  it("muestra nombre de servicio extraído por IA", () => {
    render(<CorreoCard correo={mockCorreoPendiente} />, { wrapper: Wrapper });
    expect(
      screen.getByText(/servicio de mantenimiento de servidores/i)
    ).toBeInTheDocument();
  });

  it("muestra número de oficio normalizado", () => {
    render(<CorreoCard correo={mockCorreoPendiente} />, { wrapper: Wrapper });
    expect(screen.getByText(/267-2026-INEI\/OTIN/i)).toBeInTheDocument();
  });

  it("muestra remitente y asunto", () => {
    render(<CorreoCard correo={mockCorreoPendiente} />, { wrapper: Wrapper });
    expect(screen.getByText(/Juan Perez/i)).toBeInTheDocument();
  });

  it("muestra lista de documentos con nombre", () => {
    render(<CorreoCard correo={mockCorreoPendiente} />, { wrapper: Wrapper });
    expect(screen.getByText(/TDR Mantenimiento\.pdf/i)).toBeInTheDocument();
    expect(screen.getByText(/Cotizacion\.xlsx/i)).toBeInTheDocument();
  });
});

describe("CorreoCard — badge de confianza", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEditor();
  });

  it("muestra badge de confianza alta (>= 0.8) en verde", () => {
    render(<CorreoCard correo={mockCorreoPendiente} />, { wrapper: Wrapper });
    // TDR tiene confianza 0.92 → badge con data-testid confianza-alta
    const badges = screen.getAllByTestId("badge-confianza-alta");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("marca confianza baja (< 0.6) con badge advertencia", () => {
    render(<CorreoCard correo={mockCorreoPendiente} />, { wrapper: Wrapper });
    // Cotizacion tiene confianza 0.45 → badge con data-testid confianza-baja
    expect(screen.getByTestId("badge-confianza-baja")).toBeInTheDocument();
  });
});

describe("CorreoCard — estado APROBADO_AUTO", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEditor();
  });

  it("muestra badge APROBADO_AUTO cuando revisado_por es INGESTA_AUTO", () => {
    render(<CorreoCard correo={mockCorreoAprobadoAuto} />, {
      wrapper: Wrapper,
    });
    expect(screen.getByTestId("badge-aprobado-auto")).toBeInTheDocument();
  });

  it("muestra botón Desvincular para ADMIN/EDITOR en estado APROBADO_AUTO", () => {
    render(<CorreoCard correo={mockCorreoAprobadoAuto} />, {
      wrapper: Wrapper,
    });
    expect(
      screen.getByRole("button", { name: /desvincular/i })
    ).toBeInTheDocument();
  });

  it("no muestra botones Aprobar/Rechazar cuando estado es APROBADO_AUTO", () => {
    render(<CorreoCard correo={mockCorreoAprobadoAuto} />, {
      wrapper: Wrapper,
    });
    expect(
      screen.queryByRole("button", { name: /aprobar/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /rechazar/i })
    ).not.toBeInTheDocument();
  });
});

describe("CorreoCard — gating por rol VIEWER", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockViewer();
  });

  it("VIEWER no ve botones Aprobar ni Rechazar en estado PENDIENTE", () => {
    render(<CorreoCard correo={mockCorreoPendiente} />, { wrapper: Wrapper });
    expect(
      screen.queryByRole("button", { name: /aprobar/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /rechazar/i })
    ).not.toBeInTheDocument();
  });

  it("VIEWER no ve botón Desvincular en estado APROBADO_AUTO", () => {
    render(<CorreoCard correo={mockCorreoAprobadoAuto} />, {
      wrapper: Wrapper,
    });
    expect(
      screen.queryByRole("button", { name: /desvincular/i })
    ).not.toBeInTheDocument();
  });

  it("VIEWER puede ver datos del correo (solo lectura)", () => {
    render(<CorreoCard correo={mockCorreoPendiente} />, { wrapper: Wrapper });
    expect(
      screen.getByText(/servicio de mantenimiento de servidores/i)
    ).toBeInTheDocument();
  });
});
