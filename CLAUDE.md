# CLAUDE.md — Lenny's Lens

## Project
Lenny's Lens is a Next.js 16 app that analyzes the relationship between Lenny Rachitsky's newsletter claims and podcast guest conversations. It's a competition entry for lennysdata.com — the goal is to get Lenny to reshare it.

## Commands
- `npm run dev` — Start dev server
- `npm test` — Run vitest tests
- `npm run pipeline` — Run full data pipeline (needs ANTHROPIC_API_KEY)
- `npm run pipeline:bootstrap` — Extract intermediate files from graph.json

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Testing
- Framework: vitest + @testing-library/react
- Run: `npm test`
- Test directory: `tests/`
- See TESTING.md for conventions
- 100% test coverage is the goal — tests make vibe coding safe
- When writing new functions, write a corresponding test
- When fixing a bug, write a regression test

## Architecture
- Data: Static JSON (`public/data/graph.json`)
- Pipeline: 4-step TypeScript scripts in `scripts/pipeline/`
- Pages: Next.js App Router with `(main)` route group for standard pages, `/graph` full-width
- Components: shadcn/ui base with custom claim-card, connection-card, synthesis-badge
