/**
 * T-17b — S3 AreaSelector buscable + DEPENDENCIAS tests.
 *
 * Cubre:
 *   (a) El buscador filtra: escribir "OTIN" muestra OTIN; búsqueda vacía muestra todo.
 *   (b) Togglear agrega/quita el abrev en areas_usuarias (valor del form).
 *   (c) La constante DEPENDENCIAS tiene exactamente 13 entradas (sin ODEI regionales).
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { DEPENDENCIAS } from "@/lib/constants";

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("@/hooks/useProcesos", () => ({
  useCrearProceso: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));

import { useAuthStore } from "@/stores/authStore";
import { useCrearProceso } from "@/hooks/useProcesos";
import NuevoProcesoPage from "@/app/(dashboard)/procesos/nuevo/page";

const mockMutate = vi.fn();

function setupEditorMocks() {
  vi.mocked(useAuthStore).mockReturnValue({
    user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
    token: "t",
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuthStore>);

  vi.mocked(useCrearProceso).mockReturnValue({
    mutate: mockMutate,
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
  } as ReturnType<typeof useCrearProceso>);
}

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

// ----------------------------------------------------------------
// (c) Constante pura — no necesita DOM
// ----------------------------------------------------------------
describe("DEPENDENCIAS constant", () => {
  it("has exactly 13 entries (sin ODEI regionales)", () => {
    expect(DEPENDENCIAS).toHaveLength(13);
  });

  it("first entry is OTIN", () => {
    expect(DEPENDENCIAS[0].abrev).toBe("OTIN");
  });

  it("last entry is SG", () => {
    expect(DEPENDENCIAS[DEPENDENCIAS.length - 1].abrev).toBe("SG");
  });

  it("all entries have non-empty abrev and nombre", () => {
    for (const dep of DEPENDENCIAS) {
      expect(dep.abrev.trim().length).toBeGreaterThan(0);
      expect(dep.nombre.trim().length).toBeGreaterThan(0);
    }
  });

  it("no duplicate abrev values", () => {
    const abrevs = DEPENDENCIAS.map((d) => d.abrev);
    const unique = new Set(abrevs);
    expect(unique.size).toBe(DEPENDENCIAS.length);
  });
});

// ----------------------------------------------------------------
// (a) Filtrado del buscador
// ----------------------------------------------------------------
describe("S3 — AreaSelector buscador filtra dependencias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupEditorMocks();
  });

  it("escribir 'OTIN' muestra solo la entrada OTIN", async () => {
    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });

    const searchInput = screen.getByPlaceholderText(/buscar por abreviatura o nombre/i);
    fireEvent.change(searchInput, { target: { value: "OTIN" } });

    await waitFor(() => {
      // El botón OTIN debe estar visible
      expect(screen.getByRole("button", { name: /^Area OTIN$/i })).toBeInTheDocument();
    });

    // OTPP no contiene "OTIN" → tampoco aparece
    expect(screen.queryByRole("button", { name: /^Area OTPP$/i })).not.toBeInTheDocument();
  });

  it("escribir 'ODEI' (ya removidas) no devuelve resultados", async () => {
    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });

    const searchInput = screen.getByPlaceholderText(/buscar por abreviatura o nombre/i);
    fireEvent.change(searchInput, { target: { value: "ODEI" } });

    await waitFor(() => {
      const odeiButtons = screen
        .queryAllByRole("button")
        .filter((btn) => btn.getAttribute("aria-label")?.startsWith("Area ODEI"));
      expect(odeiButtons).toHaveLength(0);
    });
  });

  it("busqueda vacía muestra todas las dependencias", async () => {
    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });

    const searchInput = screen.getByPlaceholderText(/buscar por abreviatura o nombre/i);
    // Escribir y luego borrar
    fireEvent.change(searchInput, { target: { value: "OTIN" } });
    fireEvent.change(searchInput, { target: { value: "" } });

    await waitFor(() => {
      // Con búsqueda vacía, OTIN y SG deben estar ambos visibles
      expect(screen.getByRole("button", { name: /^Area OTIN$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Area SG$/i })).toBeInTheDocument();
    });
  });

  it("busqueda sin resultados muestra mensaje de sin resultados", async () => {
    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });

    const searchInput = screen.getByPlaceholderText(/buscar por abreviatura o nombre/i);
    fireEvent.change(searchInput, { target: { value: "XXXXXXXX" } });

    await waitFor(() => {
      expect(screen.getByText(/sin resultados/i)).toBeInTheDocument();
    });
  });

  it("filtra por nombre completo (case-insensitive)", async () => {
    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });

    const searchInput = screen.getByPlaceholderText(/buscar por abreviatura o nombre/i);
    // Buscar por parte del nombre de ENEI
    fireEvent.change(searchInput, { target: { value: "estadistica" } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Area ENEI$/i })).toBeInTheDocument();
    });
  });
});

// ----------------------------------------------------------------
// (b) Toggle agrega / quita abrev en areas_usuarias
// ----------------------------------------------------------------
describe("S3 — AreaSelector toggle agrega y quita abrev", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupEditorMocks();
  });

  it("al hacer click en un area la agrega como chip y al volver a hacer click la quita", async () => {
    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });

    // Sin selección inicial — no hay chips
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();

    // Toggle DTDIS
    fireEvent.click(screen.getByRole("button", { name: /^Area DTDIS$/i }));

    await waitFor(() => {
      // Debe aparecer el chip de DTDIS (listitem en la zona de chips)
      expect(screen.getByRole("listitem")).toBeInTheDocument();
      // El botón de quitar existe
      expect(screen.getByRole("button", { name: /Quitar DTDIS/i })).toBeInTheDocument();
    });

    // Deseleccionar DTDIS (click en el botón de la lista nuevamente)
    fireEvent.click(screen.getByRole("button", { name: /^Area DTDIS$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    });
  });

  it("al quitar el chip con la X elimina el area seleccionada", async () => {
    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });

    // Seleccionar OTIN
    fireEvent.click(screen.getByRole("button", { name: /^Area OTIN$/i }));

    await waitFor(() => {
      expect(screen.getByRole("listitem")).toBeInTheDocument();
    });

    // Hacer click en la X del chip para quitar
    const quitarBtn = screen.getByRole("button", { name: /Quitar OTIN/i });
    fireEvent.click(quitarBtn);

    await waitFor(() => {
      expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    });
  });

  it("seleccionar dos areas genera dos chips", async () => {
    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button", { name: /^Area OTIN$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Area DTDIS$/i }));

    await waitFor(() => {
      expect(screen.getAllByRole("listitem")).toHaveLength(2);
    });
  });

  it("el form envía areas_usuarias con los abrevs correctos", async () => {
    render(React.createElement(NuevoProcesoPage), { wrapper: Wrapper });

    // Fill requerimiento mínimo
    const reqInput = screen.getByLabelText(/Descripción del Requerimiento/i);
    fireEvent.change(reqInput, { target: { value: "Servicio de soporte TIC" } });

    // Seleccionar tipo
    fireEvent.click(screen.getByDisplayValue("SERVICIO"));

    // Seleccionar area_iniciadora (required)
    fireEvent.change(screen.getByLabelText(/Área iniciadora/i), { target: { value: "OTIN" } });

    // Seleccionar OTIN y DTDIS
    fireEvent.click(screen.getByRole("button", { name: /^Area OTIN$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Area DTDIS$/i }));

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /Crear Proceso/i }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });

    const callArg = mockMutate.mock.calls[0][0] as { areas_usuarias: string[] };
    expect(callArg.areas_usuarias).toContain("OTIN");
    expect(callArg.areas_usuarias).toContain("DTDIS");
    expect(callArg.areas_usuarias).toHaveLength(2);
  });
});
