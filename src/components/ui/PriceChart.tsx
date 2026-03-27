"use client";

import { useMemo } from "react";
import type { PriceSnapshot } from "@/hooks/usePriceHistory";

interface PriceChartProps {
  snapshots: PriceSnapshot[];
  fuelKey: "e10" | "e5" | "diesel";
  color?: string;
  height?: number;
  showGrid?: boolean;
}

// ─── Catmull-Rom → Cubic Bezier (glatte Kurve ohne Überschwinger) ─────────────
function smoothPath(coords: { x: number; y: number }[], tension = 0.35): string {
  if (coords.length < 2) return "";
  let d = `M${coords[0].x.toFixed(2)},${coords[0].y.toFixed(2)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(0, i - 1)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(coords.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

export default function PriceChart({
  snapshots,
  fuelKey,
  color = "#22C55E",
  height = 100,
  showGrid = true,
}: PriceChartProps) {
  const W = 320;
  const H = height;
  const PAD = { top: 12, right: 56, bottom: 22, left: 38 };

  const points = useMemo(() => {
    return snapshots
      .map((s) => ({ ts: s.timestamp, val: s[fuelKey] }))
      .filter((p): p is { ts: number; val: number } => p.val !== null);
  }, [snapshots, fuelKey]);

  if (points.length < 2) {
    return (
      <div style={{ height: `${H}px`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "12px", color: "#64748B", textAlign: "center" }}>
          Sammle Daten…{"\n"}Komm morgen wieder für den Trend
        </p>
      </div>
    );
  }

  const minVal = Math.min(...points.map((p) => p.val));
  const maxVal = Math.max(...points.map((p) => p.val));
  const range  = maxVal - minVal || 0.01;
  const minTs  = points[0].ts;
  const maxTs  = points[points.length - 1].ts;
  const tsRange = maxTs - minTs || 1;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const baseY  = PAD.top + innerH;

  // ── Koordinaten ───────────────────────────────────────────────────────────
  const coords = points.map((p) => ({
    x:   PAD.left + ((p.ts - minTs) / tsRange) * innerW,
    y:   PAD.top  + (1 - (p.val - minVal) / range) * innerH,
    val: p.val,
    ts:  p.ts,
  }));

  // ── Glatter Bezier-Pfad ───────────────────────────────────────────────────
  const pathD = smoothPath(coords);
  const areaD = `${pathD} L${coords[coords.length - 1].x.toFixed(2)},${baseY} L${PAD.left},${baseY} Z`;

  // ── Y-Achse: 3 Labels ─────────────────────────────────────────────────────
  const yLabels = [minVal, (minVal + maxVal) / 2, maxVal].map((v) => ({
    y:     PAD.top + (1 - (v - minVal) / range) * innerH,
    label: v.toFixed(3).replace(".", ","),
  }));

  // ── Min / Max Punkte für Markierungen ────────────────────────────────────
  const minCoord = coords.find((c) => c.val === minVal)!;
  const maxCoord = coords.find((c) => c.val === maxVal)!;
  const last     = coords[coords.length - 1];
  const trend    = points[points.length - 1].val - points[0].val;

  const gradId   = `grad-${fuelKey}`;
  const glowId   = `glow-${fuelKey}`;

  return (
    <div style={{ position: "relative" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ overflow: "visible" }}
        aria-label="Preisverlauf Sparkline-Chart"
      >
        <defs>
          {/* Area-Gradient */}
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.30" />
            <stop offset="60%"  stopColor={color} stopOpacity="0.08" />
            <stop offset="100%" stopColor={color} stopOpacity="0.00" />
          </linearGradient>
          {/* Linien-Glow via Filter */}
          <filter id={glowId} x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Grid-Linien ─────────────────────────────────────────────────── */}
        {showGrid && yLabels.map((l, i) => (
          <g key={i}>
            <line
              x1={PAD.left} y1={l.y.toFixed(1)}
              x2={W - PAD.right} y2={l.y.toFixed(1)}
              stroke="#1E1E2E" strokeWidth="1"
              strokeDasharray={i === 1 ? "4,4" : "0"}
            />
            <text
              x={PAD.left - 5} y={(l.y + 3.5).toFixed(1)}
              textAnchor="end" fontSize="9" fill="#475569"
              fontFamily="'JetBrains Mono', monospace"
            >
              {l.label}
            </text>
          </g>
        ))}

        {/* ── Area-Füllung ─────────────────────────────────────────────────── */}
        <path d={areaD} fill={`url(#${gradId})`} />

        {/* ── Hauptlinie (glatter Bezier) mit Glow ─────────────────────────── */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
          opacity="0.9"
        />
        {/* Zweite dünnere Linie darüber für Schärfe */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* ── Min-Punkt ────────────────────────────────────────────────────── */}
        {minCoord !== maxCoord && (
          <g>
            <circle cx={minCoord.x.toFixed(1)} cy={minCoord.y.toFixed(1)} r="3.5" fill="#22C55E" />
            <text
              x={(minCoord.x).toFixed(1)}
              y={(minCoord.y - 7).toFixed(1)}
              textAnchor="middle" fontSize="8" fill="#22C55E"
              fontFamily="'JetBrains Mono', monospace" fontWeight="700"
            >
              ↓min
            </text>
          </g>
        )}

        {/* ── Max-Punkt ────────────────────────────────────────────────────── */}
        {maxCoord !== minCoord && (
          <g>
            <circle cx={maxCoord.x.toFixed(1)} cy={maxCoord.y.toFixed(1)} r="3.5" fill="#EF4444" />
            <text
              x={(maxCoord.x).toFixed(1)}
              y={(maxCoord.y - 7).toFixed(1)}
              textAnchor="middle" fontSize="8" fill="#EF4444"
              fontFamily="'JetBrains Mono', monospace" fontWeight="700"
            >
              ↑max
            </text>
          </g>
        )}

        {/* ── Aktueller Punkt (pulsierend) ──────────────────────────────────── */}
        <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="10" fill={color} fillOpacity="0.08" />
        <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="5"  fill={color} fillOpacity="0.3" />
        <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="3"  fill={color} />

        {/* Aktueller Preis rechts */}
        <text
          x={(W - PAD.right + 6).toFixed(1)} y={(last.y + 4).toFixed(1)}
          fontSize="11" fill={color}
          fontFamily="'JetBrains Mono', monospace"
          fontWeight="700"
        >
          {last.val.toFixed(3).replace(".", ",")}€
        </text>

        {/* ── Zeitachse ────────────────────────────────────────────────────── */}
        <text x={PAD.left} y={H - 4} fontSize="9" fill="#475569" fontFamily="'Inter', sans-serif">
          {new Intl.DateTimeFormat("de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(points[0].ts))}
        </text>
        <text x={W - PAD.right} y={H - 4} fontSize="9" fill="#475569" fontFamily="'Inter', sans-serif" textAnchor="end">
          Jetzt
        </text>
      </svg>

      {/* ── Trend-Badge ─────────────────────────────────────────────────────── */}
      <div style={{
        position: "absolute", top: "6px", right: "4px",
        fontSize: "10px", fontWeight: 700, padding: "2px 8px",
        borderRadius: "6px",
        background: trend < -0.005 ? "rgba(34,197,94,0.12)" : trend > 0.005 ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
        color:      trend < -0.005 ? "#22C55E" : trend > 0.005 ? "#EF4444" : "#F59E0B",
        border: `1px solid ${trend < -0.005 ? "rgba(34,197,94,0.25)" : trend > 0.005 ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}`,
      }}>
        {trend < -0.005 ? "↓ Fallend" : trend > 0.005 ? "↑ Steigend" : "→ Stabil"}
      </div>
    </div>
  );
}
