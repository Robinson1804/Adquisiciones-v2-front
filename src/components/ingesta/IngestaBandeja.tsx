"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useIngesta,
  useIngestaAprobados,
  useIngestaAprobadosAuto,
  useIngestaRechazados,
} from "@/hooks/useIngesta";
import type { CorreoIngesta } from "@/types/ingesta";
import { CorreoCard } from "./CorreoCard";

type TabKey = "aprobados" | "pendientes" | "rechazados";

function parseTab(value: string | null): TabKey | null {
  return value === "pendientes" || value === "rechazados" || value === "aprobados"
    ? value
    : null;
}

function sortByDate(items: CorreoIngesta[]): CorreoIngesta[] {
  return [...items].sort((a, b) => {
    const da = new Date(a.received_at ?? a.revisado_en ?? a.creado_en).getTime();
    const db = new Date(b.received_at ?? b.revisado_en ?? b.creado_en).getTime();
    return db - da;
  });
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="text-gray-400 text-xs mt-1">
        Sincronizá Exchange desde el panel superior para cargar candidatos.
      </p>
    </div>
  );
}

export function IngestaBandeja() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const correoParam = searchParams.get("correo");
  const selectedCorreoId = correoParam ? Number(correoParam) : null;
  const urlTab = parseTab(tabParam);
  const [activeTab, setActiveTab] = useState<TabKey>(urlTab ?? "aprobados");
  const pendientesQuery = useIngesta();
  const aprobadosQuery = useIngestaAprobados();
  const aprobadosAutoQuery = useIngestaAprobadosAuto();
  const rechazadosQuery = useIngestaRechazados();

  const isLoading =
    pendientesQuery.isLoading ||
    aprobadosQuery.isLoading ||
    aprobadosAutoQuery.isLoading ||
    rechazadosQuery.isLoading;
  const isError =
    pendientesQuery.isError ||
    aprobadosQuery.isError ||
    aprobadosAutoQuery.isError ||
    rechazadosQuery.isError;

  const pendientes = useMemo(
    () => sortByDate(pendientesQuery.data?.items ?? []),
    [pendientesQuery.data?.items]
  );
  const aprobados = useMemo(
    () =>
      sortByDate([
        ...(aprobadosQuery.data?.items ?? []),
        ...(aprobadosAutoQuery.data?.items ?? []),
      ]),
    [aprobadosQuery.data?.items, aprobadosAutoQuery.data?.items]
  );
  const rechazados = useMemo(
    () => sortByDate(rechazadosQuery.data?.items ?? []),
    [rechazadosQuery.data?.items]
  );

  const tabs: Array<{
    key: TabKey;
    label: string;
    description: string;
    items: CorreoIngesta[];
  }> = [
    {
      key: "aprobados",
      label: "Aprobados",
      description: "Correos vinculados a procesos. Se muestran primero para seguimiento.",
      items: aprobados,
    },
    {
      key: "pendientes",
      label: "Por revisar",
      description: "Correos que requieren aprobación o rechazo manual.",
      items: pendientes,
    },
    {
      key: "rechazados",
      label: "Rechazados",
      description: "Correos retirados de la bandeja. Podés restaurarlos si fue un error.",
      items: rechazados,
    },
  ];

  const current = tabs.find((tab) => tab.key === activeTab) ?? tabs[0]!;
  const totalGeneral = pendientes.length + aprobados.length + rechazados.length;

  React.useEffect(() => {
    if (urlTab) setActiveTab(urlTab);
  }, [urlTab]);

  React.useEffect(() => {
    if (!selectedCorreoId || isLoading) return;
    const target = document.getElementById(`correo-${selectedCorreoId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedCorreoId, isLoading, activeTab, current.items.length]);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-16 text-gray-500 text-sm"
        role="status"
        aria-live="polite"
      >
        Cargando bandeja de ingesta...
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="bg-red-50 border border-red-200 rounded-lg p-6 text-center"
        role="alert"
      >
        <p className="text-sm text-red-700 font-medium">
          Error al cargar los correos. Recargá la página.
        </p>
      </div>
    );
  }

  if (totalGeneral === 0) {
    return <EmptyState label="No hay correos de ingesta registrados." />;
  }

  return (
    <div className="space-y-4" aria-label="Bandeja de ingesta de correos">
      <div className="bg-white border border-gray-200 rounded-lg p-2">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map((tab) => {
            const selected = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`h-10 rounded text-sm font-semibold transition-colors ${
                  selected
                    ? "bg-primary text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab.label}
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    selected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {tab.items.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="space-y-3" data-testid={`seccion-${current.key}`}>
        <div>
          <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {current.label}
          </h2>
          <p className="text-xs text-gray-400 mt-1">{current.description}</p>
        </div>

        {current.items.length === 0 ? (
          <EmptyState
            label={
              current.key === "aprobados"
                ? "No hay correos aprobados todavía."
                : current.key === "pendientes"
                  ? "No hay correos pendientes de revisión."
                  : "No hay correos rechazados."
            }
          />
        ) : (
          <div className="space-y-3">
            {current.items.map((correo) => (
              <CorreoCard
                key={correo.id}
                correo={correo}
                highlighted={correo.id === selectedCorreoId}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
