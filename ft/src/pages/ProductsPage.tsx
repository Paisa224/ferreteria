import { useEffect, useMemo, useState } from "react";
import {
  createProduct,
  listProducts,
  updateProduct,
} from "../modules/products/products.api";
import type { CreateProductDto, Product } from "../modules/products/types";
import { ProductForm } from "../modules/products/ProductForm";
import { ProductsTable } from "../modules/products/ProductsTable";
import s from "./ProductsPage.module.css";

function parseError(err: any) {
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) return message.join(" ");
  return message ?? "Error guardando producto";
}

export default function ProductsPage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);

  const selectedId = useMemo(() => selected?.id ?? null, [selected]);

  async function load(nextQuery = query) {
    setLoading(true);
    setErr(null);
    try {
      const data = await listProducts(nextQuery.trim() || undefined);
      setProducts(data);
      if (data.length === 0) {
        setSelected(null);
      } else if (!selected || !data.find((p) => p.id === selected.id)) {
        setSelected(data[0]);
      }
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Error cargando productos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSave(payload: CreateProductDto) {
    setSaving(true);
    setFormErr(null);
    try {
      if (selected) {
        const updated = await updateProduct(selected.id, payload);
        await load(query);
        setSelected(updated);
      } else {
        const created = await createProduct(payload);
        await load(query);
        setSelected(created);
      }
    } catch (e: any) {
      setFormErr(parseError(e));
    } finally {
      setSaving(false);
    }
  }

  async function onToggleActive(product: Product) {
    setSaving(true);
    setFormErr(null);
    try {
      await updateProduct(product.id, { is_active: !product.is_active });
      await load(query);
    } catch (e: any) {
      setFormErr(parseError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={s.wrap}>
      <div className="card">
        <div className={s.toolbar}>
          <div>
            <h1 className="h1">Productos</h1>
            <div className="muted">Gestión de catálogo y precios</div>
          </div>

          <div className={s.searchRow}>
            <input
              className={s.searchInput}
              placeholder="Buscar por nombre, SKU o código de barras"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              className="btn primary"
              onClick={() => load()}
              disabled={loading}
            >
              {loading ? "Buscando…" : "Buscar"}
            </button>
            <button
              className="btn"
              onClick={() => {
                setQuery("");
                load("");
              }}
            >
              Limpiar
            </button>
          </div>
        </div>
        {err && <div style={{ color: "var(--danger)" }}>{err}</div>}
      </div>

      <div className={s.grid}>
        <div className="card">
          <ProductsTable
            products={products}
            selectedId={selectedId}
            onSelect={setSelected}
            onToggleActive={onToggleActive}
          />
        </div>

        <div className={s.panel}>
          <div className="card">
            <ProductForm
              product={selected}
              onSave={onSave}
              onNew={() => setSelected(null)}
              loading={saving}
              error={formErr}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
