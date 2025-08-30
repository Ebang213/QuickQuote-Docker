import React from "react";
import QuickQuoteEstimator from "./QuickQuoteEstimator.jsx";

export default function App() {
  return (
    <div className="min-h-screen text-slate-800">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-sky-600">Quick</span>Quote Estimator
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Fast, ballpark pricing for common renovation projects.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <QuickQuoteEstimator />
      </main>

      <footer className="max-w-4xl mx-auto px-6 py-8 text-xs text-slate-400">
        © {new Date().getFullYear()} QuickQuote — Estimates are for guidance only.
      </footer>
    </div>
  );
}
