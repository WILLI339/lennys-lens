import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Connection, PodcastMoment, Podcast, Relationship } from "@/lib/types";
import { cn } from "@/lib/utils";

const relationshipConfig: Record<Relationship, { label: string; className: string; icon: string }> = {
  supports: {
    label: "Supports",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: "+",
  },
  extends: {
    label: "Extends",
    className: "bg-blue-100 text-blue-800 border-blue-200",
    icon: "~",
  },
  contradicts: {
    label: "Contradicts",
    className: "bg-red-100 text-red-800 border-red-200",
    icon: "x",
  },
};

export function ConnectionCard({
  connection,
  moment,
  podcast,
}: {
  connection: Connection;
  moment: PodcastMoment;
  podcast: Podcast;
}) {
  const rel = relationshipConfig[connection.relationship];

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-xs font-medium", rel.className)}>
              <span className="mr-1 font-mono">{rel.icon}</span>
              {rel.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {Math.round(connection.confidence * 100)}% confidence
            </span>
          </div>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {moment.timestamp}
          </span>
        </div>

        <blockquote className="border-l-2 border-muted pl-3 text-sm italic text-foreground/90">
          &ldquo;{moment.text}&rdquo;
        </blockquote>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{moment.speaker}</span>
          <span className="text-xs text-muted-foreground">{podcast.title}</span>
        </div>

        <p className="text-xs text-muted-foreground">{connection.explanation}</p>
      </CardContent>
    </Card>
  );
}
