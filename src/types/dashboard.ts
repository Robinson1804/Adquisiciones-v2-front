/**
 * C4 Dashboard — TypeScript types mirroring backend/app/schemas/dashboard.py
 * All numeric fields are number | null (Pydantic floats serialize as JSON numbers).
 */

// ============================================================
// S7 — Métricas (GET /dashboard/metricas)
// ============================================================
export interface Metricas {
  anno: number;
  total: number;
  en_proceso: number;
  culminados: number;
  cancelados: number;
  pim_total: number | null;
  dias_promedio: number | null;
}

// ============================================================
// S7 — Flujo de procesos (GET /dashboard/flujo-procesos)
// ============================================================
export interface FaseProgreso {
  fase: string;      // "F1" | "F2" | "F3" | "F4" | "F5"
  label: string;
  completada: boolean;
  actual: boolean;
}

export interface ProcesoFlujo {
  id: number;
  id_proceso: string;
  requerimiento: string;
  estado: string;
  fase_actual: string | null;
  etapa_actual: string | null;
  etapa_actual_nombre: string | null;
  fase_actual_dias: number | null;
  porcentaje: number;
  fases: FaseProgreso[];
}

export interface FlujoProcesosResponse {
  procesos: ProcesoFlujo[];
}

// ============================================================
// S8 — Tiempos por etapa (GET /dashboard/tiempos-etapa)
// ============================================================
export interface TiempoEtapa {
  codigo: string;
  nombre: string;
  area_responsable: string | null;
  dias_promedio: number | null;
  n: number;
}

export interface TiemposEtapaResponse {
  anno: number;
  promedio_global: number | null;
  etapas: TiempoEtapa[];
}

// ============================================================
// S9 — Presupuesto (GET /dashboard/presupuesto)
// ============================================================
export interface PresupuestoProceso {
  id: number;
  id_proceso: string;
  requerimiento: string;
  estado: string;
  pim: number | null;
  valor_em: number | null;
  monto_cert_total: number | null;
  monto_ocs: number | null;
  var_em_vs_pim: number | null;
  var_cert_vs_em: number | null;
  var_ocs_vs_em: number | null;
}

export interface PresupuestoTotales {
  pim: number | null;
  valor_em: number | null;
  monto_cert_total: number | null;
  monto_ocs: number | null;
}

export interface PresupuestoResponse {
  anno: number;
  totales: PresupuestoTotales;
  procesos: PresupuestoProceso[];
}

// ============================================================
// S10 — Demora por áreas (GET /dashboard/demora-areas)
// ============================================================
export type Semaforo = "verde" | "amarillo" | "rojo" | null;

export interface DemoraArea {
  area_usuaria: string;
  e11_dias_promedio: number | null;
  e11_n: number;
  semaforo_e11: Semaforo;
  e24_dias_promedio: number | null;
  e24_n: number;
  semaforo_e24: Semaforo;
}

export interface DemoraAreasResponse {
  anno: number;
  areas: DemoraArea[];
}
