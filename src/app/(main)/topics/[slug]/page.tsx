import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SynthesisBadge } from "@/components/synthesis-badge";
import { ClaimCard } from "@/components/claim-card";
import {
  getTopic,
  getTopics,
  getClaimsForTopic,
  getMomentsForTopic,
  getCuttingRoomFloor,
} from "@/lib/data";

export function generateStaticParams() {
  return getTopics().map((t) => ({ slug: t.slug }));
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) return notFound();

  const topics = getTopics();
  const claims = getClaimsForTopic(slug);
  const moments = getMomentsForTopic(slug);
  const cuttingRoomFloor = getCuttingRoomFloor(slug);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/topics"
          className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; All topics
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {topic.name}
        </h1>
        <p className="mt-2 text-muted-foreground">{topic.newsletterPosition}</p>
        <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
          <span>{claims.length} claims</span>
          <span>{moments.length} moments</span>
          <span className="text-amber-600">
            {cuttingRoomFloor.length} on the cutting room floor
          </span>
        </div>
      </div>

      {/* Topic navigation */}
      <div className="flex flex-wrap gap-2">
        {topics.map((t) => (
          <Link key={t.slug} href={`/topics/${t.slug}`}>
            <Badge
              variant={t.slug === slug ? "default" : "outline"}
              className="cursor-pointer"
            >
              {t.name}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Lenny's Position */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Lenny&apos;s Written Position
        </h2>
        <div className="space-y-3">
          {claims.map((claim) => (
            <ClaimCard key={claim.id} claim={claim} />
          ))}
        </div>
      </section>

      {/* All podcast moments on this topic */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Podcast Moments
        </h2>
        <div className="space-y-3">
          {moments.map((moment) => (
            <Card key={moment.id}>
              <CardContent className="space-y-2 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{moment.speaker}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {moment.timestamp}
                  </span>
                </div>
                <blockquote className="border-l-2 border-muted pl-3 text-sm italic text-foreground/90">
                  &ldquo;{moment.text}&rdquo;
                </blockquote>
                <p className="text-xs text-muted-foreground">
                  {moment.podcastTitle} &middot; {moment.podcastGuest}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Cutting Room Floor */}
      {cuttingRoomFloor.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">
              Cutting Room Floor
            </h2>
            <p className="text-sm text-muted-foreground">
              Guest insights on this topic that Lenny hasn&apos;t (yet) written
              about in his newsletters. Potential material for future posts.
            </p>
          </div>
          <div className="space-y-3">
            {cuttingRoomFloor.map((moment) => (
              <Card
                key={moment.id}
                className="border-dashed border-amber-300 bg-amber-50/50"
              >
                <CardContent className="space-y-2 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">
                      {moment.speaker}
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-amber-100 text-amber-800 border-amber-200 text-xs"
                    >
                      Unsynthesized
                    </Badge>
                  </div>
                  <blockquote className="border-l-2 border-amber-300 pl-3 text-sm italic text-foreground/90">
                    &ldquo;{moment.text}&rdquo;
                  </blockquote>
                  <p className="text-xs text-muted-foreground">
                    {moment.podcastTitle} &middot; {moment.podcastGuest}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
