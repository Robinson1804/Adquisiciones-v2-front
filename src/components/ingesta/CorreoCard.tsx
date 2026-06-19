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
  useDesvincularIngesta,
} from "@/hooks/useIngesta";
import type { CorreoIngesta, DocumentoIngesta } from "@/types/ingesta";
import { getDocumentoUrlDescarga } from "@/lib/api";

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
  const url = getDocumentoUrlDescarga(doc.id);
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
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <ConfianzaBadge confianza={doc.confianza} />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline"
          aria-label={`Descargar ${doc.nombre_original}`}
        >
          Descargar
        </a>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// CorreoCard
// ----------------------------------------------------------------

interface CorreoCardProps {
  correo: CorreoIngesta;
}

export function CorreoCard({ correo }: CorreoCardProps) {
  const { user } = useAuthStore();
  const puedeEscribir = user?.rol === "ADMIN" || user?.rol === "EDITOR";

  const { mutate: aprobar, isPending: isAprobando } = useAprobarIngesta();
  const { mutate: rechazar, isPending: isRechazando } = useRechazarIngesta();
  const { mutate: desvincular, isPending: isDesvinculando } =
    useDesvincularIngesta();

  const [showRechazarModal, setShowRechazarModal] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [showAprobarModal, setShowAprobarModal] = useState(false);
  const [procesoIdInput, setProcesoIdInput] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const esPendiente = correo.estado_revision === "PENDIENTE";
  const esAprobadoOAuto =
    correo.estado_revision === "APROBADO" ||
    correo.estado_revision === "APROBADO_AUTO";

  function handleAprobar() {
    const pid = parseInt(procesoIdInput, 10);
    if (!pid || pid <= 0) {
      setActionError("Ingresá un ID de proceso válido.");
      return;
    }
    setActionError(null);
    aprobar(
      { id: correo.id, proceso_id: pid },
      {
        onSuccess: () => setShowAprobarModal(false),
        onError: (err) => {
          const axiosErr = err as {
            response?: { data?: { detail?: string } };
          };
          setActionError(
            axiosErr?.response?.data?.detail ?? "Error al aprobar."
          );
        },
      }
    );
  }

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

  return (
    <article className="bg-white border border-gray-200 shadow-sm rounded-lg p-4 space-y-3">
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
            {correo.nombre_servicio ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 font-semibold uppercase tracking-wide">
            Oficio
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
        {correo.proceso_id && (
          <div className="col-span-2">
            <dt className="text-gray-500 font-semibold uppercase tracking-wide">
              Proceso vinculado
            </dt>
            <dd className="text-gray-800 font-mono mt-0.5">
              #{correo.proceso_id}
            </dd>
          </div>
        )}
      </dl>

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
                disabled={isAprobando}
                className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-container transition-colors disabled:opacity-50"
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
        </div>
      )}

      {/* Modal: Aprobar — selección de proceso */}
      {showAprobarModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm mx-4 p-5 space-y-3">
            <h3 className="text-sm font-bold text-gray-900">
              Aprobar correo — vincular a proceso
            </h3>
            <div>
              <label
                htmlFor="proceso-id-input"
                className="block text-xs font-semibold text-gray-700 mb-1"
              >
                ID del proceso destino
              </label>
              <input
                id="proceso-id-input"
                type="number"
                min={1}
                value={procesoIdInput}
                onChange={(e) => setProcesoIdInput(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Ej: 42"
              />
            </div>
            {actionError && (
              <p className="text-xs text-red-600" role="alert">
                {actionError}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowAprobarModal(false)}
                className="px-3 py-1.5 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAprobar}
                disabled={isAprobando}
                className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-container disabled:opacity-50"
              >
                {isAprobando ? "Aprobando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
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
