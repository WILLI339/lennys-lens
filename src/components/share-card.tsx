"use client";

import { useCallback } from "react";
import type { ClaimWithSynthesis } from "@/lib/types";
import { getConnectionsForClaim, getNewsletter } from "@/lib/data";

const SYNTHESIS_COLORS: Record<string, string> = {
  consensus: "#34D399",
  synthesis: "#60A5FA",
  curation: "#FBBF24",
  original: "#A78BFA",
};

export function ShareCardButton({ claim }: { claim: ClaimWithSynthesis }) {
  const generate = useCallback(() => {
    const nl = getNewsletter(claim.newsletterSlug);
    const newsletterTitle = nl?.title || claim.newsletterSlug;

    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 675;
    const ctx = canvas.getContext("2d")!;

    // Background
    ctx.fillStyle = "#0F0F1A";
    ctx.fillRect(0, 0, 1200, 675);

    // Subtle border
    ctx.strokeStyle = "#2A2A42";
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, 1120, 595);

    // Brand mark
    ctx.fillStyle = "#F0EAE0";
    ctx.font = "20px system-ui, sans-serif";
    ctx.fillText("Lenny's", 70, 85);
    ctx.fillStyle = "#E8813B";
    ctx.font = "italic 20px Georgia, serif";
    ctx.fillText("Lens", 155, 85);

    // Synthesis badge
    const badgeColor = SYNTHESIS_COLORS[claim.synthesisLabel] || "#9B9587";
    ctx.fillStyle = badgeColor;
    ctx.globalAlpha = 0.2;
    const badgeText = claim.synthesisLabel.charAt(0).toUpperCase() + claim.synthesisLabel.slice(1);
    const badgeWidth = ctx.measureText(badgeText).width + 24;
    roundRect(ctx, 70, 110, badgeWidth, 28, 14);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = badgeColor;
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillText(badgeText, 82, 129);

    // Connection count
    ctx.fillStyle = "#9B9587";
    ctx.font = "13px monospace";
    ctx.fillText(`${claim.connectionCount} connections`, 70 + badgeWidth + 12, 129);

    // Claim text (word wrap)
    ctx.fillStyle = "#F0EAE0";
    ctx.font = "32px Georgia, serif";
    const lines = wrapText(ctx, claim.text, 1060);
    let y = 180;
    for (const line of lines.slice(0, 4)) {
      ctx.fillText(line, 70, y);
      y += 44;
    }

    // Top guest quotes
    const connections = getConnectionsForClaim(claim.id).slice(0, 2);
    y += 20;
    for (const conn of connections) {
      if (y > 560) break;
      // Amber bar
      ctx.fillStyle = "#E8813B";
      ctx.fillRect(70, y, 3, 50);

      // Quote
      ctx.fillStyle = "#9B9587";
      ctx.font = "italic 16px Georgia, serif";
      const quoteLines = wrapText(ctx, `"${conn.moment.text}"`, 1000);
      let qy = y + 18;
      for (const ql of quoteLines.slice(0, 2)) {
        ctx.fillText(ql, 85, qy);
        qy += 22;
      }
      // Attribution
      ctx.fillStyle = "#6B6560";
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(`— ${conn.moment.speaker}`, 85, qy + 4);
      y = qy + 30;
    }

    // Footer
    ctx.fillStyle = "#6B6560";
    ctx.font = "12px monospace";
    ctx.fillText("Built with Claude Code + gstack  •  @swilliams185", 70, 615);
    ctx.fillText(`From: ${newsletterTitle}`, 70, 635);

    // Download
    const link = document.createElement("a");
    link.download = `lennys-lens-${claim.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [claim]);

  return (
    <button
      onClick={generate}
      className="rounded-md bg-[#E8813B] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#F5A66B]"
    >
      Share as image
    </button>
  );
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
