"use client";

/**
 * IngestaBandeja — container que lista correos de ingesta en dos secciones:
 *  1. Pendientes: correos PENDIENTE de revisión humana.
 *  2. Auto-vinculados: correos APROBADO_AUTO para auditoría/desvinculación.
 *
 * WARNING-1 FIX: expone los APROBADO_AUTO para que supervisores puedan
 * ejercer el Desvincular y la reversibilidad prometida en ADR-5.
 */

import React from "react";
import { useIngesta, useIngestaAprobadosAuto } from "@/hooks/useIngesta";
import { CorreoCard } from "./CorreoCard";

// ----------------------------------------------------------------
// Sección reutilizable
// ----------------------------------------------------------------

interface SeccionProps {
  titulo: string;
  descripcion?: string;
  items: React.ReactNode[];
  "data-testid"?: string;
}

function Seccion({ titulo, descripcion, items, "data-testid": testId }: SeccionProps) {
  return (
    <section data-testid={testId} className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {titulo}
        </h2>
        <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 font-mono">
          {items.length}
        </span>
      </div>
      {descripcion && (
        <p className="text-xs text-gray-400">{descripcion}</p>
      )}
      <div className="space-y-3">
        {items}
      </div>
    </section>
  );
}

// ----------------------------------------------------------------
// IngestaBandeja
// ----------------------------------------------------------------

export function IngestaBandeja() {
  const { data: dataPendientes, isLoading: loadingPendientes, isError: errorPendientes } = useIngesta();
  const { data: dataAutoVinculados, isLoading: loadingAuto, isError: errorAuto } = useIngestaAprobadosAuto();

  const isLoading = loadingPendientes || loadingAuto;
  const isError = errorPendientes || errorAuto;

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-16 text-gray-500 text-sm"
        role="status"
        aria-live="polite"
      >
        Cargando bandeja de ingesta...
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="bg-red-50 border border-red-200 rounded-lg p-6 text-center"
        role="alert"
      >
        <p className="text-sm text-red-700 font-medium">
          Error al cargar los correos. Recargá la página.
        </p>
      </div>
    );
  }

  const pendientes = dataPendientes?.items ?? [];
  const autoVinculados = dataAutoVinculados?.items ?? [];
  const totalGeneral = pendientes.length + autoVinculados.length;

  if (totalGeneral === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
        <p className="text-gray-500 text-sm">
          No hay correos pendientes de revisión.
        </p>
        <p className="text-gray-400 text-xs mt-1">
          Los correos procesados por el orquestador aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" aria-label="Bandeja de ingesta de correos">
      {/* Sección 1: Pendientes de revisión manual */}
      {pendientes.length > 0 && (
        <Seccion
          titulo="Pendientes de revisión"
          descripcion="Correos que requieren aprobación o rechazo manual."
          data-testid="seccion-pendientes"
          items={pendientes.map((correo) => (
            <CorreoCard key={correo.id} correo={correo} />
          ))}
        />
      )}

      {/* Sección vacía de pendientes cuando hay auto-vinculados pero no pendientes */}
      {pendientes.length === 0 && autoVinculados.length > 0 && (
        <div
          data-testid="seccion-pendientes"
          className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-6 text-center"
        >
          <p className="text-gray-400 text-xs">
            Sin correos pendientes de revisión manual.
          </p>
        </div>
      )}

      {/* Sección 2: Auto-vinculados (APROBADO_AUTO) */}
      {autoVinculados.length > 0 && (
        <Seccion
          titulo="Auto-vinculados"
          descripcion="Correos vinculados automáticamente. Podés desvincularlos si el match fue incorrecto."
          data-testid="seccion-aprobados-auto"
          items={autoVinculados.map((correo) => (
            <CorreoCard key={correo.id} correo={correo} />
          ))}
        />
      )}
    </div>
  );
}
