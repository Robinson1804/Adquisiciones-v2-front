/**
 * useArchivos hooks — C3c file attachment hooks (React Query v5).
 *
 * Follows the same pattern as useEtapas: React Query v5 (TanStack), axios Bearer
 * via the existing api instance, and extractApiDetail for error surfacing.
 *
 * DOWNLOAD STRATEGY (Design D15):
 *   useDescargarArchivo returns a function (not a mutation) that:
 *   1. Calls api.get with responseType:'blob' — the request interceptor adds Bearer.
 *   2. Creates an objectURL from the blob.
 *   3. Triggers a programmatic <a download> click with nombre_original.
 *   4. Revokes the objectURL to free memory.
 *   Rationale: bare <a href> does NOT carry the Authorization header.
 *   Do NOT use a bare anchor for downloads.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getArchivos,
  subirArchivo,
  descargarArchivo,
  eliminarArchivo,
} from "@/lib/api";
import { extractApiDetail } from "@/hooks/useEtapas";
import type { ArchivoMeta } from "@/types/etapa";

// ----------------------------------------------------------------
// Query key factory
// ----------------------------------------------------------------
export const archivoKeys = {
  list: (etapaId: number) => ["archivos", etapaId] as const,
};

// ----------------------------------------------------------------
// useArchivos — fetches attachment list for a given etapa row.
// enabled: false when etapaId is 0 (etapa not yet registered).
// ----------------------------------------------------------------
export function useArchivos(etapaId: number) {
  return useQuery<ArchivoMeta[], Error>({
    queryKey: archivoKeys.list(etapaId),
    queryFn: () => getArchivos(etapaId),
    enabled: etapaId > 0,
  });
}

// ----------------------------------------------------------------
// useSubirArchivo — POST /etapas/{id}/archivos (multipart).
// On success: invalidates the archivos list for this etapa.
// On error: caller accesses mutation.error; use extractApiDetail.
// ----------------------------------------------------------------
export function useSubirArchivo(etapaId: number) {
  const qc = useQueryClient();
  return useMutation<ArchivoMeta, Error, File>({
    mutationFn: (file: File) => subirArchivo(etapaId, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: archivoKeys.list(etapaId) });
    },
  });
}

// ----------------------------------------------------------------
// useDescargarArchivo — returns a download trigger function.
// Not a mutation; called imperatively per archivo item.
// Uses fetch+blob+objectURL pattern (Design D15).
// ----------------------------------------------------------------
export function useDescargarArchivo() {
  return async function download(
    archivoId: number,
    nombreOriginal: string
  ): Promise<void> {
    const blob = await descargarArchivo(archivoId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreOriginal;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
}

// ----------------------------------------------------------------
// useEliminarArchivo — DELETE /archivos/{id}.
// On success: invalidates the archivos list for this etapa.
// ----------------------------------------------------------------
export function useEliminarArchivo(etapaId: number) {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (archivoId: number) => eliminarArchivo(archivoId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: archivoKeys.list(etapaId) });
    },
  });
}

// Re-export for callers that need error detail surfacing.
export { extractApiDetail };
