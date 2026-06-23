"use client";

import React, { useEffect, useState } from "react";
import {
  useListarCarpetasExchange,
  useSincronizarExchange,
} from "@/hooks/useIngesta";
import type {
  ExchangeCredencialesPayload,
  ExchangeFolder,
  ExchangeSyncResponse,
} from "@/types/ingesta";

const INPUT =
  "w-full h-9 rounded border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25";

const SESSION_KEY = "adquisiciones.exchange.session.v1";

const DEFAULT_FORM = {
  servidor: "economicas2.inei.gob.pe",
  email: "prac-otin1@inei.gob.pe",
  usuario: "prac-otin1",
  password: "",
  carpeta: "Bandeja de entrada",
  limite: 20,
  solo_no_leidos: false,
  remitente: "",
  umbral_relevancia: 0.35,
  descargar_adjuntos: true,
};

type ExchangeForm = typeof DEFAULT_FORM;

type ExchangeSession = {
  conectado: boolean;
  form: ExchangeForm;
  folders: ExchangeFolder[];
};

function getErrorMessage(err: unknown): string {
  const axiosErr = err as { response?: { data?: { detail?: string } } };
  return axiosErr?.response?.data?.detail ?? "No se pudo completar la operación.";
}

function folderLabel(folder: ExchangeFolder): string {
  const total = folder.total !== null ? ` (${folder.total})` : "";
  const unread =
    folder.no_leidos !== null && folder.no_leidos > 0
      ? ` · ${folder.no_leidos} no leídos`
      : "";
  return `${folder.nombre}${total}${unread}`;
}

function Summary({ data }: { data: ExchangeSyncResponse }) {
  const items = [
    ["Revisados", data.revisados, "border-gray-200 bg-gray-50 text-gray-800"],
    ["Candidatos", data.candidatos, "border-green-200 bg-green-50 text-green-800"],
    ["Creados", data.creados, "border-blue-200 bg-blue-50 text-blue-800"],
    ["Duplicados", data.duplicados, "border-gray-200 bg-white text-gray-800"],
    ["Auto", data.auto_vinculados, "border-yellow-200 bg-yellow-50 text-yellow-800"],
    ["Descartados", data.descartados, "border-gray-200 bg-gray-50 text-gray-800"],
  ] as const;

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
      {items.map(([label, value, cls]) => (
        <div key={label} className={`rounded border px-3 py-2 ${cls}`}>
          <p className="opacity-80">{label}</p>
          <p className="font-bold text-base">{value}</p>
        </div>
      ))}
      {data.errores.length > 0 && (
        <div className="col-span-2 md:col-span-6 rounded border border-red-200 bg-red-50 p-3 text-red-700">
          <p className="font-semibold mb-1">Errores</p>
          <ul className="space-y-1">
            {data.errores.map((err, idx) => (
              <li key={`${idx}-${err}`}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ExchangeSyncPanel() {
  const listarCarpetas = useListarCarpetasExchange();
  const sincronizar = useSincronizarExchange();

  const [form, setForm] = useState<ExchangeForm>(DEFAULT_FORM);
  const [folders, setFolders] = useState<ExchangeFolder[]>([]);
  const [conectado, setConectado] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const folderItems = folders;
  const busy = listarCarpetas.isPending || sincronizar.isPending;

  const credenciales: ExchangeCredencialesPayload = {
    servidor: form.servidor,
    email: form.email,
    usuario: form.usuario,
    password: form.password,
    carpeta: form.carpeta,
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as ExchangeSession;
      setForm({ ...DEFAULT_FORM, ...saved.form });
      setFolders(saved.folders ?? []);
      setConectado(Boolean(saved.conectado && saved.form?.password));
    } catch {
      window.sessionStorage.removeItem(SESSION_KEY);
    }
  }, []);

  function saveSession(nextForm: ExchangeForm, nextFolders = folders, nextConectado = conectado) {
    if (typeof window === "undefined") return;
    const payload: ExchangeSession = {
      conectado: nextConectado,
      form: nextForm,
      folders: nextFolders,
    };
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  }

  function update<K extends keyof ExchangeForm>(key: K, value: ExchangeForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (conectado) saveSession(next);
      return next;
    });
  }

  function handleLogin() {
    setMessage(null);
    setError(null);
    listarCarpetas.mutate(credenciales, {
      onSuccess: (res) => {
        const inbox = res.items.find((folder) => folder.nombre === "Bandeja de entrada");
        const firstFolder = inbox ?? res.items[0];
        const nextForm = {
          ...form,
          carpeta: firstFolder?.nombre ?? form.carpeta,
        };
        setForm(nextForm);
        setFolders(res.items);
        setConectado(true);
        saveSession(nextForm, res.items, true);
        setMessage(`Sesión Exchange iniciada. ${res.total} carpeta${res.total === 1 ? "" : "s"} disponible${res.total === 1 ? "" : "s"}.`);
      },
      onError: (err) => setError(getErrorMessage(err)),
    });
  }

  function handleLogout() {
    setConectado(false);
    setMessage(null);
    setError(null);
    sincronizar.reset();
    listarCarpetas.reset();
    setFolders([]);
    setForm({ ...DEFAULT_FORM, password: "" });
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(SESSION_KEY);
    }
  }

  function handleSync() {
    setMessage(null);
    setError(null);
    sincronizar.mutate(
      {
        ...credenciales,
        limite: form.limite,
        solo_no_leidos: form.solo_no_leidos,
        remitente: form.remitente || null,
        umbral_relevancia: form.umbral_relevancia,
        descargar_adjuntos: form.descargar_adjuntos,
      },
      {
        onSuccess: () => setMessage("Sincronización terminada. Los candidatos aparecen debajo."),
        onError: (err) => setError(getErrorMessage(err)),
      }
    );
  }

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-primary">Exchange</h2>
          <p className="text-xs text-gray-500 mt-1">
            {conectado
              ? `Conectado como ${form.email}.`
              : "Inicia sesión para cargar las carpetas del buzón. La sesión se conserva solo en esta ventana."}
          </p>
        </div>
        {conectado && (
          <button
            type="button"
            onClick={handleLogout}
            disabled={busy}
            className="h-9 px-3 rounded border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            Cambiar cuenta
          </button>
        )}
      </div>

      {!conectado ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-gray-600">Servidor</span>
            <input className={INPUT} value={form.servidor} onChange={(e) => update("servidor", e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-gray-600">Correo</span>
            <input className={INPUT} value={form.email} onChange={(e) => update("email", e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-gray-600">Usuario</span>
            <input className={INPUT} value={form.usuario} onChange={(e) => update("usuario", e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-gray-600">Contraseña</span>
            <input
              className={INPUT}
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <div className="md:col-span-4 flex justify-end">
            <button
              type="button"
              onClick={handleLogin}
              disabled={busy || !form.password}
              className="h-9 px-4 rounded bg-primary text-white text-xs font-semibold hover:bg-primary-container disabled:opacity-50"
            >
              {listarCarpetas.isPending ? "Iniciando..." : "Iniciar sesión"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-3 items-end">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-gray-600">Carpeta</span>
              <select
                className={INPUT}
                value={form.carpeta}
                onChange={(e) => update("carpeta", e.target.value)}
              >
                {folderItems.map((folder) => (
                  <option key={folder.nombre} value={folder.nombre}>
                    {folderLabel(folder)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-gray-600">Límite</span>
              <input
                className={INPUT}
                type="number"
                min={1}
                max={100}
                value={form.limite}
                onChange={(e) => update("limite", Number(e.target.value))}
              />
            </label>
            <button
              type="button"
              onClick={handleSync}
              disabled={busy}
              className="h-9 px-4 rounded bg-primary text-white text-xs font-semibold hover:bg-primary-container disabled:opacity-50"
            >
              {sincronizar.isPending ? "Sincronizando..." : "Sincronizar"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {showAdvanced ? "Ocultar opciones avanzadas" : "Mostrar opciones avanzadas"}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded border border-gray-200 bg-gray-50 p-3">
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-semibold text-gray-600">Remitente opcional</span>
                <input
                  className={INPUT}
                  value={form.remitente}
                  onChange={(e) => update("remitente", e.target.value)}
                  placeholder="usuario@inei.gob.pe"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-gray-600">Umbral</span>
                <input
                  className={INPUT}
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={form.umbral_relevancia}
                  onChange={(e) => update("umbral_relevancia", Number(e.target.value))}
                />
              </label>
              <div className="flex flex-col justify-end gap-2 text-xs text-gray-700">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.solo_no_leidos}
                    onChange={(e) => update("solo_no_leidos", e.target.checked)}
                  />
                  Solo no leídos
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.descargar_adjuntos}
                    onChange={(e) => update("descargar_adjuntos", e.target.checked)}
                  />
                  Descargar adjuntos candidatos
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {message && (
        <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
      {sincronizar.data && <Summary data={sincronizar.data} />}
    </section>
  );
}
