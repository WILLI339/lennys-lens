"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SynthesisBadge } from "@/components/synthesis-badge";
import type { ClaimWithSynthesis, PodcastMoment, SynthesisLabel } from "@/lib/types";

type ClaimResult = ClaimWithSynthesis & { newsletterTitle: string };
type MomentResult = PodcastMoment & { podcastTitle: string };

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    claims: ClaimResult[];
    moments: MomentResult[];
  }>({ claims: [], moments: [] });
  const [searching, setSearching] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults({ claims: [], moments: [] });
      return;
    }
    setSearching(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setResults(data);
    setSearching(false);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => search(query), 300);
    return () => clearTimeout(timeout);
  }, [query, search]);

  const total = results.claims.length + results.moments.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-instrument-serif)] text-2xl tracking-tight sm:text-3xl">
          Search
        </h1>
        <p className="mt-2 text-muted-foreground">
          Search across newsletter claims and podcast moments.
        </p>
      </div>

      <input
        type="text"
        placeholder="Search claims and moments..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        autoFocus
      />

      {query.length >= 2 && (
        <p className="text-sm text-muted-foreground">
          {searching ? "Searching..." : `${total} result${total !== 1 ? "s" : ""}`}
        </p>
      )}

      {results.claims.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Claims ({results.claims.length})
          </h2>
          <div className="space-y-3">
            {results.claims.map((claim) => (
              <Link
                key={claim.id}
                href={`/newsletter/${claim.newsletterSlug}`}
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="space-y-2 pt-4">
                    <p className="text-sm font-medium">{claim.text}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <SynthesisBadge label={claim.synthesisLabel} />
                      <Badge variant="outline" className="text-xs capitalize">
                        {claim.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        from {claim.newsletterTitle}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {results.moments.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Podcast Moments ({results.moments.length})
          </h2>
          <div className="space-y-3">
            {results.moments.map((moment) => (
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
                    {moment.podcastTitle} &middot; {moment.guest}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {query.length >= 2 && !searching && total === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          No results found for &ldquo;{query}&rdquo;
        </p>
      )}
    </div>
  );
}
