/**
 * Computes a human-readable period label from startDate and endDate.
 * Dates are in "YYYY-MM" format (e.g. "2025-05").
 * Output uses Bahasa Indonesia (e.g. "Mei 2025 – Feb 2026 · 10 bln").
 */

const MONTHS_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function parseYearMonth(ym: string): { year: number; month: number } {
  const [y, m] = ym.split("-").map(Number);
  return { year: y!, month: m! };
}

function formatMonth(ym: string): string {
  const { year, month } = parseYearMonth(ym);
  return `${MONTHS_ID[month - 1]} ${year}`;
}

function durationLabel(startYm: string, endYm: string): string {
  const start = parseYearMonth(startYm);
  const end = parseYearMonth(endYm);

  const totalMonths =
    (end.year - start.year) * 12 + (end.month - start.month);

  if (totalMonths < 12) {
    return `${totalMonths} bln`;
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (months === 0) return `${years} thn`;
  return `${years} thn ${months} bln`;
}

/**
 * @param startDate  "YYYY-MM"
 * @param endDate    "YYYY-MM" | null | "" (null/empty = present)
 */
export function computePeriodLabel(
  startDate: string,
  endDate: string | null | undefined
): string {
  if (!startDate) return "";

  const startLabel = formatMonth(startDate);
  const now = new Date();
  const nowYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const endYm = endDate || nowYm;
  const endLabel = endDate ? formatMonth(endDate) : "Saat ini";
  const duration = durationLabel(startDate, endYm);

  return `${startLabel} – ${endLabel} · ${duration}`;
}
