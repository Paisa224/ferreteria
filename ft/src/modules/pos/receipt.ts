import type { SaleResponse } from "./pos.types";
import { formatMoney, formatQty, paymentMethodLabel } from "./pos.utils";

export type ReceiptSettings = {
  businessName: string;
  ruc: string;
  address: string;
  phone: string;
  footerMessage: string;
  paperWidth: "58mm" | "80mm";
};

const DEFAULT_SETTINGS: ReceiptSettings = {
  businessName: "Ferretería",
  ruc: "RUC 0000000-0",
  address: "Dirección pendiente",
  phone: "Tel: ---",
  footerMessage: "Gracias por su compra",
  paperWidth: "80mm",
};

export function getReceiptSettings(): ReceiptSettings {
  try {
    const raw = localStorage.getItem("receipt_settings");
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ReceiptSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function buildReceiptHtml(
  sale: SaleResponse,
  settings: ReceiptSettings,
  cashier?: { username?: string; name?: string } | null,
  cashMeta?: { received: number; change: number },
) {
  const createdAt = sale.created_at
    ? new Date(sale.created_at).toLocaleString("es-PY")
    : "";

  const paymentMethod = sale.payments?.[0]?.method ?? "CASH";
  const paymentLabel = paymentMethodLabel(paymentMethod);
  const total = formatMoney(sale.total);
  const showCash = paymentMethod === "CASH" && cashMeta;

  const itemsHtml =
    sale.items
      ?.map((item) => {
        const name = item.product?.name ?? `Producto #${item.product_id}`;
        const unit = item.product?.unit ?? null;
        return `
          <tr>
            <td class="name">${name}</td>
            <td class="qty">${formatQty(Number(item.qty), unit)}</td>
            <td class="price">${formatMoney(item.price)}</td>
            <td class="subtotal">${formatMoney(item.subtotal)}</td>
          </tr>
        `;
      })
      .join("") ?? "";

  const paymentsHtml =
    sale.payments
      ?.map((p) => {
        const label = paymentMethodLabel(p.method);
        const ref = p.reference ? ` (${p.reference})` : "";
        return `<div>Pago: ${label} · ₲ ${formatMoney(p.amount)}${ref}</div>`;
      })
      .join("") ?? "";

  const cashierLabel = cashier?.name
    ? `${cashier.name} (${cashier.username ?? ""})`
    : (cashier?.username ?? "");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Ticket Venta #${sale.id}</title>
        <style>
          @page { size: ${settings.paperWidth}; margin: 6mm; }
          body { font-family: "Courier New", monospace; color: #111; }
          @media print { body { margin: 0; } }
          .center { text-align: center; }
          .muted { color: #555; }
          h1 { font-size: 16px; margin: 0; }
          .block { margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { text-align: left; padding: 2px 0; }
          .qty, .price, .subtotal { text-align: right; }
          .totals { font-size: 14px; font-weight: bold; }
          hr { border: none; border-top: 1px dashed #999; margin: 6px 0; }
        </style>
      </head>
      <body>
        <div class="center">
          <h1>${settings.businessName}</h1>
          <div class="muted">${settings.ruc}</div>
          <div class="muted">${settings.address}</div>
          <div class="muted">${settings.phone}</div>
        </div>
        <hr />
        <div class="block">
          <div>Fecha: ${createdAt}</div>
          <div>Venta: #${sale.id}</div>
          <div>Cajero: ${cashierLabel || "-"}</div>
        </div>
        <hr />
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th class="qty">Cant</th>
              <th class="price">Precio</th>
              <th class="subtotal">Subt</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <hr />
        <div class="block totals">TOTAL: ₲ ${total}</div>
        <div class="block">${paymentsHtml || `Pago: ${paymentLabel}`}</div>
        ${
          showCash
            ? `<div class="block">Recibido: ₲ ${formatMoney(
                cashMeta.received,
              )} · Vuelto: ₲ ${formatMoney(cashMeta.change)}</div>`
            : ""
        }
        <hr />
        <div class="center">${settings.footerMessage}</div>
      </body>
    </html>
  `;
}

export function openReceiptWindow(html: string) {
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  win.close();
}
