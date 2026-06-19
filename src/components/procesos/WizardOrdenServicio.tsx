"use client";

/**
 * WizardOrdenServicio — Modal para registrar llegada de Orden de Servicio/Compra.
 * flujo-real-otin-v2: visible cuando E13 COMPLETADO y E19 no registrado.
 *
 * Llama POST /procesos/{id}/registrar-orden-servicio con:
 *   - nro_ocs: string
 *   - monto_ocs: number
 *   - plazo_entrega: number (días)
 *   - fechas: optional per-etapa date overrides (E14-E20)
 */

import React, { useState } from "react";
import { api } from "@/lib/api";

interface WizardOrdenServicioProps {
  procesoId: number;
  e13Completado: boolean;
  e19Registrado: boolean;
  onSuccess?: () => void;
}

const ETAPAS_FECHAS = ["E14", "E15", "E16", "E17", "E18", "E19", "E20"] as const;

export function WizardOrdenServicio({
  procesoId,
  e13Completado,
  e19Registrado,
  onSuccess,
}: WizardOrdenServicioProps) {
  const [open, setOpen] = useState(false);
  const [nroOcs, setNroOcs] = useState("");
  const [montoOcs, setMontoOcs] = useState("");
  const [plazoEntrega, setPlazoEntrega] = useState("");
  const [fechas, setFechas] = useState<Partial<Record<string, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show trigger when eligible
  if (!e13Completado || e19Registrado) {
    return null;
  }

  function handleOpen() {
    setOpen(true);
    setError(null);
  }

  function handleClose() {
    setOpen(false);
    setNroOcs("");
    setMontoOcs("");
    setPlazoEntrega("");
    setFechas({});
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nroOcs.trim() || !montoOcs || !plazoEntrega) return;

    setIsSubmitting(true);
    setError(null);

    const body: Record<string, unknown> = {
      nro_ocs: nroOcs.trim(),
      monto_ocs: parseFloat(montoOcs),
      plazo_entrega: parseInt(plazoEntrega, 10),
    };

    // Only include fechas that were set
    const fechasSet = Object.fromEntries(
      Object.entries(fechas).filter(([, v]) => v && v.trim())
    );
    if (Object.keys(fechasSet).length > 0) {
      body.fechas = fechasSet;
    }

    try {
      await api.post(`/procesos/${procesoId}/registrar-orden-servicio`, body);
      handleClose();
      onSuccess?.();
    } catch (err: unknown) {
      const status =
        err != null &&
        typeof err === "object" &&
        "response" in err
          ? (err as { response?: { status?: number; data?: { detail?: string } } }).response?.status
          : null;
      const detail =
        err != null &&
        typeof err === "object" &&
        "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;

      if (status === 409) {
        setError(detail ?? "O/S ya registrada para este proceso");
      } else {
        setError(detail ?? "Error al registrar la O/S");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium"
        aria-label="Llegó la O/S — registrar"
      >
        Llegó la O/S — registrar
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Registrar Orden de Servicio"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800">Registrar Orden de Servicio</h2>
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                aria-label="Cerrar modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              {/* Paso 1 — Datos principales */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">
                  Datos de la O/S
                </h3>

                <div>
                  <label
                    htmlFor="nro-ocs"
                    className="block text-xs font-medium text-gray-700 mb-1"
                  >
                    N.ro OCS *
                  </label>
                  <input
                    id="nro-ocs"
                    type="text"
                    required
                    value={nroOcs}
                    onChange={(e) => setNroOcs(e.target.value)}
                    placeholder="OCS-2026-001"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>

                <div>
                  <label
                    htmlFor="monto-ocs"
                    className="block text-xs font-medium text-gray-700 mb-1"
                  >
                    Monto OCS (S/.) *
                  </label>
                  <input
                    id="monto-ocs"
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={montoOcs}
                    onChange={(e) => setMontoOcs(e.target.value)}
                    placeholder="50000.00"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>

                <div>
                  <label
                    htmlFor="plazo-entrega"
                    className="block text-xs font-medium text-gray-700 mb-1"
                  >
                    Plazo de entrega (días) *
                  </label>
                  <input
                    id="plazo-entrega"
                    type="number"
                    required
                    min="1"
                    value={plazoEntrega}
                    onChange={(e) => setPlazoEntrega(e.target.value)}
                    placeholder="30"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </section>

              {/* Paso 2 — Fechas por etapa (opcionales) */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">
                  Fechas estimadas por etapa (opcionales)
                </h3>
                <p className="text-xs text-gray-500">
                  Si no se especifica, el backend usa la fecha de hoy para todas las etapas.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {ETAPAS_FECHAS.map((cod) => (
                    <div key={cod}>
                      <label
                        htmlFor={`fecha-${cod}`}
                        className="block text-xs font-medium text-gray-600 mb-1"
                      >
                        {cod}
                      </label>
                      <input
                        id={`fecha-${cod}`}
                        type="date"
                        value={fechas[cod] ?? ""}
                        onChange={(e) =>
                          setFechas((prev) => ({ ...prev, [cod]: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !nroOcs.trim() || !montoOcs || !plazoEntrega}
                  className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Registrando..." : "Registrar O/S"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
