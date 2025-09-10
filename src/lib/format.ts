// Minimal currency formatting utilities
// No behavioral changes: mirrors existing try/fallback logic

export function makeCurrencyFormatter(currency: string = 'USD'): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency });
  } catch {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
  }
}

