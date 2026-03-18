/**
 * Step 1: Extract claims from newsletters using Claude API
 *
 * Reads each newsletter markdown file and extracts 3-8 structured claims.
 * Output: data/claims.json
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = process.env.DATA_SOURCE_DIR || path.resolve(__dirname, "../../../lennys-newsletterpodcastdata");
const OUTPUT_DIR = path.resolve(__dirname, "../../public/data");
const INDEX_PATH = path.join(DATA_DIR, "index.json");

interface IndexEntry {
  title: string;
  filename: string;
  word_count: number;
  date: string;
  subtitle?: string;
}

interface ExtractedClaim {
  id: string;
  newsletterSlug: string;
  text: string;
  type: "framework" | "recommendation" | "observation" | "prediction";
  evidence: string;
  topics: string[];
}

async function extractClaims(
  client: Anthropic,
  newsletter: IndexEntry,
  content: string
): Promise<ExtractedClaim[]> {
  const slug = path.basename(newsletter.filename, ".md");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Analyze this newsletter by Lenny Rachitsky and extract 3-8 key claims, frameworks, recommendations, or observations.

For each claim, provide:
- text: The claim stated clearly in one sentence
- type: One of "framework" (a model/framework), "recommendation" (actionable advice), "observation" (pattern noticed), "prediction" (future-looking statement)
- evidence: What evidence or reasoning supports this claim in the newsletter
- topics: 2-4 topic tags (use kebab-case, e.g., "growth", "ai-tools", "product-management", "retention", "gamification", "vibe-coding", "career", "metrics", "evals", "prototyping")

Newsletter: "${newsletter.title}"
Date: ${newsletter.date}

${content}

Respond with valid JSON array of claims. No markdown, just the JSON array.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const claims = JSON.parse(text) as Array<{
    text: string;
    type: string;
    evidence: string;
    topics: string[];
  }>;

  return claims.map((claim, i) => ({
    id: `claim-${slug}-${i + 1}`,
    newsletterSlug: slug,
    text: claim.text,
    type: claim.type as ExtractedClaim["type"],
    evidence: claim.evidence,
    topics: claim.topics,
  }));
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY environment variable required");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
  const newsletters: IndexEntry[] = index.newsletters;

  // Load existing claims for incremental processing
  const claimsPath = path.join(OUTPUT_DIR, "claims.json");
  const existingClaims: ExtractedClaim[] = fs.existsSync(claimsPath)
    ? JSON.parse(fs.readFileSync(claimsPath, "utf-8"))
    : [];
  const processedSlugs = new Set(existingClaims.map((c) => c.newsletterSlug));

  const newNewsletters = newsletters.filter(
    (nl) => !processedSlugs.has(path.basename(nl.filename, ".md"))
  );

  if (newNewsletters.length === 0) {
    console.log(`All ${newsletters.length} newsletters already processed. Nothing to do.`);
    return;
  }

  console.log(`Processing ${newNewsletters.length} new newsletters (${processedSlugs.size} already done)...`);

  const allClaims: ExtractedClaim[] = [...existingClaims];

  for (const newsletter of newNewsletters) {
    const filePath = path.join(DATA_DIR, newsletter.filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipping ${newsletter.filename} — file not found`);
      continue;
    }

    console.log(`  Extracting claims from: ${newsletter.title}`);
    const content = fs.readFileSync(filePath, "utf-8");

    try {
      const claims = await extractClaims(client, newsletter, content);
      allClaims.push(...claims);
      console.log(`    -> ${claims.length} claims extracted`);
    } catch (err) {
      console.error(`    -> Error: ${err}`);
    }

    // Rate limit: small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "claims.json"),
    JSON.stringify(allClaims, null, 2)
  );
  console.log(`\nWrote ${allClaims.length} claims to claims.json (${allClaims.length - existingClaims.length} new)`);
}

main().catch(console.error);
