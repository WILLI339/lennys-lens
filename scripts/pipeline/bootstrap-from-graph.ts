/**
 * Bootstrap intermediate pipeline files from an existing graph.json
 *
 * If you have a graph.json but are missing claims.json, moments.json,
 * or connections.json, this script extracts them so the incremental
 * pipeline can pick up where it left off.
 */

import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.resolve(__dirname, "../../public/data");
const graphPath = path.join(OUTPUT_DIR, "graph.json");

if (!fs.existsSync(graphPath)) {
  console.error("No graph.json found — nothing to bootstrap from.");
  process.exit(1);
}

const graph = JSON.parse(fs.readFileSync(graphPath, "utf-8"));

// Extract claims
const claims = graph.newsletters.flatMap((nl: any) =>
  nl.claims.map((c: any) => ({
    id: c.id,
    newsletterSlug: c.newsletterSlug,
    text: c.text,
    type: c.type,
    evidence: c.evidence,
    topics: c.topics,
  }))
);

// Extract moments
const moments = graph.podcasts.flatMap((p: any) =>
  p.moments.map((m: any) => ({
    id: m.id,
    podcastSlug: m.podcastSlug,
    speaker: m.speaker,
    guest: m.guest,
    timestamp: m.timestamp,
    text: m.text,
    summary: m.summary,
    topics: m.topics,
  }))
);

// Extract connections
const connections = graph.connections;

// Track evaluated claims/moments for step 3
const evaluatedClaims = claims.map((c: any) => c.id);
const evaluatedMoments = moments.map((m: any) => m.id);

const writes = [
  { file: "claims.json", data: claims },
  { file: "moments.json", data: moments },
  { file: "connections.json", data: connections },
  { file: "evaluated-claims.json", data: evaluatedClaims },
  { file: "evaluated-moments.json", data: evaluatedMoments },
];

for (const { file, data } of writes) {
  const filePath = path.join(OUTPUT_DIR, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ${file} already exists — skipping`);
  } else {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`  ${file} — ${Array.isArray(data) ? data.length : "?"} entries`);
  }
}

console.log("\nBootstrap complete. You can now run the pipeline incrementally.");
