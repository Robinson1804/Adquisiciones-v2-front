/**
 * C3a — EtapaCard tests.
 * WU-12: VIEWER role, prerequisite disabled button, alerta_otpp badge.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EtapaCard } from "@/components/procesos/EtapaCard";
import type { EtapaAgrupada } from "@/types/etapa";

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

// AdjuntosEtapa is rendered inside the expandable panel.
// Mock it to avoid needing the full useArchivos hook stack in these unit tests.
vi.mock("@/components/procesos/AdjuntosEtapa", () => ({
  AdjuntosEtapa: ({ etapaId }: { etapaId: number }) =>
    React.createElement('div', { 'data-testid': `adjuntos-mock-${etapaId}` }, 'Adjuntos mock'),
}));

vi.mock("@/hooks/useEtapas", () => ({
  useAgregarRonda: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useReiniciarTdr: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useRegistrarEtapa: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useActualizarEtapa: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

import { useAuthStore } from "@/stores/authStore";
import { useRegistrarEtapa, useActualizarEtapa } from "@/hooks/useEtapas";
import type { FilaArea } from "@/types/etapa";

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

function makeEtapa(cod: string, overrides: Partial<EtapaAgrupada> = {}): EtapaAgrupada {
  return {
    cod,
    nombre: `Etapa ${cod}`,
    area_responsable: 'OTIN',
    es_bucle: false,
    por_area: false,
    estado: 'PENDIENTE',
    filas: [],
    rondas: [],
    alerta_otpp: null,
    monto_total: null,
    ...overrides,
  };
}

describe("EtapaCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("VIEWER user does not see Registrar button", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 2, username: "viewer", nombre_completo: "Viewer", rol: "VIEWER", area: null },
      token: "t",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E02');
    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.queryByRole('button', { name: /Registrar/i })).not.toBeInTheDocument();
  });

  it("EDITOR user sees Registrar button when actionable", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
      token: "t",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E03');
    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByRole('button', { name: /Registrar avance de E03/i })).toBeInTheDocument();
  });

  it("prerequisite not met shows disabled Bloqueado button", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
      token: "t",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E02');
    const blockedReason = "E01 debe estar COMPLETADO antes de registrar E02";

    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: false, blockedReason },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    const btn = screen.getByRole('button', { name: /E02 bloqueado/i });
    expect(btn).toBeDisabled();
  });

  it("E16 card shows red alert badge when alerta_otpp is true", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 2, username: "viewer", nombre_completo: "Viewer", rol: "VIEWER", area: null },
      token: "t",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E16', {
      area_responsable: 'OTPP',
      alerta_otpp: true,
    });

    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/20 dias sin respuesta OTPP/i)).toBeInTheDocument();
  });

  it("E21 COMPLETADO shows plazo indicator", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 2, username: "viewer", nombre_completo: "Viewer", rol: "VIEWER", area: null },
      token: "t",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E21', {
      area_responsable: 'PROVEEDOR',
      estado: 'COMPLETADO',
    });

    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByText(/Inicio del plazo del servicio\/bien/i)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------
  // C3b WU-F3: Reiniciar-TDR button
  // ---------------------------------------------------------------

  it("E10 card with CANCELADO + SIN_PRESUPUESTO shows Reiniciar TDR button (EDITOR)", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
      token: "t",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E10', {
      filas: [{
        id: 1, area_usuaria: 'OTIN', estado_etapa: 'COMPLETADO',
        fecha_inicio: null, fecha_fin: null, dias: null,
        resultado_eval: 'SIN_PRESUPUESTO',
      } as FilaArea],
    });

    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        procesoEstado: 'CANCELADO',
        actionability: { canRegister: false, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByRole('button', { name: /Reiniciar TDR/i })).toBeInTheDocument();
  });

  it("E10 card in EN PROCESO does NOT show Reiniciar TDR button", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
      token: "t",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E10', {
      filas: [{
        id: 1, area_usuaria: 'OTIN', estado_etapa: 'COMPLETADO',
        fecha_inicio: null, fecha_fin: null, dias: null,
        resultado_eval: 'VALIDADO',
      } as FilaArea],
    });

    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        procesoEstado: 'EN PROCESO',
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.queryByRole('button', { name: /Reiniciar TDR/i })).not.toBeInTheDocument();
  });

  it("VIEWER does not see Reiniciar TDR button even when proceso CANCELADO", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 2, username: "viewer", nombre_completo: "Viewer", rol: "VIEWER", area: null },
      token: "t",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E10', {
      filas: [{
        id: 1, area_usuaria: 'OTIN', estado_etapa: 'COMPLETADO',
        fecha_inicio: null, fecha_fin: null, dias: null,
        resultado_eval: 'SIN_PRESUPUESTO',
      } as FilaArea],
    });

    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        procesoEstado: 'CANCELADO',
        actionability: { canRegister: false, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.queryByRole('button', { name: /Reiniciar TDR/i })).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------
  // NO_APLICA state: badge + botón
  // ---------------------------------------------------------------

  it("EstadoBadge renders 'No aplica' label for NO_APLICA estado", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 2, username: "viewer", nombre_completo: "Viewer", rol: "VIEWER", area: null },
      token: "t",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E10', { estado: 'NO_APLICA' as const });
    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: false, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByText('No aplica')).toBeInTheDocument();
  });

  it("EDITOR sees 'No aplica' button on PENDIENTE non-bucle stage", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
      token: "t",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E10', { estado: 'PENDIENTE', es_bucle: false, por_area: false });
    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByRole('button', { name: /Marcar E10 como No aplica/i })).toBeInTheDocument();
  });

  it("VIEWER does NOT see 'No aplica' button", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 2, username: "viewer", nombre_completo: "Viewer", rol: "VIEWER", area: null },
      token: "t",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E10', { estado: 'PENDIENTE' });
    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.queryByRole('button', { name: /No aplica/i })).not.toBeInTheDocument();
  });

  it("bucle stage does NOT show 'No aplica' button even for EDITOR", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
      token: "t",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E05', { estado: 'PENDIENTE', es_bucle: true });
    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.queryByRole('button', { name: /No aplica/i })).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------
  // BUG #4: NO_APLICA state — button must say "Editar" not "Registrar"
  // ---------------------------------------------------------------

  it("BUG-4: NO_APLICA stage shows 'Editar' button (not 'Registrar') for EDITOR", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
      token: "t",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E10', { estado: 'NO_APLICA' as const });
    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    // Should show "Editar" not "Registrar"
    expect(screen.getByRole('button', { name: /Editar etapa E10/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar avance/i })).not.toBeInTheDocument();
  });

  it("BUG-4: NO_APLICA stage does NOT show 'No aplica' quick-action button", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
      token: "t",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    // puedeMarcarNoAplica requires estado === 'PENDIENTE', so NO_APLICA must hide it
    const etapa = makeEtapa('E10', { estado: 'NO_APLICA' as const, es_bucle: false, por_area: false });
    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.queryByRole('button', { name: /Marcar E10 como No aplica/i })).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------
  // Cambio 3 — NO badge "BUCLE" adicional (solo actor chip y código)
  // ---------------------------------------------------------------

  it("Cambio-3: bucle stage E05 does NOT render a standalone orange BUCLE badge (only actor chip allowed)", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: null, token: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E05', { es_bucle: true, area_responsable: 'BUCLE' });
    const { container } = render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    // There should be at most ONE element with text "BUCLE" (the actor chip),
    // NOT an additional badge with the BUCLE background color (#FFE699)
    // and explicit "BUCLE" text as a separate badge element.
    const allBucleTexts = Array.from(container.querySelectorAll('span')).filter(
      (el) => el.textContent?.trim() === 'BUCLE' &&
               el.getAttribute('data-testid') !== 'actor-chip'
    );
    expect(allBucleTexts).toHaveLength(0);
  });

  // ---------------------------------------------------------------
  // Cambio 2 — Botones inline para activar bucle
  // ---------------------------------------------------------------

  it("Cambio-2: E04 card shows '+ Hubo observaciones al TDR' when E05 has no rondas", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
      token: "t", isAuthenticated: true, login: vi.fn(), logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const e04 = makeEtapa('E04', { estado: 'COMPLETADO', area_responsable: 'OTA' });
    const e05 = makeEtapa('E05', { es_bucle: true, rondas: [] });
    render(
      React.createElement(EtapaCard, {
        etapa: e04,
        allEtapas: [e04, e05],
        procesoId: 1,
        actionability: { canRegister: false, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByRole('button', { name: /Hubo observaciones al TDR/i })).toBeInTheDocument();
  });

  it("Cambio-2: E04 card does NOT show activate button when E05 already has rondas", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
      token: "t", isAuthenticated: true, login: vi.fn(), logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const e04 = makeEtapa('E04', { estado: 'COMPLETADO', area_responsable: 'OTA' });
    const e05 = makeEtapa('E05', {
      es_bucle: true,
      rondas: [{ id: 1, nro_ronda: 1, motivo_bucle: 'obs', estado_etapa: 'COMPLETADO', fecha_inicio: null, fecha_fin: null, dias: null }],
    });
    render(
      React.createElement(EtapaCard, {
        etapa: e04,
        allEtapas: [e04, e05],
        procesoId: 1,
        actionability: { canRegister: false, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.queryByRole('button', { name: /Hubo observaciones al TDR/i })).not.toBeInTheDocument();
  });

  it("Cambio-2: E02b card shows '+ Re-firmar áreas tras corrección' when E06c has no rondas", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
      token: "t", isAuthenticated: true, login: vi.fn(), logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const e02b = makeEtapa('E02b', { estado: 'COMPLETADO', area_responsable: 'AREAS' });
    const e06c = makeEtapa('E06c', { es_bucle: true, rondas: [] });
    render(
      React.createElement(EtapaCard, {
        etapa: e02b,
        allEtapas: [e02b, e06c],
        procesoId: 1,
        actionability: { canRegister: false, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByRole('button', { name: /Re-firmar áreas tras corrección/i })).toBeInTheDocument();
  });

  it("Cambio-2: VIEWER does NOT see bucle activation buttons", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 2, username: "viewer", nombre_completo: "Viewer", rol: "VIEWER", area: null },
      token: "t", isAuthenticated: true, login: vi.fn(), logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const e04 = makeEtapa('E04', { estado: 'COMPLETADO', area_responsable: 'OTA' });
    const e05 = makeEtapa('E05', { es_bucle: true, rondas: [] });
    render(
      React.createElement(EtapaCard, {
        etapa: e04,
        allEtapas: [e04, e05],
        procesoId: 1,
        actionability: { canRegister: false, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.queryByRole('button', { name: /Hubo observaciones/i })).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------
  // Cambio 5 — Tooltip DTDIS en E06b
  // ---------------------------------------------------------------

  it("Cambio-5: E06b card has DTDIS tooltip info element", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: null, token: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E06b', { es_bucle: true, area_responsable: 'BUCLE' });
    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    // The DTDIS tooltip element is rendered with data-testid="dtdis-tooltip"
    const tooltip = screen.getByTestId('dtdis-tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveAttribute('title');
    const title = tooltip.getAttribute('title') ?? '';
    expect(title).toMatch(/DTDIS/i);
  });

  // ---------------------------------------------------------------
  // Cambio 6 — CMN tri-estado en E01c
  // ---------------------------------------------------------------

  it("Cambio-6: E01c card shows badge 'CMN SI' in green for SI", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: null, token: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E01c', {
      por_area: true,
      filas: [{
        id: 1, area_usuaria: 'CIDE', estado_etapa: 'COMPLETADO',
        fecha_inicio: null, fecha_fin: null, dias: null,
        cmn_siga_confirmado: 'SI',
      } as FilaArea],
    });
    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    const badge = screen.getByText(/CIDE: CMN SI/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-green-100');
  });

  it("Cambio-6: E01c card shows badge 'CMN NO' in red for NO", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: null, token: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E01c', {
      por_area: true,
      filas: [{
        id: 2, area_usuaria: 'DNCE', estado_etapa: 'COMPLETADO',
        fecha_inicio: null, fecha_fin: null, dias: null,
        cmn_siga_confirmado: 'NO',
      } as FilaArea],
    });
    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    const badge = screen.getByText(/DNCE: CMN NO/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-red-100');
  });

  it("Cambio-6: E01c card shows badge 'CMN EN CURSO' in yellow for EN_CURSO", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: null, token: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E01c', {
      por_area: true,
      filas: [{
        id: 3, area_usuaria: 'DTIE', estado_etapa: 'EN_CURSO',
        fecha_inicio: null, fecha_fin: null, dias: null,
        cmn_siga_confirmado: 'EN_CURSO',
      } as FilaArea],
    });
    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    const badge = screen.getByText(/DTIE: CMN EN CURSO/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-yellow-100');
  });

  it("Cambio-6: E01c card shows badge 'CMN —' in gray for null", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: null, token: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E01c', {
      por_area: true,
      filas: [{
        id: 4, area_usuaria: 'OTD', estado_etapa: 'PENDIENTE',
        fecha_inicio: null, fecha_fin: null, dias: null,
        cmn_siga_confirmado: null,
      } as FilaArea],
    });
    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    const badge = screen.getByText(/OTD: CMN —/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-gray-100');
  });

  it("card has neutral background — actor color no longer set as inline bg on card", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    // Use E01a (replaces E01 in flujo-real-otin-v2)
    const etapa = makeEtapa('E01a', { area_responsable: 'AREAS' });
    const { container } = render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    // Actor color (#E8F5E9) is NOT applied as inline backgroundColor on the card article
    const article = container.querySelector('article');
    expect(article).not.toHaveStyle({ backgroundColor: '#E8F5E9' });

    // The left-border color IS set inline (estado color bar), not the actor bg
    // For PENDIENTE estado, bar color is #D97706
    expect(article).toHaveStyle({ borderLeftColor: '#D97706' });
  });

  // ---------------------------------------------------------------
  // New layout: actor chip + estado pill + expand/collapse
  // ---------------------------------------------------------------

  it("actor chip is present with the actor label", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E02', { area_responsable: 'OTIN' });
    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId('actor-chip')).toBeInTheDocument();
    expect(screen.getByTestId('actor-chip')).toHaveTextContent('OTIN');
  });

  it("estado pill renders with correct label for EN_CURSO", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E02', { estado: 'EN_CURSO' });
    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId('estado-pill')).toHaveTextContent('En Curso');
  });

  it("estado pill renders with correct label for COMPLETADO", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E03', { estado: 'COMPLETADO' });
    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId('estado-pill')).toHaveTextContent('Completado');
  });

  it("expand toggle is present when etapa has observaciones", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E02', {
      estado: 'COMPLETADO',
      filas: [{
        id: 5, area_usuaria: 'OTIN', estado_etapa: 'COMPLETADO',
        fecha_inicio: '2026-01-10', fecha_fin: '2026-01-15', dias: 5,
        observaciones: 'TDR revisado y aprobado.',
      } as FilaArea],
    });

    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId('expand-toggle')).toBeInTheDocument();
  });

  it("clicking expand toggle reveals observaciones in detail panel", async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E02', {
      estado: 'COMPLETADO',
      filas: [{
        id: 5, area_usuaria: 'OTIN', estado_etapa: 'COMPLETADO',
        fecha_inicio: '2026-01-10', fecha_fin: '2026-01-15', dias: 5,
        observaciones: 'TDR revisado y aprobado.',
      } as FilaArea],
    });

    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    // detail panel hidden initially
    expect(screen.queryByTestId('detail-panel')).not.toBeInTheDocument();

    // click expand
    await user.click(screen.getByTestId('expand-toggle'));

    // detail panel now visible with observaciones text
    expect(screen.getByTestId('detail-panel')).toBeInTheDocument();
    expect(screen.getByText('TDR revisado y aprobado.')).toBeInTheDocument();
  });

  it("clicking expand toggle twice collapses the detail panel", async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    const etapa = makeEtapa('E02', {
      estado: 'COMPLETADO',
      filas: [{
        id: 5, area_usuaria: 'OTIN', estado_etapa: 'COMPLETADO',
        fecha_inicio: '2026-01-10', fecha_fin: null, dias: null,
        oficio_correo: 'Oficio N° 001-2026',
      } as FilaArea],
    });

    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    const toggle = screen.getByTestId('expand-toggle');
    await user.click(toggle);
    expect(screen.getByTestId('detail-panel')).toBeInTheDocument();

    await user.click(toggle);
    expect(screen.queryByTestId('detail-panel')).not.toBeInTheDocument();
  });

  it("expand toggle is NOT present when etapa has no detail content", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    // E04 has no acepta_adjuntos, no observaciones, no oficio — no toggle expected
    const etapa = makeEtapa('E04', {
      area_responsable: 'OTA',
      estado: 'PENDIENTE',
      filas: [],
    });

    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    expect(screen.queryByTestId('expand-toggle')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------
  // Bug #6: "No aplica" must use PUT when a row already exists
  // ---------------------------------------------------------------

  it("BUG-6: 'No aplica' click calls useRegistrarEtapa (POST) when etapa has no filas", async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    const mockRegistrarMutate = vi.fn();
    const mockActualizarMutate = vi.fn();
    vi.mocked(useRegistrarEtapa).mockReturnValue({
      mutate: mockRegistrarMutate,
      isPending: false,
    } as ReturnType<typeof useRegistrarEtapa>);
    vi.mocked(useActualizarEtapa).mockReturnValue({
      mutate: mockActualizarMutate,
      isPending: false,
    } as ReturnType<typeof useActualizarEtapa>);

    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
      token: "t",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    // No filas: should POST
    const etapa = makeEtapa('E03', { estado: 'PENDIENTE', es_bucle: false, por_area: false, filas: [] });

    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    await user.click(screen.getByRole('button', { name: /Marcar E03 como No aplica/i }));

    expect(mockRegistrarMutate).toHaveBeenCalledOnce();
    expect(mockActualizarMutate).not.toHaveBeenCalled();
    const [payload] = mockRegistrarMutate.mock.calls[0] as [{ estado_etapa: string }];
    expect(payload.estado_etapa).toBe('NO_APLICA');
  });

  it("BUG-6: 'No aplica' click calls useActualizarEtapa (PUT) when etapa already has filas[0]", async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    const mockRegistrarMutate = vi.fn();
    const mockActualizarMutate = vi.fn();
    vi.mocked(useRegistrarEtapa).mockReturnValue({
      mutate: mockRegistrarMutate,
      isPending: false,
    } as ReturnType<typeof useRegistrarEtapa>);
    vi.mocked(useActualizarEtapa).mockReturnValue({
      mutate: mockActualizarMutate,
      isPending: false,
    } as ReturnType<typeof useActualizarEtapa>);

    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 1, username: "editor", nombre_completo: "Editor", rol: "EDITOR", area: null },
      token: "t",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    // Has existing fila with id=42: should PUT
    const etapa = makeEtapa('E03', {
      estado: 'PENDIENTE',
      es_bucle: false,
      por_area: false,
      filas: [{
        id: 42,
        area_usuaria: 'OTIN',
        estado_etapa: 'PENDIENTE',
        fecha_inicio: null,
        fecha_fin: null,
        dias: null,
      } as FilaArea],
    });

    render(
      React.createElement(EtapaCard, {
        etapa,
        allEtapas: [etapa],
        procesoId: 1,
        actionability: { canRegister: true, blockedReason: null },
        onRegistrar: vi.fn(),
      }),
      { wrapper: Wrapper }
    );

    await user.click(screen.getByRole('button', { name: /Marcar E03 como No aplica/i }));

    expect(mockActualizarMutate).toHaveBeenCalledOnce();
    expect(mockRegistrarMutate).not.toHaveBeenCalled();
    const [callArg] = mockActualizarMutate.mock.calls[0] as [{ etapaId: number; payload: { estado_etapa: string } }];
    expect(callArg.etapaId).toBe(42);
    expect(callArg.payload.estado_etapa).toBe('NO_APLICA');
  });
});
