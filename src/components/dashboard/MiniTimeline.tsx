"use client";

/**
 * C4 — MiniTimeline: 5 horizontal phase segments for process cards (S7).
 * Completadas → filled with phase color. Actual → border/pulse. Futuras → gray.
 */

import React from "react";
import { FASES_CONFIG } from "@/lib/fases";
import type { FaseProgreso } from "@/types/dashboard";

interface MiniTimelineProps {
  fases: FaseProgreso[];
  porcentaje: number;
}

export function MiniTimeline({ fases, porcentaje }: MiniTimelineProps) {
  return (
    <div className="flex flex-col gap-1">
      {/* 5 phase segments */}
      <div className="flex gap-0.5" role="list" aria-label="Progreso de fases">
        {FASES_CONFIG.map((config) => {
          const faseData = fases.find((f) => f.fase === config.fase);
          const completada = faseData?.completada ?? false;
          const actual = faseData?.actual ?? false;

          return (
            <div
              key={config.fase}
              role="listitem"
              title={config.label}
              aria-label={`${config.label}: ${completada ? "completada" : actual ? "en curso" : "pendiente"}`}
              className="flex-1 h-3 rounded-sm"
              style={{
                backgroundColor: completada
                  ? config.color
                  : actual
                  ? "transparent"
                  : "#E0E0E0",
                border: actual ? `2px solid ${config.color}` : "none",
                animation: actual ? "pulse 2s infinite" : "none",
              }}
            />
          );
        })}
      </div>

      {/* Percentage label */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Progreso</span>
        <span className="text-xs font-semibold text-gray-600">
          {porcentaje.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
