/**
 * C4 — TablaVariaciones component tests.
 * Verifies null → "—", positive → ▲ rojo, negative → ▼ verde.
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TablaVariaciones } from "@/components/dashboard/TablaVariaciones";
import type { PresupuestoProceso } from "@/types/dashboard";

const procesos: PresupuestoProceso[] = [
  {
    id: 1,
    id_proceso: "2026-001",
    requerimiento: "Laptops para DTDIS",
    estado: "CULMINADO",
    pim: 50000,
    valor_em: 52000,
    monto_cert_total: 51000,
    monto_ocs: 50500,
    var_em_vs_pim: 4.0,       // positive → ▲ rojo
    var_cert_vs_em: -1.9,     // negative → ▼ verde
    var_ocs_vs_em: -2.9,      // negative → ▼ verde
  },
  {
    id: 2,
    id_proceso: "2026-002",
    requerimiento: "Servidores OTIN",
    estado: "EN PROCESO",
    pim: null,
    valor_em: null,
    monto_cert_total: null,
    monto_ocs: null,
    var_em_vs_pim: null,
    var_cert_vs_em: null,
    var_ocs_vs_em: null,
  },
];

describe("TablaVariaciones", () => {
  it("renders proceso IDs", () => {
    render(<TablaVariaciones procesos={procesos} />);
    expect(screen.getByText("2026-001")).toBeTruthy();
    expect(screen.getByText("2026-002")).toBeTruthy();
  });

  it("shows ▲ for positive variation", () => {
    render(<TablaVariaciones procesos={procesos} />);
    const arrow = screen.getByText(/▲ 4\.0%/);
    expect(arrow).toBeTruthy();
    expect((arrow as HTMLElement).style.color).toBe("rgb(183, 28, 28)");
  });

  it("shows ▼ for negative variation", () => {
    render(<TablaVariaciones procesos={procesos} />);
    const arrows = screen.getAllByText(/▼/);
    expect(arrows.length).toBeGreaterThan(0);
    // ▼ verde
    expect((arrows[0] as HTMLElement).style.color).toBe("rgb(39, 98, 33)");
  });

  it("shows '—' for null monetary values", () => {
    render(<TablaVariaciones procesos={procesos} />);
    const dashes = screen.getAllByText("—");
    // proceso 2 has all nulls (PIM, EM, Cert, OCS, plus 3 variation nulls)
    expect(dashes.length).toBeGreaterThan(2);
  });

  it("renders empty state when no procesos", () => {
    render(<TablaVariaciones procesos={[]} />);
    expect(screen.getByText(/Sin datos para mostrar/i)).toBeTruthy();
  });
});
