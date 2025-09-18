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

export function usePdfExporter({
  role,
  projectType,
  quality,
  location,
  sqft,
  unit = 'sqft',
  currency,
  fmt,
  rangeLow,
  rangeHigh,
  materialAdditions = [],
  clientSnapshot = {},
  totals = {},
}) {
  return useCallback(() => {
    const currencyFormatter =
      fmt && typeof fmt.format === 'function'
        ? fmt
        : makeCurrencyFormatter(currency || 'USD');
    const formatAmount = (value) => currencyFormatter.format(Number(value) || 0);

    const doc = new jsPDF();
    let yPos = 16;
    const addLine = (text, bold = false, spacing = 6) => {
      if (bold) doc.setFont(undefined, 'bold');
      doc.text(String(text), 14, yPos);
      if (bold) doc.setFont(undefined, 'normal');
      yPos += spacing;
    };

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const {
      laborBase = 0,
      laborFinal = 0,
      laborMarkupPct = 0,
      materialBase = 0,
      materialExtrasTotal = 0,
      materialFinal = 0,
      materialMarkupPct = 0,
      subtotal = 0,
      overheadPct = 0,
      overheadAmt = 0,
      discountPct = 0,
      discountAmt = 0,
      taxPct = 0,
      taxAmt = 0,
      grandTotal = 0,
    } = totals || {};

    const quickMaterials = Array.isArray(materialAdditions) ? materialAdditions : [];
    const client = clientSnapshot && typeof clientSnapshot === 'object' ? clientSnapshot : {};

    addLine('QuickQuote Summary', true);
    addLine(`Generated: ${stamp}`);
    addLine(`Role: ${role}`);
    addLine(`Project: ${projectType}`);
    addLine(`Quality: ${quality}`);
    addLine(`Location: ${location} (${currency})`);
    const unitLabel = unit === 'sqm' ? 'sq m' : 'sq ft';
    addLine(`Room Size: ${sqft} ${unitLabel}`);

    const { name = '', company = '', email = '', phone = '', notes = '' } = client;
    if (name || company || email || phone || notes) {
      yPos += 4;
      addLine('Client Snapshot', true);
      if (name) addLine(`Name: ${name}`);
      if (company) addLine(`Company: ${company}`);
      if (email) addLine(`Email: ${email}`);
      if (phone) addLine(`Phone: ${phone}`);
      if (notes) {
        doc.splitTextToSize(`Notes: ${notes}`, 180).forEach((line) => addLine(line));
      }
    }

    yPos += 4;
    addLine('Financial Breakdown', true);
    addLine(`Labor (${laborMarkupPct}% markup): ${formatAmount(laborFinal)} (base ${formatAmount(laborBase)})`);
    addLine(`Materials (${materialMarkupPct}% markup): ${formatAmount(materialFinal)} (base ${formatAmount(materialBase)} + quick adds ${formatAmount(materialExtrasTotal)})`);
    addLine(`Subtotal before overhead: ${formatAmount(subtotal)}`);
    if (overheadPct || overheadAmt) addLine(`Overhead (${overheadPct}%): ${formatAmount(overheadAmt)}`);
    if (discountPct || discountAmt) addLine(`Discount (${discountPct}%): -${formatAmount(discountAmt)}`);
    if (taxPct || taxAmt) addLine(`Tax (${taxPct}%): ${formatAmount(taxAmt)}`);
    addLine(`Grand Total: ${formatAmount(grandTotal)}`, true);

    if (quickMaterials.length > 0) {
      yPos += 4;
      addLine('Quick Materials', true);
      quickMaterials.forEach((item) => {
        addLine(`${item.name}: ${formatAmount(item.cost)}`);
      });
    }

    if (typeof rangeLow === 'number' && typeof rangeHigh === 'number') {
      yPos += 4;
      addLine(`Confidence Range: ${formatAmount(rangeLow)} - ${formatAmount(rangeHigh)}`);
    }

    const project = rates.projects[projectType];
    if (project) {
      yPos += 4;
      addLine('Reference Rates', true);
      addLine(`Labor per sq ft: ${project.laborPerSqFt}`);
      addLine(`Material per sq ft: ${project.materialPerSqFt}`);
    }

    doc.save('QuickQuote_Summary.pdf');
  }, [
    role,
    projectType,
    quality,
    location,
    sqft,
    unit,
    currency,
    fmt,
    rangeLow,
    rangeHigh,
    materialAdditions,
    clientSnapshot,
    totals,
  ]);
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
      case ' ':
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




