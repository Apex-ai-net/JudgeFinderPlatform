# Contributing

## Development
- Use Node `20.x` locally (`.nvmrc` provided). Netlify builds on Node 18 per `netlify.toml`.
- Install deps: `npm install`
- Start dev: `npm run dev`
- Type check: `npm run type-check`
- Lint: `npm run lint`

## Code Style
- TypeScript for app and libs; Node scripts may be JS.
- Keep changes focused and minimal; prefer small PRs.
- Add comments to migrations and new SQL objects.
- Functions < 40 lines, classes < 200 lines. Split aggressively.
- Naming: descriptive, intention‑revealing; avoid `data`, `info`, `temp`.

## PR Guidelines
- One logical change per PR; write a clear description and screenshots when UI changes.
- Include tests or scripts to validate changes where applicable.
- Update relevant docs under `docs/` and link to them in the PR.

## Documentation Style
- Use sentence‑case headings (e.g., “Setup & run”).
- Keep sections short with task‑oriented bullets.
- Prefer relative links within `docs/` (e.g., `../operations/SYNC_AND_CRON.md`).
- Include code fences with language tags (```ts, ```bash) where appropriate.
- Avoid duplicate sources of truth; link to a canonical doc instead.

## Testing & Validation
- Validate environment locally (`.env.local`).
- Use `/api/health` and `/api/admin/sync-status` for smoke checks.
- For heavy sync tasks, reduce batch sizes while iterating.
