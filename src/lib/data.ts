import type { Graph, Newsletter, Podcast, Connection, Topic, ClaimWithSynthesis, PodcastMoment } from "./types";
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
