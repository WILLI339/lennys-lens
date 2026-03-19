import { ImageResponse } from "next/og";
import { getTopicTimelineData } from "@/lib/data";

export const runtime = "nodejs";
export const alt = "Lenny's Lens — Topic Evolution Timeline";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  const timelines = getTopicTimelineData();
  const topTopics = timelines.slice(0, 8);
  const totalClaims = timelines.reduce((sum, tl) => sum + tl.items.filter((i) => i.type === "claim").length, 0);
  const totalMoments = timelines.reduce((sum, tl) => sum + tl.items.filter((i) => i.type === "moment").length, 0);

  return new ImageResponse(
    (
      <div
        style={{
          background: "#0F0F1A",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "48px 64px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 32, fontWeight: 700, color: "#F0EAE0" }}>
            {"Lenny's"}
          </span>
          <span style={{ fontSize: 32, fontStyle: "italic", color: "#E8813B" }}>
            Lens
          </span>
        </div>

        <div style={{ display: "flex", fontSize: 48, fontWeight: 700, color: "#F0EAE0", marginTop: 24, lineHeight: 1.2 }}>
          Topic Evolution Timeline
        </div>

        <div style={{ display: "flex", fontSize: 20, color: "#9B9587", marginTop: 12 }}>
          {`How Lenny's thinking evolved across ${totalClaims} claims and ${totalMoments} podcast moments`}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 32, flex: 1 }}>
          {topTopics.map((tl) => {
            const claimCount = tl.items.filter((i) => i.type === "claim").length;
            const momentCount = tl.items.filter((i) => i.type === "moment").length;
            return (
              <div key={tl.topicSlug} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ display: "flex", width: 150, fontSize: 16, color: "#9B9587", justifyContent: "flex-end" }}>
                  {tl.topicName}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 3, flex: 1 }}>
                  {Array.from({ length: claimCount }).map((_, i) => (
                    <div key={`c${i}`} style={{ width: 12, height: 12, borderRadius: 6, background: "#34D399" }} />
                  ))}
                  {Array.from({ length: Math.min(momentCount, 12) }).map((_, i) => (
                    <div key={`m${i}`} style={{ width: 6, height: 6, borderRadius: 3, background: "#4B5563" }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 32, fontSize: 14, color: "#6B6560" }}>
          <span>{`${timelines.length} topics`}</span>
          <span>{`${totalClaims} newsletter claims`}</span>
          <span>{`${totalMoments} podcast moments`}</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
