import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = "",
  style,
  ...props
}: ButtonProps) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
    fontWeight: 600,
    borderRadius: "12px",
    border: "none",
    cursor: disabled || loading ? "not-allowed" : "pointer",
    transition: "all 200ms ease",
    opacity: disabled || loading ? 0.5 : 1,
    width: fullWidth ? "100%" : undefined,
    whiteSpace: "nowrap",
  };

  const sizes = {
    sm: { fontSize: "13px", padding: "8px 16px", minHeight: "36px" },
    md: { fontSize: "15px", padding: "12px 24px", minHeight: "44px" },
    lg: { fontSize: "16px", padding: "14px 32px", minHeight: "52px" },
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: "#22C55E",
      color: "#0A0A0F",
    },
    secondary: {
      background: "transparent",
      color: "#F8FAFC",
      border: "1px solid #1E1E2E",
    },
    ghost: {
      background: "transparent",
      color: "#64748B",
      fontFamily: "'Inter', system-ui, sans-serif",
      fontWeight: 500,
    },
    danger: {
      background: "rgba(239,68,68,0.12)",
      color: "#EF4444",
      border: "1px solid rgba(239,68,68,0.25)",
    },
  };

  return (
    <button
      disabled={disabled || loading}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      className={className}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
