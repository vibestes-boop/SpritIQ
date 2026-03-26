import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export type PriceStatus = "good" | "medium" | "bad";

interface StatusBadgeProps {
  status: PriceStatus;
  /** Optionaler Kurztext — wird sonst automatisch gesetzt */
  label?: string;
  /** 1-Satz Begründung */
  reason?: string;
  /** Zeigt Trend-Pfeil-Icon */
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

const CONFIG: Record<
  PriceStatus,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    glow: string;
    Icon: typeof TrendingDown;
  }
> = {
  good: {
    label: "TANKEN EMPFOHLEN",
    color: "#22C55E",
    bg: "rgba(34,197,94,0.10)",
    border: "rgba(34,197,94,0.25)",
    glow: "0 0 24px rgba(34,197,94,0.20)",
    Icon: TrendingDown,
  },
  medium: {
    label: "ABWARTEN",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.25)",
    glow: "0 0 24px rgba(245,158,11,0.20)",
    Icon: Minus,
  },
  bad: {
    label: "NICHT TANKEN",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.25)",
    glow: "0 0 24px rgba(239,68,68,0.20)",
    Icon: TrendingUp,
  },
};

export default function StatusBadge({
  status,
  label,
  reason,
  showIcon = true,
  size = "md",
}: StatusBadgeProps) {
  const cfg = CONFIG[status];
  const { Icon } = cfg;
  const displayLabel = label ?? cfg.label;

  const sizes = {
    sm: { fontSize: "11px", iconSize: 14, padding: "6px 12px", gap: "6px" },
    md: { fontSize: "13px", iconSize: 16, padding: "10px 18px", gap: "8px" },
    lg: { fontSize: "16px", iconSize: 20, padding: "14px 24px", gap: "10px" },
  };

  const s = sizes[size];

  return (
    <div className="flex flex-col gap-2">
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: s.gap,
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          borderRadius: "9999px",
          padding: s.padding,
          boxShadow: cfg.glow,
        }}
      >
        {showIcon && (
          <Icon size={s.iconSize} color={cfg.color} strokeWidth={2.5} aria-hidden="true" />
        )}
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: s.fontSize,
            color: cfg.color,
            letterSpacing: "0.05em",
          }}
        >
          {displayLabel}
        </span>
      </div>
      {reason && (
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            color: "#94A3B8",
            lineHeight: 1.5,
          }}
        >
          {reason}
        </p>
      )}
    </div>
  );
}
