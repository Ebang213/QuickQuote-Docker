# How to help on this repo

- Prefer **small, isolated PRs** with clear commit messages (conventional commits).
- Follow project style: React + Vite + Tailwind.
- Add/keep **unit tests** with Vitest. Touching `src/lib/calc.js`? Update/add tests in `src/__tests__/`.
- Keep UI logic in React components; move computation to `src/lib/*`.
- Accessibility: label inputs, keyboard support for toggles, visible error states.
- Performance: memoize heavy calculations and avoid recreating formatters per render.
- Docker: image is `admin213/quickquote`. Build is multi-arch via GH Actions.
- What to skip: compiled output (`dist/`, `build/`), lockfiles, `node_modules/`.
- Use GitHub Issues for bugs/features; tag with relevant labels.
- For major changes, discuss via issue/PR first to align with project goals.