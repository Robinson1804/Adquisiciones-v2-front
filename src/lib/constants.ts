// ============================================================
// COLORES POR ACTOR — fuente canónica: CONTEXT.md §7
// ============================================================
export const COLORES_ACTOR = {
  AREAS:       { bg: '#E8F5E9', text: '#27500A', border: '#81C784' },
  OTIN:        { bg: '#FFF2CC', text: '#7F4A09', border: '#FFD54F' },
  OTA:         { bg: '#E8F3E8', text: '#2E7D32', border: '#A5D6A7' },
  OEAS:        { bg: '#F3E5F5', text: '#7B1FA2', border: '#CE93D8' },
  BUCLE:       { bg: '#FFE699', text: '#7F6000', border: '#F9A825', dashed: true as const },
  SEC_GENERAL: { bg: '#FCE4EC', text: '#AD1457', border: '#F48FB1' },
  OTPP:        { bg: '#FBE9E7', text: '#BF360C', border: '#FFAB91' },
  PROVEEDOR:   { bg: '#E3F2FD', text: '#0D47A1', border: '#90CAF9' },
} as const;

// ============================================================
// COLORES POR ESTADO — fuente canónica: CONTEXT.md §7
// bg/text: pill de estado · bar: barra izquierda de la tarjeta
// Paleta reforzada para que Completado/En Curso/Pendiente
// se distingan claramente con fondo de tarjeta neutro (blanco).
// ============================================================
export const COLORES_ESTADO = {
  COMPLETADO: { bg: '#DCFCE7', text: '#15803D', bar: '#16A34A' },
  EN_CURSO:   { bg: '#DBEAFE', text: '#1D4ED8', bar: '#2563EB' },
  PENDIENTE:  { bg: '#FEF3C7', text: '#B45309', bar: '#D97706' },
  CANCELADO:  { bg: '#FEE2E2', text: '#B91C1C', bar: '#DC2626' },
  OMITIDO:    { bg: '#F1F5F9', text: '#64748B', bar: '#94A3B8' },
  NO_APLICA:  { bg: '#F1F5F9', text: '#64748B', bar: '#94A3B8' },
  SIN_EVIDENCIA: { bg: '#E5E7EB', text: '#4B5563', bar: '#9CA3AF' },
} as const;

// ============================================================
// CATÁLOGO COMPLETO DE ETAPAS — fuente canónica: etapas_catalogo.py (backend)
// 32 entradas: flujo-real-otin-v2 — E01a/E01b/E01c/E02b/E06c agregados, E01 removido.
// C3c: acepta_adjuntos field mirrors backend CODIGOS_CON_ADJUNTOS.
// ============================================================
export const ETAPAS_CONFIG = [
  // ---- FASE 1 — Requerimiento y TDR ----
  { cod: 'E01a', area: 'AREAS',       nombre: 'Solicitud inicial área iniciadora (Área → OTIN)',
    instruccion: 'El área iniciadora solicita el proceso. Sin por_area.',
    acepta_adjuntos: true as const },

  { cod: 'E01b', area: 'OTIN',        nombre: 'Oficio circular OTIN → áreas usuarias',
    instruccion: 'OTIN notifica a todas las áreas usuarias. Registrar fecha límite de respuesta.',
    campos_extra: ['fecha_limite_respuesta'], acepta_adjuntos: true as const },

  { cod: 'E01c', area: 'AREAS',       nombre: 'Respuesta área con requerimiento + CMN/SIGA (Áreas → OTIN)',
    instruccion: 'Una fila por área. Confirmar CMN/SIGA antes de avanzar.',
    por_area: true as const, campos_extra: ['cmn_siga_confirmado'],
    acepta_adjuntos: true as const },

  { cod: 'E02',  area: 'OTIN',        nombre: 'Elaboración TDR consolidado (OTIN)',
    instruccion: 'OTIN consolida todos los requerimientos en un solo TDR.',
    acepta_adjuntos: true as const },

  { cod: 'E02b', area: 'AREAS',       nombre: 'V°B° secuencial áreas del TDR',
    instruccion: 'V°B° secuencial de áreas del TDR. Tracked via firma_secuencial.' },

  // ---- FASE 2 — Indagación y Evaluación ----
  { cod: 'E03',  area: 'OTIN',        nombre: 'Envío indagación de mercado (OTIN → OTA)',
    instruccion: 'OTIN envía TDR a OTA. Registrar N° oficio.',
    acepta_adjuntos: true as const },

  { cod: 'E04',  area: 'OTA',         nombre: 'OTA deriva expediente a OEAS (OTA → OEAS)',
    instruccion: 'OTA recibe y deriva a OEAS para indagación.' },

  { cod: 'E05',  area: 'BUCLE',       nombre: 'Observaciones al TDR [BUCLE] (OEAS → OTIN)',
    instruccion: 'OEAS devuelve con observaciones. Registrar motivo + N° ronda.',
    es_bucle: true as const, campos_extra: ['motivo_bucle', 'nro_ronda'] },

  { cod: 'E06',  area: 'BUCLE',       nombre: 'Corrección TDR [BUCLE] (OTIN → OEAS)',
    instruccion: 'OTIN corrige y reenvía. Registrar corrección + N° ronda.',
    es_bucle: true as const, campos_extra: ['motivo_bucle', 'nro_ronda'],
    acepta_adjuntos: true as const },

  { cod: 'E06b', area: 'BUCLE',       nombre: 'Solicitud V°B° DTDIS [BUCLE] (OTIN → DTDIS)',
    instruccion: 'OTIN solicita V°B° a DTDIS. Registrar motivo + N° ronda.',
    es_bucle: true as const, campos_extra: ['motivo_bucle', 'nro_ronda'],
    acepta_adjuntos: true as const },

  { cod: 'E06c', area: 'BUCLE',       nombre: 'Re-V°B° secuencial post-corrección [BUCLE]',
    instruccion: 'Re-V°B° secuencial post-corrección. Cada ronda es independiente.',
    es_bucle: true as const },

  { cod: 'E07',  area: 'OEAS',        nombre: 'Evaluación técnica (OEAS → OTIN)',
    instruccion: 'OEAS verifica que proveedores cumplen TDR.',
    campos_extra: ['resultado_eval'], acepta_adjuntos: true as const },

  { cod: 'E08',  area: 'OTIN',        nombre: 'Respuesta OTIN a evaluación técnica (OTIN → OEAS)',
    instruccion: 'APROBADO → avanza E09. CON OBSERVACIONES → bucle E08a/E08b.',
    campos_extra: ['resultado_eval'], acepta_adjuntos: true as const },

  { cod: 'E08a', area: 'BUCLE',       nombre: 'Observaciones al proveedor [BUCLE] (OEAS → Prov.)',
    instruccion: 'OEAS comunica observaciones al proveedor.',
    es_bucle: true as const, campos_extra: ['motivo_bucle', 'nro_ronda'] },

  { cod: 'E08b', area: 'BUCLE',       nombre: 'Subsanación + re-evaluación [BUCLE] (Prov→OEAS→OTIN)',
    instruccion: 'Proveedor subsana → OEAS re-evalúa → OTIN responde.',
    es_bucle: true as const, campos_extra: ['motivo_bucle', 'nro_ronda'] },

  // ---- FASE 3 — Presupuesto y Certificación ----
  { cod: 'E09',  area: 'OEAS',        nombre: 'Cuadro comparativo (OEAS → OTIN)',
    instruccion: 'Solo cuando eval. técnica APROBADA. Registrar valor EM.',
    campos_extra: ['monto_cert'], acepta_adjuntos: true as const },

  { cod: 'E10',  area: 'OTIN',        nombre: 'OTIN solicita anexo cert. + valida presupuesto (OTIN → Áreas)',
    instruccion: 'Validar que cada área tenga presupuesto. Sin monto = PROCESO CANCELA.',
    campos_extra: ['resultado_eval'] },

  { cod: 'E11',  area: 'AREAS',       nombre: 'Solicitud cert. presupuestal (cada Área → OTIN)',
    instruccion: 'Una fila por área. Registrar área + monto cert. S/.',
    por_area: true as const, campos_extra: ['area_usuaria', 'monto_cert'],
    acepta_adjuntos: true as const },

  { cod: 'E12',  area: 'OTIN',        nombre: 'Consolidación cert. presupuestales (OTIN)',
    instruccion: 'Registrar monto total consolidado.' },

  { cod: 'E13',  area: 'OTIN',        nombre: 'Envío consolidado a Secretaría General (OTIN → SG)',
    instruccion: 'Registrar N° oficio.', acepta_adjuntos: true as const },

  { cod: 'E14',  area: 'SEC_GENERAL', nombre: 'Aprobación Secretaría General (SG)',
    instruccion: 'Registrar N° oficio de aprobación.', acepta_adjuntos: true as const },

  { cod: 'E15',  area: 'SEC_GENERAL', nombre: 'Envío a OTPP (Sec. General → OTPP)',
    instruccion: 'SG remite expediente a OTPP.', acepta_adjuntos: true as const },

  { cod: 'E16',  area: 'OTPP',        nombre: 'Certificación presupuestal — OTPP',
    instruccion: 'Registrar fecha envío Y fecha respuesta. Alerta si >20 días.',
    campos_extra: ['fecha_envio_otpp', 'fecha_resp_otpp'],
    alerta_dias: 20 as const, acepta_adjuntos: true as const },

  // ---- FASE 4 — Orden y Ejecución ----
  { cod: 'E17',  area: 'OTPP',        nombre: 'OTPP envía a OTA (OTPP → OTA)',
    instruccion: 'OTPP remite expediente certificado a OTA.' },

  { cod: 'E18',  area: 'OTA',         nombre: 'OTA deriva a OEAS (OTA → OEAS)',
    instruccion: 'OTA recibe y deriva a OEAS para emisión de orden.' },

  { cod: 'E19',  area: 'OEAS',        nombre: 'Emisión orden de compra/servicio (OEAS)',
    instruccion: 'Registrar N° OCS + monto + plazo. Calcular fecha vencimiento.',
    campos_extra: ['nro_ocs', 'monto_ocs', 'plazo_entrega'], acepta_adjuntos: true as const },

  { cod: 'E20',  area: 'OEAS',        nombre: 'Notificación al proveedor (OEAS → Proveedor)',
    instruccion: 'Registrar fecha de notificación.', acepta_adjuntos: true as const },

  { cod: 'E21',  area: 'PROVEEDOR',   nombre: 'Confirmación recepción OCS (Proveedor→OEAS→OTIN)',
    instruccion: 'Desde aquí corre el servicio/bien.' },

  { cod: 'E22',  area: 'PROVEEDOR',   nombre: 'Inicio de servicio / entrega del bien',
    instruccion: 'Registrar FECHA REAL DE INICIO.', acepta_adjuntos: true as const },

  // ---- FASE 5 — Conformidad ----
  { cod: 'E23',  area: 'OTIN',        nombre: 'OTIN solicita conformidad (OTIN → Áreas)',
    instruccion: 'Notificar a cada área que emita conformidad.' },

  { cod: 'E24',  area: 'AREAS',       nombre: 'Conformidad área usuaria [por área] (Áreas → OTIN)',
    instruccion: 'Una fila por área. Registrar fecha + días demora.',
    por_area: true as const, campos_extra: ['area_usuaria'],
    acepta_adjuntos: true as const },

  { cod: 'E25',  area: 'OTIN',        nombre: 'Conformidad final consolidada (OTIN) FIN',
    instruccion: 'FIN DEL PROCESO. Fecha = FECHA_FIN_TOTAL.',
    es_fin: true as const },
] as const;

// ============================================================
// DEPENDENCIAS INEI — 13 áreas centrales (sin ODEI regionales).
// Orden: OTIN primero, resto alfabético. Fuente: Excel de metas OTIN.
// El campo `abrev` es el valor que se almacena en areas_usuarias.
// ============================================================
export interface Dependencia { abrev: string; nombre: string; }
export const DEPENDENCIAS: readonly Dependencia[] = [
  { abrev: "OTIN",                       nombre: "OTIN - OFICINA TECNICA DE INFORMATICA" },
  { abrev: "CIDE",                       nombre: "CIDE - CENTRO DE INVESTIGACION Y DESARROLLO" },
  { abrev: "DNCE",                       nombre: "DNCE - DIRECCION NACIONAL DE CENSOS Y ENCUESTAS" },
  { abrev: "DNCN",                       nombre: "DNCN - DIRECCION NACIONAL DE CUENTAS NACIONALES" },
  { abrev: "DTDIS",                      nombre: "DTDIS - DIREC. TEC. DE DEMOGRAFIA E INDI. SOCIALES" },
  { abrev: "DTIE",                       nombre: "DTIE - DIRECCION TECNICA DE INDICADORES ECONOMICOS" },
  { abrev: "ENEI",                       nombre: "ENEI - ESCUELA NACIONAL DE ESTADISTICA E INFORMATICA" },
  { abrev: "OTA",                        nombre: "OTA - OFICINA TECNICA DE ADMINISTRACION" },
  { abrev: "OTAJ",                       nombre: "OTAJ - OFICINA TECNICA DE ASESORIA JURIDICA" },
  { abrev: "OTD",                        nombre: "OTD - OFICINA TECNICA DE DIFUSION" },
  { abrev: "OTED",                       nombre: "OTED - OFIC. TEC. DE ESTADISTICAS DEPARTAMENTALES" },
  { abrev: "OTPP",                       nombre: "OTPP - OFIC. TEC. DE PLANIF. PRESUP. Y COOPERAC. TECN." },
  { abrev: "SG",                         nombre: "SG - SECRETARIA GENERAL" },
] as const;

// ============================================================
// C3c — Set of stage codes that accept file attachments.
// Mirrors backend CODIGOS_CON_ADJUNTOS (frozenset).
// Test-sync: both sets must contain exactly these 17 codes.
// ============================================================
// Derived from ETAPAS_CONFIG acepta_adjuntos=true entries.
// E01a, E01b, E01c replace E01. E01 removed.
export const CODIGOS_CON_ADJUNTOS = new Set<string>([
  'E01a', 'E01b', 'E01c', 'E02', 'E03', 'E06', 'E06b', 'E07', 'E08', 'E09', 'E11', 'E13', 'E14', 'E15', 'E16', 'E19', 'E20', 'E22', 'E24',
]);
