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
}

export interface RechazarPayload {
  motivo?: string | null;
}
