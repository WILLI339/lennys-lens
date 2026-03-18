export interface Claim {
  id: string;
  newsletterSlug: string;
  text: string;
  type: "framework" | "recommendation" | "observation" | "prediction";
  evidence: string;
  topics: string[];
}

export type SynthesisLabel =
  | "consensus"    // 3+ guests agree
  | "synthesis"    // Lenny combined multiple guests
  | "curation"     // Amplified one guest
  | "original";    // Lenny's own addition

export interface ClaimWithSynthesis extends Claim {
  synthesisLabel: SynthesisLabel;
  synthesisExplanation: string;
  connectionCount: number;
}

export interface PodcastMoment {
  id: string;
  podcastSlug: string;
  speaker: string;
  guest: string;
  timestamp: string;
  text: string;
  summary: string;
  topics: string[];
}

export type Relationship = "supports" | "extends" | "contradicts";

export interface Connection {
  id: string;
  claimId: string;
  momentId: string;
  relationship: Relationship;
  confidence: number;
  explanation: string;
}

export interface Newsletter {
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  wordCount: number;
  claims: ClaimWithSynthesis[];
}

export interface Podcast {
  slug: string;
  title: string;
  guest: string;
  date: string;
  description: string;
  wordCount: number;
  moments: PodcastMoment[];
}

export interface Topic {
  slug: string;
  name: string;
  claimCount: number;
  momentCount: number;
  cuttingRoomFloorCount: number;
  newsletterPosition: string;
}

export interface Graph {
  newsletters: Newsletter[];
  podcasts: Podcast[];
  connections: Connection[];
  topics: Topic[];
}
