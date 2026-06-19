/**
 * fases.ts — agrupa el catálogo de 32 etapas en las 5 FASES del
 * flujo-real-otin-v2 y calcula el resumen por fase a partir de
 * EtapaAgrupada[] (lo que ya devuelve useEtapas).
 *
 * Coexiste con FASES_CONFIG/FaseKey (legado — usado por dashboard/MiniTimeline).
 */

import type { EtapaAgrupada } from "@/types/etapa";

// ============================================================
// LEGACY — usado por dashboard/MiniTimeline. No tocar firma.
// C4 mirrors backend FASES dict en etapas_catalogo.py.
// ============================================================
export const FASES_CONFIG = [
  { fase: "F1", label: "Requerimiento y TDR",         color: "#1f3864" },
  { fase: "F2", label: "Indagación y Evaluación",      color: "#7B1FA2" },
  { fase: "F3", label: "Presupuesto y Certificación",  color: "#BF360C" },
  { fase: "F4", label: "Orden y Ejecución",            color: "#0D47A1" },
  { fase: "F5", label: "Conformidad",                  color: "#276221" },
] as const;

export type FaseKey = (typeof FASES_CONFIG)[number]["fase"];

// ============================================================
// MAPA DEL PROCESO — usado por MapaProceso/LineaTiempo
// ============================================================
export interface FaseDef {
  num: number;
  id: string;
  nombre: string;
  corto: string;
}

export const FASES: FaseDef[] = [
  { num: 1, id: "F1", nombre: "Requerimiento y TDR",        corto: "Requerimiento" },
  { num: 2, id: "F2", nombre: "Indagación y Evaluación",     corto: "Indagación" },
  { num: 3, id: "F3", nombre: "Presupuesto y Certificación", corto: "Presupuesto" },
  { num: 4, id: "F4", nombre: "Orden y Ejecución",           corto: "Orden" },
  { num: 5, id: "F5", nombre: "Conformidad",                 corto: "Conformidad" },
];

// Mapeo cod → nº de fase. Fuente: ETAPAS_CONFIG (constants.ts).
export const FASE_DE_ETAPA: Record<string, number> = {
  E01a: 1, E01b: 1, E01c: 1, E02: 1, E02b: 1,
  E03: 2, E04: 2, E05: 2, E06: 2, E06b: 2, E06c: 2, E07: 2, E08: 2, E08a: 2, E08b: 2,
  E09: 3, E10: 3, E11: 3, E12: 3, E13: 3, E14: 3, E15: 3, E16: 3,
  E17: 4, E18: 4, E19: 4, E20: 4, E21: 4, E22: 4,
  E23: 5, E24: 5, E25: 5,
};

export function faseDeEtapa(cod: string): number {
  return FASE_DE_ETAPA[cod] ?? 1;
}

export type EstadoFase = "COMPLETADO" | "EN_CURSO" | "PENDIENTE";

export interface ResumenFase {
  num: number;
  total: number;        // etapas en cadena (sin bucles) de la fase
  completadas: number;
  estado: EstadoFase;
  dias: number;         // suma de días de las etapas de la fase
  etapas: EtapaAgrupada[]; // etapas visibles de la fase (bucles sin rondas ocultos)
}

/** Nombre corto para chips: quita "[BUCLE]" y el flujo entre paréntesis al final. */
export function nombreCorto(nombre: string): string {
  return nombre
    .replace(/\s*\[BUCLE\]\s*/i, " ")
    .replace(/\s*\([^()]*\)\s*$/, "")
    .trim();
}

/** ¿Se muestra la etapa? Oculta bucles sin rondas (igual que LineaTiempo actual). */
export function etapaVisible(e: EtapaAgrupada): boolean {
  if (!e.es_bucle) return true;
  return (e.rondas?.length ?? 0) > 0;
}

export function resumenFase(num: number, etapas: EtapaAgrupada[]): ResumenFase {
  const list = etapas.filter((e) => faseDeEtapa(e.cod) === num && etapaVisible(e));
  const cadena = list.filter((e) => !e.es_bucle);
  const total = cadena.length;
  const completadas = cadena.filter((e) => e.estado === "COMPLETADO").length;
  const enCurso = list.some((e) => e.estado === "EN_CURSO");

  let estado: EstadoFase = "PENDIENTE";
  if (total > 0 && completadas === total) estado = "COMPLETADO";
  else if (enCurso || completadas > 0) estado = "EN_CURSO";

  const dias = list.reduce((s, e) => s + (e.filas[0]?.dias ?? 0), 0);

  return { num, total, completadas, estado, dias, etapas: list };
}
