"use client";

/**
 * DonutEstados — Recharts donut chart for acquisition states.
 * Uses COLORES_ESTADO tokens for consistency across the app.
 */

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { COLORES_ESTADO } from "@/lib/constants";

interface DonutEstadosProps {
  enProceso: number;
  culminados: number;
  cancelados: number;
}

const SLICES = [
  { key: "En Proceso",  colorToken: COLORES_ESTADO.EN_CURSO   },
  { key: "Culminado",   colorToken: COLORES_ESTADO.COMPLETADO },
  { key: "Cancelado",   colorToken: COLORES_ESTADO.CANCELADO  },
] as const;

export function DonutEstados({
  enProceso,
  culminados,
  cancelados,
}: DonutEstadosProps) {
  const rawData = [
    { name: "En Proceso", value: enProceso,  color: COLORES_ESTADO.EN_CURSO.bg   },
    { name: "Culminado",  value: culminados, color: COLORES_ESTADO.COMPLETADO.bg },
    { name: "Cancelado",  value: cancelados, color: COLORES_ESTADO.CANCELADO.bg  },
  ];

  // Filter out zero-value slices so the chart doesn't render invisible arcs.
  const data = rawData.filter((d) => d.value > 0);

  const total = enProceso + culminados + cancelados;

  return (
    <div className="bg-white border border-outline shadow-card rounded-lg p-4 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-gray-700">
        Estado de Requerimientos
      </h2>

      {total === 0 ? (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          Sin datos
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [value, name]}
              />
              <Legend
                iconType="circle"
                iconSize={10}
                formatter={(value) => (
                  <span className="text-xs text-gray-600">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Count summary below chart */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-outline">
            {SLICES.map(({ key, colorToken }) => {
              const val =
                key === "En Proceso"
                  ? enProceso
                  : key === "Culminado"
                  ? culminados
                  : cancelados;
              return (
                <div key={key} className="flex flex-col items-center gap-0.5">
                  <span
                    className="text-xl font-bold"
                    style={{ color: colorToken.text }}
                  >
                    {val}
                  </span>
                  <span className="text-xs text-gray-500 text-center leading-tight">
                    {key}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
