"use client";

/**
 * LineaEtapasHorizontal — phase summary for a selected acquisition.
 * Groups the process stages into the 5 executive phases and shows progress,
 * status and accumulated days per phase.
 */

import React from "react";
import { useEtapas } from "@/hooks/useEtapas";
import { FASES, faseDeEtapa } from "@/lib/fases";
import { parseLocalDate } from "@/lib/fecha";
import type { EtapaAgrupada } from "@/types/etapa";

type PhaseStatus = "COMPLETADO" | "EN_CURSO" | "PENDIENTE";

interface PhaseSummary {
  num: number;
  id: string;
  corto: string;
  total: number;
  completadas: number;
  estado: PhaseStatus;
  dias: number | null;
}

/**
 * Compute chained days per etapa.
 *
 * "Days for stage i" = fecha_inicio[i+1] − fecha_inicio[i]  (how long until the next started)
 * For the last visible stage: use fecha_fin if available, otherwise 0.
 *
 * This model avoids the "null dias" problem when fecha_fin hasn't been entered yet.
 */
function computeChainedDiasByCod(etapas: EtapaAgrupada[]): Map<string, number | null> {
  const result = new Map<string, number | null>();

  for (let i = 0; i < etapas.length; i++) {
    const etapa = etapas[i];
    if (!etapa) continue;
    const fila = etapa.filas[0] ?? null;
    const fechaInicioStr = fila?.fecha_inicio ?? null;
    if (!fechaInicioStr) {
      result.set(etapa.cod, null);
      continue;
    }

    const isLast = i === etapas.length - 1;
    if (isLast) {
      // Last stage: use fecha_fin if available
      const fechaFinStr = fila?.fecha_fin ?? null;
      if (fechaFinStr) {
        const diff = Math.round(
          (parseLocalDate(fechaFinStr).getTime() - parseLocalDate(fechaInicioStr).getTime()) / 86_400_000
        );
        result.set(etapa.cod, diff >= 0 ? diff : 0);
      } else {
        result.set(etapa.cod, 0);
      }
    } else {
      const nextEtapa = etapas[i + 1];
      const nextFechaStr = nextEtapa?.filas[0]?.fecha_inicio ?? null;
      if (nextFechaStr) {
        const diff = Math.round(
          (parseLocalDate(nextFechaStr).getTime() - parseLocalDate(fechaInicioStr).getTime()) / 86_400_000
        );
        result.set(etapa.cod, diff >= 0 ? diff : 0);
      } else {
        // Next stage not yet started — fall back to stored dias, else null
        result.set(etapa.cod, fila?.dias ?? null);
      }
    }
  }

  return result;
}

interface LineaEtapasHorizontalProps {
  procesoId: number | null;
}

function isCompletedLike(etapa: EtapaAgrupada): boolean {
  return etapa.estado === "COMPLETADO" || etapa.estado === "NO_APLICA";
}

function hasStarted(etapa: EtapaAgrupada): boolean {
  return (
    etapa.estado === "COMPLETADO" ||
    etapa.estado === "EN_CURSO" ||
    etapa.estado === "NO_APLICA" ||
    etapa.filas.some((fila) => Boolean(fila.fecha_inicio || fila.fecha_fin))
  );
}

function buildPhaseSummaries(etapas: EtapaAgrupada[]): PhaseSummary[] {
  const cadena = etapas.filter((etapa) => !etapa.es_bucle);
  const etapasConFechas = cadena.filter(hasStarted);
  const diasByCod = computeChainedDiasByCod(etapasConFechas);

  return FASES.map((fase) => {
    const etapasFase = cadena.filter((etapa) => faseDeEtapa(etapa.cod) === fase.num);
    const total = etapasFase.length;
    const completadas = etapasFase.filter(isCompletedLike).length;
    const faseIniciada =
      completadas > 0 ||
      etapasFase.some((etapa) => etapa.estado === "EN_CURSO" || hasStarted(etapa));

    let estado: PhaseStatus = "PENDIENTE";
    if (total > 0 && completadas === total) {
      estado = "COMPLETADO";
    } else if (faseIniciada) {
      estado = "EN_CURSO";
    }

    let dias = 0;
    let hasDias = false;
    for (const etapa of etapasFase) {
      const etapaDias = diasByCod.get(etapa.cod);
      if (etapaDias != null) {
        dias += etapaDias;
        hasDias = true;
      }
    }

    return {
      num: fase.num,
      id: fase.id,
      corto: fase.corto,
      total,
      completadas,
      estado,
      dias: hasDias ? dias : null,
    };
  });
}

function diasLabel(summary: PhaseSummary): string {
  if (summary.dias != null) return `${summary.dias} días`;
  if (summary.estado === "EN_CURSO") return "En curso";
  return "Sin iniciar";
}

function PhaseFlowCard({ summary }: { summary: PhaseSummary }) {
  const progress = summary.total > 0
    ? Math.round((summary.completadas / summary.total) * 100)
    : 0;

  const statusStyles: Record<PhaseStatus, {
    card: string;
    circle: string;
    badge: string;
    bar: string;
  }> = {
    COMPLETADO: {
      card: "border-emerald-100 bg-emerald-50/40",
      circle: "bg-emerald-600 text-white",
      badge: "bg-emerald-100 text-emerald-700",
      bar: "bg-emerald-600",
    },
    EN_CURSO: {
      card: "border-blue-100 bg-blue-50/40",
      circle: "bg-blue-100 text-blue-700",
      badge: "bg-blue-100 text-blue-700",
      bar: "bg-blue-600",
    },
    PENDIENTE: {
      card: "border-gray-200 bg-white",
      circle: "bg-gray-100 text-gray-500",
      badge: "bg-gray-100 text-gray-500",
      bar: "bg-gray-300",
    },
  };

  const styles = statusStyles[summary.estado];
  const icon = summary.estado === "COMPLETADO" ? "✓" : summary.num.toString();

  return (
    <article
      className={`flex-shrink-0 w-64 rounded-lg border shadow-card p-4 ${styles.card}`}
      aria-label={`Fase ${summary.num}: ${summary.corto}, ${summary.completadas} de ${summary.total} etapas`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${styles.circle}`}
            aria-hidden="true"
          >
            {icon}
          </span>
          <div className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase text-gray-500 leading-none">
              Fase {summary.num}
            </span>
            <span className="block mt-1 text-sm font-bold text-primary truncate">
              {summary.corto}
            </span>
          </div>
        </div>

        <span className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${styles.badge}`}>
          {summary.completadas}/{summary.total}
        </span>
      </div>

      <div className="mt-4">
        <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full rounded-full ${styles.bar}`}
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Avance fase ${summary.num}`}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-gray-500">{diasLabel(summary)}</span>
        <span className="font-semibold text-gray-500">{progress}%</span>
      </div>
    </article>
  );
}

export function LineaEtapasHorizontal({ procesoId }: LineaEtapasHorizontalProps) {
  const { data, isLoading, isError } = useEtapas(procesoId ?? 0);

  if (!procesoId) {
    return (
      <div className="bg-white border border-outline rounded-lg p-6 text-center text-gray-400 text-sm">
        Seleccione una adquisición para ver su flujo de etapas.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="bg-white border border-outline rounded-lg p-6 text-center text-gray-400 text-sm"
        role="status"
        aria-live="polite"
      >
        Cargando etapas…
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm"
        role="alert"
      >
        Error al cargar las etapas del proceso.
      </div>
    );
  }

  const etapas = data?.etapas ?? [];
  const phaseSummaries = buildPhaseSummaries(etapas);

  if (etapas.length === 0) {
    return (
      <div className="bg-white border border-outline rounded-lg p-6 text-center text-gray-400 text-sm">
        Sin etapas iniciadas para esta adquisición.
      </div>
    );
  }

  return (
    <div className="bg-white border border-outline shadow-card rounded-lg p-4">
      <div className="overflow-x-auto">
        <div
          className="flex items-center gap-2 pb-2"
          style={{ minWidth: "max-content" }}
          role="list"
          aria-label="Progreso por fases"
        >
          {phaseSummaries.map((summary, idx) => (
            <React.Fragment key={summary.id}>
              <div role="listitem">
                <PhaseFlowCard summary={summary} />
              </div>
              {idx < phaseSummaries.length - 1 && (
                <span
                  className="text-gray-400 font-bold text-lg flex-shrink-0"
                  aria-hidden="true"
                >
                  →
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
