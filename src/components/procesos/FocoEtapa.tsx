"use client";

// ============================================================
// FocoEtapa — layout de 2 columnas (296px nav + 1fr panel)
//
// Columna izquierda: nav agrupado por fase con dots de estado.
// Columna derecha: breadcrumb + hero card + form inline (simple)
//   o botón "Abrir editor completo" (por_area / bucle).
// ============================================================
import React, { useState } from "react";
import Link from "next/link";
import { COLORES_ESTADO, COLORES_ACTOR, ETAPAS_CONFIG } from "@/lib/constants";
import { FASES, faseDeEtapa, resumenFase, nombreCorto } from "@/lib/fases";
import { useRegistrarEtapa, useActualizarEtapa } from "@/hooks/useEtapas";
import { useCorreosIngestaEtapa } from "@/hooks/useIngesta";
import { getFechaInicioSugerida } from "@/lib/etapaRules";
import { ModalRegistroEtapa } from "./ModalRegistroEtapa";
import type { EtapaAgrupada, Progreso } from "@/types/etapa";

// ============================================================
// Props
// ============================================================
export interface FocoEtapaProps {
  procesoId: number;
  etapas: EtapaAgrupada[];
  progreso: Progreso;
  etapaSeleccionada: EtapaAgrupada | null;
  onSelectEtapa: (etapa: EtapaAgrupada) => void;
  onClose: () => void;
  areasUsuarias?: string[];
  procesoEstado?: string;
}

// ============================================================
// Helpers
// ============================================================
const ESTADO_LABEL: Record<string, string> = {
  COMPLETADO: "Completado",
  EN_CURSO: "En Curso",
  PENDIENTE: "Pendiente",
  NO_APLICA: "No aplica",
  OMITIDO: "Omitido",
  CANCELADO: "Cancelado",
};

function CheckIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

function DiagonalIcon() {
  return (
    <svg width="7" height="7" viewBox="0 0 10 10" aria-hidden="true">
      <line x1="2" y1="2" x2="8" y2="8" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ============================================================
// NavDot — estado visual del dot circular en la nav
// ============================================================
function NavDot({ estado }: { estado: string }) {
  const col = COLORES_ESTADO[estado as keyof typeof COLORES_ESTADO] ?? COLORES_ESTADO.PENDIENTE;

  if (estado === "COMPLETADO") {
    return (
      <span
        className="w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center flex-shrink-0"
        style={{ background: col.bar, borderColor: col.bar }}
        aria-hidden="true"
      >
        <CheckIcon />
      </span>
    );
  }

  if (estado === "EN_CURSO") {
    return (
      <span
        className="w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center flex-shrink-0"
        style={{ borderColor: col.bar, background: "#fff" }}
        aria-hidden="true"
      >
        <span className="w-[7px] h-[7px] rounded-full" style={{ background: col.bar }} />
      </span>
    );
  }

  if (estado === "NO_APLICA" || estado === "OMITIDO") {
    return (
      <span
        className="w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center flex-shrink-0"
        style={{ borderColor: "#CBD5E1", background: "#fff" }}
        aria-hidden="true"
      >
        <DiagonalIcon />
      </span>
    );
  }

  // PENDIENTE (default)
  return (
    <span
      className="w-[15px] h-[15px] rounded-full border-2 flex-shrink-0"
      style={{ borderColor: "#CBD5E1", background: "#fff" }}
      aria-hidden="true"
    />
  );
}

// ============================================================
// NavRow — una etapa en el sidebar
// ============================================================
interface NavRowProps {
  etapa: EtapaAgrupada;
  isActive: boolean;
  isCurrent: boolean;
  onClick: () => void;
}

function NavRow({ etapa, isActive, isCurrent, onClick }: NavRowProps) {
  return (
    <button
      type="button"
      data-testid={`nav-row-${etapa.cod}`}
      onClick={onClick}
      aria-current={isCurrent ? "true" : undefined}
      className={`flex items-center gap-[9px] w-full text-left px-[9px] py-[8px] rounded-[8px] transition-all duration-150 relative
        ${isActive
          ? "bg-white font-bold text-primary"
          : "hover:bg-[#eef2f8] text-[#334155]"
        }`}
      style={isActive ? { boxShadow: "inset 0 0 0 1.5px #bcd4fa, 0 1px 3px rgba(15,28,48,.08)" } : undefined}
    >
      <NavDot estado={etapa.estado} />
      <span className="font-mono text-[10.5px] font-bold text-[#64748b] flex-shrink-0 w-[30px]">
        {etapa.cod}
      </span>
      <span className={`text-[12.5px] truncate flex-1 ${isActive ? "font-bold text-primary" : "font-medium"}`}>
        {nombreCorto(etapa.nombre)}
      </span>
      {isCurrent && (
        <span
          className="w-[7px] h-[7px] rounded-full flex-shrink-0"
          style={{ background: "#2563EB" }}
          aria-label="Etapa actual"
        />
      )}
    </button>
  );
}

// ============================================================
// NavFase — grupo de una fase en el sidebar
// ============================================================
interface NavFaseProps {
  num: number;
  nombre: string;
  etapas: EtapaAgrupada[];
  etapaActual: string | null;
  etapaSeleccionada: EtapaAgrupada | null;
  onSelect: (e: EtapaAgrupada) => void;
}

function NavFase({ num, nombre, etapas, etapaActual, etapaSeleccionada, onSelect }: NavFaseProps) {
  const completadas = etapas.filter((e) => e.estado === "COMPLETADO").length;
  const total = etapas.filter((e) => !e.es_bucle).length;
  const est = etapas.some((e) => e.estado === "EN_CURSO")
    ? COLORES_ESTADO.EN_CURSO
    : etapas.every((e) => e.es_bucle || e.estado === "COMPLETADO" || e.estado === "NO_APLICA")
    ? COLORES_ESTADO.COMPLETADO
    : COLORES_ESTADO.PENDIENTE;

  return (
    <div className="mb-[6px]">
      <div
        className="flex items-center gap-[8px] px-[8px] pt-[9px] pb-[7px] text-[11px] font-bold text-[#64748b] tracking-[.01em]"
        aria-label={`Fase ${num}: ${nombre}`}
      >
        <span
          className="w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center text-[10px] font-extrabold font-mono flex-shrink-0"
          style={{ borderColor: est.bar, color: est.bar }}
          aria-hidden="true"
        >
          {num}
        </span>
        <span>{nombre}</span>
        <span className="ml-auto font-mono text-[10px] font-bold text-[#94a3b8]">{completadas}/{total}</span>
      </div>
      {etapas.map((e) => (
        <NavRow
          key={e.cod}
          etapa={e}
          isActive={etapaSeleccionada?.cod === e.cod}
          isCurrent={e.cod === etapaActual}
          onClick={() => onSelect(e)}
        />
      ))}
    </div>
  );
}

// ============================================================
// PanelHero — hero card con barra lateral de estado
// ============================================================
interface PanelHeroProps {
  etapa: EtapaAgrupada;
}

function PanelHero({ etapa }: PanelHeroProps) {
  const est = COLORES_ESTADO[etapa.estado as keyof typeof COLORES_ESTADO] ?? COLORES_ESTADO.PENDIENTE;
  const actor = COLORES_ACTOR[etapa.area_responsable as keyof typeof COLORES_ACTOR] ?? COLORES_ACTOR.OTIN;
  const config = ETAPAS_CONFIG.find((c) => c.cod === etapa.cod);

  // Detectar flujo desde el nombre (entre paréntesis al final)
  const flujoMatch = etapa.nombre.match(/\(([^)]+)\)\s*$/);
  const flujo = flujoMatch?.[1] ?? null;

  return (
    <div
      data-testid="foco-hero"
      className="relative rounded-[13px] border-[1.5px] overflow-hidden mb-[16px]"
      style={{
        borderColor: est.bar + "66",
        background: "linear-gradient(180deg,#fbfdff,#fff)",
        boxShadow: "0 1px 3px rgba(15,28,48,.08)",
        paddingLeft: 20,
      }}
    >
      {/* Barra lateral de estado */}
      <span
        className="absolute left-0 top-0 bottom-0 w-[5px]"
        style={{ background: est.bar }}
        aria-hidden="true"
      />
      <div className="px-[18px] py-[16px]">
        {/* Badges */}
        <div className="flex items-center gap-[9px] flex-wrap mb-[9px]">
          <span
            className="inline-flex items-center text-[10.5px] font-bold px-[7px] py-[2px] rounded-[6px] border"
            style={{ background: actor.bg, color: actor.text, borderColor: actor.border }}
          >
            {etapa.area_responsable}
          </span>
          <span className="font-mono text-[11.5px] font-bold text-[#64748b]">{etapa.cod}</span>
          <span
            className="text-[10.5px] font-bold px-[9px] py-[2px] rounded-full"
            style={{ background: est.bg, color: est.text }}
          >
            {ESTADO_LABEL[etapa.estado] ?? etapa.estado}
          </span>
          {etapa.es_bucle && (
            <span className="text-[10px] font-bold px-[7px] py-px rounded-full" style={{ background: "#FFE699", color: "#7F6000", border: "1px solid #F9A825" }}>
              BUCLE
            </span>
          )}
        </div>

        {/* Nombre completo */}
        <h3 className="text-[19px] font-bold leading-[1.25] tracking-[-0.01em]" style={{ color: "#03224d" }}>
          {nombreCorto(etapa.nombre)}
        </h3>

        {/* Meta: flujo + instrucción */}
        <div className="flex flex-wrap gap-[15px] text-[12.5px] text-[#64748b] mt-[9px]">
          {flujo && (
            <span className="inline-flex items-center gap-[5px]">
              <span aria-hidden="true">→</span>
              {flujo}
            </span>
          )}
          {config && 'instruccion' in config && (
            <span>{(config as { instruccion: string }).instruccion}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// InlineForm — form básico para etapas simples
// ============================================================
const ESTADO_OPCIONES = ["PENDIENTE", "EN_CURSO", "COMPLETADO", "NO_APLICA"] as const;

interface InlineFormProps {
  etapa: EtapaAgrupada;
  procesoId: number;
}

function InlineForm({ etapa, procesoId }: InlineFormProps) {
  const fila = etapa.filas[0] ?? null;
  const isEdit = fila !== null;

  const registrar = useRegistrarEtapa(procesoId);
  const actualizar = useActualizarEtapa(procesoId);

  const [estado, setEstado] = useState<string>(fila?.estado_etapa ?? "EN_CURSO");
  const [responsable, setResponsable] = useState(fila?.responsable ?? "");
  const [fechaInicio, setFechaInicio] = useState(fila?.fecha_inicio ?? "");
  const [fechaFin, setFechaFin] = useState(fila?.fecha_fin ?? "");
  const [oficio, setOficio] = useState(fila?.oficio_correo ?? "");
  const [observaciones, setObservaciones] = useState(fila?.observaciones ?? "");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isPending = registrar.isPending || actualizar.isPending;
  const mutError = registrar.error ?? actualizar.error;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!fechaInicio) {
      setSubmitError("La fecha de inicio es requerida.");
      return;
    }

    const payload = {
      codigo_etapa: etapa.cod,
      nombre_etapa: etapa.nombre,
      fecha_inicio: fechaInicio,
      estado_etapa: estado,
      ...(fechaFin ? { fecha_fin: fechaFin } : {}),
      ...(responsable ? { responsable } : {}),
      ...(oficio ? { oficio_correo: oficio } : {}),
      ...(observaciones ? { observaciones } : {}),
    };

    if (isEdit) {
      actualizar.mutate({ etapaId: fila.id, payload });
    } else {
      registrar.mutate(payload);
    }
  }

  const inputCls = "font-sans text-[13px] text-[#1e293b] bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] px-[11px] py-[9px] w-full transition focus:outline-none focus:border-[#7aa7ee] focus:bg-white focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]";
  const labelCls = "text-[11px] font-semibold text-[#64748b]";

  return (
    <form
      data-testid="foco-inline-form"
      onSubmit={handleSubmit}
      className="border border-[#eef1f7] rounded-[13px] p-[18px_20px] bg-white"
      style={{ boxShadow: "0 1px 3px rgba(15,28,48,.08)" }}
    >
      <p className="text-[13px] font-bold mb-[15px]" style={{ color: "#03224d" }}>
        {isEdit ? "Editar registro" : "Registrar etapa"}
      </p>

      <div className="grid grid-cols-2 gap-x-[18px] gap-y-[14px]">
        {/* Estado */}
        <div className="flex flex-col gap-[6px]">
          <label htmlFor={`foco-estado-${etapa.cod}`} className={labelCls}>Estado</label>
          <select
            id={`foco-estado-${etapa.cod}`}
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className={inputCls}
          >
            {ESTADO_OPCIONES.map((op) => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        </div>

        {/* Responsable */}
        <div className="flex flex-col gap-[6px]">
          <label htmlFor={`foco-responsable-${etapa.cod}`} className={labelCls}>Responsable</label>
          <input
            id={`foco-responsable-${etapa.cod}`}
            type="text"
            value={responsable}
            onChange={(e) => setResponsable(e.target.value)}
            placeholder="Nombre del responsable"
            className={inputCls}
          />
        </div>

        {/* Fecha inicio */}
        <div className="flex flex-col gap-[6px]">
          <label htmlFor={`foco-finicio-${etapa.cod}`} className={labelCls}>Fecha inicio</label>
          <input
            id={`foco-finicio-${etapa.cod}`}
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Fecha fin */}
        <div className="flex flex-col gap-[6px]">
          <label htmlFor={`foco-ffin-${etapa.cod}`} className={labelCls}>Fecha fin</label>
          <input
            id={`foco-ffin-${etapa.cod}`}
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Oficio / Correo — full width */}
        <div className="flex flex-col gap-[6px] col-span-2">
          <label htmlFor={`foco-oficio-${etapa.cod}`} className={labelCls}>Oficio / Correo</label>
          <input
            id={`foco-oficio-${etapa.cod}`}
            type="text"
            value={oficio}
            onChange={(e) => setOficio(e.target.value)}
            placeholder="N° oficio o correo"
            className={inputCls}
          />
        </div>

        {/* Observaciones — full width */}
        <div className="flex flex-col gap-[6px] col-span-2">
          <label htmlFor={`foco-obs-${etapa.cod}`} className={labelCls}>Observaciones</label>
          <textarea
            id={`foco-obs-${etapa.cod}`}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
            placeholder="Observaciones opcionales"
            className={`${inputCls} resize-y`}
          />
        </div>
      </div>

      {/* Error messages */}
      {(submitError || mutError) && (
        <p className="text-[12px] text-red-600 mt-[10px]" role="alert">
          {submitError ?? (mutError instanceof Error ? mutError.message : "Error al guardar.")}
        </p>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-[10px] mt-[16px]">
        <button
          type="submit"
          disabled={isPending}
          className="text-[12px] font-semibold text-white px-[15px] py-[8px] rounded-[8px] transition hover:-translate-y-px disabled:opacity-50"
          style={{ background: "#03224d" }}
        >
          {isPending ? "Guardando…" : isEdit ? "Actualizar" : "Guardar cambios"}
        </button>
        <button
          type="button"
          className="text-[12px] font-semibold text-[#475569] px-[13px] py-[8px] rounded-[8px] border border-[#e2e8f0] bg-[#f1f5f9] transition hover:bg-[#e2e8f0]"
        >
          No aplica
        </button>
      </div>
    </form>
  );
}

// ============================================================
// CorreosVinculados — trazabilidad hacia la bandeja de ingesta
// ============================================================
function formatCorreoDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-PE");
}

function CorreosVinculados({
  procesoId,
  etapa,
}: {
  procesoId: number;
  etapa: EtapaAgrupada;
}) {
  const { data, isLoading, isError } = useCorreosIngestaEtapa(procesoId, etapa.cod);
  const correos = data?.items ?? [];

  if (isLoading) {
    return (
      <section className="mt-[14px] border border-[#eef1f7] rounded-[13px] bg-white p-[14px_16px] text-[12px] text-[#64748b]">
        Cargando correos vinculados...
      </section>
    );
  }

  if (isError || correos.length === 0) return null;

  return (
    <section
      className="mt-[14px] border border-[#bdebd3] rounded-[13px] bg-[#f0fdf5] p-[14px_16px]"
      aria-label="Correos vinculados a la etapa"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h4 className="text-[13px] font-bold text-[#065f46]">
            Correos vinculados
            <span className="ml-2 rounded-full bg-white border border-[#bbf7d0] px-2 py-0.5 text-[11px] font-mono">
              {correos.length}
            </span>
          </h4>
          <p className="mt-1 text-[12px] text-[#047857]">
            Evidencia de ingesta asociada a esta etapa.
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {correos.map((correo) => (
          <div
            key={correo.id}
            className="flex items-center justify-between gap-3 rounded-[9px] border border-[#d1fae5] bg-white px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold text-[#03224d] truncate">
                {correo.subject ?? "(sin asunto)"}
              </p>
              <p className="mt-0.5 text-[11.5px] text-[#64748b]">
                {formatCorreoDate(correo.received_at)} · {correo.documentos.length} doc(s)
              </p>
            </div>
            <Link
              href={`/ingesta?tab=aprobados&correo=${correo.id}`}
              className="flex-shrink-0 rounded-[8px] border border-[#bbf7d0] bg-[#ecfdf5] px-3 py-1.5 text-[12px] font-semibold text-[#047857] hover:bg-[#d1fae5]"
            >
              Ver en ingesta
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// Breadcrumb
// ============================================================
function Breadcrumb({ etapa, etapas }: { etapa: EtapaAgrupada; etapas: EtapaAgrupada[] }) {
  const faseNum = faseDeEtapa(etapa.cod);
  const faseData = FASES.find((f) => f.num === faseNum);
  const r = resumenFase(faseNum, etapas);
  const _ = r; // silence unused warning

  return (
    <nav
      data-testid="foco-breadcrumb"
      aria-label="Ruta de etapa"
      className="flex items-center gap-[7px] text-[11.5px] text-[#94a3b8] font-medium mb-[13px]"
    >
      <span>Mapa</span>
      <span className="text-[#cbd5e1]">›</span>
      <span>Fase {faseNum}</span>
      <span className="text-[#cbd5e1]">›</span>
      <span>{faseData?.corto ?? `Fase ${faseNum}`}</span>
      <span className="text-[#cbd5e1]">›</span>
      <b className="font-mono" style={{ color: "#03224d" }}>{etapa.cod}</b>
    </nav>
  );
}

// ============================================================
// FocoEtapa — componente principal
// ============================================================
export function FocoEtapa({
  procesoId,
  etapas,
  progreso,
  etapaSeleccionada,
  onSelectEtapa,
  onClose,
  areasUsuarias = [],
  procesoEstado,
}: FocoEtapaProps) {
  const [modalOpen, setModalOpen] = useState(false);

  // Cuando cambia la etapa seleccionada, cerrar modal si estaba abierto
  React.useEffect(() => {
    setModalOpen(false);
  }, [etapaSeleccionada?.cod]);

  // ¿Esta etapa delega al modal?
  const delegaAlModal =
    etapaSeleccionada !== null &&
    (etapaSeleccionada.por_area || etapaSeleccionada.es_bucle);

  return (
    <div
      className="grid gap-[20px] items-start mt-[6px]"
      style={{ gridTemplateColumns: "296px 1fr" }}
    >
      {/* ====== Columna izquierda: nav ====== */}
      <nav
        aria-label="Navegación de etapas"
        className="border border-[#eef1f7] rounded-[12px] bg-[#f8fafc] p-[8px] overflow-y-auto"
        style={{ maxHeight: 760 }}
      >
        {FASES.map((fase) => {
          const etapasDeFase = etapas.filter(
            (e) => faseDeEtapa(e.cod) === fase.num
          );
          if (etapasDeFase.length === 0) return null;
          return (
            <NavFase
              key={fase.id}
              num={fase.num}
              nombre={fase.nombre}
              etapas={etapasDeFase}
              etapaActual={progreso.etapa_actual}
              etapaSeleccionada={etapaSeleccionada}
              onSelect={onSelectEtapa}
            />
          );
        })}
      </nav>

      {/* ====== Columna derecha: panel ====== */}
      <div className="min-w-0">
        {etapaSeleccionada === null ? (
          /* Prompt vacío */
          <div
            data-testid="foco-empty-prompt"
            className="flex flex-col items-center justify-center py-16 text-center text-[#94a3b8]"
          >
            <span className="text-[40px] mb-3" aria-hidden="true">←</span>
            <p className="text-[14px] font-semibold">Seleccioná una etapa del listado</p>
            <p className="text-[12px] mt-1">Hacé clic en cualquier etapa del panel izquierdo para ver su detalle y editarla.</p>
          </div>
        ) : (
          <div>
            {/* Breadcrumb */}
            <Breadcrumb etapa={etapaSeleccionada} etapas={etapas} />

            {/* Hero card */}
            <PanelHero etapa={etapaSeleccionada} />

            {/* Form o botón delegado */}
            {delegaAlModal ? (
              <div className="border border-[#eef1f7] rounded-[13px] p-[18px_20px] bg-white flex flex-col items-start gap-[12px]" style={{ boxShadow: "0 1px 3px rgba(15,28,48,.08)" }}>
                <p className="text-[13px] font-bold" style={{ color: "#03224d" }}>Editar registro</p>
                <p className="text-[12.5px] text-[#64748b]">
                  Esta etapa requiere el editor completo
                  {etapaSeleccionada.por_area ? " (registro por área)" : " (gestión de rondas)"}.
                </p>
                <button
                  type="button"
                  data-testid="foco-open-modal-btn"
                  onClick={() => setModalOpen(true)}
                  className="text-[12px] font-semibold text-white px-[15px] py-[8px] rounded-[8px] transition hover:-translate-y-px"
                  style={{ background: "#03224d" }}
                >
                  Abrir editor completo
                </button>
              </div>
            ) : (
              <InlineForm etapa={etapaSeleccionada} procesoId={procesoId} />
            )}

            <CorreosVinculados procesoId={procesoId} etapa={etapaSeleccionada} />

            {/* Botón cerrar / volver al mapa */}
            <div className="mt-[12px]">
              <button
                type="button"
                onClick={onClose}
                className="text-[12px] font-semibold text-[#2563EB] px-[6px] py-[8px] transition hover:underline"
              >
                ← Volver al mapa
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal para por_area / bucle */}
      {etapaSeleccionada && modalOpen && (
        <ModalRegistroEtapa
          procesoId={procesoId}
          etapa={etapaSeleccionada}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          areasUsuarias={areasUsuarias}
          fechaInicioSugerida={getFechaInicioSugerida(etapaSeleccionada.cod, etapas)}
        />
      )}
    </div>
  );
}
