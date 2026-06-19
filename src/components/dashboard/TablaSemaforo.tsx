/**
 * C4 S10 — Semáforo table for delay by area.
 * Cells colored: verde #C6EFCE, amarillo #FFEB9C, rojo #FFCDD2 (aligns with COLORES_ESTADO).
 * Null → "—".
 */

import React from "react";

import type { DemoraArea, Semaforo } from "@/types/dashboard";

const SEMAFORO_COLORES: Record<NonNullable<Semaforo>, { bg: string; text: string }> = {
  verde:    { bg: "#C6EFCE", text: "#276221" },
  amarillo: { bg: "#FFEB9C", text: "#9C5700" },
  rojo:     { bg: "#FFCDD2", text: "#B71C1C" },
};

function SemaforoCelda({ semaforo, dias }: { semaforo: Semaforo; dias: number | null }) {
  if (semaforo == null || dias == null) {
    return <span className="text-gray-400 text-xs">—</span>;
  }
  const color = SEMAFORO_COLORES[semaforo];
  return (
    <span
      className="inline-block text-xs font-medium px-2 py-0.5 rounded"
      style={{ backgroundColor: color.bg, color: color.text }}
      data-semaforo={semaforo}
    >
      {dias.toFixed(1)} d
    </span>
  );
}

interface TablaSemaforoProps {
  areas: DemoraArea[];
}

export function TablaSemaforo({ areas }: TablaSemaforoProps) {
  if (areas.length === 0) {
    return (
      <div className="text-gray-400 text-sm py-4 text-center">
        Sin datos de demora para este año.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="grid">
        <thead className="bg-table-header text-on-surface">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">Área</th>
            <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide">
              Cert. Pres. (E11) <span className="normal-case font-normal text-gray-500">prom. días</span>
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide">
              Proc. E11
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide">
              Conformidad (E24) <span className="normal-case font-normal text-gray-500">prom. días</span>
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide">
              Proc. E24
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline">
          {areas.map((a) => (
            <tr key={a.area_usuaria} className="hover:bg-surface-content transition-colors">
              <td className="px-3 py-2 font-medium text-gray-800">{a.area_usuaria}</td>
              <td className="px-3 py-2 text-center">
                <SemaforoCelda semaforo={a.semaforo_e11} dias={a.e11_dias_promedio} />
              </td>
              <td className="px-3 py-2 text-center text-xs text-gray-500">{a.e11_n}</td>
              <td className="px-3 py-2 text-center">
                <SemaforoCelda semaforo={a.semaforo_e24} dias={a.e24_dias_promedio} />
              </td>
              <td className="px-3 py-2 text-center text-xs text-gray-500">{a.e24_n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
