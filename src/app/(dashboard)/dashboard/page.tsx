"use client";

/**
 * Dashboard Gerencial — single executive view for Adquisiciones TIC.
 * Consolidates KPIs, stage-flow detail, donut chart and acquisitions table.
 */

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useMetricas, useFlujoProcesos } from "@/hooks/useDashboard";
import { useProcesos } from "@/hooks/useProcesos";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SelectorAnno } from "@/components/dashboard/SelectorAnno";
import { LineaEtapasHorizontal } from "@/components/dashboard/LineaEtapasHorizontal";
import { DonutEstados } from "@/components/dashboard/DonutEstados";
import { COLORES_ESTADO } from "@/lib/constants";
import type { EstadoProceso, TipoProceso } from "@/types";

const CURRENT_YEAR = new Date().getFullYear();

const ESTADO_COLOR_MAP: Record<EstadoProceso, keyof typeof COLORES_ESTADO> = {
  "EN PROCESO": "EN_CURSO",
  CULMINADO: "COMPLETADO",
  CANCELADO: "CANCELADO",
};

function EstadoBadge({ estado }: { estado: string }) {
  const key = ESTADO_COLOR_MAP[estado as EstadoProceso] ?? "OMITIDO";
  const color = COLORES_ESTADO[key] ?? COLORES_ESTADO.OMITIDO;
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-lg whitespace-nowrap"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {estado}
    </span>
  );
}

const fmt = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// Available unidad_resp values derived from loaded data
const TIPOS: Array<{ value: TipoProceso | ""; label: string }> = [
  { value: "",         label: "Todos los tipos" },
  { value: "BIEN",     label: "Bien" },
  { value: "SERVICIO", label: "Servicio" },
];

export default function DashboardPage() {
  const [anno, setAnno] = useState(CURRENT_YEAR);
  const [unidad, setUnidad] = useState<string>("");
  const [tipo, setTipo]     = useState<TipoProceso | "">("");
  const [selectedProcesoId, setSelectedProcesoId] = useState<number | null>(null);

  // ── data sources ──────────────────────────────────────────────────
  const metricas     = useMetricas(anno);
  const flujo        = useFlujoProcesos(anno);
  // Load procesos for the year; tipo/unidad are filtered client-side below
  // (the backend `area` filter targets areas_usuarias, not unidad_resp).
  // page_size capped at 100 by the backend (le=100).
  const procesosQuery = useProcesos({ anno, page_size: 100 });

  const m         = metricas.data;
  const flujoList = flujo.data?.procesos ?? [];
  const procesosList = procesosQuery.data?.items ?? [];

  // Client-side filter by tipo + unidad_resp
  const procesosFiltrados = useMemo(
    () =>
      procesosList.filter(
        (p) =>
          (!tipo || p.tipo === tipo) &&
          (!unidad || p.unidad_resp === unidad)
      ),
    [procesosList, tipo, unidad]
  );

  // ── derived values ────────────────────────────────────────────────
  const pimStr  = m?.pim_total  != null ? fmt.format(m.pim_total)              : "—";
  const diasStr = m?.dias_promedio != null ? `${m.dias_promedio.toFixed(1)} días` : "—";

  // Unidad options from loaded procesos
  const unidadOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const p of procesosList) {
      if (p.unidad_resp) seen.add(p.unidad_resp);
    }
    return Array.from(seen).sort();
  }, [procesosList]);

  // The acquisition selector list — filtered by tipo/unidad via the client-filtered set
  const filteredFlujo = useMemo(() => {
    if (!unidad && !tipo) return flujoList;
    const allowedIds = new Set(procesosFiltrados.map((p) => p.id));
    return flujoList.filter((p) => allowedIds.has(p.id));
  }, [flujoList, procesosFiltrados, unidad, tipo]);

  // Auto-select first proceso when list loads / changes
  useEffect(() => {
    if (filteredFlujo.length > 0) {
      const firstId = filteredFlujo[0]?.id;
      if (firstId !== undefined) {
        setSelectedProcesoId((prev) =>
          filteredFlujo.some((p) => p.id === prev) ? prev : firstId
        );
      }
    } else {
      setSelectedProcesoId(null);
    }
  }, [filteredFlujo]);

  // Merge flujo porcentaje with procesosQuery for the table
  const porcentajeById = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of flujoList) map.set(p.id, p.porcentaje);
    return map;
  }, [flujoList]);

  return (
    <div className="space-y-6">
      {/* ── 1. Header ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-primary">
          Dashboard Adquisiciones TIC {anno}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <SelectorAnno value={anno} onChange={setAnno} />

          {/* Unidad Responsable filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-unidad" className="text-xs font-medium text-gray-600 whitespace-nowrap">
              Unidad
            </label>
            <select
              id="filter-unidad"
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
              className="border border-outline rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Todas</option>
              {unidadOptions.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Tipo filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-tipo" className="text-xs font-medium text-gray-600 whitespace-nowrap">
              Tipo
            </label>
            <select
              id="filter-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoProceso | "")}
              className="border border-outline rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <Link
            href="/presentacion"
            className="text-xs border border-primary text-primary rounded px-3 py-1.5
                       hover:bg-primary hover:text-white transition-colors"
          >
            Modo Presentación
          </Link>
        </div>
      </div>

      {/* ── 2. KPI cards ────────────────────────────────────────────── */}
      {metricas.isError && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm" role="alert">
          Error al cargar métricas. Verifique su conexión.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard label="PIM Total"       value={pimStr} />
        <MetricCard label="Total Procesos"  value={m?.total ?? "—"} />
        <MetricCard label="En Proceso"      value={m?.en_proceso ?? "—"} />
        <MetricCard label="Culminados"      value={m?.culminados ?? "—"} />
        <MetricCard label="Cancelados"      value={m?.cancelados ?? "—"} />
        <MetricCard label="Días Promedio"   value={diasStr} sub="procesos culminados" />
      </div>

      {/* ── 3. Acquisition selector ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="selector-proceso" className="text-sm font-medium text-gray-700 whitespace-nowrap">
          Seleccionar adquisición:
        </label>
        <select
          id="selector-proceso"
          value={selectedProcesoId ?? ""}
          onChange={(e) => setSelectedProcesoId(e.target.value ? Number(e.target.value) : null)}
          className="flex-1 min-w-0 border border-outline rounded px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          disabled={filteredFlujo.length === 0}
          aria-label="Seleccionar adquisición para ver flujo de etapas"
        >
          {filteredFlujo.length === 0 && (
            <option value="">Sin procesos</option>
          )}
          {filteredFlujo.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id_proceso} — {p.requerimiento}
            </option>
          ))}
        </select>
      </div>

      {/* ── 4. Centerpiece — horizontal stage-flow ──────────────────── */}
      <LineaEtapasHorizontal procesoId={selectedProcesoId} />

      {/* ── 5. Bottom row: donut + table ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* LEFT — donut */}
        <div className="lg:col-span-2">
          <DonutEstados
            enProceso={m?.en_proceso ?? 0}
            culminados={m?.culminados ?? 0}
            cancelados={m?.cancelados ?? 0}
          />
        </div>

        {/* RIGHT — acquisitions table */}
        <div className="lg:col-span-3 bg-white border border-outline shadow-card rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-outline">
            <h2 className="text-sm font-semibold text-gray-700">
              Adquisiciones {anno}
              {filteredFlujo.length !== flujoList.length && (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  ({filteredFlujo.length} de {flujoList.length})
                </span>
              )}
            </h2>
          </div>

          {procesosQuery.isLoading || flujo.isLoading ? (
            <div className="p-6 text-center text-gray-400 text-sm" role="status" aria-live="polite">
              Cargando…
            </div>
          ) : filteredFlujo.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">
              Sin datos para <strong>{anno}</strong>. Seleccione otro año o registre procesos.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-outline text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Requerimiento</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-right">PIM</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-right">Avance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline">
                  {filteredFlujo.map((fp) => {
                    const proc = procesosList.find((p) => p.id === fp.id);
                    const pimVal = proc?.pim != null ? parseFloat(proc.pim) : null;
                    const avance = porcentajeById.get(fp.id) ?? 0;
                    return (
                      <tr
                        key={fp.id}
                        className={[
                          "hover:bg-gray-50 transition-colors",
                          fp.id === selectedProcesoId ? "bg-blue-50" : "",
                        ].join(" ")}
                      >
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs text-gray-400">{fp.id_proceso}</div>
                          <div
                            className="text-gray-800 text-xs mt-0.5 line-clamp-2"
                            title={fp.requerimiento}
                          >
                            {fp.requerimiento}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                          {proc?.tipo ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 text-right whitespace-nowrap">
                          {pimVal != null ? fmt.format(pimVal) : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <EstadoBadge estado={fp.estado} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${avance}%`,
                                  backgroundColor: COLORES_ESTADO.EN_CURSO.bg,
                                }}
                                role="progressbar"
                                aria-valuenow={avance}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-600 w-9 text-right">
                              {avance.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
