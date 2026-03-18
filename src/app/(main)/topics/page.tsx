import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SynthesisLegend } from "@/components/synthesis-badge";
import { getTopics, getClaimsForTopic } from "@/lib/data";

export default function TopicsPage() {
  const topics = getTopics();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-instrument-serif)] text-2xl tracking-tight sm:text-3xl">
          Topics
        </h1>
        <p className="mt-2 text-muted-foreground">
          Themes that bridge Lenny&apos;s newsletters and podcast conversations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => {
          const claims = getClaimsForTopic(topic.slug);
          const synthesisBreakdown = {
            consensus: claims.filter((c) => c.synthesisLabel === "consensus").length,
            synthesis: claims.filter((c) => c.synthesisLabel === "synthesis").length,
            curation: claims.filter((c) => c.synthesisLabel === "curation").length,
            original: claims.filter((c) => c.synthesisLabel === "original").length,
          };

          return (
            <Link key={topic.slug} href={`/topics/${topic.slug}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{topic.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {topic.newsletterPosition}
                  </p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
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
          );
        })}
      </div>
    </div>
  );
}
