export function formatMoneyGs(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat("es-PY", {
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function parseMoneyGs(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Math.round(value);
  const cleaned = value.replace(/[^\d]/g, "");
  if (!cleaned) return 0;
  return Number(cleaned);
}
