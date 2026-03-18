/**
 * Step 3: Match claims to moments using Claude API
 *
 * For each claim, find related podcast moments and score the relationship.
 * Output: data/connections.json
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.resolve(__dirname, "../../public/data");

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
  claimId: string;
  momentId: string;
  relationship: "supports" | "extends" | "contradicts";
  confidence: number;
  explanation: string;
}

async function matchClaimToMoments(
  client: Anthropic,
  claim: Claim,
  moments: Moment[]
): Promise<Connection[]> {
  // Pre-filter: only check moments with overlapping topics
  const relevantMoments = moments.filter((m) =>
    m.topics.some((t) => claim.topics.includes(t))
  );

  if (relevantMoments.length === 0) return [];

  // Batch moments to avoid hitting token limits
  const batchSize = 20;
  const allConnections: Connection[] = [];

  for (let i = 0; i < relevantMoments.length; i += batchSize) {
    const batch = relevantMoments.slice(i, i + batchSize);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are analyzing the relationship between a newsletter claim by Lenny Rachitsky and podcast moments from his guests.

CLAIM (from newsletter "${claim.newsletterSlug}"):
"${claim.text}"
Evidence: ${claim.evidence}

PODCAST MOMENTS:
${batch.map((m, j) => `[${j}] ${m.speaker} (${m.podcastSlug}): "${m.text}"`).join("\n")}

For each moment that has a meaningful relationship to the claim, provide:
- momentIndex: The index number [0-${batch.length - 1}]
- relationship: "supports" (agrees/validates), "extends" (adds nuance/new dimension), or "contradicts" (disagrees/challenges)
- confidence: 0.0-1.0 (how strong is the connection? Only include if >= 0.6)
- explanation: One sentence explaining the relationship

Only include moments with genuine, substantive connections (confidence >= 0.6). Skip moments that are only tangentially related.

Respond with valid JSON array. No markdown, just the JSON array. Return empty array [] if no strong connections.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const matches = JSON.parse(text) as Array<{
      momentIndex: number;
      relationship: "supports" | "extends" | "contradicts";
      confidence: number;
      explanation: string;
    }>;

    for (const match of matches) {
      if (match.confidence < 0.6) continue;
      const moment = batch[match.momentIndex];
      if (!moment) continue;

      allConnections.push({
        id: `conn-${claim.id}-${moment.id}`,
        claimId: claim.id,
        momentId: moment.id,
        relationship: match.relationship,
        confidence: match.confidence,
        explanation: match.explanation,
      });
    }
  }

  return allConnections;
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY environment variable required");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  const claims: Claim[] = JSON.parse(
    fs.readFileSync(path.join(OUTPUT_DIR, "claims.json"), "utf-8")
  );
  const moments: Moment[] = JSON.parse(
    fs.readFileSync(path.join(OUTPUT_DIR, "moments.json"), "utf-8")
  );

  // Load existing connections for incremental processing
  const connectionsPath = path.join(OUTPUT_DIR, "connections.json");
  const existingConnections: Connection[] = fs.existsSync(connectionsPath)
    ? JSON.parse(fs.readFileSync(connectionsPath, "utf-8"))
    : [];

  // Find which claim-moment pairs have already been evaluated
  const existingPairs = new Set(
    existingConnections.map((c) => `${c.claimId}::${c.momentId}`)
  );
  const existingClaimIds = new Set(existingConnections.map((c) => c.claimId));
  const existingMomentIds = new Set(existingConnections.map((c) => c.momentId));

  // Determine which moments are new (not referenced in any existing connection attempt)
  // We track evaluated claims in a separate file to know which claims were fully matched
  const evaluatedPath = path.join(OUTPUT_DIR, "evaluated-claims.json");
  const evaluatedClaimIds: Set<string> = fs.existsSync(evaluatedPath)
    ? new Set(JSON.parse(fs.readFileSync(evaluatedPath, "utf-8")) as string[])
    : new Set();

  const evaluatedMomentsPath = path.join(OUTPUT_DIR, "evaluated-moments.json");
  const evaluatedMomentIds: Set<string> = fs.existsSync(evaluatedMomentsPath)
    ? new Set(JSON.parse(fs.readFileSync(evaluatedMomentsPath, "utf-8")) as string[])
    : new Set();

  const newMomentIds = new Set(
    moments.filter((m) => !evaluatedMomentIds.has(m.id)).map((m) => m.id)
  );
  const newClaimIds = new Set(
    claims.filter((c) => !evaluatedClaimIds.has(c.id)).map((c) => c.id)
  );

  // We need to match:
  // 1. New claims against ALL moments
  // 2. Existing claims against NEW moments only
  const matchPairs: { claim: Claim; momentsToMatch: Moment[] }[] = [];

  for (const claim of claims) {
    if (newClaimIds.has(claim.id)) {
      // New claim — match against all moments
      matchPairs.push({ claim, momentsToMatch: moments });
    } else if (newMomentIds.size > 0) {
      // Existing claim — only match against new moments
      const newMoments = moments.filter((m) => newMomentIds.has(m.id));
      if (newMoments.length > 0) {
        matchPairs.push({ claim, momentsToMatch: newMoments });
      }
    }
  }

  if (matchPairs.length === 0) {
    console.log("All claim-moment pairs already evaluated. Nothing to do.");
    return;
  }

  console.log(
    `Matching ${matchPairs.length} claim batches (${newClaimIds.size} new claims, ${newMomentIds.size} new moments)...`
  );

  const allConnections: Connection[] = [...existingConnections];

  for (const { claim, momentsToMatch } of matchPairs) {
    console.log(`  Matching: ${claim.text.slice(0, 60)}...`);

    try {
      const connections = await matchClaimToMoments(client, claim, momentsToMatch);
      allConnections.push(...connections);
      console.log(`    -> ${connections.length} connections found`);
    } catch (err) {
      console.error(`    -> Error: ${err}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Save evaluated claims/moments tracking
  const allEvaluatedClaimsSet = new Set(Array.from(evaluatedClaimIds).concat(claims.map((c) => c.id)));
  const allEvaluatedMomentsSet = new Set(Array.from(evaluatedMomentIds).concat(moments.map((m) => m.id)));
  const allEvaluatedClaims = Array.from(allEvaluatedClaimsSet);
  const allEvaluatedMoments = Array.from(allEvaluatedMomentsSet);
  fs.writeFileSync(evaluatedPath, JSON.stringify(allEvaluatedClaims, null, 2));
  fs.writeFileSync(evaluatedMomentsPath, JSON.stringify(allEvaluatedMoments, null, 2));

  fs.writeFileSync(
    connectionsPath,
    JSON.stringify(allConnections, null, 2)
  );
  console.log(`\nWrote ${allConnections.length} connections to connections.json (${allConnections.length - existingConnections.length} new)`);
}

main().catch(console.error);
