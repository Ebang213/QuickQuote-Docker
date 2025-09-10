# Copilot instructions

**Project intent:** QuickQuote – a Vite + React + Tailwind app with a simple cost estimator and optional PDF export.

**Coding style:**
- Prefer small pure functions and React hooks for UI state/logic.
- Keep QuickQuoteEstimator.jsx lean; move business logic into `/src/lib/**`.
- Use Vitest + Testing Library for unit tests.

**Don't edit:**
- `/coverage/**`
- compiled artifacts under `/dist/**` or `/build/**`.

**When adding tests:**
- Put unit tests in `/src/__tests__` using `*.test.js`.
- Use `vitest` and `@testing-library/react` helpers.

**When touching CI:**
- Keep workflows self-contained and avoid committing secrets.
