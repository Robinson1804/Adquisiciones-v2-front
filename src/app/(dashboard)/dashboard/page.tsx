"use client";

/**
 * Dashboard Gerencial — single executive view for Adquisiciones TIC.
 * Consolidates KPIs, stage-flow detail, donut chart and acquisitions table.
 */

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useMetricas, useFlujoProcesos, usePresupuesto } from "@/hooks/useDashboard";
import { useProcesos } from "@/hooks/useProcesos";
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

type BudgetMetricTone = "data" | "pending" | "ratio";

interface BudgetMetricCardProps {
  label: string;
  value: string;
  sub?: string;
  tone?: BudgetMetricTone;
}

function BudgetMetricCard({
  label,
  value,
  sub,
  tone = "data",
}: BudgetMetricCardProps) {
  const toneClasses: Record<BudgetMetricTone, string> = {
    data: "bg-blue-100 text-primary",
    pending: "bg-gray-100 text-gray-500",
    ratio: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className="bg-white border border-outline shadow-card rounded-lg p-4 min-h-[108px] flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold text-gray-500 uppercase leading-tight">
          {label}
        </span>
        <span
          className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${toneClasses[tone]}`}
          aria-hidden="true"
        />
      </div>
      <div>
        <span className="block text-xl font-bold text-primary leading-tight break-words">
          {value}
        </span>
        {sub && (
          <span className="mt-1 block text-[11px] text-gray-400 leading-tight">
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

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

  // ── data sources ──────────────────────────────────────────────────
  const metricas     = useMetricas(anno);
  const flujo        = useFlujoProcesos(anno);
  const presupuesto  = usePresupuesto(anno);
  // Load procesos for the year; tipo/unidad are filtered client-side below
  // (the backend `area` filter targets areas_usuarias, not unidad_resp).
  // page_size capped at 100 by the backend (le=100).
  const procesosQuery = useProcesos({ anno, page_size: 100 });

  const m         = metricas.data;
  const p         = presupuesto.data?.totales;
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
  const moneyOrDash = (value: number | null | undefined) =>
    value != null ? fmt.format(value) : "—";

  const executionCards: BudgetMetricCardProps[] = [
    {
      label: "PIA",
      value: "—",
      sub: "sin fuente registrada",
      tone: "pending",
    },
    {
      label: "PIM",
      value: moneyOrDash(p?.pim),
      sub: "presupuesto modificado",
    },
    {
      label: "Certificación",
      value: moneyOrDash(p?.monto_cert_total),
      sub: "certificaciones registradas",
    },
    {
      label: "Compromiso Anual",
      value: moneyOrDash(p?.monto_ocs),
      sub: "monto O/S registrado",
    },
    {
      label: "Atención de Compromiso Mensual",
      value: "—",
      sub: "sin fuente registrada",
      tone: "pending",
    },
    {
      label: "Devengado",
      value: "—",
      sub: "sin fuente registrada",
      tone: "pending",
    },
    {
      label: "Girado",
      value: "—",
      sub: "sin fuente registrada",
      tone: "pending",
    },
    {
      label: "Avance %",
      value: "—",
      sub: "requiere devengado/PIM",
      tone: "ratio",
    },
  ];

  // Unidad options from loaded procesos
  const unidadOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const p of procesosList) {
      if (p.unidad_resp) seen.add(p.unidad_resp);
    }
    return Array.from(seen).sort();
  }, [procesosList]);

  // Phase board and table data — filtered by tipo/unidad via the client-filtered set
  const filteredFlujo = useMemo(() => {
    if (!unidad && !tipo) return flujoList;
    const allowedIds = new Set(procesosFiltrados.map((p) => p.id));
    return flujoList.filter((p) => allowedIds.has(p.id));
  }, [flujoList, procesosFiltrados, unidad, tipo]);

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

      {/* ── 2. Budget execution cards ───────────────────────────────── */}
      {(metricas.isError || presupuesto.isError) && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm" role="alert">
          Error al cargar indicadores. Verifique su conexión.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {executionCards.map((card) => (
          <BudgetMetricCard key={card.label} {...card} />
        ))}
      </div>

      {/* ── 3. Centerpiece — phase board ────────────────────────────── */}
      <LineaEtapasHorizontal
        procesos={filteredFlujo}
        isLoading={flujo.isLoading || procesosQuery.isLoading}
      />

      {/* ── 4. Bottom row: donut + table ────────────────────────────── */}
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
                        className="hover:bg-gray-50 transition-colors"
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
