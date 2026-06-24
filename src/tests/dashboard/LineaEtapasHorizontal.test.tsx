/**
 * LineaEtapasHorizontal — phase board.
 *
 * Verifies that acquisitions are grouped by their current visual phase and
 * that each card surfaces current stage, elapsed days and overall progress.
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { LineaEtapasHorizontal } from "@/components/dashboard/LineaEtapasHorizontal";
import type { ProcesoFlujo } from "@/types/dashboard";

function makeProceso(overrides: Partial<ProcesoFlujo> = {}): ProcesoFlujo {
  return {
    id: 1,
    id_proceso: "2026-001",
    requerimiento: "Adquisición de laptops",
    estado: "EN PROCESO",
    fase_actual: "F1",
    etapa_actual: "E01a",
    etapa_actual_nombre: "Solicitud inicial área iniciadora (Área → OTIN)",
    fase_actual_dias: 2,
    porcentaje: 12,
    fases: [],
    ...overrides,
  };
}

describe("LineaEtapasHorizontal — phase board", () => {
  it("groups acquisitions under their current phase", () => {
    render(
      <LineaEtapasHorizontal
        procesos={[
          makeProceso({
            id: 1,
            id_proceso: "2026-001",
            requerimiento: "Solicitud de plataforma colaborativa",
            etapa_actual: "E01a",
            etapa_actual_nombre: "Solicitud inicial área iniciadora (Área → OTIN)",
            fase_actual_dias: 1,
          }),
          makeProceso({
            id: 2,
            id_proceso: "2026-002",
            requerimiento: "Servicio de soporte",
            fase_actual: "F2",
            etapa_actual: "E07",
            etapa_actual_nombre: "Evaluación técnica (OEAS → OTIN)",
            fase_actual_dias: 6,
            porcentaje: 35,
          }),
          makeProceso({
            id: 3,
            id_proceso: "2026-003",
            requerimiento: "Licencias endpoint",
            estado: "CULMINADO",
            fase_actual: null,
            etapa_actual: "E25",
            etapa_actual_nombre: "Conformidad final consolidada (OTIN) FIN",
            fase_actual_dias: 3,
            porcentaje: 100,
          }),
        ]}
      />
    );

    const fase1 = screen.getByLabelText("Fase 1: Requerimiento");
    const fase2 = screen.getByLabelText("Fase 2: Indagación");
    const fase5 = screen.getByLabelText("Fase 5: Conformidad");

    expect(within(fase1).getByText("2026-001")).toBeTruthy();
    expect(within(fase2).getByText("2026-002")).toBeTruthy();
    expect(within(fase5).getByText("2026-003")).toBeTruthy();
    expect(within(fase5).getByText("Culminado")).toBeTruthy();
  });

  it("uses the frontend visual phase mapping for the current stage", () => {
    render(
      <LineaEtapasHorizontal
        procesos={[
          makeProceso({
            fase_actual: "F2",
            etapa_actual: "E09",
            etapa_actual_nombre: "Cuadro comparativo (OEAS → OTIN)",
            fase_actual_dias: 4,
            porcentaje: 48,
          }),
        ]}
      />
    );

    const fase2 = screen.getByLabelText("Fase 2: Indagación");
    const fase3 = screen.getByLabelText("Fase 3: Presupuesto");

    expect(within(fase2).queryByText("2026-001")).toBeNull();
    expect(within(fase3).getByText("2026-001")).toBeTruthy();
    expect(within(fase3).getByText("4 días")).toBeTruthy();
    expect(within(fase3).getByText(/E09 · Cuadro comparativo/i)).toBeTruthy();
  });

  it("shows loading and empty states", () => {
    const { rerender } = render(<LineaEtapasHorizontal procesos={[]} isLoading />);

    expect(screen.getByRole("status").textContent).toContain("Cargando fases");

    rerender(<LineaEtapasHorizontal procesos={[]} />);

    expect(screen.getByText("Sin adquisiciones para mostrar.")).toBeTruthy();
  });
});
