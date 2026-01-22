import { useEffect, useMemo, useState } from "react";
import type { CreateProductDto, Product, UpdateProductDto } from "./types";
import { formatMoneyGs, parseMoneyGs } from "../../utils/money";
import s from "./ProductForm.module.css";

type Props = {
  product: Product | null;
  onSave: (dto: CreateProductDto | UpdateProductDto) => Promise<void>;
  onNew: () => void;
  loading?: boolean;
  error?: string | null;
};

export function ProductForm({ product, onSave, onNew, loading, error }: Props) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [unit, setUnit] = useState("");
  const [cost, setCost] = useState("0");
  const [price, setPrice] = useState("0");
  const [trackStock, setTrackStock] = useState(true);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setSku(product.sku ?? "");
      setBarcode(product.barcode ?? "");
      setUnit(product.unit ?? "");
      setCost(String(product.cost ?? 0));
      setPrice(String(product.price ?? 0));
      setTrackStock(product.track_stock);
      setIsActive(product.is_active);
    } else {
      setName("");
      setSku("");
      setBarcode("");
      setUnit("");
      setCost("0");
      setPrice("0");
      setTrackStock(true);
      setIsActive(true);
    }
  }, [product]);

  const priceWarning = useMemo(() => {
    const c = parseMoneyGs(cost);
    const p = parseMoneyGs(price);
    if (Number.isNaN(c) || Number.isNaN(p)) return null;
    if (p < c) return "El precio es menor que el costo";
    return null;
  }, [cost, price]);

  const canSave = name.trim().length > 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSave) return;

    const payload: CreateProductDto = {
      name: name.trim(),
      sku: sku.trim() ? sku.trim() : null,
      barcode: barcode.trim() ? barcode.trim() : null,
      unit: unit.trim() ? unit.trim() : null,
      cost: parseMoneyGs(cost),
      price: parseMoneyGs(price),
      track_stock: trackStock,
      is_active: isActive,
    };

    await onSave(payload);
  }

  return (
    <form className={s.form} onSubmit={handleSubmit}>
      <div className={s.header}>
        <div>
          <h2 className="h1">
            {product ? "Editar producto" : "Nuevo producto"}
          </h2>
          <div className="muted">
            {product
              ? `Editando #${product.id}`
              : "Completa los datos del producto"}
          </div>
        </div>
        <button
          type="button"
          className="btn"
          onClick={onNew}
          disabled={loading}
        >
          Nuevo
        </button>
      </div>

      <label className={s.label}>
        Nombre
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del producto"
          required
        />
      </label>

      <div className={s.row}>
        <label className={s.label}>
          SKU
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="SKU"
          />
        </label>
        <label className={s.label}>
          Código de barras
          <input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Barcode"
          />
        </label>
      </div>

      <div className={s.row}>
        <label className={s.label}>
          Unidad
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="UN, KG, L, M"
          />
        </label>
        <label className={s.label}>
          Costo
          <input
            type="text"
            inputMode="numeric"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            onBlur={() => setCost(formatMoneyGs(parseMoneyGs(cost)))}
          />
        </label>
        <label className={s.label}>
          Precio
          <input
            type="text"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={() => setPrice(formatMoneyGs(parseMoneyGs(price)))}
          />
          {priceWarning && <span className={s.warning}>{priceWarning}</span>}
        </label>
      </div>

      <div className={s.row}>
        <label className={s.checkbox}>
          <input
            type="checkbox"
            checked={trackStock}
            onChange={(e) => setTrackStock(e.target.checked)}
          />
          Controla stock
        </label>
        <label className={s.checkbox}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Activo
        </label>
      </div>

      <div className={`${s.summary} ${priceWarning ? s.summaryWarn : ""}`}>
        <div>
          <div className={s.summaryLabel}>Precio actual</div>
          <div className={s.summaryValue}>
            ₲ {formatMoneyGs(parseMoneyGs(price))}
          </div>
        </div>
        <div>
          <div className={s.summaryLabel}>Costo actual</div>
          <div className={s.summaryValue}>
            ₲ {formatMoneyGs(parseMoneyGs(cost))}
          </div>
        </div>
      </div>

      {error && <div className={s.error}>{error}</div>}

      <button
        className="btn primary"
        type="submit"
        disabled={!canSave || loading}
      >
        {loading ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
