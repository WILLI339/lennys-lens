"use client";

import { Suspense, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getTopicTimelineData, getTopics, getWebConnectionsForTopic } from "@/lib/data";
import { TopicTimeline } from "@/components/topic-timeline";
import { TopicSparkline } from "@/components/topic-sparkline";
import { SYNTHESIS_COLORS } from "@/components/network-graph";
import type { TimelineItem, SynthesisLabel } from "@/lib/types";

export default function TimelinePageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-[calc(100vh-3.5rem)] items-center justify-center text-muted-foreground">Loading timeline…</div>}>
      <TimelinePage />
    </Suspense>
  );
}

function TimelinePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const topicParam = searchParams.get("topic");

  const MAX_TOPICS = 25;
  const MAX_DEFAULT_CONNECTIONS = 8;
  const [allTopics] = useState(() => getTopics());
  const [allTimelines] = useState(() => {
    const all = getTopicTimelineData();
    return all.slice(0, MAX_TOPICS);
  });
  const [showAllConnections, setShowAllConnections] = useState(false);

  // Validate topic param
  const selectedTopic = useMemo(() => {
    if (!topicParam) return null;
    const valid = allTopics.some((t) => t.slug === topicParam);
    return valid ? topicParam : null;
  }, [topicParam, allTopics]);

  // Show invalid topic message
  const invalidTopic = topicParam && !selectedTopic;

  const filteredTimelines = useMemo(() => {
    if (!selectedTopic) return allTimelines;
    return getTopicTimelineData(selectedTopic);
  }, [selectedTopic, allTimelines]);

  // Get web connections for the selected topic (only when single topic is selected)
  const webConnections = useMemo(() => {
    if (!selectedTopic) return [];
    return getWebConnectionsForTopic(selectedTopic);
  }, [selectedTopic]);

  // Reset "show all" when topic changes
  useMemo(() => {
    setShowAllConnections(false);
  }, [selectedTopic]);

  // Compute sparkline dates per topic
  const sparklineDates = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const tl of allTimelines) {
      map.set(tl.topicSlug, tl.items.map((i) => i.date));
    }
    return map;
  }, [allTimelines]);

  // Unique topic slugs from the data (for filter pills)
  const topicSlugs = useMemo(() => {
    return allTimelines.map((tl) => ({ slug: tl.topicSlug, name: tl.topicName }));
  }, [allTimelines]);

  const setSelectedTopic = useCallback((slug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set("topic", slug);
    } else {
      params.delete("topic");
    }
    router.replace(`/timeline?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleDotClick = useCallback((item: TimelineItem) => {
    if (item.type === "claim" && item.newsletterSlug) {
      router.push(`/newsletter/${item.newsletterSlug}`);
    } else if (item.topics.length > 0) {
      router.push(`/topics/${item.topics[0]}`);
    }
  }, [router]);

  // Compute annotation data: find topics where Lenny wrote before guests validated
  const annotation = useMemo(() => {
    const sixMonths = 180 * 24 * 60 * 60 * 1000;
    const earlyTopics: { topic: string; claimDate: string; firstMomentDate: string; gapMonths: number }[] = [];

    for (const tl of allTimelines) {
      const claims = tl.items.filter((i) => i.type === "claim");
      const moments = tl.items.filter((i) => i.type === "moment");
      if (claims.length === 0 || moments.length === 0) continue;

      const earliestClaim = new Date(claims[0].date).getTime();
      const earliestMoment = new Date(moments[0].date).getTime();
      const gap = earliestMoment - earliestClaim;

      if (gap > sixMonths) {
        earlyTopics.push({
          topic: tl.topicName,
          claimDate: claims[0].date,
          firstMomentDate: moments[0].date,
          gapMonths: Math.round(gap / (30 * 24 * 60 * 60 * 1000)),
        });
      }
    }

    if (earlyTopics.length === 0) return null;
    earlyTopics.sort((a, b) => b.gapMonths - a.gapMonths);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const fmt = (d: string) => { const dt = new Date(d); return `${months[dt.getMonth()]} ${dt.getFullYear()}`; };

    return {
      topics: earlyTopics,
      headline: earlyTopics.length === 1
        ? `Lenny wrote about ${earlyTopics[0].topic} ${earlyTopics[0].gapMonths} months before podcast guests began discussing it.`
        : `${earlyTopics.length} topics appeared in Lenny's newsletters months before podcast guests validated them.`,
      details: earlyTopics.map((t) => ({
        name: t.topic,
        wrote: fmt(t.claimDate),
        validated: fmt(t.firstMomentDate),
        gap: t.gapMonths,
      })),
    };
  }, [allTimelines]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto border-b px-4 py-2">
        <span className="shrink-0 text-sm font-medium text-muted-foreground">Filter:</span>
        <button
          onClick={() => setSelectedTopic(null)}
          role="radio"
          aria-checked={selectedTopic === null}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-3 text-sm font-medium transition-colors ${
            selectedTopic === null
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          All
        </button>
        {topicSlugs.map(({ slug, name }) => (
          <button
            key={slug}
            onClick={() => setSelectedTopic(slug === selectedTopic ? null : slug)}
            role="radio"
            aria-checked={selectedTopic === slug}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-3 text-sm font-medium transition-colors ${
              selectedTopic === slug
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {name}
            <TopicSparkline
              dates={sparklineDates.get(slug) || []}
              active={selectedTopic === slug}
            />
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 border-b px-4 py-1.5 text-xs">
        <span className="font-medium text-muted-foreground">Claims:</span>
        {(Object.entries(SYNTHESIS_COLORS) as [SynthesisLabel, string][]).map(([label, color]) => (
          <span key={label} className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            {label.charAt(0).toUpperCase() + label.slice(1)}
          </span>
        ))}
        <span className="mx-2 text-muted-foreground">|</span>
        <span className="font-medium text-muted-foreground">Moments:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-slate-500" />
          Podcast moment
        </span>
        {/* Connection legend (when single topic is selected) */}
        {selectedTopic && webConnections.length > 0 && (
          <>
            <span className="mx-2 text-muted-foreground">|</span>
            <span className="font-medium text-muted-foreground">Connections:</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-[2px] w-4 bg-emerald-400" />
              supports
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-[2px] w-4 border-t-2 border-dashed border-blue-400" />
              extends
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-[2px] w-4 border-t-2 border-dotted border-red-400" />
              contradicts
            </span>
          </>
        )}
      </div>

      {/* Invalid topic message */}
      {invalidTopic && (
        <div className="border-b border-amber-500/30 bg-amber-500/5 px-4 py-2 text-xs text-amber-400">
          Topic not found. Showing all topics.
        </div>
      )}

      {/* Visualization area */}
      <div className="relative min-h-0 flex-1 overflow-y-auto">
        {filteredTimelines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-muted-foreground">
              No claims or moments for this topic yet.
              <br />
              Try another topic or view all.
            </p>
            <button
              onClick={() => setSelectedTopic(null)}
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
            >
              View All Topics
            </button>
          </div>
        ) : (
          <>
            <TopicTimeline
              timelines={filteredTimelines}
              webConnections={webConnections}
              showAllConnections={showAllConnections}
              onDotClick={handleDotClick}
            />
            {/* "Show all connections" toggle */}
            {selectedTopic && webConnections.length > MAX_DEFAULT_CONNECTIONS && (
              <div className="border-t px-4 py-3 text-sm text-muted-foreground">
                {showAllConnections ? (
                  <span>
                    Showing all {webConnections.length} connections.{" "}
                    <button
                      onClick={() => setShowAllConnections(false)}
                      className="font-medium text-[#E8813B] transition-colors hover:text-[#F5A66B]"
                    >
                      Show fewer
                    </button>
                  </span>
                ) : (
                  <span>
                    Showing {MAX_DEFAULT_CONNECTIONS} of {webConnections.length} connections.{" "}
                    <button
                      onClick={() => setShowAllConnections(true)}
                      className="font-medium text-[#E8813B] transition-colors hover:text-[#F5A66B]"
                    >
                      Show all
                    </button>
                  </span>
                )}
              </div>
            )}
            {/* Empty connections note for single topic */}
            {selectedTopic && webConnections.length === 0 && (
              <div className="border-t px-4 py-3 text-xs text-muted-foreground">
                No idea connections found for this topic yet.
              </div>
            )}
            {/* Annotation card — inside scroll area, below the visualization */}
            {annotation && !selectedTopic && (
              <div className="border-t px-4 py-4">
          <div
            className="mx-auto max-w-2xl rounded-lg p-4"
            style={{
              borderLeft: "2px solid #E8813B",
              background: "rgba(232, 129, 59, 0.08)",
            }}
          >
            <h3 className="font-[family-name:var(--font-instrument-serif)] text-lg">
              Ahead of the Curve
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {annotation.headline}
            </p>
            <div className="mt-3 space-y-2">
              {annotation.details.map((t) => (
                <div key={t.name} className="flex items-center gap-2 font-[family-name:var(--font-geist-mono)] text-xs text-muted-foreground">
                  <span className="w-32 shrink-0 truncate text-right font-sans text-xs font-medium text-foreground/70">{t.name}</span>
                  <span className="shrink-0">{t.wrote}</span>
                  <span className="flex-1 border-t border-dashed border-[#E8813B]/40" />
                  <span className="shrink-0">{t.validated}</span>
                  <span className="shrink-0 rounded bg-[#E8813B]/15 px-1.5 py-0.5 text-[10px] text-[#E8813B]">
                    {t.gap}mo ahead
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
