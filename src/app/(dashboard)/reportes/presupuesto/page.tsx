"use client";

/**
 * S9 — Análisis Presupuestal (/reportes/presupuesto)
 * C4: totals cards + grouped bar chart PIM/EM/Cert/OCS + variations table.
 */

import React, { useState } from "react";
import Link from "next/link";
import { usePresupuesto } from "@/hooks/useDashboard";
import { GraficoPresupuesto } from "@/components/dashboard/GraficoPresupuesto";
import { TablaVariaciones } from "@/components/dashboard/TablaVariaciones";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SelectorAnno } from "@/components/dashboard/SelectorAnno";

const CURRENT_YEAR = new Date().getFullYear();

const fmt = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function fmtMonto(v: number | null): string {
  if (v == null) return "—";
  return fmt.format(v);
}

export default function PresupuestoPage() {
  const [anno, setAnno] = useState(CURRENT_YEAR);
  const { data, isLoading, isError } = usePresupuesto(anno);

  const t = data?.totales;

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
          <h1 className="text-xl font-bold text-primary">Análisis Presupuestal</h1>
          <p className="text-sm text-gray-500 mt-1">
            PIM, Estudio de Mercado, Certificación y OCS por proceso.
          </p>
        </div>
        <SelectorAnno value={anno} onChange={setAnno} />
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm" role="alert">
          Error al cargar datos presupuestales. Verifique su conexión.
        </div>
      )}

      {/* Totals summary cards */}
      {!isLoading && !isError && t && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="PIM Total"          value={fmtMonto(t.pim)} />
          <MetricCard label="Val. Estudio Merc."  value={fmtMonto(t.valor_em)} />
          <MetricCard label="Cert. Presupuestal" value={fmtMonto(t.monto_cert_total)} />
          <MetricCard label="OCS Total"          value={fmtMonto(t.monto_ocs)} />
        </div>
      )}

      {/* Chart */}
      {isLoading && (
        <div className="text-center text-gray-500 text-sm py-8" role="status" aria-live="polite">
          Cargando datos presupuestales…
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {data && data.procesos.length === 0 ? (
            <div className="bg-white border border-outline rounded-lg p-12 text-center">
              <p className="text-gray-400 text-sm">
                Sin datos para <strong>{anno}</strong>. Seleccione otro año.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-outline shadow-card rounded-lg p-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">
                  Comparativa PIM / EM / Cert. / OCS por proceso
                </h2>
                <GraficoPresupuesto procesos={data?.procesos ?? []} />
              </div>

              <div className="bg-white border border-outline shadow-card rounded-lg p-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">
                  Variaciones presupuestales por proceso
                </h2>
                <TablaVariaciones procesos={data?.procesos ?? []} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
