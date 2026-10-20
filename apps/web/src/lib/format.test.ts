import { describe, expect, it } from 'vitest';
import { formatUsDate, maskUsDate, parseUsDate } from './dates';
import { money, parseTime, phone, rate, rateRange, shiftLabel } from './format';

describe('dates', () => {
  it('parses valid US dates and rejects impossible ones', () => {
    expect(parseUsDate('03/14/2011')).toBe('2011-03-14');
    expect(parseUsDate('02/30/2011')).toBeNull();
    expect(parseUsDate('3/14/2011')).toBeNull();
    expect(formatUsDate('2011-03-14')).toBe('03/14/2011');
  });
  it('masks typing into MM/DD/YYYY', () => {
    expect(maskUsDate('03142011')).toBe('03/14/2011');
    expect(maskUsDate('031')).toBe('03/1');
  });
});

describe('times', () => {
  it.each([
    ['9am', '09:00'], ['9:30 PM', '21:30'], ['12pm', '12:00'], ['12am', '00:00'], ['13:15', '13:15'], ['1p', '13:00'],
  ])('%s → %s', (input, out) => expect(parseTime(input)).toBe(out));
  it.each(['25:00', '13pm', '9:75', 'noon'])('rejects %s', (input) => expect(parseTime(input)).toBeNull());
});

describe('money & contact formatting', () => {
  it('formats rates', () => {
    expect(money(1800)).toBe('$18');
    expect(money(1850)).toBe('$18.50');
    expect(rate(1950, 'hourly')).toBe('$19.50/hr');
    expect(rateRange(1800, 2500)).toBe('$18–25/hr');
    expect(rateRange(null, null)).toBe('Not set');
  });
  it('formats US phone numbers', () => expect(phone('+14255550123')).toBe('(425) 555-0123'));
  it('shows shifts in Washington time regardless of device zone', () => {
    // 2026-10-10 16:00Z = 9:00 AM PDT
    expect(shiftLabel('2026-10-10T16:00:00Z', '2026-10-10T18:00:00Z')).toMatch(/^Sat, Oct 10 · 9\s?AM–11\s?AM$/);
  });
});
