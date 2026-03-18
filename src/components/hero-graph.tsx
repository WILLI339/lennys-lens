"use client";

import { NetworkGraph } from "@/components/network-graph";
import { getGraph } from "@/lib/data";
import { useState } from "react";

export function HeroGraph() {
  const [graph] = useState(() => getGraph());

  return (
    <div style={{ height: 420 }}>
      <NetworkGraph graph={graph} height={420} showLabels interactive />
    </div>
  );
}
