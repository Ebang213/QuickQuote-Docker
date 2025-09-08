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

## Notes
- Tailwind is already configured via `index.css`, `tailwind.config.js` and `postcss.config.js`.
- The app is small and self-contained; adjust the multipliers in `src/lib/rates.json` and `QuickQuoteEstimator.jsx` for your needs.
