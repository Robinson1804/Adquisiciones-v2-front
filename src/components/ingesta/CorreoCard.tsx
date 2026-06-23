"use client";

/**
 * CorreoCard — tarjeta de un correo ingresado.
 *
 * Muestra:
 * - Datos extraídos por IA: servicio, oficio, remitente, fechas, tipo, proveedor
 * - Lista de documentos con badge de confianza por umbral (alta >= 0.8 | media >= 0.6 | baja < 0.6)
 * - Badge APROBADO_AUTO (revisado_por === "INGESTA_AUTO") con match_confianza
 * - Acciones: Aprobar (solo PENDIENTE), Rechazar (solo PENDIENTE), Desvincular (solo APROBADO/APROBADO_AUTO)
 * - Gating por rol: VIEWER no ve acciones de escritura
 */

import React, { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import {
  useAprobarIngesta,
  useRechazarIngesta,
  useRestaurarIngesta,
  useDesvincularIngesta,
  useDescargarDocumentoIngesta,
} from "@/hooks/useIngesta";
import { useProceso, useProcesos } from "@/hooks/useProcesos";
import type { CorreoIngesta, DocumentoIngesta } from "@/types/ingesta";
import type { Proceso } from "@/types";

// ----------------------------------------------------------------
// Confianza badge
// ----------------------------------------------------------------

function ConfianzaBadge({ confianza }: { confianza: number | null }) {
  if (confianza === null) return null;

  if (confianza >= 0.8) {
    return (
      <span
        className="text-xs font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-800"
        data-testid="badge-confianza-alta"
        title={`Confianza: ${Math.round(confianza * 100)}%`}
      >
        {Math.round(confianza * 100)}%
      </span>
    );
  }

  if (confianza >= 0.6) {
    return (
      <span
        className="text-xs font-semibold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800"
        data-testid="badge-confianza-media"
        title={`Confianza: ${Math.round(confianza * 100)}%`}
      >
        {Math.round(confianza * 100)}%
      </span>
    );
  }

  return (
    <span
      className="text-xs font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700"
      data-testid="badge-confianza-baja"
      title={`Confianza baja: ${Math.round(confianza * 100)}%`}
    >
      {Math.round(confianza * 100)}% ⚠
    </span>
  );
}

// ----------------------------------------------------------------
// EstadoBadge
// ----------------------------------------------------------------

function EstadoBadge({
  estado,
  revisadoPor,
}: {
  estado: string;
  revisadoPor: string | null;
}) {
  if (estado === "APROBADO_AUTO" && revisadoPor === "INGESTA_AUTO") {
    return (
      <span
        className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300"
        data-testid="badge-aprobado-auto"
      >
        AUTO-VINCULADO
      </span>
    );
  }

  const MAP: Record<string, string> = {
    PENDIENTE: "bg-yellow-100 text-yellow-800",
    APROBADO: "bg-green-100 text-green-800",
    APROBADO_AUTO: "bg-blue-100 text-blue-800",
    RECHAZADO: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded ${MAP[estado] ?? "bg-gray-100 text-gray-700"}`}
    >
      {estado}
    </span>
  );
}

// ----------------------------------------------------------------
// DocumentoRow
// ----------------------------------------------------------------

function DocumentoRow({ doc }: { doc: DocumentoIngesta }) {
  const descargar = useDescargarDocumentoIngesta();
  const compressed = isCompressedDoc(doc);

  function handleDownload() {
    descargar.mutate(doc.id, {
      onSuccess: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.nombre_original;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      },
    });
  }

  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
          {doc.tipo_clasificado ?? "OTRO"}
        </span>
        <span
          className="text-xs text-gray-700 truncate"
          title={doc.nombre_original}
        >
          {doc.nombre_original}
        </span>
        {compressed && (
          <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
            Requiere extracción
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <ConfianzaBadge confianza={doc.confianza} />
        <button
          type="button"
          onClick={handleDownload}
          disabled={descargar.isPending}
          className="text-xs text-primary hover:underline disabled:opacity-50"
          aria-label={`Descargar ${doc.nombre_original}`}
        >
          {descargar.isPending ? "Descargando..." : "Descargar"}
        </button>
      </div>
    </div>
  );
}

const ETAPA_OPTIONS = [
  ["E01a", "Solicitud inicial área iniciadora"],
  ["E01b", "Oficio circular OTIN a áreas usuarias"],
  ["E01c", "Respuesta área con requerimiento"],
  ["E02", "Elaboración TDR consolidado"],
  ["E02b", "V°B° secuencial áreas del TDR"],
  ["E03", "Envío indagación de mercado"],
  ["E04", "OTA deriva expediente a OEAS"],
  ["E05", "Observaciones al TDR"],
  ["E06", "Corrección TDR"],
  ["E07", "Evaluación técnica"],
  ["E08", "Respuesta OTIN a evaluación técnica"],
  ["E09", "Cuadro comparativo"],
  ["E10", "OTIN solicita anexo cert. presupuestal"],
  ["E11", "Solicitud cert. presupuestal"],
  ["E12", "Consolidación cert. presupuestales"],
  ["E13", "Envío consolidado a Secretaría General"],
  ["E14", "Aprobación Secretaría General"],
  ["E15", "Envío a OTPP"],
  ["E16", "Certificación presupuestal - OTPP"],
  ["E17", "OTPP envía a OTA"],
  ["E18", "OTA deriva a OEAS"],
  ["E19", "Emisión orden de compra/servicio"],
  ["E20", "Notificación al proveedor"],
  ["E21", "Confirmación recepción OCS"],
  ["E22", "Inicio de servicio / entrega del bien"],
  ["E23", "OTIN solicita conformidad"],
  ["E25", "Conformidad final consolidada"],
] as const;

function formatDateInput(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function defaultFecha(correo: CorreoIngesta): string {
  return formatDateInput(correo.fecha_documento) || formatDateInput(correo.received_at);
}

function formatDateDisplay(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-PE");
}

function cleanDisplayText(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .replace(/\bClean\s+false\s+\d+\s*/gi, "")
    .replace(/\bES-PE\s+X-NONE\s+X-NONE\b/gi, "")
    .replace(/\b(?:false\s+){2,}/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function procesoSubtitle(proceso: Proceso): string {
  const pim = proceso.pim ? ` · S/ ${Number(proceso.pim).toLocaleString("es-PE")}` : "";
  return `${proceso.id_proceso} · ${proceso.tipo ?? "—"} · ${proceso.estado}${pim}`;
}

function etapaLabel(codigo: string | null | undefined): string {
  if (!codigo) return "Sin etapa definida";
  const option = ETAPA_OPTIONS.find(([cod]) => cod === codigo);
  return option ? `${option[0]} - ${option[1]}` : codigo;
}

function etapaOrder(codigo: string | null | undefined): number {
  if (!codigo) return -1;
  const idx = ETAPA_OPTIONS.findIndex(([cod]) => cod === codigo);
  return idx >= 0 ? idx : -1;
}

function looksInlineImage(doc: DocumentoIngesta): boolean {
  return (
    doc.tipo_clasificado === "OTRO" &&
    /^image\d{3,}\.(png|jpe?g|gif|webp)$/i.test(doc.nombre_original)
  );
}

function isCompressedDoc(doc: DocumentoIngesta): boolean {
  return /\.(zip|rar|7z)$/i.test(doc.nombre_original);
}

function stripClaudeMarker(value: string | null): string | null {
  if (!value) return value;
  return value.replace(/^\[CLAUDE\]\s*/i, "");
}

function isClaudeProposal(correo: CorreoIngesta): boolean {
  if (correo.relevancia_motivos?.match(/^\[CLAUDE\]/i)) return true;
  const motivos = correo.relevancia_motivos ?? "";
  const pareceAuto =
    /proceso sugerido por similitud/i.test(motivos) ||
    /etapa sugerida E\d+/i.test(motivos) ||
    /^(cotización|contratación|adquisición|tdr|orden de servicio|conformidad)(;|$)/i.test(motivos);
  return Boolean(correo.resumen_sugerido && !pareceAuto);
}

function hasClaudeProposal(correo: CorreoIngesta): boolean {
  return Boolean(
    correo.relevancia_score !== null ||
      correo.proceso_sugerido_id ||
      correo.etapa_sugerida ||
      correo.fase_sugerida ||
      correo.resumen_sugerido ||
      correo.relevancia_motivos
  );
}

function ClaudeProposalPanel({
  correo,
  proceso,
  loadingProceso,
  onUseProposal,
  canUseProposal,
}: {
  correo: CorreoIngesta;
  proceso?: Proceso;
  loadingProceso: boolean;
  onUseProposal: () => void;
  canUseProposal: boolean;
}) {
  if (!hasClaudeProposal(correo)) return null;

  const cameFromClaude = isClaudeProposal(correo);
  const motivos = stripClaudeMarker(correo.relevancia_motivos);
  const panelTitle = cameFromClaude ? "Propuesta de Claude" : "Sugerencia automática";
  const summaryLabel = cameFromClaude ? "Resumen" : "Vista previa";
  const actionLabel = cameFromClaude ? "Usar propuesta" : "Revisar sugerencia";
  const warnings: string[] = [];
  if (!correo.proceso_sugerido_id) {
    warnings.push("No hay proceso sugerido confirmado; selecciónalo manualmente antes de aprobar.");
  }
  if (proceso?.estado === "CULMINADO") {
    warnings.push("El proceso sugerido ya figura como culminado.");
  }
  if (
    proceso?.etapa_actual_avance &&
    correo.etapa_sugerida &&
    etapaOrder(correo.etapa_sugerida) < etapaOrder(proceso.etapa_actual_avance)
  ) {
    warnings.push(
      `La etapa sugerida es anterior a la etapa actual del proceso (${etapaLabel(
        proceso.etapa_actual_avance
      )}).`
    );
  }
  if (correo.documentos.some(looksInlineImage)) {
    warnings.push("Hay imágenes tipo image001 que podrían ser firmas o contenido embebido.");
  }
  if (correo.documentos.some(isCompressedDoc)) {
    warnings.push("Hay archivos comprimidos; Claude no puede leer su contenido hasta extraerlos.");
  }

  return (
    <section className="rounded border border-cyan-200 bg-cyan-50 px-3 py-3 text-xs space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold uppercase tracking-wide text-cyan-900">
              {panelTitle}
            </span>
            {correo.relevancia_score !== null && (
              <span className="rounded bg-white border border-cyan-200 px-2 py-0.5 font-mono text-cyan-900">
                Confianza {Math.round(correo.relevancia_score * 100)}%
              </span>
            )}
            {correo.etapa_sugerida && (
              <span className="rounded bg-white border border-cyan-200 px-2 py-0.5 text-cyan-900">
                {etapaLabel(correo.etapa_sugerida)}
              </span>
            )}
          </div>
          <p className="text-cyan-800">
            Correo recibido: {formatDateDisplay(correo.received_at)}
          </p>
        </div>

        {canUseProposal && (
          <button
            type="button"
            onClick={onUseProposal}
            className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-container"
          >
            {actionLabel}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="rounded bg-white/70 border border-cyan-100 px-2.5 py-2">
          <p className="font-semibold text-cyan-900">Proceso sugerido</p>
          {correo.proceso_sugerido_id ? (
            <>
              <p className="mt-1 font-mono text-cyan-950">
                {loadingProceso
                  ? "Cargando..."
                  : proceso?.id_proceso ?? `#${correo.proceso_sugerido_id}`}
              </p>
              <p className="mt-0.5 text-gray-700 line-clamp-2">
                {proceso?.requerimiento ?? "Proceso pendiente de resolver"}
              </p>
            </>
          ) : (
            <p className="mt-1 text-gray-500">Sin proceso sugerido</p>
          )}
        </div>
        <div className="rounded bg-white/70 border border-cyan-100 px-2.5 py-2">
          <p className="font-semibold text-cyan-900">Etapa sugerida</p>
          <p className="mt-1 text-cyan-950">
            {etapaLabel(correo.etapa_sugerida)}
          </p>
          {correo.fase_sugerida && (
            <p className="mt-0.5 text-gray-700">Fase: {correo.fase_sugerida}</p>
          )}
        </div>
      </div>

      {motivos && (
        <p className="text-cyan-950">
          <span className="font-semibold">Motivos:</span>{" "}
          {motivos}
        </p>
      )}
      {correo.resumen_sugerido && (
        <p className="text-gray-800">
          <span className="font-semibold text-cyan-950">{summaryLabel}:</span>{" "}
          {cleanDisplayText(correo.resumen_sugerido)}
        </p>
      )}
      {warnings.length > 0 && (
        <div className="rounded border border-amber-200 bg-amber-50 px-2.5 py-2 text-amber-900">
          <p className="font-semibold">Revisar antes de aprobar</p>
          <ul className="mt-1 list-disc pl-4 space-y-0.5">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function AprobarModal({
  correo,
  onClose,
}: {
  correo: CorreoIngesta;
  onClose: () => void;
}) {
  const aprobar = useAprobarIngesta();
  const [search, setSearch] = useState("");
  const procesos = useProcesos({
    page: 1,
    page_size: 8,
    search: search.trim() || undefined,
  });
  const [selectedProcesoId, setSelectedProcesoId] = useState<number | null>(
    correo.proceso_sugerido_id
  );
  const procesoSugerido = useProceso(correo.proceso_sugerido_id);
  const [etapa, setEtapa] = useState(correo.etapa_sugerida ?? "");
  const [estadoEtapa, setEstadoEtapa] = useState<"PENDIENTE" | "EN_CURSO" | "COMPLETADO">(
    "COMPLETADO"
  );
  const [fechaInicio, setFechaInicio] = useState(defaultFecha(correo));
  const [fechaFin, setFechaFin] = useState("");
  const [responsable, setResponsable] = useState(correo.sender_name ?? "");
  const [oficio, setOficio] = useState(correo.numero_oficio ?? "");
  const [observaciones, setObservaciones] = useState(
    cleanDisplayText(correo.resumen_sugerido) ?? ""
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const selectedFromList = procesos.data?.items.find((p) => p.id === selectedProcesoId);
  const selectedProceso =
    selectedFromList ??
    (procesoSugerido.data?.id === selectedProcesoId ? procesoSugerido.data : undefined);

  function submit() {
    if (!selectedProcesoId || !selectedProceso) {
      setLocalError("Selecciona un proceso destino.");
      return;
    }
    if (!etapa) {
      setLocalError("Selecciona la etapa que corresponde al correo.");
      return;
    }
    setLocalError(null);
    aprobar.mutate(
      {
        id: correo.id,
        proceso_id: selectedProcesoId,
        etapa_sugerida: etapa,
        estado_etapa: estadoEtapa,
        fecha_documento: fechaInicio || null,
        fecha_fin: fechaFin || null,
        responsable: responsable || null,
        oficio_correo: oficio || null,
        observaciones: observaciones || null,
      },
      {
        onSuccess: onClose,
        onError: (err) => {
          const axiosErr = err as {
            response?: { data?: { detail?: string } };
          };
          setLocalError(axiosErr?.response?.data?.detail ?? "Error al aprobar.");
        },
      }
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl mx-4 p-5 space-y-4 max-h-[88vh] overflow-y-auto">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Aprobar y vincular correo</h3>
          <p className="text-xs text-gray-500 mt-1">
            Selecciona el proceso y confirma los datos que se registrarán en la etapa.
          </p>
        </div>

        {hasClaudeProposal(correo) && (
          <div className="rounded border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs">
            <p className="font-semibold text-cyan-900">
              {isClaudeProposal(correo)
                ? "Propuesta de Claude cargada"
                : "Sugerencia automática cargada"}
            </p>
            <p className="mt-1 text-cyan-800">
              Revisa y corrige estos datos antes de aprobar. Esta información no vincula el correo por sí sola.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4">
          <section className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700">
              Proceso destino
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Buscar por ID o requerimiento..."
            />
            <div className="border border-gray-200 rounded max-h-72 overflow-y-auto divide-y divide-gray-100">
              {procesos.isLoading && (
                <p className="p-3 text-xs text-gray-500">Cargando procesos...</p>
              )}
              {!procesos.isLoading &&
                procesos.data?.items.map((proceso) => (
                  <button
                    key={proceso.id}
                    type="button"
                    onClick={() => setSelectedProcesoId(proceso.id)}
                    className={`w-full text-left p-3 hover:bg-blue-50 ${
                      selectedProcesoId === proceso.id ? "bg-blue-50 ring-1 ring-blue-200" : ""
                    }`}
                  >
                    <p className="text-xs font-semibold text-primary">
                      {proceso.id_proceso}
                    </p>
                    <p className="text-sm text-gray-900 line-clamp-2">
                      {proceso.requerimiento}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {procesoSubtitle(proceso)}
                    </p>
                  </button>
                ))}
              {!procesos.isLoading && procesos.data?.items.length === 0 && (
                <p className="p-3 text-xs text-gray-500">No se encontraron procesos.</p>
              )}
            </div>
            {selectedProceso && !selectedFromList && (
              <button
                type="button"
                onClick={() => setSelectedProcesoId(selectedProceso.id)}
                className="w-full text-left rounded border border-blue-200 bg-blue-50 p-3"
              >
                <p className="text-xs font-semibold text-blue-800">Proceso sugerido</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedProceso.id_proceso}
                </p>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {selectedProceso.requerimiento}
                </p>
              </button>
            )}
          </section>

          <section className="space-y-3">
            <label className="block text-xs font-semibold text-gray-700">
              Etapa
              <select
                value={etapa}
                onChange={(e) => setEtapa(e.target.value)}
                className="mt-1 w-full text-sm border border-gray-300 rounded px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Seleccionar etapa</option>
                {ETAPA_OPTIONS.map(([codigo, nombre]) => (
                  <option key={codigo} value={codigo}>
                    {codigo} - {nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-gray-700">
              Estado
              <select
                value={estadoEtapa}
                onChange={(e) =>
                  setEstadoEtapa(e.target.value as "PENDIENTE" | "EN_CURSO" | "COMPLETADO")
                }
                className="mt-1 w-full text-sm border border-gray-300 rounded px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="COMPLETADO">Completado</option>
                <option value="EN_CURSO">En curso</option>
                <option value="PENDIENTE">Pendiente</option>
              </select>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-gray-700">
                Fecha inicio
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="mt-1 w-full text-sm border border-gray-300 rounded px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="block text-xs font-semibold text-gray-700">
                Fecha fin
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="mt-1 w-full text-sm border border-gray-300 rounded px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <span className="mt-1 block text-[11px] font-normal text-gray-500">
                  Opcional
                </span>
              </label>
            </div>
            <label className="block text-xs font-semibold text-gray-700">
              Responsable
              <input
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                className="mt-1 w-full text-sm border border-gray-300 rounded px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Nombre o área responsable"
              />
            </label>
            <label className="block text-xs font-semibold text-gray-700">
              Referencia
              <input
                value={oficio}
                onChange={(e) => setOficio(e.target.value)}
                className="mt-1 w-full text-sm border border-gray-300 rounded px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="N° oficio, OS/OC o referencia del correo"
              />
            </label>
            <label className="block text-xs font-semibold text-gray-700">
              Observaciones
              <textarea
                rows={4}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="mt-1 w-full text-sm border border-gray-300 rounded px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="Resumen o sustento para el registro..."
              />
            </label>
          </section>
        </div>

        {localError && (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
            {localError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={aprobar.isPending}
            className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-container disabled:opacity-50"
          >
            {aprobar.isPending ? "Aprobando..." : "Aprobar correo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// CorreoCard
// ----------------------------------------------------------------

interface CorreoCardProps {
  correo: CorreoIngesta;
  highlighted?: boolean;
}

export function CorreoCard({ correo, highlighted = false }: CorreoCardProps) {
  const { user } = useAuthStore();
  const puedeEscribir = user?.rol === "ADMIN" || user?.rol === "EDITOR";

  const { mutate: rechazar, isPending: isRechazando } = useRechazarIngesta();
  const { mutate: restaurar, isPending: isRestaurando } = useRestaurarIngesta();
  const { mutate: desvincular, isPending: isDesvinculando } =
    useDesvincularIngesta();

  const [showRechazarModal, setShowRechazarModal] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [showAprobarModal, setShowAprobarModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const esPendiente = correo.estado_revision === "PENDIENTE";
  const esAprobadoOAuto =
    correo.estado_revision === "APROBADO" ||
    correo.estado_revision === "APROBADO_AUTO";
  const esRechazado = correo.estado_revision === "RECHAZADO";
  const procesoVinculado = useProceso(correo.proceso_id);
  const procesoSugerido = useProceso(correo.proceso_sugerido_id);
  const etapaVinculada =
    correo.etapa_sugerida ?? procesoVinculado.data?.etapa_actual_avance ?? null;

  function handleRechazar() {
    rechazar(
      { id: correo.id, motivo: motivo || null },
      {
        onSuccess: () => {
          setShowRechazarModal(false);
          setMotivo("");
        },
        onError: (err) => {
          const axiosErr = err as {
            response?: { data?: { detail?: string } };
          };
          setActionError(
            axiosErr?.response?.data?.detail ?? "Error al rechazar."
          );
        },
      }
    );
  }

  function handleDesvincular() {
    setActionError(null);
    desvincular(correo.id, {
      onError: (err) => {
        const axiosErr = err as {
          response?: { data?: { detail?: string } };
        };
        setActionError(
          axiosErr?.response?.data?.detail ?? "Error al desvincular."
        );
      },
    });
  }

  function handleRestaurar() {
    setActionError(null);
    restaurar(correo.id, {
      onError: (err) => {
        const axiosErr = err as {
          response?: { data?: { detail?: string } };
        };
        setActionError(
          axiosErr?.response?.data?.detail ?? "Error al restaurar."
        );
      },
    });
  }

  return (
    <article
      id={`correo-${correo.id}`}
      className={`bg-white border shadow-sm rounded-lg p-4 space-y-3 scroll-mt-6 ${
        highlighted ? "border-blue-300 ring-2 ring-blue-100" : "border-gray-200"
      }`}
    >
      {/* Header: estado + remitente */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 truncate">
            <span className="font-semibold text-gray-800">
              {correo.sender_name ?? "—"}
            </span>{" "}
            {correo.sender_email ? `<${correo.sender_email}>` : ""}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {correo.received_at
              ? new Date(correo.received_at).toLocaleDateString("es-PE")
              : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <EstadoBadge
            estado={correo.estado_revision}
            revisadoPor={correo.revisado_por}
          />
          {correo.estado_revision === "APROBADO_AUTO" &&
            correo.match_confianza !== null && (
              <ConfianzaBadge confianza={correo.match_confianza} />
            )}
        </div>
      </div>

      {/* Asunto */}
      {correo.subject && (
        <p className="text-sm font-medium text-gray-800 truncate" title={correo.subject}>
          {correo.subject}
        </p>
      )}

      {/* Datos IA */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <dt className="text-gray-500 font-semibold uppercase tracking-wide">
            Servicio
          </dt>
          <dd className="text-gray-800 mt-0.5">
            {cleanDisplayText(correo.nombre_servicio) ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 font-semibold uppercase tracking-wide">
            Referencia
          </dt>
          <dd className="text-gray-800 font-mono mt-0.5">
            {correo.numero_oficio ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 font-semibold uppercase tracking-wide">
            Tipo
          </dt>
          <dd className="text-gray-800 mt-0.5">{correo.tipo ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-gray-500 font-semibold uppercase tracking-wide">
            Proveedor
          </dt>
          <dd className="text-gray-800 mt-0.5">{correo.proveedor ?? "—"}</dd>
        </div>
      </dl>

      {correo.proceso_id && (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold uppercase tracking-wide text-emerald-800">
              Proceso vinculado
            </span>
            {procesoVinculado.data?.id_proceso && (
              <span className="rounded bg-white border border-emerald-200 px-2 py-0.5 font-mono text-emerald-900">
                {procesoVinculado.data.id_proceso}
              </span>
            )}
            <span className="rounded bg-white border border-emerald-200 px-2 py-0.5 text-emerald-900">
              {etapaLabel(etapaVinculada)}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900 line-clamp-2">
            {procesoVinculado.isLoading
              ? "Cargando requerimiento..."
              : procesoVinculado.data?.requerimiento ?? `Proceso #${correo.proceso_id}`}
          </p>
          {correo.fase_sugerida && (
            <p className="text-xs text-emerald-800">
              Fase: {correo.fase_sugerida}
            </p>
          )}
        </div>
      )}

      <ClaudeProposalPanel
        correo={correo}
        proceso={procesoSugerido.data}
        loadingProceso={procesoSugerido.isLoading}
        canUseProposal={puedeEscribir && esPendiente}
        onUseProposal={() => {
          setActionError(null);
          setShowAprobarModal(true);
        }}
      />

      {/* Documentos */}
      {correo.documentos.length > 0 && (
        <div className="border-t border-gray-100 pt-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Documentos ({correo.documentos.length})
          </p>
          <div className="space-y-0.5">
            {correo.documentos.map((doc) => (
              <DocumentoRow key={doc.id} doc={doc} />
            ))}
          </div>
        </div>
      )}

      {/* Errores de acción */}
      {actionError && (
        <p className="text-xs text-red-600 font-medium" role="alert">
          {actionError}
        </p>
      )}

      {/* Acciones — solo para ADMIN/EDITOR */}
      {puedeEscribir && (
        <div className="border-t border-gray-100 pt-3 flex items-center gap-2 flex-wrap">
          {esPendiente && (
            <>
              <button
                onClick={() => {
                  setActionError(null);
                  setShowAprobarModal(true);
                }}
                className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-container transition-colors"
              >
                Aprobar
              </button>
              <button
                onClick={() => {
                  setActionError(null);
                  setShowRechazarModal(true);
                }}
                disabled={isRechazando}
                className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-300 text-xs font-semibold rounded hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                Rechazar
              </button>
            </>
          )}
          {esAprobadoOAuto && (
            <button
              onClick={handleDesvincular}
              disabled={isDesvinculando}
              className="px-3 py-1.5 bg-yellow-50 text-yellow-800 border border-yellow-300 text-xs font-semibold rounded hover:bg-yellow-100 transition-colors disabled:opacity-50"
            >
              {isDesvinculando ? "Desvinculando..." : "Desvincular"}
            </button>
          )}
          {esRechazado && (
            <button
              onClick={handleRestaurar}
              disabled={isRestaurando}
              className="px-3 py-1.5 bg-blue-50 text-blue-800 border border-blue-300 text-xs font-semibold rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              {isRestaurando ? "Restaurando..." : "Restaurar"}
            </button>
          )}
        </div>
      )}

      {/* Modal: Aprobar — selección de proceso */}
      {showAprobarModal && (
        <AprobarModal
          correo={correo}
          onClose={() => setShowAprobarModal(false)}
        />
      )}

      {/* Modal: Rechazar */}
      {showRechazarModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm mx-4 p-5 space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Rechazar correo</h3>
            <div>
              <label
                htmlFor="motivo-input"
                className="block text-xs font-semibold text-gray-700 mb-1"
              >
                Motivo (opcional)
              </label>
              <textarea
                id="motivo-input"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="Describí brevemente el motivo del rechazo..."
              />
            </div>
            {actionError && (
              <p className="text-xs text-red-600" role="alert">
                {actionError}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowRechazarModal(false)}
                className="px-3 py-1.5 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRechazar}
                disabled={isRechazando}
                className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isRechazando ? "Rechazando..." : "Confirmar rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
