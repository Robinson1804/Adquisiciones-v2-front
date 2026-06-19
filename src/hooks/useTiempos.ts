/**
 * control-tiempos — useTiempos hook.
 * Fetches GET /procesos/{id}/tiempos and exposes the interval chain,
 * total days, per-area breakdown, and bottleneck stage.
 *
 * Pattern mirrors useMontosProceso: staleTime=5min, enabled guard.
 */

import { useQuery } from "@tanstack/react-query";
import { getTiempos } from "@/lib/api";
import type { TiemposProceso } from "@/types/etapa";

export function useTiempos(procesoId: number | null) {
  return useQuery<TiemposProceso, Error>({
    queryKey: ["tiempos", procesoId],
    queryFn: () => getTiempos(procesoId!),
    enabled: procesoId != null && procesoId > 0,
    // Interval data only changes when etapas are updated — 5min stale is fine.
    staleTime: 5 * 60 * 1000,
  });
}
