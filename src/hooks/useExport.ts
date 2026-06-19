/**
 * useExport hooks — C5 export (Excel / PDF) download hooks.
 *
 * Mirrors the useDescargarArchivo pattern from C3c (Design D15):
 *   1. Calls api.get with responseType:'blob' — interceptor adds Bearer.
 *   2. Creates an objectURL from the blob.
 *   3. Triggers a programmatic <a download> click with the correct filename.
 *   4. Revokes the objectURL to free memory.
 *
 * Each hook returns { trigger, isLoading, error } so the UI can reflect
 * in-flight state and surface errors without crashing.
 *
 * Do NOT use a bare <a href> for downloads — no token would be sent.
 */

import { useState } from "react";
import { exportExcel, exportProcesoPdf } from "@/lib/api";

// ----------------------------------------------------------------
// Internal helper — shared blob → file download logic.
// ----------------------------------------------------------------
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ----------------------------------------------------------------
// useExportExcel
// Returns { trigger: (anno: number) => Promise<void>, isLoading, error }.
// ----------------------------------------------------------------
export function useExportExcel(): {
  trigger: (anno: number) => Promise<void>;
  isLoading: boolean;
  error: string | null;
} {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function trigger(anno: number): Promise<void> {
    setIsLoading(true);
    setError(null);
    try {
      const blob = await exportExcel(anno);
      triggerDownload(blob, `adquisiciones_tic_${anno}.xlsx`);
    } catch {
      setError("Error al exportar el Excel. Intentá de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  return { trigger, isLoading, error };
}

// ----------------------------------------------------------------
// useExportProcesoPdf
// Returns { trigger: (id: number, idProceso: string) => Promise<void>, isLoading, error }.
// idProceso is the human-readable identifier (e.g. "2026-001") used for the filename.
// ----------------------------------------------------------------
export function useExportProcesoPdf(): {
  trigger: (id: number, idProceso: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
} {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function trigger(id: number, idProceso: string): Promise<void> {
    setIsLoading(true);
    setError(null);
    try {
      const blob = await exportProcesoPdf(id);
      triggerDownload(blob, `proceso_${idProceso}.pdf`);
    } catch {
      setError("Error al exportar el PDF. Intentá de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  return { trigger, isLoading, error };
}
