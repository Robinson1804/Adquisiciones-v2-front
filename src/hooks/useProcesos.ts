import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getProcesos,
  getProceso,
  createProceso,
  updateProceso,
  deleteProceso,
} from "@/lib/api";
import type {
  Proceso,
  ProcesoCreatePayload,
  ProcesoFiltros,
  ProcesoUpdatePayload,
} from "@/types";

// ----------------------------------------------------------------
// Query key factory — centralises cache key shapes.
// ----------------------------------------------------------------
export const procesoKeys = {
  all: ["procesos"] as const,
  list: (filtros: ProcesoFiltros) => ["procesos", filtros] as const,
  detail: (id: number) => ["proceso", id] as const,
};

// ----------------------------------------------------------------
// useProcesos — paginated list with keep-previous-data for smooth UX.
// ----------------------------------------------------------------
export function useProcesos(filtros: ProcesoFiltros = {}) {
  return useQuery({
    queryKey: procesoKeys.list(filtros),
    queryFn: () => getProcesos(filtros),
    placeholderData: (prev) => prev, // keepPreviousData equivalent in RQ v5
  });
}

// ----------------------------------------------------------------
// useProceso — single detail; disabled until id is truthy.
// ----------------------------------------------------------------
export function useProceso(id: number | null) {
  return useQuery({
    queryKey: procesoKeys.detail(id ?? 0),
    queryFn: () => getProceso(id!),
    enabled: id !== null && id > 0,
  });
}

// ----------------------------------------------------------------
// useCrearProceso — mutation: POST /procesos, invalidates list.
// ----------------------------------------------------------------
export function useCrearProceso() {
  const qc = useQueryClient();
  return useMutation<Proceso, Error, ProcesoCreatePayload>({
    mutationFn: createProceso,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: procesoKeys.all });
    },
  });
}

// ----------------------------------------------------------------
// useActualizarProceso — mutation: PUT /procesos/:id.
// ----------------------------------------------------------------
export function useActualizarProceso() {
  const qc = useQueryClient();
  return useMutation<
    Proceso,
    Error,
    { id: number; payload: ProcesoUpdatePayload }
  >({
    mutationFn: ({ id, payload }) => updateProceso(id, payload),
    onSuccess: (updated) => {
      void qc.invalidateQueries({ queryKey: procesoKeys.all });
      void qc.invalidateQueries({
        queryKey: procesoKeys.detail(updated.id),
      });
    },
  });
}

// ----------------------------------------------------------------
// useEliminarProceso — mutation: DELETE /procesos/:id (soft).
// ----------------------------------------------------------------
export function useEliminarProceso() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteProceso,
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: procesoKeys.all });
      void qc.invalidateQueries({ queryKey: procesoKeys.detail(id) });
    },
  });
}
