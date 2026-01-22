import { http } from "../../api/http";
import type { CreateProductDto, Product, UpdateProductDto } from "./types";

export async function listProducts(q?: string): Promise<Product[]> {
  const { data } = await http.get("/products", {
    params: q ? { q } : undefined,
  });
  return data;
}

export async function createProduct(dto: CreateProductDto): Promise<Product> {
  const { data } = await http.post("/products", dto);
  return data;
}

export async function updateProduct(
  id: number,
  dto: UpdateProductDto,
): Promise<Product> {
  const { data } = await http.patch(`/products/${id}`, dto);
  return data;
}
