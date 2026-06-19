"use client";

/**
 * S10 — Trazabilidad Áreas (/reportes/areas)
 * C4: bars per area (E11 cert + E24 conformidad) + semáforo table.
 */

import React, { useState } from "react";
import Link from "next/link";
import { useDemoraAreas } from "@/hooks/useDashboard";
import { GraficoAreas } from "@/components/dashboard/GraficoAreas";
import { TablaSemaforo } from "@/components/dashboard/TablaSemaforo";
import { SelectorAnno } from "@/components/dashboard/SelectorAnno";

const CURRENT_YEAR = new Date().getFullYear();

export default function AreasPage() {
  const [anno, setAnno] = useState(CURRENT_YEAR);
  const { data, isLoading, isError } = useDemoraAreas(anno);

  const areas = data?.areas ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-xs text-gray-400 hover:text-primary mb-1 inline-block"
          >
            ← Dashboard
          </Link>
          <h1 className="text-xl font-bold text-primary">Trazabilidad por Área</h1>
          <p className="text-sm text-gray-500 mt-1">
            Demora promedio en certificación (E11) y conformidad (E24) por área usuaria.
          </p>
        </div>
        <SelectorAnno value={anno} onChange={setAnno} />
      </div>

      {/* Semáforo legend */}
      <div className="bg-white border border-outline rounded-lg p-4 flex flex-wrap gap-3 items-center">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-1">Semáforo:</span>
        {[
          { label: "Bueno (≤7 d)",      bg: "#C6EFCE", text: "#276221" },
          { label: "Atención (8-15 d)", bg: "#FFEB9C", text: "#9C5700" },
          { label: "Demora (>15 d)",    bg: "#FFCDD2", text: "#B71C1C" },
        ].map((s) => (
          <span
            key={s.label}
            className="text-xs font-medium px-2 py-0.5 rounded"
            style={{ backgroundColor: s.bg, color: s.text }}
          >
            {s.label}
          </span>
        ))}
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm" role="alert">
          Error al cargar datos. Verifique su conexión.
        </div>
      )}

      {isLoading && (
        <div className="text-center text-gray-500 text-sm py-8" role="status" aria-live="polite">
          Cargando datos por área…
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {areas.length === 0 ? (
            <div className="bg-white border border-outline rounded-lg p-12 text-center">
              <p className="text-gray-400 text-sm">
                Sin datos de demora para <strong>{anno}</strong>. Seleccione otro año.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-outline shadow-card rounded-lg p-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">
                  Días promedio de demora por área
                </h2>
                <GraficoAreas areas={areas} />
              </div>

              <div className="bg-white border border-outline shadow-card rounded-lg p-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">
                  Tabla semáforo de demora por área
                </h2>
                <TablaSemaforo areas={areas} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
