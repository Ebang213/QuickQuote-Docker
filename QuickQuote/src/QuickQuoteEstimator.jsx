import React, { useEffect, useState } from 'react';
import rates from './lib/rates.json';
import { useEstimate, useClampedNumber, usePdfExporter } from './lib/hooks.js';
import OptionButtons from './lib/OptionButtons.jsx';

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
  const { value: sqft, onChange: handleSqftChange } = useClampedNumber(100, { min: 1, max: 100000 });
  const { labor, material, total, currency, error: err, fmt } = useEstimate(Number(sqft), projectType, quality, location);

  // Simple confidence band based on chosen quality
  const uncertaintyPct = quality === 'Low' ? 0.2 : quality === 'High' ? 0.1 : 0.15;
  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const rangeLow = round2(total * (1 - uncertaintyPct));
  const rangeHigh = round2(total * (1 + uncertaintyPct));

  const exportPdf = usePdfExporter({ role, projectType, quality, location, sqft, labor, material, total, currency, fmt, rangeLow, rangeHigh });

  function legacyExportPdf() {
    const doc = new jsPDF();
    const line = (y, text, bold=false) => {
      if (bold) doc.setFont(undefined, 'bold');
      doc.text(text, 14, y);
      if (bold) doc.setFont(undefined, 'normal');
    };

    const y0 = 16;
    line(y0, 'QuickQuote Estimate', true);
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
              <OptionButtons options={QUALITIES} value={quality} onChange={setQuality} />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Location</span>
              <OptionButtons options={LOCATIONS} value={location} onChange={setLocation} />
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
                <div><dt className="text-xs text-slate-500">Total</dt><dd className="font-semibold">{fmt.format(total)}</dd></div>
              </dl>
              <div className="text-xs text-slate-600">
                Confidence range (±{Math.round(uncertaintyPct * 100)}%): {fmt.format(rangeLow)} – {fmt.format(rangeHigh)}
              </div>
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
          © {new Date().getFullYear()} QuickQuote — Estimates are for guidance only.
        </footer>
      </main>
    </div>
  );
}
