import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Ob die Card mit hover-Lift animiert werden soll */
  interactive?: boolean;
  /** Glassmorphism-Variante */
  variant?: "default" | "glass" | "flat";
  /** Status-Farbe (Glow-Effekt) */
  glow?: "accent" | "warn" | "bad" | "none";
}

export default function Card({
  children,
  interactive = false,
  variant = "default",
  glow = "none",
  className = "",
  style,
  ...props
}: CardProps) {
  const base: React.CSSProperties = {
    borderRadius: "16px",
    overflow: "hidden",
    transition: "all 200ms ease",
    cursor: interactive ? "pointer" : "default",
  };

  const variants: Record<string, React.CSSProperties> = {
    default: {
      background: "#111118",
      border: "1px solid #1E1E2E",
    },
    glass: {
      background: "rgba(17,17,24,0.7)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.06)",
    },
    flat: {
      background: "#16161F",
      border: "1px solid #2A2A3C",
    },
  };

  const glows: Record<string, string> = {
    accent: "0 0 20px rgba(34,197,94,0.15)",
    warn: "0 0 20px rgba(245,158,11,0.15)",
    bad: "0 0 20px rgba(239,68,68,0.15)",
    none: "none",
  };

  return (
    <div
      className={`${interactive ? "hover:-translate-y-0.5 active:scale-[0.99]" : ""} ${className}`}
      style={{
        ...base,
        ...variants[variant],
        boxShadow: glows[glow],
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
