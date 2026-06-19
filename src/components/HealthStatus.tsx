"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { HealthResponse } from "@/types";

type HealthState =
  | { kind: "loading" }
  | { kind: "ok"; data: HealthResponse }
  | { kind: "error"; message: string };

export default function HealthStatus() {
  const [state, setState] = useState<HealthState>({ kind: "loading" });

  useEffect(() => {
    api
      .get<HealthResponse>("/health")
      .then((res) => setState({ kind: "ok", data: res.data }))
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Error de conexión";
        setState({ kind: "error", message });
      });
  }, []);

  if (state.kind === "loading") {
    return (
      <div className="rounded border border-outline bg-white shadow-card p-6">
        <p className="text-on-surface text-sm">Verificando conexión...</p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div
        className="rounded border border-error bg-red-50 shadow-card p-6"
        role="alert"
        aria-live="assertive"
      >
        <h2 className="font-semibold text-error mb-1">Backend inalcanzable</h2>
        <p className="text-sm text-error">{state.message}</p>
        <dl className="mt-3 text-sm grid grid-cols-2 gap-x-4 gap-y-1">
          <dt className="font-medium text-on-surface">Backend:</dt>
          <dd className="text-error font-semibold">unreachable</dd>
          <dt className="font-medium text-on-surface">Base de datos:</dt>
          <dd className="text-error font-semibold">unreachable</dd>
        </dl>
      </div>
    );
  }

  const isDbConnected = state.data.database === "connected";

  return (
    <div
      className="rounded border border-outline bg-white shadow-card p-6"
      role="region"
      aria-label="Estado del sistema"
    >
      <h2 className="font-semibold text-primary-container mb-3">
        Estado del sistema
      </h2>
      <dl className="text-sm grid grid-cols-2 gap-x-4 gap-y-2">
        <dt className="font-medium text-on-surface">Backend:</dt>
        <dd
          className={`font-semibold ${
            state.data.status === "ok" ? "text-green-700" : "text-error"
          }`}
        >
          {state.data.status === "ok" ? "ok" : state.data.status}
        </dd>
        <dt className="font-medium text-on-surface">Base de datos:</dt>
        <dd
          className={`font-semibold ${
            isDbConnected ? "text-green-700" : "text-error"
          }`}
        >
          {isDbConnected ? "connected" : state.data.database}
        </dd>
      </dl>
    </div>
  );
}
