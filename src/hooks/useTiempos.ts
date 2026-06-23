import { useQuery } from "@tanstack/react-query";
import { getTiempos } from "@/lib/api";
import type { TiemposProceso } from "@/types/etapa";

export function useTiempos(procesoId: number | null) {
  return useQuery<TiemposProceso, Error>({
    queryKey: ["tiempos", procesoId],
    queryFn: () => getTiempos(procesoId!),
    enabled: procesoId != null && procesoId > 0,
    staleTime: 5 * 60 * 1000,
  });
}
