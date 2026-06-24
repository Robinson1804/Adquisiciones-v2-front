"use client";

/**
 * Dashboard Gerencial — Adquisiciones TIC · INEI / OTIN.
 * Diseño institucional editorial: pipeline por fase como hero, semáforo de
 * demora coherente (líneas/bordes/texto/gráfico) y panel ejecutivo derecho.
 * Wireado a datos reales (flujo-procesos + procesos + presupuesto + métricas).
 */

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useMetricas, useFlujoProcesos, usePresupuesto } from "@/hooks/useDashboard";
import { useProcesos } from "@/hooks/useProcesos";
import { faseDeEtapa, FASES } from "@/lib/fases";
import type { ProcesoFlujo } from "@/types/dashboard";
import type { Proceso, TipoProceso } from "@/types";

// ── Paleta INEI institucional ───────────────────────────────────────────
const C = {
  dark: "#002F6C", mid: "#0B4E9E", light: "#1A6FD4", pale: "#E8F0FB",
  ok: "#1A7A4A", okBg: "#EAF5EF", okBright: "#22C55E",
  warn: "#B45309", warnBg: "#FEF3E2", warnBright: "#F59E0B",
  crit: "#9B1C1C", critBg: "#FEF2F2", critBright: "#EF4444",
  bg: "#F2F5FA", paper: "#FFFFFF", ink: "#0A1628", ink2: "#2C3E60", ink3: "#7A8BA8",
  rule: "#D0D9E8", rule2: "#E8EDF5",
};
const F = {
  syne: "'Syne', var(--font-sans), sans-serif",
  inter: "'Inter', var(--font-sans), system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'Cascadia Code', monospace",
};

type Sem = "ok" | "warn" | "crit";
const SEM = {
  ok: { txt: C.ok, bg: C.okBg, bright: C.okBright, label: "<90d" },
  warn: { txt: C.warn, bg: C.warnBg, bright: C.warnBright, label: "90–150d" },
  crit: { txt: C.crit, bg: C.critBg, bright: C.critBright, label: ">150d" },
} as const;

function cls(dias: number): Sem {
  if (dias > 150) return "crit";
  if (dias >= 90) return "warn";
  return "ok";
}

const CURRENT_YEAR = new Date().getFullYear();
const DAY_MS = 86_400_000;

const fmtMoney = new Intl.NumberFormat("es-PE", {
  style: "currency", currency: "PEN", minimumFractionDigits: 0, maximumFractionDigits: 0,
});
function moneyShort(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `S/ ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `S/ ${Math.round(n / 1_000)}K`;
  return `S/ ${Math.round(n)}`;
}

function phaseNum(flujo: ProcesoFlujo | undefined, estado: string): number {
  if (estado === "CULMINADO") return 5;
  if (flujo?.etapa_actual) return faseDeEtapa(flujo.etapa_actual);
  const m = flujo?.fase_actual?.match(/^F([1-5])$/);
  if (m?.[1]) return Number(m[1]);
  return 1;
}

interface Req {
  id: number;
  idp: string;
  desc: string;
  tipo: TipoProceso | null;
  dias: number;
  fase: number;
  faseNombre: string;
  pim: number | null;
  estado: string;
  sem: Sem;
}

// ── UI atoms ────────────────────────────────────────────────────────────
const TIPOS: Array<{ value: TipoProceso | ""; label: string }> = [
  { value: "", label: "Todos los tipos" },
  { value: "BIEN", label: "Bien" },
  { value: "SERVICIO", label: "Servicio" },
];

const FILTROS: Array<{ key: "todos" | Sem; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "crit", label: "Críticos" },
  { key: "warn", label: "En alerta" },
  { key: "ok", label: "En plazo" },
];

function selectStyle(): React.CSSProperties {
  return {
    fontFamily: F.inter, fontSize: 12, color: C.ink2, background: C.paper,
    border: `1px solid ${C.rule}`, padding: "5px 8px", outline: "none",
  };
}

export default function DashboardPage() {
  const [anno, setAnno] = useState(CURRENT_YEAR);
  const [unidad, setUnidad] = useState("");
  const [tipo, setTipo] = useState<TipoProceso | "">("");
  const [filtro, setFiltro] = useState<"todos" | Sem>("todos");

  const metricas = useMetricas(anno);
  const flujo = useFlujoProcesos(anno);
  const presupuesto = usePresupuesto(anno);
  const procesosQuery = useProcesos({ anno, page_size: 100 });

  const loading = flujo.isLoading || procesosQuery.isLoading;
  const procesosList: Proceso[] = procesosQuery.data?.items ?? [];
  const flujoById = useMemo(() => {
    const map = new Map<number, ProcesoFlujo>();
    for (const f of flujo.data?.procesos ?? []) map.set(f.id, f);
    return map;
  }, [flujo.data]);

  const unidadOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const p of procesosList) if (p.unidad_resp) seen.add(p.unidad_resp);
    return Array.from(seen).sort();
  }, [procesosList]);

  // ── construir requerimientos (datos reales) ────────────────────────────
  const reqs: Req[] = useMemo(() => {
    return procesosList
      .filter((p) => p.estado !== "CANCELADO")
      .filter((p) => (!tipo || p.tipo === tipo) && (!unidad || p.unidad_resp === unidad))
      .map((p) => {
        const fl = flujoById.get(p.id);
        const dias = Math.max(
          0,
          Math.floor((Date.now() - new Date(p.fecha_creacion).getTime()) / DAY_MS)
        );
        const fase = phaseNum(fl, p.estado);
        const faseDef = FASES.find((x) => x.num === fase);
        return {
          id: p.id,
          idp: p.id_proceso,
          desc: p.requerimiento,
          tipo: p.tipo,
          dias,
          fase,
          faseNombre: faseDef?.corto ?? "—",
          pim: p.pim != null ? parseFloat(p.pim) : null,
          estado: p.estado,
          sem: cls(dias),
        };
      });
  }, [procesosList, flujoById, tipo, unidad]);

  const activos = useMemo(() => reqs.filter((r) => r.estado === "EN PROCESO"), [reqs]);

  // ── KPIs derivados ─────────────────────────────────────────────────────
  const okN = activos.filter((r) => r.sem === "ok").length;
  const warnN = activos.filter((r) => r.sem === "warn").length;
  const critN = activos.filter((r) => r.sem === "crit").length;
  const promDias = activos.length
    ? Math.round(activos.reduce((s, r) => s + r.dias, 0) / activos.length)
    : 0;
  const masDemorado = useMemo(
    () => [...activos].sort((a, b) => b.dias - a.dias)[0],
    [activos]
  );
  const LIMITE = 150;

  // fase con más carga
  const cargaPorFase = useMemo(() => {
    const counts = new Map<number, number>();
    for (const r of activos) counts.set(r.fase, (counts.get(r.fase) ?? 0) + 1);
    let bestNum = 0, bestCount = -1;
    for (const f of FASES) {
      const c = counts.get(f.num) ?? 0;
      if (c > bestCount) { bestCount = c; bestNum = f.num; }
    }
    const def = FASES.find((x) => x.num === bestNum);
    return { nombre: def?.corto ?? "—", count: bestCount < 0 ? 0 : bestCount };
  }, [activos]);

  const tot = presupuesto.data?.totales;
  const pim = tot?.pim ?? null;
  const cert = tot?.monto_cert_total ?? null;
  const ocs = tot?.monto_ocs ?? null;
  const ejecucionPct = pim && pim > 0 && ocs != null ? (ocs / pim) * 100 : 0;

  // ── pipeline (filtro semáforo aplicado) ────────────────────────────────
  const reqsFiltrados = useMemo(
    () => (filtro === "todos" ? reqs : reqs.filter((r) => r.sem === filtro)),
    [reqs, filtro]
  );
  const porFase = useMemo(() => {
    const map = new Map<number, Req[]>(FASES.map((f) => [f.num, []]));
    for (const r of reqsFiltrados) map.get(r.fase)?.push(r);
    for (const f of FASES) map.get(f.num)?.sort((a, b) => b.dias - a.dias);
    return map;
  }, [reqsFiltrados]);

  const criticos = useMemo(
    () => [...activos].filter((r) => r.sem === "crit").sort((a, b) => b.dias - a.dias),
    [activos]
  );

  const chartData = [
    { name: "<90d", v: okN, c: C.okBright },
    { name: "90–150d", v: warnN, c: C.warnBright },
    { name: ">150d", v: critN, c: C.critBright },
  ];

  const annos = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

  return (
    <div style={{ background: C.bg, color: C.ink, fontFamily: F.inter, margin: -16, padding: 16 }}>
      {/* ── TOPBAR ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between",
          gap: 12, background: C.paper, borderBottom: `2px solid ${C.dark}`,
          padding: "10px 14px", marginBottom: 14,
        }}
      >
        <div>
          <div style={{ fontFamily: F.syne, fontWeight: 700, fontSize: 16, color: C.dark, letterSpacing: ".2px" }}>
            Adquisiciones TIC
          </div>
          <div style={{ fontFamily: F.inter, fontSize: 11, color: C.ink3 }}>
            Seguimiento de requerimientos · OTIN
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <select aria-label="Año" value={anno} onChange={(e) => setAnno(Number(e.target.value))} style={selectStyle()}>
            {annos.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select aria-label="Unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)} style={selectStyle()}>
            <option value="">Todas las unidades</option>
            {unidadOptions.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <select aria-label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoProceso | "")} style={selectStyle()}>
            {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F.mono, fontSize: 11, color: C.ok }}>
            <span className="inei-pulse" style={{ width: 7, height: 7, background: C.okBright, borderRadius: "50%" }} />
            En línea
          </span>
          <Link
            href="/presentacion"
            style={{
              fontFamily: F.syne, fontSize: 11, fontWeight: 700, letterSpacing: ".5px",
              textTransform: "uppercase", background: C.dark, color: "#fff", padding: "7px 12px",
            }}
          >
            Presentación
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes ineiPulse { 0%,100%{opacity:1} 50%{opacity:.25} }
        .inei-pulse{ animation: ineiPulse 1.6s ease-in-out infinite; }
        .rc-card:hover{ background:#F0F5FF !important; }
        .flt:hover{ background:${C.pale}; color:${C.mid}; }
      `}</style>

      {/* ── 1. PULSO — 3 KPIs ──────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", background: C.paper, border: `1px solid ${C.rule}`, marginBottom: 14 }}>
        <KpiCell
          tone={C.okBright}
          label="Requerimientos activos"
          value={String(activos.length)}
          valueColor={C.ok}
          sub="en proceso de compra"
          foot={`${okN} en plazo · ${warnN + critN} en alerta o crítico`}
          right
        />
        <KpiCell
          tone={C.warnBright}
          label="Promedio de demora"
          value={`${promDias}`}
          unit="días"
          valueColor={C.warn}
          sub="sobre requerimientos activos"
          foot={`límite jefatura ${LIMITE}d · ${promDias > LIMITE ? `exceso ${promDias - LIMITE}d` : "dentro del límite"}`}
          right
        />
        <KpiCell
          tone={C.critBright}
          label="Críticos +150 días"
          value={String(critN)}
          valueColor={C.crit}
          sub="requieren acción inmediata"
          foot={
            masDemorado && masDemorado.sem === "crit"
              ? `${masDemorado.idp} (${masDemorado.dias}d) · ${masDemorado.faseNombre}`
              : "sin requerimientos críticos"
          }
        />
      </div>

      {/* ── 2. STRIP PIM — 4 columnas ──────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", background: C.paper, border: `1px solid ${C.rule}`, marginBottom: 14 }}>
        <PimCell label="PIM total" value={pim != null ? fmtMoney.format(pim) : "—"} sub="presupuesto modificado" pct={100} />
        <PimCell label="Certificado" value={cert != null ? fmtMoney.format(cert) : "—"} sub="certificaciones registradas" pct={pim && cert ? (cert / pim) * 100 : 0} color={C.mid} />
        <PimCell label="Comprometido" value={ocs != null ? fmtMoney.format(ocs) : "—"} sub="monto O/S registrado" pct={pim && ocs ? (ocs / pim) * 100 : 0} color={C.light} />
        <PimCell label="Devengado" value="—" sub="sin fuente registrada" pct={0} muted />
      </div>

      {/* ── 3. PIPELINE HERO + PANEL DERECHO ───────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 264px", border: `1px solid ${C.rule}`, background: C.paper, marginBottom: 14 }}>
        {/* PIPELINE */}
        <div style={{ minWidth: 0 }}>
          {/* cabecera */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", borderBottom: `1px solid ${C.rule}` }}>
            <div style={{ fontFamily: F.syne, fontWeight: 700, fontSize: 13, textTransform: "uppercase", color: C.dark, borderBottom: `2px solid ${C.dark}`, paddingBottom: 3, letterSpacing: ".4px" }}>
              Pipeline por fase
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 4 }}>
                {FILTROS.map((f) => {
                  const active = filtro === f.key;
                  return (
                    <button
                      key={f.key}
                      className="flt"
                      onClick={() => setFiltro(f.key)}
                      style={{
                        fontFamily: F.syne, fontSize: 10, fontWeight: 600, textTransform: "uppercase",
                        letterSpacing: ".3px", padding: "5px 9px", cursor: "pointer",
                        border: `1px solid ${active ? C.dark : C.rule}`,
                        background: active ? C.dark : C.paper, color: active ? "#fff" : C.ink2,
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {(["ok", "warn", "crit"] as Sem[]).map((s) => (
                  <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: F.mono, fontSize: 9, color: C.ink3 }}>
                    <span style={{ width: 7, height: 7, background: SEM[s].bright }} />
                    {SEM[s].label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* cabecera de fases */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", background: C.pale }}>
            {FASES.map((f) => (
              <div key={f.id} style={{ padding: "8px 10px", borderRight: `1px solid ${C.rule}` }}>
                <div style={{ fontFamily: F.mono, fontSize: 8, color: C.mid }}>Fase {f.num}</div>
                <div style={{ fontFamily: F.syne, fontWeight: 700, fontSize: 11, color: C.dark, lineHeight: 1.2, marginTop: 2 }}>{f.corto}</div>
                <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 22, color: C.dark, marginTop: 2 }}>
                  {loading ? "·" : (porFase.get(f.num)?.length ?? 0)}
                </div>
              </div>
            ))}
          </div>

          {/* columnas */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", minHeight: 280 }}>
            {FASES.map((f) => {
              const list = porFase.get(f.num) ?? [];
              return (
                <div key={f.id} style={{ padding: 8, borderRight: `1px solid ${C.rule}`, display: "flex", flexDirection: "column", gap: 8 }}>
                  {loading ? (
                    <div style={{ textAlign: "center", color: C.ink3, fontFamily: F.mono, fontSize: 18, paddingTop: 20 }}>·</div>
                  ) : list.length === 0 ? (
                    <div style={{ textAlign: "center", color: C.rule, fontFamily: F.mono, fontSize: 20, paddingTop: 20 }}>—</div>
                  ) : (
                    list.map((r) => <ReqCard key={r.id} r={r} />)
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL DERECHO */}
        <div style={{ borderLeft: `1px solid ${C.rule}`, display: "flex", flexDirection: "column" }}>
          {/* A. Distribución */}
          <PanelHeader title="Distribución de demora" note="reqs. activos" />
          <div style={{ padding: "6px 10px 12px" }}>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 4 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontFamily: F.mono, fontSize: 8, fill: C.ink3 }} axisLine={{ stroke: C.rule }} tickLine={false} />
                <YAxis type="category" dataKey="name" width={48} tick={{ fontFamily: F.mono, fontSize: 8, fill: C.ink3 }} axisLine={{ stroke: C.rule }} tickLine={false} />
                <Tooltip cursor={{ fill: C.pale }} contentStyle={{ fontFamily: F.mono, fontSize: 11, border: `1px solid ${C.rule}`, borderRadius: 0 }} />
                <Bar dataKey="v" barSize={18} isAnimationActive={false}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.c} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* B. Resumen ejecutivo */}
          <PanelHeader title="Resumen ejecutivo" note="" />
          <div style={{ padding: "4px 10px 10px" }}>
            <ResumenRow k="Total requerimientos" v={String(reqs.length)} />
            <ResumenRow k="Más demorado" v={masDemorado ? `${masDemorado.idp} · ${masDemorado.dias}d` : "—"} color={masDemorado?.sem === "crit" ? C.crit : C.ink2} />
            <ResumenRow k="Promedio días" v={`${promDias}d`} color={C.warn} />
            <ResumenRow k="Fase con más carga" v={`${cargaPorFase.nombre} (${cargaPorFase.count})`} />
            <ResumenRow k="PIM disponible" v={moneyShort(pim)} />
            <ResumenRow k="Ejecución" v={`${ejecucionPct.toFixed(0)}%`} color={ejecucionPct === 0 ? C.ink3 : C.ink2} last />
          </div>

          {/* C. Alertas */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "8px 10px 6px", borderTop: `1px solid ${C.rule}` }}>
            <span style={{ fontFamily: F.syne, fontWeight: 700, fontSize: 11, textTransform: "uppercase", color: C.crit, letterSpacing: ".4px" }}>Alertas</span>
            <span style={{ fontFamily: F.mono, fontSize: 8, color: C.ink3 }}>acción requerida</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.critBg, padding: "5px 10px" }}>
            <span style={{ fontFamily: F.syne, fontSize: 10, fontWeight: 600, color: C.crit, textTransform: "uppercase" }}>Críticos</span>
            <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: "#fff", background: C.crit, padding: "1px 7px" }}>{criticos.length}</span>
          </div>
          <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {criticos.length === 0 ? (
              <span style={{ fontFamily: F.inter, fontSize: 11, color: C.ink3 }}>Sin requerimientos críticos.</span>
            ) : (
              criticos.slice(0, 6).map((r) => (
                <div key={r.id} style={{ borderLeft: `3px solid ${C.crit}`, paddingLeft: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                    <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: C.crit }}>{r.idp}</span>
                    <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: C.crit }}>{r.dias}d</span>
                  </div>
                  <div style={{ fontFamily: F.inter, fontSize: 11, color: C.ink2, lineHeight: 1.3, marginTop: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {r.desc}
                  </div>
                  <div style={{ fontFamily: F.mono, fontSize: 8, color: C.ink3, marginTop: 2 }}>
                    {r.faseNombre} · {moneyShort(r.pim)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, fontFamily: F.mono, fontSize: 9, color: C.ink3, padding: "4px 2px" }}>
        <span>INEI · OTIN — Oficina de Tecnología de la Información</span>
        <span>Ejercicio fiscal {anno} · {reqs.length} requerimientos · pipeline en vivo</span>
      </div>

      {(metricas.isError || presupuesto.isError || flujo.isError) && (
        <div style={{ marginTop: 10, background: C.critBg, border: `1px solid ${C.crit}`, color: C.crit, fontFamily: F.inter, fontSize: 12, padding: 10 }} role="alert">
          Error al cargar indicadores. Verifique su conexión con el backend.
        </div>
      )}
    </div>
  );
}

// ── sub-componentes ───────────────────────────────────────────────────────
function KpiCell({
  tone, label, value, unit, valueColor, sub, foot, right,
}: {
  tone: string; label: string; value: string; unit?: string; valueColor: string;
  sub: string; foot: string; right?: boolean;
}) {
  return (
    <div style={{ borderRight: right ? `1px solid ${C.rule}` : undefined, position: "relative" }}>
      <div style={{ height: 3, background: tone }} />
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ fontFamily: F.syne, fontSize: 9, fontWeight: 600, textTransform: "uppercase", color: C.ink3, letterSpacing: ".5px" }}>{label}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
          <span style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 44, lineHeight: 1, color: valueColor }}>{value}</span>
          {unit && <span style={{ fontFamily: F.mono, fontSize: 13, color: valueColor }}>{unit}</span>}
        </div>
        <div style={{ fontFamily: F.inter, fontSize: 10, color: C.ink3, marginTop: 6 }}>{sub}</div>
        <div style={{ borderTop: `1px solid ${C.rule2}`, marginTop: 10, paddingTop: 8, fontFamily: F.mono, fontSize: 9, color: C.ink2 }}>{foot}</div>
      </div>
    </div>
  );
}

function PimCell({
  label, value, sub, pct, color = C.dark, muted,
}: {
  label: string; value: string; sub: string; pct: number; color?: string; muted?: boolean;
}) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ padding: "10px 14px 0", borderRight: `1px solid ${C.rule}` }}>
      <div style={{ fontFamily: F.mono, fontSize: 8, textTransform: "uppercase", color: C.ink3, letterSpacing: ".5px" }}>{label}</div>
      <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 18, color: muted ? C.ink3 : C.ink, marginTop: 4 }}>{value}</div>
      <div style={{ fontFamily: F.inter, fontSize: 9, color: C.ink3, marginTop: 2 }}>{sub}</div>
      <div style={{ height: 2, background: C.rule2, marginTop: 8 }}>
        <div style={{ height: 2, width: `${w}%`, background: muted ? C.rule : color }} />
      </div>
    </div>
  );
}

function ReqCard({ r }: { r: Req }) {
  const s = SEM[r.sem];
  const tipoColor = r.tipo === "SERVICIO" ? C.ok : C.mid;
  return (
    <div
      className="rc-card"
      style={{ background: C.paper, borderLeft: `3px solid ${s.bright}`, border: `1px solid ${C.rule2}`, borderLeftWidth: 3, borderLeftColor: s.bright }}
      title={r.desc}
    >
      <div style={{ padding: "7px 10px 0 10px" }}>
        <div style={{ fontFamily: F.mono, fontSize: 8, color: C.ink3 }}>{r.idp}</div>
        <div style={{ fontFamily: F.inter, fontWeight: 600, fontSize: 11, color: C.ink, lineHeight: 1.3, marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {r.desc}
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${C.rule2}`, marginTop: 7, display: "grid", gridTemplateColumns: "1fr 1px 1fr 1px 1fr" }}>
        <RcPart label="Días" value={`${r.dias}d`} color={s.txt} />
        <div style={{ background: C.rule2 }} />
        <RcPart label="Tipo" value={r.tipo === "SERVICIO" ? "Servicio" : r.tipo === "BIEN" ? "Bien" : "—"} color={tipoColor} />
        <div style={{ background: C.rule2 }} />
        <RcPart label="PIM" value={moneyShort(r.pim)} color={C.ink2} />
      </div>
    </div>
  );
}

function RcPart({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: "5px 7px 6px" }}>
      <div style={{ fontFamily: F.mono, fontSize: 7, textTransform: "uppercase", color: C.ink3 }}>{label}</div>
      <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 13, color, marginTop: 1 }}>{value}</div>
    </div>
  );
}

function PanelHeader({ title, note }: { title: string; note: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "8px 10px 6px", borderBottom: `1px solid ${C.rule2}` }}>
      <span style={{ fontFamily: F.syne, fontWeight: 700, fontSize: 11, textTransform: "uppercase", color: C.dark, letterSpacing: ".4px" }}>{title}</span>
      {note && <span style={{ fontFamily: F.mono, fontSize: 8, color: C.ink3 }}>{note}</span>}
    </div>
  );
}

function ResumenRow({ k, v, color = C.ink2, last }: { k: string; v: string; color?: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, padding: "5px 0", borderBottom: last ? undefined : `1px solid ${C.rule2}` }}>
      <span style={{ fontFamily: F.inter, fontSize: 11, color: C.ink3 }}>{k}</span>
      <span style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 12, color }}>{v}</span>
    </div>
  );
}
