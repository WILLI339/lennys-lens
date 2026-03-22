import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SynthesisBadge, SynthesisLegend } from "@/components/synthesis-badge";
import { HeroGraph } from "@/components/hero-graph";
import { TopicSparkline } from "@/components/topic-sparkline";
import { getNewsletters, getTopics, getStats, getMostValidatedClaims, getMostAlignedGuests, getMostChallengingGuests, getTopicTimelineData } from "@/lib/data";

export default function Home() {
  const newsletters = getNewsletters();
  const topics = getTopics();
  const stats = getStats();

  return (
    <div className="space-y-12">
      {/* Hero with Graph */}
      <section className="space-y-6">
        <div className="space-y-4">
          <h1 className="font-[family-name:var(--font-instrument-serif)] text-4xl tracking-tight sm:text-5xl">
            Lenny&apos;s <em className="text-[#E8813B]">Lens</em>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Mapping the intellectual ecosystem between Lenny&apos;s newsletter and
            his podcast guests. See how ideas propagate, evolve, and sometimes
            contradict across both mediums over time.
          </p>
        </div>

        {/* Inline stats */}
        <div className="flex flex-wrap gap-6">
          {[
            { label: "Newsletters", value: stats.newsletters },
            { label: "Podcasts", value: stats.podcasts },
            { label: "Claims", value: stats.claims },
            { label: "Moments", value: stats.moments },
            { label: "Connections", value: stats.connections },
            { label: "Topics", value: stats.topics },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col">
              <span className="font-[family-name:var(--font-geist-mono)] text-2xl font-bold">{stat.value}</span>
              <span className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-widest text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Hero Graph */}
        <div className="relative -mx-4 overflow-hidden rounded-xl border">
          <HeroGraph />
          <div className="absolute bottom-3 right-3">
            <Link
              href="/graph"
              className="rounded-full bg-[#E8813B] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#F5A66B]"
            >
              Explore full graph &rarr;
            </Link>
          </div>
          {/* Legend overlay */}
          <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-lg bg-background/80 px-3 py-1.5 text-[10px] backdrop-blur">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#34D399]" />Consensus</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#60A5FA]" />Synthesis</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#FBBF24]" />Curation</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#A78BFA]" />Original</span>
            <span className="text-muted-foreground">|</span>
            <span className="flex items-center gap-1"><span className="inline-block h-[2px] w-3 bg-[#34D399]" />Supports</span>
            <span className="flex items-center gap-1"><span className="inline-block h-[2px] w-3 bg-[#60A5FA]" />Extends</span>
          </div>
        </div>
      </section>

      {/* Most Validated Ideas */}
      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="font-[family-name:var(--font-geist-mono)] text-xs font-medium uppercase tracking-widest text-[#E8813B]">
          Most Validated Ideas
        </h2>
        <h3 className="font-[family-name:var(--font-instrument-serif)] text-2xl tracking-tight">
          Lenny&apos;s claims, ranked by guest consensus
        </h3>
        <div className="space-y-3">
          {getMostValidatedClaims().slice(0, 10).map((claim, i) => (
            <Link key={claim.id} href={`/newsletter/${claim.newsletterSlug}`}>
              <div className="flex items-start gap-4 rounded-lg border border-border p-4 transition-all duration-200 hover:border-[#E8813B]/50">
                <span className="font-[family-name:var(--font-geist-mono)] text-2xl font-bold text-muted-foreground/30">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 space-y-2">
                  <p className="font-[family-name:var(--font-instrument-serif)] text-base leading-relaxed">
                    {claim.text}
                  </p>
                  <div className="flex items-center gap-3">
                    <SynthesisBadge label={claim.synthesisLabel} />
                    <span className="font-[family-name:var(--font-geist-mono)] text-xs text-muted-foreground">
                      {claim.connectionCount} connections &middot; {claim.uniqueGuests} guests
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Guest Influence — Two Rankings */}
      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="font-[family-name:var(--font-geist-mono)] text-xs font-medium uppercase tracking-widest text-[#E8813B]">
          Guest Influence
        </h2>
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Most Aligned */}
          <div className="space-y-3">
            <h3 className="font-[family-name:var(--font-instrument-serif)] text-xl tracking-tight">
              Most Aligned with Lenny
            </h3>
            <p className="text-xs text-muted-foreground">
              Guests whose insights most deeply validate Lenny&apos;s written positions, ranked by high-confidence connections.
            </p>
            <div className="space-y-2">
              {getMostAlignedGuests().slice(0, 9).map((guest, i) => (
                <div key={guest.guest} className="flex items-center gap-3 rounded-lg border border-border p-3 transition-all duration-200 hover:border-emerald-500/50">
                  <span className="font-[family-name:var(--font-geist-mono)] text-lg font-bold text-muted-foreground/30">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{guest.guest}</p>
                    <div className="flex gap-3 font-[family-name:var(--font-geist-mono)] text-xs text-muted-foreground">
                      <span className="text-emerald-400">{guest.highConfConnections} deep connections</span>
                      <span>{guest.uniqueClaims} claims touched</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Most Challenging */}
          <div className="space-y-3">
            <h3 className="font-[family-name:var(--font-instrument-serif)] text-xl tracking-tight">
              Most Challenging to Lenny
            </h3>
            <p className="text-xs text-muted-foreground">
              Guests who pushed back on Lenny&apos;s positions with evidence or experience that contradicts his claims.
            </p>
            <div className="space-y-2">
              {getMostChallengingGuests().slice(0, 9).map((guest, i) => (
                <div key={guest.guest} className="flex items-center gap-3 rounded-lg border border-border p-3 transition-all duration-200 hover:border-red-500/50">
                  <span className="font-[family-name:var(--font-geist-mono)] text-lg font-bold text-muted-foreground/30">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{guest.guest}</p>
                    <div className="flex gap-3 font-[family-name:var(--font-geist-mono)] text-xs text-muted-foreground">
                      <span className="text-red-400">{guest.contradicts} contradiction{guest.contradicts !== 1 ? 's' : ''}</span>
                      <span className="text-emerald-400">{guest.supports} supports</span>
                      <span className="text-blue-400">{guest.extends} extends</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-geist-mono)] text-xs font-medium uppercase tracking-widest text-[#E8813B]">
          How It Works
        </h2>
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="font-medium">Claims</p>
            <p className="text-muted-foreground">
              Key assertions extracted from Lenny&apos;s newsletters — frameworks, recommendations, observations, or predictions he makes.
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-medium">Moments</p>
            <p className="text-muted-foreground">
              Notable quotes and insights from podcast guests — the most substantive, quotable statements from each conversation.
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-medium">Connections</p>
            <p className="text-muted-foreground">
              An idea web linking claims and moments in all directions — guests validating Lenny, Lenny building on guests, and ideas that <span className="text-emerald-400">support</span>, <span className="text-blue-400">extend</span>, or <span className="text-red-400">contradict</span> each other.
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-medium">Topics</p>
            <p className="text-muted-foreground">
              Themes that bridge newsletters and podcasts — like &ldquo;growth&rdquo; or &ldquo;ai-tools&rdquo; — grouping related claims and moments together.
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-medium">Cutting Room Floor</p>
            <p className="text-muted-foreground">
              Podcast moments tagged with a topic but not connected to any newsletter claim — guest insights Lenny hasn&apos;t (yet) written about.
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-medium">Synthesis Labels</p>
            <p className="text-muted-foreground">
              How a claim relates to podcast conversations: <span className="text-emerald-400">Consensus</span> (3+ guests agree), <span className="text-blue-400">Synthesis</span> (2 guests), <span className="text-amber-400">Curation</span> (1 guest), <span className="text-purple-400">Original</span> (Lenny&apos;s own).
            </p>
          </div>
        </div>
      </section>

      {/* Topics */}
      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="font-[family-name:var(--font-instrument-serif)] text-2xl tracking-tight">
          Topic Explorer
        </h2>
        {/* Sparkline pills — visual preview linking to Timeline */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {getTopicTimelineData().slice(0, 25).map((tl) => (
            <Link
              key={tl.topicSlug}
              href={`/timeline?topic=${tl.topicSlug}`}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {tl.topicName}
              <TopicSparkline
                dates={tl.items.map((i) => i.date)}
                active={false}
              />
            </Link>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...topics].sort((a, b) => b.claimCount - a.claimCount || b.momentCount - a.momentCount).filter(t => t.claimCount + t.momentCount > 10).slice(0, 16).map((topic) => (
            <Link key={topic.slug} href={`/topics/${topic.slug}`}>
              <Card className="h-full transition-all duration-200 hover:border-[#E8813B]/50 hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{topic.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {topic.newsletterPosition}
                  </p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{topic.claimCount} claims</span>
                    <span>{topic.momentCount} moments</span>
                    {topic.cuttingRoomFloorCount > 0 && (
                      <span className="text-amber-400">
                        {topic.cuttingRoomFloorCount} unsynthesized
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Newsletters */}
      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="font-[family-name:var(--font-instrument-serif)] text-2xl tracking-tight">
          Conviction Map
        </h2>
        <p className="text-sm text-muted-foreground">
          Each newsletter&apos;s key claims and how they connect to podcast moments and other claims.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {newsletters.filter(n => n.claims.length > 0).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20).map((newsletter) => {
            const totalConnections = newsletter.claims.reduce(
              (sum, c) => sum + c.connectionCount,
              0
            );
            return (
              <Link
                key={newsletter.slug}
                href={`/newsletter/${newsletter.slug}`}
              >
                <Card className="h-full transition-all duration-200 hover:border-[#E8813B]/50 hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">
                        {newsletter.title}
                      </CardTitle>
                      <span className="shrink-0 font-[family-name:var(--font-geist-mono)] text-xs text-muted-foreground">
                        {newsletter.date}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {newsletter.subtitle}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {newsletter.claims.map((claim) => (
                        <SynthesisBadge
                          key={claim.id}
                          label={claim.synthesisLabel}
                        />
                      ))}
                    </div>
                    <div className="flex gap-3 font-[family-name:var(--font-geist-mono)] text-xs text-muted-foreground">
                      <span>{newsletter.claims.length} claims</span>
                      <span>{totalConnections} connections</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Built With */}
      <footer className="space-y-4 border-t border-border pt-8 pb-12">
        <h2 className="font-[family-name:var(--font-geist-mono)] text-xs font-medium uppercase tracking-widest text-[#E8813B]">
          How This Was Built
        </h2>
        <div className="max-w-2xl space-y-3 text-sm text-muted-foreground">
          <p>
            Lenny&apos;s Lens was built in a single session using{" "}
            <span className="text-foreground font-medium">Claude Code</span> (Anthropic&apos;s CLI for Claude) with{" "}
            <span className="text-foreground font-medium">gstack</span> for QA testing, design review, and design consultation.
          </p>
          <p>
            The pipeline uses Claude to extract claims from newsletters, extract moments from podcasts,
            and semantically match them into an idea web — showing how ideas propagate, evolve, and
            sometimes contradict across 921 connections. The timeline reveals Lenny&apos;s intellectual
            evolution over time.
          </p>
          <p>
            Data sourced from{" "}
            <span className="text-foreground font-medium">lennysdata.com</span> — Lenny&apos;s public archive of newsletter posts and podcast transcripts.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <a
            href="https://www.linkedin.com/in/swilliams185/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-[#E8813B]"
          >
            LinkedIn
          </a>
          <span className="text-muted-foreground/30">&middot;</span>
          <a
            href="https://x.com/swilliams185"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-[#E8813B]"
          >
            @swilliams185
          </a>
        </div>
        <div className="flex items-center gap-4 font-[family-name:var(--font-geist-mono)] text-xs text-muted-foreground">
          <span>Next.js 16</span>
          <span className="text-border">&middot;</span>
          <span>D3.js</span>
          <span className="text-border">&middot;</span>
          <span>Claude Code</span>
          <span className="text-border">&middot;</span>
          <span>gstack</span>
          <span className="text-border">&middot;</span>
          <span>Tailwind CSS</span>
        </div>
      </footer>
    </div>
  );
}
