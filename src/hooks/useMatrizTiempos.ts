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
    placeholderData: (previous) => previous,
    staleTime: 5 * 60 * 1000,
  });
}
