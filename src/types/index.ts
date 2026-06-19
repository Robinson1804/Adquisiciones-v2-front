import type { COLORES_ACTOR, COLORES_ESTADO } from "@/lib/constants";

export interface HealthResponse {
  status: string;
  database: string;
}

export type ActorKey = keyof typeof COLORES_ACTOR;
export type EstadoKey = keyof typeof COLORES_ESTADO;

// Mirror of backend schemas/auth.py UserOut — keep in sync with API contract.
export interface UserOut {
  id: number;
  username: string;
  nombre_completo: string;
  rol: "ADMIN" | "EDITOR" | "VIEWER";
  area: string | null;
}

// ============================================================
// C2 — Proceso types (mirror backend/app/schemas/proceso.py)
// ============================================================

export type EstadoProceso = "EN PROCESO" | "CULMINADO" | "CANCELADO";
export type TipoProceso = "BIEN" | "SERVICIO";

export interface Proceso {
  id: number;
  id_proceso: string;
  requerimiento: string;
  tipo: TipoProceso | null;
  unidad_resp: string | null;
  areas_usuarias: string[] | null;
  /** Decimal serialized as string by backend — use parseFloat() for display/math. */
  pim: string | null;
  estado: EstadoProceso;
  motivo_cancel: string | null;
  fecha_creacion: string;
  creado_por: string | null;
  anno: number | null;
  // flujo-real-otin-v2 additions
  denominacion_cmn?: string | null;
  clasificador_cmn?: string | null;
  area_iniciadora?: string | null;
  // Alcance A — campos derivados de tiempo (TMP-01, TMP-02)
  // Solo disponibles en GET /procesos/{id}, no en el listado paginado.
  fecha_indagacion?: string | null;
  fecha_transicion_ota?: string | null;
  dias_transcurridos?: number | null;
  // REFINAMIENTO FASE 3: etapa de mayor orden COMPLETADO — "dónde está el proceso".
  // None si no hay etapas COMPLETADO. Solo disponible en GET /procesos/{id}.
  etapa_actual_avance?: string | null;
}

export interface PaginatedProcesos {
  items: Proceso[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

/** Mirrors backend CmnPorArea (schemas/proceso.py) — per-area CMN flag at process creation. */
export interface CmnPorArea {
  area: string;
  cmn_adjunto: "SI" | "NO";
}

export interface ProcesoCreatePayload {
  requerimiento: string;
  tipo: TipoProceso;
  // unidad_resp is hardcoded to "OTIN" by backend — do NOT send from frontend
  areas_usuarias: string[];
  pim?: number | null;
  anno: number;
  // flujo-real-otin-v2: area_iniciadora is required; CMN fields optional
  area_iniciadora: string;
  denominacion_cmn?: string | null;
  clasificador_cmn?: string | null;
  /** ISO date (YYYY-MM-DD). When set, E01a is auto-completed as the process kickoff. */
  fecha_solicitud?: string | null;
  /** Per-area CMN adjunto flags at creation time (mirrors backend cmn_por_area). */
  cmn_por_area?: CmnPorArea[];
}

export interface ProcesoUpdatePayload {
  requerimiento?: string | null;
  tipo?: TipoProceso | null;
  unidad_resp?: string | null;
  areas_usuarias?: string[] | null;
  pim?: number | null;
  estado?: EstadoProceso | null;
  motivo_cancel?: string | null;
  // flujo-real-otin-v2 — campos editables de Ficha
  anno?: number | null;
  area_iniciadora?: string | null;
  denominacion_cmn?: string | null;
  clasificador_cmn?: string | null;
}

export interface ProcesoFiltros {
  page?: number;
  page_size?: number;
  anno?: number;
  estado?: EstadoProceso;
  tipo?: TipoProceso;
  search?: string;
  area?: string;
}
