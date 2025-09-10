import { describe, it, expect, vi, afterEach } from 'vitest';
import { useCurrencyFormatter } from '../lib/hooks.js';
import React from 'react';
import { render, screen } from '@testing-library/react';

function FmtHarness({ currency = 'USD' }) {
  const fmt = useCurrencyFormatter(currency);
  // format a stable number for snapshot-like check without tying to locale too tightly
  const formatted = fmt.format(1234.56);
  return <div data-testid="fmt">{formatted}</div>;
}

describe('useCurrencyFormatter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a formatter for valid currency', () => {
    render(<FmtHarness currency="USD" />);
    const s = screen.getByTestId('fmt').textContent;
    expect(typeof s).toBe('string');
    // Should include the digits; symbol/order vary by locale
    expect(s).toMatch(/1,?234\.56|1234\.56/);
  });

  it('falls back to USD when Intl throws for invalid currency', () => {
    const orig = Intl.NumberFormat;
    const spy = vi.fn((locales, opts) => {
      if (opts?.currency === 'BAD') throw new Error('bad currency');
      return orig(locales, opts);
    });
    // @ts-ignore
    global.Intl = { ...Intl, NumberFormat: spy };

    render(<FmtHarness currency="BAD" />);

    // First attempt with BAD currency and then fallback with USD
    const currencies = spy.mock.calls.map(([, opts]) => opts?.currency);
    expect(currencies).toContain('BAD');
    expect(currencies).toContain('USD');
  });
});

