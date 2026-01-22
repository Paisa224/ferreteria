import { http } from "../../api/http";
import type { CreateSaleDto, PosProduct, SaleResponse } from "./pos.types";

export async function listPosProducts(q?: string): Promise<PosProduct[]> {
  const { data } = await http.get("/products", {
    params: q ? { q } : undefined,
  });
  return data;
}

export async function getProductStock(productId: number) {
  const { data } = await http.get(`/inventory/products/${productId}/stock`);
  return data as { stock: string | number | null; track_stock: boolean };
}

export async function createSale(dto: CreateSaleDto): Promise<SaleResponse> {
  const { data } = await http.post("/pos/sales", dto);
  return data;
}
