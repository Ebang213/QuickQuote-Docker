import React, { useEffect, useMemo, useState } from 'react';
import { computeEstimate } from './lib/calc';
import rates from './lib/rates.json';
import jsPDF from 'jspdf';

// Handle both simple numeric & rich object formats in rates.locationMultipliers
function getLocationMeta(location) {
  const raw = rates.locationMultipliers[location];
  if (typeof raw === 'number') {
    return {
      multiplier: raw,
      currency: location === 'US' ? 'USD' : 'GHS',
    };
  }
  return raw || { multiplier: 1, currency: 'USD' };
}
function currencyFormatter(currency) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }); }
  catch { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }); }
}

const PROJECTS = Object.keys(rates.projects);
const QUALITIES = Object.keys(rates.qualityMultipliers);
const LOCATIONS = Object.keys(rates.locationMultipliers);

export default function QuickQuoteEstimator() {
  const [role, setRole] = useState('Homeowner'); // keeps your button labels
  const [projectType, setProjectType] = useState(PROJECTS[0]);
  const [quality, setQuality] = useState(QUALITIES[1] || 'Medium');
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [sqft, setSqft] = useState(100);
  const [err, setErr] = useState('');

  const { currency } = useMemo(() => getLocationMeta(location), [location]);
  const fmt = useMemo(() => currencyFormatter(currency), [currency]);

  const { labor, material, total } = useMemo(() => {
    try {
      const res = computeEstimate(Number(sqft), projectType, quality, location);
      setErr('');
      return res;
    } catch (e) {
      setErr(e.message || 'Invalid inputs');
      return { labor: 0, material: 0, total: 0 };
    }
  }, [sqft, projectType, quality, location]);

  // Simple client-side validation & clamping
  function handleSqftChange(e) {
    const v = e.target.value.replace(/[^\d.]/g, '');
    const n = Number(v);
    setSqft(Number.isFinite(n) ? Math.max(1, Math.min(n, 100000)) : 0);
  }

  function exportPdf() {
    const doc = new jsPDF();
    const line = (y, text, bold=false) => {
      if (bold) doc.setFont(undefined, 'bold');
      doc.text(text, 14, y);
      if (bold) doc.setFont(undefined, 'normal');
    };

    const y0 = 16;
    line(y0, 'QuickQuote — Estimate', true);
    line(y0 + 8, `Role: ${role}`);
    line(y0 + 16, `Project: ${projectType}`);
    line(y0 + 24, `Quality: ${quality}`);
    line(y0 + 32, `Location: ${location} (${currency})`);
    line(y0 + 40, `Room Size: ${sqft} sq ft`);
    line(y0 + 56, 'Breakdown', true);

    const y1 = y0 + 64;
    line(y1,   `Labor:    ${fmt.format(labor)}`);
    line(y1+8, `Material: ${fmt.format(material)}`);
    line(y1+16,`Total:    ${fmt.format(total)}`, true);

    // Optional: include project rates
    const p = rates.projects[projectType];
    if (p) {
      line(y1 + 32, 'Rates used:', true);
      line(y1 + 40, `Labor per sq ft: ${p.laborPerSqFt}`);
      line(y1 + 48, `Material per sq ft: ${p.materialPerSqFt}`);
    }

    doc.save('QuickQuote_Estimate.pdf');
  }

  useEffect(() => { /* reserved for side-effects/analytics later */ }, [labor, material, total]);

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
          {/* Role toggle (kept for continuity with your tests) */}
          <div className="flex flex-wrap items-center gap-2">
            {['Homeowner', 'Contractor'].map(r => (
              <button
                key={r}
                className={`px-3 py-1.5 rounded border text-sm ${role === r ? 'bg-sky-600 text-white border-sky-600' : 'hover:bg-slate-50'}`}
                onClick={() => setRole(r)}
              >
                {r}
              </button>
            ))}
          </div>

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
              <span className="text-sm font-medium">Room Size (sq ft)</span>
              <input
                type="number"
                min={1}
                max={100000}
                step="1"
                className="rounded border p-2"
                value={sqft}
                onChange={handleSqftChange}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Material Quality</span>
              <div className="flex gap-2">
                {QUALITIES.map(q => (
                  <button
                    key={q}
                    aria-pressed={quality === q}
                    className={`px-3 py-1.5 rounded border text-sm ${quality === q ? 'bg-sky-600 text-white border-sky-600' : 'hover:bg-slate-50'}`}
                    onClick={() => setQuality(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Location</span>
              <div className="flex gap-2">
                {LOCATIONS.map(loc => (
                  <button
                    key={loc}
                    aria-pressed={location === loc}
                    className={`px-3 py-1.5 rounded border text-sm ${location === loc ? 'bg-sky-600 text-white border-sky-600' : 'hover:bg-slate-50'}`}
                    onClick={() => setLocation(loc)}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </label>
          </div>

          {/* Error / Estimate */}
          {err ? (
            <div className="rounded border border-rose-300 bg-rose-50 text-rose-700 p-3 text-sm">{err}</div>
          ) : (
            <div className="rounded-xl border bg-slate-50 p-4">
              <div className="font-semibold mb-2">Estimate</div>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div><dt className="text-xs text-slate-500">Labor</dt><dd className="font-medium">{fmt.format(labor)}</dd></div>
                <div><dt className="text-xs text-slate-500">Material</dt><dd className="font-medium">{fmt.format(material)}</dd></div>
                <div><dt className="text-xs text-slate-500">Total</dt><dd className="font-semibold">{fmt.format(total)}</dd></div>
              </dl>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button className="px-4 py-2 rounded border bg-sky-600 text-white hover:bg-sky-700" onClick={exportPdf}>
              Download PDF
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
        </div>

        <footer className="max-w-4xl mx-auto px-6 py-8 text-xs text-slate-400">
          © 2025 QuickQuote — Estimates are for guidance only.
        </footer>
      </main>
    </div>
  );
}
