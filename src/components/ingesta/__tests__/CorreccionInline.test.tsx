/**
 * T30 — CorreccionInline tests (RED phase)
 * Covers: form renders, Zod validation, submit calls mutation
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/hooks/useIngesta", () => ({
  useCorregirIngesta: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  })),
}));

import { useCorregirIngesta } from "@/hooks/useIngesta";
import { CorreccionInline } from "@/components/ingesta/CorreccionInline";

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("CorreccionInline — render", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza formulario de corrección con campo nombre_servicio", () => {
    render(<CorreccionInline ingestaId={1} />, { wrapper: Wrapper });
    expect(
      screen.getByLabelText(/nombre del servicio/i)
    ).toBeInTheDocument();
  });

  it("renderiza campo número de oficio", () => {
    render(<CorreccionInline ingestaId={1} />, { wrapper: Wrapper });
    expect(
      screen.getByLabelText(/número de oficio/i)
    ).toBeInTheDocument();
  });

  it("renderiza campo tipo (BIEN/SERVICIO)", () => {
    render(<CorreccionInline ingestaId={1} />, { wrapper: Wrapper });
    expect(screen.getByRole("combobox", { name: /tipo/i })).toBeInTheDocument();
  });

  it("renderiza botón Guardar corrección", () => {
    render(<CorreccionInline ingestaId={1} />, { wrapper: Wrapper });
    expect(
      screen.getByRole("button", { name: /guardar corrección/i })
    ).toBeInTheDocument();
  });
});

describe("CorreccionInline — validación Zod", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra error si nombre_servicio está vacío al enviar", async () => {
    render(<CorreccionInline ingestaId={1} />, { wrapper: Wrapper });
    const btn = screen.getByRole("button", { name: /guardar corrección/i });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(
        screen.getByText(/el nombre del servicio es requerido/i)
      ).toBeInTheDocument();
    });
  });
});

describe("CorreccionInline — submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("llama a mutate con los datos correctos al enviar formulario válido", async () => {
    const mockMutate = vi.fn();
    vi.mocked(useCorregirIngesta).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useCorregirIngesta>);

    render(<CorreccionInline ingestaId={5} />, { wrapper: Wrapper });

    fireEvent.change(screen.getByLabelText(/nombre del servicio/i), {
      target: { value: "Servicio actualizado" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /guardar corrección/i })
    );

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
      const firstArg = mockMutate.mock.calls[0][0] as {
        id: number;
        payload: { nombre_servicio: string };
      };
      expect(firstArg.id).toBe(5);
      expect(firstArg.payload.nombre_servicio).toBe("Servicio actualizado");
    });
  });
});
