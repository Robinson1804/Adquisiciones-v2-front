/**
 * T13a — WizardOrdenServicio tests.
 * flujo-real-otin-v2: Modal wizard para registrar llegada de O/S.
 *
 * Visible cuando: E13 COMPLETADO + E19 no registrado.
 * Llama POST /procesos/{id}/registrar-orden-servicio.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WizardOrdenServicio } from "@/components/procesos/WizardOrdenServicio";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    post: vi.fn(),
  },
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
    token: "t",
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  })),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("WizardOrdenServicio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.post).mockReset();
  });

  it("renders trigger button when E13 COMPLETADO and E19 absent", () => {
    render(
      React.createElement(WizardOrdenServicio, {
        procesoId: 1,
        e13Completado: true,
        e19Registrado: false,
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByRole("button", { name: /Llegó la O\/S/i })).toBeInTheDocument();
  });

  it("hides trigger button when E13 NOT COMPLETADO", () => {
    render(
      React.createElement(WizardOrdenServicio, {
        procesoId: 1,
        e13Completado: false,
        e19Registrado: false,
      }),
      { wrapper: Wrapper }
    );

    expect(screen.queryByRole("button", { name: /Llegó la O\/S/i })).not.toBeInTheDocument();
  });

  it("hides trigger button when E19 already registered", () => {
    render(
      React.createElement(WizardOrdenServicio, {
        procesoId: 1,
        e13Completado: true,
        e19Registrado: true,
      }),
      { wrapper: Wrapper }
    );

    expect(screen.queryByRole("button", { name: /Llegó la O\/S/i })).not.toBeInTheDocument();
  });

  it("opens modal on trigger button click", () => {
    render(
      React.createElement(WizardOrdenServicio, {
        procesoId: 1,
        e13Completado: true,
        e19Registrado: false,
      }),
      { wrapper: Wrapper }
    );

    fireEvent.click(screen.getByRole("button", { name: /Llegó la O\/S/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/N.ro OCS/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Monto OCS/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Plazo de entrega/i)).toBeInTheDocument();
  });

  it("submit calls POST /procesos/{id}/registrar-orden-servicio with form data", () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { success: true } });

    render(
      React.createElement(WizardOrdenServicio, {
        procesoId: 42,
        e13Completado: true,
        e19Registrado: false,
      }),
      { wrapper: Wrapper }
    );

    fireEvent.click(screen.getByRole("button", { name: /Llegó la O\/S/i }));

    fireEvent.change(screen.getByLabelText(/N.ro OCS/i), { target: { value: "OCS-2026-001" } });
    fireEvent.change(screen.getByLabelText(/Monto OCS/i), { target: { value: "50000" } });
    fireEvent.change(screen.getByLabelText(/Plazo de entrega/i), { target: { value: "30" } });

    fireEvent.click(screen.getByRole("button", { name: /Registrar O\/S/i }));

    expect(vi.mocked(api.post)).toHaveBeenCalledOnce();
    const [url, body] = vi.mocked(api.post).mock.calls[0] as [string, Record<string, unknown>];
    expect(url).toBe("/procesos/42/registrar-orden-servicio");
    expect(body.nro_ocs).toBe("OCS-2026-001");
    expect(body.monto_ocs).toBe(50000);
    expect(body.plazo_entrega).toBe(30);
  });

  it("shows 'ya registrada' message on 409 response", async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: { status: 409, data: { detail: "O/S ya registrada para este proceso" } },
    });

    render(
      React.createElement(WizardOrdenServicio, {
        procesoId: 1,
        e13Completado: true,
        e19Registrado: false,
      }),
      { wrapper: Wrapper }
    );

    fireEvent.click(screen.getByRole("button", { name: /Llegó la O\/S/i }));
    fireEvent.change(screen.getByLabelText(/N.ro OCS/i), { target: { value: "OCS-2026-001" } });
    fireEvent.change(screen.getByLabelText(/Monto OCS/i), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText(/Plazo de entrega/i), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /Registrar O\/S/i }));

    await screen.findByText(/ya registrada/i);
  });
});
