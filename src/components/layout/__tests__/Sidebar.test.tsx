/**
 * C6 — Sidebar component tests.
 * Verifies: nav links render, active link is highlighted by pathname,
 * logout button calls authStore.logout.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "@/components/layout/Sidebar";

// ── mocks ──────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => React.createElement("a", { href, ...props }, children),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

const mockLogout = vi.fn();

function setupAuthStore(overrides: Partial<ReturnType<typeof useAuthStore>> = {}) {
  vi.mocked(useAuthStore).mockReturnValue({
    token: "t",
    user: { id: 1, username: "admin", nombre_completo: "Admin", rol: "ADMIN", area: null },
    isAuthenticated: true,
    login: vi.fn(),
    logout: mockLogout,
    ...overrides,
  } as ReturnType<typeof useAuthStore>);
}

// ── tests ──────────────────────────────────────────────────────────

describe("Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthStore();
    vi.mocked(usePathname).mockReturnValue("/dashboard");
  });

  it("renders all primary nav links", () => {
    render(<Sidebar />);

    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /procesos/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /modo presentación/i })).toBeInTheDocument();
    // Reportes section removed from nav (pages still exist, just not in sidebar)
    expect(screen.queryByRole("link", { name: /tiempos/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /presupuesto/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /trazabilidad áreas/i })).not.toBeInTheDocument();
  });

  it("renders correct href for each nav link", () => {
    render(<Sidebar />);

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: /procesos/i })).toHaveAttribute("href", "/procesos");
    expect(screen.getByRole("link", { name: /modo presentación/i })).toHaveAttribute("href", "/presentacion");
  });

  it("active link gets aria-current=page when pathname matches /dashboard", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard");
    render(<Sidebar />);

    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute("aria-current", "page");

    // Other links should NOT be active
    expect(screen.getByRole("link", { name: /procesos/i })).not.toHaveAttribute("aria-current");
  });

  it("active link gets aria-current=page when pathname matches /procesos", () => {
    vi.mocked(usePathname).mockReturnValue("/procesos");
    render(<Sidebar />);

    expect(screen.getByRole("link", { name: /procesos/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /dashboard/i })).not.toHaveAttribute("aria-current");
  });

  it("no nav link is active when pathname is /reportes/tiempos (Reportes removed from nav)", () => {
    vi.mocked(usePathname).mockReturnValue("/reportes/tiempos");
    render(<Sidebar />);

    // Reportes routes no longer have nav items — no link should be active
    const links = screen.getAllByRole("link");
    links.forEach((link) => {
      expect(link).not.toHaveAttribute("aria-current", "page");
    });
  });

  it("active link has distinct visual class indicating active state", () => {
    vi.mocked(usePathname).mockReturnValue("/procesos");
    render(<Sidebar />);

    const activeLink = screen.getByRole("link", { name: /procesos/i });
    // Active items have bg-white/10 class applied
    expect(activeLink.className).toContain("bg-white/10");

    const inactiveLink = screen.getByRole("link", { name: /dashboard/i });
    expect(inactiveLink.className).not.toContain("bg-white/10");
  });

  it("renders logged-in username in footer", () => {
    render(<Sidebar />);
    // username "admin" appears in a <p> with the semibold truncate class
    const matches = screen.getAllByText("admin");
    // At least one element with username text must exist (username + possibly role)
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0]).toBeInTheDocument();
  });

  it("calls authStore.logout when Cerrar sesión is clicked", async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    const logoutBtn = screen.getByRole("button", { name: /cerrar sesión/i });
    await user.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("renders without crashing when user is null (edge case)", () => {
    setupAuthStore({ user: null });
    render(<Sidebar />);

    // Should not throw; logout button still present
    expect(screen.getByRole("button", { name: /cerrar sesión/i })).toBeInTheDocument();
  });
});
