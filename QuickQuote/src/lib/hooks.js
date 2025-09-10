import { useMemo, useState, useCallback, useRef } from 'react';
import { computeEstimate } from './calc.js';
import { makeCurrencyFormatter } from './format';
import jsPDF from 'jspdf';
import rates from './rates.json';

// Format numbers in a given currency once and memoize the formatter
export function useCurrencyFormatter(currency = 'USD') {
  return useMemo(() => makeCurrencyFormatter(currency), [currency]);
}

// Detect preferred currency from navigator.language region (best-effort)
export function usePreferredCurrency() {
  return useMemo(() => {
    try {
      const lang = typeof navigator !== 'undefined' ? navigator.language || '' : '';
      const region = (lang.split('-')[1] || '').toUpperCase();
      const map = {
        US: 'USD', CA: 'CAD', GB: 'GBP', AU: 'AUD', NZ: 'NZD',
        IE: 'EUR', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', PT: 'EUR', BE: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR',
        GH: 'GHS', NG: 'NGN', ZA: 'ZAR', KE: 'KES', IN: 'INR', JP: 'JPY', CN: 'CNY', KR: 'KRW'
      };
      return map[region] || 'USD';
    } catch {
      return 'USD';
    }
  }, []);
}

// Core estimation hook that centralizes compute + currency + formatting
export function useEstimate(sqft, projectType, quality, location, currencyOverride) {
  const result = useMemo(() => {
    try {
      const { labor, material, total, currency } = computeEstimate(sqft, projectType, quality, location);
      return { labor, material, total, currency, error: '' };
    } catch (e) {
      return { labor: 0, material: 0, total: 0, currency: 'USD', error: e?.message || 'Invalid inputs' };
    }
  }, [sqft, projectType, quality, location]);

  const displayCurrency = currencyOverride || result.currency;
  const fmt = useCurrencyFormatter(displayCurrency);

  return { ...result, currency: displayCurrency, fmt };
}

// Manage a numeric input with clamping and sanitation
export function useClampedNumber(initial = 0, { min = -Infinity, max = Infinity } = {}) {
  const [value, setValue] = useState(initial);

  const onChange = useCallback((e) => {
    const raw = e?.target?.value ?? e; // support event or raw value
    const cleaned = String(raw).replace(/[^\d.]/g, '');
    const n = Number(cleaned);
    if (Number.isFinite(n)) {
      setValue(Math.max(min, Math.min(n, max)));
    } else {
      setValue(min);
    }
  }, [min, max]);

  return { value, setValue, onChange };
}

// Build a memoized PDF export function based on current inputs
export function usePdfExporter({ role, projectType, quality, location, sqft, unit = 'sqft', labor, material, total, currency, fmt, rangeLow, rangeHigh, overheadPct = 0, taxPct = 0, discountPct = 0 }) {
  return useCallback(() => {
    const doc = new jsPDF();
    const line = (y, text, bold = false) => {
      if (bold) doc.setFont(undefined, 'bold');
      doc.text(String(text), 14, y);
      if (bold) doc.setFont(undefined, 'normal');
    };

    const y0 = 16;
    line(y0, 'QuickQuote Estimate', true);
    const ts = new Date();
    const fmt2 = (n) => String(n).padStart(2, '0');
    const stamp = `${ts.getFullYear()}-${fmt2(ts.getMonth() + 1)}-${fmt2(ts.getDate())} ${fmt2(ts.getHours())}:${fmt2(ts.getMinutes())}`;
    line(y0 + 6, `Generated: ${stamp}`);
    line(y0 + 8, `Role: ${role}`);
    line(y0 + 16, `Project: ${projectType}`);
    line(y0 + 24, `Quality: ${quality}`);
    line(y0 + 32, `Location: ${location} (${currency})`);
    const unitLabel = unit === 'sqm' ? 'sq m' : 'sq ft';
    line(y0 + 40, `Room Size: ${sqft} ${unitLabel}`);
    line(y0 + 56, 'Breakdown', true);

    const y1 = y0 + 64;
    line(y1, `Labor:    ${fmt.format(labor)}`);
    line(y1 + 8, `Material: ${fmt.format(material)}`);

    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
    const overheadAmt = round2(total * (overheadPct / 100));
    const subWithOverhead = round2(total + overheadAmt);
    const discountAmt = round2(subWithOverhead * (discountPct / 100));
    const taxBase = round2(subWithOverhead - discountAmt);
    const taxAmt = round2(taxBase * (taxPct / 100));
    const grandTotal = round2(taxBase + taxAmt);

    if (overheadAmt > 0) line(y1 + 16, `Overhead (${overheadPct}%): ${fmt.format(overheadAmt)}`);
    if (discountAmt > 0) line(y1 + 24, `Discount (${discountPct}%): -${fmt.format(discountAmt)}`);
    if (taxAmt > 0) line(y1 + 32, `Tax (${taxPct}%): ${fmt.format(taxAmt)}`);
    line(y1 + 40, `Total:    ${fmt.format(grandTotal)}`, true);

    // Optional confidence range if provided
    if (typeof rangeLow === 'number' && typeof rangeHigh === 'number') {
      line(y1 + 48, `Range:    ${fmt.format(rangeLow)} - ${fmt.format(rangeHigh)}`);
    }

    const p = rates.projects[projectType];
    if (p) {
      line(y1 + 64, 'Rates used:', true);
      line(y1 + 72, `Labor per sq ft: ${p.laborPerSqFt}`);
      line(y1 + 80, `Material per sq ft: ${p.materialPerSqFt}`);
    }

    doc.save('QuickQuote_Estimate.pdf');
  }, [role, projectType, quality, location, sqft, unit, labor, material, total, currency, fmt, rangeLow, rangeHigh, overheadPct, taxPct, discountPct]);
}

// Manage roving focus + keyboard selection for option groups
export function useSelectableOptions(options, value, onChange) {
  const refs = useRef([]);

  const focusIndex = useCallback((idx) => {
    const el = refs.current[idx];
    if (el && typeof el.focus === 'function') el.focus();
  }, []);

  const onKeyDown = useCallback((e, idx) => {
    const last = options.length - 1;
    let next = null;
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        next = idx > 0 ? idx - 1 : last;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        next = idx < last ? idx + 1 : 0;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      case 'Enter':
      case ' ': // Space
        onChange(options[idx]);
        e.preventDefault();
        return;
      default:
        return;
    }
    if (next !== null) {
      onChange(options[next]);
      focusIndex(next);
      e.preventDefault();
    }
  }, [options, onChange, focusIndex]);

  const getButtonProps = useCallback((opt, idx, selected) => ({
    ref: (el) => { refs.current[idx] = el; },
    tabIndex: selected ? 0 : -1,
    onKeyDown: (e) => onKeyDown(e, idx),
  }), [onKeyDown]);

  return { getButtonProps };
}
