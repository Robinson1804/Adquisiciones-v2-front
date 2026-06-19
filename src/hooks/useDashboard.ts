/**
 * C4 — React Query hooks for dashboard endpoints.
 * staleTime: 60_000ms — fresh for 1 min; re-fetches when anno changes (GF-4).
 * enabled: !!anno — hooks do NOT fire when anno is falsy.
 */

import { useQuery } from "@tanstack/react-query";
import {
  getMetricas,
  getFlujoProcesos,
  getTiemposEtapa,
  getPresupuesto,
  getDemoraAreas,
} from "@/lib/api";
import type {
  Metricas,
  FlujoProcesosResponse,
  TiemposEtapaResponse,
  PresupuestoResponse,
  DemoraAreasResponse,
} from "@/types/dashboard";

const STALE = 60_000;

export function useMetricas(anno: number | null) {
  return useQuery<Metricas>({
    queryKey: ["dashboard", "metricas", anno],
    queryFn: () => getMetricas(anno!),
    enabled: !!anno,
    staleTime: STALE,
  });
}

export function useFlujoProcesos(anno: number | null) {
  return useQuery<FlujoProcesosResponse>({
    queryKey: ["dashboard", "flujo-procesos", anno],
    queryFn: () => getFlujoProcesos(anno!),
    enabled: !!anno,
    staleTime: STALE,
  });
}

export function useTiemposEtapa(anno: number | null) {
  return useQuery<TiemposEtapaResponse>({
    queryKey: ["dashboard", "tiempos-etapa", anno],
    queryFn: () => getTiemposEtapa(anno!),
    enabled: !!anno,
    staleTime: STALE,
  });
}

export function usePresupuesto(anno: number | null) {
  return useQuery<PresupuestoResponse>({
    queryKey: ["dashboard", "presupuesto", anno],
    queryFn: () => getPresupuesto(anno!),
    enabled: !!anno,
    staleTime: STALE,
  });
}

export function useDemoraAreas(anno: number | null) {
  return useQuery<DemoraAreasResponse>({
    queryKey: ["dashboard", "demora-areas", anno],
    queryFn: () => getDemoraAreas(anno!),
    enabled: !!anno,
    staleTime: STALE,
  });
}
