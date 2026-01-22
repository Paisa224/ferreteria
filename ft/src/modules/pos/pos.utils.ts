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

export function qtyStep(_unit?: string | null) {
  return 1;
}

export function qtyDecimals(_unit?: string | null) {
  return 0;
}

export function roundQty(value: number, _unit?: string | null) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

export function formatQty(value: number, _unit?: string | null) {
  return new Intl.NumberFormat("es-PY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value ?? 0)));
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
