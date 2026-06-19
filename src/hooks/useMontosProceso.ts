/**
 * C3b WU-F4 — useMontosProceso hook.
 * Fetches montos_proceso data (Valor EM, OCS, plazo, fecha_inicio_srv).
 * Returns null when no trigger stages have completed yet.
 */

import { useQuery } from "@tanstack/react-query";
import { getMontosProceso } from "@/lib/api";
import type { MontosProceso } from "@/types/etapa";

export function useMontosProceso(procesoId: number | null) {
  return useQuery<MontosProceso | null, Error>({
    queryKey: ["montos", procesoId],
    queryFn: () => getMontosProceso(procesoId!),
    enabled: procesoId != null && procesoId > 0,
    // montos change only when trigger stages complete — 5min stale is fine
    staleTime: 5 * 60 * 1000,
  });
}
