"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { TimelineItem, TopicTimeline, SynthesisLabel } from "@/lib/types";
import { SYNTHESIS_COLORS } from "@/components/network-graph";

/*
  SVG Structure (desktop):
  ┌──────────────────────────────────────────────────────────────┐
  │  [lane-label]  ●──●──●●─●──────●────── [first/last labels] │  ← swim lane (40px)
  │  [lane-label]  ──────●──●──●────────────●──────             │
  │  ...                                                         │
  │                May'25  Jul'25  Sep'25  Nov'25  Jan'26  Mar'26│  ← x-axis
  └──────────────────────────────────────────────────────────────┘

  Mobile (< 640px): rotated — time top-to-bottom, topics as columns
*/

const MOMENT_COLOR = "#4B5563";
const LABEL_WIDTH = 130;
const LANE_HEIGHT = 40;
const MARGIN = { top: 40, right: 100, bottom: 10, left: LABEL_WIDTH + 10 };
const MOBILE_MARGIN = { top: 50, right: 10, bottom: 20, left: 10 };
const MOBILE_COL_WIDTH = 50;
const MOBILE_BREAKPOINT = 640;

// Approach B: compute the dense period, excluding outliers > 6 months from the main cluster
function computeDensePeriod(allDates: number[]): { denseMin: number; denseMax: number; outliers: number[] } {
  if (allDates.length === 0) return { denseMin: 0, denseMax: 0, outliers: [] };
  const sorted = [...allDates].sort((a, b) => a - b);
  const sixMonths = 180 * 24 * 60 * 60 * 1000;

  // Find the dense cluster: walk from the end and find where the gap exceeds 6 months
  const outliers: number[] = [];
  let denseStart = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] > sixMonths) {
      // Everything before index i is an outlier
      for (let j = 0; j < i; j++) outliers.push(sorted[j]);
      denseStart = i;
    }
  }

  return {
    denseMin: sorted[denseStart],
    denseMax: sorted[sorted.length - 1],
    outliers,
  };
}

function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return hash;
}

function jitter(id: string, range: number): number {
  const h = hashCode(id);
  return ((h % (range * 2 + 1)) - range);
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
}

interface TooltipData {
  item: TimelineItem;
  x: number;
  y: number;
}

export function TopicTimeline({
  timelines,
  onDotClick,
}: {
  timelines: TopicTimeline[];
  onDotClick?: (item: TimelineItem) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const isMobileRef = useRef(false);
  const [containerWidth, setContainerWidth] = useState(0);

  // Single ResizeObserver — updates containerWidth which triggers D3 re-render
  useEffect(() => {
    if (!containerRef.current) return;
    let timeout: ReturnType<typeof setTimeout>;

    // Set initial width
    setContainerWidth(containerRef.current.clientWidth);

    const observer = new ResizeObserver((entries) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const w = entries[0]?.contentRect.width ?? 0;
        if (w > 0) setContainerWidth(w);
      }, 150);
    });
    observer.observe(containerRef.current);
    return () => { observer.disconnect(); clearTimeout(timeout); };
  }, []);

  // D3 render effect — depends on data, width, and click handler
  useEffect(() => {
    if (!svgRef.current || containerWidth === 0) return;

    const width = containerWidth;
    const mobile = width < MOBILE_BREAKPOINT;
    isMobileRef.current = mobile;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    if (timelines.length === 0) return;

    // Flatten all items to find date bounds
    const allItems = timelines.flatMap((tl) => tl.items);
    const allDates = allItems.map((d) => new Date(d.date).getTime()).filter((d) => !isNaN(d));
    if (allDates.length === 0) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Determine if single-topic expansion
    const singleTopic = timelines.length === 1;

    if (mobile) {
      renderMobile(svg, timelines, allDates, width, singleTopic, prefersReducedMotion, onDotClick, setTooltip);
    } else {
      renderDesktop(svg, timelines, allDates, width, singleTopic, prefersReducedMotion, onDotClick, setTooltip);
    }
  }, [timelines, onDotClick, containerWidth]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg ref={svgRef} className="w-full" />

      {/* Tooltip */}
      {tooltip && !isMobileRef.current && (
        <div
          className="pointer-events-none absolute z-50 w-80 rounded-lg border border-border bg-background p-3 shadow-lg"
          style={{
            left: Math.min(tooltip.x, (containerRef.current?.clientWidth || 800) - 340),
            top: Math.max(8, tooltip.y - 8),
            opacity: 1,
            transition: "opacity 150ms ease-out",
          }}
        >
          <TooltipContent item={tooltip.item} />
        </div>
      )}

      {/* Mobile bottom sheet */}
      {tooltip && isMobileRef.current && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 max-h-[40vh] overflow-y-auto rounded-t-xl border-t border-border bg-background p-4 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
          <TooltipContent item={tooltip.item} />
        </div>
      )}

      {/* Mobile backdrop */}
      {tooltip && isMobileRef.current && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setTooltip(null)}
        />
      )}
    </div>
  );
}

function TooltipContent({ item }: { item: TimelineItem }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {item.type === "claim" && item.synthesisLabel && (
          <span className="flex items-center gap-1.5 text-xs font-medium">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: SYNTHESIS_COLORS[item.synthesisLabel] }}
            />
            {item.synthesisLabel.charAt(0).toUpperCase() + item.synthesisLabel.slice(1)}
          </span>
        )}
        {item.type === "moment" && (
          <span className="flex items-center gap-1.5 text-xs font-medium">
            <span className="inline-block h-2 w-2 rounded-full bg-slate-500" />
            Moment
          </span>
        )}
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {item.type === "claim" ? (item.claimType || "Claim") : "Moment"}
        </span>
      </div>
      <p className={`text-sm leading-relaxed ${item.type === "moment" ? "italic" : ""}`} style={{
        display: "-webkit-box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>
        {item.label}
      </p>
      <div className="space-y-0.5 font-[family-name:var(--font-geist-mono)] text-xs text-muted-foreground">
        {item.type === "claim" && (
          <>
            <p className="truncate">{item.newsletterTitle}</p>
            <p>{formatShortDate(item.date)} &middot; {item.connectionCount ?? 0} connections</p>
          </>
        )}
        {item.type === "moment" && (
          <>
            <p className="truncate">{item.guest} &middot; {item.podcastTitle}</p>
            <p>{formatShortDate(item.date)}{item.timestamp ? ` · ${item.timestamp}` : ""}</p>
          </>
        )}
      </div>
    </div>
  );
}

function renderDesktop(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  timelines: TopicTimeline[],
  allDates: number[],
  width: number,
  singleTopic: boolean,
  prefersReducedMotion: boolean,
  onDotClick: ((item: TimelineItem) => void) | undefined,
  setTooltip: (t: TooltipData | null) => void,
) {
  const laneHeight = singleTopic ? Math.max(LANE_HEIGHT, 200) : LANE_HEIGHT;
  const height = MARGIN.top + timelines.length * laneHeight + MARGIN.bottom;
  svg.attr("width", width).attr("height", height).attr("viewBox", `0 0 ${width} ${height}`);

  // Approach B: use dense period only for the x-axis, exclude outliers
  const { denseMin, denseMax, outliers } = computeDensePeriod(allDates);
  const outlierSet = new Set(outliers);
  const padMs = 14 * 24 * 60 * 60 * 1000;
  const xScale = d3.scaleTime()
    .domain([new Date(denseMin - padMs), new Date(denseMax + padMs)])
    .range([MARGIN.left, width - MARGIN.right]);

  const g = svg.append("g");

  // Swim lane backgrounds and dividers
  timelines.forEach((tl, i) => {
    const y = MARGIN.top + i * laneHeight;

    // Divider line
    if (i > 0) {
      g.append("line")
        .attr("x1", 0).attr("x2", width)
        .attr("y1", y).attr("y2", y)
        .attr("stroke", "#2A2A42").attr("stroke-width", 1);
    }

    // Lane label
    g.append("text")
      .attr("x", LABEL_WIDTH)
      .attr("y", y + laneHeight / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("font-size", 14)
      .attr("font-weight", 600)
      .attr("fill", "#9B9587")
      .text(tl.topicName.length > 18 ? tl.topicName.slice(0, 16) + "…" : tl.topicName);
  });

  // X-axis at top — tick every 2 months to avoid overcrowding
  const xAxis = d3.axisTop(xScale)
    .ticks(d3.timeMonth.every(2))
    .tickFormat((d) => {
      const date = d as Date;
      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      return `${months[date.getMonth()]} '${String(date.getFullYear()).slice(2)}`;
    });

  g.append("g")
    .attr("transform", `translate(0,${MARGIN.top})`)
    .call(xAxis)
    .call((g) => {
      g.select(".domain").attr("stroke", "#2A2A42");
      g.selectAll(".tick line").attr("stroke", "#2A2A42");
      g.selectAll(".tick text")
        .attr("fill", "#6B6560")
        .attr("font-size", 11)
        .attr("font-family", "var(--font-geist-mono)")
        .attr("letter-spacing", "0.1em");
    });

  // Dots
  const jitterRange = singleTopic ? Math.floor(laneHeight * 0.3) : 10;

  timelines.forEach((tl, laneIndex) => {
    const laneY = MARGIN.top + laneIndex * laneHeight + laneHeight / 2;

    // Filter to dense-period items only (outliers shown in annotation card)
    const denseItems = tl.items.filter((item) => !outlierSet.has(new Date(item.date).getTime()));

    // First/last labels (based on dense items)
    if (denseItems.length > 0) {
      const first = denseItems[0];
      const last = denseItems[denseItems.length - 1];
      const firstX = xScale(new Date(first.date));
      const lastX = xScale(new Date(last.date));

      if (denseItems.length === 1) {
        g.append("text")
          .attr("x", firstX).attr("y", laneY - laneHeight / 2 + 12)
          .attr("text-anchor", "middle")
          .attr("font-size", 11)
          .attr("font-family", "var(--font-geist-mono)")
          .attr("fill", "#9B9587")
          .text(`Only: ${formatShortDate(first.date)}`);
      } else {
        g.append("text")
          .attr("x", Math.max(MARGIN.left, firstX)).attr("y", laneY - laneHeight / 2 + 12)
          .attr("text-anchor", "start")
          .attr("font-size", 11)
          .attr("font-family", "var(--font-geist-mono)")
          .attr("fill", "#9B9587")
          .text(`First: ${formatShortDate(first.date)}`);

        // Only show "Latest" if far enough from "First" to not overlap
        if (lastX - firstX > 120) {
          g.append("text")
            .attr("x", Math.min(width - MARGIN.right, lastX)).attr("y", laneY - laneHeight / 2 + 12)
            .attr("text-anchor", "end")
            .attr("font-size", 11)
            .attr("font-family", "var(--font-geist-mono)")
            .attr("fill", "#9B9587")
            .text(`Latest: ${formatShortDate(last.date)}`);
        }
      }
    }

    // Render dots (dense period only)
    denseItems.forEach((item, dotIndex) => {
      const cx = xScale(new Date(item.date));
      const yJitter = jitter(item.id, jitterRange);
      const cy = laneY + yJitter;
      const r = item.type === "claim"
        ? Math.min(10, 6 + (item.connectionCount || 0) * 0.5)
        : 3;
      const fill = item.type === "claim" && item.synthesisLabel
        ? SYNTHESIS_COLORS[item.synthesisLabel]
        : MOMENT_COLOR;

      const dot = g.append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", r)
        .attr("fill", fill)
        .attr("stroke", item.type === "claim" ? "rgba(255,255,255,0.15)" : "none")
        .attr("stroke-width", item.type === "claim" ? 1.5 : 0)
        .attr("cursor", "pointer")
        .attr("role", "img")
        .attr("aria-label", `${item.type}: ${item.label.slice(0, 80)}`);

      // Invisible larger hit target
      g.append("circle")
        .attr("cx", cx).attr("cy", cy).attr("r", 22)
        .attr("fill", "transparent")
        .attr("cursor", "pointer")
        .on("mouseover", () => setTooltip({ item, x: cx, y: cy - r - 8 }))
        .on("mouseout", () => setTooltip(null))
        .on("click", () => onDotClick?.(item));

      // Entrance animation
      if (!prefersReducedMotion) {
        dot.attr("opacity", 0)
          .transition()
          .delay(laneIndex * 40 + dotIndex * 20)
          .duration(250)
          .ease(d3.easeCubicOut)
          .attr("opacity", 1);
      }
    });
  });
}

function renderMobile(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  timelines: TopicTimeline[],
  allDates: number[],
  width: number,
  singleTopic: boolean,
  prefersReducedMotion: boolean,
  onDotClick: ((item: TimelineItem) => void) | undefined,
  setTooltip: (t: TooltipData | null) => void,
) {
  // Mobile: time flows top-to-bottom, topics as columns
  const colWidth = Math.max(MOBILE_COL_WIDTH, (width - MOBILE_MARGIN.left - MOBILE_MARGIN.right) / timelines.length);
  const chartHeight = 400;
  const height = MOBILE_MARGIN.top + chartHeight + MOBILE_MARGIN.bottom;
  svg.attr("width", width).attr("height", height).attr("viewBox", `0 0 ${width} ${height}`);

  const dateMin = new Date(Math.min(...allDates));
  const dateMax = new Date(Math.max(...allDates));
  const padMs = 14 * 24 * 60 * 60 * 1000;

  // Y = time (inverted: most recent at top)
  const yScale = d3.scaleTime()
    .domain([new Date(dateMax.getTime() + padMs), new Date(dateMin.getTime() - padMs)])
    .range([MOBILE_MARGIN.top, MOBILE_MARGIN.top + chartHeight]);

  const g = svg.append("g");

  // Topic column labels at top
  timelines.forEach((tl, i) => {
    const cx = MOBILE_MARGIN.left + i * colWidth + colWidth / 2;
    const abbrev = tl.topicName.length > 5 ? tl.topicName.slice(0, 4) + "…" : tl.topicName;
    g.append("text")
      .attr("x", cx).attr("y", 16)
      .attr("text-anchor", "middle")
      .attr("font-size", 10)
      .attr("font-weight", 600)
      .attr("fill", "#9B9587")
      .text(abbrev);
  });

  // Y-axis (time)
  const yAxis = d3.axisLeft(yScale)
    .ticks(6)
    .tickFormat((d) => {
      const date = d as Date;
      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      return `${months[date.getMonth()]} '${String(date.getFullYear()).slice(2)}`;
    });

  g.append("g")
    .attr("transform", `translate(${MOBILE_MARGIN.left},0)`)
    .call(yAxis)
    .call((g) => {
      g.select(".domain").attr("stroke", "#2A2A42");
      g.selectAll(".tick line").attr("stroke", "#2A2A42");
      g.selectAll(".tick text")
        .attr("fill", "#6B6560")
        .attr("font-size", 10)
        .attr("font-family", "var(--font-geist-mono)");
    });

  // Dots
  timelines.forEach((tl, colIndex) => {
    const cx = MOBILE_MARGIN.left + colIndex * colWidth + colWidth / 2;

    tl.items.forEach((item, dotIndex) => {
      const cy = yScale(new Date(item.date));
      const xJitter = jitter(item.id, Math.floor(colWidth * 0.2));
      const r = item.type === "claim"
        ? Math.min(8, 5 + (item.connectionCount || 0) * 0.4)
        : 2.5;
      const fill = item.type === "claim" && item.synthesisLabel
        ? SYNTHESIS_COLORS[item.synthesisLabel]
        : MOMENT_COLOR;

      const dot = g.append("circle")
        .attr("cx", cx + xJitter).attr("cy", cy)
        .attr("r", r).attr("fill", fill)
        .attr("cursor", "pointer");

      // Hit target
      g.append("circle")
        .attr("cx", cx + xJitter).attr("cy", cy).attr("r", 22)
        .attr("fill", "transparent")
        .attr("cursor", "pointer")
        .on("click", () => setTooltip({ item, x: cx + xJitter, y: cy }));

      if (!prefersReducedMotion) {
        dot.attr("opacity", 0)
          .transition()
          .delay(colIndex * 40 + dotIndex * 20)
          .duration(250)
          .ease(d3.easeCubicOut)
          .attr("opacity", 1);
      }
    });
  });
}
