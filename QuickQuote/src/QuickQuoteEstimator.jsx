import React, { useEffect, useMemo, useState } from 'react';
import rates from './lib/rates.json';
import { useEstimate, useClampedNumber, usePdfExporter, usePreferredCurrency, useCurrencyFormatter } from './lib/hooks.js';
import OptionButtons from './lib/OptionButtons.jsx';
import BreakdownChart from './BreakdownChart.jsx';

const PROJECTS = Object.keys(rates.projects);
const QUALITIES = Object.keys(rates.qualityMultipliers);
const LOCATIONS = Object.keys(rates.locationMultipliers);

// Defaults can be overridden via Vite env (see .env.example)
const ENV = typeof import.meta !== 'undefined' ? import.meta.env || {} : {};
const DEFAULT_ROLE = ENV.VITE_DEFAULT_ROLE || 'Homeowner';
const DEFAULT_PROJECT = ENV.VITE_DEFAULT_PROJECT || PROJECTS[0];
const DEFAULT_QUALITY = ENV.VITE_DEFAULT_QUALITY || (QUALITIES[1] || 'Medium');
const DEFAULT_LOCATION = ENV.VITE_DEFAULT_LOCATION || LOCATIONS[0];

export default function QuickQuoteEstimator() {
  const [role, setRole] = useState(DEFAULT_ROLE);
  const [projectType, setProjectType] = useState(DEFAULT_PROJECT);
  const [quality, setQuality] = useState(DEFAULT_QUALITY);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [unit, setUnit] = useState('sqft'); // 'sqft' | 'sqm'
  const [overheadPct, setOverheadPct] = useState(10);
  const [taxPct, setTaxPct] = useState(0);
  const [discountPct, setDiscountPct] = useState(0);
  const preferredCurrency = usePreferredCurrency();
  const [currencyMode, setCurrencyMode] = useState('Auto'); // 'Auto' or explicit code
  const [history, setHistory] = useState([]);

  const { value: sizeInput, onChange: handleSqftChange } = useClampedNumber(100, { min: 1, max: 100000 });
  const sqftForCalc = useMemo(() => unit === 'sqm' ? Number(sizeInput) * 10.7639 : Number(sizeInput), [unit, sizeInput]);
  const currencyOverride = currencyMode === 'Auto' ? undefined : currencyMode;
  const { labor, material, total, currency, error: err } = useEstimate(Number(sqftForCalc), projectType, quality, location, currencyOverride);
  const fmt = useCurrencyFormatter(currency);

  // Simple confidence band based on chosen quality
  const uncertaintyPct = quality === 'Low' ? 0.2 : quality === 'High' ? 0.1 : 0.15;
  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const rangeLow = round2(total * (1 - uncertaintyPct));
  const rangeHigh = round2(total * (1 + uncertaintyPct));
  const overhead = round2(total * (overheadPct / 100));
  const subWithOverhead = round2(total + overhead);
  const discountAmt = round2(subWithOverhead * (discountPct / 100));
  const taxBase = round2(subWithOverhead - discountAmt);
  const taxAmt = round2(taxBase * (taxPct / 100));
  const grandTotal = round2(taxBase + taxAmt);

  const exportPdf = usePdfExporter({ role, projectType, quality, location, sqft: Number(sizeInput), unit, labor, material, total, currency, fmt, rangeLow, rangeHigh, overheadPct, taxPct, discountPct });

  useEffect(() => { /* reserved for side-effects/analytics later */ }, [labor, material, total]);

  // Load quote history once
  useEffect(() => {
    try {
      const raw = localStorage.getItem('qq_history_v1');
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  // Load from URL params (shareable links)
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const r = sp.get('r');
      const p = sp.get('p');
      const q = sp.get('q');
      const l = sp.get('l');
      const u = sp.get('u');
      const s = sp.get('s');
      const c = sp.get('c');
      const oh = sp.get('oh');
      const tax = sp.get('tax');
      const disc = sp.get('disc');

      if (r && ['Homeowner','Contractor'].includes(r)) setRole(r);
      if (p && PROJECTS.includes(p)) setProjectType(p);
      if (q && QUALITIES.includes(q)) setQuality(q);
      if (l && LOCATIONS.includes(l)) setLocation(l);
      if (u && (u === 'sqft' || u === 'sqm')) setUnit(u);
      if (s && !isNaN(parseFloat(s))) handleSqftChange(parseFloat(s));
      if (c && (c === 'Auto' || c.length === 3)) setCurrencyMode(c);
      if (oh && !isNaN(parseFloat(oh))) setOverheadPct(Math.max(0, Math.min(30, parseFloat(oh))));
      if (tax && !isNaN(parseFloat(tax))) setTaxPct(Math.max(0, Math.min(50, parseFloat(tax))));
      if (disc && !isNaN(parseFloat(disc))) setDiscountPct(Math.max(0, Math.min(50, parseFloat(disc))));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep URL in sync (without pushing history)
  useEffect(() => {
    try {
      const sp = new URLSearchParams();
      sp.set('r', role);
      sp.set('p', projectType);
      sp.set('q', quality);
      sp.set('l', location);
      sp.set('u', unit);
      sp.set('s', String(sizeInput));
      sp.set('c', currencyMode);
      sp.set('oh', String(overheadPct));
      sp.set('tax', String(taxPct));
      sp.set('disc', String(discountPct));
      const url = `${window.location.pathname}?${sp.toString()}`;
      window.history.replaceState(null, '', url);
    } catch {}
  }, [role, projectType, quality, location, unit, sizeInput, currencyMode, overheadPct, taxPct, discountPct]);

  const persistHistory = (items) => {
    setHistory(items);
    try { localStorage.setItem('qq_history_v1', JSON.stringify(items)); } catch {}
  };

  const saveQuote = () => {
    if (err) return;
    const entry = {
      ts: Date.now(), role, projectType, quality, location,
      unit, size: Number(sizeInput), labor, material, total, currency
    };
    const next = [entry, ...history].slice(0, 5);
    persistHistory(next);
  };

  const loadQuote = (q) => {
    setRole(q.role);
    setProjectType(q.projectType);
    setQuality(q.quality);
    setLocation(q.location);
    setUnit(q.unit || 'sqft');
    handleSqftChange(q.size);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-sky-600">Quick</span> Quote Estimator
          </h1>
          <p className="text-sm text-slate-500 mt-1">Fast, ballpark pricing for common renovation projects.</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
          {/* Role toggle */}
          <OptionButtons options={['Homeowner', 'Contractor']} value={role} onChange={setRole} />

          {/* Inputs */}
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Project Type</span>
              <select
                className="rounded border p-2"
                value={projectType}
                onChange={e => setProjectType(e.target.value)}
              >
                {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Room Size ({unit === 'sqm' ? 'sq m' : 'sq ft'})</span>
              <input
                type="number"
                min={1}
                max={100000}
                step="1"
                className="rounded border p-2"
                value={sizeInput}
                onChange={handleSqftChange}
              />
              <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                <span>Units:</span>
                <OptionButtons options={['sqft','sqm']} value={unit} onChange={setUnit} keyboard={false} />
              </div>
              {unit === 'sqm' && (
                <div className="text-xs text-slate-500">{sizeInput} sq m = {round2(Number(sizeInput) * 10.7639)} sq ft</div>
              )}
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Material Quality</span>
              <OptionButtons options={QUALITIES} value={quality} onChange={setQuality} />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Location</span>
              <OptionButtons options={LOCATIONS} value={location} onChange={setLocation} />
            </label>

            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-sm font-medium">Currency & Adjustments</span>
              <div className="flex items-center gap-2 flex-wrap">
                <select className="rounded border p-2" value={currencyMode} onChange={e => setCurrencyMode(e.target.value)}>
                  <option value="Auto">Auto ({preferredCurrency})</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                  <option value="GHS">GHS</option>
                </select>
                <div className="flex items-center gap-2 text-sm">
                  <label className="flex items-center gap-1">
                    Overhead
                    <input type="range" min={0} max={30} step={1} value={overheadPct} onChange={e => setOverheadPct(Number(e.target.value))} />
                    <span className="w-8 text-right">{overheadPct}%</span>
                  </label>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <label className="flex items-center gap-1">
                    Tax%
                    <input type="number" min={0} max={50} step={0.5} className="w-16 rounded border p-1" value={taxPct} onChange={e => setTaxPct(Number(e.target.value))} />
                  </label>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <label className="flex items-center gap-1">
                    Discount%
                    <input type="number" min={0} max={50} step={0.5} className="w-16 rounded border p-1" value={discountPct} onChange={e => setDiscountPct(Number(e.target.value))} />
                  </label>
                </div>
              </div>
            </label>
          </div>

          {/* Error / Estimate */}
          {err ? (
            <div className="rounded border border-rose-300 bg-rose-50 text-rose-700 p-3 text-sm">{err}</div>
          ) : (
            <div className="rounded-xl border bg-slate-50 p-4 space-y-2">
              <div className="font-semibold">Estimate</div>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div><dt className="text-xs text-slate-500">Labor</dt><dd className="font-medium">{fmt.format(labor)}</dd></div>
                <div><dt className="text-xs text-slate-500">Material</dt><dd className="font-medium">{fmt.format(material)}</dd></div>
                <div><dt className="text-xs text-slate-500">Subtotal</dt><dd className="font-semibold">{fmt.format(total)}</dd></div>
                <div><dt className="text-xs text-slate-500">Overhead ({overheadPct}%)</dt><dd className="font-medium">{fmt.format(overhead)}</dd></div>
                <div><dt className="text-xs text-slate-500">Tax ({taxPct}%)</dt><dd className="font-medium">{fmt.format(taxAmt)}</dd></div>
                <div><dt className="text-xs text-slate-500">Discount ({discountPct}%)</dt><dd className="font-medium">-{fmt.format(discountAmt)}</dd></div>
                <div className="col-span-2 sm:col-span-3"><dt className="text-xs text-slate-500">Grand Total</dt><dd className="font-semibold">{fmt.format(grandTotal)}</dd></div>
              </dl>
              <div className="text-xs text-slate-600">
                Confidence range (±{Math.round(uncertaintyPct * 100)}%): {fmt.format(rangeLow)} – {fmt.format(rangeHigh)}
              </div>
              <BreakdownChart labor={labor} material={material} overhead={overhead} />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button className="px-4 py-2 rounded border bg-sky-600 text-white hover:bg-sky-700" onClick={exportPdf}>
              Download PDF
            </button>
            <button className="px-4 py-2 rounded border hover:bg-slate-50" onClick={saveQuote}>
              Save Quote
            </button>
            <a
              className="px-4 py-2 rounded border hover:bg-slate-50"
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
            >
              Coming soon: AR room size via phone camera
            </a>
          </div>

          {/* Quote History */}
          {history.length > 0 && (
            <div className="rounded-xl border bg-white p-4 space-y-3">
              <div className="font-medium">Recent Quotes</div>
              <ul className="space-y-2">
                {history.map((q, i) => (
                  <li key={q.ts + ':' + i} className="flex items-center gap-3 text-sm">
                    <div className="flex-1 text-slate-700 truncate">
                      {new Date(q.ts).toLocaleString()} · {q.projectType} · {q.size} {q.unit === 'sqm' ? 'sq m' : 'sq ft'} · {q.quality} · {q.location}
                      <span className="ml-2 text-slate-500">{fmt.format(q.total)}</span>
                    </div>
                    <button className="px-3 py-1 rounded border hover:bg-slate-50" onClick={() => loadQuote(q)}>Load</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <footer className="max-w-4xl mx-auto px-6 py-8 text-xs text-slate-400">
          © {new Date().getFullYear()} QuickQuote – Estimates are for guidance only.
        </footer>
      </main>
    </div>
  );
}
