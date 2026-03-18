"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { Graph, Relationship, SynthesisLabel } from "@/lib/types";

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: "claim" | "moment";
  label: string;
  topics: string[];
  synthesisLabel?: SynthesisLabel;
  connectionCount?: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  relationship: Relationship;
  confidence: number;
}

const SYNTHESIS_COLORS: Record<SynthesisLabel, string> = {
  consensus: "#34D399",
  synthesis: "#60A5FA",
  curation: "#FBBF24",
  original: "#A78BFA",
};

const RELATIONSHIP_COLORS: Record<Relationship, string> = {
  supports: "#34D399",
  extends: "#60A5FA",
  contradicts: "#F87171",
};

function buildGraphData(graph: Graph) {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  for (const nl of graph.newsletters) {
    for (const claim of nl.claims) {
      nodes.push({
        id: claim.id,
        type: "claim",
        label: claim.text.slice(0, 40),
        topics: claim.topics,
        synthesisLabel: claim.synthesisLabel,
        connectionCount: claim.connectionCount,
      });
    }
  }

  const connectedMomentIds = new Set(graph.connections.map((c) => c.momentId));
  for (const pod of graph.podcasts) {
    for (const moment of pod.moments) {
      if (!connectedMomentIds.has(moment.id)) continue;
      nodes.push({
        id: moment.id,
        type: "moment",
        label: "",
        topics: moment.topics,
      });
    }
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const conn of graph.connections) {
    if (nodeIds.has(conn.claimId) && nodeIds.has(conn.momentId)) {
      links.push({
        source: conn.claimId,
        target: conn.momentId,
        relationship: conn.relationship,
        confidence: conn.confidence,
      });
    }
  }

  return { nodes, links };
}

export function NetworkGraph({
  graph,
  height = 500,
  showLabels = false,
  interactive = true,
}: {
  graph: Graph;
  height?: number;
  showLabels?: boolean;
  interactive?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svgRef.current.parentElement!;
    const width = container.clientWidth;

    svg.attr("width", width).attr("height", height);

    const { nodes, links } = buildGraphData(graph);
    const g = svg.append("g");

    if (interactive) {
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on("zoom", (event) => g.attr("transform", event.transform));
      svg.call(zoom);
    }

    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links).id((d) => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d: any) => d.type === "claim" ? 16 : 6));

    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => RELATIONSHIP_COLORS[d.relationship])
      .attr("stroke-opacity", 0.3)
      .attr("stroke-width", (d) => d.confidence * 1.5);

    const node = g.append("g")
      .selectAll<SVGCircleElement, GraphNode>("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => (d.type === "claim" ? 8 + (d.connectionCount || 0) * 0.6 : 3))
      .attr("fill", (d) => d.type === "claim" ? SYNTHESIS_COLORS[d.synthesisLabel!] : "#4B5563")
      .attr("stroke", "rgba(255,255,255,0.15)")
      .attr("stroke-width", (d) => (d.type === "claim" ? 1.5 : 0));

    node.attr("opacity", 0)
      .transition()
      .delay((d, i) => (d.type === "claim" ? i * 80 : 300 + i * 20))
      .duration(400)
      .attr("opacity", 1);

    link.attr("opacity", 0)
      .transition()
      .delay((_, i) => 500 + i * 15)
      .duration(300)
      .attr("opacity", 1);

    if (interactive) {
      node.on("mouseover", function (_, d) {
        const connectedIds = new Set<string>([d.id]);
        links.forEach((l) => {
          const sid = typeof l.source === "string" ? l.source : (l.source as GraphNode).id;
          const tid = typeof l.target === "string" ? l.target : (l.target as GraphNode).id;
          if (sid === d.id) connectedIds.add(tid);
          if (tid === d.id) connectedIds.add(sid);
        });
        node.attr("opacity", (n) => connectedIds.has(n.id) ? 1 : 0.1);
        link.attr("stroke-opacity", (l) => {
          const sid = typeof l.source === "string" ? l.source : (l.source as GraphNode).id;
          const tid = typeof l.target === "string" ? l.target : (l.target as GraphNode).id;
          return sid === d.id || tid === d.id ? 0.8 : 0.03;
        });
      }).on("mouseout", () => {
        node.attr("opacity", 1);
        link.attr("stroke-opacity", 0.3);
      });

      node.call(
        d3.drag<SVGCircleElement, GraphNode>()
          .on("start", (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on("end", (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      );
    }

    if (showLabels) {
      const labels = g.append("g")
        .selectAll<SVGTextElement, GraphNode>("text")
        .data(nodes.filter((n) => n.type === "claim"))
        .join("text")
        .text((d) => d.label + "...")
        .attr("font-size", 8)
        .attr("fill", "#9B9587")
        .attr("opacity", 0.7)
        .attr("pointer-events", "none")
        .attr("dx", 12)
        .attr("dy", 3);

      simulation.on("tick", () => {
        link.attr("x1", (d) => (d.source as GraphNode).x!).attr("y1", (d) => (d.source as GraphNode).y!)
          .attr("x2", (d) => (d.target as GraphNode).x!).attr("y2", (d) => (d.target as GraphNode).y!);
        node.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
        labels.attr("x", (d) => d.x!).attr("y", (d) => d.y!);
      });
    } else {
      simulation.on("tick", () => {
        link.attr("x1", (d) => (d.source as GraphNode).x!).attr("y1", (d) => (d.source as GraphNode).y!)
          .attr("x2", (d) => (d.target as GraphNode).x!).attr("y2", (d) => (d.target as GraphNode).y!);
        node.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
      });
    }

    return () => { simulation.stop(); };
  }, [graph, height, showLabels, interactive]);

  return <svg ref={svgRef} className="h-full w-full" />;
}

export { SYNTHESIS_COLORS, RELATIONSHIP_COLORS };
export type { GraphNode, GraphLink };
