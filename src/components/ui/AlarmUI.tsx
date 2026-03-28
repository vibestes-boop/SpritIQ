"use client";

import { useEffect } from "react";
import { Bell, X, Fuel } from "lucide-react";
import type { PriceAlarm } from "@/hooks/useAlarm";

const FUEL_LABELS: Record<string, string> = {
  e10: "E10",
  e5: "E5",
  diesel: "Diesel",
};

interface AlarmToastProps {
  alarms: PriceAlarm[];
  onDismiss: (id: string) => void;
}

export function AlarmToast({ alarms, onDismiss }: AlarmToastProps) {
  // Auto-dismiss nach 8 Sekunden
  useEffect(() => {
    if (!alarms.length) return;
    const timers = alarms.map((a) =>
      setTimeout(() => onDismiss(a.id), 8000)
    );
    return () => timers.forEach(clearTimeout);
  }, [alarms, onDismiss]);

  if (!alarms.length) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        width: "calc(100% - 32px)",
        maxWidth: "400px",
        pointerEvents: "none",
      }}
    >
      {alarms.map((alarm) => (
        <div
          key={alarm.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            background: "rgba(34,197,94,0.15)",
            border: "1px solid rgba(34,197,94,0.4)",
            borderRadius: "14px",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(34,197,94,0.1)",
            pointerEvents: "all",
            animation: "slide-down 0.3s ease",
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "rgba(34,197,94,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Bell size={18} color="#22C55E" />
          </div>

          {/* Text */}
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#22C55E",
                marginBottom: "1px",
              }}
            >
              Preisalarm ausgelöst!
            </p>
            <p style={{ fontSize: "12px", color: "#94A3B8" }}>
              {FUEL_LABELS[alarm.fuelType]} unter{" "}
              <span style={{ color: "#F8FAFC", fontWeight: 600 }}>
                {alarm.threshold.toFixed(2).replace(".", ",")}€
              </span>
            </p>
          </div>

          {/* Dismiss */}
          <button
            onClick={() => onDismiss(alarm.id)}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Alarm schließen"
          >
            <X size={15} color="#64748B" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Alarm-Liste Item ────────────────────────────────────────────────────────
interface AlarmItemProps {
  alarm: PriceAlarm;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

export function AlarmItem({ alarm, onToggle, onRemove }: AlarmItemProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 14px",
        background: "#111118",
        border: "1px solid #1E1E2E",
        borderRadius: "12px",
      }}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "8px",
          background: alarm.enabled ? "rgba(34,197,94,0.1)" : "#16161F",
          border: `1px solid ${alarm.enabled ? "rgba(34,197,94,0.2)" : "#2A2A3C"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Fuel size={14} color={alarm.enabled ? "#22C55E" : "#475569"} />
      </div>

      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "#F8FAFC" }}>
          {FUEL_LABELS[alarm.fuelType]} unter{" "}
          {alarm.threshold.toFixed(2).replace(".", ",")}€
        </p>
        <p style={{ fontSize: "11px", color: "#475569" }}>
          {alarm.enabled ? "Aktiv" : "Pausiert"}
        </p>
      </div>

      {/* Toggle */}
      <button
        onClick={() => onToggle(alarm.id)}
        style={{
          width: "36px",
          height: "20px",
          borderRadius: "10px",
          background: alarm.enabled ? "#22C55E" : "#2A2A3C",
          border: "none",
          cursor: "pointer",
          position: "relative",
          transition: "background 200ms",
          flexShrink: 0,
        }}
        aria-label={alarm.enabled ? "Alarm deaktivieren" : "Alarm aktivieren"}
      >
        <div
          style={{
            width: "14px",
            height: "14px",
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: "3px",
            left: alarm.enabled ? "19px" : "3px",
            transition: "left 200ms",
          }}
        />
      </button>

      {/* Delete */}
      <button
        onClick={() => onRemove(alarm.id)}
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "8px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="Alarm löschen"
      >
        <X size={14} color="#475569" />
      </button>
    </div>
  );
}
