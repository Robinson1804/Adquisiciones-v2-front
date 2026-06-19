"use client";

/**
 * C4 S9 — Grouped bar chart: PIM / EM / Cert / OCS per process.
 * Format S/ es-PE. Recharts GroupedBarChart.
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
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { PresupuestoProceso } from "@/types/dashboard";

const fmt = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

interface GraficoPresupuestoProps {
  procesos: PresupuestoProceso[];
}

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-outline rounded shadow-card p-3 text-xs max-w-52">
      <p className="font-semibold text-primary mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex justify-between gap-3">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-medium">{fmt.format(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function GraficoPresupuesto({ procesos }: GraficoPresupuestoProps) {
  const data = procesos.map((p) => ({
    name: p.id_proceso,
    PIM: p.pim ?? 0,
    EM: p.valor_em ?? 0,
    Cert: p.monto_cert_total ?? 0,
    OCS: p.monto_ocs ?? 0,
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Sin datos presupuestales para este año.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 24, left: 16, bottom: 40 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          angle={-45}
          textAnchor="end"
          tick={{ fontSize: 10 }}
          height={56}
        />
        <YAxis
          tickFormatter={(v: number) =>
            v >= 1_000_000
              ? `S/ ${(v / 1_000_000).toFixed(1)}M`
              : v >= 1_000
              ? `S/ ${(v / 1_000).toFixed(0)}k`
              : `S/ ${v}`
          }
          tick={{ fontSize: 10 }}
          width={72}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="PIM"  name="PIM"  fill="#1f3864" radius={[2, 2, 0, 0]} />
        <Bar dataKey="EM"   name="Est. Mercado" fill="#7B1FA2" radius={[2, 2, 0, 0]} />
        <Bar dataKey="Cert" name="Cert. Pres."  fill="#BF360C" radius={[2, 2, 0, 0]} />
        <Bar dataKey="OCS"  name="OCS"  fill="#0D47A1" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
