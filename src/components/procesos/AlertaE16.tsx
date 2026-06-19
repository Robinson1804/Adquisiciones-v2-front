"use client";

/**
 * AlertaE16 — Red alert badge for OTPP overdue response on E16.
 *
 * Renders a red badge when alerta_otpp is true (>20 days without OTPP response).
 * Renders nothing when false or null.
 *
 * Design §FRONTEND — Design R4 (informative, no block).
 */

import React from "react";

interface AlertaE16Props {
  alerta_otpp: boolean | null;
}

export function AlertaE16({ alerta_otpp }: AlertaE16Props) {
  if (!alerta_otpp) return null;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold"
      style={{ backgroundColor: '#FFCDD2', color: '#B71C1C' }}
      role="alert"
      aria-live="polite"
      aria-label="Alerta: más de 20 días sin respuesta OTPP"
    >
      &gt;20 dias sin respuesta OTPP
    </span>
  );
}
