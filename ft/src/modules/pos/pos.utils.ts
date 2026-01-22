export function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat("es-PY", {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function parseError(err: any) {
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(" ");
  if (typeof msg === "string") return msg;
  if (msg?.message) return msg.message;
  return "Ocurrió un error. Intentá nuevamente.";
}

export function roundQty(value: number) {
  return Math.round(value * 1000) / 1000;
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
