import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SynthesisBadge, SynthesisLegend } from "@/components/synthesis-badge";
import { getNewsletters, getTopics, getStats } from "@/lib/data";

export default function Home() {
  const newsletters = getNewsletters();
  const topics = getTopics();
  const stats = getStats();

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Lenny&apos;s Lens
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Revealing the relationship between Lenny&apos;s written editorial voice
          and his guest conversations. See how newsletter claims connect to
          podcast moments — where they agree, extend, or contradict.
        </p>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {[
          { label: "Newsletters", value: stats.newsletters },
          { label: "Podcasts", value: stats.podcasts },
          { label: "Claims", value: stats.claims },
          { label: "Moments", value: stats.moments },
          { label: "Connections", value: stats.connections },
          { label: "Cutting Room", value: stats.cuttingRoomFloor },
          { label: "Topics", value: stats.topics },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Glossary */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold uppercase tracking-wide text-muted-foreground">
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
              Links between claims and moments showing where guests <span className="text-emerald-600">support</span>, <span className="text-blue-600">extend</span>, or <span className="text-red-600">contradict</span> Lenny&apos;s written positions.
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
              Podcast moments tagged with a topic but not connected to any newsletter claim — guest insights Lenny hasn&apos;t (yet) written about. Potential future material.
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-medium">Synthesis Labels</p>
            <p className="text-muted-foreground">
              How a claim relates to podcast conversations: <span className="text-emerald-600">Consensus</span> (3+ guests agree), <span className="text-blue-600">Synthesis</span> (2 guests combined), <span className="text-amber-600">Curation</span> (1 guest amplified), <span className="text-purple-600">Original</span> (Lenny&apos;s own).
            </p>
          </div>
        </div>
      </section>

      {/* Synthesis Legend */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold uppercase tracking-wide text-muted-foreground">
          Synthesis Tracker
        </h2>
        <SynthesisLegend />
      </section>

      {/* Topics */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Topic Explorer
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...topics].sort((a, b) => b.claimCount - a.claimCount || b.momentCount - a.momentCount).map((topic) => (
            <Link key={topic.slug} href={`/topics/${topic.slug}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
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
                      <span className="text-amber-600">
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
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Conviction Map
        </h2>
        <p className="text-sm text-muted-foreground">
          Each newsletter&apos;s key claims, connected to supporting podcast moments.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {newsletters.map((newsletter) => {
            const totalConnections = newsletter.claims.reduce(
              (sum, c) => sum + c.connectionCount,
              0
            );
            return (
              <Link
                key={newsletter.slug}
                href={`/newsletter/${newsletter.slug}`}
              >
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">
                        {newsletter.title}
                      </CardTitle>
                      <span className="shrink-0 text-xs text-muted-foreground">
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
                    <div className="flex gap-3 text-xs text-muted-foreground">
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
    </div>
  );
}
