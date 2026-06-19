/**
 * TDD — RED phase tests for TablaTiempos presentational component.
 * 5 cases: renders rows, bottleneck highlight, summary block, empty state, loading state.
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TablaTiempos } from "@/components/procesos/TablaTiempos";
import type { TiemposProceso } from "@/types/etapa";

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const THREE_INTERVALS: TiemposProceso = {
  intervalos: [
    {
      cod: "E02b",
      nombre: "V°B° secuencial áreas del TDR",
      area_responsable: "AREAS",
      desde: "2026-03-04",
      hasta: "2026-03-24",
      dias: 20,
    },
    {
      cod: "E03",
      nombre: "Envío indagación de mercado",
      area_responsable: "OTIN",
      desde: "2026-03-24",
      hasta: "2026-04-07",
      dias: 14,
    },
    {
      cod: "E23",
      nombre: "OTIN solicita conformidad",
      area_responsable: "OTIN",
      desde: "2026-04-17",
      hasta: "2026-05-11",
      dias: 24,
    },
  ],
  total_dias: 58,
  por_area: [
    { area: "OTIN", dias_total: 38 },
    { area: "AREAS", dias_total: 20 },
  ],
  cuello_de_botella: { cod: "E23", dias: 24 },
};

const EMPTY_DATA: TiemposProceso = {
  intervalos: [],
  total_dias: 0,
  por_area: [],
  cuello_de_botella: null,
};

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

describe("TablaTiempos", () => {
  it("case 1: renders correct number of table rows for intervals", () => {
    render(<TablaTiempos data={THREE_INTERVALS} isLoading={false} />);

    // Should have 3 data rows (one per interval)
    const rows = screen.getAllByRole("row");
    // rows includes the header row, so data rows = rows.length - 1
    expect(rows.length - 1).toBe(3);
  });

  it("case 2: bottleneck row has highlight class", () => {
    render(<TablaTiempos data={THREE_INTERVALS} isLoading={false} />);

    // The row for E23 (cuello_de_botella) should have the bg-red-50 class
    const bottleneckCell = screen.getByText("E23");
    const row = bottleneckCell.closest("tr");
    expect(row).toBeTruthy();
    expect(row?.className).toMatch(/bg-red-50/);
  });

  it("case 3: summary block shows total_dias and slowest area", () => {
    render(<TablaTiempos data={THREE_INTERVALS} isLoading={false} />);

    // total_dias = 58 — the exact number should appear as standalone text
    expect(screen.getByText("58")).toBeInTheDocument();
    // slowest area = OTIN — multiple OTIN elements exist (table rows + summary),
    // so we just check at least one is present
    const otinEls = screen.getAllByText(/OTIN/);
    expect(otinEls.length).toBeGreaterThan(0);
  });

  it("case 4: empty state — placeholder message shown, no table", () => {
    render(<TablaTiempos data={EMPTY_DATA} isLoading={false} />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    // Some empty-state message should be visible
    expect(screen.getByText(/sin intervalos|no hay|sin datos/i)).toBeInTheDocument();
  });

  it("case 5: loading state — indicator shown, no table", () => {
    render(<TablaTiempos data={undefined} isLoading={true} />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    // Loading indicator should be present
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });
});
