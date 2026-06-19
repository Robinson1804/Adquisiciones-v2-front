/**
 * T-17 — Estado badge color mapping tests.
 * Verifies each EstadoProceso maps to the correct COLORES_ESTADO key
 * (no hardcoded colors — uses the canonical constants).
 */

import { describe, it, expect } from "vitest";
import { COLORES_ESTADO } from "@/lib/constants";
import type { EstadoProceso } from "@/types";

// The mapping defined in the pages — extracted here for pure unit testing
const ESTADO_BADGE_MAP: Record<EstadoProceso, keyof typeof COLORES_ESTADO> = {
  "EN PROCESO": "EN_CURSO",
  CULMINADO: "COMPLETADO",
  CANCELADO: "CANCELADO",
};

describe("Estado badge color mapping", () => {
  it("EN PROCESO maps to EN_CURSO key with correct colors", () => {
    const key = ESTADO_BADGE_MAP["EN PROCESO"];
    expect(key).toBe("EN_CURSO");
    expect(COLORES_ESTADO[key]).toBeDefined();
    expect(COLORES_ESTADO[key].bg).toBe("#DBEAFE");
    expect(COLORES_ESTADO[key].text).toBe("#1D4ED8");
  });

  it("CULMINADO maps to COMPLETADO key with correct colors", () => {
    const key = ESTADO_BADGE_MAP["CULMINADO"];
    expect(key).toBe("COMPLETADO");
    expect(COLORES_ESTADO[key]).toBeDefined();
    expect(COLORES_ESTADO[key].bg).toBe("#DCFCE7");
    expect(COLORES_ESTADO[key].text).toBe("#15803D");
  });

  it("CANCELADO maps to CANCELADO key with correct colors", () => {
    const key = ESTADO_BADGE_MAP["CANCELADO"];
    expect(key).toBe("CANCELADO");
    expect(COLORES_ESTADO[key]).toBeDefined();
    expect(COLORES_ESTADO[key].bg).toBe("#FEE2E2");
    expect(COLORES_ESTADO[key].text).toBe("#B91C1C");
  });

  it("all EstadoProceso values are mapped", () => {
    const estados: EstadoProceso[] = ["EN PROCESO", "CULMINADO", "CANCELADO"];
    for (const estado of estados) {
      expect(ESTADO_BADGE_MAP[estado]).toBeDefined();
      const colorKey = ESTADO_BADGE_MAP[estado];
      expect(COLORES_ESTADO[colorKey]).toBeDefined();
    }
  });

  it("badge colors use COLORES_ESTADO — no values are hardcoded in the map", () => {
    // The map values MUST be keys of COLORES_ESTADO — not raw color strings
    const mapValues = Object.values(ESTADO_BADGE_MAP);
    const validKeys = Object.keys(COLORES_ESTADO);
    for (const val of mapValues) {
      expect(validKeys).toContain(val);
    }
  });
});
