# Design System — Lenny's Lens

## Product Context
- **What this is:** An editorial analysis tool that maps relationships between Lenny Rachitsky's newsletter claims and podcast guest conversations
- **Who it's for:** Product people who follow Lenny — PMs, founders, growth practitioners. Also: Lenny himself (this is a competition entry for the lennysdata.com build challenge)
- **Space/industry:** Editorial analysis, media intelligence, data visualization
- **Project type:** Interactive visual essay / analysis dashboard hybrid
- **Goal:** Visually striking enough to screenshot, share, and get reshared by Lenny. Must stand out from 50+ competing projects.

## Aesthetic Direction
- **Direction:** Editorial/Magazine
- **Decoration level:** Intentional — warmth through color and typography, no decoration for its own sake
- **Mood:** "The Pudding meets Lenny's campfire brand" — analytical yet warm, serious but not corporate. Premium editorial product, not a SaaS dashboard.
- **Reference sites:** lennysdata.com (warm cream palette), The Pudding (editorial data viz), Stratechery (serious analysis)

## Typography
- **Display/Hero:** Instrument Serif — elegant editorial serif. Instant differentiation from every other project in the Lenny ecosystem. Reads as "serious analysis."
- **Body:** Instrument Sans — pairs perfectly with Instrument Serif, clean and highly readable
- **UI/Labels:** Instrument Sans 500/600 weight
- **Data/Tables:** Geist Mono — timestamps, confidence scores, connection counts. Must use `font-variant-numeric: tabular-nums`
- **Code:** Geist Mono
- **Loading:** Google Fonts `Instrument+Sans:wght@400;500;600;700` + `Instrument+Serif:ital@0;1`
- **Scale:**
  - Hero: 64px / 4rem (Instrument Serif)
  - H1: 36px / 2.25rem (Instrument Serif)
  - H2: 24px / 1.5rem (Instrument Serif)
  - H3: 18px / 1.125rem (Instrument Sans 600)
  - Body: 16px / 1rem (Instrument Sans)
  - Small: 14px / 0.875rem
  - Caption/Label: 12px / 0.75rem (Instrument Sans or Geist Mono)
  - Micro: 11px / 0.6875rem (Geist Mono, uppercase, letter-spacing 0.1em)

## Color
- **Approach:** Balanced — primary accent for brand identity, semantic colors for synthesis labels
- **Primary:** `#E8813B` (Campfire amber) — connects to Lenny's brand instantly. Use for CTAs, active states, the italic "Lens" in the logo
- **Primary Light:** `#F5A66B` — hover states
- **Secondary:** `#1A1A2E` (Deep navy) — high contrast editorial authority
- **Dark mode (default):**
  - Background: `#0F0F1A` (Night)
  - Elevated: `#1A1A2E` (Deep navy)
  - Card: `#1F1F35`
  - Subtle: `#16162A`
  - Text: `#F0EAE0` (warm off-white, not pure white)
  - Text muted: `#9B9587`
  - Text dim: `#6B6560`
  - Border: `#2A2A42`
- **Light mode:**
  - Background: `#FDF8F0` (Warm cream)
  - Elevated: `#FFFFFF`
  - Card: `#FFFFFF`
  - Subtle: `#F5EFE5`
  - Text: `#1A1A2E`
  - Text muted: `#6B6560`
  - Text dim: `#9B9587`
  - Border: `#E5DDD0`
- **Synthesis labels (both modes):**
  - Consensus: `#34D399` (emerald green) — 3+ guests agree
  - Synthesis: `#60A5FA` (sky blue) — Lenny combined 2 guests
  - Curation: `#FBBF24` (amber) — amplified 1 guest
  - Original: `#A78BFA` (violet) — Lenny's own addition
- **Relationship colors:**
  - Supports: `#34D399` (green)
  - Extends: `#60A5FA` (blue)
  - Contradicts: `#F87171` (red)
- **Badge backgrounds (dark mode):** Use 15% opacity of the badge color as background

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable — editorial products need breathing room
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px) 4xl(80px)
- **Section spacing:** 64px between major sections, 32px between subsections

## Layout
- **Approach:** Hybrid — grid-disciplined for data pages, creative-editorial for homepage hero and graph
- **Grid:** 12 columns, gutter 24px
- **Max content width:** 1200px (72rem)
- **Graph page:** Full-width, no max-width constraint
- **Border radius:**
  - sm: 4px (inputs, small elements)
  - md: 8px (buttons, badges)
  - lg: 12px (cards)
  - xl: 16px (large containers, graph preview)
  - full: 9999px (pills, avatars)

## Motion
- **Approach:** Intentional — subtle entrance animations, smooth transitions. Nothing bouncy.
- **Easing:** enter: ease-out, exit: ease-in, move: ease-in-out
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms)
- **Card hover:** `transition: border-color 0.2s ease-out, box-shadow 0.2s ease-out`
- **Graph nodes:** D3 force simulation with natural physics, no artificial springiness
- **Page transitions:** None (Next.js handles navigation)
- **`prefers-reduced-motion`:** Must be respected — disable entrance animations

## Brand Mark
- **Logo treatment:** "Lenny's" in Instrument Sans + "*Lens*" in Instrument Serif italic, colored `#E8813B`
- **Example:** `Lenny's` `Lens` (serif italic in amber)

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-18 | Dark mode as default | Screenshots on Twitter/LinkedIn look more striking in dark mode. Light mode available via toggle. |
| 2026-03-18 | Instrument Serif for display | No other Lenny data project uses a serif. Instant differentiation. Reads as "editorial analysis." |
| 2026-03-18 | Campfire amber (#E8813B) as primary | Connects to Lenny's iconic fire brand. Makes the project feel native to his ecosystem. |
| 2026-03-18 | Graph as hero | The force-directed network graph is the unique visual asset. Make it the first thing people see and screenshot. |
| 2026-03-18 | Initial design system created | Created by /design-consultation based on competitive research of Lenny's brand, lennysdata.com, LennyRPG, and the editorial analysis space. |
