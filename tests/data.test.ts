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
  getTopicTimelineData,
  getTimelineDateBounds,
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
    expect(newsletters.length).toBeGreaterThanOrEqual(10);
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
    expect(podcasts.length).toBeGreaterThanOrEqual(50);
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
    expect(stats.newsletters).toBeGreaterThanOrEqual(10);
    expect(stats.podcasts).toBeGreaterThanOrEqual(50);
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

describe("timeline data", () => {
  it("returns timeline items grouped by topic with dates", () => {
    const timelines = getTopicTimelineData();
    expect(timelines.length).toBeGreaterThan(0);
    for (const tl of timelines) {
      expect(tl.topicSlug).toBeTruthy();
      expect(tl.topicName).toBeTruthy();
      expect(tl.items.length).toBeGreaterThan(0);
    }
  });

  it("every item has id, type, date, topics, and label", () => {
    const timelines = getTopicTimelineData();
    for (const tl of timelines) {
      for (const item of tl.items) {
        expect(item.id).toBeTruthy();
        expect(["claim", "moment"]).toContain(item.type);
        expect(item.date).toBeTruthy();
        expect(new Date(item.date).getTime()).not.toBeNaN();
        expect(item.topics.length).toBeGreaterThan(0);
        expect(item.label).toBeTruthy();
      }
    }
  });

  it("claims have synthesisLabel and connectionCount", () => {
    const timelines = getTopicTimelineData();
    const claims = timelines.flatMap((tl) => tl.items.filter((i) => i.type === "claim"));
    expect(claims.length).toBeGreaterThan(0);
    for (const claim of claims) {
      expect(["consensus", "synthesis", "curation", "original"]).toContain(claim.synthesisLabel);
      expect(claim.connectionCount).toBeGreaterThanOrEqual(0);
      expect(claim.newsletterSlug).toBeTruthy();
      expect(claim.newsletterTitle).toBeTruthy();
    }
  });

  it("moments have guest and podcastTitle", () => {
    const timelines = getTopicTimelineData();
    const moments = timelines.flatMap((tl) => tl.items.filter((i) => i.type === "moment"));
    expect(moments.length).toBeGreaterThan(0);
    for (const moment of moments) {
      expect(moment.guest).toBeTruthy();
      expect(moment.podcastTitle).toBeTruthy();
    }
  });

  it("filters by topic slug", () => {
    const topics = getTopics();
    const topicWithClaims = topics.find((t) => t.claimCount > 0);
    expect(topicWithClaims).toBeDefined();

    const timelines = getTopicTimelineData(topicWithClaims!.slug);
    expect(timelines.length).toBe(1);
    expect(timelines[0].topicSlug).toBe(topicWithClaims!.slug);
    for (const item of timelines[0].items) {
      expect(item.topics).toContain(topicWithClaims!.slug);
    }
  });

  it("returns empty array for unknown topic slug", () => {
    const timelines = getTopicTimelineData("nonexistent-topic-slug");
    expect(timelines.length).toBe(0);
  });

  it("items within each topic are sorted by date", () => {
    const timelines = getTopicTimelineData();
    for (const tl of timelines) {
      for (let i = 1; i < tl.items.length; i++) {
        const prev = new Date(tl.items[i - 1].date).getTime();
        const curr = new Date(tl.items[i].date).getTime();
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    }
  });

  it("topics are sorted by item count descending", () => {
    const timelines = getTopicTimelineData();
    for (let i = 1; i < timelines.length; i++) {
      expect(timelines[i - 1].items.length).toBeGreaterThanOrEqual(timelines[i].items.length);
    }
  });

  it("getTimelineDateBounds returns min and max dates", () => {
    const bounds = getTimelineDateBounds();
    expect(bounds).not.toBeNull();
    const min = new Date(bounds!.min).getTime();
    const max = new Date(bounds!.max).getTime();
    expect(min).not.toBeNaN();
    expect(max).not.toBeNaN();
    expect(max).toBeGreaterThanOrEqual(min);
  });
});
