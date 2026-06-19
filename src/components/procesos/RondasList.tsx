"use client";

/**
 * RondasList — collapsible list of rounds for bucle stages.
 * Shows existing rondas and provides an "Agregar ronda" inline form.
 * Spec §K, Design D4.
 */

import React, { useState } from "react";
import type { RondaBucle } from "@/types/etapa";
import { useAgregarRonda } from "@/hooks/useEtapas";
import { COLORES_ACTOR } from "@/lib/constants";
import { formatFechaCorta } from "@/lib/fecha";

interface RondasListProps {
  rondas: RondaBucle[];
  procesoId: number;
  cod: string;
  canAddRonda: boolean;
  blockedReason: string | null;
}

export function RondasList({
  rondas,
  procesoId,
  cod,
  canAddRonda,
  blockedReason,
}: RondasListProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [motivoBucle, setMotivoBucle] = useState("");
  const [tituloRonda, setTituloRonda] = useState("");

  const { mutate: agregarRonda, isPending } = useAgregarRonda(procesoId);

  function handleAgregarRonda(e: React.FormEvent) {
    e.preventDefault();
    if (!motivoBucle.trim()) return;
    agregarRonda(
      {
        cod,
        payload: {
          motivo_bucle: motivoBucle,
          // Cambio 4: send null when empty, string when filled
          titulo_ronda: tituloRonda.trim() || null,
        },
      },
      {
        onSuccess: () => {
          setMotivoBucle("");
          setTituloRonda("");
          setShowAddForm(false);
        },
      }
    );
  }

  return (
    <div className="text-xs">
      {/* Expand/collapse toggle */}
      {rondas.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs underline text-gray-600 hover:text-gray-800"
          aria-expanded={expanded}
          aria-controls={`rondas-${cod}-list`}
        >
          {expanded ? 'Ocultar rondas' : `Ver ${rondas.length} ronda${rondas.length !== 1 ? 's' : ''}`}
        </button>
      )}

      {/* Rondas list */}
      {expanded && (
        <ul
          id={`rondas-${cod}-list`}
          className="mt-1 space-y-1"
          aria-label={`Rondas de ${cod}`}
        >
          {rondas.map((ronda) => (
            <li
              key={ronda.id}
              className="flex flex-col gap-0.5 p-1.5 rounded"
              style={{ backgroundColor: COLORES_ACTOR.BUCLE.bg }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="font-semibold"
                  style={{ color: COLORES_ACTOR.BUCLE.text }}
                >
                  {/* Cambio 4: show title if present */}
                  {ronda.titulo_ronda
                    ? `Ronda ${ronda.nro_ronda} — ${ronda.titulo_ronda}`
                    : `Ronda ${ronda.nro_ronda}`}
                </span>
                <span
                  className="px-1.5 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: ronda.estado_etapa === 'COMPLETADO'
                      ? '#C6EFCE' : ronda.estado_etapa === 'EN_CURSO'
                      ? '#DDEBF7' : '#FFEB9C',
                    color: ronda.estado_etapa === 'COMPLETADO'
                      ? '#276221' : ronda.estado_etapa === 'EN_CURSO'
                      ? '#1F3864' : '#9C5700',
                  }}
                >
                  {ronda.estado_etapa}
                </span>
              </div>
              <p className="text-gray-700">{ronda.motivo_bucle}</p>
              {ronda.fecha_inicio && (
                <span className="text-gray-500">
                  {formatFechaCorta(ronda.fecha_inicio)}
                  {ronda.fecha_fin && ` – ${formatFechaCorta(ronda.fecha_fin)}`}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Add ronda button / form */}
      <div className="mt-1 relative group inline-block">
        {!showAddForm && (
          <button
            type="button"
            onClick={canAddRonda ? () => setShowAddForm(true) : undefined}
            disabled={!canAddRonda}
            className="text-xs px-2 py-0.5 rounded border font-medium
                       disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              borderColor: COLORES_ACTOR.BUCLE.border,
              color: COLORES_ACTOR.BUCLE.text,
              backgroundColor: 'white',
            }}
            aria-label={canAddRonda ? `Agregar ronda a ${cod}` : `Agregar ronda bloqueado`}
            aria-disabled={!canAddRonda}
          >
            + Agregar ronda
          </button>
        )}
        {/* Tooltip */}
        {!canAddRonda && blockedReason && (
          <div
            className="absolute left-0 top-full mt-1 z-10 hidden group-hover:block
                       bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap max-w-xs"
            role="tooltip"
          >
            {blockedReason}
          </div>
        )}
      </div>

      {/* Inline add-ronda form */}
      {showAddForm && (
        <form
          onSubmit={handleAgregarRonda}
          className="mt-1 flex flex-col gap-1"
          aria-label={`Formulario agregar ronda ${cod}`}
        >
          {/* Cambio 4: optional titulo_ronda */}
          <input
            type="text"
            value={tituloRonda}
            onChange={(e) => setTituloRonda(e.target.value)}
            placeholder="Título de la ronda (opcional)..."
            maxLength={200}
            className="text-xs border border-gray-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-yellow-400"
            aria-label="Título de la ronda"
          />
          <textarea
            rows={2}
            value={motivoBucle}
            onChange={(e) => setMotivoBucle(e.target.value)}
            placeholder="Motivo de la ronda..."
            className="text-xs border border-gray-300 rounded px-2 py-1 resize-none w-full focus:outline-none focus:ring-1 focus:ring-yellow-400"
            required
            aria-label="Motivo de la ronda"
          />
          <div className="flex gap-1">
            <button
              type="submit"
              disabled={isPending || !motivoBucle.trim()}
              className="text-xs px-2 py-0.5 rounded font-medium bg-yellow-400 text-yellow-900 disabled:opacity-50"
            >
              {isPending ? 'Guardando...' : 'Guardar ronda'}
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setMotivoBucle(""); setTituloRonda(""); }}
              className="text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-600"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
