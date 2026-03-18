/**
 * Step 2: Extract key moments from podcast transcripts using Claude API
 *
 * Reads each podcast transcript and extracts notable moments with timestamps.
 * Output: data/moments.json
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
  guest: string;
  description: string;
}

interface ExtractedMoment {
  id: string;
  podcastSlug: string;
  speaker: string;
  guest: string;
  timestamp: string;
  text: string;
  summary: string;
  topics: string[];
}

async function extractMoments(
  client: Anthropic,
  podcast: IndexEntry,
  content: string
): Promise<ExtractedMoment[]> {
  const slug = path.basename(podcast.filename, ".md");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Analyze this podcast transcript from Lenny's Podcast and extract 3-8 key moments — the most insightful, quotable, or notable statements.

For each moment, provide:
- speaker: Who said it (use their name, not "Guest")
- timestamp: The timestamp from the transcript (format: "HH:MM:SS")
- text: The exact quote or close paraphrase (1-3 sentences)
- summary: One-sentence summary of the insight
- topics: 2-4 topic tags (use kebab-case, e.g., "growth", "ai-tools", "product-management", "retention", "gamification", "vibe-coding", "career", "metrics", "evals", "prototyping", "product-design", "engineering", "productivity")

Focus on substantive insights, frameworks, and contrarian takes — not pleasantries or generic advice.

Podcast: "${podcast.title}"
Guest: ${podcast.guest}
Date: ${podcast.date}

${content}

Respond with valid JSON array of moments. No markdown, just the JSON array.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const moments = JSON.parse(text) as Array<{
    speaker: string;
    timestamp: string;
    text: string;
    summary: string;
    topics: string[];
  }>;

  return moments.map((moment, i) => ({
    id: `moment-${slug}-${i + 1}`,
    podcastSlug: slug,
    speaker: moment.speaker,
    guest: podcast.guest,
    timestamp: moment.timestamp,
    text: moment.text,
    summary: moment.summary,
    topics: moment.topics,
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
  const podcasts: IndexEntry[] = index.podcasts;

  // Load existing moments for incremental processing
  const momentsPath = path.join(OUTPUT_DIR, "moments.json");
  const existingMoments: ExtractedMoment[] = fs.existsSync(momentsPath)
    ? JSON.parse(fs.readFileSync(momentsPath, "utf-8"))
    : [];
  const processedSlugs = new Set(existingMoments.map((m) => m.podcastSlug));

  const newPodcasts = podcasts.filter(
    (pod) => !processedSlugs.has(path.basename(pod.filename, ".md"))
  );

  if (newPodcasts.length === 0) {
    console.log(`All ${podcasts.length} podcasts already processed. Nothing to do.`);
    return;
  }

  console.log(`Processing ${newPodcasts.length} new podcasts (${processedSlugs.size} already done)...`);

  const allMoments: ExtractedMoment[] = [...existingMoments];

  for (const podcast of newPodcasts) {
    const filePath = path.join(DATA_DIR, podcast.filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipping ${podcast.filename} — file not found`);
      continue;
    }

    console.log(`  Extracting moments from: ${podcast.title}`);
    const content = fs.readFileSync(filePath, "utf-8");

    try {
      const moments = await extractMoments(client, podcast, content);
      allMoments.push(...moments);
      console.log(`    -> ${moments.length} moments extracted`);
    } catch (err) {
      console.error(`    -> Error: ${err}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "moments.json"),
    JSON.stringify(allMoments, null, 2)
  );
  console.log(`\nWrote ${allMoments.length} moments to moments.json (${allMoments.length - existingMoments.length} new)`);
}

main().catch(console.error);
