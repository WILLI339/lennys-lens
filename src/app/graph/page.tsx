"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { getGraph } from "@/lib/data";
import type { Graph, ClaimWithSynthesis, PodcastMoment, Connection, Relationship, SynthesisLabel } from "@/lib/types";

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: "claim" | "moment";
  label: string;
  detail: string;
  topics: string[];
  // claim-specific
  synthesisLabel?: SynthesisLabel;
  newsletterTitle?: string;
  claimType?: string;
  connectionCount?: number;
  // moment-specific
  guest?: string;
  podcastTitle?: string;
  timestamp?: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  id: string;
  relationship: Relationship;
  confidence: number;
  explanation: string;
}

const SYNTHESIS_COLORS: Record<SynthesisLabel, string> = {
  consensus: "#059669",
  synthesis: "#2563eb",
  curation: "#d97706",
  original: "#7c3aed",
};

const RELATIONSHIP_COLORS: Record<Relationship, string> = {
  supports: "#059669",
  extends: "#2563eb",
  contradicts: "#dc2626",
};

function buildGraphData(graph: Graph) {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Add claim nodes
  for (const nl of graph.newsletters) {
    for (const claim of nl.claims) {
      nodes.push({
        id: claim.id,
        type: "claim",
        label: claim.text.slice(0, 80) + (claim.text.length > 80 ? "..." : ""),
        detail: claim.text,
        topics: claim.topics,
        synthesisLabel: claim.synthesisLabel,
        newsletterTitle: nl.title,
        claimType: claim.type,
        connectionCount: claim.connectionCount,
      });
    }
  }

  // Add moment nodes (only connected ones to keep graph readable)
  const connectedMomentIds = new Set(graph.connections.map((c) => c.momentId));
  for (const pod of graph.podcasts) {
    for (const moment of pod.moments) {
      if (!connectedMomentIds.has(moment.id)) continue;
      nodes.push({
        id: moment.id,
        type: "moment",
        label: moment.summary.slice(0, 60) + (moment.summary.length > 60 ? "..." : ""),
        detail: moment.text,
        topics: moment.topics,
        guest: moment.guest,
        podcastTitle: pod.title,
        timestamp: moment.timestamp,
      });
    }
  }

  const nodeIds = new Set(nodes.map((n) => n.id));

  // Add links
  for (const conn of graph.connections) {
    if (nodeIds.has(conn.claimId) && nodeIds.has(conn.momentId)) {
      links.push({
        id: conn.id,
        source: conn.claimId,
        target: conn.momentId,
        relationship: conn.relationship,
        confidence: conn.confidence,
        explanation: conn.explanation,
      });
    }
  }

  return { nodes, links };
}

export default function GraphPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [graph] = useState(() => getGraph());
  const [topics] = useState(() => {
    const t = new Set<string>();
    graph.newsletters.forEach((n) => n.claims.forEach((c) => c.topics.forEach((tp) => t.add(tp))));
    graph.podcasts.forEach((p) => p.moments.forEach((m) => m.topics.forEach((tp) => t.add(tp))));
    return Array.from(t).sort();
  });

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svgRef.current.parentElement!;
    const width = container.clientWidth;
    const height = container.clientHeight;

    svg.attr("width", width).attr("height", height);

    const { nodes, links } = buildGraphData(graph);

    // Filter by topic
    let filteredNodes = nodes;
    let filteredLinks = links;
    if (selectedTopic) {
      filteredNodes = nodes.filter((n) => n.topics.includes(selectedTopic));
      const filteredIds = new Set(filteredNodes.map((n) => n.id));
      filteredLinks = links.filter(
        (l) =>
          filteredIds.has(typeof l.source === "string" ? l.source : (l.source as GraphNode).id) &&
          filteredIds.has(typeof l.target === "string" ? l.target : (l.target as GraphNode).id)
      );
    }

    const g = svg.append("g");

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    // Simulation
    const simulation = d3
      .forceSimulation<GraphNode>(filteredNodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(filteredLinks).id((d) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d: any) => d.type === "claim" ? 20 : 10));

    // Links
    const link = g
      .append("g")
      .selectAll("line")
      .data(filteredLinks)
      .join("line")
      .attr("stroke", (d) => RELATIONSHIP_COLORS[d.relationship])
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", (d) => d.confidence * 2);

    // Nodes
    const node = g
      .append("g")
      .selectAll<SVGCircleElement, GraphNode>("circle")
      .data(filteredNodes)
      .join("circle")
      .attr("r", (d) => (d.type === "claim" ? 12 + (d.connectionCount || 0) * 0.8 : 6))
      .attr("fill", (d) =>
        d.type === "claim"
          ? SYNTHESIS_COLORS[d.synthesisLabel!]
          : "#94a3b8"
      )
      .attr("stroke", "#fff")
      .attr("stroke-width", (d) => (d.type === "claim" ? 2 : 1))
      .attr("cursor", "pointer")
      .on("click", (_, d) => {
        setSelectedNode(d);
      })
      .on("mouseover", function (_, d) {
        // Highlight connected
        const connectedIds = new Set<string>();
        connectedIds.add(d.id);
        filteredLinks.forEach((l) => {
          const sid = typeof l.source === "string" ? l.source : (l.source as GraphNode).id;
          const tid = typeof l.target === "string" ? l.target : (l.target as GraphNode).id;
          if (sid === d.id) connectedIds.add(tid);
          if (tid === d.id) connectedIds.add(sid);
        });

        node.attr("opacity", (n) => (connectedIds.has(n.id) ? 1 : 0.15));
        link.attr("stroke-opacity", (l) => {
          const sid = typeof l.source === "string" ? l.source : (l.source as GraphNode).id;
          const tid = typeof l.target === "string" ? l.target : (l.target as GraphNode).id;
          return sid === d.id || tid === d.id ? 0.8 : 0.05;
        });
        labels.attr("opacity", (n) => (connectedIds.has(n.id) ? 1 : 0.1));
      })
      .on("mouseout", () => {
        node.attr("opacity", 1);
        link.attr("stroke-opacity", 0.4);
        labels.attr("opacity", (d) => (d.type === "claim" ? 0.9 : 0));
      });

    // Drag
    node.call(
      d3.drag<SVGCircleElement, GraphNode>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );

    // Labels (only for claims by default)
    const labels = g
      .append("g")
      .selectAll<SVGTextElement, GraphNode>("text")
      .data(filteredNodes)
      .join("text")
      .text((d) =>
        d.type === "claim"
          ? d.label.slice(0, 40) + (d.label.length > 40 ? "..." : "")
          : ""
      )
      .attr("font-size", 9)
      .attr("fill", "#374151")
      .attr("opacity", (d) => (d.type === "claim" ? 0.9 : 0))
      .attr("pointer-events", "none")
      .attr("dx", 16)
      .attr("dy", 4);

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as GraphNode).x!)
        .attr("y1", (d) => (d.source as GraphNode).y!)
        .attr("x2", (d) => (d.target as GraphNode).x!)
        .attr("y2", (d) => (d.target as GraphNode).y!);
      node.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
      labels.attr("x", (d) => d.x!).attr("y", (d) => d.y!);
    });

    // Initial zoom to fit
    setTimeout(() => {
      svg.call(zoom.transform, d3.zoomIdentity.translate(width * 0.1, height * 0.1).scale(0.8));
    }, 1000);

    return () => {
      simulation.stop();
    };
  }, [graph, selectedTopic]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Controls */}
      <div className="flex items-center gap-2 overflow-x-auto border-b px-4 py-2">
        <span className="shrink-0 text-sm font-medium text-muted-foreground">Filter:</span>
        <button
          onClick={() => setSelectedTopic(null)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            selectedTopic === null
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          All
        </button>
        {topics.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTopic(t === selectedTopic ? null : t)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedTopic === t
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {t.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 border-b px-4 py-1.5 text-xs">
        <span className="font-medium text-muted-foreground">Nodes:</span>
        {(Object.entries(SYNTHESIS_COLORS) as [SynthesisLabel, string][]).map(([label, color]) => (
          <span key={label} className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            {label.charAt(0).toUpperCase() + label.slice(1)}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
          Moment
        </span>
        <span className="mx-2 text-muted-foreground">|</span>
        <span className="font-medium text-muted-foreground">Edges:</span>
        {(Object.entries(RELATIONSHIP_COLORS) as [Relationship, string][]).map(([rel, color]) => (
          <span key={rel} className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-4" style={{ backgroundColor: color }} />
            {rel.charAt(0).toUpperCase() + rel.slice(1)}
          </span>
        ))}
      </div>

      <div className="relative" style={{ height: "calc(100vh - 10rem)" }}>
        {/* Graph */}
        <svg ref={svgRef} className="h-full w-full" />

        {/* Detail panel */}
        {selectedNode && (
          <div
            style={{ position: "fixed", top: "5rem", right: "1rem", zIndex: 50, maxHeight: "60vh" }}
            className="w-80 overflow-y-auto rounded-lg border bg-background p-4 shadow-lg"
          >
            <div className="mb-2 flex items-start justify-between">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  selectedNode.type === "claim" ? "bg-foreground text-background" : "bg-muted"
                }`}
              >
                {selectedNode.type === "claim" ? "Claim" : "Moment"}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mb-2 text-sm font-medium leading-relaxed">{selectedNode.detail}</p>
            {selectedNode.type === "claim" && (
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  <span className="font-medium">From:</span> {selectedNode.newsletterTitle}
                </p>
                <p>
                  <span className="font-medium">Type:</span> {selectedNode.claimType}
                </p>
                <p>
                  <span className="font-medium">Synthesis:</span>{" "}
                  <span style={{ color: SYNTHESIS_COLORS[selectedNode.synthesisLabel!] }}>
                    {selectedNode.synthesisLabel}
                  </span>
                </p>
                <p>
                  <span className="font-medium">Connections:</span> {selectedNode.connectionCount}
                </p>
              </div>
            )}
            {selectedNode.type === "moment" && (
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  <span className="font-medium">Guest:</span> {selectedNode.guest}
                </p>
                <p>
                  <span className="font-medium">Podcast:</span> {selectedNode.podcastTitle}
                </p>
                <p>
                  <span className="font-medium">Timestamp:</span> {selectedNode.timestamp}
                </p>
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedNode.topics.map((t) => (
                <span
                  key={t}
                  className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
