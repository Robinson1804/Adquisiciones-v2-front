/**
 * matriz-tiempos — useMatrizTiempos hook.
 * Fetches GET /tiempos/matriz and exposes the heatmap matrix.
 *
 * Pattern mirrors useProcesos: placeholderData keeps the previous result
 * visible while refetching on filter change; staleTime=5min avoids
 * hammering the endpoint on every minor interaction.
 */

import { useQuery } from "@tanstack/react-query";
import { getMatrizTiempos } from "@/lib/api";
import type { MatrizTiempos } from "@/types/etapa";

export function useMatrizTiempos(filtros: {
  anno?: number;
  estado?: string;
  tipo?: string;
  q?: string;
}) {
  return useQuery<MatrizTiempos, Error>({
    queryKey: ["matriz-tiempos", filtros],
    queryFn: () => getMatrizTiempos(filtros),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });
}
