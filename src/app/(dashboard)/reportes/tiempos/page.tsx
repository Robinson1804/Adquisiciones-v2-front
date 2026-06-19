"use client";

/**
 * S8 — Análisis de Tiempos (/reportes/tiempos)
 * C4: horizontal bar chart per stage colored by actor + COLORES_ACTOR legend.
 */

import React, { useState } from "react";
import Link from "next/link";
import { useTiemposEtapa } from "@/hooks/useDashboard";
import { GraficoTiempos } from "@/components/dashboard/GraficoTiempos";
import { SelectorAnno } from "@/components/dashboard/SelectorAnno";
import { COLORES_ACTOR } from "@/lib/constants";
import type { ActorKey } from "@/types";

const CURRENT_YEAR = new Date().getFullYear();

const ACTORES = Object.entries(COLORES_ACTOR) as [ActorKey, (typeof COLORES_ACTOR)[ActorKey]][];

export default function TiemposPage() {
  const [anno, setAnno] = useState(CURRENT_YEAR);
  const { data, isLoading, isError } = useTiemposEtapa(anno);

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
          <h1 className="text-xl font-bold text-primary">Análisis de Tiempos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Días promedio por etapa en procesos del año seleccionado.
          </p>
        </div>
        <SelectorAnno value={anno} onChange={setAnno} />
      </div>

      {/* Actor legend */}
      <div className="bg-white border border-outline rounded-lg p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Leyenda — Responsable
        </p>
        <div className="flex flex-wrap gap-2">
          {ACTORES.map(([key, colors]) => (
            <span
              key={key}
              className="text-xs font-medium px-2 py-0.5 rounded"
              style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
            >
              {key}
            </span>
          ))}
        </div>
      </div>

      {/* Chart */}
      {isLoading && (
        <div className="text-center text-gray-500 text-sm py-8" role="status" aria-live="polite">
          Cargando datos de tiempos…
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm" role="alert">
          Error al cargar los datos. Verifique su conexión.
        </div>
      )}

      {!isLoading && !isError && (
        <div className="bg-white border border-outline shadow-card rounded-lg p-6">
          {data && data.etapas.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">
              Sin datos de tiempos para <strong>{anno}</strong>.
            </div>
          ) : (
            <>
              {data?.promedio_global != null && (
                <p className="text-xs text-gray-500 mb-4">
                  Promedio global de todas las etapas:{" "}
                  <strong className="text-primary">{data.promedio_global.toFixed(1)} días</strong>
                  {" "}(línea de referencia punteada).
                </p>
              )}
              <GraficoTiempos
                etapas={data?.etapas ?? []}
                promedioGlobal={data?.promedio_global ?? null}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
