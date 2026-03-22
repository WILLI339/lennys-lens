import type { Graph, Newsletter, Podcast, Connection, Topic, ClaimWithSynthesis, PodcastMoment, TimelineItem, TopicTimeline } from "./types";
import graphData from "../../public/data/graph.json";

/*
  Data flow (after idea-web migration):
  ┌─────────────────────────────────────────────────────────────────┐
  │ graph.json                                                       │
  │   Connection { sourceId, targetId, sourceType, targetType, ... } │
  ├─────────────────────────────────────────────────────────────────┤
  │ Lookup maps (built once at module init):                         │
  │   claimById:  Map<id, ClaimWithSynthesis & {date, nlSlug, nlTitle}>│
  │   momentById: Map<id, PodcastMoment & {date, podTitle, podGuest}> │
  ├─────────────────────────────────────────────────────────────────┤
  │ Query functions:                                                 │
  │   getConnectionsForClaim(id) → moment-type connections for claim │
  │   getWebConnectionsForTopic(slug) → all connections in topic     │
  │   getGuestInfluence() → guest stats from moment→claim conns      │
  └─────────────────────────────────────────────────────────────────┘
*/

const graph = graphData as unknown as Graph;

// Lookup maps — built once, O(1) access for all queries
const claimById = new Map<string, ClaimWithSynthesis & { date: string; newsletterSlug: string; newsletterTitle: string }>();
const momentById = new Map<string, PodcastMoment & { date: string; podcastTitle: string; podcastGuest: string }>();

for (const nl of graph.newsletters) {
  for (const claim of nl.claims) {
    claimById.set(claim.id, { ...claim, date: nl.date, newsletterSlug: nl.slug, newsletterTitle: nl.title });
  }
}
for (const pod of graph.podcasts) {
  for (const moment of pod.moments) {
    momentById.set(moment.id, { ...moment, date: pod.date, podcastTitle: pod.title, podcastGuest: pod.guest });
  }
}

export function getGraph(): Graph {
  return graph;
}

export function getNewsletters(): Newsletter[] {
  return graph.newsletters;
}

export function getNewsletter(slug: string): Newsletter | undefined {
  return graph.newsletters.find((n) => n.slug === slug);
}

export function getPodcasts(): Podcast[] {
  return graph.podcasts;
}

export function getPodcast(slug: string): Podcast | undefined {
  return graph.podcasts.find((p) => p.slug === slug);
}

export function getTopics(): Topic[] {
  return graph.topics;
}

export function getTopic(slug: string): Topic | undefined {
  return graph.topics.find((t) => t.slug === slug);
}

export function getConnectionsForClaim(claimId: string): (Connection & { moment: PodcastMoment; podcast: Podcast })[] {
  return graph.connections
    .filter((c) =>
      // Claim is the target (moment→claim) or the source (claim→moment)
      (c.targetId === claimId && c.sourceType === "moment") ||
      (c.sourceId === claimId && c.targetType === "moment")
    )
    .map((conn) => {
      const momentId = conn.sourceType === "moment" ? conn.sourceId : conn.targetId;
      const podcast = graph.podcasts.find((p) =>
        p.moments.some((m) => m.id === momentId)
      )!;
      const moment = podcast?.moments.find((m) => m.id === momentId)!;
      return { ...conn, moment, podcast };
    })
    .filter((c) => c.moment && c.podcast)
    .sort((a, b) => b.confidence - a.confidence);
}

export function getClaimsForTopic(topicSlug: string): ClaimWithSynthesis[] {
  return graph.newsletters.flatMap((n) =>
    n.claims.filter((c) => c.topics.includes(topicSlug))
  );
}

export function getMomentsForTopic(topicSlug: string): (PodcastMoment & { podcastTitle: string; podcastGuest: string })[] {
  return graph.podcasts.flatMap((p) =>
    p.moments
      .filter((m) => m.topics.includes(topicSlug))
      .map((m) => ({ ...m, podcastTitle: p.title, podcastGuest: p.guest }))
  );
}

export function getCuttingRoomFloor(topicSlug: string): (PodcastMoment & { podcastTitle: string; podcastGuest: string })[] {
  // A moment is "on the cutting room floor" if it's not connected to any claim
  const connectedMomentIds = new Set(
    graph.connections.flatMap((c) => {
      const ids: string[] = [];
      if (c.sourceType === "moment") ids.push(c.sourceId);
      if (c.targetType === "moment") ids.push(c.targetId);
      return ids;
    })
  );
  return getMomentsForTopic(topicSlug).filter((m) => !connectedMomentIds.has(m.id));
}

export function getStats() {
  const totalClaims = graph.newsletters.reduce((sum, n) => sum + n.claims.length, 0);
  const totalMoments = graph.podcasts.reduce((sum, p) => sum + p.moments.length, 0);
  const totalConnections = graph.connections.length;
  const connectedMomentIds = new Set(
    graph.connections.flatMap((c) => {
      const ids: string[] = [];
      if (c.sourceType === "moment") ids.push(c.sourceId);
      if (c.targetType === "moment") ids.push(c.targetId);
      return ids;
    })
  );
  const allMomentIds = new Set(graph.podcasts.flatMap((p) => p.moments.map((m) => m.id)));
  const cuttingRoomFloor = [...allMomentIds].filter((id) => !connectedMomentIds.has(id)).length;

  return {
    newsletters: graph.newsletters.length,
    podcasts: graph.podcasts.length,
    claims: totalClaims,
    moments: totalMoments,
    connections: totalConnections,
    cuttingRoomFloor,
    topics: graph.topics.length,
  };
}

export function getMostValidatedClaims() {
  return graph.newsletters
    .flatMap((n) =>
      n.claims.map((c) => ({
        ...c,
        newsletterTitle: n.title,
        newsletterSlug: n.slug,
        uniqueGuests: new Set(
          graph.connections
            .filter((conn) => conn.targetId === c.id || conn.sourceId === c.id)
            .map((conn) => {
              const momentId = conn.sourceType === "moment" ? conn.sourceId : conn.targetId;
              const m = momentById.get(momentId);
              return m?.podcastGuest;
            })
            .filter(Boolean)
        ).size,
      }))
    )
    .sort((a, b) => b.connectionCount - a.connectionCount);
}

export function getGuestInfluence() {
  const guestMap = new Map<string, { guest: string; podcastSlug: string; supports: number; extends: number; contradicts: number; totalConnections: number; highConfConnections: number; claimIds: Set<string>; confidences: number[] }>();

  for (const conn of graph.connections) {
    // For guest influence, we only care about moment→claim connections
    if (!(conn.sourceType === "moment" && conn.targetType === "claim")) continue;

    const m = momentById.get(conn.sourceId);
    if (!m) continue;
    const guest = m.podcastGuest;
    const podSlug = graph.podcasts.find((p) => p.moments.some((mo) => mo.id === conn.sourceId))?.slug || "";

    if (!guestMap.has(guest)) {
      guestMap.set(guest, { guest, podcastSlug: podSlug, supports: 0, extends: 0, contradicts: 0, totalConnections: 0, highConfConnections: 0, claimIds: new Set(), confidences: [] });
    }
    const entry = guestMap.get(guest)!;
    entry.totalConnections++;
    entry.claimIds.add(conn.targetId);
    entry.confidences.push(conn.confidence);
    if (conn.confidence >= 0.75) entry.highConfConnections++;
    if (conn.relationship === "supports") entry.supports++;
    else if (conn.relationship === "extends") entry.extends++;
    else if (conn.relationship === "contradicts") entry.contradicts++;
  }

  return Array.from(guestMap.values())
    .map((g) => ({
      ...g,
      uniqueClaims: g.claimIds.size,
      avgConfidence: g.confidences.length > 0 ? Math.round((g.confidences.reduce((s, c) => s + c, 0) / g.confidences.length) * 100) / 100 : 0,
      claimIds: undefined,
      confidences: undefined,
    }))
    .sort((a, b) => b.totalConnections - a.totalConnections);
}

export function getMostAlignedGuests() {
  return getGuestInfluence()
    .sort((a, b) => b.highConfConnections - a.highConfConnections || b.avgConfidence - a.avgConfidence);
}

export function getMostChallengingGuests() {
  return getGuestInfluence()
    .filter((g) => g.contradicts > 0)
    .sort((a, b) => b.contradicts - a.contradicts || b.totalConnections - a.totalConnections);
}

// Resolve an item (claim or moment) by its ID and type
function resolveItem(id: string, type: "claim" | "moment") {
  if (type === "claim") {
    const c = claimById.get(id);
    if (!c) return null;
    return { id: c.id, type: "claim" as const, label: c.text, date: c.date, topics: c.topics };
  } else {
    const m = momentById.get(id);
    if (!m) return null;
    return { id: m.id, type: "moment" as const, label: m.text, date: m.date, topics: m.topics, guest: m.podcastGuest };
  }
}

export interface WebConnection {
  connection: Connection;
  source: { id: string; type: "claim" | "moment"; label: string; date: string; topics: string[]; guest?: string };
  target: { id: string; type: "claim" | "moment"; label: string; date: string; topics: string[]; guest?: string };
}

export function getWebConnectionsForTopic(topicSlug: string): WebConnection[] {
  return graph.connections
    .filter((conn) => {
      // Skip self-connections
      if (conn.sourceId === conn.targetId) return false;

      // Both source and target must share the given topic
      const source = resolveItem(conn.sourceId, conn.sourceType);
      const target = resolveItem(conn.targetId, conn.targetType);
      if (!source || !target) return false;
      return source.topics.includes(topicSlug) && target.topics.includes(topicSlug);
    })
    .map((conn) => {
      const source = resolveItem(conn.sourceId, conn.sourceType)!;
      const target = resolveItem(conn.targetId, conn.targetType)!;
      return { connection: conn, source, target };
    })
    .sort((a, b) => b.connection.confidence - a.connection.confidence);
}

export function getTopicTimelineData(topicSlug?: string): TopicTimeline[] {
  const items: TimelineItem[] = [];

  // Collect claims with inherited newsletter dates
  for (const nl of graph.newsletters) {
    const date = new Date(nl.date);
    if (isNaN(date.getTime())) continue;
    for (const claim of nl.claims) {
      if (topicSlug && !claim.topics.includes(topicSlug)) continue;
      items.push({
        id: claim.id,
        type: "claim",
        date: nl.date,
        topics: claim.topics,
        label: claim.text,
        synthesisLabel: claim.synthesisLabel,
        connectionCount: claim.connectionCount,
        newsletterSlug: nl.slug,
        newsletterTitle: nl.title,
        claimType: claim.type,
      });
    }
  }

  // Collect moments with inherited podcast dates
  for (const pod of graph.podcasts) {
    const date = new Date(pod.date);
    if (isNaN(date.getTime())) continue;
    for (const moment of pod.moments) {
      if (topicSlug && !moment.topics.includes(topicSlug)) continue;
      items.push({
        id: moment.id,
        type: "moment",
        date: pod.date,
        topics: moment.topics,
        label: moment.text,
        guest: moment.guest,
        podcastTitle: pod.title,
        timestamp: moment.timestamp,
      });
    }
  }

  // Group by topic
  const topicMap = new Map<string, TimelineItem[]>();
  for (const item of items) {
    for (const t of item.topics) {
      if (topicSlug && t !== topicSlug) continue;
      if (!topicMap.has(t)) topicMap.set(t, []);
      topicMap.get(t)!.push(item);
    }
  }

  // Build result sorted by item count (most active first)
  const topicLookup = new Map(graph.topics.map((t) => [t.slug, t.name]));
  return Array.from(topicMap.entries())
    .map(([slug, topicItems]) => ({
      topicSlug: slug,
      topicName: topicLookup.get(slug) || slug,
      items: topicItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    }))
    .sort((a, b) => b.items.length - a.items.length);
}

export function getTimelineDateBounds(): { min: string; max: string } | null {
  const dates: number[] = [];

  for (const nl of graph.newsletters) {
    const d = new Date(nl.date).getTime();
    if (!isNaN(d)) dates.push(d);
  }
  for (const pod of graph.podcasts) {
    const d = new Date(pod.date).getTime();
    if (!isNaN(d)) dates.push(d);
  }

  if (dates.length === 0) return null;

  return {
    min: new Date(Math.min(...dates)).toISOString(),
    max: new Date(Math.max(...dates)).toISOString(),
  };
}

export function searchAll(query: string) {
  const q = query.toLowerCase();
  const claims = graph.newsletters.flatMap((n) =>
    n.claims
      .filter((c) => c.text.toLowerCase().includes(q) || c.evidence.toLowerCase().includes(q))
      .map((c) => ({ ...c, newsletterTitle: n.title }))
  );
  const moments = graph.podcasts.flatMap((p) =>
    p.moments
      .filter((m) => m.text.toLowerCase().includes(q) || m.summary.toLowerCase().includes(q))
      .map((m) => ({ ...m, podcastTitle: p.title }))
  );
  return { claims, moments };
}
