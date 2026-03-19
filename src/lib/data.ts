import type { Graph, Newsletter, Podcast, Connection, Topic, ClaimWithSynthesis, PodcastMoment, TimelineItem, TopicTimeline } from "./types";
import graphData from "../../public/data/graph.json";

const graph = graphData as unknown as Graph;

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
    .filter((c) => c.claimId === claimId)
    .map((conn) => {
      const podcast = graph.podcasts.find((p) =>
        p.moments.some((m) => m.id === conn.momentId)
      )!;
      const moment = podcast?.moments.find((m) => m.id === conn.momentId)!;
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
  const connectedMomentIds = new Set(graph.connections.map((c) => c.momentId));
  return getMomentsForTopic(topicSlug).filter((m) => !connectedMomentIds.has(m.id));
}

export function getStats() {
  const totalClaims = graph.newsletters.reduce((sum, n) => sum + n.claims.length, 0);
  const totalMoments = graph.podcasts.reduce((sum, p) => sum + p.moments.length, 0);
  const totalConnections = graph.connections.length;
  const connectedMomentIds = new Set(graph.connections.map((c) => c.momentId));
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
            .filter((conn) => conn.claimId === c.id)
            .map((conn) => {
              const pod = graph.podcasts.find((p) => p.moments.some((m) => m.id === conn.momentId));
              return pod?.guest;
            })
            .filter(Boolean)
        ).size,
      }))
    )
    .sort((a, b) => b.connectionCount - a.connectionCount);
}

export function getGuestInfluence() {
  const guestMap = new Map<string, { guest: string; podcastSlug: string; supports: number; extends: number; contradicts: number; totalConnections: number; claimIds: Set<string> }>();

  for (const conn of graph.connections) {
    const podcast = graph.podcasts.find((p) => p.moments.some((m) => m.id === conn.momentId));
    if (!podcast) continue;
    const guest = podcast.guest;

    if (!guestMap.has(guest)) {
      guestMap.set(guest, { guest, podcastSlug: podcast.slug, supports: 0, extends: 0, contradicts: 0, totalConnections: 0, claimIds: new Set() });
    }
    const entry = guestMap.get(guest)!;
    entry.totalConnections++;
    entry.claimIds.add(conn.claimId);
    if (conn.relationship === "supports") entry.supports++;
    else if (conn.relationship === "extends") entry.extends++;
    else if (conn.relationship === "contradicts") entry.contradicts++;
  }

  return Array.from(guestMap.values())
    .map((g) => ({ ...g, uniqueClaims: g.claimIds.size, claimIds: undefined }))
    .sort((a, b) => b.totalConnections - a.totalConnections);
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
