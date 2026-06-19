"use client";

/**
 * CorreccionInline — formulario inline para corregir datos extraídos por IA.
 *
 * Usa react-hook-form + Zod para validación.
 * Solo campos que el revisor puede corregir (CorreoCorreccionPayload).
 */

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCorregirIngesta } from "@/hooks/useIngesta";

// ----------------------------------------------------------------
// Schema Zod
// ----------------------------------------------------------------

const correccionSchema = z.object({
  nombre_servicio: z
    .string()
    .min(1, "El nombre del servicio es requerido")
    .max(512),
  numero_oficio: z.string().optional().nullable(),
  tipo: z.enum(["BIEN", "SERVICIO", ""]).optional(),
  siaf: z.string().optional().nullable(),
  proveedor: z.string().optional().nullable(),
  fecha_documento: z.string().optional().nullable(),
  fecha_recepcion: z.string().optional().nullable(),
});

type CorreccionForm = z.infer<typeof correccionSchema>;

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

interface CorreccionInlineProps {
  ingestaId: number;
  /** Valores iniciales opcionales del correo existente */
  initialValues?: Partial<CorreccionForm>;
  onSuccess?: () => void;
}

const EDIT_INPUT_CLS =
  "w-full text-sm border border-gray-300 rounded px-2.5 py-1.5 " +
  "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition";

export function CorreccionInline({
  ingestaId,
  initialValues = {},
  onSuccess,
}: CorreccionInlineProps) {
  const { mutate: corregir, isPending } = useCorregirIngesta();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CorreccionForm>({
    resolver: zodResolver(correccionSchema),
    defaultValues: {
      nombre_servicio: initialValues.nombre_servicio ?? "",
      numero_oficio: initialValues.numero_oficio ?? "",
      tipo: initialValues.tipo ?? "",
      siaf: initialValues.siaf ?? "",
      proveedor: initialValues.proveedor ?? "",
      fecha_documento: initialValues.fecha_documento ?? "",
      fecha_recepcion: initialValues.fecha_recepcion ?? "",
    },
  });

  function onSubmit(data: CorreccionForm) {
    corregir(
      {
        id: ingestaId,
        payload: {
          nombre_servicio: data.nombre_servicio,
          numero_oficio: data.numero_oficio || null,
          tipo: (data.tipo as "BIEN" | "SERVICIO") || null,
          siaf: data.siaf || null,
          proveedor: data.proveedor || null,
          fecha_documento: data.fecha_documento || null,
          fecha_recepcion: data.fecha_recepcion || null,
        },
      },
      {
        onSuccess: () => {
          onSuccess?.();
        },
      }
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3"
      aria-label="Formulario de corrección inline"
      noValidate
    >
      {/* Nombre del servicio */}
      <div>
        <label
          htmlFor={`nombre-servicio-${ingestaId}`}
          className="block text-xs font-semibold text-gray-700 mb-1"
        >
          Nombre del servicio
        </label>
        <input
          id={`nombre-servicio-${ingestaId}`}
          type="text"
          {...register("nombre_servicio")}
          className={EDIT_INPUT_CLS}
          placeholder="Nombre del servicio extraído"
          aria-describedby={
            errors.nombre_servicio
              ? `error-nombre-servicio-${ingestaId}`
              : undefined
          }
        />
        {errors.nombre_servicio && (
          <p
            id={`error-nombre-servicio-${ingestaId}`}
            className="text-xs text-red-600 mt-0.5"
            role="alert"
          >
            {errors.nombre_servicio.message}
          </p>
        )}
      </div>

      {/* Número de oficio */}
      <div>
        <label
          htmlFor={`numero-oficio-${ingestaId}`}
          className="block text-xs font-semibold text-gray-700 mb-1"
        >
          Número de oficio
        </label>
        <input
          id={`numero-oficio-${ingestaId}`}
          type="text"
          {...register("numero_oficio")}
          className={EDIT_INPUT_CLS}
          placeholder="Ej: 267-2026-INEI/OTIN"
        />
      </div>

      {/* Tipo */}
      <div>
        <label
          htmlFor={`tipo-${ingestaId}`}
          className="block text-xs font-semibold text-gray-700 mb-1"
        >
          Tipo
        </label>
        <select
          id={`tipo-${ingestaId}`}
          {...register("tipo")}
          className={EDIT_INPUT_CLS}
          aria-label="Tipo"
        >
          <option value="">—</option>
          <option value="BIEN">BIEN</option>
          <option value="SERVICIO">SERVICIO</option>
        </select>
      </div>

      {/* SIAF */}
      <div>
        <label
          htmlFor={`siaf-${ingestaId}`}
          className="block text-xs font-semibold text-gray-700 mb-1"
        >
          SIAF
        </label>
        <input
          id={`siaf-${ingestaId}`}
          type="text"
          {...register("siaf")}
          className={EDIT_INPUT_CLS}
          placeholder="Número SIAF"
        />
      </div>

      {/* Proveedor */}
      <div>
        <label
          htmlFor={`proveedor-${ingestaId}`}
          className="block text-xs font-semibold text-gray-700 mb-1"
        >
          Proveedor
        </label>
        <input
          id={`proveedor-${ingestaId}`}
          type="text"
          {...register("proveedor")}
          className={EDIT_INPUT_CLS}
          placeholder="Nombre del proveedor"
        />
      </div>

      {/* Botón */}
      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-container transition-colors disabled:opacity-50"
          aria-label="Guardar corrección"
        >
          {isPending ? "Guardando..." : "Guardar corrección"}
        </button>
      </div>
    </form>
  );
}
