import { Badge } from "@/components/ui/badge";
import type { SynthesisLabel } from "@/lib/types";
import { cn } from "@/lib/utils";

const config: Record<SynthesisLabel, { label: string; className: string; description: string }> = {
  consensus: {
    label: "Consensus",
    className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200",
    description: "3+ guests independently agree",
  },
  synthesis: {
    label: "Synthesis",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200",
    description: "Lenny combined multiple guest insights",
  },
  curation: {
    label: "Curation",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200",
    description: "Amplified one guest's idea",
  },
  original: {
    label: "Original",
    className: "bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200",
    description: "Lenny's own addition",
  },
};

export function SynthesisBadge({
  label,
  showDescription = false,
}: {
  label: SynthesisLabel;
  showDescription?: boolean;
}) {
  const c = config[label];
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge variant="outline" className={cn("text-xs font-medium", c.className)}>
        {c.label}
      </Badge>
      {showDescription && (
        <span className="text-xs text-muted-foreground">{c.description}</span>
      )}
    </span>
  );
}

export function SynthesisLegend() {
  return (
    <div className="flex flex-wrap gap-3">
      {(Object.keys(config) as SynthesisLabel[]).map((label) => (
        <SynthesisBadge key={label} label={label} showDescription />
      ))}
    </div>
  );
}
