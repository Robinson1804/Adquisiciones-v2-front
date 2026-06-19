"use client";

/**
 * C4 S10 — Bar chart: cert (E11) and conformidad (E24) days per area.
 * Two series side by side. Recharts BarChart.
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
import type { DemoraArea } from "@/types/dashboard";

interface GraficoAreasProps {
  areas: DemoraArea[];
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
          <span className="font-medium">{entry.value.toFixed(1)} días</span>
        </div>
      ))}
    </div>
  );
}

export function GraficoAreas({ areas }: GraficoAreasProps) {
  const data = areas.map((a) => ({
    area: a.area_usuaria,
    "Cert. (E11)": a.e11_dias_promedio ?? 0,
    "Conformidad (E24)": a.e24_dias_promedio ?? 0,
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Sin datos de demora por área para este año.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 24, left: 16, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="area"
          angle={-35}
          textAnchor="end"
          tick={{ fontSize: 10 }}
          height={56}
        />
        <YAxis
          unit=" d"
          tick={{ fontSize: 10 }}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Cert. (E11)"       fill="#BF360C" radius={[2, 2, 0, 0]} />
        <Bar dataKey="Conformidad (E24)" fill="#276221" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
