"use client";

import React from "react";
import type { TiemposProceso } from "@/types/etapa";

interface TablaTiemposProps {
  data: TiemposProceso | undefined;
  isLoading: boolean;
}

function formatFecha(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function TablaTiempos({ data, isLoading }: TablaTiemposProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-500 text-sm" aria-live="polite">
        Cargando tiempos...
      </div>
    );
  }

  if (!data || data.intervalos.length === 0) {
    return (
      <div className="py-10 text-center text-gray-500 text-sm">
        Sin intervalos: el proceso aún no tiene suficientes hitos fechados.
      </div>
    );
  }

  const cuelloCod = data.cuello_de_botella?.cod ?? null;
  const slowestArea = data.por_area[0]?.area ?? "-";

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-gray-500 text-xs uppercase tracking-wide border-b border-gray-200">
              <th className="py-2 pr-4 font-semibold">Tramo</th>
              <th className="py-2 pr-4 font-semibold">Área</th>
              <th className="py-2 pr-4 font-semibold">Desde</th>
              <th className="py-2 pr-4 font-semibold">Hasta</th>
              <th className="py-2 font-semibold text-right">Días</th>
            </tr>
          </thead>
          <tbody>
            {data.intervalos.map((intervalo) => {
              const isBottleneck = intervalo.cod === cuelloCod;
              return (
                <tr
                  key={intervalo.cod}
                  className={[
                    "border-b border-gray-100",
                    isBottleneck ? "bg-red-50 text-red-700" : "text-gray-800",
                  ].join(" ")}
                >
                  <td className="py-2 pr-4">
                    <span className="font-mono text-xs font-semibold mr-1.5">
                      {intervalo.cod}
                    </span>
                    <span className="text-gray-600">{intervalo.nombre}</span>
                  </td>
                  <td className="py-2 pr-4">{intervalo.area_responsable}</td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {formatFecha(intervalo.desde)}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {formatFecha(intervalo.hasta)}
                  </td>
                  <td
                    className={[
                      "py-2 text-right font-semibold",
                      isBottleneck ? "text-red-700" : "text-gray-900",
                    ].join(" ")}
                  >
                    {intervalo.dias}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-100">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
            Total días
          </span>
          <span className="text-2xl font-bold text-primary">{data.total_dias}</span>
        </div>
        {data.cuello_de_botella && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              Cuello de botella
            </span>
            <span className="text-sm font-semibold text-red-700">
              {data.cuello_de_botella.cod} - {data.cuello_de_botella.dias} días
            </span>
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
            Área más lenta
          </span>
          <span className="text-sm font-semibold text-gray-800">{slowestArea}</span>
        </div>
      </div>
    </div>
  );
}
