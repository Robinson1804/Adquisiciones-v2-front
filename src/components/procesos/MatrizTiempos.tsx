"use client";

/**
 * matriz-tiempos — MatrizTiempos presentational component.
 * Renders a heatmap table of cross-process timing data.
 *
 * Props:
 *   data       — MatrizTiempos from GET /tiempos/matriz (undefined while loading)
 *   isLoading  — true while the query is in flight
 *   isError    — true if the query failed
 *
 * Column order: ID | Requerimiento | PIM | Estado | <hito cols> | TOTAL
 * Heatmap scale: RELATIVE to the max non-null, non-total cell value across
 * the whole matrix. Five Tailwind bg classes from cool (low) to warm (high).
 * Null cells render as "—" with a neutral gray background.
 * Process rows are clickable → navigate to /procesos/{proceso_id}.
 * The PROMEDIO footer row is NOT clickable.
 */

import React from "react";
import { useRouter } from "next/navigation";
import type { MatrizTiempos as MatrizTiemposData } from "@/types/etapa";
import { COLORES_ESTADO } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Heatmap helper — exported for unit-test of colorClasePorDias
// ---------------------------------------------------------------------------

/**
 * Return a Tailwind bg class based on the ratio dias / max.
 * 5 buckets from coolest (emerald-50) to warmest (red-500).
 * Returns neutral-gray when dias is null or max is 0.
 */
export function colorClasePorDias(
  dias: number | null,
  max: number
): string {
  if (dias === null || max === 0) return "bg-gray-100 text-gray-400";
  const ratio = dias / max;
  if (ratio <= 0.2) return "bg-emerald-50 text-emerald-800";
  if (ratio <= 0.4) return "bg-amber-100 text-amber-800";
  if (ratio <= 0.6) return "bg-orange-200 text-orange-800";
  if (ratio <= 0.8) return "bg-red-300 text-red-900";
  return "bg-red-500 text-white";
}

// ---------------------------------------------------------------------------
// PIM formatter — mirrors the format used in the procesos list table
// ---------------------------------------------------------------------------
function formatPim(pim: number | null): string {
  if (pim === null) return "—";
  return `S/ ${pim.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// Estado badge — mirrors EstadoBadge in procesos/page.tsx
// ---------------------------------------------------------------------------
const ESTADO_COLOR_KEY: Record<string, keyof typeof COLORES_ESTADO> = {
  "EN PROCESO": "EN_CURSO",
  "CULMINADO":  "COMPLETADO",
  "CANCELADO":  "CANCELADO",
};

function EstadoBadge({ estado }: { estado: string }) {
  const key = ESTADO_COLOR_KEY[estado] ?? "PENDIENTE";
  const color = COLORES_ESTADO[key];
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-lg whitespace-nowrap"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {estado}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  data: MatrizTiemposData | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function MatrizTiempos({ data, isLoading, isError }: Props) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div
        className="bg-white border border-outline shadow-card rounded-lg p-6 text-center
                   text-sm text-gray-500"
        role="status"
        aria-live="polite"
      >
        Cargando matriz de tiempos...
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="bg-white border border-outline shadow-card rounded-lg p-6 text-center
                   text-sm text-red-600"
        role="alert"
      >
        Error al cargar la matriz de tiempos.
      </div>
    );
  }

  if (!data || data.filas.length === 0) {
    return (
      <div
        className="bg-white border border-outline shadow-card rounded-lg p-6 text-center
                   text-sm text-gray-400"
      >
        No hay procesos para los filtros seleccionados.
      </div>
    );
  }

  // Compute max cell value across all hito columns (exclude TOTAL col for scale)
  const hitoColCount = data.columnas.filter((c) => c.cod !== null).length;
  let maxVal = 0;
  for (const fila of data.filas) {
    for (let i = 0; i < hitoColCount; i++) {
      const v: number | null | undefined = fila.celdas[i];
      if (v !== null && v !== undefined && v > maxVal) maxVal = v;
    }
  }

  // Number of extra fixed columns before the hito columns (ID, Req, PIM, Estado)
  // Used for colSpan in the PROMEDIO footer
  const FIXED_COLS = 4;

  return (
    <div className="bg-white border border-outline shadow-card rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-outline">
        <h2 className="text-sm font-semibold text-primary">
          Matriz de Tiempos por Proceso
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Días por etapa hito — escala relativa al máximo ({maxVal} días). Clic en una fila para ver el detalle.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs" role="grid">
          <thead className="bg-table-header text-on-surface">
            <tr>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide sticky left-0 bg-table-header z-10 min-w-20">
                ID
              </th>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide min-w-40">
                Requerimiento
              </th>
              <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide min-w-28 whitespace-nowrap">
                PIM
              </th>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide min-w-28 whitespace-nowrap">
                Estado
              </th>
              {data.columnas.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-center font-semibold uppercase tracking-wide min-w-16 whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline">
            {data.filas.map((fila) => (
              <tr
                key={fila.proceso_id}
                className="hover:bg-surface-content transition-colors cursor-pointer"
                onClick={() => router.push(`/procesos/${fila.proceso_id}`)}
                role="row"
                aria-label={`Ver detalle del proceso ${fila.id_proceso}`}
              >
                <td className="px-3 py-2 font-mono text-gray-700 sticky left-0 bg-white">
                  {fila.id_proceso}
                </td>
                <td className="px-3 py-2 text-gray-800 max-w-xs">
                  <span title={fila.requerimiento}>
                    {fila.requerimiento.length > 50
                      ? fila.requerimiento.slice(0, 50) + "…"
                      : fila.requerimiento}
                  </span>
                </td>
                {/* PIM column — right-aligned, no heatmap */}
                <td className="px-3 py-2 text-right font-mono text-gray-700">
                  {formatPim(fila.pim)}
                </td>
                {/* Estado column — badge, no heatmap */}
                <td className="px-3 py-2">
                  <EstadoBadge estado={fila.estado} />
                </td>
                {/* Hito columns — heatmap */}
                {fila.celdas.map((val, i) => {
                  const col = data.columnas[i];
                  return (
                    <td
                      key={col?.key ?? i}
                      className={`px-3 py-2 text-center font-mono ${colorClasePorDias(val, maxVal)}`}
                    >
                      {val !== null && val !== undefined ? val : "—"}
                    </td>
                  );
                })}
                {/* TOTAL column — keeps existing gray styling */}
                <td className="px-3 py-2 text-center font-mono font-semibold text-gray-700 bg-gray-50">
                  {fila.total_dias}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-outline">
            <tr>
              <td
                colSpan={FIXED_COLS}
                className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide"
              >
                Promedio
              </td>
              {data.columnas.map((col, i) => (
                <td
                  key={col.key}
                  className="px-3 py-2 text-center font-mono text-gray-600"
                >
                  {data.promedios[i] !== null && data.promedios[i] !== undefined
                    ? Math.round(data.promedios[i]!)
                    : "—"}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
