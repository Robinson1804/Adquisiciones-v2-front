/**
 * useEtapas hooks — C3a mechanics + C3b business rules.
 * Follows the same pattern as useProcesos (React Query v5, TanStack).
 *
 * C3b additions (WU-F3/WU-F5):
 * - useReiniciarTdr: POST /procesos/{id}/reiniciar-tdr
 * - onError handlers on all write mutations (surface 409 detail to caller)
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getEtapas,
  registrarEtapa,
  actualizarEtapa,
  agregarRonda,
  reiniciarTdr,
} from "@/lib/api";
import type {
  EtapasResponse,
  EtapaOut,
  EtapaCreatePayload,
  BuclePayload,
} from "@/types/etapa";

/**
 * Extracts the FastAPI `detail` string from an axios error response.
 * Returns undefined if not available so callers can fallback gracefully.
 */
function extractApiDetail(err: unknown): string | undefined {
  if (
    err != null &&
    typeof err === 'object' &&
    'response' in err &&
    err.response != null &&
    typeof err.response === 'object' &&
    'data' in err.response &&
    err.response.data != null &&
    typeof err.response.data === 'object' &&
    'detail' in err.response.data &&
    typeof (err.response.data as Record<string, unknown>).detail === 'string'
  ) {
    return (err.response.data as Record<string, string>).detail;
  }
  return undefined;
}

// ----------------------------------------------------------------
// Query key factory
// ----------------------------------------------------------------
export const etapaKeys = {
  all: (procesoId: number) => ["etapas", procesoId] as const,
};

// ----------------------------------------------------------------
// useEtapas — fetches grouped etapas + progreso for a proceso.
// ----------------------------------------------------------------
export function useEtapas(procesoId: number) {
  return useQuery<EtapasResponse, Error>({
    queryKey: etapaKeys.all(procesoId),
    queryFn: () => getEtapas(procesoId),
    enabled: procesoId > 0,
  });
}

// ----------------------------------------------------------------
// useRegistrarEtapa — POST /procesos/{id}/etapas
// Invalidates etapas cache on success.
// C3b: exposes typed error so callers can show the backend 409/422 detail.
// ----------------------------------------------------------------
export function useRegistrarEtapa(procesoId: number) {
  const qc = useQueryClient();
  return useMutation<EtapaOut, Error, EtapaCreatePayload>({
    mutationFn: (payload) => registrarEtapa(procesoId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: etapaKeys.all(procesoId) });
    },
    // onError is intentionally omitted here — callers receive the error via
    // mutation.error and can use extractApiDetail() or display it inline.
    // WU-F5: ModalRegistroEtapa already renders isError/error inline.
  });
}

// ----------------------------------------------------------------
// useActualizarEtapa — PUT /etapas/{id}
// Invalidates etapas + proceso caches on success.
// ----------------------------------------------------------------
export function useActualizarEtapa(procesoId: number) {
  const qc = useQueryClient();
  return useMutation<
    EtapaOut,
    Error,
    { etapaId: number; payload: Partial<EtapaCreatePayload> }
  >({
    mutationFn: ({ etapaId, payload }) => actualizarEtapa(etapaId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: etapaKeys.all(procesoId) });
      void qc.invalidateQueries({ queryKey: ["proceso", procesoId] });
    },
  });
}

// ----------------------------------------------------------------
// useAgregarRonda — POST /procesos/{id}/etapas/{cod}/bucle
// Invalidates etapas cache on success.
// ----------------------------------------------------------------
export function useAgregarRonda(procesoId: number) {
  const qc = useQueryClient();
  return useMutation<
    EtapaOut,
    Error,
    { cod: string; payload: BuclePayload }
  >({
    mutationFn: ({ cod, payload }) => agregarRonda(procesoId, cod, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: etapaKeys.all(procesoId) });
    },
  });
}

// ----------------------------------------------------------------
// useReiniciarTdr — POST /procesos/{id}/reiniciar-tdr (C3b WU-F3)
// ADMIN/EDITOR only (backend enforces 403 for VIEWER).
// On success: invalidates etapas + proceso caches so timeline + ficha refresh.
// Error: caller receives err.response.data.detail via extractApiDetail().
// ----------------------------------------------------------------
export function useReiniciarTdr(procesoId: number) {
  const qc = useQueryClient();
  return useMutation<EtapaOut, Error, void>({
    mutationFn: () => reiniciarTdr(procesoId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: etapaKeys.all(procesoId) });
      void qc.invalidateQueries({ queryKey: ['proceso', procesoId] });
    },
  });
}

// ----------------------------------------------------------------
// Utility exported for callers that need to surface 409/422 detail.
// ----------------------------------------------------------------
export { extractApiDetail };
