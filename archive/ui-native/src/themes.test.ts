import { describe, expect, it } from 'vitest';
import { RADII, SWATCHES, THEME_KEYS, THEMES } from './themes';

const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const luminance = (hex: string) => {
  const [r, g, b] = hexToRgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

describe('themes', () => {
  it('every theme defines the same tokens', () => {
    const keys = Object.keys(THEMES.citrus).sort();
    for (const k of THEME_KEYS) expect(Object.keys(THEMES[k]).sort()).toEqual(keys);
  });

  it('has a swatch for every theme, matching its bg and accent', () => {
    expect(SWATCHES.map((s) => s.key).sort()).toEqual([...THEME_KEYS].sort());
    for (const s of SWATCHES) {
      expect(THEMES[s.key].bg).toBe(s.bg);
      expect(THEMES[s.key].accent).toBe(s.accent);
    }
  });

  it.each(THEME_KEYS)('%s body text meets WCAG AA (4.5:1) on bg and card', (k) => {
    const t = THEMES[k];
    expect(contrast(t.text, t.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.text, t.card)).toBeGreaterThanOrEqual(4.5);
  });

  it('sharp corners are fully square, as in the prototype', () => {
    expect(Object.values(RADII.sharp).every((r) => r === 0)).toBe(true);
  });
});
