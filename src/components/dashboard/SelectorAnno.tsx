/**
 * C4 — Shared year selector.
 * Options: current year down to (current - 5). Same range as procesos/page.
 */

import React from "react";

const CURRENT_YEAR = new Date().getFullYear();
const ANNO_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

interface SelectorAnnoProps {
  value: number;
  onChange: (anno: number) => void;
  id?: string;
}

export function SelectorAnno({ value, onChange, id = "anno" }: SelectorAnnoProps) {
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={id}
        className="text-xs font-medium text-gray-600 whitespace-nowrap"
      >
        Año
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border border-outline rounded px-3 py-2 text-sm focus:outline-none
                   focus:ring-2 focus:ring-primary/30"
      >
        {ANNO_OPTIONS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
