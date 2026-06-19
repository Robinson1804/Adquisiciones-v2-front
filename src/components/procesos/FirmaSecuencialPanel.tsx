"use client";

/**
 * FirmaSecuencialPanel — V°B° secuencial para E02b y E06c.
 * flujo-real-otin-v2: muestra el estado de cada firma en secuencia de orden.
 *
 * Props recibe firmas derivadas del payload del proceso (no hay GET propio).
 * PATCH /procesos/{id}/firma-secuencial/{firma_id} para transiciones.
 *
 * Backend-followup note: No existe GET /procesos/{id}/firma-secuencial.
 * Las firmas deben venir incluidas en GET /procesos/{id} o como prop.
 */

import React, { useState } from "react";
import type { FirmaSecuencial, EstadoFirma } from "@/types/etapa";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";

interface FirmaSecuencialPanelProps {
  procesoId: number;
  etapaCod: string;
  firmas: FirmaSecuencial[];
  ronda?: number;
  onRefresh?: () => void;
}

const ESTADO_LABELS: Record<EstadoFirma, string> = {
  PENDIENTE: "PENDIENTE",
  RECIBIDO: "RECIBIDO",
  FIRMADO: "FIRMADO",
  RECHAZADO: "RECHAZADO",
};

const ESTADO_COLORS: Record<EstadoFirma, { bg: string; text: string }> = {
  PENDIENTE: { bg: "#FEF3C7", text: "#B45309" },
  RECIBIDO: { bg: "#DBEAFE", text: "#1D4ED8" },
  FIRMADO: { bg: "#DCFCE7", text: "#15803D" },
  RECHAZADO: { bg: "#FEE2E2", text: "#B91C1C" },
};

export function FirmaSecuencialPanel({
  procesoId,
  etapaCod,
  firmas,
  ronda = 1,
  onRefresh,
}: FirmaSecuencialPanelProps) {
  const { user } = useAuthStore();
  const canEdit = user?.rol === "ADMIN" || user?.rol === "EDITOR";

  const [isSubmitting, setIsSubmitting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [rechazandoId, setRechazandoId] = useState<number | null>(null);

  // Sort by orden
  const firmasOrdenadas = [...firmas].sort((a, b) => a.orden - b.orden);
  const todasFirmadas = firmas.length > 0 && firmas.every((f) => f.estado === "FIRMADO");

  async function handleTransicion(firmaId: number, nuevoEstado: EstadoFirma, motivo?: string) {
    setIsSubmitting(firmaId);
    setError(null);
    try {
      await api.patch(
        `/procesos/${procesoId}/firma-secuencial/${firmaId}`,
        { nuevo_estado: nuevoEstado, ...(motivo ? { motivo_rechazo: motivo } : {}) }
      );
      onRefresh?.();
    } catch (err: unknown) {
      const msg =
        err != null &&
        typeof err === "object" &&
        "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      setError(msg ?? "Error al actualizar la firma");
    } finally {
      setIsSubmitting(null);
    }
  }

  function handleConfirmarRechazo() {
    if (rechazandoId !== null) {
      void handleTransicion(rechazandoId, "RECHAZADO", motivoRechazo);
      setRechazandoId(null);
      setMotivoRechazo("");
    }
  }

  if (firmas.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-3 text-center">
        Sin firmas registradas para este V°B°.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {todasFirmadas && (
        <div
          className="flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2"
          data-testid="firma-completado-banner"
        >
          Todas las áreas firmaron — V°B° completado.
        </div>
      )}

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="divide-y divide-gray-100 border border-gray-200 rounded">
        {firmasOrdenadas.map((firma, idx) => {
          const estado = firma.estado as EstadoFirma;
          const colors = ESTADO_COLORS[estado] ?? ESTADO_COLORS.PENDIENTE;
          const prevFirma = idx > 0 ? firmasOrdenadas[idx - 1] : null;
          const esperandoAnterior = prevFirma != null && prevFirma.estado !== "FIRMADO";
          const isActive = estado === "PENDIENTE" && !esperandoAnterior;

          return (
            <div
              key={firma.id}
              className="flex items-center gap-3 px-3 py-2"
              data-testid={`firma-row-${firma.area}`}
            >
              <span className="text-xs text-gray-500 w-4">{firma.orden}.</span>
              <span className="flex-1 text-sm font-medium text-gray-700">{firma.area}</span>

              <span
                className="text-xs px-2 py-0.5 rounded font-medium"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                {ESTADO_LABELS[estado]}
              </span>

              {esperandoAnterior && estado === "PENDIENTE" && (
                <span className="text-xs text-gray-400 italic">Esperando firma anterior</span>
              )}

              {canEdit && isActive && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="text-xs px-2 py-0.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                    disabled={isSubmitting === firma.id}
                    onClick={() => void handleTransicion(firma.id, "FIRMADO")}
                    aria-label={`Marcar firmado ${firma.area}`}
                  >
                    {isSubmitting === firma.id ? "..." : "Marcar firmado"}
                  </button>
                  <button
                    type="button"
                    className="text-xs px-2 py-0.5 rounded border border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => setRechazandoId(firma.id)}
                    aria-label={`Rechazar firma ${firma.area}`}
                  >
                    Rechazar
                  </button>
                </div>
              )}

              {firma.fecha_firmado && (
                <span className="text-xs text-gray-400">{firma.fecha_firmado}</span>
              )}
            </div>
          );
        })}
      </div>

      {rechazandoId !== null && (
        <div className="border border-red-200 rounded bg-red-50 p-3 space-y-2">
          <p className="text-xs font-medium text-red-700">Motivo de rechazo (requerido):</p>
          <textarea
            className="w-full border border-red-300 rounded text-sm p-2 focus:outline-none focus:ring-1 focus:ring-red-300"
            rows={2}
            value={motivoRechazo}
            onChange={(e) => setMotivoRechazo(e.target.value)}
            placeholder="Ingrese el motivo del rechazo..."
            aria-label="Motivo de rechazo"
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="text-xs px-2 py-0.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              disabled={!motivoRechazo.trim()}
              onClick={handleConfirmarRechazo}
            >
              Confirmar rechazo
            </button>
            <button
              type="button"
              className="text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-600"
              onClick={() => { setRechazandoId(null); setMotivoRechazo(""); }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
