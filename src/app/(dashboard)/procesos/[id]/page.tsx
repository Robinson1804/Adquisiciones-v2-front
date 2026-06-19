"use client";

/**
 * S4 — Detalle Proceso (/procesos/[id])
 * Left panel: ficha del proceso.
 * Right panel: LineaTiempo (timeline de las 27 etapas).
 */

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useProceso, useActualizarProceso, useEliminarProceso } from "@/hooks/useProcesos";
import { useMontosProceso } from "@/hooks/useMontosProceso";
import { useTiempos } from "@/hooks/useTiempos";
import { useExportProcesoPdf } from "@/hooks/useExport";
import { LineaTiempo } from "@/components/procesos/LineaTiempo";
import { TablaTiempos } from "@/components/procesos/TablaTiempos";
import { COLORES_ESTADO, COLORES_ACTOR, DEPENDENCIAS } from "@/lib/constants";
import { formatFechaLarga } from "@/lib/fecha";
import type { EstadoProceso, ProcesoUpdatePayload, TipoProceso } from "@/types";
import { DocumentosTab } from "@/components/ingesta/DocumentosTab";

// ----------------------------------------------------------------
// Estado badge
// ----------------------------------------------------------------
const ESTADO_BADGE_MAP: Record<EstadoProceso, keyof typeof COLORES_ESTADO> = {
  "EN PROCESO": "EN_CURSO",
  CULMINADO: "COMPLETADO",
  CANCELADO: "CANCELADO",
};

// ----------------------------------------------------------------
// Estilo input en modo edición — borde azul para señalar "modo editar"
// ----------------------------------------------------------------
const EDIT_INPUT_CLS =
  "w-full text-sm bg-blue-50/40 border border-blue-300 rounded px-2.5 py-1.5 " +
  "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition";

function EstadoBadge({ estado }: { estado: EstadoProceso }) {
  const key = ESTADO_BADGE_MAP[estado];
  const color = COLORES_ESTADO[key];
  return (
    <span
      className="text-xs font-medium px-2 py-1 rounded-lg"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {estado}
    </span>
  );
}

// ----------------------------------------------------------------
// Ficha field — label arriba, valor abajo, compact y truncable
// ----------------------------------------------------------------
function FichaField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
      <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </dt>
      <dd className="text-sm text-gray-800 break-words">{children}</dd>
    </div>
  );
}

// ----------------------------------------------------------------
// Tiempo transcurrido helper
// ----------------------------------------------------------------
function diasTranscurridos(fechaCreacion: string): number {
  const inicio = new Date(fechaCreacion);
  const hoy = new Date();
  const diff = hoy.getTime() - inicio.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ----------------------------------------------------------------
// Main page
// ----------------------------------------------------------------
export default function DetalleProceso() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const puedeEscribir = user?.rol === "ADMIN" || user?.rol === "EDITOR";

  const procesoId = Number(params.id);
  const { data: proceso, isLoading, isError } = useProceso(
    Number.isFinite(procesoId) && procesoId > 0 ? procesoId : null
  );

  // C3b WU-F4 — montos del proceso (populated as trigger stages complete)
  const { data: montos } = useMontosProceso(
    Number.isFinite(procesoId) && procesoId > 0 ? procesoId : null
  );

  // control-tiempos — interval chain for the "Tiempos" tab
  const tiempos = useTiempos(
    Number.isFinite(procesoId) && procesoId > 0 ? procesoId : null
  );

  const { mutate: actualizarProceso, isPending: isUpdating } =
    useActualizarProceso();

  const { mutate: eliminarProceso, isPending: isDeleting } =
    useEliminarProceso();

  // Modal de confirmación de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleEliminar() {
    if (!proceso) return;
    setDeleteError(null);
    eliminarProceso(proceso.id, {
      onSuccess: () => {
        router.push("/procesos");
      },
      onError: (err) => {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        const msg =
          axiosErr?.response?.data?.detail ??
          err.message ??
          "Error al eliminar el proceso.";
        setDeleteError(msg);
      },
    });
  }

  // C5 — PDF export
  const {
    trigger: downloadPdf,
    isLoading: isExportingPdf,
    error: pdfExportError,
  } = useExportProcesoPdf();

  // ----------------------------------------------------------------
  // Inline edit state — draft con todos los campos editables del Ficha
  // ----------------------------------------------------------------
  interface FichaDraft {
    requerimiento: string;
    tipo: TipoProceso | "";
    area_iniciadora: string;
    anno: string; // como string para el input number controlled
    pim: string;  // idem
    areas_usuarias: string[];
    denominacion_cmn: string;
    clasificador_cmn: string;
  }

  const emptyDraft: FichaDraft = {
    requerimiento: "",
    tipo: "",
    area_iniciadora: "",
    anno: "",
    pim: "",
    areas_usuarias: [],
    denominacion_cmn: "",
    clasificador_cmn: "",
  };

  // Tab state — "ficha" (default) | "documentos" | "tiempos"
  const [activeTab, setActiveTab] = useState<"ficha" | "documentos" | "tiempos">("ficha");

  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<FichaDraft>(emptyDraft);
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleEdit() {
    if (!proceso) return;
    setSaveError(null);
    setDraft({
      requerimiento: proceso.requerimiento ?? "",
      tipo: (proceso.tipo as TipoProceso | null) ?? "",
      area_iniciadora: proceso.area_iniciadora ?? "",
      anno: proceso.anno != null ? String(proceso.anno) : "",
      pim: proceso.pim ?? "",
      areas_usuarias: proceso.areas_usuarias ?? [],
      denominacion_cmn: proceso.denominacion_cmn ?? "",
      clasificador_cmn: proceso.clasificador_cmn ?? "",
    });
    setEditMode(true);
  }

  function handleCancel() {
    setEditMode(false);
    setDraft(emptyDraft);
    setSaveError(null);
  }

  function toggleAreaUsuaria(area: string) {
    setDraft((prev) =>
      prev.areas_usuarias.includes(area)
        ? { ...prev, areas_usuarias: prev.areas_usuarias.filter((a) => a !== area) }
        : { ...prev, areas_usuarias: [...prev.areas_usuarias, area] }
    );
  }

  function handleSave() {
    if (!proceso) return;
    setSaveError(null);

    // Validaciones mínimas
    if (!draft.requerimiento.trim() || draft.requerimiento.trim().length < 3) {
      setSaveError("El requerimiento debe tener al menos 3 caracteres.");
      return;
    }
    if (draft.areas_usuarias.length === 0) {
      setSaveError("Debe seleccionar al menos una dependencia involucrada.");
      return;
    }

    // Construir payload solo con campos que cambiaron (diff vs proceso actual)
    const payload: ProcesoUpdatePayload = {};
    if (draft.requerimiento !== proceso.requerimiento) payload.requerimiento = draft.requerimiento.trim();
    if (draft.tipo && draft.tipo !== proceso.tipo) payload.tipo = draft.tipo;
    if (draft.area_iniciadora !== (proceso.area_iniciadora ?? ""))
      payload.area_iniciadora = draft.area_iniciadora || null;
    const annoNum = draft.anno ? Number(draft.anno) : null;
    if (annoNum !== (proceso.anno ?? null)) payload.anno = annoNum;
    const pimNum = draft.pim === "" ? null : Number(draft.pim);
    const pimActual = proceso.pim ? parseFloat(proceso.pim) : null;
    if (pimNum !== pimActual) payload.pim = pimNum;
    const areasIguales =
      draft.areas_usuarias.length === (proceso.areas_usuarias ?? []).length &&
      draft.areas_usuarias.every((a) => (proceso.areas_usuarias ?? []).includes(a));
    if (!areasIguales) payload.areas_usuarias = draft.areas_usuarias;
    if (draft.denominacion_cmn !== (proceso.denominacion_cmn ?? ""))
      payload.denominacion_cmn = draft.denominacion_cmn || null;
    if (draft.clasificador_cmn !== (proceso.clasificador_cmn ?? ""))
      payload.clasificador_cmn = draft.clasificador_cmn || null;

    // Nada cambió → cerrar
    if (Object.keys(payload).length === 0) {
      setEditMode(false);
      return;
    }

    actualizarProceso(
      { id: proceso.id, payload },
      {
        onSuccess: () => {
          setEditMode(false);
          setDraft(emptyDraft);
        },
        onError: (err) => {
          const axiosErr = err as { response?: { data?: { detail?: string } } };
          setSaveError(
            axiosErr?.response?.data?.detail ?? (err instanceof Error ? err.message : "Error al guardar.")
          );
        },
      }
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-20 text-gray-500 text-sm"
        role="status"
        aria-live="polite"
      >
        Cargando proceso...
      </div>
    );
  }

  // Error / Not found
  if (isError || !proceso) {
    return (
      <div
        className="max-w-md mx-auto mt-16 bg-white border border-outline shadow-card rounded-lg p-8 text-center"
        role="alert"
      >
        <p className="text-gray-700 font-semibold mb-2">Proceso no encontrado</p>
        <p className="text-sm text-gray-500 mb-6">
          El proceso que buscás no existe o fue eliminado.
        </p>
        <Link
          href="/procesos"
          className="text-primary text-sm font-medium hover:underline"
        >
          ← Volver a Procesos
        </Link>
      </div>
    );
  }

  // TMP-02: usar dias_transcurridos del backend (desde E03/indagación) con
  // fallback al cálculo local desde fecha_creacion cuando el campo no está disponible.
  const dias = proceso.dias_transcurridos ?? diasTranscurridos(proceso.fecha_creacion);

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-500 flex items-center gap-1" aria-label="Migas de pan">
        <Link href="/procesos" className="text-primary hover:underline">
          Procesos
        </Link>
        <span>/</span>
        <span className="font-mono">{proceso.id_proceso}</span>
        <span>/</span>
        <span>Detalle</span>
      </nav>

      {/* Title row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-primary font-mono">
            {proceso.id_proceso}
          </h1>
          <EstadoBadge estado={proceso.estado} />
          <span className="text-xs text-gray-400 font-medium">
            Mapa (overview) + Foco (registro)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* C5 — PDF export: available to all authenticated roles */}
          <button
            onClick={() => void downloadPdf(proceso.id, proceso.id_proceso)}
            disabled={isExportingPdf}
            className="border border-outline text-primary font-semibold px-3.5 py-1.5 rounded text-sm
                       hover:bg-surface-content transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                       inline-flex items-center gap-1.5"
            aria-label={`Exportar proceso ${proceso.id_proceso} a PDF`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {isExportingPdf ? "Exportando..." : "Exportar PDF"}
          </button>
          {puedeEscribir && !editMode && (
            <button
              onClick={handleEdit}
              className="px-3.5 py-1.5 bg-white border border-outline rounded text-sm text-gray-700
                         hover:bg-surface-content transition-colors inline-flex items-center gap-1.5"
              aria-label="Editar proceso"
              data-testid="btn-editar-proceso"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
              Editar
            </button>
          )}
          {puedeEscribir && editMode && (
            <>
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className="px-3.5 py-1.5 bg-primary text-white border border-primary rounded text-sm font-semibold
                           hover:bg-primary-container transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                aria-label="Guardar cambios"
                data-testid="btn-guardar-proceso"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {isUpdating ? "Guardando..." : "Guardar"}
              </button>
              <button
                onClick={handleCancel}
                disabled={isUpdating}
                className="px-3.5 py-1.5 bg-white border border-outline rounded text-sm text-gray-700
                           hover:bg-surface-content transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                aria-label="Cancelar edición"
                data-testid="btn-cancelar-edicion"
              >
                Cancelar
              </button>
            </>
          )}
          {puedeEscribir && !editMode && (
            <button
              onClick={() => {
                setDeleteError(null);
                setShowDeleteModal(true);
              }}
              className="px-3.5 py-1.5 bg-white border border-red-300 rounded text-sm text-red-600
                         hover:bg-red-50 transition-colors inline-flex items-center gap-1.5"
              aria-label="Eliminar proceso"
              data-testid="btn-eliminar-proceso"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              </svg>
              Eliminar
            </button>
          )}
        </div>
      </div>

      {/* Banner editando + error global */}
      {editMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-2 flex items-center justify-between gap-3">
          <p className="text-xs text-blue-800 font-medium">
            ✎ Modo edición — modificá los campos en azul y presioná <strong>Guardar</strong> arriba.
          </p>
          {saveError && (
            <p className="text-xs text-red-600 font-medium" role="alert">
              {saveError}
            </p>
          )}
        </div>
      )}
      {/* C5 — PDF export error feedback */}
      {pdfExportError && (
        <p className="text-sm text-red-600" role="alert">
          {pdfExportError}
        </p>
      )}

      {/* Ficha del Proceso — horizontal full-width, 4 cols */}
      <div className="bg-white border border-outline shadow-card rounded-lg p-6">
        <h2 className="text-sm font-bold text-primary mb-4">
          Ficha del Proceso
        </h2>

        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
          {/* ---- Fila 1: Requerimiento | Tipo | Área iniciadora | Año ---- */}
          <FichaField label="Requerimiento">
            {editMode ? (
              <textarea
                rows={2}
                value={draft.requerimiento}
                onChange={(e) => setDraft({ ...draft, requerimiento: e.target.value })}
                className={EDIT_INPUT_CLS + " resize-none"}
                aria-label="Editar requerimiento"
                data-testid="edit-requerimiento"
              />
            ) : (
              <span>{proceso.requerimiento}</span>
            )}
          </FichaField>

          <FichaField label="Tipo">
            {editMode ? (
              <select
                value={draft.tipo}
                onChange={(e) => setDraft({ ...draft, tipo: e.target.value as TipoProceso | "" })}
                className={EDIT_INPUT_CLS}
                aria-label="Editar tipo"
                data-testid="edit-tipo"
              >
                <option value="">—</option>
                <option value="BIEN">BIEN</option>
                <option value="SERVICIO">SERVICIO</option>
              </select>
            ) : proceso.tipo ? (
              <span className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                {proceso.tipo}
              </span>
            ) : (
              "—"
            )}
          </FichaField>

          <FichaField label="Área iniciadora">
            {editMode ? (
              <select
                value={draft.area_iniciadora}
                onChange={(e) => setDraft({ ...draft, area_iniciadora: e.target.value })}
                className={EDIT_INPUT_CLS}
                aria-label="Editar área iniciadora"
                data-testid="edit-area-iniciadora"
              >
                <option value="">—</option>
                {DEPENDENCIAS.map((d) => (
                  <option key={d.abrev} value={d.abrev}>
                    {d.abrev}
                  </option>
                ))}
              </select>
            ) : (
              proceso.area_iniciadora ?? "—"
            )}
          </FichaField>

          <FichaField label="Año">
            {editMode ? (
              <input
                type="number"
                min={2020}
                max={2100}
                value={draft.anno}
                onChange={(e) => setDraft({ ...draft, anno: e.target.value })}
                className={EDIT_INPUT_CLS}
                aria-label="Editar año"
                data-testid="edit-anno"
              />
            ) : (
              proceso.anno ?? "—"
            )}
          </FichaField>

          {/* ---- Fila 2: PIM | Valor EM | N° OCS | Fecha de creación ---- */}
          <FichaField label="Presupuesto Institucional (PIM)">
            {editMode ? (
              <input
                type="number"
                min={0}
                step="0.01"
                value={draft.pim}
                onChange={(e) => setDraft({ ...draft, pim: e.target.value })}
                placeholder="S/ 0.00"
                className={EDIT_INPUT_CLS}
                aria-label="Editar PIM"
                data-testid="edit-pim"
              />
            ) : proceso.pim ? (
              `S/ ${parseFloat(proceso.pim).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`
            ) : (
              "—"
            )}
          </FichaField>

          <FichaField label="Valor EM">
            {montos?.valor_em != null
              ? `S/ ${montos.valor_em.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "—"}
          </FichaField>

          <FichaField label="N° OCS">
            {montos?.nro_ocs ?? "—"}
          </FichaField>

          <FichaField label="Fecha de creación">
            {new Date(proceso.fecha_creacion).toLocaleDateString("es-PE", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </FichaField>

          {/* ---- Fila 3: Creado por | Dependencias | Denominación CMN | Clasificador ---- */}
          <FichaField label="Creado por">{proceso.creado_por ?? "—"}</FichaField>

          <FichaField label="Dependencias involucradas">
            {editMode ? (
              <div
                className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1.5 bg-blue-50/40 border border-blue-300 rounded"
                data-testid="edit-dependencias"
              >
                {DEPENDENCIAS.map((d) => {
                  const selected = draft.areas_usuarias.includes(d.abrev);
                  const color =
                    COLORES_ACTOR[d.abrev as keyof typeof COLORES_ACTOR] ??
                    COLORES_ACTOR.OTIN;
                  return (
                    <button
                      key={d.abrev}
                      type="button"
                      onClick={() => toggleAreaUsuaria(d.abrev)}
                      className={`text-xs px-2 py-0.5 rounded border font-medium transition ${
                        selected ? "" : "opacity-40 hover:opacity-80"
                      }`}
                      style={{
                        backgroundColor: selected ? color.bg : "#fff",
                        color: color.text,
                        borderColor: color.border,
                      }}
                      title={d.nombre}
                      aria-pressed={selected}
                    >
                      {d.abrev}
                    </button>
                  );
                })}
              </div>
            ) : proceso.areas_usuarias && proceso.areas_usuarias.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {proceso.areas_usuarias.map((area) => {
                  const color =
                    COLORES_ACTOR[area as keyof typeof COLORES_ACTOR] ??
                    COLORES_ACTOR.OTIN;
                  return (
                    <span
                      key={area}
                      className="text-xs px-2 py-0.5 rounded border font-medium"
                      style={{
                        backgroundColor: color.bg,
                        color: color.text,
                        borderColor: color.border,
                      }}
                    >
                      {area}
                    </span>
                  );
                })}
              </div>
            ) : (
              "—"
            )}
          </FichaField>

          <FichaField label="Denominación CMN">
            {editMode ? (
              <input
                type="text"
                value={draft.denominacion_cmn}
                onChange={(e) => setDraft({ ...draft, denominacion_cmn: e.target.value })}
                placeholder="—"
                className={EDIT_INPUT_CLS}
                aria-label="Editar denominación CMN"
                data-testid="edit-denominacion-cmn"
              />
            ) : (
              proceso.denominacion_cmn ?? "—"
            )}
          </FichaField>

          <FichaField label="Clasificador de gasto">
            {editMode ? (
              <input
                type="text"
                value={draft.clasificador_cmn}
                onChange={(e) => setDraft({ ...draft, clasificador_cmn: e.target.value })}
                placeholder="—"
                className={EDIT_INPUT_CLS}
                aria-label="Editar clasificador de gasto"
                data-testid="edit-clasificador-cmn"
              />
            ) : (
              proceso.clasificador_cmn ?? "—"
            )}
          </FichaField>

          {/* ---- Extras condicionales (cuando hay datos OCS / servicio / cancelación) ---- */}
          {montos?.monto_ocs != null && (
            <FichaField label="Monto OCS">
              {`S/ ${montos.monto_ocs.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </FichaField>
          )}

          {montos?.plazo_entrega != null && (
            <FichaField label="Plazo Entrega">
              {`${montos.plazo_entrega} días`}
            </FichaField>
          )}

          {montos?.fecha_inicio_srv && (
            <FichaField label="Inicio del Servicio">
              {formatFechaLarga(montos.fecha_inicio_srv)}
            </FichaField>
          )}

          <FichaField label="Tiempo Transcurrido">
            {dias === 0 ? "Hoy" : `${dias} día${dias !== 1 ? "s" : ""}`}
          </FichaField>

          {proceso.estado === "CANCELADO" && proceso.motivo_cancel && (
            <FichaField label="Motivo Cancelación" className="lg:col-span-2">
              <span className="text-red-700">{proceso.motivo_cancel}</span>
            </FichaField>
          )}
        </dl>
      </div>

      {/* Tabs — Ficha/Timeline | Documentos */}
      <div className="flex gap-1 border-b border-gray-200 mt-2" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === "ficha"}
          aria-controls="panel-ficha"
          onClick={() => setActiveTab("ficha")}
          className={[
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === "ficha"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700",
          ].join(" ")}
        >
          Proceso
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "documentos"}
          aria-controls="panel-documentos"
          onClick={() => setActiveTab("documentos")}
          className={[
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === "documentos"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700",
          ].join(" ")}
        >
          Documentos
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "tiempos"}
          aria-controls="panel-tiempos"
          onClick={() => setActiveTab("tiempos")}
          className={[
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === "tiempos"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700",
          ].join(" ")}
        >
          Tiempos
        </button>
      </div>

      {/* Panel: Proceso + Timeline */}
      {activeTab === "ficha" && (
        <div id="panel-ficha" role="tabpanel">
          {/* Mapa / Foco — full width abajo */}
          <LineaTiempo
            procesoId={proceso.id}
            areasUsuarias={proceso.areas_usuarias ?? []}
            procesoEstado={proceso.estado}
            etapaActualAvance={proceso.etapa_actual_avance ?? null}
          />
        </div>
      )}

      {/* Panel: Documentos */}
      {activeTab === "documentos" && (
        <div
          id="panel-documentos"
          role="tabpanel"
          className="bg-white border border-gray-200 shadow-sm rounded-lg p-5"
        >
          <h2 className="text-sm font-bold text-primary mb-4">
            Documentos vinculados
          </h2>
          <DocumentosTab procesoId={proceso.id} />
        </div>
      )}

      {/* Panel: Tiempos */}
      {activeTab === "tiempos" && (
        <div
          id="panel-tiempos"
          role="tabpanel"
          className="bg-white border border-gray-200 shadow-sm rounded-lg p-5"
        >
          <h2 className="text-sm font-bold text-primary mb-4">
            Tiempos por etapa — Cadena de hitos
          </h2>
          <TablaTiempos
            data={tiempos.data}
            isLoading={tiempos.isLoading}
          />
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-eliminar-titulo"
          data-testid="modal-eliminar-proceso"
        >
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6 space-y-4">
            <h2
              id="modal-eliminar-titulo"
              className="text-base font-bold text-gray-900"
            >
              Eliminar proceso
            </h2>
            <p className="text-sm text-gray-700">
              ¿Estás seguro de que querés eliminar el proceso{" "}
              <span className="font-mono font-semibold">{proceso.id_proceso}</span>?
              Se borrará todo y desaparecerá del sistema. Esta acción no se puede
              deshacer desde la interfaz.
            </p>
            {deleteError && (
              <p className="text-sm text-red-600" role="alert">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 border border-outline rounded text-sm text-gray-700
                           hover:bg-surface-content transition-colors disabled:opacity-50"
                data-testid="btn-cancelar-eliminar"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm font-semibold
                           hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="btn-confirmar-eliminar"
              >
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
