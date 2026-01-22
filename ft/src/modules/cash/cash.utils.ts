import { formatMoneyGs } from "../../utils/money";

export const formatMoney = formatMoneyGs;

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("es-PY", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}
