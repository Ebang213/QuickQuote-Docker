QuickQuote-Docker

This repository contains the QuickQuote application and its containerization assets.

- App source lives in `QuickQuote/`
- Local dev: `cd QuickQuote && npm install && npm run dev`
- Docker (prod): `docker build -t quickquote ./QuickQuote && docker run -p 8080:80 --rm quickquote`
- Docker (dev hot-reload): `cd QuickQuote && npm run docker:dev`

Highlights added:
- Dev docker-compose for hot reload (`QuickQuote/docker-compose.dev.yml`)
- Basic PWA/offline support (`QuickQuote/public/*`)
- Safer Nginx config with security headers (`QuickQuote/nginx.conf`)
- GitHub Actions CI for tests/build and optional Docker publish (`.github/workflows/*`)

For app-specific details, see `QuickQuote/README.md`.

