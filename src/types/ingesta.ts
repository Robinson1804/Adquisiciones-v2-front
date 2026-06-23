// ============================================================
// Ingesta de correos — types (mirror backend/app/schemas/ingesta.py)
// EstadoRevision + TipoDocumento + CorreoIngesta + DocumentoIngesta
// ============================================================

export type EstadoRevision =
  | "PENDIENTE"
  | "APROBADO"
  | "APROBADO_AUTO"
  | "RECHAZADO";

export type TipoDocumento =
  | "TDR"
  | "COTIZACION"
  | "ORDEN_SERVICIO"
  | "CONFORMIDAD"
  | "INFORME"
  | "OFICIO"
  | "CRONOGRAMA"
  | "SIAF"
  | "OTRO";

export type TipoServicio = "BIEN" | "SERVICIO";

export interface DocumentoIngesta {
  id: number;
  ingesta_correo_id: number;
  nombre_original: string;
  nombre_almacenado: string;
  ruta_relativa: string;
  content_type: string;
  tamano_bytes: number;
  tipo_clasificado: TipoDocumento | null;
  confianza: number | null;
  proceso_id: number | null;
  creado_en: string; // ISO datetime string
}

export interface CorreoIngesta {
  id: number;
  entry_id: string;
  subject: string | null;
  sender_name: string | null;
  sender_email: string | null;
  received_at: string | null; // ISO datetime string
  // Datos IA
  nombre_servicio: string | null;
  nombre_servicio_normalizado: string | null;
  numero_oficio_raw: string | null;
  numero_oficio: string | null;
  oss: string[] | null;
  siaf: string | null;
  proveedor: string | null;
  tipo: TipoServicio | null;
  fecha_documento: string | null; // ISO date string
  fecha_recepcion: string | null; // ISO date string
  // Revisión
  estado_revision: EstadoRevision;
  match_confianza: number | null;
  proceso_id: number | null;
  motivo_rechazo: string | null;
  revisado_por: string | null;
  revisado_en: string | null; // ISO datetime string
  // Sugerencia de clasificación/revisión
  relevancia_score: number | null;
  relevancia_motivos: string | null;
  proceso_sugerido_id: number | null;
  etapa_sugerida: string | null;
  fase_sugerida: string | null;
  resumen_sugerido: string | null;
  creado_en: string; // ISO datetime string
  documentos: DocumentoIngesta[];
}

export interface IngestaPendientesResponse {
  items: CorreoIngesta[];
  total: number;
}

// Payloads de acción

export interface CorreoCorreccionPayload {
  nombre_servicio?: string | null;
  nombre_servicio_normalizado?: string | null;
  numero_oficio?: string | null;
  numero_oficio_raw?: string | null;
  siaf?: string | null;
  proveedor?: string | null;
  tipo?: TipoServicio | null;
  fecha_documento?: string | null;
  fecha_recepcion?: string | null;
}

export interface AprobarPayload {
  proceso_id: number;
  etapa_sugerida?: string | null;
  estado_etapa?: "PENDIENTE" | "EN_CURSO" | "COMPLETADO";
  fecha_documento?: string | null;
  fecha_fin?: string | null;
  responsable?: string | null;
  oficio_correo?: string | null;
  observaciones?: string | null;
}

export interface RechazarPayload {
  motivo?: string | null;
}

export interface ExchangeCredencialesPayload {
  servidor: string;
  email: string;
  usuario: string;
  password: string;
  carpeta: string;
}

export interface ExchangeSyncPayload extends ExchangeCredencialesPayload {
  limite: number;
  solo_no_leidos: boolean;
  remitente?: string | null;
  umbral_relevancia: number;
  descargar_adjuntos: boolean;
}

export interface ExchangeTestResponse {
  conectado: boolean;
  cuenta: string | null;
  total_bandeja: number | null;
  mensaje: string;
}

export interface ExchangeFolder {
  nombre: string;
  total: number | null;
  no_leidos: number | null;
}

export interface ExchangeFoldersResponse {
  items: ExchangeFolder[];
  total: number;
}

export interface ExchangeSyncResponse {
  carpeta: string;
  revisados: number;
  candidatos: number;
  creados: number;
  duplicados: number;
  auto_vinculados: number;
  descartados: number;
  errores: string[];
}
