"use client";

/**
 * EtapaCard — renders a single etapa in the timeline.
 *
 * Layout (redesign):
 *  - Fondo NEUTRO (blanco, borde gris suave). NO se pinta el fondo por actor.
 *  - Barra de color izquierda (~4 px) + pill de estado = señal principal de ESTADO.
 *  - Chip de actor chico con el color del ACTOR (solo ese chip, no toda la tarjeta).
 *  - Panel expandible (chevron) con observaciones, oficio/correo y AdjuntosEtapa.
 *
 * Funcionalidad preservada íntegramente:
 *  - Botón Registrar / Editar / Bloqueado según actionability.
 *  - Botón rápido "No aplica" (EDITOR/ADMIN, PENDIENTE no-bucle no-por_area).
 *  - Bucles: RondasList con "Agregar ronda" + badge de ronda.
 *  - "Reiniciar TDR" (E10 CANCELADO por SIN_PRESUPUESTO).
 *  - AlertaE16 y el indicador de E21.
 */

import React from "react";
import { COLORES_ACTOR, COLORES_ESTADO, CODIGOS_CON_ADJUNTOS } from "@/lib/constants";
import { useAuthStore } from "@/stores/authStore";
import type { EtapaAgrupada } from "@/types/etapa";
import type { EtapaActionability } from "@/lib/etapaRules";
import { getLatestRonda, getBuclesPostEtapa } from "@/lib/etapaRules";
import { formatFechaCorta } from "@/lib/fecha";
import { AlertaE16 } from "./AlertaE16";
import { RondasList } from "./RondasList";
import { AdjuntosEtapa } from "./AdjuntosEtapa";
import { FirmaSecuencialPanel } from "./FirmaSecuencialPanel";
import { useReiniciarTdr, useRegistrarEtapa, useActualizarEtapa } from "@/hooks/useEtapas";

// ----------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------

function EstadoPill({ estado }: { estado: string }) {
  const key = estado as keyof typeof COLORES_ESTADO;
  const color = COLORES_ESTADO[key] ?? COLORES_ESTADO.PENDIENTE;
  const label =
    estado === 'EN_CURSO'   ? 'En Curso' :
    estado === 'COMPLETADO' ? 'Completado' :
    estado === 'PENDIENTE'  ? 'Pendiente' :
    estado === 'OMITIDO'    ? 'Omitido' :
    estado === 'NO_APLICA'  ? 'No aplica' :
    estado === 'SIN_EVIDENCIA' ? 'Sin evidencia' :
    estado;
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: color.bg, color: color.text }}
      aria-label={`Estado: ${label}`}
      data-testid="estado-pill"
    >
      {label}
    </span>
  );
}

function ActorChip({ actor }: { actor: string }) {
  const key = actor as keyof typeof COLORES_ACTOR;
  const color = COLORES_ACTOR[key] ?? COLORES_ACTOR.OTIN;
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap border"
      style={{
        backgroundColor: color.bg,
        color: color.text,
        borderColor: color.border,
      }}
      data-testid="actor-chip"
    >
      {actor}
    </span>
  );
}

// ----------------------------------------------------------------
// Main component
// ----------------------------------------------------------------

interface EtapaCardProps {
  etapa: EtapaAgrupada;
  allEtapas: EtapaAgrupada[];
  procesoId: number;
  procesoEstado?: string;
  actionability: EtapaActionability;
  onRegistrar: () => void;
  /** Cambio 2: called when user clicks an "activate bucle" button; receives the bucle cod */
  onActivarBucle?: (bucleCod: string) => void;
}

export function EtapaCard({
  etapa,
  allEtapas,
  procesoId,
  procesoEstado,
  actionability,
  onRegistrar,
  onActivarBucle,
}: EtapaCardProps) {
  const { user } = useAuthStore();
  const puedeEscribir = user?.rol === 'ADMIN' || user?.rol === 'EDITOR';

  // Expand/collapse state for the detail panel
  const [expanded, setExpanded] = React.useState(false);

  // WU-F3: Reiniciar TDR
  const reiniciarMutation = useReiniciarTdr(procesoId);
  const esCanceladoPorSinPresupuesto =
    etapa.cod === 'E10' &&
    procesoEstado === 'CANCELADO' &&
    etapa.filas.some((f) => f.resultado_eval === 'SIN_PRESUPUESTO');
  const [reiniciarError, setReiniciarError] = React.useState<string | null>(null);

  const isBucle = etapa.es_bucle;
  const latestRonda = getLatestRonda(etapa);

  // NO_APLICA quick-action
  const noAplicaRegistrar = useRegistrarEtapa(procesoId);
  const noAplicaActualizar = useActualizarEtapa(procesoId);
  const noAplicaIsPending = noAplicaRegistrar.isPending || noAplicaActualizar.isPending;
  const [noAplicaError, setNoAplicaError] = React.useState<string | null>(null);
  const puedeMarcarNoAplica =
    puedeEscribir &&
    !isBucle &&
    !etapa.por_area &&
    etapa.estado === 'PENDIENTE';

  function handleNoAplica() {
    setNoAplicaError(null);
    const hoy = new Date().toISOString().slice(0, 10);
    const onError = (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      setNoAplicaError(msg ?? 'No se pudo marcar como No aplica');
    };

    // Bug #6 fix: if a row already exists (e.g. registered as PENDIENTE), use PUT
    // to avoid creating a duplicate row.
    const filaExistente = etapa.filas[0];
    if (filaExistente) {
      noAplicaActualizar.mutate(
        {
          etapaId: filaExistente.id,
          payload: { estado_etapa: 'NO_APLICA', fecha_inicio: hoy },
        },
        { onError }
      );
    } else {
      noAplicaRegistrar.mutate(
        {
          codigo_etapa: etapa.cod,
          nombre_etapa: etapa.nombre,
          fecha_inicio: hoy,
          estado_etapa: 'NO_APLICA',
        },
        { onError }
      );
    }
  }

  // Estado colors
  const estadoKey = etapa.estado as keyof typeof COLORES_ESTADO;
  const estadoColor = COLORES_ESTADO[estadoKey] ?? COLORES_ESTADO.PENDIENTE;

  // Date info from first fila
  const primeraFila = etapa.filas[0] ?? null;
  const fechaInicio = primeraFila?.fecha_inicio ?? null;
  const fechaFin = primeraFila?.fecha_fin ?? null;
  const dias = primeraFila?.dias ?? null;
  const responsable = primeraFila?.responsable ?? null;
  const observaciones = primeraFila?.observaciones ?? null;
  const oficioCorreo = primeraFila?.oficio_correo ?? null;

  // etapaId for AdjuntosEtapa (0 means no row yet)
  const etapaId = primeraFila?.id ?? 0;
  const aceptaAdjuntos = CODIGOS_CON_ADJUNTOS.has(etapa.cod);

  // Has any detail to show in the expanded panel
  const tieneDetalle = !!observaciones || !!oficioCorreo || aceptaAdjuntos;

  // Action button
  const yaRegistrada =
    etapa.estado === 'COMPLETADO' ||
    etapa.estado === 'EN_CURSO' ||
    etapa.estado === 'NO_APLICA' ||
    etapa.estado === 'SIN_EVIDENCIA';
  const accionLabel = !actionability.canRegister
    ? 'Bloqueado'
    : yaRegistrada
      ? 'Editar'
      : 'Registrar';
  const accionAriaLabel = !actionability.canRegister
    ? `${etapa.cod} bloqueado: ${actionability.blockedReason ?? ''}`
    : yaRegistrada
      ? `Editar etapa ${etapa.cod}`
      : `Registrar avance de ${etapa.cod}`;

  // Card border style: dashed for BUCLE stages
  const cardBorderStyle: React.CSSProperties = {
    borderLeftWidth: '4px',
    borderLeftColor: estadoColor.bar,
    borderLeftStyle: isBucle ? 'dashed' : 'solid',
  };

  return (
    <article
      className="bg-white rounded-lg border border-gray-200 relative overflow-hidden"
      style={cardBorderStyle}
      aria-label={`Etapa ${etapa.cod}: ${etapa.nombre}`}
      data-testid={`etapa-card-${etapa.cod}`}
    >
      {/* Main content area */}
      <div className="p-3">

        {/* Header row: actor chip · code · name · (expand btn) · state pill */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">

            {/* Row 1: actor chip + code + name */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <ActorChip actor={etapa.area_responsable} />
              <span className="text-xs font-mono font-bold text-gray-600">
                {etapa.cod}
              </span>
              <span className="text-sm font-semibold text-gray-800 truncate">
                {etapa.nombre}
              </span>
              {/* Cambio 5 — Tooltip DTDIS en E06b */}
              {etapa.cod === 'E06b' && (
                <span
                  data-testid="dtdis-tooltip"
                  title="DTDIS = Dirección de Tecnologías Digitales de Información y Servicios del INEI. Aplica cuando el bien/servicio requiere V°B° técnico especializado."
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-xs font-bold cursor-help select-none flex-shrink-0"
                  aria-label="DTDIS: información sobre este organismo"
                  role="img"
                >
                  i
                </span>
              )}
            </div>

            {/* Row 2: state pill + ronda badge + E16 alerta */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <EstadoPill estado={etapa.estado} />
              {isBucle && latestRonda !== null && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium border"
                  style={{
                    backgroundColor: COLORES_ACTOR.BUCLE.bg,
                    color: COLORES_ACTOR.BUCLE.text,
                    borderColor: COLORES_ACTOR.BUCLE.border,
                  }}
                >
                  Ronda {latestRonda}
                </span>
              )}
              {etapa.cod === 'E16' && (
                <AlertaE16 alerta_otpp={etapa.alerta_otpp} />
              )}
            </div>

            {/* E01b: fecha_limite_respuesta countdown badge */}
            {etapa.cod === 'E01b' && primeraFila?.fecha_limite_respuesta && (() => {
              const limite = new Date(primeraFila.fecha_limite_respuesta);
              const hoy = new Date();
              hoy.setHours(0, 0, 0, 0);
              const diasRestantes = Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full self-start ${
                    diasRestantes <= 0
                      ? 'bg-red-100 text-red-700'
                      : diasRestantes <= 3
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-100 text-blue-700'
                  }`}
                  aria-label={`Fecha límite de respuesta: ${diasRestantes} días`}
                >
                  {diasRestantes <= 0
                    ? 'Vence hoy / Vencido'
                    : `Vence en ${diasRestantes} días`}
                </div>
              );
            })()}

            {/* Cambio 6 — E01c: cmn_siga_confirmado tri-state per-area summary */}
            {etapa.cod === 'E01c' && etapa.filas.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {etapa.filas.map((fila) => {
                  const cmn = fila.cmn_siga_confirmado;
                  const badgeClass =
                    cmn === 'SI'       ? 'bg-green-100 text-green-700' :
                    cmn === 'NO'       ? 'bg-red-100 text-red-700' :
                    cmn === 'EN_CURSO' ? 'bg-yellow-100 text-yellow-700' :
                                         'bg-gray-100 text-gray-500';
                  const label =
                    cmn === 'SI'       ? 'SI' :
                    cmn === 'NO'       ? 'NO' :
                    cmn === 'EN_CURSO' ? 'EN CURSO' :
                                         '—';
                  return (
                    <span
                      key={fila.area_usuaria}
                      className={`text-xs px-1.5 py-0.5 rounded font-medium ${badgeClass}`}
                      aria-label={`CMN ${fila.area_usuaria}: ${label}`}
                    >
                      {fila.area_usuaria}: CMN {label}
                    </span>
                  );
                })}
              </div>
            )}

            {/* E21: inicio del plazo */}
            {etapa.cod === 'E21' && etapa.estado === 'COMPLETADO' && (
              <div
                className="text-xs font-medium text-blue-700"
                aria-label="Inicio del plazo del servicio/bien"
              >
                Inicio del plazo del servicio/bien
              </div>
            )}

            {/* Dates: non-loop, non-per-area */}
            {!isBucle && !etapa.por_area && (
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                {fechaInicio && <span>Inicio: {formatFechaCorta(fechaInicio)}</span>}
                {fechaFin && <span>Fin: {formatFechaCorta(fechaFin)}</span>}
                {dias !== null && <span>{dias} d</span>}
              </div>
            )}

            {/* Per-area summary */}
            {etapa.por_area && etapa.filas.length > 0 && (
              <div className="text-xs text-gray-500">
                {etapa.filas.length} area{etapa.filas.length !== 1 ? 's' : ''} registrada{etapa.filas.length !== 1 ? 's' : ''}
                {etapa.monto_total !== null && (
                  <span className="ml-2 font-semibold text-gray-700">
                    Total: S/ {etapa.monto_total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            )}

            {/* Responsable (compact view) */}
            {responsable && (
              <div className="text-xs text-gray-500">
                Responsable: <span className="text-gray-700">{responsable}</span>
              </div>
            )}
          </div>

          {/* Right: action button + expand button */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {/* Registrar / Editar / Bloqueado button — EDITOR/ADMIN only */}
            {puedeEscribir && (
              <div className="relative group">
                <button
                  onClick={actionability.canRegister ? onRegistrar : undefined}
                  disabled={!actionability.canRegister}
                  className="text-xs px-2.5 py-1 rounded border font-medium transition-colors
                             disabled:opacity-40 disabled:cursor-not-allowed
                             border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                  aria-label={accionAriaLabel}
                  aria-disabled={!actionability.canRegister}
                >
                  {accionLabel}
                </button>
                {/* Tooltip for blocked stages */}
                {!actionability.canRegister && actionability.blockedReason && (
                  <div
                    className="absolute right-0 top-full mt-1 z-10 hidden group-hover:block
                               bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap max-w-xs"
                    role="tooltip"
                  >
                    {actionability.blockedReason}
                  </div>
                )}
              </div>
            )}

            {/* Expand/collapse button — only if there is detail to show */}
            {tieneDetalle && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors
                           flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-gray-100"
                aria-label={expanded ? `Contraer detalle de ${etapa.cod}` : `Expandir detalle de ${etapa.cod}`}
                aria-expanded={expanded}
                data-testid="expand-toggle"
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="6 3 11 8 6 13" />
                </svg>
                {expanded ? 'Menos' : 'Detalle'}
              </button>
            )}
          </div>
        </div>

        {/* NO_APLICA quick-action */}
        {puedeMarcarNoAplica && (
          <div className="mt-2 flex flex-col gap-1">
            <button
              onClick={handleNoAplica}
              disabled={noAplicaIsPending}
              className="text-xs px-2 py-1 rounded border font-medium transition-colors
                         border-slate-300 text-slate-600 bg-slate-50
                         hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed
                         self-start"
              aria-label={`Marcar ${etapa.cod} como No aplica`}
            >
              {noAplicaIsPending ? 'Guardando...' : 'No aplica'}
            </button>
            {noAplicaError && (
              <p className="text-xs text-red-600" role="alert">{noAplicaError}</p>
            )}
          </div>
        )}

        {/* Cambio 2 — Botones inline para activar bucles */}
        {puedeEscribir && (() => {
          const buclesCods = getBuclesPostEtapa(etapa.cod);
          if (buclesCods.length === 0) return null;

          // Button config per bucle code
          const BUCLE_LABELS: Record<string, string> = {
            E05: '+ Hubo observaciones al TDR',
            E06: '+ Hubo observaciones al TDR',
            E06b: '+ Solicitar V°B° de DTDIS',
            E06c: '+ Re-firmar áreas tras corrección',
            E08a: '+ Hubo observaciones a cotizaciones',
            E08b: '+ Hubo observaciones a cotizaciones',
          };

          const buttonsToShow = buclesCods.filter((bCod) => {
            const bucleEtapa = allEtapas.find((e) => e.cod === bCod);
            // Only show if the bucle has NO rondas yet
            return bucleEtapa && (bucleEtapa.rondas?.length ?? 0) === 0;
          });

          if (buttonsToShow.length === 0) return null;

          // Deduplicate by label (E05+E06 share the same label)
          const seen = new Set<string>();
          const uniqueButtons = buttonsToShow.filter((bCod) => {
            const lbl = BUCLE_LABELS[bCod] ?? bCod;
            if (seen.has(lbl)) return false;
            seen.add(lbl);
            return true;
          });

          return (
            <div className="mt-2 flex flex-wrap gap-1">
              {uniqueButtons.map((bCod) => (
                <button
                  key={bCod}
                  type="button"
                  onClick={() => onActivarBucle?.(bCod)}
                  data-bucle-cod={bCod}
                  className="text-xs px-2 py-0.5 rounded border font-medium transition-colors
                             border-slate-300 text-slate-500 bg-white hover:bg-slate-50
                             hover:border-slate-400"
                  aria-label={BUCLE_LABELS[bCod] ?? bCod}
                >
                  {BUCLE_LABELS[bCod] ?? bCod}
                </button>
              ))}
            </div>
          );
        })()}

        {/* WU-F3: Reiniciar TDR */}
        {puedeEscribir && esCanceladoPorSinPresupuesto && (
          <div className="mt-2 flex flex-col gap-1">
            <button
              onClick={() => {
                setReiniciarError(null);
                reiniciarMutation.mutate(undefined, {
                  onError: (err) => {
                    const msg = (err as { response?: { data?: { detail?: string } } })
                      ?.response?.data?.detail;
                    setReiniciarError(msg ?? 'No se pudo reiniciar el TDR');
                  },
                });
              }}
              disabled={reiniciarMutation.isPending}
              className="text-xs px-3 py-1.5 rounded border font-medium transition-colors
                         border-orange-400 text-orange-700 bg-orange-50
                         hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed
                         self-start"
              aria-label="Reiniciar TDR: reabrir E02 en nueva ronda"
            >
              {reiniciarMutation.isPending ? 'Reiniciando...' : 'Reiniciar TDR (nueva ronda)'}
            </button>
            {reiniciarError && (
              <p className="text-xs text-red-600" role="alert">{reiniciarError}</p>
            )}
          </div>
        )}

        {/* Rondas list for bucle stages */}
        {isBucle && (
          <div className="mt-2">
            <RondasList
              rondas={etapa.rondas}
              procesoId={procesoId}
              cod={etapa.cod}
              canAddRonda={actionability.canRegister && puedeEscribir}
              blockedReason={actionability.blockedReason}
            />
          </div>
        )}

        {/* E02b / E06c: FirmaSecuencialPanel — sequential signing */}
        {(etapa.cod === 'E02b' || etapa.cod === 'E06c') && (
          <div className="mt-2 border-t border-gray-100 pt-2">
            <FirmaSecuencialPanel
              procesoId={procesoId}
              etapaCod={etapa.cod}
              firmas={etapa.firmas ?? []}
              onRefresh={() => {
                // Parent LineaTiempo will invalidate queries via onRefresh if provided
              }}
            />
          </div>
        )}
      </div>

      {/* Expandable detail panel */}
      {tieneDetalle && expanded && (
        <div
          className="border-t border-gray-100 bg-gray-50 px-3 py-3 flex flex-col gap-3"
          data-testid="detail-panel"
        >
          {observaciones && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Que ocurrio
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{observaciones}</p>
            </div>
          )}
          {oficioCorreo && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Oficio / Correo
              </p>
              <p className="text-sm text-gray-700">{oficioCorreo}</p>
            </div>
          )}
          {aceptaAdjuntos && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Documentos
              </p>
              <AdjuntosEtapa etapaId={etapaId} canEdit={puedeEscribir} />
            </div>
          )}
        </div>
      )}
    </article>
  );
}
