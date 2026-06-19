/**
 * Date helpers.
 *
 * The backend returns ISO date-only strings ("YYYY-MM-DD"). `new Date("YYYY-MM-DD")`
 * parses them as UTC midnight, so in negative-offset timezones (Peru = UTC-5) the
 * displayed day shifts one day backwards. These helpers parse as LOCAL date to avoid
 * that off-by-one. Use them for any date-only field; do NOT use for full timestamps.
 */

/** Parse an ISO date-only string ("YYYY-MM-DD") as a local Date (no TZ shift). */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Short date "dd/mm/aa" (es-PE) from an ISO date-only string. Returns "—" when empty. */
export function formatFechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  return parseLocalDate(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/** Long date "26 de mayo de 2026" (es-PE) from an ISO date-only string. Returns "—" when empty. */
export function formatFechaLarga(iso: string | null | undefined): string {
  if (!iso) return "—";
  return parseLocalDate(iso).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
