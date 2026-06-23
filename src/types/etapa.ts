// ============================================================
// C3a — Etapa types (mirror backend/app/schemas/etapa.py)
// Grouped GET contract: Design D4
// ============================================================

// E01c CMN/SIGA tri-state (backend: 'SI' | 'NO' | 'EN_CURSO' | null)
export type CmnSigaState = 'SI' | 'NO' | 'EN_CURSO' | null;

export interface FilaArea {
  id: number;
  area_usuaria: string;
  estado_etapa: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  dias: number | null;
  // Stage-specific optional fields
  cmn_adjunto?: string;
  cmn_siga_confirmado?: CmnSigaState;  // E01c: CMN/SIGA confirmed by area (tri-state)
  fecha_limite_respuesta?: string | null; // E01b/E10: deadline for response
  monto_cert?: number;
  resultado_eval?: string;
  nro_ocs?: string;
  monto_ocs?: number;
  plazo_entrega?: number;
  fecha_envio_otpp?: string;
  fecha_resp_otpp?: string;
  vencimiento_ocs?: string | null;
  // Common fields (backend FilaAreaOut returns these — used to prefill the modal)
  responsable?: string | null;
  oficio_correo?: string | null;
  observaciones?: string | null;
  motivo_bucle?: string | null;
}

export interface RondaBucle {
  id: number;
  nro_ronda: number;
  motivo_bucle: string;
  titulo_ronda?: string | null;  // Cambio 4: optional round title
  estado_etapa: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  dias: number | null;
}

export type EstadoEtapa = 'COMPLETADO' | 'EN_CURSO' | 'PENDIENTE' | 'OMITIDO' | 'NO_APLICA';

// Defined here (before EtapaAgrupada) to allow forward reference in firmas field.
export type EstadoFirma = 'PENDIENTE' | 'RECIBIDO' | 'FIRMADO' | 'RECHAZADO';

export interface FirmaSecuencial {
  id: number;
  proceso_id: number;
  etapa_cod: string;
  area: string;
  orden: number;
  estado: EstadoFirma;
  ronda: number;
  fecha_recibido: string | null;
  fecha_firmado: string | null;
  motivo_rechazo?: string | null;
}

export interface EtapaAgrupada {
  cod: string;
  nombre: string;
  area_responsable: string;
  es_bucle: boolean;
  por_area: boolean;
  estado: EstadoEtapa;
  filas: FilaArea[];
  rondas: RondaBucle[];
  alerta_otpp: boolean | null;
  monto_total: number | null;
  /** flujo-real-otin-v2: firma_secuencial rows for E02b/E06c (from proceso payload, no separate GET) */
  firmas?: FirmaSecuencial[];
}

export interface Progreso {
  etapa_actual: string | null;
  porcentaje: number;
  completadas: number;
  total: number;
}

export interface EtapasResponse {
  etapas: EtapaAgrupada[];
  progreso: Progreso;
}

export interface EtapaOut {
  id: number;
  codigo_etapa: string;
  nro_ronda: number | null;
  area_usuaria: string | null;
  estado_etapa: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  dias: number | null;
  vencimiento_ocs?: string | null;
}

export interface EtapaCreatePayload {
  codigo_etapa: string;
  nombre_etapa: string;
  fecha_inicio: string;
  estado_etapa: string;
  fecha_fin?: string;
  responsable?: string;
  oficio_correo?: string;
  observaciones?: string;
  // Per-stage optional fields
  area_usuaria?: string;
  cmn_adjunto?: string;
  cmn_siga_confirmado?: CmnSigaState;  // E01c tri-state
  fecha_limite_respuesta?: string; // E01b / E10
  monto_cert?: number;
  resultado_eval?: string;
  motivo_bucle?: string;
  titulo_ronda?: string | null;  // Cambio 4: optional round title (max 200 chars)
  fecha_envio_otpp?: string;
  fecha_resp_otpp?: string;
  nro_ocs?: string;
  monto_ocs?: number;
  plazo_entrega?: number;
}

export interface BuclePayload {
  motivo_bucle: string;
  titulo_ronda?: string | null;  // Cambio 4
}

// ============================================================
// C3b — MontosProceso (mirrors backend montos_proceso table)
// Populated as trigger stages complete: E09→valor_em, E12→monto_cert_total,
// E19→nro_ocs/monto_ocs/plazo_entrega, E22→fecha_inicio_srv.
// Returned by GET /procesos/{id} or GET /procesos/{id}/montos (Design §WU-F4).
// ============================================================
export interface MontosProceso {
  valor_em: number | null;
  monto_cert_total: number | null;
  nro_ocs: string | null;
  monto_ocs: number | null;
  plazo_entrega: number | null;
  fecha_inicio_srv: string | null;
}

// ============================================================
// C3b — EtapaCreatePayload extended with motivo_cancel (R2/E10)
// ============================================================
export interface EtapaCreatePayloadC3b extends EtapaCreatePayload {
  motivo_cancel?: string;
}

// ============================================================
// C3c — File attachment types (mirrors backend ArchivoOut schema)
// Each ArchivoMeta is tied to a specific etapa_registro row (etapa_id).
// ============================================================
export interface ArchivoMeta {
  id: number;
  etapa_id: number;
  nombre_original: string;
  content_type: string;
  tamano_bytes: number;
  subido_por: string;
  subido_en: string; // ISO datetime string
}

// ============================================================
// Timing analysis — GET /procesos/{id}/tiempos
// ============================================================
export interface Intervalo {
  cod: string;
  nombre: string;
  area_responsable: string;
  desde: string;
  hasta: string;
  dias: number;
}

export interface AreaTiempo {
  area: string;
  dias_total: number;
}

export interface TiemposProceso {
  intervalos: Intervalo[];
  total_dias: number;
  por_area: AreaTiempo[];
  cuello_de_botella: { cod: string; dias: number } | null;
}

// ============================================================
// Timing matrix — GET /tiempos/matriz
// ============================================================
export interface ColumnaMatriz {
  key: string;
  label: string;
  cod: string | null;
}

export interface FilaMatriz {
  proceso_id: number;
  id_proceso: string;
  requerimiento: string;
  pim: number | null;
  estado: string;
  tipo: string | null;
  celdas: (number | null)[];
  total_dias: number;
}

export interface MatrizTiempos {
  columnas: ColumnaMatriz[];
  filas: FilaMatriz[];
  promedios: (number | null)[];
  promedio_total: number | null;
}

// Wizard input for batch O/S registration
export interface OrdenServicioInput {
  nro_ocs: string;
  monto_ocs: number;
  plazo_entrega: number;
  fechas: Partial<Record<'E14' | 'E15' | 'E16' | 'E17' | 'E18' | 'E19' | 'E20', string>>;
}
