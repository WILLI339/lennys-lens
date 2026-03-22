import { getTimelineDateBounds } from "@/lib/data";

const SPARK_W = 56;
const SPARK_H = 22;

export function TopicSparkline({ dates, active }: { dates: string[]; active: boolean }) {
  if (dates.length === 0) {
    return (
      <svg width={SPARK_W} height={SPARK_H} className="hidden sm:inline-block" aria-hidden>
        <line x1={0} y1={SPARK_H / 2} x2={SPARK_W} y2={SPARK_H / 2} stroke="#6B6560" strokeWidth={1} strokeOpacity={0.3} />
      </svg>
    );
  }

  const bounds = getTimelineDateBounds();
  if (!bounds) return null;

  const minT = new Date(bounds.min).getTime();
  const maxT = new Date(bounds.max).getTime();
  const range = maxT - minT || 1;

  const bins = new Array(10).fill(0);
  for (const d of dates) {
    const t = new Date(d).getTime();
    const bin = Math.min(9, Math.floor(((t - minT) / range) * 10));
    bins[bin]++;
  }
  const maxBin = Math.max(1, ...bins);

  const points = bins.map((count, i) => {
    const x = (i / 9) * SPARK_W;
    const y = (SPARK_H - 2) - (count / maxBin) * (SPARK_H - 4);
    return `${x},${y}`;
  });
  const pathD = `M${points.join(" L")}`;
  const areaD = `${pathD} L${SPARK_W},${SPARK_H - 2} L0,${SPARK_H - 2} Z`;

  return (
    <svg width={SPARK_W} height={SPARK_H} className="hidden sm:inline-block" aria-hidden>
      <path d={areaD} fill="#E8813B" fillOpacity={active ? 0.2 : 0.08} />
      <path d={pathD} fill="none" stroke="#E8813B" strokeWidth={1.5} strokeOpacity={active ? 1 : 0.5} />
    </svg>
  );
}
