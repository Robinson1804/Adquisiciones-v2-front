/**
 * C3b WU-F6 — etapaRules.ts tests.
 * Pure function tests — no DOM, no React, fast.
 * Verifies each prerequisite rule (R1/R3/R5/R6/R7) blocks and unblocks correctly.
 */

import { describe, it, expect } from "vitest";
import { getEtapaActionability, PREREQUISITOS } from "@/lib/etapaRules";
import { ETAPAS_CONFIG, CODIGOS_CON_ADJUNTOS } from "@/lib/constants";
import type { EtapaAgrupada, FilaArea } from "@/types/etapa";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function makeEtapa(cod: string, overrides: Partial<EtapaAgrupada> = {}): EtapaAgrupada {
  return {
    cod,
    nombre: `Etapa ${cod}`,
    area_responsable: 'OTIN',
    es_bucle: false,
    por_area: false,
    estado: 'PENDIENTE',
    filas: [],
    rondas: [],
    alerta_otpp: null,
    monto_total: null,
    ...overrides,
  };
}

function makeFilaArea(overrides: Partial<FilaArea> = {}): FilaArea {
  return {
    id: 1,
    area_usuaria: 'DTDIS',
    estado_etapa: 'COMPLETADO',
    fecha_inicio: null,
    fecha_fin: null,
    dias: null,
    ...overrides,
  };
}

// ----------------------------------------------------------------
// No-prereq stages
// ----------------------------------------------------------------

describe("getEtapaActionability — no prerequisites", () => {
  // E03 now has prereq E02b in flujo-real-otin-v2 — verify it is blocked when E02b absent
  it("E03 now has prereq E02b (flujo-real-otin-v2) → blocked when E02b absent", () => {
    const etapa = makeEtapa('E03');
    const result = getEtapaActionability(etapa, [etapa]);
    expect(result.canRegister).toBe(false);
    expect(result.blockedReason).toMatch(/E02b/);
  });

  it("E01a has no prereq → canRegister: true", () => {
    const etapa = makeEtapa('E01a');
    const result = getEtapaActionability(etapa, [etapa]);
    expect(result.canRegister).toBe(true);
    expect(result.blockedReason).toBeNull();
  });
});

// ----------------------------------------------------------------
// E02: prereq is E01c (por_area) — all areas must be COMPLETADO or NO_APLICA
// flujo-real-otin-v2: E01 removed, E01c is the new area-level stage
// ----------------------------------------------------------------

describe("getEtapaActionability — E02 / E01c prereq", () => {
  it("blocked when E01c is PENDIENTE (not completed)", () => {
    const e01c = makeEtapa('E01c', { estado: 'PENDIENTE', por_area: true });
    const e02 = makeEtapa('E02');
    const result = getEtapaActionability(e02, [e01c, e02]);
    expect(result.canRegister).toBe(false);
    expect(result.blockedReason).toMatch(/E01c/i);
  });

  it("blocked when E01c is COMPLETADO but one area row is PENDIENTE", () => {
    const e01c = makeEtapa('E01c', {
      estado: 'COMPLETADO',
      por_area: true,
      filas: [
        makeFilaArea({ area_usuaria: 'DTDIS', estado_etapa: 'COMPLETADO' }),
        makeFilaArea({ area_usuaria: 'OGA', estado_etapa: 'PENDIENTE' }),
      ],
    });
    const e02 = makeEtapa('E02');
    const result = getEtapaActionability(e02, [e01c, e02]);
    expect(result.canRegister).toBe(false);
    expect(result.blockedReason).toContain('OGA');
  });

  it("passes when E01c is COMPLETADO and all area rows are COMPLETADO", () => {
    const e01c = makeEtapa('E01c', {
      estado: 'COMPLETADO',
      por_area: true,
      filas: [
        makeFilaArea({ area_usuaria: 'DTDIS', estado_etapa: 'COMPLETADO' }),
        makeFilaArea({ area_usuaria: 'OGA', estado_etapa: 'COMPLETADO' }),
      ],
    });
    const e02 = makeEtapa('E02');
    const result = getEtapaActionability(e02, [e01c, e02]);
    expect(result.canRegister).toBe(true);
    expect(result.blockedReason).toBeNull();
  });
});

// ----------------------------------------------------------------
// R6 — E05/E06: require E04 COMPLETADO
// ----------------------------------------------------------------

describe("getEtapaActionability — R6 (E05/E06 bucle TDR / E04)", () => {
  it("E05 blocked when E04 absent", () => {
    const e05 = makeEtapa('E05');
    const result = getEtapaActionability(e05, [e05]);
    expect(result.canRegister).toBe(false);
    expect(result.blockedReason).toMatch(/E04/);
  });

  it("E05 blocked when E04 not COMPLETADO", () => {
    const e04 = makeEtapa('E04', { estado: 'EN_CURSO' });
    const e05 = makeEtapa('E05');
    const result = getEtapaActionability(e05, [e04, e05]);
    expect(result.canRegister).toBe(false);
  });

  it("E05 unblocked when E04 COMPLETADO", () => {
    const e04 = makeEtapa('E04', { estado: 'COMPLETADO' });
    const e05 = makeEtapa('E05');
    const result = getEtapaActionability(e05, [e04, e05]);
    expect(result.canRegister).toBe(true);
  });

  it("E06 blocked when E04 not COMPLETADO", () => {
    const e04 = makeEtapa('E04', { estado: 'PENDIENTE' });
    const e06 = makeEtapa('E06');
    const result = getEtapaActionability(e06, [e04, e06]);
    expect(result.canRegister).toBe(false);
  });

  it("E06 unblocked when E04 COMPLETADO", () => {
    const e04 = makeEtapa('E04', { estado: 'COMPLETADO' });
    const e06 = makeEtapa('E06');
    const result = getEtapaActionability(e06, [e04, e06]);
    expect(result.canRegister).toBe(true);
  });
});

// ----------------------------------------------------------------
// R7 — E09: requires E08 COMPLETADO
// ----------------------------------------------------------------

describe("getEtapaActionability — R7 (E09 / E08)", () => {
  it("E09 blocked when E08 absent", () => {
    const e09 = makeEtapa('E09');
    const result = getEtapaActionability(e09, [e09]);
    expect(result.canRegister).toBe(false);
    expect(result.blockedReason).toMatch(/E08/);
  });

  it("E09 blocked when E08 not COMPLETADO", () => {
    const e08 = makeEtapa('E08', { estado: 'EN_CURSO' });
    const e09 = makeEtapa('E09');
    const result = getEtapaActionability(e09, [e08, e09]);
    expect(result.canRegister).toBe(false);
  });

  it("E09 unblocked when E08 COMPLETADO", () => {
    const e08 = makeEtapa('E08', { estado: 'COMPLETADO' });
    const e09 = makeEtapa('E09');
    const result = getEtapaActionability(e09, [e08, e09]);
    expect(result.canRegister).toBe(true);
  });
});

// ----------------------------------------------------------------
// R3 — E12: all E11 areas must be COMPLETADO (not PENDIENTE)
// ----------------------------------------------------------------

describe("getEtapaActionability — R3 (E12 / E11 per-area)", () => {
  it("E12 blocked when E11 has a PENDIENTE area", () => {
    const e11 = makeEtapa('E11', {
      estado: 'COMPLETADO',
      filas: [
        makeFilaArea({ area_usuaria: 'DTDIS', estado_etapa: 'COMPLETADO' }),
        makeFilaArea({ area_usuaria: 'OGA', estado_etapa: 'PENDIENTE' }),
      ],
    });
    const e12 = makeEtapa('E12');
    const result = getEtapaActionability(e12, [e11, e12]);
    expect(result.canRegister).toBe(false);
    expect(result.blockedReason).toContain('OGA');
  });

  it("E12 unblocked when all E11 areas are COMPLETADO", () => {
    const e11 = makeEtapa('E11', {
      estado: 'COMPLETADO',
      filas: [
        makeFilaArea({ area_usuaria: 'DTDIS', estado_etapa: 'COMPLETADO' }),
        makeFilaArea({ area_usuaria: 'OGA', estado_etapa: 'COMPLETADO' }),
      ],
    });
    const e12 = makeEtapa('E12');
    const result = getEtapaActionability(e12, [e11, e12]);
    expect(result.canRegister).toBe(true);
  });
});

// ----------------------------------------------------------------
// R5 — E25: all E24 areas must be COMPLETADO (not PENDIENTE)
// ----------------------------------------------------------------

describe("getEtapaActionability — R5 (E25 / E24 per-area)", () => {
  it("E25 blocked when E24 has a PENDIENTE area", () => {
    const e24 = makeEtapa('E24', {
      estado: 'COMPLETADO',
      filas: [
        makeFilaArea({ area_usuaria: 'DTDIS', estado_etapa: 'COMPLETADO' }),
        makeFilaArea({ area_usuaria: 'ALMACEN', estado_etapa: 'PENDIENTE' }),
      ],
    });
    const e25 = makeEtapa('E25');
    const result = getEtapaActionability(e25, [e24, e25]);
    expect(result.canRegister).toBe(false);
    expect(result.blockedReason).toContain('ALMACEN');
  });

  it("E25 unblocked when all E24 areas are COMPLETADO", () => {
    const e24 = makeEtapa('E24', {
      estado: 'COMPLETADO',
      filas: [
        makeFilaArea({ area_usuaria: 'DTDIS', estado_etapa: 'COMPLETADO' }),
        makeFilaArea({ area_usuaria: 'ALMACEN', estado_etapa: 'COMPLETADO' }),
      ],
    });
    const e25 = makeEtapa('E25');
    const result = getEtapaActionability(e25, [e24, e25]);
    expect(result.canRegister).toBe(true);
  });
});

// ----------------------------------------------------------------
// flujo-real-otin-v2 — Main chain prerequisite (updated)
// Chain: E01a→E01b→E01c→E02→E02b→E03→E04→E07→E08→E09→...→E25
// ----------------------------------------------------------------

describe("getEtapaActionability — main chain (flujo-real-otin-v2)", () => {
  // New chain head: E01b prereqs E01a
  it("PREREQUISITOS contains E01b:['E01a']", () => {
    expect(PREREQUISITOS['E01b']).toEqual(['E01a']);
  });

  it("PREREQUISITOS contains E01c:['E01b']", () => {
    expect(PREREQUISITOS['E01c']).toEqual(['E01b']);
  });

  it("PREREQUISITOS contains E02:['E01c']", () => {
    expect(PREREQUISITOS['E02']).toEqual(['E01c']);
  });

  it("PREREQUISITOS contains E02b:['E02']", () => {
    expect(PREREQUISITOS['E02b']).toEqual(['E02']);
  });

  it("PREREQUISITOS contains E03:['E02b']", () => {
    expect(PREREQUISITOS['E03']).toEqual(['E02b']);
  });

  it("PREREQUISITOS contains E04:['E03']", () => {
    expect(PREREQUISITOS['E04']).toEqual(['E03']);
  });

  it("PREREQUISITOS contains E07:['E04']", () => {
    expect(PREREQUISITOS['E07']).toEqual(['E04']);
  });

  it("PREREQUISITOS contains E08:['E07']", () => {
    expect(PREREQUISITOS['E08']).toEqual(['E07']);
  });

  it("PREREQUISITOS contains E10:['E09']", () => {
    expect(PREREQUISITOS['E10']).toEqual(['E09']);
  });

  it("PREREQUISITOS contains E11:['E10']", () => {
    expect(PREREQUISITOS['E11']).toEqual(['E10']);
  });

  it("PREREQUISITOS contains E13:['E12']", () => {
    expect(PREREQUISITOS['E13']).toEqual(['E12']);
  });

  it("PREREQUISITOS contains E14:['E13']", () => {
    expect(PREREQUISITOS['E14']).toEqual(['E13']);
  });

  it("PREREQUISITOS contains E17:['E16']", () => {
    expect(PREREQUISITOS['E17']).toEqual(['E16']);
  });

  it("PREREQUISITOS contains E24:['E23']", () => {
    expect(PREREQUISITOS['E24']).toEqual(['E23']);
  });

  // Optional loops NOT in chain — existing prereqs unchanged
  it("PREREQUISITOS E05 stays as ['E04'] (loop, not in chain)", () => {
    expect(PREREQUISITOS['E05']).toEqual(['E04']);
  });

  it("PREREQUISITOS E08a stays as ['E08'] (loop, not in chain)", () => {
    expect(PREREQUISITOS['E08a']).toEqual(['E08']);
  });

  it("PREREQUISITOS E06c is ['E04'] (new bucle, anchored to E04)", () => {
    expect(PREREQUISITOS['E06c']).toEqual(['E04']);
  });

  // Functional: E03 blocked when E02b not COMPLETADO
  it("E03 blocked when E02b not COMPLETADO", () => {
    const e02b = makeEtapa('E02b', { estado: 'EN_CURSO' });
    const e03 = makeEtapa('E03');
    const result = getEtapaActionability(e03, [e02b, e03]);
    expect(result.canRegister).toBe(false);
    expect(result.blockedReason).toMatch(/E02b/);
  });

  it("E03 unblocked when E02b COMPLETADO", () => {
    const e02b = makeEtapa('E02b', { estado: 'COMPLETADO' });
    const e03 = makeEtapa('E03');
    const result = getEtapaActionability(e03, [e02b, e03]);
    expect(result.canRegister).toBe(true);
  });

  // E07 blocked when E04 not COMPLETADO; loops (E05/E06) absence is irrelevant
  it("E07 blocked when E04 not COMPLETADO", () => {
    const e04 = makeEtapa('E04', { estado: 'EN_CURSO' });
    const e07 = makeEtapa('E07');
    const result = getEtapaActionability(e07, [e04, e07]);
    expect(result.canRegister).toBe(false);
    expect(result.blockedReason).toMatch(/E04/);
  });

  it("E07 unblocked when E04 COMPLETADO even without E05/E06 (SC-03)", () => {
    // E05/E06 are absent (not in allEtapas) — should not block E07
    const e04 = makeEtapa('E04', { estado: 'COMPLETADO' });
    const e07 = makeEtapa('E07');
    const result = getEtapaActionability(e07, [e04, e07]);
    expect(result.canRegister).toBe(true);
  });

  // blockMessage for new chain pairs uses generic fallback
  it("blockMessage for E07:E04 contains 'E04'", () => {
    const e04 = makeEtapa('E04', { estado: 'PENDIENTE' });
    const e07 = makeEtapa('E07');
    const result = getEtapaActionability(e07, [e04, e07]);
    expect(result.blockedReason).toMatch(/E04/);
  });

  // Late-chain stage: E14 blocked when E13 not COMPLETADO (SC-09)
  it("E14 blocked when E13 not COMPLETADO (SC-09)", () => {
    const e13 = makeEtapa('E13', { estado: 'PENDIENTE' });
    const e14 = makeEtapa('E14');
    const result = getEtapaActionability(e14, [e13, e14]);
    expect(result.canRegister).toBe(false);
    expect(result.blockedReason).toMatch(/E13/);
  });
});

// ----------------------------------------------------------------
// C3c — catalog sync: CODIGOS_CON_ADJUNTOS matches ETAPAS_CONFIG
// ----------------------------------------------------------------

describe("C3c catalog sync — CODIGOS_CON_ADJUNTOS", () => {
  it("ETAPAS_CONFIG entries with acepta_adjuntos=true match CODIGOS_CON_ADJUNTOS exactly", () => {
    const fromConfig = new Set(
      (ETAPAS_CONFIG as readonly { cod: string; acepta_adjuntos?: boolean }[])
        .filter((e) => e.acepta_adjuntos === true)
        .map((e) => e.cod)
    );
    expect(fromConfig.size).toBe(CODIGOS_CON_ADJUNTOS.size);
    // Both sets must be identical
    for (const cod of fromConfig) {
      expect(CODIGOS_CON_ADJUNTOS.has(cod)).toBe(true);
    }
    for (const cod of CODIGOS_CON_ADJUNTOS) {
      expect(fromConfig.has(cod)).toBe(true);
    }
  });

  it("CODIGOS_CON_ADJUNTOS contains all expected key stage codes", () => {
    // flujo-real-otin-v2: E01a/E01b/E01c replace E01; E01 removed
    const expected = [
      'E01a','E01b','E01c','E02','E03','E06','E06b','E07','E08',
      'E09','E11','E13','E14','E15','E16','E19','E20','E22','E24',
    ];
    for (const cod of expected) {
      expect(CODIGOS_CON_ADJUNTOS.has(cod)).toBe(true);
    }
  });

  it("CODIGOS_CON_ADJUNTOS does NOT contain E01 (removed in flujo-real-otin-v2)", () => {
    expect(CODIGOS_CON_ADJUNTOS.has('E01')).toBe(false);
  });

  it("CODIGOS_CON_ADJUNTOS does NOT contain non-key stages", () => {
    const nonKey = ['E02b','E04','E05','E06c','E08a','E08b','E10','E12','E17','E18','E21','E23','E25'];
    for (const cod of nonKey) {
      expect(CODIGOS_CON_ADJUNTOS.has(cod)).toBe(false);
    }
  });

  // Bucle entries: E05, E06, E06b, E06c, E08a, E08b
  it("E06b is in ETAPAS_CONFIG as a bucle entry", () => {
    const e06b = (ETAPAS_CONFIG as readonly { cod: string; es_bucle?: boolean }[])
      .find((e) => e.cod === 'E06b');
    expect(e06b).toBeDefined();
    expect(e06b?.es_bucle).toBe(true);
  });

  it("E06c is in ETAPAS_CONFIG as a bucle entry (new in flujo-real-otin-v2)", () => {
    const e06c = (ETAPAS_CONFIG as readonly { cod: string; es_bucle?: boolean }[])
      .find((e) => e.cod === 'E06c');
    expect(e06c).toBeDefined();
    expect(e06c?.es_bucle).toBe(true);
  });

  it("CODIGOS_CON_ADJUNTOS includes E01a, E01b, E01c (replaces E01)", () => {
    for (const cod of ['E01a', 'E01b', 'E01c']) {
      expect(CODIGOS_CON_ADJUNTOS.has(cod)).toBe(true);
    }
  });

  it("CODIGOS_CON_ADJUNTOS includes E06, E06b, E08, E20, E22", () => {
    for (const cod of ['E06', 'E06b', 'E08', 'E20', 'E22']) {
      expect(CODIGOS_CON_ADJUNTOS.has(cod)).toBe(true);
    }
  });

  // NO_APLICA — prereq satisfaction
  it("NO_APLICA prereq satisfies the next stage (same as COMPLETADO)", () => {
    const e07 = { cod: 'E07', nombre: 'E07', area_responsable: 'OEAS', es_bucle: false,
      por_area: false, estado: 'PENDIENTE' as const, filas: [], rondas: [], alerta_otpp: null, monto_total: null };
    const e04NoAplica = { cod: 'E04', nombre: 'E04', area_responsable: 'OTA', es_bucle: false,
      por_area: false, estado: 'NO_APLICA' as const, filas: [], rondas: [], alerta_otpp: null, monto_total: null };
    const result = getEtapaActionability(e07, [e04NoAplica, e07]);
    expect(result.canRegister).toBe(true);
    expect(result.blockedReason).toBeNull();
  });

  it("NO_APLICA does NOT block E12 R3 check (not counted as PENDIENTE)", () => {
    const e11 = { cod: 'E11', nombre: 'E11', area_responsable: 'AREAS', es_bucle: false,
      por_area: true, estado: 'COMPLETADO' as const,
      filas: [
        { id: 1, area_usuaria: 'DTDIS', estado_etapa: 'COMPLETADO', fecha_inicio: null, fecha_fin: null, dias: null },
        { id: 2, area_usuaria: 'OGA',   estado_etapa: 'NO_APLICA',  fecha_inicio: null, fecha_fin: null, dias: null },
      ],
      rondas: [], alerta_otpp: null, monto_total: null };
    const e12 = { cod: 'E12', nombre: 'E12', area_responsable: 'OTIN', es_bucle: false,
      por_area: false, estado: 'PENDIENTE' as const, filas: [], rondas: [], alerta_otpp: null, monto_total: null };
    const result = getEtapaActionability(e12, [e11, e12]);
    // OGA is NO_APLICA, not PENDIENTE → should not block
    expect(result.canRegister).toBe(true);
  });
});
