import { isDecimalUnit, normalizeUnit } from './pos.utils';

describe('pos.utils', () => {
  it('normalizes units to upper case', () => {
    expect(normalizeUnit(' kg ')).toBe('KG');
  });

  it('detects decimal units', () => {
    expect(isDecimalUnit('KG')).toBe(true);
    expect(isDecimalUnit('m')).toBe(true);
    expect(isDecimalUnit('L')).toBe(true);
  });

  it('treats unknown units as integer', () => {
    expect(isDecimalUnit('UN')).toBe(false);
    expect(isDecimalUnit(null)).toBe(false);
  });
});
