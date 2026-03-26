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

export default function PriceChart({
  snapshots,
  fuelKey,
  color = "#22C55E",
  height = 64,
  showGrid = true,
}: PriceChartProps) {
  const W = 320;
  const H = height;
  const PAD = { top: 8, right: 8, bottom: 16, left: 36 };

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

  // Koordinaten berechnen
  const coords = points.map((p) => ({
    x: PAD.left + ((p.ts - minTs) / tsRange) * innerW,
    y: PAD.top  + (1 - (p.val - minVal) / range) * innerH,
    val: p.val,
    ts: p.ts,
  }));

  // SVG-Pfad bauen
  const pathD = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");

  // Area-Pfad (Füllung unter der Linie)
  const areaD = `${pathD} L${coords[coords.length - 1].x.toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${PAD.left},${(PAD.top + innerH).toFixed(1)} Z`;

  // Y-Achsen-Beschriftungen
  const yLabels = [minVal, (minVal + maxVal) / 2, maxVal].map((v) => ({
    val: v,
    y: PAD.top + (1 - (v - minVal) / range) * innerH,
    label: v.toFixed(3).replace(".", ","),
  }));

  // Letzter Punkt für "aktuell" Markierung
  const last = coords[coords.length - 1];
  const trend = points[points.length - 1].val - points[0].val;

  return (
    <div style={{ position: "relative" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ overflow: "visible" }}
        aria-label="Preisverlauf Sparkline-Chart"
      >
        <defs>
          <linearGradient id={`grad-${fuelKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid-Linien */}
        {showGrid && yLabels.map((l, i) => (
          <g key={i}>
            <line
              x1={PAD.left} y1={l.y.toFixed(1)}
              x2={W - PAD.right} y2={l.y.toFixed(1)}
              stroke="#1E1E2E" strokeWidth="1" strokeDasharray={i === 0 || i === 2 ? "0" : "4,4"}
            />
            <text
              x={PAD.left - 4} y={(l.y + 4).toFixed(1)}
              textAnchor="end" fontSize="9" fill="#475569"
              fontFamily="'JetBrains Mono', monospace"
            >
              {l.label}
            </text>
          </g>
        ))}

        {/* Area-Füllung */}
        <path d={areaD} fill={`url(#grad-${fuelKey})`} />

        {/* Linie */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Aktueller Punkt */}
        <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="4" fill={color} />
        <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="8" fill={color} fillOpacity="0.15" />

        {/* Aktueller Preis Label */}
        <text
          x={(last.x + 12).toFixed(1)} y={(last.y + 4).toFixed(1)}
          fontSize="11" fill={color} fontFamily="'JetBrains Mono', monospace"
          fontWeight="700"
        >
          {last.val.toFixed(3).replace(".", ",")}€
        </text>

        {/* Zeitachse */}
        {points.length > 1 && (
          <>
            <text x={PAD.left} y={H - 2} fontSize="9" fill="#475569" fontFamily="'Inter', sans-serif">
              {new Intl.DateTimeFormat("de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(points[0].ts))}
            </text>
            <text x={W - PAD.right} y={H - 2} fontSize="9" fill="#475569" fontFamily="'Inter', sans-serif" textAnchor="end">
              Jetzt
            </text>
          </>
        )}
      </svg>

      {/* Trend-Badge */}
      <div style={{
        position: "absolute", top: "4px", right: "4px",
        fontSize: "10px", fontWeight: 700, padding: "2px 8px",
        borderRadius: "6px",
        background: trend < -0.005 ? "rgba(34,197,94,0.12)" : trend > 0.005 ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
        color: trend < -0.005 ? "#22C55E" : trend > 0.005 ? "#EF4444" : "#F59E0B",
        border: `1px solid ${trend < -0.005 ? "rgba(34,197,94,0.25)" : trend > 0.005 ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}`,
      }}>
        {trend < -0.005 ? "↓ Fallend" : trend > 0.005 ? "↑ Steigend" : "→ Stabil"}
      </div>
    </div>
  );
}
