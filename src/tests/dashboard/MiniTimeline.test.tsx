/**
 * C4 — MiniTimeline component tests.
 * Verifies that completed/active/pending phases render with correct structure.
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MiniTimeline } from "@/components/dashboard/MiniTimeline";
import type { FaseProgreso } from "@/types/dashboard";

const fasesF3Actual: FaseProgreso[] = [
  { fase: "F1", label: "Requerimiento y TDR",        completada: true,  actual: false },
  { fase: "F2", label: "Indagación y Evaluación",    completada: true,  actual: false },
  { fase: "F3", label: "Presupuesto y Certificación",completada: false, actual: true  },
  { fase: "F4", label: "Orden y Ejecución",          completada: false, actual: false },
  { fase: "F5", label: "Conformidad",                completada: false, actual: false },
];

const fasesTodasCompletadas: FaseProgreso[] = [
  { fase: "F1", label: "Requerimiento y TDR",        completada: true, actual: false },
  { fase: "F2", label: "Indagación y Evaluación",    completada: true, actual: false },
  { fase: "F3", label: "Presupuesto y Certificación",completada: true, actual: false },
  { fase: "F4", label: "Orden y Ejecución",          completada: true, actual: false },
  { fase: "F5", label: "Conformidad",                completada: true, actual: false },
];

describe("MiniTimeline", () => {
  it("renders 5 phase segments", () => {
    render(<MiniTimeline fases={fasesF3Actual} porcentaje={60} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(5);
  });

  it("marks F3 as 'en curso' in aria-label", () => {
    render(<MiniTimeline fases={fasesF3Actual} porcentaje={60} />);
    const f3 = screen.getByLabelText(/Presupuesto y Certificación: en curso/i);
    expect(f3).toBeTruthy();
  });

  it("marks F1 and F2 as 'completada'", () => {
    render(<MiniTimeline fases={fasesF3Actual} porcentaje={60} />);
    const f1 = screen.getByLabelText(/Requerimiento y TDR: completada/i);
    const f2 = screen.getByLabelText(/Indagación y Evaluación: completada/i);
    expect(f1).toBeTruthy();
    expect(f2).toBeTruthy();
  });

  it("marks F4 and F5 as 'pendiente'", () => {
    render(<MiniTimeline fases={fasesF3Actual} porcentaje={60} />);
    const f4 = screen.getByLabelText(/Orden y Ejecución: pendiente/i);
    const f5 = screen.getByLabelText(/Conformidad: pendiente/i);
    expect(f4).toBeTruthy();
    expect(f5).toBeTruthy();
  });

  it("shows percentage text", () => {
    render(<MiniTimeline fases={fasesF3Actual} porcentaje={60} />);
    expect(screen.getByText("60%")).toBeTruthy();
  });

  it("shows 100% when all phases completed", () => {
    render(<MiniTimeline fases={fasesTodasCompletadas} porcentaje={100} />);
    expect(screen.getByText("100%")).toBeTruthy();
    const items = screen.getAllByRole("listitem");
    items.forEach((item) => {
      expect(item.getAttribute("aria-label")).toContain("completada");
    });
  });
});
