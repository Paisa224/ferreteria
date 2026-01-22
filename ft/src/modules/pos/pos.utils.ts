import { formatMoneyGs, parseMoneyGs } from "../../utils/money";

export const formatMoney = formatMoneyGs;
export const parseMoney = parseMoneyGs;

export function parseError(err: any) {
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(" ");
  if (typeof msg === "string") return msg;
  if (msg?.message) return msg.message;
  return "Ocurrió un error. Intentá nuevamente.";
}

const DECIMAL_UNITS = new Set(["KG", "KGS", "L", "LT", "M", "MT"]);

export function normalizeUnit(unit?: string | null) {
  return (unit ?? "").trim().toUpperCase();
}

export function isDecimalUnit(unit?: string | null) {
  return DECIMAL_UNITS.has(normalizeUnit(unit));
}

export function qtyStep(unit?: string | null) {
  return isDecimalUnit(unit) ? 0.01 : 1;
}

export function qtyDecimals(unit?: string | null) {
  return isDecimalUnit(unit) ? 2 : 0;
}

export function roundQty(value: number, unit?: string | null) {
  const decimals = qtyDecimals(unit);
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatQty(value: number, unit?: string | null) {
  const decimals = qtyDecimals(unit);
  return new Intl.NumberFormat("es-PY", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function paymentMethodLabel(
  method: "CASH" | "QR" | "TRANSFER" | "TC" | "TD" | string,
) {
  switch (method) {
    case "CASH":
      return "Efectivo";
    case "QR":
      return "QR";
    case "TRANSFER":
      return "Transferencia bancaria";
    case "TC":
      return "Tarjeta de crédito";
    case "TD":
      return "Tarjeta de débito";
    default:
      return method;
  }
}
