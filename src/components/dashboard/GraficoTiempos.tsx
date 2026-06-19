"use client";

/**
 * C4 S8 — Horizontal bar chart: average days per stage colored by actor.
 * Uses Recharts BarChart layout="vertical" + Cell per bar.
 * ReferenceLine at promedio_global (D2 comparativa baseline).
 * GOTCHA: must be "use client" — Recharts requires browser/client.
 */

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { COLORES_ACTOR } from "@/lib/constants";
import type { TiempoEtapa } from "@/types/dashboard";
import type { ActorKey } from "@/types";

interface GraficoTiemposProps {
  etapas: TiempoEtapa[];
  promedioGlobal: number | null;
}

function getActorColor(area: string | null): string {
  if (!area) return "#9E9E9E";
  const key = area as ActorKey;
  if (key in COLORES_ACTOR) {
    return COLORES_ACTOR[key].border;
  }
  return "#9E9E9E";
}

interface TooltipPayload {
  value: number;
  payload: TiempoEtapa & { dias_promedio: number };
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;
  const first = payload[0];
  if (!first) return null;
  const d = first.payload;
  return (
    <div className="bg-white border border-outline rounded shadow-card p-3 text-xs max-w-48">
      <p className="font-semibold text-primary mb-1">{label}</p>
      <p className="text-gray-700">{d.nombre}</p>
      <p className="text-gray-500 mt-1">Actor: {d.area_responsable ?? "—"}</p>
      <p className="text-gray-700 font-medium mt-1">
        {d.dias_promedio != null ? `${d.dias_promedio.toFixed(1)} días promedio` : "Sin datos"}
      </p>
      <p className="text-gray-400">n = {d.n} procesos</p>
    </div>
  );
}

export function GraficoTiempos({ etapas, promedioGlobal }: GraficoTiemposProps) {
  const data = etapas.map((e) => ({
    ...e,
    dias_promedio: e.dias_promedio ?? 0,
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Sin datos de tiempos para este año.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 36, 300)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 48, left: 80, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          unit=" días"
          tick={{ fontSize: 11 }}
          tickCount={6}
        />
        <YAxis
          type="category"
          dataKey="codigo"
          tick={{ fontSize: 11 }}
          width={76}
        />
        <Tooltip content={<CustomTooltip />} />
        {promedioGlobal != null && (
          <ReferenceLine
            x={promedioGlobal}
            stroke="#1f3864"
            strokeDasharray="4 2"
            label={{
              value: `Prom. global: ${promedioGlobal.toFixed(1)}d`,
              position: "insideTopRight",
              fontSize: 10,
              fill: "#1f3864",
            }}
          />
        )}
        <Bar dataKey="dias_promedio" name="Días promedio" radius={[0, 3, 3, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.codigo}
              fill={getActorColor(entry.area_responsable)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
