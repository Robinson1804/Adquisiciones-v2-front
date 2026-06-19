"use client";

/**
 * S11 — Modo Presentación (/presentacion)
 * C4: fullscreen overlay (fixed inset-0 z-50) — covers header without leaving auth group.
 * Large typography (≥1.5× standard). Esc key + Salir button → router.back().
 * Listener cleaned up on unmount (S11-3).
 */

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMetricas, useFlujoProcesos } from "@/hooks/useDashboard";
import { SelectorAnno } from "@/components/dashboard/SelectorAnno";
import { MiniTimeline } from "@/components/dashboard/MiniTimeline";
import { COLORES_ESTADO } from "@/lib/constants";
import type { EstadoProceso } from "@/types";

const CURRENT_YEAR = new Date().getFullYear();

const ESTADO_COLOR_MAP: Record<EstadoProceso, keyof typeof COLORES_ESTADO> = {
  "EN PROCESO": "EN_CURSO",
  CULMINADO:   "COMPLETADO",
  CANCELADO:   "CANCELADO",
};

const fmt = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function fmtMonto(v: number | null): string {
  return v != null ? fmt.format(v) : "—";
}

type Vista = "metricas" | "flujo";

export default function PresentacionPage() {
  const router = useRouter();
  const [anno, setAnno] = useState(CURRENT_YEAR);
  const [vista, setVista] = useState<Vista>("metricas");

  const metricas = useMetricas(anno);
  const flujo = useFlujoProcesos(anno);

  // Esc key listener — cleanup on unmount (S11-3)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") router.back();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const m = metricas.data;
  const procesos = flujo.data?.procesos ?? [];

  return (
    /* Fixed overlay covers layout header (z-50 > any layout z-index) */
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">
      {/* Presentation header */}
      <div className="bg-primary text-white px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold">Adquisiciones TIC — INEI</h1>
          <p className="text-lg opacity-80 mt-0.5">Dashboard Ejecutivo</p>
        </div>
        <div className="flex items-center gap-6">
          <SelectorAnno value={anno} onChange={setAnno} id="anno-presentacion" />
          <button
            onClick={() => router.back()}
            aria-label="Salir del modo presentación"
            className="bg-white text-primary font-bold px-5 py-2 rounded text-sm
                       hover:bg-gray-100 transition-colors"
          >
            Salir (Esc)
          </button>
        </div>
      </div>

      {/* Vista selector */}
      <div className="border-b border-outline bg-gray-50 px-8 py-2 flex gap-4 flex-shrink-0">
        {(["metricas", "flujo"] as Vista[]).map((v) => (
          <button
            key={v}
            onClick={() => setVista(v)}
            className={`text-sm font-medium px-4 py-1.5 rounded transition-colors ${
              vista === v
                ? "bg-primary text-white"
                : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            {v === "metricas" ? "Métricas Clave" : "Flujo de Procesos"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {vista === "metricas" && (
          <div className="space-y-8">
            {metricas.isLoading && (
              <p className="text-2xl text-gray-400 text-center py-16">Cargando…</p>
            )}
            {metricas.isError && (
              <p className="text-2xl text-red-500 text-center py-16">Error al cargar métricas.</p>
            )}
            {m && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {[
                    { label: "Total Procesos",  value: String(m.total) },
                    { label: "En Proceso",      value: String(m.en_proceso) },
                    { label: "Culminados",      value: String(m.culminados) },
                    { label: "Cancelados",      value: String(m.cancelados) },
                    { label: "PIM Total",       value: fmtMonto(m.pim_total) },
                    { label: "Días Promedio",   value: m.dias_promedio != null ? `${m.dias_promedio.toFixed(1)} d` : "—" },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="bg-gray-50 border border-outline rounded-xl p-8 flex flex-col gap-2"
                    >
                      <span className="text-base font-medium text-gray-500 uppercase tracking-wide">
                        {card.label}
                      </span>
                      <span className="text-5xl font-bold text-primary">{card.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {vista === "flujo" && (
          <div className="space-y-4">
            {flujo.isLoading && (
              <p className="text-2xl text-gray-400 text-center py-16">Cargando procesos…</p>
            )}
            {flujo.isError && (
              <p className="text-2xl text-red-500 text-center py-16">Error al cargar flujo.</p>
            )}
            {!flujo.isLoading && !flujo.isError && procesos.length === 0 && (
              <p className="text-2xl text-gray-400 text-center py-16">
                Sin procesos para {anno}.
              </p>
            )}
            {procesos.map((proceso) => {
              const estadoKey = ESTADO_COLOR_MAP[proceso.estado as EstadoProceso] ?? "OMITIDO";
              const color = COLORES_ESTADO[estadoKey] ?? COLORES_ESTADO.OMITIDO;
              return (
                <div
                  key={proceso.id}
                  className="bg-white border border-outline rounded-xl p-6 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-sm text-gray-500">{proceso.id_proceso}</p>
                      <p className="text-xl font-semibold text-gray-800 mt-1">
                        {proceso.requerimiento}
                      </p>
                    </div>
                    <span
                      className="text-sm font-medium px-3 py-1 rounded-lg whitespace-nowrap mt-1"
                      style={{ backgroundColor: color.bg, color: color.text }}
                    >
                      {proceso.estado}
                    </span>
                  </div>
                  <MiniTimeline fases={proceso.fases} porcentaje={proceso.porcentaje} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
