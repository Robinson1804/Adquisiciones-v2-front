"use client";

// ============================================================
// MapaProceso — vista "Mapa": board de 5 columnas (una por fase)
// con las 32 etapas de un vistazo. Click en una etapa → onSelect.
// ============================================================
import React from "react";
import { COLORES_ACTOR, COLORES_ESTADO } from "@/lib/constants";
import { FASES, resumenFase, nombreCorto } from "@/lib/fases";
import type { EtapaAgrupada, Progreso } from "@/types/etapa";

const ESTADO_LABEL: Record<string, string> = {
  COMPLETADO: "Completado",
  EN_CURSO: "En Curso",
  PENDIENTE: "Pendiente",
  NO_APLICA: "No aplica",
  OMITIDO: "Omitido",
  CANCELADO: "Cancelado",
};

function Check({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

interface ChipProps {
  etapa: EtapaAgrupada;
  current: boolean;
  avance: boolean;
  estadoVisual: string;
  /** True when rendering inside an inference-driven process; changes badge label and suppresses the CTA */
  inferenceDriven: boolean;
  onSelect: (e: EtapaAgrupada) => void;
}

function Chip({ etapa, current, avance, estadoVisual, inferenceDriven, onSelect }: ChipProps) {
  const actor = COLORES_ACTOR[etapa.area_responsable as keyof typeof COLORES_ACTOR] ?? COLORES_ACTOR.OTIN;
  const est = COLORES_ESTADO[estadoVisual as keyof typeof COLORES_ESTADO] ?? COLORES_ESTADO.PENDIENTE;
  const done = estadoVisual === "COMPLETADO";

  // In inference mode the "current" chip is the most advanced stage (already COMPLETADO).
  // We show a green "ACTUAL" badge instead of blue "AHORA" and we do NOT render the CTA.
  const currentRingColor = inferenceDriven ? "ring-emerald-500" : "ring-blue-500";

  return (
    <button
      type="button"
      onClick={() => onSelect(etapa)}
      className={`relative w-full text-left bg-white rounded-lg overflow-hidden transition
        hover:-translate-y-0.5 hover:shadow-md
        ${etapa.es_bucle ? "border border-dashed" : "border border-gray-200"}
        ${current ? `ring-2 ${currentRingColor} shadow-md` : ""}`}
      style={{ paddingLeft: 13 }}
      aria-label={`${etapa.cod}: ${etapa.nombre}`}
    >
      <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: est.bar }} />
      <div className="px-2.5 py-2 flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full border-2 grid place-items-center flex-shrink-0"
            style={{ background: done ? est.bar : "#fff", borderColor: est.bar }}>
            {done && <Check size={8} />}
            {!done && current && <span className="w-1.5 h-1.5 rounded-full" style={{ background: est.bar }} />}
          </span>
          <span className="font-mono text-[10.5px] font-bold text-gray-600">{etapa.cod}</span>
          <span className="ml-auto text-[8.5px] font-bold px-1.5 py-px rounded"
            style={{ background: actor.bg, color: actor.text }}>
            {etapa.area_responsable === "BUCLE" ? "BUCLE" : etapa.area_responsable}
          </span>
          {current && !inferenceDriven && (
            <span className="text-[8px] font-extrabold tracking-wide text-white bg-blue-600 px-1.5 py-0.5 rounded">AHORA</span>
          )}
          {current && inferenceDriven && (
            <span className="text-[8px] font-extrabold tracking-wide text-white bg-emerald-600 px-1.5 py-0.5 rounded">ACTUAL</span>
          )}
          {avance && !current && (
            <span className="text-[8px] font-extrabold tracking-wide text-white bg-emerald-600 px-1.5 py-0.5 rounded">+ AVANZ.</span>
          )}
        </div>
        <span className={`text-xs font-semibold leading-tight ${etapa.es_bucle ? "italic text-amber-800" : "text-gray-800"}`}>
          {nombreCorto(etapa.nombre)}
        </span>
        {/* Only show "Registrar avance" CTA in non-inference mode */}
        {current && !inferenceDriven && (
          <span className="mt-0.5 inline-block text-[10.5px] font-bold text-white bg-primary px-2.5 py-1 rounded-md w-fit">
            Registrar avance
          </span>
        )}
      </div>
    </button>
  );
}

interface MapaProcesoProps {
  etapas: EtapaAgrupada[];
  progreso: Progreso;
  onSelect: (e: EtapaAgrupada) => void;
  /** REFINAMIENTO FASE 3: código de la etapa más avanzada con datos reales (por correo). */
  etapaActualAvance?: string | null;
}

export function MapaProceso({ etapas, progreso, onSelect, etapaActualAvance }: MapaProcesoProps) {
  const inferenceDriven = !!etapaActualAvance;

  /** For inference-driven processes: non-COMPLETADO stages become OMITIDO visually. */
  function getEstadoVisual(etapa: EtapaAgrupada): string {
    if (!inferenceDriven) return etapa.estado;
    return etapa.estado === "COMPLETADO" ? "COMPLETADO" : "OMITIDO";
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-3.5">
        {inferenceDriven ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORES_ESTADO.COMPLETADO.bar }} />
              {ESTADO_LABEL.COMPLETADO}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORES_ESTADO.OMITIDO.bar }} />
              Omitido / sin información
            </span>
          </>
        ) : (
          (["COMPLETADO", "EN_CURSO", "PENDIENTE"] as const).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORES_ESTADO[k].bar }} />
              {ESTADO_LABEL[k]}
            </span>
          ))
        )}
        <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-amber-700">↻ Bucle (reproceso)</span>
        <span className="ml-auto text-[11.5px] font-semibold text-gray-400">Haz clic en una etapa para registrarla →</span>
      </div>

      {/* Board */}
      <div className="flex items-stretch gap-1 overflow-x-auto pb-1.5">
        {FASES.map((f, i) => {
          const r = resumenFase(f.num, etapas);
          const est = COLORES_ESTADO[r.estado];
          const done = r.estado === "COMPLETADO";
          const active = r.estado === "EN_CURSO";
          const footState = done ? "Fase completada" : active ? "En curso" : "Aún no inicia";
          return (
            <React.Fragment key={f.id}>
              <div
                className={`flex-1 min-w-[176px] flex flex-col rounded-xl border p-3 transition
                  ${active ? "border-blue-200 bg-gradient-to-b from-blue-50/70 to-slate-50"
                    : done ? "border-gray-100 bg-gradient-to-b from-green-50/50 to-slate-50"
                    : "border-gray-100 bg-slate-50/60"}`}
              >
                {/* Header */}
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-6 h-6 rounded-full border-2 grid place-items-center font-mono font-extrabold text-xs flex-shrink-0"
                    style={{ background: done ? est.bar : "#fff", borderColor: est.bar, color: done ? "#fff" : est.bar }}>
                    {done ? <Check size={12} /> : f.num}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-bold tracking-wide uppercase text-gray-400">Fase {f.num}</span>
                    <span className="text-xs font-bold text-primary leading-tight">{f.corto}</span>
                  </div>
                  <span className="ml-auto text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full"
                    style={{ background: est.bg, color: est.text }}>{r.completadas}/{r.total}</span>
                </div>
                {/* Progress */}
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden mb-3">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(r.completadas / Math.max(r.total, 1)) * 100}%`, background: est.bar }} />
                </div>
                {/* Chips */}
                <div className={`flex flex-col gap-1.5 ${r.estado === "PENDIENTE" ? "opacity-90" : ""}`}>
                  {r.etapas.map((e) => (
                    <Chip
                      key={e.cod}
                      etapa={e}
                      current={inferenceDriven ? e.cod === etapaActualAvance : e.cod === progreso.etapa_actual}
                      avance={!inferenceDriven && e.cod === etapaActualAvance}
                      estadoVisual={getEstadoVisual(e)}
                      inferenceDriven={inferenceDriven}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
                {/* Footer */}
                <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold" style={{ color: est.text }}>
                    {done && <Check size={11} />}
                    {active && <span className="w-2 h-2 rounded-full" style={{ background: est.bar }} />}
                    {footState}
                  </span>
                  {r.dias > 0 && <span className="text-[10.5px] font-semibold font-mono text-gray-400">{r.dias} días</span>}
                </div>
              </div>
              {i < FASES.length - 1 && (
                <span className="self-start mt-5 text-gray-300 flex-shrink-0 select-none" aria-hidden>›</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
