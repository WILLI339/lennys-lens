import { describe, it, expect } from "vitest";
import {
  getGraph,
  getNewsletters,
  getNewsletter,
  getPodcasts,
  getTopics,
  getTopic,
  getConnectionsForClaim,
  getClaimsForTopic,
  getMomentsForTopic,
  getCuttingRoomFloor,
  getStats,
  searchAll,
} from "@/lib/data";

describe("data layer", () => {
  it("loads the graph with all expected collections", () => {
    const graph = getGraph();
    expect(graph.newsletters.length).toBeGreaterThan(0);
    expect(graph.podcasts.length).toBeGreaterThan(0);
    expect(graph.connections.length).toBeGreaterThan(0);
    expect(graph.topics.length).toBeGreaterThan(0);
  });

  it("returns newsletters with claims that have synthesis labels", () => {
    const newsletters = getNewsletters();
    expect(newsletters.length).toBe(10);
    for (const nl of newsletters) {
      expect(nl.slug).toBeTruthy();
      expect(nl.claims.length).toBeGreaterThan(0);
      for (const claim of nl.claims) {
        expect(["consensus", "synthesis", "curation", "original"]).toContain(claim.synthesisLabel);
        expect(claim.connectionCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("finds a newsletter by slug", () => {
    const nl = getNewsletter("how-duolingo-reignited-user-growth");
    expect(nl).toBeDefined();
    expect(nl!.title).toContain("Duolingo");
  });

  it("returns undefined for unknown newsletter slug", () => {
    expect(getNewsletter("nonexistent-slug")).toBeUndefined();
  });

  it("returns 50 podcasts with moments", () => {
    const podcasts = getPodcasts();
    expect(podcasts.length).toBe(50);
    const withMoments = podcasts.filter((p) => p.moments.length > 0);
    expect(withMoments.length).toBeGreaterThan(40);
  });

  it("returns connections for a claim with moment and podcast data", () => {
    const newsletters = getNewsletters();
    const claimWithConnections = newsletters
      .flatMap((n) => n.claims)
      .find((c) => c.connectionCount > 0);
    expect(claimWithConnections).toBeDefined();

    const connections = getConnectionsForClaim(claimWithConnections!.id);
    expect(connections.length).toBeGreaterThan(0);
    for (const conn of connections) {
      expect(conn.moment).toBeDefined();
      expect(conn.podcast).toBeDefined();
      expect(["supports", "extends", "contradicts"]).toContain(conn.relationship);
      expect(conn.confidence).toBeGreaterThanOrEqual(0.6);
    }
  });

  it("returns claims and moments for a topic", () => {
    const topics = getTopics();
    const topicWithClaims = topics.find((t) => t.claimCount > 0);
    expect(topicWithClaims).toBeDefined();

    const claims = getClaimsForTopic(topicWithClaims!.slug);
    expect(claims.length).toBe(topicWithClaims!.claimCount);

    const moments = getMomentsForTopic(topicWithClaims!.slug);
    expect(moments.length).toBeGreaterThan(0);
    expect(moments[0].podcastTitle).toBeTruthy();
  });

  it("computes cutting room floor as moments without connections", () => {
    const topics = getTopics();
    const topicWithFloor = topics.find((t) => t.cuttingRoomFloorCount > 0);
    expect(topicWithFloor).toBeDefined();

    const floor = getCuttingRoomFloor(topicWithFloor!.slug);
    expect(floor.length).toBe(topicWithFloor!.cuttingRoomFloorCount);
  });

  it("computes accurate stats", () => {
    const stats = getStats();
    expect(stats.newsletters).toBe(10);
    expect(stats.podcasts).toBe(50);
    expect(stats.claims).toBeGreaterThan(0);
    expect(stats.moments).toBeGreaterThan(0);
    expect(stats.connections).toBeGreaterThan(0);
    expect(stats.topics).toBeGreaterThan(0);
  });

  it("searches across claims and moments", () => {
    const results = searchAll("vibe coding");
    expect(results.claims.length + results.moments.length).toBeGreaterThan(0);
  });

  it("returns results for single-character queries (filtering is in the API route)", () => {
    const results = searchAll("a");
    expect(results.claims.length + results.moments.length).toBeGreaterThan(0);
  });
});
