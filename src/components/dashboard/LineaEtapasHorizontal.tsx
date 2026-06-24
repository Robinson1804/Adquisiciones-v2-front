"use client";

/**
 * LineaEtapasHorizontal — phase board for all visible acquisitions.
 * Groups acquisitions by their current executive phase and shows the current
 * stage, elapsed days in that phase and overall progress.
 */

import React from "react";
import { FASES, faseDeEtapa } from "@/lib/fases";
import type { ProcesoFlujo } from "@/types/dashboard";

interface LineaEtapasHorizontalProps {
  procesos: ProcesoFlujo[];
  isLoading?: boolean;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function phaseNumForProceso(proceso: ProcesoFlujo): number {
  if (proceso.estado === "CULMINADO") return 5;
  if (proceso.etapa_actual) return faseDeEtapa(proceso.etapa_actual);

  const match = proceso.fase_actual?.match(/^F([1-5])$/);
  if (match?.[1]) return Number(match[1]);

  return 1;
}

function shortStageName(proceso: ProcesoFlujo): string {
  if (proceso.estado === "CULMINADO") return "Culminado";
  if (!proceso.etapa_actual) return "Sin etapa iniciada";

  const name = proceso.etapa_actual_nombre
    ?.replace(/\s*\[BUCLE\]\s*/i, " ")
    .replace(/\s*\([^()]*\)\s*$/, "")
    .trim();

  return name ? `${proceso.etapa_actual} · ${name}` : proceso.etapa_actual;
}

function diasLabel(dias: number | null): string {
  if (dias == null) return "Sin fecha";
  return `${dias} ${dias === 1 ? "día" : "días"}`;
}

function PhaseProcessCard({ proceso }: { proceso: ProcesoFlujo }) {
  const progress = clampPercent(proceso.porcentaje);
  const stage = shortStageName(proceso);
  const days = diasLabel(proceso.fase_actual_dias);

  return (
    <article
      className="rounded-md border border-outline bg-white p-3 shadow-sm"
      aria-label={`${proceso.id_proceso}: ${stage}, ${days}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-gray-500">
          {proceso.id_proceso}
        </span>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 whitespace-nowrap">
          {days}
        </span>
      </div>

      <p
        className="mt-2 text-xs font-semibold text-primary leading-snug line-clamp-2"
        title={proceso.requerimiento}
      >
        {proceso.requerimiento}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-gray-500">
        <span className="min-w-0 truncate" title={stage}>
          {stage}
        </span>
        <span className="font-semibold whitespace-nowrap">{progress.toFixed(0)}%</span>
      </div>

      <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-600"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Avance ${proceso.id_proceso}`}
        />
      </div>
    </article>
  );
}

function PhaseColumn({
  fase,
  procesos,
}: {
  fase: (typeof FASES)[number];
  procesos: ProcesoFlujo[];
}) {
  const hasProcesos = procesos.length > 0;

  return (
    <section
      className={[
        "min-w-[250px] rounded-lg border p-3",
        hasProcesos ? "border-blue-100 bg-blue-50/30" : "border-gray-200 bg-white",
      ].join(" ")}
      aria-label={`Fase ${fase.num}: ${fase.corto}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase text-gray-500 leading-none">
            Fase {fase.num}
          </span>
          <span className="block mt-1 text-sm font-bold text-primary truncate">
            {fase.corto}
          </span>
        </div>
        <span
          className={[
            "rounded-full px-2 py-1 text-xs font-bold whitespace-nowrap",
            hasProcesos ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500",
          ].join(" ")}
        >
          {procesos.length}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {hasProcesos ? (
          procesos.map((proceso) => (
            <PhaseProcessCard key={proceso.id} proceso={proceso} />
          ))
        ) : (
          <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-3 text-xs text-gray-400 text-center">
            Sin adquisiciones
          </div>
        )}
      </div>
    </section>
  );
}

export function LineaEtapasHorizontal({
  procesos,
  isLoading = false,
}: LineaEtapasHorizontalProps) {
  if (isLoading) {
    return (
      <div
        className="bg-white border border-outline rounded-lg p-6 text-center text-gray-400 text-sm"
        role="status"
        aria-live="polite"
      >
        Cargando fases…
      </div>
    );
  }

  if (procesos.length === 0) {
    return (
      <div className="bg-white border border-outline rounded-lg p-6 text-center text-gray-400 text-sm">
        Sin adquisiciones para mostrar.
      </div>
    );
  }

  const procesosByPhase = new Map<number, ProcesoFlujo[]>(
    FASES.map((fase) => [fase.num, []])
  );

  for (const proceso of procesos) {
    const phaseNum = phaseNumForProceso(proceso);
    procesosByPhase.get(phaseNum)?.push(proceso);
  }

  return (
    <div className="bg-white border border-outline shadow-card rounded-lg p-4">
      <div className="overflow-x-auto">
        <div
          className="grid grid-cols-5 gap-3 pb-1"
          style={{ minWidth: "1300px" }}
          role="list"
          aria-label="Adquisiciones por fase"
        >
          {FASES.map((fase) => (
            <div role="listitem" key={fase.id}>
              <PhaseColumn
                fase={fase}
                procesos={procesosByPhase.get(fase.num) ?? []}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
