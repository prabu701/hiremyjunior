import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THEMES } from './theme';

// Every theme defined in globals.css must exist in the picker, and body text must stay readable.
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

function tokens(theme: string): Record<string, string> {
  const re = theme === 'citrus' ? /:root,\s*\[data-theme="citrus"\]\s*\{([^}]*)\}/ : new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([^}]*)\\}`);
  const body = re.exec(css)?.[1] ?? '';
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!]));
}

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

describe('themes', () => {
  it.each(THEMES.map((t) => t.key))('%s defines the core tokens', (key) => {
    const t = tokens(key);
    for (const name of ['canvas', 'surface', 'ink', 'muted', 'accent', 'line']) expect(t[name], name).toBeTruthy();
  });

  it.each(THEMES.map((t) => t.key))('%s body text meets WCAG AA on canvas and surface', (key) => {
    const t = tokens(key);
    expect(contrast(t.ink!, t.canvas!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.ink!, t.surface!)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(THEMES.map((t) => t.key))('%s secondary text stays legible (≥ 3:1)', (key) => {
    const t = tokens(key);
    expect(contrast(t.muted!, t.surface!)).toBeGreaterThanOrEqual(3);
  });

  it('picker swatches match the CSS accents', () => {
    for (const t of THEMES) expect(tokens(t.key).accent?.toLowerCase()).toBe(t.accent.toLowerCase());
  });
});
