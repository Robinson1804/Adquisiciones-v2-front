/**
 * C4 S9 — Table of budget variations per process.
 * Arrows: ▲ rojo (positive = over budget), ▼ verde (negative = savings).
 * Null → "—".
 */

import React from "react";

import type { PresupuestoProceso } from "@/types/dashboard";

const fmt = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

function fmtMonto(v: number | null): string {
  if (v == null) return "—";
  return fmt.format(v);
}

function Variacion({ v }: { v: number | null }) {
  if (v == null) return <span className="text-gray-400">—</span>;
  const isPositive = v > 0;
  return (
    <span
      className="font-medium text-xs"
      style={{ color: isPositive ? "#B71C1C" : "#276221" }}
    >
      {isPositive ? "▲" : "▼"} {Math.abs(v).toFixed(1)}%
    </span>
  );
}

interface TablaVariacionesProps {
  procesos: PresupuestoProceso[];
}

export function TablaVariaciones({ procesos }: TablaVariacionesProps) {
  if (procesos.length === 0) {
    return (
      <div className="text-gray-400 text-sm py-4 text-center">
        Sin datos para mostrar.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="grid">
        <thead className="bg-table-header text-on-surface">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">ID</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">Requerimiento</th>
            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide">PIM</th>
            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide">Val. EM</th>
            <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide">EM vs PIM</th>
            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide">Cert.</th>
            <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide">Cert vs EM</th>
            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide">OCS</th>
            <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide">OCS vs EM</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline">
          {procesos.map((p) => (
            <tr key={p.id} className="hover:bg-surface-content transition-colors">
              <td className="px-3 py-2 font-mono text-xs text-gray-700">{p.id_proceso}</td>
              <td className="px-3 py-2 text-gray-800 max-w-xs">
                <span title={p.requerimiento}>
                  {p.requerimiento.length > 45
                    ? p.requerimiento.slice(0, 45) + "…"
                    : p.requerimiento}
                </span>
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs">{fmtMonto(p.pim)}</td>
              <td className="px-3 py-2 text-right font-mono text-xs">{fmtMonto(p.valor_em)}</td>
              <td className="px-3 py-2 text-center"><Variacion v={p.var_em_vs_pim} /></td>
              <td className="px-3 py-2 text-right font-mono text-xs">{fmtMonto(p.monto_cert_total)}</td>
              <td className="px-3 py-2 text-center"><Variacion v={p.var_cert_vs_em} /></td>
              <td className="px-3 py-2 text-right font-mono text-xs">{fmtMonto(p.monto_ocs)}</td>
              <td className="px-3 py-2 text-center"><Variacion v={p.var_ocs_vs_em} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
