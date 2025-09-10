![CI](https://github.com/Ebang213/QuickQuote-Docker/actions/workflows/ci.yml/badge.svg)
[![Docker Publish](https://github.com/Ebang213/QuickQuote-Docker/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/Ebang213/QuickQuote-Docker/actions/workflows/docker-publish.yml)

A simple home renovation cost estimator built with **React + Vite + Tailwind** with optional **Docker** deployment and **PDF export**.

## Run locally (recommended)
```bash
npm install
npm run dev
# open http://localhost:5173
```

## Build & preview
```bash
npm run build
npm run preview
```

## Docker (production build served by Nginx)
```bash
# from the project root
docker build -t quickquote ./QuickQuote
docker run -p 8080:80 --rm quickquote
# open http://localhost:8080
```

## Docker (developer hot‑reload)
```bash
# from QuickQuote/
npm run docker:dev        # runs Vite in a Node container on :5173
npm run docker:dev:down   # stop and remove
```

## Environment configuration
You can override defaults by creating a `.env` file (see `.env.example`).

- `VITE_APP_NAME`: App display name and document title
- `VITE_DEFAULT_ROLE`: `Homeowner` or `Contractor`
- `VITE_DEFAULT_PROJECT`: One of the project names in `src/lib/rates.json`
- `VITE_DEFAULT_QUALITY`: `Low` | `Medium` | `High`
- `VITE_DEFAULT_LOCATION`: e.g. `US`, `Ghana`

## PWA / Offline support
- Added a basic service worker and web manifest. The app can open offline if previously loaded.
- Files: `public/sw.js`, `public/manifest.webmanifest`, `public/offline.html`, `public/favicon.svg`.
- Nginx is configured to avoid caching the service worker for faster updates.

## CI
GitHub Actions workflow runs unit tests and builds on pushes and PRs:
- `.github/workflows/ci.yml`

Optional Docker publishing (set `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` repository secrets):
- `.github/workflows/docker-publish.yml` pushes `admin213/quickquote:latest`.

## Notes
- Tailwind is already configured via `index.css`, `tailwind.config.js` and `postcss.config.js`.
- The app is small and self-contained; adjust the multipliers in `src/lib/rates.json` and `QuickQuoteEstimator.jsx` for your needs.
