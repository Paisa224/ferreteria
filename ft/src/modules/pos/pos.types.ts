export type PosProduct = {
  id: number;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit?: string | null;
  price: string | number;
  track_stock: boolean;
  is_active: boolean;
};

export type CartItem = {
  product: PosProduct;
  qty: number;
  price: number;
  stock?: number | null;
};

export type PaymentLine = {
  method: "CASH" | "QR" | "TC" | "TD" | "TRANSFER";
  amount: number;
  reference?: string | null;
};

export type CreateSaleDto = {
  customer_name?: string | null;
  note?: string | null;
  discount?: number;
  items: Array<{ product_id: number; qty: number; price: number }>;
  payments: PaymentLine[];
};

export type SaleResponse = {
  id: number;
  status: "PAID" | "DRAFT" | "CANCELED";
  total: string | number;
  created_at: string;
  cash_session_id?: number;
};
