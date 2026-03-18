import { Badge } from "@/components/ui/badge";
import type { SynthesisLabel } from "@/lib/types";
import { cn } from "@/lib/utils";

const config: Record<SynthesisLabel, { label: string; className: string; description: string }> = {
  consensus: {
    label: "Consensus",
    className: "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30",
    description: "3+ guests independently agree",
  },
  synthesis: {
    label: "Synthesis",
    className: "bg-blue-500/15 text-blue-400 hover:bg-blue-500/20 border-blue-500/30",
    description: "Lenny combined multiple guest insights",
  },
  curation: {
    label: "Curation",
    className: "bg-amber-500/15 text-amber-400 hover:bg-amber-500/20 border-amber-500/30",
    description: "Amplified one guest's idea",
  },
  original: {
    label: "Original",
    className: "bg-purple-500/15 text-purple-400 hover:bg-purple-500/20 border-purple-500/30",
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
