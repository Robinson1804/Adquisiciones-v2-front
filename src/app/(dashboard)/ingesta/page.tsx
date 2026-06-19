"use client";

/**
 * S-Ingesta — Bandeja de ingesta de correos (/ingesta)
 * Ruta protegida bajo el grupo (dashboard): solo usuarios autenticados.
 * Rol VIEWER puede ver (solo lectura); ADMIN/EDITOR pueden aprobar/rechazar/desvincular.
 */

import React from "react";
import { IngestaBandeja } from "@/components/ingesta/IngestaBandeja";

export default function IngestaPage() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-primary">
          Ingesta de correos
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Revisá y aprobá los correos procesados por el orquestador local.
          Los correos aprobados vinculan documentos al expediente del proceso.
        </p>
      </div>

      {/* Bandeja */}
      <IngestaBandeja />
    </div>
  );
}
