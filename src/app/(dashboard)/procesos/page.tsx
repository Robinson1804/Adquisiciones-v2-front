"use client";

/**
 * S2 — Lista de Procesos (/procesos)
 * Layout: metric cards → filter bar → timing heatmap matrix.
 * The old bottom procesos list table has been removed; the matrix is
 * the primary view. The search text (q) filters the matrix rows.
 */

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useMetricas } from "@/hooks/useDashboard";
import { useExportExcel } from "@/hooks/useExport";
import { useMatrizTiempos } from "@/hooks/useMatrizTiempos";
import { MatrizTiempos } from "@/components/procesos/MatrizTiempos";
import type { EstadoProceso, TipoProceso } from "@/types";

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------
const CURRENT_YEAR = new Date().getFullYear();
const ANNO_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

// ----------------------------------------------------------------
// MetricCard
// ----------------------------------------------------------------
function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-white border border-outline shadow-card rounded-lg p-5 flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-2xl font-bold text-primary">{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

// ----------------------------------------------------------------
// useDebounce — 300ms
// ----------------------------------------------------------------
function useDebounce(value: string, delay = 300): string {
  const [debounced, setDebounced] = useState(value);
  const [, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handler = useCallback(
    (v: string) => {
      setTimer((prev) => {
        if (prev) clearTimeout(prev);
        return setTimeout(() => setDebounced(v), delay);
      });
    },
    [delay]
  );

  if (value !== debounced) {
    handler(value);
  }

  return debounced;
}

// ----------------------------------------------------------------
// Main page
// ----------------------------------------------------------------
export default function ProcesosPage() {
  const { user } = useAuthStore();
  const puedeEscribir =
    user?.rol === "ADMIN" || user?.rol === "EDITOR";

  // C5 — Excel export
  const { trigger: downloadExcel, isLoading: isExporting, error: exportError } =
    useExportExcel();

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [estado, setEstado] = useState<EstadoProceso | "">("");
  const [tipo, setTipo] = useState<TipoProceso | "">("");
  const [anno, setAnno] = useState<number | "">(CURRENT_YEAR);

  const search = useDebounce(searchInput);

  const handleFilterChange = useCallback(() => {}, []);

  // matriz-tiempos — all filters including `q` search text
  const matrizFiltros = {
    ...(anno ? { anno } : {}),
    ...(estado ? { estado: estado as string } : {}),
    ...(tipo ? { tipo: tipo as string } : {}),
    ...(search ? { q: search } : {}),
  };
  const {
    data: matrizData,
    isLoading: isMatrizLoading,
    isError: isMatrizError,
  } = useMatrizTiempos(matrizFiltros);

  // C4: metric cards from /dashboard/metricas
  const metricAnno = anno || CURRENT_YEAR;
  const { data: metricas } = useMetricas(metricAnno);

  const fmt = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const pimStr = metricas?.pim_total != null ? fmt.format(metricas.pim_total) : "—";
  const diasStr = metricas?.dias_promedio != null ? `${metricas.dias_promedio.toFixed(1)} d` : "—";

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-primary">
          Adquisiciones TIC {anno || ""}
        </h1>
        <div className="flex items-center gap-2">
          {/* C5 — Excel export: available to all authenticated roles */}
          <button
            onClick={() => void downloadExcel(anno || CURRENT_YEAR)}
            disabled={isExporting}
            className="border border-outline text-primary font-semibold px-4 py-2 rounded text-sm
                       hover:bg-surface-content transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Exportar procesos a Excel"
          >
            {isExporting ? "Exportando..." : "Exportar Excel"}
          </button>
          {puedeEscribir && (
            <Link
              href="/procesos/nuevo"
              className="bg-primary text-white font-semibold px-4 py-2 rounded text-sm
                         hover:bg-primary-container transition-colors"
              aria-label="Crear nuevo proceso de adquisición"
            >
              + Nuevo Proceso
            </Link>
          )}
        </div>
      </div>
      {/* C5 — Export error feedback */}
      {exportError && (
        <p className="text-sm text-red-600" role="alert">
          {exportError}
        </p>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard label="Total Procesos" value={matrizData?.filas.length ?? "—"} />
        <MetricCard label="En Proceso"     value={metricas?.en_proceso ?? "—"} />
        <MetricCard label="Culminados"     value={metricas?.culminados ?? "—"} />
        <MetricCard label="Cancelados"     value={metricas?.cancelados ?? "—"} />
        <MetricCard
          label="PIM Total"
          value={pimStr}
          sub={!anno ? `(año ${CURRENT_YEAR})` : undefined}
        />
        <MetricCard
          label="Días Promedio"
          value={diasStr}
          sub={!anno ? `(año ${CURRENT_YEAR})` : "culminados"}
        />
      </div>

      {/* Filter bar — ABOVE the matrix */}
      <div className="bg-white border border-outline shadow-card rounded-lg p-4 flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="flex flex-col gap-1 flex-1 min-w-48">
          <label htmlFor="search" className="text-xs font-medium text-gray-600">
            Buscar: ID o requerimiento
          </label>
          <input
            id="search"
            type="text"
            placeholder="ID o requerimiento..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              handleFilterChange();
            }}
            className="border border-outline rounded px-3 py-2 text-sm focus:outline-none
                       focus:ring-2 focus:ring-primary/30"
            aria-label="Buscar por ID o requerimiento"
          />
        </div>

        {/* Estado */}
        <div className="flex flex-col gap-1">
          <label htmlFor="estado" className="text-xs font-medium text-gray-600">
            Estado
          </label>
          <select
            id="estado"
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as EstadoProceso | "");
              handleFilterChange();
            }}
            className="border border-outline rounded px-3 py-2 text-sm focus:outline-none
                       focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Todos</option>
            <option value="EN PROCESO">EN PROCESO</option>
            <option value="CULMINADO">CULMINADO</option>
            <option value="CANCELADO">CANCELADO</option>
          </select>
        </div>

        {/* Tipo */}
        <div className="flex flex-col gap-1">
          <label htmlFor="tipo" className="text-xs font-medium text-gray-600">
            Tipo
          </label>
          <select
            id="tipo"
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as TipoProceso | "");
              handleFilterChange();
            }}
            className="border border-outline rounded px-3 py-2 text-sm focus:outline-none
                       focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Todos</option>
            <option value="BIEN">BIEN</option>
            <option value="SERVICIO">SERVICIO</option>
          </select>
        </div>

        {/* Año */}
        <div className="flex flex-col gap-1">
          <label htmlFor="anno" className="text-xs font-medium text-gray-600">
            Año
          </label>
          <select
            id="anno"
            value={anno}
            onChange={(e) => {
              setAnno(e.target.value ? Number(e.target.value) : "");
              handleFilterChange();
            }}
            className="border border-outline rounded px-3 py-2 text-sm focus:outline-none
                       focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Todos</option>
            {ANNO_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Heatmap matrix — primary view */}
      <MatrizTiempos
        data={matrizData}
        isLoading={isMatrizLoading}
        isError={isMatrizError}
      />
    </div>
  );
}
