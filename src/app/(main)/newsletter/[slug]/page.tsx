import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SynthesisLegend } from "@/components/synthesis-badge";
import { ClaimCard } from "@/components/claim-card";
import { getNewsletter, getNewsletters } from "@/lib/data";

export function generateStaticParams() {
  return getNewsletters().map((n) => ({ slug: n.slug }));
}

export default async function NewsletterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const newsletter = getNewsletter(slug);
  if (!newsletter) return notFound();

  const totalConnections = newsletter.claims.reduce(
    (sum, c) => sum + c.connectionCount,
    0
  );

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/"
          className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to overview
        </Link>
        <h1 className="font-[family-name:var(--font-instrument-serif)] text-2xl tracking-tight sm:text-3xl">
          {newsletter.title}
        </h1>
        <p className="mt-1 text-muted-foreground">{newsletter.subtitle}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{newsletter.date}</span>
          <span>{newsletter.wordCount.toLocaleString()} words</span>
          <span>{newsletter.claims.length} claims</span>
          <span>{totalConnections} podcast connections</span>
        </div>
      </div>

      <SynthesisLegend />

      <div className="space-y-4">
        {newsletter.claims.map((claim) => (
          <ClaimCard key={claim.id} claim={claim} />
        ))}
      </div>
    </div>
  );
}
