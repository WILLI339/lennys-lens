# Lenny's Lens

Revealing the relationship between Lenny Rachitsky's written editorial voice and his guest conversations. See how newsletter claims connect to podcast moments — where they agree, extend, or contradict.

## How It Works

A 4-step AI pipeline (powered by Claude) analyzes Lenny's content:

1. **Extract Claims** — Pulls 3-8 key claims from each newsletter
2. **Extract Moments** — Pulls 3-8 key moments from each podcast transcript
3. **Match** — Connects claims to moments with relationship types (supports/extends/contradicts)
4. **Build Graph** — Computes synthesis labels and assembles the final dataset

Each claim gets a synthesis label based on guest support:
- **Consensus** — 3+ guests independently agree
- **Synthesis** — Lenny combined insights from 2 guests
- **Curation** — Amplified one guest's idea
- **Original** — Lenny's own addition

## Pages

- `/` — Overview with stats, topic explorer, and conviction map
- `/topics` — Browse all topics
- `/topics/[slug]` — Deep dive into a topic's claims, moments, and cutting room floor
- `/newsletter/[slug]` — All claims from a newsletter with podcast connections
- `/search` — Full-text search across claims and moments

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Running the Pipeline

Requires an `ANTHROPIC_API_KEY` environment variable.

```bash
# Run all steps
npm run pipeline

# Or run individually
npm run pipeline:claims
npm run pipeline:moments
npm run pipeline:match
npm run pipeline:build
```

Data source: `../lennys-newsletterpodcastdata/` (newsletters and podcast transcripts).

## Tech Stack

- Next.js 16 + React 19
- Tailwind CSS 4 + shadcn/ui
- Anthropic Claude API (pipeline)
- Static JSON data (`public/data/graph.json`)
