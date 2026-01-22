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

export type CreateProductDto = {
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit?: string | null;
  cost: number;
  price: number;
  track_stock: boolean;
  is_active: boolean;
};

export type UpdateProductDto = Partial<CreateProductDto>;
