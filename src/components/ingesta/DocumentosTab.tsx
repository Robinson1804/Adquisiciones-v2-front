"use client";

/**
 * DocumentosTab — pestaña "Documentos" en la ficha /procesos/[id].
 *
 * Lista los documentos vinculados al proceso con:
 * - Nombre original
 * - Tipo clasificado (TDR, CONFORMIDAD, etc.)
 * - Fecha (creado_en del ingesta_documento)
 * - Link de descarga via /ingesta/documentos/{doc_id}
 *
 * Resuelve OQ#4: no requiere tabs nativa en la ficha actual — se renderiza
 * como sección adicional al final de la ficha o por switching de estado local.
 */

import React from "react";
import {
  useDescargarDocumentoIngesta,
  useDocumentosProceso,
} from "@/hooks/useIngesta";
import type { DocumentoIngesta } from "@/types/ingesta";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ----------------------------------------------------------------
// DocumentoRow
// ----------------------------------------------------------------

function DocumentoRow({ doc }: { doc: DocumentoIngesta }) {
  const descargar = useDescargarDocumentoIngesta();

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
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="py-2 px-3 text-xs">
        <span className="inline-block bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono text-[11px]">
          {doc.tipo_clasificado ?? "OTRO"}
        </span>
      </td>
      <td
        className="py-2 px-3 text-xs text-gray-800 max-w-xs truncate"
        title={doc.nombre_original}
      >
        {doc.nombre_original}
      </td>
      <td className="py-2 px-3 text-xs text-gray-500 whitespace-nowrap">
        {formatFecha(doc.creado_en)}
      </td>
      <td className="py-2 px-3 text-xs text-gray-500 whitespace-nowrap">
        {formatBytes(doc.tamano_bytes)}
      </td>
      <td className="py-2 px-3 text-xs">
        <button
          type="button"
          onClick={handleDownload}
          disabled={descargar.isPending}
          className="text-primary font-medium hover:underline disabled:opacity-50"
          aria-label={`Descargar ${doc.nombre_original}`}
        >
          {descargar.isPending ? "Descargando..." : "Descargar"}
        </button>
      </td>
    </tr>
  );
}

// ----------------------------------------------------------------
// DocumentosTab
// ----------------------------------------------------------------

interface DocumentosTabProps {
  procesoId: number;
}

export function DocumentosTab({ procesoId }: DocumentosTabProps) {
  const { data: documentos, isLoading, isError } = useDocumentosProceso(procesoId);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-8 text-gray-500 text-sm"
        role="status"
        aria-live="polite"
      >
        Cargando documentos...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4 text-center" role="alert">
        <p className="text-sm text-red-700">
          Error al cargar los documentos.
        </p>
      </div>
    );
  }

  if (!documentos || documentos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm">
          Sin documentos vinculados a este proceso.
        </p>
        <p className="text-gray-400 text-xs mt-1">
          Los documentos aparecen una vez que se aprueba un correo de ingesta.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3 font-medium">
        {documentos.length} documento{documentos.length !== 1 ? "s" : ""} vinculado{documentos.length !== 1 ? "s" : ""}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
              <th className="py-2 px-3">Tipo</th>
              <th className="py-2 px-3">Nombre</th>
              <th className="py-2 px-3">Fecha</th>
              <th className="py-2 px-3">Tamaño</th>
              <th className="py-2 px-3">Descarga</th>
            </tr>
          </thead>
          <tbody>
            {documentos.map((doc) => (
              <DocumentoRow key={doc.id} doc={doc} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
