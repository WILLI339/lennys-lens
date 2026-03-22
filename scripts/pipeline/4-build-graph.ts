/**
 * Step 4: Build the final graph JSON from pipeline outputs
 *
 * Assembles claims, moments, and connections into the graph.json
 * that the app consumes. Computes synthesis labels and topic summaries.
 * Output: public/data/graph.json
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = process.env.DATA_SOURCE_DIR || path.resolve(__dirname, "../../../lennys-newsletterpodcastdata");
const OUTPUT_DIR = path.resolve(__dirname, "../../public/data");
const INDEX_PATH = path.join(DATA_DIR, "index.json");

interface Claim {
  id: string;
  newsletterSlug: string;
  text: string;
  type: string;
  evidence: string;
  topics: string[];
}

interface Moment {
  id: string;
  podcastSlug: string;
  speaker: string;
  guest: string;
  timestamp: string;
  text: string;
  summary: string;
  topics: string[];
}

interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  sourceType: "claim" | "moment";
  targetType: "claim" | "moment";
  relationship: "supports" | "extends" | "contradicts";
  confidence: number;
  explanation: string;
}

type SynthesisLabel = "consensus" | "synthesis" | "curation" | "original";

function computeSynthesisLabel(
  claim: Claim,
  connections: Connection[],
  moments: Moment[]
): { label: SynthesisLabel; explanation: string } {
  const claimConnections = connections.filter((c) => c.targetId === claim.id);
  const supportingConnections = claimConnections.filter(
    (c) => c.relationship === "supports" || c.relationship === "extends"
  );

  // Count unique guests
  const uniqueGuests = new Set(
    supportingConnections.map((c) => {
      const moment = moments.find((m) => m.id === c.sourceId);
      return moment?.guest;
    })
  );

  if (uniqueGuests.size >= 3) {
    return {
      label: "consensus",
      explanation: `${uniqueGuests.size} guests independently support this claim.`,
    };
  }

  if (uniqueGuests.size === 2) {
    return {
      label: "synthesis",
      explanation: `Lenny synthesized insights from ${uniqueGuests.size} guest conversations.`,
    };
  }

  if (uniqueGuests.size === 1) {
    return {
      label: "curation",
      explanation: `Lenny amplified and contextualized one guest's insight.`,
    };
  }

  return {
    label: "original",
    explanation: `No direct podcast connection — this is Lenny's own editorial addition.`,
  };
}

async function generateSynthesisExplanations(
  client: Anthropic,
  claim: Claim,
  connections: Connection[],
  moments: Moment[],
  label: SynthesisLabel
): Promise<string> {
  const claimConnections = connections.filter((c) => c.targetId === claim.id);
  if (claimConnections.length === 0) {
    return `This is Lenny's own editorial addition — no podcast guests have discussed this specific point.`;
  }

  const connectedMoments = claimConnections.map((c) => {
    const moment = moments.find((m) => m.id === c.sourceId)!;
    return `${moment.speaker}: "${moment.text.slice(0, 100)}..." (${c.relationship})`;
  });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Write a one-sentence synthesis explanation for this newsletter claim by Lenny Rachitsky.

Claim: "${claim.text}"
Synthesis label: ${label}
Connected podcast moments:
${connectedMoments.join("\n")}

Explain how Lenny's claim relates to these podcast conversations. Be specific about guest names. One sentence only.`,
      },
    ],
  });

  return response.content[0].type === "text"
    ? response.content[0].text.trim()
    : "";
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY environment variable required");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
  const claims: Claim[] = JSON.parse(
    fs.readFileSync(path.join(OUTPUT_DIR, "claims.json"), "utf-8")
  );
  const moments: Moment[] = JSON.parse(
    fs.readFileSync(path.join(OUTPUT_DIR, "moments.json"), "utf-8")
  );
  const connections: Connection[] = JSON.parse(
    fs.readFileSync(path.join(OUTPUT_DIR, "connections.json"), "utf-8")
  );

  // Load existing graph for incremental processing
  const graphPath = path.join(OUTPUT_DIR, "graph.json");
  const existingGraph = fs.existsSync(graphPath)
    ? JSON.parse(fs.readFileSync(graphPath, "utf-8"))
    : null;

  // Build lookup of existing synthesis explanations and topic positions
  const existingSynthesis = new Map<string, { label: string; explanation: string; connectionCount: number }>();
  const existingTopicPositions = new Map<string, string>();
  if (existingGraph) {
    for (const nl of existingGraph.newsletters || []) {
      for (const claim of nl.claims || []) {
        existingSynthesis.set(claim.id, {
          label: claim.synthesisLabel,
          explanation: claim.synthesisExplanation,
          connectionCount: claim.connectionCount,
        });
      }
    }
    for (const topic of existingGraph.topics || []) {
      existingTopicPositions.set(topic.slug, topic.newsletterPosition);
    }
  }

  console.log("Building graph...");

  // Build newsletters with synthesized claims
  const newsletters = index.newsletters.map(
    (nl: { title: string; filename: string; word_count: number; date: string; subtitle?: string }) => {
      const slug = path.basename(nl.filename, ".md");
      const nlClaims = claims.filter((c) => c.newsletterSlug === slug);

      return {
        slug,
        title: nl.title,
        subtitle: nl.subtitle || "",
        date: nl.date,
        wordCount: nl.word_count,
        claims: nlClaims.map((claim) => {
          const { label, explanation } = computeSynthesisLabel(
            claim,
            connections,
            moments
          );
          const connectionCount = connections.filter(
            (c) => c.targetId === claim.id
          ).length;
          return {
            ...claim,
            synthesisLabel: label,
            synthesisExplanation: explanation,
            connectionCount,
          };
        }),
      };
    }
  );

  // Build podcasts with moments
  const podcasts = index.podcasts.map(
    (pod: {
      title: string;
      filename: string;
      word_count: number;
      date: string;
      guest: string;
      description: string;
    }) => {
      const slug = path.basename(pod.filename, ".md");
      return {
        slug,
        title: pod.title,
        guest: pod.guest,
        date: pod.date,
        description: pod.description,
        wordCount: pod.word_count,
        moments: moments.filter((m) => m.podcastSlug === slug),
      };
    }
  );

  // Build topics
  const topicSet = new Set<string>();
  claims.forEach((c) => c.topics.forEach((t) => topicSet.add(t)));
  moments.forEach((m) => m.topics.forEach((t) => topicSet.add(t)));

  const connectedMomentIds = new Set(connections.map((c) => c.sourceId));

  const topics = [...topicSet]
    .map((slug) => {
      const topicClaims = claims.filter((c) => c.topics.includes(slug));
      const topicMoments = moments.filter((m) => m.topics.includes(slug));
      const cuttingRoomFloor = topicMoments.filter(
        (m) => !connectedMomentIds.has(m.id)
      );

      return {
        slug,
        name: slug
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        claimCount: topicClaims.length,
        momentCount: topicMoments.length,
        cuttingRoomFloorCount: cuttingRoomFloor.length,
        newsletterPosition: "",
      };
    })
    .filter((t) => t.claimCount > 0 || t.momentCount > 2)
    .sort((a, b) => b.claimCount + b.momentCount - (a.claimCount + a.momentCount));

  // Generate topic position summaries (skip unchanged topics)
  for (const topic of topics) {
    const topicClaims = claims.filter((c) => c.topics.includes(topic.slug));
    if (topicClaims.length === 0) {
      topic.newsletterPosition = "No newsletter claims on this topic yet.";
      continue;
    }

    const existingPosition = existingTopicPositions.get(topic.slug);
    const existingTopicData = existingGraph?.topics?.find((t: { slug: string; claimCount: number; momentCount: number }) => t.slug === topic.slug);
    const countsChanged = !existingTopicData ||
      existingTopicData.claimCount !== topic.claimCount ||
      existingTopicData.momentCount !== topic.momentCount;

    if (existingPosition && !countsChanged) {
      topic.newsletterPosition = existingPosition;
      console.log(`  Topic "${topic.name}" unchanged — reusing position summary`);
      continue;
    }

    console.log(`  Generating position summary for topic: ${topic.name}`);
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `Summarize Lenny Rachitsky's editorial position on "${topic.name}" based on these claims from his newsletters:

${topicClaims.map((c) => `- ${c.text}`).join("\n")}

One sentence summary of his overall position. Be specific.`,
        },
      ],
    });

    topic.newsletterPosition =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : "";

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Generate detailed synthesis explanations (skip claims with unchanged connections)
  console.log("Generating synthesis explanations...");
  for (const nl of newsletters) {
    for (const claim of nl.claims) {
      const existing = existingSynthesis.get(claim.id);
      if (
        existing &&
        existing.label === claim.synthesisLabel &&
        existing.connectionCount === claim.connectionCount
      ) {
        claim.synthesisExplanation = existing.explanation;
        continue;
      }

      console.log(`  Generating explanation for claim: ${claim.text.slice(0, 50)}...`);
      const originalClaim = claims.find((c) => c.id === claim.id)!;
      claim.synthesisExplanation = await generateSynthesisExplanations(
        client,
        originalClaim,
        connections,
        moments,
        claim.synthesisLabel
      );
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  const graph = { newsletters, podcasts, connections, topics };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "graph.json"),
    JSON.stringify(graph, null, 2)
  );

  console.log(`
Graph built successfully:
  ${newsletters.length} newsletters
  ${podcasts.length} podcasts
  ${claims.length} claims
  ${moments.length} moments
  ${connections.length} connections
  ${topics.length} topics
  `);
}

main().catch(console.error);
