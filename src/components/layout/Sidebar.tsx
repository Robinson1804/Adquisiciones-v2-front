"use client";

/**
 * Sidebar — institutional global navigation.
 * Design: Deep Navy (#1F3864 / primary-container) fixed 260px.
 * Active item = lighter-blue left vertical bar (bg-primary-active / accent).
 * S11 (presentacion) is fullscreen overlay — it bypasses the layout sidebar via z-50.
 */

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

// ─── nav structure ────────────────────────────────────────────────

type NavItem = {
  label: string;
  href: string;
};

type NavGroup = {
  group?: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Procesos", href: "/procesos" },
      { label: "Ingesta de correos", href: "/ingesta" },
    ],
  },
  {
    items: [
      { label: "Modo Presentación", href: "/presentacion" },
    ],
  },
];

// ─── helpers ──────────────────────────────────────────────────────

/** Returns true when the current pathname belongs to this nav item. */
function isActive(pathname: string, href: string): boolean {
  // Exact match for top-level routes; prefix match for nested ones.
  if (href === "/dashboard" || href === "/procesos" || href === "/presentacion" || href === "/ingesta") {
    return pathname === href || pathname.startsWith(href + "/");
  }
  return pathname.startsWith(href);
}

// ─── component ────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-sidebar bg-primary-container flex flex-col z-40
                 overflow-y-auto"
      aria-label="Navegación principal"
    >
      {/* ── Brand header ───────────────────────────────────────── */}
      <div className="px-5 py-5 border-b border-white/10 flex-shrink-0">
        {/* Logo placeholder */}
        <div className="w-8 h-8 rounded bg-white/20 mb-3 flex items-center justify-center">
          <span className="text-white text-xs font-bold">IN</span>
        </div>
        <p className="text-white text-sm font-bold leading-tight">
          Adquisiciones TIC
        </p>
        <p className="text-white/60 text-xs mt-0.5">INEI — OTIN</p>
      </div>

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-6" role="navigation">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.group && (
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-2 mb-1">
                {group.group}
              </p>
            )}
            <ul role="list" className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname ?? "", item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "flex items-center gap-3 px-3 py-2 rounded text-sm font-medium",
                        "transition-colors relative",
                        active
                          ? "bg-white/10 text-white"
                          : "text-white/70 hover:bg-white/5 hover:text-white",
                      ].join(" ")}
                    >
                      {/* Active left bar */}
                      {active && (
                        <span
                          className="absolute left-0 top-1 bottom-1 w-0.5 bg-blue-300 rounded-full"
                          aria-hidden="true"
                        />
                      )}
                      <span className="pl-1">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Footer — user + logout ─────────────────────────────── */}
      <div className="px-4 py-4 border-t border-white/10 flex-shrink-0">
        {user && (
          <div className="mb-3">
            <p className="text-white text-xs font-semibold truncate">{user.username}</p>
            <p className="text-white/50 text-xs capitalize">{user.rol?.toLowerCase()}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium
                     px-3 py-2 rounded transition-colors text-left"
          aria-label="Cerrar sesión"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
