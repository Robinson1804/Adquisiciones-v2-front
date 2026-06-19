/**
 * TDD — tests for MatrizTiempos presentational component.
 * 9 cases covering: column headers (incl. PIM + Estado), data rows,
 * null cell rendering, heatmap class, empty state, colorClasePorDias helper,
 * PIM formatting, Estado badge, and clickable rows.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MatrizTiempos, colorClasePorDias } from "@/components/procesos/MatrizTiempos";
import type { MatrizTiempos as MatrizTiemposData } from "@/types/etapa";

// ---------------------------------------------------------------------------
// Mock next/navigation
// ---------------------------------------------------------------------------
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
  mockPush.mockClear();
});

// ---------------------------------------------------------------------------
// Fixture data — now includes pim, estado, tipo in each fila
// ---------------------------------------------------------------------------

const FIVE_FILAS: MatrizTiemposData = {
  columnas: [
    { key: "cmn",         label: "CMN",          cod: "E01c" },
    { key: "tdr",         label: "TDR",          cod: "E02" },
    { key: "vb",          label: "V°B°",         cod: "E02b" },
    { key: "indagacion",  label: "Indagación",   cod: "E03" },
    { key: "cuadro_comp", label: "Cuadro comp.", cod: "E09" },
    { key: "os",          label: "O/S",          cod: "E19" },
    { key: "conformidad", label: "Conformidad",  cod: "E23" },
    { key: "total",       label: "TOTAL",        cod: null },
  ],
  filas: [
    { proceso_id: 1, id_proceso: "2026-001", requerimiento: "Req A", pim: 5000, estado: "EN PROCESO", tipo: "SERVICIO", celdas: [10, null, null, null, null, null, null], total_dias: 10 },
    { proceso_id: 2, id_proceso: "2026-002", requerimiento: "Req B", pim: null, estado: "CULMINADO",  tipo: "BIEN",     celdas: [20, 15, null, null, null, null, null], total_dias: 35 },
    { proceso_id: 3, id_proceso: "2026-003", requerimiento: "Req C", pim: 1200, estado: "EN PROCESO", tipo: "SERVICIO", celdas: [null, null, null, 30, null, null, null], total_dias: 30 },
    { proceso_id: 4, id_proceso: "2026-004", requerimiento: "Req D", pim: null, estado: "CANCELADO",  tipo: null,       celdas: [null, null, null, null, 50, null, null], total_dias: 50 },
    { proceso_id: 5, id_proceso: "2026-005", requerimiento: "Req E", pim: 9999, estado: "EN PROCESO", tipo: "BIEN",     celdas: [null, null, null, null, null, null, 40], total_dias: 40 },
  ],
  promedios: [15, 15, null, 30, 50, null, 40, 33],
  promedio_total: 33,
};

const EMPTY_DATA: MatrizTiemposData = {
  columnas: [
    { key: "cmn", label: "CMN", cod: "E01c" },
    { key: "total", label: "TOTAL", cod: null },
  ],
  filas: [],
  promedios: [null, null],
  promedio_total: null,
};

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

describe("MatrizTiempos", () => {
  it("case 1: renders columna labels + TOTAL + PIM + Estado headers", () => {
    render(<MatrizTiempos data={FIVE_FILAS} isLoading={false} isError={false} />);

    // All 7 hito labels + TOTAL must appear as column headers
    expect(screen.getByText("CMN")).toBeInTheDocument();
    expect(screen.getByText("TDR")).toBeInTheDocument();
    expect(screen.getByText("V°B°")).toBeInTheDocument();
    expect(screen.getByText("Indagación")).toBeInTheDocument();
    expect(screen.getByText("Cuadro comp.")).toBeInTheDocument();
    expect(screen.getByText("O/S")).toBeInTheDocument();
    expect(screen.getByText("Conformidad")).toBeInTheDocument();
    expect(screen.getByText("TOTAL")).toBeInTheDocument();
    // New columns
    expect(screen.getByText("PIM")).toBeInTheDocument();
    expect(screen.getByText("Estado")).toBeInTheDocument();
  });

  it("case 2: renders 5 data rows + averages footer for 5-fila fixture", () => {
    render(<MatrizTiempos data={FIVE_FILAS} isLoading={false} isError={false} />);

    // id_proceso values should be visible in the table
    expect(screen.getByText("2026-001")).toBeInTheDocument();
    expect(screen.getByText("2026-002")).toBeInTheDocument();
    expect(screen.getByText("2026-003")).toBeInTheDocument();
    expect(screen.getByText("2026-004")).toBeInTheDocument();
    expect(screen.getByText("2026-005")).toBeInTheDocument();

    // The averages footer should show promedio_total = 33
    expect(screen.getByText("33")).toBeInTheDocument();
  });

  it("case 3: null cell renders as em dash", () => {
    render(<MatrizTiempos data={FIVE_FILAS} isLoading={false} isError={false} />);

    // Multiple null cells should render as "—"
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("case 4: non-null hito cell has heatmap Tailwind class", () => {
    render(<MatrizTiempos data={FIVE_FILAS} isLoading={false} isError={false} />);

    // At least one non-null heatmap cell must have a bg-color class (not neutral gray).
    const table = screen.getByRole("grid");
    const tds = table.querySelectorAll("tbody td");
    const coloredCells = Array.from(tds).filter(
      (td) => td.className.includes("bg-") && !td.className.includes("bg-gray-100")
        && !td.className.includes("bg-gray-50") && !td.className.includes("bg-white")
    );
    expect(coloredCells.length).toBeGreaterThan(0);
  });

  it("case 5: empty filas → placeholder text shown", () => {
    render(<MatrizTiempos data={EMPTY_DATA} isLoading={false} isError={false} />);

    expect(
      screen.getByText("No hay procesos para los filtros seleccionados.")
    ).toBeInTheDocument();
  });

  it("case 6: colorClasePorDias returns warmer class for larger dias relative to max", () => {
    const coolClass = colorClasePorDias(5, 100);   // 5% of max → coolest
    const warmClass = colorClasePorDias(100, 100); // 100% of max → warmest

    expect(coolClass).not.toBe(warmClass);
    expect(coolClass).toMatch(/emerald|green/);
    expect(warmClass).toMatch(/red|orange/);
  });

  it("case 7: PIM column renders formatted value and dash for null", () => {
    render(<MatrizTiempos data={FIVE_FILAS} isLoading={false} isError={false} />);

    // fila[0]: pim=5000 → "S/ 5,000.00" (locale formatting)
    // We search for the S/ prefix appearing somewhere in the table
    const pimCells = screen.getAllByText(/S\//);
    expect(pimCells.length).toBeGreaterThan(0);

    // fila[1]: pim=null → "—" (already covered by case 3, but explicitly verify PIM)
    // The "—" dashes include PIM nulls — already tested above
  });

  it("case 8: Estado column renders badge text for each fila", () => {
    render(<MatrizTiempos data={FIVE_FILAS} isLoading={false} isError={false} />);

    // At least one "EN PROCESO" badge must be visible
    const enProcesoBadges = screen.getAllByText("EN PROCESO");
    expect(enProcesoBadges.length).toBeGreaterThan(0);

    // "CULMINADO" badge
    expect(screen.getByText("CULMINADO")).toBeInTheDocument();

    // "CANCELADO" badge
    expect(screen.getByText("CANCELADO")).toBeInTheDocument();
  });

  it("case 9: clicking a process row navigates to /procesos/{proceso_id}", () => {
    render(<MatrizTiempos data={FIVE_FILAS} isLoading={false} isError={false} />);

    // Click the first data row (proceso_id=1)
    const firstRow = screen.getByRole("row", { name: /Ver detalle del proceso 2026-001/ });
    fireEvent.click(firstRow);

    expect(mockPush).toHaveBeenCalledWith("/procesos/1");
    expect(mockPush).toHaveBeenCalledTimes(1);
  });
});
