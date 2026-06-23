/**
 * useIngesta hooks — G9 Frontend
 * Follows the same pattern as useProcesos / useEtapas (TanStack Query v5).
 *
 * Hooks:
 *  - useIngesta: query → GET /ingesta/pendientes
 *  - useCorregirIngesta: mutation → PATCH /ingesta/{id}
 *  - useAprobarIngesta: mutation → POST /ingesta/{id}/aprobar
 *  - useRechazarIngesta: mutation → POST /ingesta/{id}/rechazar
 *  - useDesvincularIngesta: mutation → POST /ingesta/{id}/desvincular
 *  - useDocumentosProceso: query → GET /procesos/{id}/documentos
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getIngestaPendientes,
  getIngestaAprobados,
  getIngestaAprobadosAuto,
  patchIngesta,
  aprobarIngesta,
  rechazarIngesta,
  restaurarIngesta,
  desvincularIngesta,
  getDocumentosProceso,
  getCorreosIngestaEtapa,
  descargarDocumentoIngesta,
  listarCarpetasExchange,
  probarExchange,
  sincronizarExchange,
} from "@/lib/api";
import type {
  CorreoIngesta,
  IngestaPendientesResponse,
  CorreoCorreccionPayload,
  AprobarPayload,
  RechazarPayload,
  DocumentoIngesta,
  ExchangeCredencialesPayload,
  ExchangeFoldersResponse,
  ExchangeSyncPayload,
  ExchangeTestResponse,
  ExchangeSyncResponse,
} from "@/types/ingesta";

// ----------------------------------------------------------------
// Query key factory
// ----------------------------------------------------------------
export const ingestaKeys = {
  all: ["ingesta"] as const,
  pendientes: () => ["ingesta", "pendientes"] as const,
  aprobados: () => ["ingesta", "aprobados"] as const,
  aprobadosAuto: () => ["ingesta", "aprobados-auto"] as const,
  rechazados: () => ["ingesta", "rechazados"] as const,
  documentosProceso: (procesoId: number) =>
    ["ingesta", "documentos", procesoId] as const,
  correosEtapa: (procesoId: number, codigoEtapa: string) =>
    ["ingesta", "correos-etapa", procesoId, codigoEtapa] as const,
};

// ----------------------------------------------------------------
// useIngesta — lista correos pendientes de revisión (PENDIENTE)
// ----------------------------------------------------------------
export function useIngesta() {
  return useQuery<IngestaPendientesResponse, Error>({
    queryKey: ingestaKeys.pendientes(),
    queryFn: getIngestaPendientes,
  });
}

// ----------------------------------------------------------------
// useIngestaAprobadosAuto — lista correos auto-vinculados (APROBADO_AUTO)
// Usado en la sección "Auto-vinculados" de IngestaBandeja para que
// supervisores puedan auditar y desvincular si es necesario (WARNING-1 fix).
// ----------------------------------------------------------------
export function useIngestaAprobadosAuto() {
  return useQuery<IngestaPendientesResponse, Error>({
    queryKey: ingestaKeys.aprobadosAuto(),
    queryFn: getIngestaAprobadosAuto,
  });
}

// ----------------------------------------------------------------
// useIngestaAprobados — lista correos APROBADO
// ----------------------------------------------------------------
export function useIngestaAprobados() {
  return useQuery<IngestaPendientesResponse, Error>({
    queryKey: ingestaKeys.aprobados(),
    queryFn: getIngestaAprobados,
  });
}

// ----------------------------------------------------------------
// useIngestaRechazados — lista correos rechazados restaurables
// ----------------------------------------------------------------
export function useIngestaRechazados() {
  return useQuery<IngestaPendientesResponse, Error>({
    queryKey: ingestaKeys.rechazados(),
    queryFn: async () => {
      const { api } = await import("@/lib/api");
      const res = await api.get<IngestaPendientesResponse>(
        "/ingesta/pendientes",
        { params: { estado: "RECHAZADO" } }
      );
      return res.data;
    },
  });
}

// ----------------------------------------------------------------
// useCorregirIngesta — PATCH /ingesta/{id}
// Invalida la lista de pendientes en éxito.
// ----------------------------------------------------------------
export function useCorregirIngesta() {
  const qc = useQueryClient();
  return useMutation<
    CorreoIngesta,
    Error,
    { id: number; payload: CorreoCorreccionPayload }
  >({
    mutationFn: ({ id, payload }) => patchIngesta(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ingestaKeys.all });
    },
  });
}

// ----------------------------------------------------------------
// useAprobarIngesta — POST /ingesta/{id}/aprobar
// ----------------------------------------------------------------
export function useAprobarIngesta() {
  const qc = useQueryClient();
  return useMutation<
    CorreoIngesta,
    Error,
    { id: number } & AprobarPayload
  >({
    mutationFn: ({ id, ...payload }) => aprobarIngesta(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ingestaKeys.all });
    },
  });
}

// ----------------------------------------------------------------
// useRechazarIngesta — POST /ingesta/{id}/rechazar
// ----------------------------------------------------------------
export function useRechazarIngesta() {
  const qc = useQueryClient();
  return useMutation<
    CorreoIngesta,
    Error,
    { id: number } & RechazarPayload
  >({
    mutationFn: ({ id, motivo }) => rechazarIngesta(id, { motivo }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ingestaKeys.all });
    },
  });
}

// ----------------------------------------------------------------
// useRestaurarIngesta — POST /ingesta/{id}/restaurar
// ----------------------------------------------------------------
export function useRestaurarIngesta() {
  const qc = useQueryClient();
  return useMutation<CorreoIngesta, Error, number>({
    mutationFn: (id) => restaurarIngesta(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ingestaKeys.all });
    },
  });
}

// ----------------------------------------------------------------
// useDesvincularIngesta — POST /ingesta/{id}/desvincular
// Invalida tanto la lista de pendientes como la de auto-vinculados.
// ----------------------------------------------------------------
export function useDesvincularIngesta() {
  const qc = useQueryClient();
  return useMutation<CorreoIngesta, Error, number>({
    mutationFn: (id) => desvincularIngesta(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ingestaKeys.all });
    },
  });
}

// ----------------------------------------------------------------
// useDocumentosProceso — GET /procesos/{id}/documentos
// Usado en la pestaña "Documentos" de /procesos/[id].
// ----------------------------------------------------------------
export function useDocumentosProceso(procesoId: number) {
  return useQuery<DocumentoIngesta[], Error>({
    queryKey: ingestaKeys.documentosProceso(procesoId),
    queryFn: () => getDocumentosProceso(procesoId),
    enabled: procesoId > 0,
  });
}

// ----------------------------------------------------------------
// useCorreosIngestaEtapa — correos aprobados vinculados a una etapa
// ----------------------------------------------------------------
export function useCorreosIngestaEtapa(procesoId: number, codigoEtapa: string) {
  return useQuery<IngestaPendientesResponse, Error>({
    queryKey: ingestaKeys.correosEtapa(procesoId, codigoEtapa),
    queryFn: () => getCorreosIngestaEtapa(procesoId, codigoEtapa),
    enabled: procesoId > 0 && codigoEtapa.length > 0,
  });
}

// ----------------------------------------------------------------
// useDescargarDocumentoIngesta — descarga blob con Bearer token
// ----------------------------------------------------------------
export function useDescargarDocumentoIngesta() {
  return useMutation<Blob, Error, number>({
    mutationFn: (docId) => descargarDocumentoIngesta(docId),
  });
}

// ----------------------------------------------------------------
// useProbarExchange — POST /ingesta/exchange/probar
// ----------------------------------------------------------------
export function useProbarExchange() {
  return useMutation<ExchangeTestResponse, Error, ExchangeCredencialesPayload>({
    mutationFn: probarExchange,
  });
}

// ----------------------------------------------------------------
// useListarCarpetasExchange — POST /ingesta/exchange/carpetas
// ----------------------------------------------------------------
export function useListarCarpetasExchange() {
  return useMutation<ExchangeFoldersResponse, Error, ExchangeCredencialesPayload>({
    mutationFn: listarCarpetasExchange,
  });
}

// ----------------------------------------------------------------
// useSincronizarExchange — POST /ingesta/exchange/sync
// ----------------------------------------------------------------
export function useSincronizarExchange() {
  const qc = useQueryClient();
  return useMutation<ExchangeSyncResponse, Error, ExchangeSyncPayload>({
    mutationFn: sincronizarExchange,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ingestaKeys.all });
    },
  });
}
