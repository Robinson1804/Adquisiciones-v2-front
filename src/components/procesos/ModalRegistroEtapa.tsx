"use client";

/**
 * ModalRegistroEtapa — contextual form for registering/updating an etapa.
 *
 * - Shows ONLY campos_extra fields for the selected stage (driven by ETAPAS_CONFIG)
 * - Always shows: fecha_inicio, fecha_fin, estado_etapa, responsable, oficio_correo, observaciones
 * - Bucle stages: shows motivo_bucle; nro_ronda is display-only
 * - E11/E24 (por_area): delegates to TablaAreasE11/TablaAreasE24
 * - Submits via useRegistrarEtapa
 * Spec §I, Design §FRONTEND
 */

import React, { useState } from "react";
import { ETAPAS_CONFIG, CODIGOS_CON_ADJUNTOS } from "@/lib/constants";
import { useRegistrarEtapa, useActualizarEtapa } from "@/hooks/useEtapas";
import { useAuthStore } from "@/stores/authStore";
import { TablaAreasE11 } from "./TablaAreasE11";
import { TablaAreasE24 } from "./TablaAreasE24";
import { AdjuntosEtapa } from "./AdjuntosEtapa";
import type { EtapaAgrupada, EtapaCreatePayload } from "@/types/etapa";

interface ModalRegistroEtapaProps {
  procesoId: number;
  etapa: EtapaAgrupada;
  open: boolean;
  onClose: () => void;
  areasUsuarias?: string[];
  /** Suggested start date = end date of the previous chain stage (consecutive flow). */
  fechaInicioSugerida?: string | null;
}

// Derive campos_extra for a given stage code from ETAPAS_CONFIG
function getCamposExtra(cod: string): readonly string[] {
  const config = ETAPAS_CONFIG.find((e) => e.cod === cod);
  if (!config) return [];
  return 'campos_extra' in config ? (config.campos_extra as readonly string[]) : [];
}

function getLabelForCampo(campo: string): string {
  const labels: Record<string, string> = {
    cmn_adjunto: 'CMN Adjunto',
    area_usuaria: 'Area Usuaria',
    monto_cert: 'Monto Cert. S/.',
    resultado_eval: 'Resultado Evaluacion',
    motivo_bucle: 'Motivo de la Ronda',
    nro_ronda: 'N. Ronda',
    fecha_envio_otpp: 'Fecha Envio OTPP',
    fecha_resp_otpp: 'Fecha Respuesta OTPP',
    nro_ocs: 'N. OCS',
    monto_ocs: 'Monto OCS S/.',
    plazo_entrega: 'Plazo Entrega (dias)',
    fecha_limite_respuesta: 'Fecha limite de respuesta',
  };
  return labels[campo] ?? campo;
}

const CMN_OPCIONES = ['SI', 'NO', 'PENDIENTE'] as const;
const RESULTADO_EVAL_OPCIONES = [
  'APROBADO',
  'CON OBSERVACIONES',
  'VALIDADO',
  'SIN_PRESUPUESTO',
] as const;
const ESTADO_ETAPA_OPCIONES = ['PENDIENTE', 'EN_CURSO', 'COMPLETADO'] as const;

export function ModalRegistroEtapa({
  procesoId,
  etapa,
  open,
  onClose,
  areasUsuarias = [],
  fechaInicioSugerida = null,
}: ModalRegistroEtapaProps) {
  const { mutate: registrar, isPending: isRegistrando, isError: isRegistrarError, error: registrarError } = useRegistrarEtapa(procesoId);
  const { mutate: actualizar, isPending: isActualizando, isError: isActualizarError, error: actualizarError } = useActualizarEtapa(procesoId);

  const isPending = isRegistrando || isActualizando;
  const isError = isRegistrarError || isActualizarError;
  const error = registrarError ?? actualizarError;
  const { user } = useAuthStore();
  const canEdit = user?.rol === "ADMIN" || user?.rol === "EDITOR";

  const camposExtra = getCamposExtra(etapa.cod);
  const isBucle = etapa.es_bucle;
  const isPorArea = etapa.por_area;

  // For bucle stages: if at least one ronda exists, we PUT the last one (update)
  // instead of POST (insert). This prevents duplicates: agregar-ronda creates a
  // PENDIENTE row; "Registrar avance" completes it via PUT.
  const lastRonda = isBucle && etapa.rondas.length > 0
    ? etapa.rondas.reduce((max, r) => (r.nro_ronda > max.nro_ronda ? r : max))
    : null;

  // Existing registration for simple stages — used to prefill the form when
  // reopening an already-registered/completed stage. Bucle stages always add a
  // fresh round, so they are never prefilled.
  const filaExistente = isBucle ? undefined : etapa.filas[0];
  const numOrEmpty = (v: number | null | undefined) =>
    v != null ? String(v) : "";

  // Display ronda number: when updating an existing ronda (lastRonda !== null),
  // show that ronda's number; otherwise show the next number (new ronda via POST).
  const nextRonda =
    isBucle && lastRonda !== null
      ? lastRonda.nro_ronda
      : isBucle && etapa.rondas.length > 0
        ? Math.max(...etapa.rondas.map((r) => r.nro_ronda)) + 1
        : 1;

  // Form state — prefilled from the existing row; for a new registration,
  // fecha_inicio defaults to the previous chain stage's end (consecutive flow).
  const [fechaInicio, setFechaInicio] = useState(
    () => filaExistente?.fecha_inicio ?? fechaInicioSugerida ?? ""
  );
  const [fechaFin, setFechaFin] = useState(() => filaExistente?.fecha_fin ?? "");
  const [estadoEtapa, setEstadoEtapa] = useState<string>(
    () => filaExistente?.estado_etapa ?? "EN_CURSO"
  );
  const [responsable, setResponsable] = useState(
    () => filaExistente?.responsable ?? ""
  );
  const [oficioCorreo, setOficioCorreo] = useState(
    () => filaExistente?.oficio_correo ?? ""
  );
  const [observaciones, setObservaciones] = useState(
    () => filaExistente?.observaciones ?? ""
  );
  // campos_extra fields
  const [cmnAdjunto, setCmnAdjunto] = useState<string>(
    () => filaExistente?.cmn_adjunto ?? "PENDIENTE"
  );
  const [montoCert, setMontoCert] = useState<string>(
    () => numOrEmpty(filaExistente?.monto_cert)
  );
  const [resultadoEval, setResultadoEval] = useState<string>(
    () => filaExistente?.resultado_eval ?? ""
  );
  const [motivoBucle, setMotivoBucle] = useState<string>("");
  const [fechaEnvioOtpp, setFechaEnvioOtpp] = useState<string>(
    () => filaExistente?.fecha_envio_otpp ?? ""
  );
  const [fechaRespOtpp, setFechaRespOtpp] = useState<string>(
    () => filaExistente?.fecha_resp_otpp ?? ""
  );
  const [nroOcs, setNroOcs] = useState<string>(
    () => filaExistente?.nro_ocs ?? ""
  );
  const [montoOcs, setMontoOcs] = useState<string>(
    () => numOrEmpty(filaExistente?.monto_ocs)
  );
  const [plazoEntrega, setPlazoEntrega] = useState<string>(
    () => numOrEmpty(filaExistente?.plazo_entrega)
  );
  const [fechaLimiteRespuesta, setFechaLimiteRespuesta] = useState<string>(
    () => filaExistente?.fecha_limite_respuesta ?? ""
  );

  if (!open) return null;

  // E11/E24 delegate to per-area tables
  if (isPorArea) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        role="dialog"
        aria-modal="true"
        aria-label={`Registro etapa ${etapa.cod}`}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 p-6 overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-800">
              {etapa.cod} — {etapa.nombre}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              aria-label="Cerrar modal"
            >
              &times;
            </button>
          </div>

          {etapa.cod === 'E11' ? (
            <TablaAreasE11
              procesoId={procesoId}
              filas={etapa.filas}
              areasUsuarias={areasUsuarias}
              fechaInicioChain={fechaInicioSugerida}
            />
          ) : (
            <TablaAreasE24
              procesoId={procesoId}
              filas={etapa.filas}
              areasUsuarias={areasUsuarias}
              fechaInicioChain={fechaInicioSugerida}
              fechaLabel={etapa.cod === 'E01c' ? 'Fecha de solicitud' : 'Fecha conformidad'}
              codigoEtapa={etapa.cod}
              nombreEtapa={etapa.nombre}
            />
          )}
        </div>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: EtapaCreatePayload = {
      codigo_etapa: etapa.cod,
      nombre_etapa: etapa.nombre,
      fecha_inicio: fechaInicio,
      estado_etapa: estadoEtapa,
      ...(fechaFin && { fecha_fin: fechaFin }),
      ...(responsable && { responsable }),
      ...(oficioCorreo && { oficio_correo: oficioCorreo }),
      ...(observaciones && { observaciones }),
    };

    // Add campos_extra
    if (camposExtra.includes('cmn_adjunto')) payload.cmn_adjunto = cmnAdjunto;
    if (camposExtra.includes('monto_cert') && montoCert)
      payload.monto_cert = parseFloat(montoCert);
    if (camposExtra.includes('resultado_eval') && resultadoEval)
      payload.resultado_eval = resultadoEval;
    if ((isBucle || camposExtra.includes('motivo_bucle')) && motivoBucle)
      payload.motivo_bucle = motivoBucle;
    if (camposExtra.includes('fecha_envio_otpp') && fechaEnvioOtpp)
      payload.fecha_envio_otpp = fechaEnvioOtpp;
    if (camposExtra.includes('fecha_resp_otpp') && fechaRespOtpp)
      payload.fecha_resp_otpp = fechaRespOtpp;
    if (camposExtra.includes('nro_ocs') && nroOcs) payload.nro_ocs = nroOcs;
    if (camposExtra.includes('monto_ocs') && montoOcs)
      payload.monto_ocs = parseFloat(montoOcs);
    if (camposExtra.includes('plazo_entrega') && plazoEntrega)
      payload.plazo_entrega = parseInt(plazoEntrega, 10);
    if (camposExtra.includes('fecha_limite_respuesta') && fechaLimiteRespuesta)
      payload.fecha_limite_respuesta = fechaLimiteRespuesta;

    // Bucle: si ya existe una ronda, ACTUALIZARLA (no insertar otra).
    // Simple (no bucle, no por-area): si ya hay una fila, ACTUALIZARLA — antes
    // cada "Registrar avance" duplicaba filas con estados conflictivos.
    // Por-area: nunca llega aca (retorno temprano arriba — usa TablaAreasE11/E24).
    if (isBucle && lastRonda !== null) {
      actualizar(
        { etapaId: lastRonda.id, payload },
        { onSuccess: () => onClose() }
      );
    } else if (!isBucle && !isPorArea && filaExistente) {
      actualizar(
        { etapaId: filaExistente.id, payload },
        { onSuccess: () => onClose() }
      );
    } else {
      registrar(payload, {
        onSuccess: () => onClose(),
      });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label={`Registro etapa ${etapa.cod}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-800">
            {etapa.cod} — {etapa.nombre}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </div>

        {/* Ronda display-only for bucle stages */}
        {isBucle && (
          <div className="mb-3 text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
            Ronda {nextRonda} — asignado por el sistema
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Common fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${etapa.cod}-fecha-inicio`} className="block text-xs font-medium text-gray-700 mb-1">
                Fecha Inicio *
              </label>
              <input
                id={`${etapa.cod}-fecha-inicio`}
                type="date"
                required
                value={fechaInicio}
                min={fechaInicioSugerida ?? undefined}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-required="true"
              />
            </div>

            <div>
              <label htmlFor={`${etapa.cod}-fecha-fin`} className="block text-xs font-medium text-gray-700 mb-1">
                Fecha Fin
              </label>
              <input
                id={`${etapa.cod}-fecha-fin`}
                type="date"
                value={fechaFin}
                min={fechaInicio || fechaInicioSugerida || undefined}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label htmlFor={`${etapa.cod}-estado`} className="block text-xs font-medium text-gray-700 mb-1">
              Estado *
            </label>
            <select
              id={`${etapa.cod}-estado`}
              required
              value={estadoEtapa}
              onChange={(e) => setEstadoEtapa(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-required="true"
            >
              {ESTADO_ETAPA_OPCIONES.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'EN_CURSO' ? 'En Curso' : opt.charAt(0) + opt.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`${etapa.cod}-responsable`} className="block text-xs font-medium text-gray-700 mb-1">
              Responsable
            </label>
            <input
              id={`${etapa.cod}-responsable`}
              type="text"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Nombre del responsable"
            />
          </div>

          <div>
            <label htmlFor={`${etapa.cod}-oficio`} className="block text-xs font-medium text-gray-700 mb-1">
              N. Oficio / Correo
            </label>
            <input
              id={`${etapa.cod}-oficio`}
              type="text"
              value={oficioCorreo}
              onChange={(e) => setOficioCorreo(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Referencia documental"
            />
          </div>

          {/* campos_extra — only render fields defined for this stage */}
          {camposExtra.includes('cmn_adjunto') && (
            <div>
              <label htmlFor={`${etapa.cod}-cmn`} className="block text-xs font-medium text-gray-700 mb-1">
                {getLabelForCampo('cmn_adjunto')} *
              </label>
              <select
                id={`${etapa.cod}-cmn`}
                required
                value={cmnAdjunto}
                onChange={(e) => setCmnAdjunto(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-required="true"
              >
                {CMN_OPCIONES.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}

          {camposExtra.includes('monto_cert') && (
            <div>
              <label htmlFor={`${etapa.cod}-monto`} className="block text-xs font-medium text-gray-700 mb-1">
                {getLabelForCampo('monto_cert')} *
              </label>
              <input
                id={`${etapa.cod}-monto`}
                type="number"
                step="0.01"
                min="0"
                required
                value={montoCert}
                onChange={(e) => setMontoCert(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="0.00"
                aria-required="true"
              />
            </div>
          )}

          {camposExtra.includes('resultado_eval') && (
            <div>
              <label htmlFor={`${etapa.cod}-resultado`} className="block text-xs font-medium text-gray-700 mb-1">
                {getLabelForCampo('resultado_eval')} *
              </label>
              <select
                id={`${etapa.cod}-resultado`}
                required
                value={resultadoEval}
                onChange={(e) => setResultadoEval(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-required="true"
              >
                <option value="">Seleccionar...</option>
                {RESULTADO_EVAL_OPCIONES.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}

          {(isBucle || camposExtra.includes('motivo_bucle')) && (
            <div>
              <label htmlFor={`${etapa.cod}-motivo`} className="block text-xs font-medium text-gray-700 mb-1">
                {getLabelForCampo('motivo_bucle')} *
              </label>
              <textarea
                id={`${etapa.cod}-motivo`}
                rows={3}
                required
                value={motivoBucle}
                onChange={(e) => setMotivoBucle(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="Describa el motivo..."
                aria-required="true"
              />
            </div>
          )}

          {camposExtra.includes('fecha_envio_otpp') && (
            <div>
              <label htmlFor={`${etapa.cod}-envio-otpp`} className="block text-xs font-medium text-gray-700 mb-1">
                {getLabelForCampo('fecha_envio_otpp')} *
              </label>
              <input
                id={`${etapa.cod}-envio-otpp`}
                type="date"
                required
                value={fechaEnvioOtpp}
                onChange={(e) => setFechaEnvioOtpp(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-required="true"
              />
            </div>
          )}

          {camposExtra.includes('fecha_resp_otpp') && (
            <div>
              <label htmlFor={`${etapa.cod}-resp-otpp`} className="block text-xs font-medium text-gray-700 mb-1">
                {getLabelForCampo('fecha_resp_otpp')}
              </label>
              <input
                id={`${etapa.cod}-resp-otpp`}
                type="date"
                value={fechaRespOtpp}
                onChange={(e) => setFechaRespOtpp(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          {camposExtra.includes('nro_ocs') && (
            <div>
              <label htmlFor={`${etapa.cod}-nro-ocs`} className="block text-xs font-medium text-gray-700 mb-1">
                {getLabelForCampo('nro_ocs')} *
              </label>
              <input
                id={`${etapa.cod}-nro-ocs`}
                type="text"
                required
                value={nroOcs}
                onChange={(e) => setNroOcs(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="OCS-2026-001"
                aria-required="true"
              />
            </div>
          )}

          {camposExtra.includes('monto_ocs') && (
            <div>
              <label htmlFor={`${etapa.cod}-monto-ocs`} className="block text-xs font-medium text-gray-700 mb-1">
                {getLabelForCampo('monto_ocs')} *
              </label>
              <input
                id={`${etapa.cod}-monto-ocs`}
                type="number"
                step="0.01"
                min="0"
                required
                value={montoOcs}
                onChange={(e) => setMontoOcs(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="0.00"
                aria-required="true"
              />
            </div>
          )}

          {camposExtra.includes('plazo_entrega') && (
            <div>
              <label htmlFor={`${etapa.cod}-plazo`} className="block text-xs font-medium text-gray-700 mb-1">
                {getLabelForCampo('plazo_entrega')} *
              </label>
              <input
                id={`${etapa.cod}-plazo`}
                type="number"
                min="1"
                required
                value={plazoEntrega}
                onChange={(e) => setPlazoEntrega(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="30"
                aria-required="true"
              />
            </div>
          )}

          {camposExtra.includes('fecha_limite_respuesta') && (
            <div>
              <label htmlFor={`${etapa.cod}-fecha-limite`} className="block text-xs font-medium text-gray-700 mb-1">
                {getLabelForCampo('fecha_limite_respuesta')}
              </label>
              <input
                id={`${etapa.cod}-fecha-limite`}
                type="date"
                value={fechaLimiteRespuesta}
                onChange={(e) => setFechaLimiteRespuesta(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Fecha limite de respuesta"
              />
            </div>
          )}

          <div>
            <label htmlFor={`${etapa.cod}-obs`} className="block text-xs font-medium text-gray-700 mb-1">
              Observaciones
            </label>
            <textarea
              id={`${etapa.cod}-obs`}
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="Observaciones adicionales..."
            />
          </div>

          {/* Error feedback — C3b WU-F5: surfaces 409/422 detail from backend */}
          {isError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2" role="alert">
              {/* Try to extract FastAPI `detail` string from axios error response */}
              {(
                error != null &&
                typeof error === 'object' &&
                'response' in error &&
                (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
              )
                ? (error as { response: { data: { detail: string } } }).response.data.detail
                : (error instanceof Error ? error.message : 'Error al registrar la etapa.')}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-1.5 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? 'Guardando...' : 'Registrar avance'}
            </button>
          </div>
        </form>

        {/* C3c — File attachments for key stages (simple, non-por-area branch).
            Shown only when this stage accepts adjuntos AND a registration row exists.
            etapa.filas[0].id is the etapa_registro.id for simple (non-por-area) stages. */}
        {CODIGOS_CON_ADJUNTOS.has(etapa.cod) && (
          <AdjuntosEtapa
            etapaId={etapa.filas[0]?.id ?? 0}
            canEdit={canEdit}
          />
        )}
      </div>
    </div>
  );
}
