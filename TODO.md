# TODO

## Features

- [x] ~~**Topic evolution over time**~~ — Done. D3 dot timeline at `/timeline` with topic swim lanes, synthesis-colored claim dots, hover tooltips, clickable navigation, URL-synced filters with sparklines, first/last labels, mobile bottom sheet, and editorial annotation card.
- [ ] **Surprising connections** — Editorially curated section highlighting unexpected cross-topic claim→moment connections. E.g., "Dr. Becky Kennedy (child psychologist) independently validates Lenny's leadership framework from a parenting perspective." Could be computed from topic distance or manually curated.
- [ ] **Shared TopicFilterPills component** — Extract the topic filter pill UI (used on `/graph` and `/timeline`) into a shared component at `src/components/topic-filter-pills.tsx` with URL-sync support. Trigger: when a 3rd page needs the same pattern. P3.
- [ ] **Timeline keyboard navigation** — Add arrow key navigation between dots on `/timeline` (left/right = time, up/down = topic lanes, Enter = open tooltip or navigate). When a dot is focused, highlight its connected lines (idea web). Accessibility win (WCAG 2.1 Level AA) and power-user feature. P2.
- [x] ~~**Timeline OG image**~~ — Done. Dedicated 1200x630 OG image at `/timeline/opengraph-image` with mini swim lanes, topic names, and claim/moment counts.

## Data

- [x] ~~**Ingest remaining 30 podcasts**~~ — Done. All 50 podcasts ingested (228 moments, 156 connections).
- [x] ~~**Ingest full paid archive**~~ — Done. 289 newsletters + 288 podcasts ingested. 846 claims, 1044 moments, 686 connections.
