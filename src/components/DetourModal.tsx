"use client";

import { useState } from "react";
import { X, Calculator, TrendingDown, TrendingUp, Minus } from "lucide-react";
import Button from "@/components/ui/Button";
import { calcDetour, type VehicleProfile } from "@/hooks/useVehicleProfile";

interface DetourModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: VehicleProfile;
  /** Preis der günstigen Tankstelle (€/L) */
  cheapPrice: number;
  /** Preis der nächsten Tankstelle (€/L) */
  nearPrice: number;
  /** Name der günstigen Tankstelle */
  cheapName?: string;
}

export default function DetourModal({
  isOpen,
  onClose,
  profile,
  cheapPrice,
  nearPrice,
  cheapName = "Günstige Tankstelle",
}: DetourModalProps) {
  const [detourKm, setDetourKm] = useState(3);

  if (!isOpen) return null;

  const priceDiff = nearPrice - cheapPrice;
  const result = calcDetour(profile, detourKm, priceDiff, nearPrice);

  const ResultIcon =
    result.worthIt ? TrendingDown :
    result.netSavings > 0 ? Minus :
    TrendingUp;

  const resultColor =
    result.worthIt ? "#22C55E" :
    result.netSavings > 0 ? "#F59E0B" :
    "#EF4444";

  return (
    <div
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         2000,
        display:        "flex",
        alignItems:     "flex-end",
        background:     "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        className="animate-slide-up w-full"
        style={{
          background:   "#111118",
          borderTop:    "1px solid #1E1E2E",
          borderRadius: "20px 20px 0 0",
          padding:      "24px 16px 40px",
          maxHeight:    "90dvh",
          overflowY:    "auto",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Umweg-Rechner"
      >
        {/* Handle + Header */}
        <div style={{ width: "36px", height: "4px", background: "#2A2A3C", borderRadius: "2px", margin: "0 auto 20px" }} />

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Calculator size={18} color="#3B82F6" />
            </div>
            <div>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "17px", fontWeight: 700, color: "#F8FAFC" }}>
                Umweg-Rechner
              </h2>
              <p style={{ fontSize: "12px", color: "#64748B" }}>Lohnt sich der Umweg?</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "#16161F", border: "1px solid #2A2A3C",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
          }} aria-label="Schließen">
            <X size={16} color="#64748B" />
          </button>
        </div>

        {/* Preis-Vergleich */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          <div style={{
            flex: 1, padding: "12px", background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.2)", borderRadius: "12px"
          }}>
            <p style={{ fontSize: "11px", color: "#64748B", marginBottom: "4px" }}>Günstig</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "20px", fontWeight: 700, color: "#22C55E" }}>
              {cheapPrice.toFixed(3).replace(".", ",")}€
            </p>
            <p style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>{cheapName}</p>
          </div>
          <div style={{
            flex: 1, padding: "12px", background: "#16161F",
            border: "1px solid #2A2A3C", borderRadius: "12px"
          }}>
            <p style={{ fontSize: "11px", color: "#64748B", marginBottom: "4px" }}>Nächste</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "20px", fontWeight: 700, color: "#F8FAFC" }}>
              {nearPrice.toFixed(3).replace(".", ",")}€
            </p>
            <p style={{ fontSize: "11px", color: "#22C55E", marginTop: "2px" }}>
              {((nearPrice - cheapPrice) * 100).toFixed(1)}ct teurer
            </p>
          </div>
        </div>

        {/* Umweg-Slider */}
        <div style={{ marginBottom: "24px" }}>
          <div className="flex items-center justify-between mb-3">
            <label style={{ fontSize: "14px", color: "#94A3B8", fontWeight: 500 }}>
              Umweg
            </label>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: "16px",
              fontWeight: 700, color: "#F8FAFC"
            }}>
              {detourKm} km
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={20}
            step={0.5}
            value={detourKm}
            onChange={(e) => setDetourKm(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "#22C55E", cursor: "pointer" }}
            aria-label="Umweg in km"
          />
          <div className="flex justify-between mt-1">
            {["0.5", "5", "10", "15", "20"].map((v) => (
              <span key={v} style={{ fontSize: "10px", color: "#64748B" }}>{v}km</span>
            ))}
          </div>
        </div>

        {/* Fahrzeugprofil Info */}
        <div style={{
          display: "flex", gap: "8px", marginBottom: "20px",
          padding: "10px 12px", background: "#16161F",
          border: "1px solid #2A2A3C", borderRadius: "10px"
        }}>
          <span style={{ fontSize: "12px", color: "#64748B" }}>🚗 {profile.name}</span>
          <span style={{ fontSize: "12px", color: "#64748B" }}>·</span>
          <span style={{ fontSize: "12px", color: "#64748B" }}>{profile.consumption}L/100km</span>
          <span style={{ fontSize: "12px", color: "#64748B" }}>·</span>
          <span style={{ fontSize: "12px", color: "#64748B" }}>{profile.tankSize}L Tank</span>
        </div>

        {/* Ergebnis */}
        <div style={{
          padding: "20px",
          background: `rgba(${result.worthIt ? "34,197,94" : result.netSavings > 0 ? "245,158,11" : "239,68,68"},0.08)`,
          border: `1px solid rgba(${result.worthIt ? "34,197,94" : result.netSavings > 0 ? "245,158,11" : "239,68,68"},0.2)`,
          borderRadius: "16px",
          marginBottom: "20px"
        }}>
          <div className="flex items-start gap-3">
            <div style={{
              width: "40px", height: "40px", borderRadius: "12px", flexShrink: 0,
              background: `rgba(${result.worthIt ? "34,197,94" : result.netSavings > 0 ? "245,158,11" : "239,68,68"},0.15)`,
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <ResultIcon size={20} color={resultColor} />
            </div>
            <div>
              <p style={{
                fontFamily: "'Space Grotesk', sans-serif", fontSize: "15px",
                fontWeight: 700, color: resultColor, marginBottom: "4px"
              }}>
                {result.worthIt ? "Lohnt sich!" : result.netSavings > 0 ? "Knapp" : "Lohnt nicht"}
              </p>
              <p style={{ fontSize: "13px", color: "#94A3B8", lineHeight: 1.5 }}>
                {result.explanation}
              </p>
            </div>
          </div>

          {/* Aufschlüsselung */}
          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <p style={{ fontSize: "11px", color: "#64748B", marginBottom: "2px" }}>Sparpotenzial</p>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "15px", fontWeight: 700, color: "#22C55E" }}>
                {result.savings.toFixed(2).replace(".", ",")}€
              </p>
            </div>
            <div style={{ width: "1px", background: "#2A2A3C" }} />
            <div style={{ flex: 1, textAlign: "center" }}>
              <p style={{ fontSize: "11px", color: "#64748B", marginBottom: "2px" }}>Umweg-Kosten</p>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "15px", fontWeight: 700, color: "#EF4444" }}>
                {result.detourCost.toFixed(2).replace(".", ",")}€
              </p>
            </div>
            <div style={{ width: "1px", background: "#2A2A3C" }} />
            <div style={{ flex: 1, textAlign: "center" }}>
              <p style={{ fontSize: "11px", color: "#64748B", marginBottom: "2px" }}>Netto</p>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "15px", fontWeight: 700, color: resultColor }}>
                {result.netSavings >= 0 ? "+" : ""}{result.netSavings.toFixed(2).replace(".", ",")}€
              </p>
            </div>
          </div>
        </div>

        <Button variant="primary" fullWidth onClick={onClose}>
          Verstanden
        </Button>
      </div>
    </div>
  );
}
