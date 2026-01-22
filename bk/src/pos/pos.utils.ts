const DECIMAL_UNITS = new Set(['KG', 'KGS', 'L', 'LT', 'M', 'MT']);

export function normalizeUnit(unit?: string | null) {
  return (unit ?? '').trim().toUpperCase();
}

export function isDecimalUnit(unit?: string | null) {
  return DECIMAL_UNITS.has(normalizeUnit(unit));
}
