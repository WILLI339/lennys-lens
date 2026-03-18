"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SynthesisBadge } from "./synthesis-badge";
import { ConnectionCard } from "./connection-card";
import type { ClaimWithSynthesis, Connection, PodcastMoment, Podcast } from "@/lib/types";
import { getConnectionsForClaim } from "@/lib/data";

export function ClaimCard({ claim }: { claim: ClaimWithSynthesis }) {
  const [expanded, setExpanded] = useState(false);
  const connections = getConnectionsForClaim(claim.id);

  const supports = connections.filter((c) => c.relationship === "supports");
  const extends_ = connections.filter((c) => c.relationship === "extends");
  const contradicts = connections.filter((c) => c.relationship === "contradicts");

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader
        className="cursor-pointer space-y-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium leading-relaxed">{claim.text}</p>
          <button className="mt-0.5 shrink-0 text-muted-foreground transition-transform hover:text-foreground">
            <svg
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SynthesisBadge label={claim.synthesisLabel} />
          <Badge variant="outline" className="text-xs capitalize">
            {claim.type}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {claim.connectionCount} connection{claim.connectionCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground">
          {supports.length > 0 && (
            <span className="text-emerald-600">
              {supports.length} support{supports.length !== 1 ? "s" : ""}
            </span>
          )}
          {extends_.length > 0 && (
            <span className="text-blue-600">
              {extends_.length} extend{extends_.length !== 1 ? "s" : ""}
            </span>
          )}
          {contradicts.length > 0 && (
            <span className="text-red-600">
              {contradicts.length} contradict{contradicts.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 border-t pt-4">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Evidence
            </p>
            <p className="text-sm text-foreground/80">{claim.evidence}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Synthesis
            </p>
            <p className="text-sm text-foreground/80">{claim.synthesisExplanation}</p>
          </div>
          {connections.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Podcast Connections
              </p>
              <div className="space-y-3">
                {connections.map((conn) => (
                  <ConnectionCard
                    key={conn.id}
                    connection={conn}
                    moment={conn.moment}
                    podcast={conn.podcast}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {claim.topics.map((topic) => (
              <Badge key={topic} variant="secondary" className="text-xs">
                {topic}
              </Badge>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
