"use client";

/**
 * AdjuntosEtapa — file attachment panel for a key etapa row (C3c).
 *
 * Props:
 *   etapaId  — the etapa_registro.id (NOT the cod). Must be > 0 (row exists).
 *   canEdit  — true for EDITOR/ADMIN roles; false for VIEWER.
 *
 * Renders:
 *   - File input (accept: pdf/images/office) visible only when canEdit.
 *   - Client-side validation: ≤ 10 MB before upload (UX guard; backend re-validates).
 *   - List of existing attachments with: nombre, size, download button (always),
 *     delete button (canEdit only).
 *   - Error surface: extracts backend 422/409/400 detail string.
 *   - When etapaId === 0: shows hint "Registrá el avance primero para adjuntar".
 *
 * Design: D17, D15, D16.
 * DOWNLOAD STRATEGY: axios blob + URL.createObjectURL + programmatic <a download>.
 *   Do NOT use a bare <a href> — it won't carry the Authorization header.
 */

import React, { useRef, useState } from "react";
import {
  useArchivos,
  useSubirArchivo,
  useDescargarArchivo,
  useEliminarArchivo,
  extractApiDetail,
} from "@/hooks/useArchivos";
import type { ArchivoMeta } from "@/types/etapa";

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB — mirrors backend MAX_UPLOAD_BYTES

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
];

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

function validateClientSide(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) {
    return `El archivo supera el límite de 10 MB (${formatBytes(file.size)}).`;
  }
  const ext = getFileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Tipo de archivo no permitido. Permitidos: ${ALLOWED_EXTENSIONS.join(", ")}.`;
  }
  return null;
}

// ----------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------

interface ArchivoRowProps {
  archivo: ArchivoMeta;
  canEdit: boolean;
  onDownload: (id: number, nombre: string) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

function ArchivoRow({
  archivo,
  canEdit,
  onDownload,
  onDelete,
  isDeleting,
}: ArchivoRowProps) {
  return (
    <li
      className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 last:border-0"
      data-testid={`archivo-row-${archivo.id}`}
    >
      <div className="flex-1 min-w-0">
        <span
          className="text-sm text-gray-800 truncate block"
          title={archivo.nombre_original}
        >
          {archivo.nombre_original}
        </span>
        <span className="text-xs text-gray-400">
          {formatBytes(archivo.tamano_bytes)} &middot; {archivo.subido_por}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onDownload(archivo.id, archivo.nombre_original)}
          className="text-xs px-2 py-0.5 rounded border border-blue-300 text-blue-700 hover:bg-blue-50"
          aria-label={`Descargar ${archivo.nombre_original}`}
          data-testid={`btn-descargar-${archivo.id}`}
        >
          Descargar
        </button>

        {canEdit && (
          <button
            type="button"
            onClick={() => onDelete(archivo.id)}
            disabled={isDeleting}
            className="text-xs px-2 py-0.5 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
            aria-label={`Eliminar ${archivo.nombre_original}`}
            data-testid={`btn-eliminar-${archivo.id}`}
          >
            {isDeleting ? "..." : "Eliminar"}
          </button>
        )}
      </div>
    </li>
  );
}

// ----------------------------------------------------------------
// Main component
// ----------------------------------------------------------------

interface AdjuntosEtapaProps {
  etapaId: number;
  canEdit: boolean;
}

export function AdjuntosEtapa({ etapaId, canEdit }: AdjuntosEtapaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: archivos = [], isLoading, isError: isListError } = useArchivos(etapaId);
  const subirMutation = useSubirArchivo(etapaId);
  const descargar = useDescargarArchivo();
  const eliminarMutation = useEliminarArchivo(etapaId);

  // ── Guard: etapa not yet registered ──────────────────────────
  if (etapaId <= 0) {
    return (
      <div
        className="text-xs text-gray-400 italic py-2"
        data-testid="adjuntos-hint-sin-registro"
      >
        Registrá el avance primero para adjuntar archivos.
      </div>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setClientError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateClientSide(file);
    if (validationError) {
      setClientError(validationError);
      // Reset input so the same file can be re-selected after fixing
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    subirMutation.mutate(file, {
      onSuccess: () => {
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      onError: () => {
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    });
  }

  async function handleDownload(archivoId: number, nombre: string) {
    try {
      await descargar(archivoId, nombre);
    } catch {
      // Download errors are non-critical; silently ignore or add toast
    }
  }

  function handleDelete(archivoId: number) {
    setDeletingId(archivoId);
    eliminarMutation.mutate(archivoId, {
      onSettled: () => setDeletingId(null),
    });
  }

  // ── Error messages ────────────────────────────────────────────
  const uploadErrorMsg = subirMutation.isError
    ? (extractApiDetail(subirMutation.error) ?? "Error al subir el archivo.")
    : null;

  const deleteErrorMsg = eliminarMutation.isError
    ? (extractApiDetail(eliminarMutation.error) ?? "Error al eliminar el archivo.")
    : null;

  const displayError = clientError ?? uploadErrorMsg ?? deleteErrorMsg;

  // ── Render ────────────────────────────────────────────────────
  return (
    <section
      className="mt-4 border-t border-gray-200 pt-3"
      aria-label="Archivos adjuntos"
      data-testid="adjuntos-etapa"
    >
      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
        Archivos adjuntos
      </h3>

      {/* Upload input — visible only for EDITOR/ADMIN */}
      {canEdit && (
        <div className="mb-3">
          <label
            htmlFor={`file-input-${etapaId}`}
            className="block text-xs text-gray-600 mb-1"
          >
            Adjuntar archivo (PDF, imagen, Word, Excel — máx. 10 MB)
          </label>
          <input
            id={`file-input-${etapaId}`}
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
            onChange={handleFileChange}
            disabled={subirMutation.isPending}
            className="block text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-gray-300 file:text-xs file:text-gray-700 file:bg-gray-50 hover:file:bg-gray-100 disabled:opacity-50"
            data-testid="file-input"
            aria-label="Adjuntar archivo"
          />
          {subirMutation.isPending && (
            <p className="text-xs text-blue-600 mt-1">Subiendo archivo...</p>
          )}
        </div>
      )}

      {/* Error feedback */}
      {displayError && (
        <div
          className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-2"
          role="alert"
          data-testid="adjuntos-error"
        >
          {displayError}
        </div>
      )}

      {/* Attachments list */}
      {isLoading && (
        <p className="text-xs text-gray-400">Cargando archivos...</p>
      )}

      {isListError && (
        <p className="text-xs text-red-500">Error al cargar archivos.</p>
      )}

      {!isLoading && !isListError && (
        <>
          {archivos.length === 0 ? (
            <p className="text-xs text-gray-400 italic" data-testid="adjuntos-vacio">
              Sin archivos adjuntos.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100" data-testid="adjuntos-lista">
              {archivos.map((archivo: ArchivoMeta) => (
                <ArchivoRow
                  key={archivo.id}
                  archivo={archivo}
                  canEdit={canEdit}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  isDeleting={deletingId === archivo.id && eliminarMutation.isPending}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
