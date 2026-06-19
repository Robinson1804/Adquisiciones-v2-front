import axios from "axios";
import { useAuthStore } from "@/stores/authStore";
import type {
  PaginatedProcesos,
  Proceso,
  ProcesoCreatePayload,
  ProcesoFiltros,
  ProcesoUpdatePayload,
} from "@/types";
import type {
  EtapasResponse,
  EtapaOut,
  EtapaCreatePayload,
  BuclePayload,
  MontosProceso,
  ArchivoMeta,
  TiemposProceso,
  MatrizTiempos,
} from "@/types/etapa";
import type {
  Metricas,
  FlujoProcesosResponse,
  TiemposEtapaResponse,
  PresupuestoResponse,
  DemoraAreasResponse,
} from "@/types/dashboard";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

// Request interceptor — attach Bearer token from authStore if present.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — on 401, clear auth state and redirect to /login.
// Guard against redirect loop: skip if already on the login page.
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ============================================================
// C2 — Proceso API functions (use existing `api` instance with Bearer auth)
// ============================================================

export async function getProcesos(
  filtros: ProcesoFiltros = {}
): Promise<PaginatedProcesos> {
  const res = await api.get<PaginatedProcesos>("/procesos", {
    params: filtros,
  });
  return res.data;
}

export async function getProceso(id: number): Promise<Proceso> {
  const res = await api.get<Proceso>(`/procesos/${id}`);
  return res.data;
}

export async function createProceso(
  payload: ProcesoCreatePayload
): Promise<Proceso> {
  const res = await api.post<Proceso>("/procesos", payload);
  return res.data;
}

export async function updateProceso(
  id: number,
  payload: ProcesoUpdatePayload
): Promise<Proceso> {
  const res = await api.put<Proceso>(`/procesos/${id}`, payload);
  return res.data;
}

export async function deleteProceso(id: number): Promise<void> {
  await api.delete(`/procesos/${id}`);
}

// ============================================================
// C3a — Etapas API functions
// ============================================================

export async function getEtapas(procesoId: number): Promise<EtapasResponse> {
  const res = await api.get<EtapasResponse>(`/procesos/${procesoId}/etapas`);
  return res.data;
}

export async function registrarEtapa(
  procesoId: number,
  payload: EtapaCreatePayload
): Promise<EtapaOut> {
  const res = await api.post<EtapaOut>(`/procesos/${procesoId}/etapas`, payload);
  return res.data;
}

export async function actualizarEtapa(
  etapaId: number,
  payload: Partial<EtapaCreatePayload>
): Promise<EtapaOut> {
  const res = await api.put<EtapaOut>(`/etapas/${etapaId}`, payload);
  return res.data;
}

export async function agregarRonda(
  procesoId: number,
  cod: string,
  payload: BuclePayload
): Promise<EtapaOut> {
  const res = await api.post<EtapaOut>(
    `/procesos/${procesoId}/etapas/${cod}/bucle`,
    payload
  );
  return res.data;
}

// ============================================================
// C3b — Reiniciar TDR (POST /procesos/{id}/reiniciar-tdr)
// Design D3: reopens E02 after E10 SIN_PRESUPUESTO cancellation.
// ADMIN/EDITOR only — backend enforces; FE gate via useReiniciarTdr.
// ============================================================

export async function reiniciarTdr(procesoId: number): Promise<EtapaOut> {
  const res = await api.post<EtapaOut>(`/procesos/${procesoId}/reiniciar-tdr`);
  return res.data;
}

// ============================================================
// C3b — GET /procesos/{id}/montos
// Returns montos_proceso row for the ficha display (Valor EM, OCS, etc.).
// Returns null when no trigger stages have completed yet (no row exists).
// Design §WU-F4: backend may embed montos in GET /procesos/{id} or expose
// a separate endpoint; using a dedicated endpoint here for clean separation.
// ============================================================

export async function getMontosProceso(
  procesoId: number
): Promise<MontosProceso | null> {
  const res = await api.get<MontosProceso | null>(`/procesos/${procesoId}/montos`);
  return res.data;
}

// ============================================================
// control-tiempos — GET /procesos/{id}/tiempos
// Returns interval chain and bottleneck for the given proceso.
// ============================================================

export async function getTiempos(procesoId: number): Promise<TiemposProceso> {
  const res = await api.get<TiemposProceso>(`/procesos/${procesoId}/tiempos`);
  return res.data;
}

// ============================================================
// matriz-tiempos — GET /tiempos/matriz
// Returns the cross-process timing heatmap for all filtered procesos.
// Mirror getProcesos params style: omit keys with undefined values.
// ============================================================

export async function getMatrizTiempos(
  filtros: { anno?: number; estado?: string; tipo?: string; q?: string }
): Promise<MatrizTiempos> {
  const res = await api.get<MatrizTiempos>("/tiempos/matriz", {
    params: filtros,
  });
  return res.data;
}

// ============================================================
// C3c — Archivos (file attachments on key stages)
//
// IMPORTANT — multipart Content-Type override:
//   The axios instance sets Content-Type: application/json by default.
//   When uploading a file we pass FormData; we must explicitly delete
//   the default Content-Type header from the per-request config so
//   the browser sets the correct multipart/form-data boundary.
//   Do NOT hardcode 'multipart/form-data' — the boundary token is
//   auto-generated and the browser must insert it.
// ============================================================

export async function getArchivos(etapaId: number): Promise<ArchivoMeta[]> {
  const res = await api.get<{ archivos: ArchivoMeta[] }>(`/etapas/${etapaId}/archivos`);
  return res.data.archivos;
}

export async function subirArchivo(
  etapaId: number,
  file: File
): Promise<ArchivoMeta> {
  const formData = new FormData();
  formData.append("archivo", file);
  const res = await api.post<ArchivoMeta>(
    `/etapas/${etapaId}/archivos`,
    formData,
    {
      headers: {
        // Delete the default 'application/json' so browser sets
        // 'multipart/form-data; boundary=...' automatically.
        "Content-Type": undefined,
      },
    }
  );
  return res.data;
}

export async function descargarArchivo(archivoId: number): Promise<Blob> {
  const res = await api.get<Blob>(`/archivos/${archivoId}`, {
    responseType: "blob",
  });
  return res.data;
}

export async function eliminarArchivo(archivoId: number): Promise<void> {
  await api.delete(`/archivos/${archivoId}`);
}

// ============================================================
// C4 — Dashboard API functions (read-only, require Bearer via interceptor)
// All endpoints: prefix /dashboard, anno param required.
// ============================================================

export async function getMetricas(anno: number): Promise<Metricas> {
  const res = await api.get<Metricas>("/dashboard/metricas", {
    params: { anno },
  });
  return res.data;
}

export async function getFlujoProcesos(
  anno: number
): Promise<FlujoProcesosResponse> {
  const res = await api.get<FlujoProcesosResponse>(
    "/dashboard/flujo-procesos",
    { params: { anno } }
  );
  return res.data;
}

export async function getTiemposEtapa(
  anno: number
): Promise<TiemposEtapaResponse> {
  const res = await api.get<TiemposEtapaResponse>(
    "/dashboard/tiempos-etapa",
    { params: { anno } }
  );
  return res.data;
}

export async function getPresupuesto(
  anno: number
): Promise<PresupuestoResponse> {
  const res = await api.get<PresupuestoResponse>("/dashboard/presupuesto", {
    params: { anno },
  });
  return res.data;
}

export async function getDemoraAreas(
  anno: number
): Promise<DemoraAreasResponse> {
  const res = await api.get<DemoraAreasResponse>("/dashboard/demora-areas", {
    params: { anno },
  });
  return res.data;
}

// ============================================================
// C5 — Export API functions (blob downloads, Bearer via interceptor)
//
// Pattern mirrors descargarArchivo (C3c): responseType:'blob' so axios
// returns a Blob directly. The interceptor adds the Bearer token.
// The caller is responsible for triggering the download (objectURL + <a>).
// ============================================================

export async function exportExcel(anno: number): Promise<Blob> {
  const res = await api.get<Blob>("/export/excel", {
    params: { anno },
    responseType: "blob",
  });
  return res.data;
}

export async function exportProcesoPdf(id: number): Promise<Blob> {
  const res = await api.get<Blob>(`/export/proceso/${id}/pdf`, {
    responseType: "blob",
  });
  return res.data;
}

// ============================================================
// G9 — Ingesta de correos API functions
// ============================================================

import type {
  CorreoIngesta,
  IngestaPendientesResponse,
  CorreoCorreccionPayload,
  AprobarPayload,
  RechazarPayload,
  DocumentoIngesta,
} from "@/types/ingesta";

export async function getIngestaPendientes(): Promise<IngestaPendientesResponse> {
  const res = await api.get<IngestaPendientesResponse>("/ingesta/pendientes");
  return res.data;
}

/** Retorna correos en estado APROBADO_AUTO para auditoría y desvinculación. */
export async function getIngestaAprobadosAuto(): Promise<IngestaPendientesResponse> {
  const res = await api.get<IngestaPendientesResponse>(
    "/ingesta/pendientes",
    { params: { estado: "APROBADO_AUTO" } }
  );
  return res.data;
}

export async function patchIngesta(
  id: number,
  payload: CorreoCorreccionPayload
): Promise<CorreoIngesta> {
  const res = await api.patch<CorreoIngesta>(`/ingesta/${id}`, payload);
  return res.data;
}

export async function aprobarIngesta(
  id: number,
  payload: AprobarPayload
): Promise<CorreoIngesta> {
  const res = await api.post<CorreoIngesta>(`/ingesta/${id}/aprobar`, payload);
  return res.data;
}

export async function rechazarIngesta(
  id: number,
  payload: RechazarPayload
): Promise<CorreoIngesta> {
  const res = await api.post<CorreoIngesta>(`/ingesta/${id}/rechazar`, payload);
  return res.data;
}

export async function desvincularIngesta(id: number): Promise<CorreoIngesta> {
  const res = await api.post<CorreoIngesta>(`/ingesta/${id}/desvincular`);
  return res.data;
}

export async function getDocumentosProceso(
  procesoId: number
): Promise<DocumentoIngesta[]> {
  const res = await api.get<DocumentoIngesta[]>(
    `/procesos/${procesoId}/documentos`
  );
  return res.data;
}

/** Returns the URL to download a documento via the backend guard endpoint. */
export function getDocumentoUrlDescarga(docId: number): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  return `${baseUrl}/ingesta/documentos/${docId}`;
}
