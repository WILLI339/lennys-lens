"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { TimelineItem, TopicTimeline, SynthesisLabel, Relationship } from "@/lib/types";
import type { WebConnection } from "@/lib/data";
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
const LABEL_WIDTH = 150;
const LANE_HEIGHT = 48;
const MARGIN = { top: 40, right: 100, bottom: 10, left: LABEL_WIDTH + 16 };
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

// Relationship line visual config (color + dash pattern — colorblind-safe)
const RELATIONSHIP_LINE_STYLE: Record<string, { color: string; dash: string; weight: number; hoverWeight: number }> = {
  supports:    { color: "#34D399", dash: "",          weight: 1.5, hoverWeight: 2.5 },
  extends:     { color: "#60A5FA", dash: "4,4",       weight: 1.5, hoverWeight: 2.5 },
  contradicts: { color: "#F87171", dash: "2,3",       weight: 1.5, hoverWeight: 2.5 },
  refines:     { color: "#60A5FA", dash: "",          weight: 1,   hoverWeight: 1.5 },
  "builds-on": { color: "#34D399", dash: "",          weight: 1,   hoverWeight: 1.5 },
};

interface TooltipData {
  item?: TimelineItem;
  connection?: WebConnection;
  x: number;
  y: number;
}

export function TopicTimeline({
  timelines,
  webConnections,
  showAllConnections,
  onDotClick,
}: {
  timelines: TopicTimeline[];
  webConnections?: WebConnection[];
  showAllConnections?: boolean;
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

    // Determine visible connections (progressive disclosure: max 8 by default)
    const MAX_DEFAULT_CONNECTIONS = 8;
    const visibleConnections = singleTopic && webConnections && webConnections.length > 0
      ? (showAllConnections ? webConnections : webConnections.slice(0, MAX_DEFAULT_CONNECTIONS))
      : [];

    if (mobile) {
      renderMobile(svg, timelines, allDates, width, singleTopic, prefersReducedMotion, onDotClick, setTooltip, visibleConnections);
    } else {
      renderDesktop(svg, timelines, allDates, width, singleTopic, prefersReducedMotion, onDotClick, setTooltip, visibleConnections);
    }
  }, [timelines, onDotClick, containerWidth, webConnections, showAllConnections]);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden">
      <svg ref={svgRef} className="w-full" style={{ overflow: "hidden" }} />

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
          {tooltip.item && <TooltipContent item={tooltip.item} />}
          {tooltip.connection && <ConnectionTooltipContent conn={tooltip.connection} />}
        </div>
      )}

      {/* Mobile bottom sheet */}
      {tooltip && isMobileRef.current && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 max-h-[40vh] overflow-y-auto rounded-t-xl border-t border-border bg-background p-4 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
          {tooltip.item && <TooltipContent item={tooltip.item} />}
          {tooltip.connection && <ConnectionTooltipContent conn={tooltip.connection} />}
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
            <p>{formatShortDate(item.date)} &middot; {item.connectionCount ?? 0} podcast {(item.connectionCount ?? 0) === 1 ? "connection" : "connections"}</p>
            {(item.connectionCount ?? 0) > 0 && (
              <p className="text-[10px] text-muted-foreground/60">Click to see which guests validated this</p>
            )}
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

function ConnectionTooltipContent({ conn }: { conn: WebConnection }) {
  const style = RELATIONSHIP_LINE_STYLE[conn.connection.relationship] || RELATIONSHIP_LINE_STYLE.supports;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-4 rounded-sm" style={{ backgroundColor: style.color }} />
        <span className="text-xs font-medium">{conn.connection.relationship}</span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {Math.round(conn.connection.confidence * 100)}% confidence
        </span>
      </div>
      <p className="text-sm leading-relaxed" style={{
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>
        &ldquo;{conn.source.label.slice(0, 80)}&rdquo;
      </p>
      <p className="text-center text-xs text-muted-foreground">&darr; {conn.connection.relationship} &darr;</p>
      <p className="text-sm leading-relaxed" style={{
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>
        &ldquo;{conn.target.label.slice(0, 80)}&rdquo;
      </p>
      <p className="font-[family-name:var(--font-geist-mono)] text-xs text-muted-foreground">
        {conn.source.type === "claim" ? "Claim" : "Moment"} ({formatShortDate(conn.source.date)}) &rarr; {conn.target.type === "claim" ? "Claim" : "Moment"} ({formatShortDate(conn.target.date)})
      </p>
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
  visibleConnections: WebConnection[],
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

    // Lane label with item count
    const labelGroup = g.append("g");
    labelGroup.append("text")
      .attr("x", LABEL_WIDTH + 8)
      .attr("y", y + laneHeight / 2 - 1)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("font-size", 13)
      .attr("font-weight", 600)
      .attr("fill", "#9B9587")
      .text(tl.topicName);
    labelGroup.append("text")
      .attr("x", LABEL_WIDTH + 8)
      .attr("y", y + laneHeight / 2 + 12)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("font-size", 10)
      .attr("font-family", "var(--font-geist-mono)")
      .attr("fill", "#6B6560")
      .text(`${tl.items.filter(it => it.type === "claim").length} claims · ${tl.items.filter(it => it.type === "moment").length} moments`);
  });

  // X-axis at top — adaptive tick interval based on date range
  const rangeYears = (denseMax - denseMin) / (365 * 24 * 60 * 60 * 1000);
  const tickInterval = rangeYears > 3 ? d3.timeMonth.every(6) : rangeYears > 1.5 ? d3.timeMonth.every(3) : d3.timeMonth.every(2);
  const xAxis = d3.axisTop(xScale)
    .ticks(tickInterval)
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

      // Position labels at the top-right of each lane to avoid dot overlap
      const labelY = laneY - laneHeight / 2 + 10;
      const firstR = first.type === "claim" ? Math.min(10, 6 + (first.connectionCount || 0) * 0.5) : 3;
      const lastR = last.type === "claim" ? Math.min(10, 6 + (last.connectionCount || 0) * 0.5) : 3;

      if (denseItems.length === 1) {
        g.append("text")
          .attr("x", firstX + firstR + 4).attr("y", labelY)
          .attr("text-anchor", "start")
          .attr("font-size", 10)
          .attr("font-family", "var(--font-geist-mono)")
          .attr("fill", "#6B6560")
          .text(formatShortDate(first.date));
      } else {
        g.append("text")
          .attr("x", Math.max(MARGIN.left, firstX + firstR + 4)).attr("y", labelY)
          .attr("text-anchor", "start")
          .attr("font-size", 10)
          .attr("font-family", "var(--font-geist-mono)")
          .attr("fill", "#6B6560")
          .text(formatShortDate(first.date));

        // Only show latest date if far enough from first AND meaningfully different from axis max
        const lastDateMs = new Date(last.date).getTime();
        const oneMonth = 30 * 24 * 60 * 60 * 1000;
        const nearAxisMax = lastDateMs > (denseMax - oneMonth);
        if (lastX - firstX > 100 && !nearAxisMax) {
          g.append("text")
            .attr("x", Math.min(width - 8, lastX + lastR + 4)).attr("y", labelY)
            .attr("text-anchor", "start")
            .attr("font-size", 10)
            .attr("font-family", "var(--font-geist-mono)")
            .attr("fill", "#6B6560")
            .text(formatShortDate(last.date));
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

  // Render connecting lines (single-topic view only)
  if (singleTopic && visibleConnections.length > 0 && timelines.length === 1) {
    const tl = timelines[0];
    const laneY = MARGIN.top + laneHeight / 2;
    const itemPositions = new Map<string, { cx: number; cy: number }>();

    // Build position map from dense items
    const denseItems = tl.items.filter((item) => !outlierSet.has(new Date(item.date).getTime()));
    for (const item of denseItems) {
      const cx = xScale(new Date(item.date));
      const cy = laneY + jitter(item.id, Math.floor(laneHeight * 0.3));
      itemPositions.set(item.id, { cx, cy });
    }

    const lineGroup = g.append("g").attr("class", "connection-lines");

    visibleConnections.forEach((wc, i) => {
      const srcPos = itemPositions.get(wc.source.id);
      const tgtPos = itemPositions.get(wc.target.id);
      if (!srcPos || !tgtPos) return;

      const style = RELATIONSHIP_LINE_STYLE[wc.connection.relationship] || RELATIONSHIP_LINE_STYLE.supports;
      const dx = tgtPos.cx - srcPos.cx;
      const arcSign = i % 2 === 0 ? -1 : 1; // Alternate above/below
      const controlOffset = arcSign * (20 + Math.abs(dx) * 0.15);
      const midX = (srcPos.cx + tgtPos.cx) / 2;
      const midY = (srcPos.cy + tgtPos.cy) / 2 + controlOffset;

      const pathD = `M${srcPos.cx},${srcPos.cy} Q${midX},${midY} ${tgtPos.cx},${tgtPos.cy}`;
      const totalLength = Math.sqrt(dx * dx + controlOffset * controlOffset) * 1.2; // approximate

      const line = lineGroup.append("path")
        .attr("d", pathD)
        .attr("fill", "none")
        .attr("stroke", style.color)
        .attr("stroke-width", style.weight)
        .attr("stroke-opacity", 0.5)
        .attr("stroke-dasharray", style.dash || "none")
        .attr("role", "img")
        .attr("aria-label", `${wc.connection.relationship}: ${wc.source.label.slice(0, 40)} → ${wc.target.label.slice(0, 40)}`);

      // Invisible wider hit target for hover
      lineGroup.append("path")
        .attr("d", pathD)
        .attr("fill", "none")
        .attr("stroke", "transparent")
        .attr("stroke-width", 12)
        .attr("cursor", "pointer")
        .on("mouseover", function () {
          line.attr("stroke-opacity", 1).attr("stroke-width", style.hoverWeight);
          setTooltip({ connection: wc, x: midX, y: midY - 20 });
        })
        .on("mouseout", function () {
          line.attr("stroke-opacity", 0.5).attr("stroke-width", style.weight);
          setTooltip(null);
        });

      // Small anchor circles at endpoints
      for (const pos of [srcPos, tgtPos]) {
        lineGroup.append("circle")
          .attr("cx", pos.cx).attr("cy", pos.cy).attr("r", 3)
          .attr("fill", style.color).attr("fill-opacity", 0.4);
      }

      // Draw animation
      if (!prefersReducedMotion) {
        line
          .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
          .attr("stroke-dashoffset", totalLength)
          .transition()
          .delay(300 + i * 50)
          .duration(300)
          .ease(d3.easeCubicOut)
          .attr("stroke-dashoffset", 0)
          .on("end", function () {
            // Restore the actual dash pattern after animation
            d3.select(this).attr("stroke-dasharray", style.dash || "none");
          });
      }
    });
  }
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
  visibleConnections: WebConnection[],
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

  // Mobile connecting lines (straight vertical lines, single-topic only)
  if (singleTopic && visibleConnections.length > 0 && timelines.length === 1) {
    const tl = timelines[0];
    const baseCx = MOBILE_MARGIN.left + colWidth / 2;
    const itemPositions = new Map<string, { cx: number; cy: number }>();

    for (const item of tl.items) {
      const cy = yScale(new Date(item.date));
      const xJit = jitter(item.id, Math.floor(colWidth * 0.2));
      itemPositions.set(item.id, { cx: baseCx + xJit, cy });
    }

    const lineGroup = g.append("g").attr("class", "connection-lines");

    visibleConnections.forEach((wc) => {
      const srcPos = itemPositions.get(wc.source.id);
      const tgtPos = itemPositions.get(wc.target.id);
      if (!srcPos || !tgtPos) return;

      const style = RELATIONSHIP_LINE_STYLE[wc.connection.relationship] || RELATIONSHIP_LINE_STYLE.supports;

      lineGroup.append("line")
        .attr("x1", srcPos.cx).attr("y1", srcPos.cy)
        .attr("x2", tgtPos.cx).attr("y2", tgtPos.cy)
        .attr("stroke", style.color)
        .attr("stroke-width", style.weight)
        .attr("stroke-opacity", 0.4)
        .attr("stroke-dasharray", style.dash || "none");
    });
  }
}
