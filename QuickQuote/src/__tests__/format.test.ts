import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeCurrencyFormatter } from '../lib/format';

describe('makeCurrencyFormatter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a formatter for a valid currency', () => {
    const fmt = makeCurrencyFormatter('USD');
    const s = fmt.format(1234.56);
    expect(typeof s).toBe('string');
    // Symbol/order vary by locale; verify digits are as expected
    expect(s).toMatch(/1,?234\.56|1234\.56/);
  });

  it('falls back to USD when Intl throws for invalid currency', () => {
    const orig = Intl.NumberFormat;
    const spy = vi.fn((locales: any, opts: any) => {
      if (opts?.currency === 'BAD') throw new Error('bad currency');
      return orig(locales as any, opts as any);
    });
    // @ts-ignore
    global.Intl = { ...Intl, NumberFormat: spy };

    const fmt = makeCurrencyFormatter('BAD');
    const s = fmt.format(10);
    expect(typeof s).toBe('string');

    // First attempt with BAD currency and then fallback with USD
    const currencies = spy.mock.calls.map(([, opts]) => opts?.currency);
    expect(currencies).toContain('BAD');
    expect(currencies).toContain('USD');
  });
});

