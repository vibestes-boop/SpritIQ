interface PriceTagProps {
  /** Preis in Euro, z.B. 1.729 */
  price: number;
  /** Kraftstoff-Typ */
  fuelType?: "E5" | "E10" | "Diesel";
  /** Änderung in Cent (positiv = teurer, negativ = günstiger) */
  delta?: number;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function PriceTag({
  price,
  fuelType,
  delta,
  size = "md",
}: PriceTagProps) {
  const fontSizes = {
    sm: { price: "20px", cent: "12px", label: "10px", delta: "11px" },
    md: { price: "28px", cent: "16px", label: "11px", delta: "12px" },
    lg: { price: "40px", cent: "22px", label: "12px", delta: "13px" },
    xl: { price: "56px", cent: "28px", label: "13px", delta: "14px" },
  };

  const fs = fontSizes[size];

  // Format: "1,72" + "9" (Zehntel-Cent separat kleiner)
  const priceStr = price.toFixed(3).replace(".", ",");
  const mainPart = priceStr.slice(0, -1); // "1,72"
  const lastDigit = priceStr.slice(-1);   // "9"

  const deltaSign = delta !== undefined ? (delta > 0 ? "+" : delta < 0 ? "" : "±") : null;
  const deltaColor =
    delta === undefined ? "#64748B"
    : delta < 0 ? "#22C55E"
    : delta > 0 ? "#EF4444"
    : "#64748B";

  return (
    <div className="flex items-end gap-2">
      <div className="flex items-start">
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: fs.price,
            color: "#F8FAFC",
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          {mainPart}
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: fs.cent,
            color: "#94A3B8",
            lineHeight: 1,
            marginTop: "2px",
          }}
        >
          {lastDigit} €/L
        </span>
      </div>

      <div className="flex flex-col items-start gap-1 pb-0.5">
        {fuelType && (
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: fs.label,
              fontWeight: 600,
              color: "#64748B",
              background: "#16161F",
              border: "1px solid #2A2A3C",
              borderRadius: "4px",
              padding: "1px 6px",
              letterSpacing: "0.04em",
            }}
          >
            {fuelType}
          </span>
        )}
        {delta !== undefined && (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: fs.delta,
              fontWeight: 600,
              color: deltaColor,
            }}
          >
            {deltaSign}{Math.abs(delta)}ct
          </span>
        )}
      </div>
    </div>
  );
}
