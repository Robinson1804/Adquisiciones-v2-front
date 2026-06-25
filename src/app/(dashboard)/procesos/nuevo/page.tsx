"use client";

/**
 * S3 — Nuevo Proceso (/procesos/nuevo)
 * 4-section form: Identificación / Áreas / CMN / Presupuesto.
 * VIEWER is redirected on mount (role-gate).
 *
 * Section 2 usa un multi-select buscable sobre las 39 dependencias INEI.
 * El valor almacenado en areas_usuarias sigue siendo la abreviatura (string),
 * compatible con datos existentes.
 */

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/stores/authStore";
import { useCrearProceso } from "@/hooks/useProcesos";
import { DEPENDENCIAS } from "@/lib/constants";

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------
const CURRENT_YEAR = new Date().getFullYear();

// Local "today" as YYYY-MM-DD (avoids UTC off-by-one for the date input default).
const TODAY_ISO = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
})();

// ----------------------------------------------------------------
// Zod schema — mirrors ProcesoCreate (backend Pydantic)
// ----------------------------------------------------------------
const cmnPorAreaSchema = z.object({
  area: z.string(),
  cmn_adjunto: z.enum(["SI", "NO"]),
});

const procesoSchema = z.object({
  requerimiento: z
    .string()
    .min(3, "El requerimiento debe tener al menos 3 caracteres"),
  tipo: z.enum(["BIEN", "SERVICIO"], {
    required_error: "Seleccioná el tipo de adquisición",
  }),
  area_iniciadora: z
    .string()
    .min(1, "Seleccioná el área iniciadora"),
  areas_usuarias: z
    .array(z.string())
    .min(1, "Debés seleccionar al menos un área usuaria"),
  pim: z.preprocess(
    (val) => (val === "" || val === null ? undefined : Number(val)),
    z.number().min(0, "El PIM no puede ser negativo").optional()
  ),
  anno: z.number().min(2020).max(2100),
  fecha_solicitud: z
    .string()
    .min(1, "La fecha de solicitud es requerida"),
  denominacion_cmn: z.string().optional(),
  clasificador_cmn: z.string().optional(),
  cmn_por_area: z.array(cmnPorAreaSchema),
});

type ProcesoFormValues = z.infer<typeof procesoSchema>;

// ----------------------------------------------------------------
// Section wrapper
// ----------------------------------------------------------------
function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-outline shadow-card rounded-lg p-6 space-y-4">
      <h2 className="text-sm font-bold text-primary border-b border-outline pb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}

// ----------------------------------------------------------------
// Field error
// ----------------------------------------------------------------
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-red-600 mt-1" role="alert">
      {message}
    </p>
  );
}

// ----------------------------------------------------------------
// AreaSelector — multi-select buscable sobre DEPENDENCIAS
// ----------------------------------------------------------------
interface AreaSelectorProps {
  seleccionadas: string[];
  onToggle: (abrev: string) => void;
}

function AreaSelector({ seleccionadas, onToggle }: AreaSelectorProps) {
  const [busqueda, setBusqueda] = useState("");

  const termino = busqueda.trim().toLowerCase();
  const filtradas = termino
    ? DEPENDENCIAS.filter(
        (d) =>
          d.abrev.toLowerCase().includes(termino) ||
          d.nombre.toLowerCase().includes(termino)
      )
    : DEPENDENCIAS;

  return (
    <div className="space-y-3">
      {/* Chips de áreas seleccionadas */}
      {seleccionadas.length > 0 && (
        <div
          className="flex flex-wrap gap-1.5"
          aria-label="Áreas seleccionadas"
          role="list"
        >
          {seleccionadas.map((abrev) => {
            const dep = DEPENDENCIAS.find((d) => d.abrev === abrev);
            return (
              <span
                key={abrev}
                role="listitem"
                className="inline-flex items-center gap-1 bg-primary text-white text-xs font-medium px-2.5 py-1 rounded-full"
              >
                {dep?.abrev ?? abrev}
                <button
                  type="button"
                  onClick={() => onToggle(abrev)}
                  aria-label={`Quitar ${abrev}`}
                  className="ml-0.5 hover:opacity-75 focus:outline-none focus:ring-1 focus:ring-white rounded-full"
                >
                  <svg
                    aria-hidden="true"
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Input de búsqueda */}
      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por abreviatura o nombre..."
        className="w-full border border-outline rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-label="Buscar dependencia"
        data-testid="area-search-input"
      />

      {/* Lista scrolleable de dependencias */}
      <div
        className="max-h-56 overflow-y-auto border border-outline rounded divide-y divide-outline"
        role="group"
        aria-label="Lista de dependencias"
      >
        {filtradas.length === 0 ? (
          <p className="px-3 py-2 text-xs text-gray-400">
            Sin resultados para &ldquo;{busqueda}&rdquo;
          </p>
        ) : (
          filtradas.map((dep) => {
            const selected = seleccionadas.includes(dep.abrev);
            return (
              <button
                key={dep.abrev}
                type="button"
                onClick={() => onToggle(dep.abrev)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  selected
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-surface-content text-gray-700"
                }`}
                aria-pressed={selected}
                aria-label={`Area ${dep.abrev}`}
              >
                {/* Checkbox visual */}
                <span
                  aria-hidden="true"
                  className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center ${
                    selected
                      ? "border-primary bg-primary"
                      : "border-gray-300"
                  }`}
                >
                  {selected && (
                    <svg
                      className="w-2.5 h-2.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </span>
                <span className="truncate">{dep.nombre}</span>
              </button>
            );
          })
        )}
      </div>

      {filtradas.length > 0 && (
        <p className="text-[11px] text-gray-400">
          {filtradas.length === DEPENDENCIAS.length
            ? `${DEPENDENCIAS.length} dependencias disponibles`
            : `${filtradas.length} de ${DEPENDENCIAS.length} dependencias`}
        </p>
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Main page
// ----------------------------------------------------------------
export default function NuevoProcesoPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { mutate: crearProceso, isPending, error: mutationError } = useCrearProceso();

  // VIEWER guard
  useEffect(() => {
    if (user && user.rol === "VIEWER") {
      router.replace("/procesos");
    }
  }, [user, router]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProcesoFormValues>({
    resolver: zodResolver(procesoSchema),
    defaultValues: {
      requerimiento: "",
      tipo: undefined,
      area_iniciadora: "",
      areas_usuarias: [],
      pim: undefined,
      anno: CURRENT_YEAR,
      fecha_solicitud: TODAY_ISO,
      denominacion_cmn: "",
      clasificador_cmn: "",
      cmn_por_area: [],
    },
  });

  const areasSeleccionadas = watch("areas_usuarias");
  const cmnPorArea = watch("cmn_por_area");

  // Sync cmn_por_area when areas change
  useEffect(() => {
    const existing = cmnPorArea ?? [];
    const updated = (areasSeleccionadas ?? []).map((area) => {
      const prev = existing.find((c) => c.area === area);
      return { area, cmn_adjunto: prev?.cmn_adjunto ?? ("NO" as const) };
    });
    setValue("cmn_por_area", updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areasSeleccionadas]);

  const allCmnSI =
    cmnPorArea.length > 0 && cmnPorArea.every((c) => c.cmn_adjunto === "SI");

  function toggleArea(area: string) {
    const current = areasSeleccionadas ?? [];
    if (current.includes(area)) {
      setValue(
        "areas_usuarias",
        current.filter((a) => a !== area)
      );
    } else {
      setValue("areas_usuarias", [...current, area]);
    }
  }

  function onSubmit(data: ProcesoFormValues) {
    crearProceso(
      {
        requerimiento: data.requerimiento,
        tipo: data.tipo,
        area_iniciadora: data.area_iniciadora,
        areas_usuarias: data.areas_usuarias,
        pim: data.pim ?? null,
        anno: data.anno,
        fecha_solicitud: data.fecha_solicitud,
        denominacion_cmn: data.denominacion_cmn ?? null,
        clasificador_cmn: data.clasificador_cmn ?? null,
        cmn_por_area: data.cmn_por_area.map((c) => ({
          area: c.area,
          cmn_adjunto: c.cmn_adjunto,
        })),
      },
      {
        onSuccess: (nuevo) => {
          router.push(`/procesos/${nuevo.id}`);
        },
      }
    );
  }

  // If VIEWER, render nothing while redirect fires
  if (user?.rol === "VIEWER") return null;

  return (
    <div className="module-typography max-w-3xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-500" aria-label="Migas de pan">
        <span
          className="text-primary cursor-pointer hover:underline"
          onClick={() => router.push("/procesos")}
          role="link"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && router.push("/procesos")}
        >
          Procesos
        </span>
        {" / "}
        <span>Nuevo Proceso</span>
      </nav>

      <h1 className="text-xl font-bold text-primary">Nuevo Proceso de Adquisición</h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* Section 1 — Identificación */}
        <SectionCard title="1. Identificación">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ID Proceso (read-only) */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                ID Proceso
              </label>
              <input
                type="text"
                disabled
                value="Se genera automáticamente"
                className="w-full border border-outline rounded px-3 py-2 text-sm bg-gray-50 text-gray-400"
                aria-label="ID de proceso — se genera automáticamente"
              />
            </div>

            {/* Año */}
            <div>
              <label
                htmlFor="anno"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Año <span className="text-red-500">*</span>
              </label>
              <input
                id="anno"
                type="number"
                {...register("anno", { valueAsNumber: true })}
                className="w-full border border-outline rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <FieldError message={errors.anno?.message} />
            </div>

            {/* Fecha de Solicitud — registra E01a (arranque del proceso) */}
            <div>
              <label
                htmlFor="fecha_solicitud"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Fecha de Solicitud <span className="text-red-500">*</span>
              </label>
              <input
                id="fecha_solicitud"
                type="date"
                {...register("fecha_solicitud")}
                className="w-full border border-outline rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-required="true"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Fecha en que el área solicitó el requerimiento. Registra E01a automáticamente.
              </p>
              <FieldError message={errors.fecha_solicitud?.message} />
            </div>

            {/* Área iniciadora */}
            <div>
              <label
                htmlFor="area_iniciadora"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Área iniciadora <span className="text-red-500">*</span>
              </label>
              <select
                id="area_iniciadora"
                {...register("area_iniciadora")}
                className="w-full border border-outline rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Área iniciadora"
              >
                <option value="">— Seleccionar área —</option>
                {DEPENDENCIAS.map((dep) => (
                  <option key={dep.abrev} value={dep.abrev}>
                    {dep.abrev} — {dep.nombre}
                  </option>
                ))}
              </select>
              <FieldError message={errors.area_iniciadora?.message} />
            </div>

            {/* Tipo */}
            <div>
              <fieldset>
                <legend className="block text-xs font-medium text-gray-600 mb-2">
                  Tipo <span className="text-red-500">*</span>
                </legend>
                <div className="flex gap-4">
                  {(["BIEN", "SERVICIO"] as const).map((t) => (
                    <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        value={t}
                        {...register("tipo")}
                        className="accent-primary"
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </fieldset>
              <FieldError message={errors.tipo?.message} />
            </div>
          </div>

          {/* Requerimiento */}
          <div>
            <label
              htmlFor="requerimiento"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Descripción del Requerimiento <span className="text-red-500">*</span>
            </label>
            <textarea
              id="requerimiento"
              rows={3}
              {...register("requerimiento")}
              placeholder="Describí el requerimiento de adquisición..."
              className="w-full border border-outline rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              aria-required="true"
            />
            <FieldError message={errors.requerimiento?.message} />
          </div>
        </SectionCard>

        {/* Section 2 — Áreas Usuarias */}
        <SectionCard title="2. Áreas Usuarias">
          <fieldset>
            <legend className="text-xs text-gray-500 mb-3">
              Seleccioná las áreas que participan en este proceso (mínimo 1)
            </legend>
            <AreaSelector
              seleccionadas={areasSeleccionadas ?? []}
              onToggle={toggleArea}
            />
            <FieldError message={errors.areas_usuarias?.message} />
          </fieldset>
        </SectionCard>

        {/* Section 3 — CMN por Área */}
        <SectionCard title="3. Validación CMN">
          {/* CMN metadata fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
            <div>
              <label
                htmlFor="denominacion_cmn"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Denominación CMN
              </label>
              <input
                id="denominacion_cmn"
                type="text"
                {...register("denominacion_cmn")}
                placeholder="SUSCRIPCIÓN ANUAL A LICENCIA DE SOFTWARE"
                className="w-full border border-outline rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Denominación CMN"
              />
            </div>
            <div>
              <label
                htmlFor="clasificador_cmn"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Clasificador de gasto
              </label>
              <input
                id="clasificador_cmn"
                type="text"
                {...register("clasificador_cmn")}
                placeholder="2.3.2.5.1.99"
                className="w-full border border-outline rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Clasificador de gasto"
              />
            </div>
          </div>

          {(areasSeleccionadas ?? []).length === 0 ? (
            <p className="text-xs text-gray-400">
              Seleccioná áreas usuarias para configurar el CMN por área.
            </p>
          ) : (
            <div className="space-y-3">
              {allCmnSI && (
                <div
                  className="bg-green-50 border border-green-200 rounded px-3 py-2 text-xs text-green-700"
                  role="status"
                >
                  Todas las áreas tienen CMN adjunto confirmado.
                </div>
              )}
              {(areasSeleccionadas ?? []).map((area, idx) => (
                <div
                  key={area}
                  className="flex items-center gap-4 border border-outline rounded px-4 py-3"
                >
                  <span className="text-sm font-medium text-gray-700 w-36">{area}</span>
                  <Controller
                    control={control}
                    name={`cmn_por_area.${idx}.cmn_adjunto`}
                    render={({ field }) => (
                      <fieldset className="flex gap-4">
                        <legend className="sr-only">
                          CMN adjunto para {area}
                        </legend>
                        {(["SI", "NO"] as const).map((val) => (
                          <label
                            key={val}
                            className="flex items-center gap-1.5 text-sm cursor-pointer"
                          >
                            <input
                              type="radio"
                              value={val}
                              checked={field.value === val}
                              onChange={() => field.onChange(val)}
                              className="accent-primary"
                            />
                            {val === "SI" ? "CMN Adjunto" : "Sin CMN"}
                          </label>
                        ))}
                      </fieldset>
                    )}
                  />
                </div>
              ))}
              <p className="text-xs text-gray-400">
                Nota: el enforcement del CMN (bloqueo de avance a E02) se aplicará en C3.
              </p>
            </div>
          )}
        </SectionCard>

        {/* Section 4 — Presupuesto */}
        <SectionCard title="4. Presupuesto">
          <div className="max-w-xs">
            <label
              htmlFor="pim"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Presupuesto Institucional Modificado (PIM)
            </label>
            <div className="flex items-center border border-outline rounded overflow-hidden focus-within:ring-2 focus-within:ring-primary/30">
              <span className="bg-gray-50 border-r border-outline px-3 py-2 text-sm text-gray-500">
                S/
              </span>
              <input
                id="pim"
                type="number"
                step="0.01"
                min="0"
                {...register("pim")}
                placeholder="0.00"
                className="flex-1 px-3 py-2 text-sm focus:outline-none"
                aria-label="Presupuesto Institucional Modificado en soles"
              />
            </div>
            <FieldError message={errors.pim?.message} />
          </div>
          <p className="text-xs text-gray-400">
            Al crear el proceso será redirigido automáticamente al detalle del proceso.
          </p>
        </SectionCard>

        {/* Mutation error */}
        {mutationError && (
          <div className="bg-red-50 border border-red-200 rounded px-4 py-3 text-sm text-red-700" role="alert">
            Error al crear el proceso: {mutationError.message}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded border border-outline text-sm text-gray-700 hover:bg-surface-content transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2 bg-primary text-white font-semibold rounded text-sm
                       hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            {isPending ? "Creando..." : "Crear Proceso"}
          </button>
        </div>
      </form>
    </div>
  );
}
