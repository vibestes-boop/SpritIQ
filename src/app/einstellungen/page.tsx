"use client";

import { useState } from "react";
import { Check, RotateCcw, Car, Fuel, Gauge } from "lucide-react";
import BottomNav from "@/components/ui/BottomNav";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useVehicleProfile, type VehicleProfile } from "@/hooks/useVehicleProfile";

const FUEL_OPTIONS: { key: VehicleProfile["fuelType"]; label: string; color: string }[] = [
  { key: "e10",    label: "E10",    color: "#22C55E" },
  { key: "e5",     label: "E5",     color: "#3B82F6" },
  { key: "diesel", label: "Diesel", color: "#F59E0B" },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: "11px",
      fontWeight: 600,
      color: "#64748B",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      marginBottom: "8px",
      paddingLeft: "4px",
    }}>
      {children}
    </p>
  );
}

export default function EinstellungenPage() {
  const { profile, setProfile, resetProfile } = useVehicleProfile();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <main className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "22px", fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.02em"
        }}>
          Einstellungen
        </h1>
        <button
          onClick={resetProfile}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "transparent", border: "none", cursor: "pointer",
            color: "#64748B", fontSize: "12px", padding: "8px"
          }}
        >
          <RotateCcw size={14} />
          Zurücksetzen
        </button>
      </header>

      <div className="flex-1 flex flex-col gap-5 px-4 py-3 animate-fade-in">

        {/* ── Fahrzeugprofil ── */}
        <div>
          <SectionTitle>Fahrzeugprofil</SectionTitle>
          <Card style={{ padding: "20px" }}>
            <div className="flex flex-col gap-5">

              {/* Fahrzeugname */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Car size={14} color="#64748B" />
                  <label style={{ fontSize: "13px", color: "#94A3B8", fontWeight: 500 }}>
                    Fahrzeugname
                  </label>
                </div>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ name: e.target.value })}
                  placeholder="z.B. VW Golf, BMW 3er..."
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    background: "#16161F",
                    border: "1px solid #2A2A3C",
                    borderRadius: "10px",
                    color: "#F8FAFC",
                    fontSize: "15px",
                    fontFamily: "'Inter', sans-serif",
                    outline: "none",
                    transition: "border-color 200ms ease",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#22C55E")}
                  onBlur={(e) => (e.target.style.borderColor = "#2A2A3C")}
                />
              </div>

              {/* Kraftstoff-Typ */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Fuel size={14} color="#64748B" />
                  <label style={{ fontSize: "13px", color: "#94A3B8", fontWeight: 500 }}>
                    Kraftstoff
                  </label>
                </div>
                <div style={{
                  display: "flex", gap: "8px",
                }}>
                  {FUEL_OPTIONS.map(({ key, label, color }) => (
                    <button
                      key={key}
                      onClick={() => setProfile({ fuelType: key })}
                      style={{
                        flex: 1, padding: "10px 8px",
                        borderRadius: "10px", border: "none", cursor: "pointer",
                        background: profile.fuelType === key
                          ? `rgba(${key === "e10" ? "34,197,94" : key === "e5" ? "59,130,246" : "245,158,11"},0.12)`
                          : "#16161F",
                        borderWidth: "1px", borderStyle: "solid",
                        borderColor: profile.fuelType === key ? color : "#2A2A3C",
                        color: profile.fuelType === key ? color : "#64748B",
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: "14px", fontWeight: 700,
                        transition: "all 200ms ease",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Verbrauch */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Gauge size={14} color="#64748B" />
                  <label style={{ fontSize: "13px", color: "#94A3B8", fontWeight: 500 }}>
                    Verbrauch
                  </label>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "14px", fontWeight: 700, color: "#F8FAFC", marginLeft: "auto"
                  }}>
                    {profile.consumption.toFixed(1)} L/100km
                  </span>
                </div>
                <input
                  type="range" min={3} max={20} step={0.5}
                  value={profile.consumption}
                  onChange={(e) => setProfile({ consumption: parseFloat(e.target.value) })}
                  style={{ width: "100%", accentColor: "#22C55E", cursor: "pointer" }}
                  aria-label="Verbrauch in Litern pro 100km"
                />
                <div className="flex justify-between mt-1">
                  {["3L", "8L", "12L", "16L", "20L"].map((v) => (
                    <span key={v} style={{ fontSize: "10px", color: "#64748B" }}>{v}</span>
                  ))}
                </div>
              </div>

              {/* Tankgröße */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Fuel size={14} color="#64748B" />
                  <label style={{ fontSize: "13px", color: "#94A3B8", fontWeight: 500 }}>
                    Tankgröße
                  </label>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "14px", fontWeight: 700, color: "#F8FAFC", marginLeft: "auto"
                  }}>
                    {profile.tankSize} Liter
                  </span>
                </div>
                <input
                  type="range" min={20} max={120} step={5}
                  value={profile.tankSize}
                  onChange={(e) => setProfile({ tankSize: parseInt(e.target.value) })}
                  style={{ width: "100%", accentColor: "#22C55E", cursor: "pointer" }}
                  aria-label="Tankgröße in Litern"
                />
                <div className="flex justify-between mt-1">
                  {["20L", "40L", "60L", "80L", "120L"].map((v) => (
                    <span key={v} style={{ fontSize: "10px", color: "#64748B" }}>{v}</span>
                  ))}
                </div>
              </div>

            </div>
          </Card>
        </div>

        {/* ── Zusammenfassung ── */}
        <div>
          <SectionTitle>Vorschau Umweg-Rechner</SectionTitle>
          <Card variant="flat" style={{ padding: "14px 16px" }}>
            <div className="flex items-center justify-between">
              <p style={{ fontSize: "13px", color: "#94A3B8" }}>
                Bei 3km Umweg und 3ct Preisunterschied:
              </p>
              <div>
                {(() => {
                  const savings = profile.tankSize * 0.6 * 0.03;
                  const cost = (3 / 100) * profile.consumption * 1.75;
                  const net = savings - cost;
                  return (
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "14px", fontWeight: 700,
                      color: net > 0 ? "#22C55E" : "#EF4444"
                    }}>
                      {net >= 0 ? "+" : ""}{net.toFixed(2).replace(".", ",")}€
                    </span>
                  );
                })()}
              </div>
            </div>
          </Card>
        </div>

        {/* ── Speichern ── */}
        <Button
          variant="primary"
          fullWidth
          size="lg"
          onClick={handleSave}
          leftIcon={saved ? <Check size={18} /> : undefined}
        >
          {saved ? "Gespeichert!" : "Speichern"}
        </Button>

        {/* ── App-Info ── */}
        <div>
          <SectionTitle>App</SectionTitle>
          <Card variant="flat" style={{ padding: "14px 16px" }}>
            <div className="flex flex-col gap-2">
              {[
                ["Version", "0.1.0 (Woche 3)"],
                ["Daten", "Demo-Modus (Tankerkönig API ausstehend)"],
                ["Refresh", "Alle 5 Minuten"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span style={{ fontSize: "13px", color: "#64748B" }}>{label}</span>
                  <span style={{ fontSize: "13px", color: "#94A3B8" }}>{value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div style={{ height: "8px" }} />
      </div>

      <BottomNav />
    </main>
  );
}
