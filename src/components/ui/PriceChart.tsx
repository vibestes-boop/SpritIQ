"use client";

import { useMemo, useId } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import type { PriceSnapshot } from "@/hooks/usePriceHistory";

interface PriceChartProps {
  snapshots: PriceSnapshot[];
  fuelKey: "e10" | "e5" | "diesel";
  color?: string;
  height?: number;
  showGrid?: boolean;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  const price = payload[0].value;
  const time  = label
    ? new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date(label))
    : "";
  return (
    <div style={{
      background: "#16161F",
      border: "1px solid #2A2A3C",
      borderRadius: "8px",
      padding: "6px 10px",
      fontSize: "12px",
      lineHeight: 1.6,
      boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
    }}>
      <p style={{ color: "#64748B", marginBottom: "2px" }}>{time} Uhr</p>
      <p style={{ color: "#F8FAFC", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
        {price.toFixed(3).replace(".", ",")} €
      </p>
    </div>
  );
}

// ─── Custom Dot (nur letzter Punkt sichtbar) ─────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomDot(props: any) {
  const { cx, cy, index, data, color } = props;
  if (index !== data.length - 1) return null;
  return (
    <g key={`dot-last-${cx}-${cy}`}>
      <circle cx={cx} cy={cy} r={8} fill={color} fillOpacity={0.15} />
      <circle cx={cx} cy={cy} r={4} fill={color} />
    </g>
  );
}

export default function PriceChart({
  snapshots,
  fuelKey,
  color = "#22C55E",
  height = 110,
  showGrid = true,
}: PriceChartProps) {
  const { data, trend, firstVal, lastVal, minVal, maxVal } = useMemo(() => {
    const pts = snapshots
      .map((s) => ({ ts: s.timestamp, val: s[fuelKey] }))
      .filter((p): p is { ts: number; val: number } => p.val !== null);

    if (pts.length < 2) return { data: pts, trend: 0, firstVal: 0, lastVal: 0, minVal: 0, maxVal: 0 };

    const vals     = pts.map((p) => p.val);
    const minV     = Math.min(...vals);
    const maxV     = Math.max(...vals);
    const firstV   = pts[0].val;
    const lastV    = pts[pts.length - 1].val;

    return {
      data:     pts.map((p) => ({ ts: p.ts, val: p.val })),
      trend:    lastV - firstV,
      firstVal: firstV,
      lastVal:  lastV,
      minVal:   minV,
      maxVal:   maxV,
    };
  }, [snapshots, fuelKey]);

  const instId = useId();

  if (data.length < 2) {
    return (
      <div style={{ height: `${height}px`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "12px", color: "#64748B", textAlign: "center" }}>
          Sammle Daten… Komm morgen wieder für den Trend
        </p>
      </div>
    );
  }

  const gradId      = `grad-${fuelKey}-${instId}`;
  // Y-Achsen­bereich: kleinen Puffer um die Daten herum
  const valuePad    = (maxVal - minVal) * 0.25 || 0.005;
  const yDomain     = [
    parseFloat((minVal - valuePad).toFixed(3)),
    parseFloat((maxVal + valuePad).toFixed(3)),
  ];

  const trendColor  = trend < -0.005 ? "#22C55E" : trend > 0.005 ? "#EF4444" : "#F59E0B";
  const trendLabel  = trend < -0.005 ? "↓ Fallend" : trend > 0.005 ? "↑ Steigend" : "→ Stabil";

  return (
    <div style={{ position: "relative" }}>
      {/* Trend-Badge */}
      <div style={{
        position: "absolute", top: 0, right: 0, zIndex: 5,
        fontSize: "10px", fontWeight: 700, padding: "2px 8px",
        borderRadius: "6px",
        background: trend < -0.005 ? "rgba(34,197,94,0.12)"  : trend > 0.005 ? "rgba(239,68,68,0.12)"  : "rgba(245,158,11,0.12)",
        color:      trendColor,
        border: `1px solid ${trend < -0.005 ? "rgba(34,197,94,0.25)" : trend > 0.005 ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}`,
      }}>
        {trendLabel}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.25} />
              <stop offset="70%"  stopColor={color} stopOpacity={0.04} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Grid */}
          {showGrid && (
            <CartesianGrid
              strokeDasharray="0"
              stroke="#1E1E2E"
              vertical={false}
            />
          )}

          {/* Referenzlinie: Startpreis */}
          <ReferenceLine
            y={firstVal}
            stroke="#2A2A3C"
            strokeDasharray="4 4"
            strokeWidth={1}
          />

          <XAxis
            dataKey="ts"
            type="number"
            domain={["dataMin", "dataMax"]}
            hide={false}
            tick={false}
            axisLine={false}
            tickLine={false}
            height={18}
          />

          <YAxis
            domain={yDomain}
            width={38}
            tick={({ x, y, payload }) => (
              <text
                x={x}
                y={y}
                textAnchor="end"
                fontSize={9}
                fill="#475569"
                fontFamily="'JetBrains Mono', monospace"
              >
                {Number(payload.value).toFixed(3).replace(".", ",")}
              </text>
            )}
            axisLine={false}
            tickLine={false}
            tickCount={3}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: "#2A2A3C", strokeWidth: 1 }}
          />

          <Area
            type="monotone"         // ← Monotone Cubic Spline — kein Overshoot!
            dataKey="val"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradId})`}
            dot={(props) => <CustomDot {...props} data={data} color={color} />}
            activeDot={{
              r: 5,
              fill: color,
              strokeWidth: 0,
            }}
            isAnimationActive={true}
            animationDuration={600}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Zeitachse Text (rechts = Jetzt, links = Start) */}
      <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "42px", paddingRight: "12px", marginTop: "-2px" }}>
        <span style={{ fontSize: "9px", color: "#475569", fontFamily: "'Inter', sans-serif" }}>
          {new Intl.DateTimeFormat("de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(data[0].ts))}
        </span>
        <span style={{ fontSize: "9px", color: "#475569", fontFamily: "'Inter', sans-serif" }}>
          Jetzt · <strong style={{ color: color, fontFamily: "'JetBrains Mono', monospace" }}>{lastVal.toFixed(3).replace(".", ",")}€</strong>
        </span>
      </div>
    </div>
  );
}
