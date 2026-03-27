"use client";

import { useState } from "react";
import { Check, RotateCcw, Car, Fuel, Gauge, Star, Bell, X, Trash2 } from "lucide-react";
import BottomNav from "@/components/ui/BottomNav";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { AlarmItem } from "@/components/ui/AlarmUI";
import { useVehicleProfile, type VehicleProfile } from "@/hooks/useVehicleProfile";
import { useFavorites } from "@/hooks/useFavorites";
import { useAlarm } from "@/hooks/useAlarm";

const FUEL_OPTIONS: { key: VehicleProfile["fuelType"]; label: string; color: string }[] = [
  { key: "e10",    label: "E10",    color: "#22C55E" },
  { key: "e5",     label: "E5",     color: "#3B82F6" },
  { key: "diesel", label: "Diesel", color: "#F59E0B" },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "11px", fontWeight: 600, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px", paddingLeft: "4px" }}>
      {children}
    </p>
  );
}

export default function EinstellungenPage() {
  const { profile, setProfile, resetProfile } = useVehicleProfile();
  const { favorites, toggle: toggleFavorite } = useFavorites();
  const { alarms, removeAlarm, toggleAlarm } = useAlarm();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <main className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "22px", fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.02em" }}>
          Einstellungen
        </h1>
        <button onClick={resetProfile} style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", cursor: "pointer", color: "#64748B", fontSize: "12px", padding: "8px" }}>
          <RotateCcw size={14} />
          Zurücksetzen
        </button>
      </header>

      <div className="flex-1 flex flex-col gap-5 px-4 py-3 animate-fade-in">

        {/* ── Fahrzeugprofil ── */}
        <div>
          <SectionTitle>🚗 Fahrzeugprofil</SectionTitle>
          <Card style={{ padding: "20px" }}>
            <div className="flex flex-col gap-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Car size={14} color="#64748B" />
                  <label style={{ fontSize: "13px", color: "#94A3B8", fontWeight: 500 }}>Fahrzeugname</label>
                </div>
                <input type="text" value={profile.name} onChange={(e) => setProfile({ name: e.target.value })} placeholder="z.B. VW Golf, BMW 3er..."
                  style={{ width: "100%", padding: "11px 14px", background: "#16161F", border: "1px solid #2A2A3C", borderRadius: "10px", color: "#F8FAFC", fontSize: "15px", fontFamily: "'Inter', sans-serif", outline: "none" }}
                  onFocus={(e) => (e.target.style.borderColor = "#22C55E")} onBlur={(e) => (e.target.style.borderColor = "#2A2A3C")} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Fuel size={14} color="#64748B" />
                  <label style={{ fontSize: "13px", color: "#94A3B8", fontWeight: 500 }}>Kraftstoff</label>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {FUEL_OPTIONS.map(({ key, label, color }) => (
                    <button key={key} onClick={() => setProfile({ fuelType: key })}
                      style={{ flex: 1, padding: "10px 8px", borderRadius: "10px", border: `1px solid ${profile.fuelType === key ? color : "#2A2A3C"}`, cursor: "pointer", background: profile.fuelType === key ? `rgba(${key === "e10" ? "34,197,94" : key === "e5" ? "59,130,246" : "245,158,11"},0.12)` : "#16161F", color: profile.fuelType === key ? color : "#64748B", fontFamily: "'Space Grotesk', sans-serif", fontSize: "14px", fontWeight: 700 }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Gauge size={14} color="#64748B" />
                  <label style={{ fontSize: "13px", color: "#94A3B8", fontWeight: 500 }}>Verbrauch</label>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "14px", fontWeight: 700, color: "#F8FAFC", marginLeft: "auto" }}>{profile.consumption.toFixed(1)} L/100km</span>
                </div>
                <input type="range" min={3} max={20} step={0.5} value={profile.consumption} onChange={(e) => setProfile({ consumption: parseFloat(e.target.value) })} style={{ width: "100%", accentColor: "#22C55E", cursor: "pointer" }} />
                <div className="flex justify-between mt-1">{["3L", "8L", "12L", "16L", "20L"].map((v) => <span key={v} style={{ fontSize: "10px", color: "#64748B" }}>{v}</span>)}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Fuel size={14} color="#64748B" />
                  <label style={{ fontSize: "13px", color: "#94A3B8", fontWeight: 500 }}>Tankgröße</label>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "14px", fontWeight: 700, color: "#F8FAFC", marginLeft: "auto" }}>{profile.tankSize} Liter</span>
                </div>
                <input type="range" min={20} max={120} step={5} value={profile.tankSize} onChange={(e) => setProfile({ tankSize: parseInt(e.target.value) })} style={{ width: "100%", accentColor: "#22C55E", cursor: "pointer" }} />
                <div className="flex justify-between mt-1">{["20L", "40L", "60L", "80L", "120L"].map((v) => <span key={v} style={{ fontSize: "10px", color: "#64748B" }}>{v}</span>)}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Umweg-Vorschau ── */}
        <div>
          <SectionTitle>🧮 Umweg-Rechner Vorschau</SectionTitle>
          <Card variant="flat" style={{ padding: "14px 16px" }}>
            <div className="flex items-center justify-between">
              <p style={{ fontSize: "13px", color: "#94A3B8" }}>Bei 3km Umweg und 3ct Preisunterschied:</p>
              {(() => {
                const savings = profile.tankSize * 0.6 * 0.03;
                const cost = (3 / 100) * profile.consumption * 1.75;
                const net = savings - cost;
                return <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "14px", fontWeight: 700, color: net > 0 ? "#22C55E" : "#EF4444" }}>{net >= 0 ? "+" : ""}{net.toFixed(2).replace(".", ",")}€</span>;
              })()}
            </div>
          </Card>
        </div>

        <Button variant="primary" fullWidth size="lg" onClick={handleSave} leftIcon={saved ? <Check size={18} /> : undefined}>
          {saved ? "Gespeichert! ✓" : "Profil speichern"}
        </Button>

        {/* ── Favoriten ── */}
        <div>
          <SectionTitle>⭐ Favoriten ({favorites.size})</SectionTitle>
          {favorites.size === 0 ? (
            <Card variant="flat" style={{ padding: "20px", textAlign: "center" }}>
              <Star size={22} color="#2A2A3C" style={{ margin: "0 auto 8px" }} />
              <p style={{ fontSize: "13px", color: "#475569" }}>Noch keine Favoriten gespeichert</p>
              <p style={{ fontSize: "11px", color: "#374151", marginTop: "4px" }}>Tippe ⭐ auf einer Tankstelle um sie zu speichern</p>
            </Card>
          ) : (
            <Card variant="flat" style={{ padding: "12px 16px" }}>
              <div className="flex flex-col">
                {[...favorites].map((id, i) => (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderBottom: i < favorites.size - 1 ? "1px solid #1E1E2E" : "none" }}>
                    <Star size={14} color="#F59E0B" fill="#F59E0B" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: "11px", color: "#64748B", fontFamily: "monospace" }}>{id.slice(0, 20)}…</span>
                    <button onClick={() => toggleFavorite(id)} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", cursor: "pointer", padding: "4px 8px", display: "flex", alignItems: "center", gap: "4px", color: "#EF4444", fontSize: "11px" }}>
                      <X size={11} /> Entfernen
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ── Preisalarme ── */}
        <div>
          <SectionTitle>🔔 Preisalarme ({alarms.length})</SectionTitle>
          {alarms.length === 0 ? (
            <Card variant="flat" style={{ padding: "20px", textAlign: "center" }}>
              <Bell size={22} color="#2A2A3C" style={{ margin: "0 auto 8px" }} />
              <p style={{ fontSize: "13px", color: "#475569" }}>Noch keine Alarme erstellt</p>
              <p style={{ fontSize: "11px", color: "#374151", marginTop: "4px" }}>Tippe 🔔 auf der Startseite um einen Alarm zu erstellen</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {alarms.map((alarm) => (
                <AlarmItem key={alarm.id} alarm={alarm} onToggle={toggleAlarm} onRemove={removeAlarm} />
              ))}
            </div>
          )}
        </div>

        {/* ── App-Info ── */}
        <div>
          <SectionTitle>ℹ️ App Info</SectionTitle>
          <Card variant="flat" style={{ padding: "14px 16px" }}>
            <div className="flex flex-col gap-0">
              {[
                ["Version", "0.7.0 (Woche 7)"],
                ["Build", "Vercel Production"],
                ["URL", "sprit-iq.vercel.app"],
                ["Daten", "Demo-Modus"],
                ["KI", "Qwen 3.5 (DashScope)"],
                ["Platform", "Web + Android (Capacitor)"],
                ["Refresh", "5 Min automatisch"],
              ].map(([label, value], i, arr) => (
                <div key={label} className="flex justify-between items-center" style={{ padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid #111118" : "none" }}>
                  <span style={{ fontSize: "12px", color: "#64748B" }}>{label}</span>
                  <span style={{ fontSize: "12px", color: "#94A3B8" }}>{value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Daten löschen ── */}
        <div>
          <SectionTitle>⚠️ Daten zurücksetzen</SectionTitle>
          <Card variant="flat" style={{ padding: "14px 16px" }}>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: "13px", color: "#F8FAFC", fontWeight: 600 }}>Alle lokalen Daten löschen</p>
                <p style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>Preishistorie · Alarme · Favoriten</p>
              </div>
              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    ["spritiq_price_history", "spritiq_alarms", "spritiq_favorites", "spritiq_vehicle_profile"].forEach((k) => localStorage.removeItem(k));
                    window.location.reload();
                  }
                }}
                style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", color: "#EF4444", fontSize: "12px", fontWeight: 600, padding: "8px 12px", cursor: "pointer" }}
              >
                <Trash2 size={13} />
                Löschen
              </button>
            </div>
          </Card>
        </div>

        <div style={{ height: "8px" }} />
      </div>

      <BottomNav />
    </main>
  );
}
