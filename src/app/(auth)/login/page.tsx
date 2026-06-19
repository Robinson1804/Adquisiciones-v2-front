"use client";

import React from "react";

/**
 * Login page — fidelidad al mockup S1 + design tokens DESIGN.md.
 *
 * Card centrada, blanca, sombra card, borde outline, padding 24px.
 * Fondo bg-surface (#f8f9ff) aplicado por (auth)/layout.tsx.
 * Título text-primary (#03224d), bold.
 * Inputs con borde 2px navy al enfocar.
 * Error: banda roja sobre el formulario (text-error).
 * Footer: soporte + "Oficina de Tecnologías de la Información — INEI".
 */

import { useState, useId, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import type { UserOut } from "@/types";

// ── SVG icons (inline — no external deps needed) ──────────────────────────────

function IconUser() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gray-400"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gray-400"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconEye({ show }: { show: boolean }) {
  return show ? (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function IconLogin() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ml-2"
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserOut;
}

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const usernameId = useId();
  const passwordId = useId();

  // Already authenticated → skip the login form and bounce to the app.
  useEffect(() => {
    if (document.cookie.includes("auth_token=")) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const { data } = await api.post<TokenResponse>("/auth/login", {
        username,
        password,
      });
      login(data.access_token, data.user);
      router.push("/dashboard");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        const detail =
          (err.response.data as { detail?: string }).detail ??
          "Error al iniciar sesión. Intente nuevamente.";
        setErrorMessage(detail);
      } else {
        setErrorMessage("Error de conexión. Verifique su red.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-lg border border-outline shadow-card p-6">
        {/* Header */}
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-primary">
            Adquisiciones TIC
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Ingrese sus credenciales para acceder al sistema institucional.
          </p>
        </header>

        {/* Error band */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded p-3 bg-red-50 border border-red-200 text-error text-sm"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Usuario field */}
          <div className="mb-4">
            <label
              htmlFor={usernameId}
              className="block text-sm font-semibold text-on-surface mb-1"
            >
              Usuario
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 pointer-events-none">
                <IconUser />
              </span>
              <input
                id={usernameId}
                type="text"
                name="username"
                autoComplete="username"
                placeholder="nombre.usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                className="w-full pl-9 pr-3 py-2 border border-outline rounded text-sm
                           focus:outline-none focus:border-2 focus:border-primary
                           disabled:opacity-60"
              />
            </div>
          </div>

          {/* Contraseña field */}
          <div className="mb-4">
            <label
              htmlFor={passwordId}
              className="block text-sm font-semibold text-on-surface mb-1"
            >
              Contraseña
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 pointer-events-none">
                <IconLock />
              </span>
              <input
                id={passwordId}
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="w-full pl-9 pr-10 py-2 border border-outline rounded text-sm
                           focus:outline-none focus:border-2 focus:border-primary
                           disabled:opacity-60"
              />
              <button
                type="button"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 text-gray-400 hover:text-gray-600"
              >
                <IconEye show={showPassword} />
              </button>
            </div>
          </div>

          {/* Remember + forgot */}
          <div className="flex items-center justify-between mb-5 text-sm">
            <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
              <input type="checkbox" className="rounded" />
              Recordar sesión
            </label>
            <a
              href="#"
              className="text-primary hover:underline"
              tabIndex={0}
            >
              ¿Olvidó su contraseña?
            </a>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center bg-primary text-white
                       font-semibold py-2.5 rounded hover:bg-primary-container
                       transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg
                  aria-hidden="true"
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Iniciando...
              </>
            ) : (
              <>
                Iniciar Sesión
                <IconLogin />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <footer className="mt-6 text-center text-xs text-gray-400 space-y-1">
        <p>
          Soporte Técnico:{" "}
          <a
            href="mailto:soporte_tic@inei.gob.pe"
            className="text-gray-500 hover:underline"
          >
            soporte_tic@inei.gob.pe
          </a>
        </p>
        <p className="border-t border-outline pt-2 mt-2">
          Oficina de Tecnologías de la Información — INEI
        </p>
      </footer>
    </>
  );
}
