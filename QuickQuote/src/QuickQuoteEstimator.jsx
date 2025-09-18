import React, { useEffect, useMemo, useState } from 'react';
import rates from './lib/rates.json';
import { useEstimate, useClampedNumber, usePdfExporter, usePreferredCurrency } from './lib/hooks.js';
import OptionButtons from './lib/OptionButtons.jsx';
import BreakdownChart from './BreakdownChart.jsx';

const PROJECTS = Object.keys(rates.projects);
const QUALITIES = Object.keys(rates.qualityMultipliers);
const LOCATIONS = Object.keys(rates.locationMultipliers);

const ENV = typeof import.meta !== 'undefined' ? import.meta.env || {} : {};
const DEFAULT_ROLE = ENV.VITE_DEFAULT_ROLE || 'Homeowner';
const DEFAULT_PROJECT = ENV.VITE_DEFAULT_PROJECT || PROJECTS[0];
const DEFAULT_QUALITY = ENV.VITE_DEFAULT_QUALITY || (QUALITIES[1] || 'Medium');
const DEFAULT_LOCATION = ENV.VITE_DEFAULT_LOCATION || LOCATIONS[0];

const STORAGE_KEYS = {
  history: 'qq_history_v1',
  draft: 'qq_draft_v2',
  materials: 'qq_material_favorites_v1',
};

const DEFAULT_MATERIAL_FAVORITES = [
  { id: 'drywall-sheet', name: 'Drywall Sheet (4x8)', cost: 18 },
  { id: 'lvp-box', name: 'Luxury Vinyl Plank (box)', cost: 62 },
  { id: 'paint-gallon', name: 'Interior Paint (gallon)', cost: 42 },
  { id: 'trim-pack', name: 'Finish Trim Pack', cost: 55 },
  { id: 'led-kit', name: 'LED Recessed Light Kit', cost: 78 },
];

const round2 = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

const makeId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  return `id-${Math.random().toString(36).slice(2, 9)}`;
};

const formatCurrencyFallback = (value, currencyCode = 'USD') => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(Number(value) || 0);
  } catch {
    const safe = Number(value) || 0;
    return `${currencyCode} ${safe.toFixed(2)}`;
  }
};

export default function QuickQuoteEstimator() {
  const [role, setRole] = useState(DEFAULT_ROLE);
  const [projectType, setProjectType] = useState(DEFAULT_PROJECT);
  const [quality, setQuality] = useState(DEFAULT_QUALITY);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [unit, setUnit] = useState('sqft');
  const [overheadPct, setOverheadPct] = useState(10);
  const [taxPct, setTaxPct] = useState(0);
  const [discountPct, setDiscountPct] = useState(0);
  const preferredCurrency = usePreferredCurrency();
  const [currencyMode, setCurrencyMode] = useState('Auto');
  const [history, setHistory] = useState([]);

  const { value: sizeInput, setValue: setSizeInput, onChange: handleSqftChange } = useClampedNumber(100, { min: 1, max: 100000 });

  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNotes, setClientNotes] = useState('');

  const [materialFavorites, setMaterialFavorites] = useState(DEFAULT_MATERIAL_FAVORITES);
  const [favoriteSelection, setFavoriteSelection] = useState(DEFAULT_MATERIAL_FAVORITES[0]?.id || '');
  const [newFavoriteName, setNewFavoriteName] = useState('');
  const [newFavoriteCost, setNewFavoriteCost] = useState('');
  const [materialAdditions, setMaterialAdditions] = useState([]);

  const [laborMarkupPct, setLaborMarkupPct] = useState(15);
  const [materialMarkupPct, setMaterialMarkupPct] = useState(10);

  const [draftSavedAt, setDraftSavedAt] = useState(null);

  const sqftForCalc = useMemo(() => (unit === 'sqm' ? Number(sizeInput) * 10.7639 : Number(sizeInput)), [unit, sizeInput]);
  const currencyOverride = currencyMode === 'Auto' ? undefined : currencyMode;
  const { labor, material, total, currency, error: err, fmt } = useEstimate(Number(sqftForCalc), projectType, quality, location, currencyOverride);

  const materialExtrasTotal = useMemo(
    () => round2(materialAdditions.reduce((sum, item) => sum + (Number(item.cost) || 0), 0)),
    [materialAdditions]
  );
  const adjustedMaterial = round2(material + materialExtrasTotal);
  const markupLabor = round2(labor * (1 + laborMarkupPct / 100));
  const markupMaterial = round2(adjustedMaterial * (1 + materialMarkupPct / 100));
  const subtotalBeforeOverhead = round2(markupLabor + markupMaterial);
  const overheadAmt = round2(subtotalBeforeOverhead * (overheadPct / 100));
  const subWithOverhead = round2(subtotalBeforeOverhead + overheadAmt);
  const discountAmt = round2(subWithOverhead * (discountPct / 100));
  const taxBase = round2(subWithOverhead - discountAmt);
  const taxAmt = round2(taxBase * (taxPct / 100));
  const grandTotal = round2(taxBase + taxAmt);
  const baseCost = round2(labor + adjustedMaterial);
  const markupDelta = round2(subtotalBeforeOverhead - baseCost);

  const uncertaintyPct = quality === 'Low' ? 0.2 : quality === 'High' ? 0.1 : 0.15;
  const rangeLow = round2(grandTotal * (1 - uncertaintyPct));
  const rangeHigh = round2(grandTotal * (1 + uncertaintyPct));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.history);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.materials);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const mapped = parsed
            .filter((item) => item && item.name)
            .map((item) => ({
              id: item.id || makeId(),
              name: item.name,
              cost: round2(item.cost),
            }));
          setMaterialFavorites(mapped);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.materials, JSON.stringify(materialFavorites));
    } catch {}
  }, [materialFavorites]);

  useEffect(() => {
    if (materialFavorites.length === 0) {
      setFavoriteSelection('');
      return;
    }
    const exists = materialFavorites.some((fav) => fav.id === favoriteSelection);
    if (!exists) {
      setFavoriteSelection(materialFavorites[0].id);
    }
  }, [materialFavorites, favoriteSelection]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.draft);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft || typeof draft !== 'object') return;

      if (draft.role && ['Homeowner', 'Contractor'].includes(draft.role)) setRole(draft.role);
      if (draft.projectType && PROJECTS.includes(draft.projectType)) setProjectType(draft.projectType);
      if (draft.quality && QUALITIES.includes(draft.quality)) setQuality(draft.quality);
      if (draft.location && LOCATIONS.includes(draft.location)) setLocation(draft.location);
      if (draft.unit && (draft.unit === 'sqft' || draft.unit === 'sqm')) setUnit(draft.unit);
      if (Number.isFinite(Number(draft.sizeInput))) setSizeInput(Number(draft.sizeInput));
      if (draft.currencyMode && (draft.currencyMode === 'Auto' || draft.currencyMode.length === 3)) setCurrencyMode(draft.currencyMode);
      if (Number.isFinite(Number(draft.overheadPct))) setOverheadPct(round2(draft.overheadPct));
      if (Number.isFinite(Number(draft.taxPct))) setTaxPct(round2(draft.taxPct));
      if (Number.isFinite(Number(draft.discountPct))) setDiscountPct(round2(draft.discountPct));
      if (Number.isFinite(Number(draft.laborMarkupPct))) setLaborMarkupPct(round2(draft.laborMarkupPct));
      if (Number.isFinite(Number(draft.materialMarkupPct))) setMaterialMarkupPct(round2(draft.materialMarkupPct));

      if (draft.materialAdditions && Array.isArray(draft.materialAdditions)) {
        const mapped = draft.materialAdditions
          .filter((item) => item && item.name)
          .map((item) => ({
            entryId: item.entryId || makeId(),
            id: item.id || makeId(),
            name: item.name,
            cost: round2(item.cost),
          }));
        setMaterialAdditions(mapped);
      }

      if (draft.client && typeof draft.client === 'object') {
        setClientName(draft.client.name || '');
        setClientCompany(draft.client.company || '');
        setClientEmail(draft.client.email || '');
        setClientPhone(draft.client.phone || '');
        setClientNotes(draft.client.notes || '');
      }

      if (draft.ts) setDraftSavedAt(draft.ts);
    } catch {}
  }, [setSizeInput]);

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
  }, [role, projectType, quality, location, unit, sizeInput, currencyMode, overheadPct, taxPct, discountPct]);  const persistHistory = (items) => {
    setHistory(items);
    try {
      localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(items));
    } catch {}
  };

  const saveQuote = () => {
    if (err) return;
    const entry = {
      ts: Date.now(),
      role,
      projectType,
      quality,
      location,
      unit,
      size: Number(sizeInput),
      laborBase: labor,
      laborFinal: markupLabor,
      materialBase: material,
      materialExtrasTotal,
      materialFinal: markupMaterial,
      total: grandTotal,
      baseTotal: total,
      currency,
      laborMarkupPct,
      materialMarkupPct,
      overheadPct,
      discountPct,
      taxPct,
    };
    const next = [entry, ...history].slice(0, 5);
    persistHistory(next);
  };

  const saveDraft = () => {
    const payload = {
      ts: Date.now(),
      role,
      projectType,
      quality,
      location,
      unit,
      sizeInput: Number(sizeInput),
      currencyMode,
      overheadPct,
      taxPct,
      discountPct,
      laborMarkupPct,
      materialMarkupPct,
      materialAdditions,
      client: {
        name: clientName,
        company: clientCompany,
        email: clientEmail,
        phone: clientPhone,
        notes: clientNotes,
      },
    };
    try {
      localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(payload));
      setDraftSavedAt(payload.ts);
    } catch {}
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.draft);
    } catch {}
    setRole(DEFAULT_ROLE);
    setProjectType(DEFAULT_PROJECT);
    setQuality(DEFAULT_QUALITY);
    setLocation(DEFAULT_LOCATION);
    setUnit('sqft');
    setSizeInput(100);
    setCurrencyMode('Auto');
    setOverheadPct(10);
    setTaxPct(0);
    setDiscountPct(0);
    setLaborMarkupPct(15);
    setMaterialMarkupPct(10);
    setMaterialAdditions([]);
    setClientName('');
    setClientCompany('');
    setClientEmail('');
    setClientPhone('');
    setClientNotes('');
    setDraftSavedAt(null);
  };

  const addMaterialFromFavorite = () => {
    if (!favoriteSelection) return;
    const fav = materialFavorites.find((item) => item.id === favoriteSelection);
    if (!fav) return;
    setMaterialAdditions((prev) => [
      ...prev,
      { entryId: makeId(), id: fav.id, name: fav.name, cost: round2(fav.cost) },
    ]);
  };

  const removeMaterialAddition = (entryId) => {
    setMaterialAdditions((prev) => prev.filter((item) => item.entryId !== entryId));
  };

  const updateMaterialAdditionCost = (entryId, raw) => {
    const value = parseFloat(raw);
    setMaterialAdditions((prev) =>
      prev.map((item) =>
        item.entryId === entryId
          ? { ...item, cost: Number.isFinite(value) ? round2(value) : 0 }
          : item
      )
    );
  };

  const updateMaterialAdditionName = (entryId, value) => {
    setMaterialAdditions((prev) =>
      prev.map((item) => (item.entryId === entryId ? { ...item, name: value } : item))
    );
  };

  const addFavorite = () => {
    const trimmedName = newFavoriteName.trim();
    const parsedCost = parseFloat(newFavoriteCost);
    if (!trimmedName || !Number.isFinite(parsedCost)) return;
    const favorite = { id: makeId(), name: trimmedName, cost: round2(parsedCost) };
    setMaterialFavorites((prev) => [...prev, favorite]);
    setNewFavoriteName('');
    setNewFavoriteCost('');
    setFavoriteSelection(favorite.id);
  };

  const removeFavorite = (id) => {
    setMaterialFavorites((prev) => prev.filter((item) => item.id !== id));
  };

  const loadQuote = (q) => {
    if (!q) return;
    if (q.role && ['Homeowner', 'Contractor'].includes(q.role)) setRole(q.role);
    if (q.projectType && PROJECTS.includes(q.projectType)) setProjectType(q.projectType);
    if (q.quality && QUALITIES.includes(q.quality)) setQuality(q.quality);
    if (q.location && LOCATIONS.includes(q.location)) setLocation(q.location);
    if (q.unit && (q.unit === 'sqft' || q.unit === 'sqm')) setUnit(q.unit);
    if (Number.isFinite(Number(q.size))) setSizeInput(Number(q.size));
    if (q.currency && q.currency.length === 3) setCurrencyMode(q.currency);
    if (Number.isFinite(Number(q.overheadPct))) setOverheadPct(round2(q.overheadPct));
    if (Number.isFinite(Number(q.taxPct))) setTaxPct(round2(q.taxPct));
    if (Number.isFinite(Number(q.discountPct))) setDiscountPct(round2(q.discountPct));
    if (Number.isFinite(Number(q.laborMarkupPct))) setLaborMarkupPct(round2(q.laborMarkupPct));
    if (Number.isFinite(Number(q.materialMarkupPct))) setMaterialMarkupPct(round2(q.materialMarkupPct));
  };

  const pdfMaterials = useMemo(
    () =>
      materialAdditions.map((item) => ({
        name: item.name,
        cost: round2(item.cost),
      })),
    [materialAdditions]
  );

  const pdfClient = useMemo(
    () => ({
      name: clientName.trim(),
      company: clientCompany.trim(),
      email: clientEmail.trim(),
      phone: clientPhone.trim(),
      notes: clientNotes.trim(),
    }),
    [clientName, clientCompany, clientEmail, clientPhone, clientNotes]
  );

  const pdfTotals = useMemo(
    () => ({
      laborBase: labor,
      laborFinal: markupLabor,
      laborMarkupPct,
      materialBase: material,
      materialExtrasTotal,
      materialFinal: markupMaterial,
      materialMarkupPct,
      subtotal: subtotalBeforeOverhead,
      overheadPct,
      overheadAmt,
      discountPct,
      discountAmt,
      taxPct,
      taxAmt,
      grandTotal,
    }),
    [
      labor,
      markupLabor,
      laborMarkupPct,
      material,
      materialExtrasTotal,
      markupMaterial,
      materialMarkupPct,
      subtotalBeforeOverhead,
      overheadPct,
      overheadAmt,
      discountPct,
      discountAmt,
      taxPct,
      taxAmt,
      grandTotal,
    ]
  );

  const exportPdf = usePdfExporter({
    role,
    projectType,
    quality,
    location,
    sqft: Number(sizeInput),
    unit,
    currency,
    fmt,
    rangeLow,
    rangeHigh,
    materialAdditions: pdfMaterials,
    clientSnapshot: pdfClient,
    totals: pdfTotals,
  });

  const unitLabel = unit === 'sqm' ? 'sq m' : 'sq ft';

  const latestDraftText = draftSavedAt
    ? `Last saved ${new Date(draftSavedAt).toLocaleTimeString()}`
    : 'Draft not saved yet';  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <header className="bg-white border-b rounded-xl">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-sky-600">Quick</span> Quote Estimator
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Fast, contractor-ready ballpark pricing with offline-friendly saves.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-0 py-8">
        <div className="grid lg:grid-cols-[2fr,1fr] gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
              <OptionButtons options={['Homeowner', 'Contractor']} value={role} onChange={setRole} />

              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    Client Snapshot
                  </h2>
                  <span className="text-xs text-slate-500">Keep essentials handy while you edit.</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-600">Client Name</span>
                    <input
                      className="rounded border p-2"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Kelly Ramirez"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-600">Company</span>
                    <input
                      className="rounded border p-2"
                      value={clientCompany}
                      onChange={(e) => setClientCompany(e.target.value)}
                      placeholder="Optional"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-600">Email</span>
                    <input
                      className="rounded border p-2"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="name@email.com"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-600">Phone</span>
                    <input
                      className="rounded border p-2"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-600">Notes</span>
                  <textarea
                    className="rounded border p-2 min-h-[60px]"
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    placeholder="Remind yourself about scope, special materials, or follow-ups."
                  />
                </label>
              </section>

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Project Type</span>
                  <select
                    className="rounded border p-2"
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                  >
                    {PROJECTS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Room Size ({unitLabel})</span>
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
                    <OptionButtons options={['sqft', 'sqm']} value={unit} onChange={setUnit} keyboard={false} />
                  </div>
                  {unit === 'sqm' && (
                    <div className="text-xs text-slate-500">
                      {sizeInput} sq m equals {round2(Number(sizeInput) * 10.7639)} sq ft
                    </div>
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
                    <select
                      className="rounded border p-2"
                      value={currencyMode}
                      onChange={(e) => setCurrencyMode(e.target.value)}
                    >
                      <option value="Auto">Auto ({preferredCurrency})</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CAD">CAD</option>
                      <option value="AUD">AUD</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm">
                      <span>Overhead</span>
                      <input
                        type="range"
                        min={0}
                        max={30}
                        step={1}
                        value={overheadPct}
                        onChange={(e) => setOverheadPct(Number(e.target.value))}
                      />
                      <span className="w-10 text-right">{overheadPct}%</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <span>Tax%</span>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        step={0.5}
                        className="w-20 rounded border p-1"
                        value={taxPct}
                        onChange={(e) => setTaxPct(Number(e.target.value))}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <span>Discount%</span>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        step={0.5}
                        className="w-20 rounded border p-1"
                        value={discountPct}
                        onChange={(e) => setDiscountPct(Number(e.target.value))}
                      />
                    </label>
                  </div>
                </label>
              </div>

              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    Most Used Materials
                  </h2>
                  <span className="text-xs text-slate-500">
                    Build a quick list of go-to items. Stored locally per browser.
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    className="rounded border p-2 flex-1"
                    value={favoriteSelection}
                    onChange={(e) => setFavoriteSelection(e.target.value)}
                  >
                    {materialFavorites.length === 0 && <option value="">No favorites yet</option>}
                    {materialFavorites.map((fav) => (
                      <option key={fav.id} value={fav.id}>
                        {fav.name} ({formatCurrencyFallback(fav.cost, currency)})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="px-4 py-2 rounded border bg-sky-600 text-white hover:bg-sky-700"
                    onClick={addMaterialFromFavorite}
                  >
                    Add to Quote
                  </button>
                </div>

                <details className="rounded border border-slate-200 bg-white p-3 text-sm space-y-3">
                  <summary className="cursor-pointer font-medium text-sky-600">
                    Manage favorite materials
                  </summary>
                  <div className="grid sm:grid-cols-[2fr,1fr,auto] gap-2 pt-2">
                    <input
                      className="rounded border p-2"
                      value={newFavoriteName}
                      placeholder="Material name"
                      onChange={(e) => setNewFavoriteName(e.target.value)}
                    />
                    <input
                      className="rounded border p-2"
                      type="number"
                      min={0}
                      step={1}
                      value={newFavoriteCost}
                      placeholder="Cost"
                      onChange={(e) => setNewFavoriteCost(e.target.value)}
                    />
                    <button
                      type="button"
                      className="px-4 py-2 rounded border hover:bg-slate-50"
                      onClick={addFavorite}
                    >
                      Save
                    </button>
                  </div>
                  {materialFavorites.length > 0 && (
                    <ul className="space-y-2">
                      {materialFavorites.map((fav) => (
                        <li key={fav.id} className="flex items-center gap-2 text-xs">
                          <span className="flex-1 text-slate-600">{fav.name}</span>
                          <span className="text-slate-500">
                            {formatCurrencyFallback(fav.cost, currency)}
                          </span>
                          <button
                            type="button"
                            className="px-2 py-1 rounded border border-rose-200 text-rose-500 hover:bg-rose-50"
                            onClick={() => removeFavorite(fav.id)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </details>

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase text-slate-600">Added to this quote</h3>
                  {materialAdditions.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No quick materials added yet. Add items above to include them in this estimate.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {materialAdditions.map((item) => (
                        <li
                          key={item.entryId}
                          className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm bg-white border border-slate-200 rounded p-2"
                        >
                          <input
                            className="rounded border p-2 flex-1"
                            value={item.name}
                            onChange={(e) => updateMaterialAdditionName(item.entryId, e.target.value)}
                          />
                          <div className="flex items-center gap-2">
                            <input
                              className="rounded border p-2 w-28"
                              type="number"
                              min={0}
                              step={1}
                              value={item.cost}
                              onChange={(e) => updateMaterialAdditionCost(item.entryId, e.target.value)}
                            />
                            <span className="text-xs text-slate-500">{currency}</span>
                          </div>
                          <button
                            type="button"
                            className="px-3 py-1 rounded border border-slate-300 hover:bg-slate-50"
                            onClick={() => removeMaterialAddition(item.entryId)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>              {err ? (
                <div className="rounded border border-rose-300 bg-rose-50 text-rose-700 p-3 text-sm">{err}</div>
              ) : (
                <div className="rounded-xl border bg-slate-50 p-4 space-y-3">
                  <div className="font-semibold">Estimate</div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-slate-500">
                        Labor (includes {laborMarkupPct}% markup)
                      </dt>
                      <dd className="font-medium">{fmt.format(markupLabor)}</dd>
                      <div className="text-xs text-slate-500">Base {fmt.format(labor)}</div>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">
                        Materials (includes {materialMarkupPct}% markup)
                      </dt>
                      <dd className="font-medium">{fmt.format(markupMaterial)}</dd>
                      <div className="text-xs text-slate-500">
                        Base {fmt.format(material)} + quick adds {fmt.format(materialExtrasTotal)}
                      </div>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Markup impact</dt>
                      <dd className="font-medium">{fmt.format(markupDelta)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Subtotal before overhead</dt>
                      <dd className="font-medium">{fmt.format(subtotalBeforeOverhead)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Overhead ({overheadPct}%)</dt>
                      <dd className="font-medium">{fmt.format(overheadAmt)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Discount ({discountPct}%)</dt>
                      <dd className="font-medium">-{fmt.format(discountAmt)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Tax ({taxPct}%)</dt>
                      <dd className="font-medium">{fmt.format(taxAmt)}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-slate-500">Grand total</dt>
                      <dd className="text-lg font-semibold">{fmt.format(grandTotal)}</dd>
                    </div>
                  </dl>
                  <div className="text-xs text-slate-600">
                    Confidence range (+/- {Math.round(uncertaintyPct * 100)}%): {fmt.format(rangeLow)} - {fmt.format(rangeHigh)}
                  </div>
                  <BreakdownChart labor={markupLabor} material={markupMaterial} overhead={overheadAmt} />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="px-4 py-2 rounded border bg-sky-600 text-white hover:bg-sky-700"
                  onClick={exportPdf}
                >
                  Download Summary PDF
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded border hover:bg-slate-50"
                  onClick={saveDraft}
                >
                  Save Draft for Later
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded border hover:bg-slate-50"
                  onClick={saveQuote}
                >
                  Save Quote to History
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded border border-rose-300 text-rose-600 hover:bg-rose-50"
                  onClick={clearDraft}
                >
                  Clear Draft
                </button>
                <span className="text-xs text-slate-500">{latestDraftText}</span>
              </div>
            </div>

            {history.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-6 space-y-3">
                <div className="font-medium">Recent Quotes</div>
                <ul className="space-y-2">
                  {history.map((q, i) => (
                    <li key={`${q.ts}:${i}`} className="flex items-center gap-3 text-sm">
                      <div className="flex-1 text-slate-700 truncate">
                        {new Date(q.ts).toLocaleString()} - {q.projectType} - {q.size} {q.unit === 'sqm' ? 'sq m' : 'sq ft'} - {q.quality} - {q.location}
                        <span className="ml-2 text-slate-500">
                          {formatCurrencyFallback(q.total, q.currency || currency)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="px-3 py-1 rounded border hover:bg-slate-50"
                        onClick={() => loadQuote(q)}
                      >
                        Load
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="bg-white rounded-xl shadow-sm border p-6 space-y-4 h-fit">
            <h2 className="text-lg font-semibold text-slate-800">Markup Calculator</h2>
            <p className="text-sm text-slate-500">
              Tune your labor and material markups to see profit impact instantly.
            </p>
            <div className="space-y-3">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-slate-600">Labor markup (%)</span>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  value={laborMarkupPct}
                  onChange={(e) => setLaborMarkupPct(Number(e.target.value))}
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  className="w-24 rounded border p-2"
                  value={laborMarkupPct}
                  onChange={(e) => setLaborMarkupPct(Number(e.target.value))}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-slate-600">Material markup (%)</span>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  value={materialMarkupPct}
                  onChange={(e) => setMaterialMarkupPct(Number(e.target.value))}
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  className="w-24 rounded border p-2"
                  value={materialMarkupPct}
                  onChange={(e) => setMaterialMarkupPct(Number(e.target.value))}
                />
              </label>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Base cost</span>
                <span className="font-medium">{fmt.format(baseCost)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Markup added</span>
                <span className="font-medium">{fmt.format(markupDelta)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Subtotal before overhead</span>
                <span className="font-medium">{fmt.format(subtotalBeforeOverhead)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Quick material adds</span>
                <span className="font-medium">{fmt.format(materialExtrasTotal)}</span>
              </div>
            </div>
            <div className="text-xs text-slate-500">
              Tip: Save a draft when you break for the day. Everything stays local to this device.
            </div>
          </aside>
        </div>

        <footer className="max-w-6xl mx-auto px-0 py-8 text-xs text-slate-400">
          Copyright {new Date().getFullYear()} QuickQuote - Estimates are for guidance only.
        </footer>
      </main>
    </div>
  );
}
