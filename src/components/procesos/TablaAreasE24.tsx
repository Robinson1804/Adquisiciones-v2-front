"use client";

/**
 * TablaAreasE24 — per-area conformity table for E24.
 *
 * - One row per area in areasUsuarias
 * - Columns: Area, Fecha conformidad, Dias demora, Estado, Acciones
 * - POST if no existing row; PUT if row exists
 * Spec §J
 */

import React, { useState } from "react";
import type { FilaArea, CmnSigaState } from "@/types/etapa";
import { useRegistrarEtapa, useActualizarEtapa } from "@/hooks/useEtapas";
import { useAuthStore } from "@/stores/authStore";
import { COLORES_ESTADO } from "@/lib/constants";
import { getDiasDemoraArea } from "@/lib/etapaRules";
import { formatFechaCorta } from "@/lib/fecha";
import { AdjuntosEtapa } from "./AdjuntosEtapa";

interface TablaAreasE24Props {
  procesoId: number;
  filas: FilaArea[];
  areasUsuarias: string[];
  /** Start of the chain for this stage (previous stage end) — used for días de demora. */
  fechaInicioChain?: string | null;
  /** Column label for the date — E24 uses "Fecha conformidad", E01 "Fecha de solicitud". */
  fechaLabel?: string;
  /** codigo_etapa actually registered by this table (E24 default; E01 reuses it). */
  codigoEtapa?: string;
  nombreEtapa?: string;
}

interface RowState {
  fecha: string;
  cmn: string;          // cmn_adjunto for E01/cmn_siga_confirmado for E01c
  editing: boolean;
}

export function TablaAreasE24({
  procesoId,
  filas,
  areasUsuarias,
  fechaInicioChain = null,
  fechaLabel = "Fecha conformidad",
  codigoEtapa = "E24",
  nombreEtapa = "Conformidad area usuaria [por area] (Areas - OTIN)",
}: TablaAreasE24Props) {
  const { mutate: registrar, isPending: isRegistrando } = useRegistrarEtapa(procesoId);
  const { mutate: actualizar, isPending: isActualizando } = useActualizarEtapa(procesoId);
  const { user } = useAuthStore();
  const canEdit = user?.rol === "ADMIN" || user?.rol === "EDITOR";

  // flujo-real-otin-v2: E01 removed; E01c is the area-level requerimiento stage
  const isE01 = codigoEtapa === "E01" || codigoEtapa === "E01c";
  // Cambio 6: E01c uses cmn_siga_confirmado (tri-state), E01 uses cmn_adjunto (string)
  const isE01c = codigoEtapa === "E01c";

  const [rowState, setRowState] = useState<Record<string, RowState>>(() => {
    const state: Record<string, RowState> = {};
    for (const area of areasUsuarias) {
      const fila = filas.find((f) => f.area_usuaria === area);
      // Cambio 6: E01c uses cmn_siga_confirmado (tri-state); E01 uses cmn_adjunto
      const cmnValue = isE01c
        ? (fila?.cmn_siga_confirmado ?? 'NO')
        : (fila?.cmn_adjunto ?? 'NO');
      state[area] = {
        fecha: fila?.fecha_inicio ?? '',
        cmn: cmnValue as string,
        editing: false,
      };
    }
    return state;
  });

  function setEditing(area: string, editing: boolean) {
    setRowState((prev) => {
      const current = prev[area] ?? { fecha: '', cmn: 'NO', editing: false };
      return { ...prev, [area]: { ...current, editing } satisfies RowState };
    });
  }

  function updateFecha(area: string, value: string) {
    setRowState((prev) => {
      const current = prev[area] ?? { fecha: '', cmn: 'NO', editing: false };
      return { ...prev, [area]: { ...current, fecha: value } satisfies RowState };
    });
  }

  function updateCmn(area: string, value: string) {
    setRowState((prev) => {
      const current = prev[area] ?? { fecha: '', cmn: 'NO', editing: false };
      return { ...prev, [area]: { ...current, cmn: value } satisfies RowState };
    });
  }

  function handleSave(area: string) {
    const existingFila = filas.find((f) => f.area_usuaria === area);
    const fecha = rowState[area]?.fecha ?? '';
    if (!fecha) return;

    const cmn = rowState[area]?.cmn ?? 'NO';

    // Cambio 6: E01c sends cmn_siga_confirmado (tri-state); E01 (legacy) sends cmn_adjunto
    const cmnPayload = isE01c
      ? { cmn_siga_confirmado: cmn as CmnSigaState }
      : isE01
        ? { cmn_adjunto: cmn }
        : {};

    if (existingFila) {
      actualizar(
        {
          etapaId: existingFila.id,
          payload: {
            fecha_inicio: fecha,
            estado_etapa: 'COMPLETADO',
            ...cmnPayload,
          },
        },
        { onSuccess: () => setEditing(area, false) }
      );
    } else {
      registrar(
        {
          codigo_etapa: codigoEtapa,
          nombre_etapa: nombreEtapa,
          fecha_inicio: fecha,
          estado_etapa: 'COMPLETADO',
          area_usuaria: area,
          ...cmnPayload,
        },
        { onSuccess: () => setEditing(area, false) }
      );
    }
  }

  const isSaving = isRegistrando || isActualizando;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse" aria-label="Conformidades por area">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">Area</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">{fechaLabel}</th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600">Dias demora</th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600">Estado</th>
              {isE01 && (
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600">CMN</th>
              )}
              <th className="py-2 px-3 text-xs font-semibold text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {areasUsuarias.map((area) => {
              const fila = filas.find((f) => f.area_usuaria === area);
              const row: RowState = rowState[area] ?? { fecha: '', cmn: 'NO', editing: false };
              const estado = fila?.estado_etapa ?? 'PENDIENTE';
              const estadoKey = (estado === 'COMPLETADO' ? 'COMPLETADO' : estado === 'EN_CURSO' ? 'EN_CURSO' : 'PENDIENTE') as keyof typeof COLORES_ESTADO;
              const estadoColor = COLORES_ESTADO[estadoKey];
              const diasDemora = getDiasDemoraArea(
                fila?.fecha_inicio ?? null,
                fechaInicioChain
              );

              return (
                <React.Fragment key={area}>
                <tr
                  className="border-b border-gray-100 hover:bg-gray-50"
                  data-testid={`e24-row-${area}`}
                >
                  <td className="py-2 px-3 font-medium text-gray-700">{area}</td>

                  <td className="py-2 px-3">
                    {row.editing ? (
                      <input
                        type="date"
                        value={row.fecha}
                        min={fechaInicioChain ?? undefined}
                        onChange={(e) => updateFecha(area, e.target.value)}
                        className="border border-gray-300 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                        aria-label={`${fechaLabel} para ${area}`}
                      />
                    ) : (
                      <span>{formatFechaCorta(fila?.fecha_inicio)}</span>
                    )}
                  </td>

                  <td className="py-2 px-3 text-center text-gray-700">
                    {diasDemora !== null ? `${diasDemora} d` : '—'}
                  </td>

                  <td className="py-2 px-3 text-center">
                    <span
                      className="text-xs px-2 py-0.5 rounded-lg font-medium"
                      style={{ backgroundColor: estadoColor.bg, color: estadoColor.text }}
                    >
                      {estado}
                    </span>
                  </td>

                  {isE01 && (
                    <td className="py-2 px-3 text-center">
                      {row.editing ? (
                        <select
                          value={row.cmn}
                          onChange={(e) => updateCmn(area, e.target.value)}
                          aria-label={`CMN para ${area}`}
                          className="border border-gray-300 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                        >
                          <option value="SI">SI</option>
                          <option value="NO">NO</option>
                          {/* Cambio 6: E01c uses tri-state; E01 (legacy) uses PENDIENTE */}
                          {isE01c ? (
                            <option value="EN_CURSO">EN_CURSO</option>
                          ) : (
                            <option value="PENDIENTE">PENDIENTE</option>
                          )}
                        </select>
                      ) : (
                        <span>
                          {isE01c
                            ? (fila?.cmn_siga_confirmado ?? '—')
                            : (fila?.cmn_adjunto ?? '—')}
                        </span>
                      )}
                    </td>
                  )}

                  <td className="py-2 px-3">
                    {row.editing ? (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleSave(area)}
                          disabled={isSaving}
                          className="text-xs px-2 py-0.5 rounded bg-green-600 text-white disabled:opacity-50"
                        >
                          {isSaving ? '...' : 'Guardar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(area, false)}
                          className="text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-600"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditing(area, true)}
                        className="text-xs px-2 py-0.5 rounded border border-blue-300 text-blue-700 hover:bg-blue-50"
                        aria-label={`Editar conformidad ${area}`}
                      >
                        {fila ? 'Editar' : 'Registrar'}
                      </button>
                    )}
                  </td>
                </tr>
                {/* C3c — Adjuntos expansion row per area (E24 is a key stage) */}
                <tr className="bg-gray-50">
                  <td colSpan={isE01 ? 6 : 5} className="pb-2 px-3">
                    <AdjuntosEtapa
                      etapaId={fila?.id ?? 0}
                      canEdit={canEdit}
                    />
                  </td>
                </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
