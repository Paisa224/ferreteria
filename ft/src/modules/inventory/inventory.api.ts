import { http } from "../../api/http";
import type {
  Product,
  StockMovementDto,
  StockMovementListResponse,
  StockResponse,
  StockMoveResult,
} from "./types";

export async function listProducts(q?: string): Promise<Product[]> {
  const { data } = await http.get("/products", {
    params: q ? { q } : undefined,
  });
  return data;
}

export async function getProductStock(id: number): Promise<StockResponse> {
  const { data } = await http.get(`/inventory/products/${id}/stock`);
  return data;
}

export async function getProductMovements(
  id: number,
  from?: string,
  to?: string,
  limit = 100,
): Promise<StockMovementListResponse> {
  const { data } = await http.get(`/inventory/products/${id}/movements`, {
    params: {
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      limit,
    },
  });
  return data;
}

export async function createStockMovement(
  dto: StockMovementDto,
): Promise<StockMoveResult> {
  const { data } = await http.post("/inventory/stock/move", dto);
  return data;
}
