export type Product = {
  id: number;
  sku?: string | null;
  barcode?: string | null;
  name: string;
  unit?: string | null;
  cost: string | number;
  price: string | number;
  track_stock: boolean;
  is_active: boolean;
};

export type StockResponse = {
  product_id: number;
  track_stock: boolean;
  stock: string | number | null;
};

export type StockMovementDto = {
  product_id: number;
  type: "IN" | "OUT" | "ADJUST";
  qty: number;
  note?: string;
};

export type StockMovementResponse = {
  id: number;
  product_id: number;
  type: "IN" | "OUT" | "ADJUST" | "SALE" | "RETURN";
  qty: string | number;
  note?: string | null;
  created_at: string;
  created_by: number;
  sale_id?: number | null;
  createdByUser?: {
    username: string;
    name: string;
  } | null;
};

export type StockMovementListResponse = {
  items: StockMovementResponse[];
  total: number;
};

export type StockMoveResult = {
  movement: StockMovementResponse;
  stock: string | number;
};
