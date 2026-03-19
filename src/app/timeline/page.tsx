"use client";

import { Suspense, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getTopicTimelineData, getTopics, getTimelineDateBounds } from "@/lib/data";
import { TopicTimeline } from "@/components/topic-timeline";
import { SYNTHESIS_COLORS } from "@/components/network-graph";
import type { TimelineItem, SynthesisLabel } from "@/lib/types";

export default function TimelinePageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-[calc(100vh-3.5rem)] items-center justify-center text-muted-foreground">Loading timeline…</div>}>
      <TimelinePage />
    </Suspense>
  );
}

function TopicSparkline({ dates, active }: { dates: string[]; active: boolean }) {
  if (dates.length === 0) {
    // Flat gray line for zero-item topics
    return (
      <svg width={40} height={16} className="hidden sm:inline-block" aria-hidden>
        <line x1={0} y1={8} x2={40} y2={8} stroke="#6B6560" strokeWidth={1} strokeOpacity={0.3} />
      </svg>
    );
  }

  const bounds = getTimelineDateBounds();
  if (!bounds) return null;

  const minT = new Date(bounds.min).getTime();
  const maxT = new Date(bounds.max).getTime();
  const range = maxT - minT || 1;

  // Build density bins (8 bins across the time range)
  const bins = new Array(8).fill(0);
  for (const d of dates) {
    const t = new Date(d).getTime();
    const bin = Math.min(7, Math.floor(((t - minT) / range) * 8));
    bins[bin]++;
  }
  const maxBin = Math.max(1, ...bins);

  // Generate path
  const points = bins.map((count, i) => {
    const x = (i / 7) * 40;
    const y = 14 - (count / maxBin) * 12;
    return `${x},${y}`;
  });
  const pathD = `M${points.join(" L")}`;

  return (
    <svg width={40} height={16} className="hidden sm:inline-block" aria-hidden>
      <path
        d={pathD}
        fill="none"
        stroke="#E8813B"
        strokeWidth={1.5}
        strokeOpacity={active ? 1 : 0.5}
      />
    </svg>
  );
}

function TimelinePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const topicParam = searchParams.get("topic");

  const [allTopics] = useState(() => getTopics());
  const [allTimelines] = useState(() => getTopicTimelineData());

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

  // Find the earliest item for the annotation card
  const earliestItem = useMemo(() => {
    const allItems = allTimelines.flatMap((tl) => tl.items);
    if (allItems.length === 0) return null;
    return allItems.reduce((earliest, item) =>
      new Date(item.date) < new Date(earliest.date) ? item : earliest
    );
  }, [allTimelines]);

  // Determine if there's a significant time gap (> 1 year between earliest and second-earliest newsletter)
  const timeGap = useMemo(() => {
    if (!earliestItem) return null;
    const allItems = allTimelines.flatMap((tl) => tl.items);
    const sortedDates = [...new Set(allItems.map((i) => i.date))]
      .map((d) => new Date(d).getTime())
      .sort((a, b) => a - b);
    if (sortedDates.length < 2) return null;
    const gapMs = sortedDates[1] - sortedDates[0];
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (gapMs < oneYear) return null;

    const firstDate = new Date(sortedDates[0]);
    const secondDate = new Date(sortedDates[1]);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return {
      firstDate: `${months[firstDate.getMonth()]} ${firstDate.getFullYear()}`,
      secondDate: `${months[secondDate.getMonth()]} ${secondDate.getFullYear()}`,
      gapYears: Math.round(gapMs / oneYear),
      topic: earliestItem.topics[0] || "this topic",
    };
  }, [allTimelines, earliestItem]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto border-b px-4 py-2">
        <span className="shrink-0 text-sm font-medium text-muted-foreground">Filter:</span>
        <button
          onClick={() => setSelectedTopic(null)}
          role="radio"
          aria-checked={selectedTopic === null}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
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
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
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
          <TopicTimeline
            timelines={filteredTimelines}
            onDotClick={handleDotClick}
          />
        )}
      </div>

      {/* Annotation card — the "screenshot moment" */}
      {timeGap && !selectedTopic && (
        <div className="border-t px-4 py-4">
          <div
            className="mx-auto max-w-2xl rounded-lg p-4"
            style={{
              borderLeft: "2px solid #E8813B",
              background: "rgba(232, 129, 59, 0.08)",
            }}
          >
            <h3 className="font-[family-name:var(--font-instrument-serif)] text-lg">
              The Gap
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Lenny first wrote about {timeGap.topic.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")} in{" "}
              <span className="font-[family-name:var(--font-geist-mono)] text-xs">{timeGap.firstDate}</span>
              {" "}&mdash; {timeGap.gapYears} year{timeGap.gapYears > 1 ? "s" : ""} before
              podcast guests began validating it.
            </p>
            <div className="mt-2 flex items-center gap-2 font-[family-name:var(--font-geist-mono)] text-xs text-muted-foreground">
              <span>{timeGap.firstDate}</span>
              <span className="flex-1 border-t border-dashed border-[#E8813B]/40" />
              <span>{timeGap.secondDate}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
