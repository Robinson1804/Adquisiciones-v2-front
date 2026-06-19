/**
 * C4 — TablaSemaforo component tests.
 * Verifies semáforo cell color classification and null handling.
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TablaSemaforo } from "@/components/dashboard/TablaSemaforo";
import type { DemoraArea } from "@/types/dashboard";

const areas: DemoraArea[] = [
  {
    area_usuaria: "DTDIS",
    e11_dias_promedio: 5.0,
    e11_n: 3,
    semaforo_e11: "verde",
    e24_dias_promedio: 10.0,
    e24_n: 2,
    semaforo_e24: "amarillo",
  },
  {
    area_usuaria: "OGA",
    e11_dias_promedio: 20.0,
    e11_n: 4,
    semaforo_e11: "rojo",
    e24_dias_promedio: null,
    e24_n: 0,
    semaforo_e24: null,
  },
];

describe("TablaSemaforo", () => {
  it("renders area names", () => {
    render(<TablaSemaforo areas={areas} />);
    expect(screen.getByText("DTDIS")).toBeTruthy();
    expect(screen.getByText("OGA")).toBeTruthy();
  });

  it("renders verde semáforo with correct bg color", () => {
    render(<TablaSemaforo areas={areas} />);
    const verde = document.querySelector("[data-semaforo='verde']");
    expect(verde).toBeTruthy();
    expect((verde as HTMLElement).style.backgroundColor).toBe("rgb(198, 239, 206)");
  });

  it("renders amarillo semáforo with correct bg color", () => {
    render(<TablaSemaforo areas={areas} />);
    const amarillo = document.querySelector("[data-semaforo='amarillo']");
    expect(amarillo).toBeTruthy();
    expect((amarillo as HTMLElement).style.backgroundColor).toBe("rgb(255, 235, 156)");
  });

  it("renders rojo semáforo with correct bg color", () => {
    render(<TablaSemaforo areas={areas} />);
    const rojo = document.querySelector("[data-semaforo='rojo']");
    expect(rojo).toBeTruthy();
    expect((rojo as HTMLElement).style.backgroundColor).toBe("rgb(255, 205, 210)");
  });

  it("renders '—' when semaforo is null", () => {
    render(<TablaSemaforo areas={areas} />);
    // OGA has null semaforo_e24 — should show "—"
    // There are multiple "—" cells; just verify at least one exists
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("renders empty state when no areas", () => {
    render(<TablaSemaforo areas={[]} />);
    expect(screen.getByText(/Sin datos de demora/i)).toBeTruthy();
  });
});
