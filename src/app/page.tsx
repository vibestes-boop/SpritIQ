"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, Navigation, ChevronRight, Zap, RefreshCw, WifiOff, Calculator, Clock, Bell, Plus, Minus, Star, Share2 } from "lucide-react";
import BottomNav from "@/components/ui/BottomNav";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import PriceTag from "@/components/ui/PriceTag";
import Button from "@/components/ui/Button";
import DetourModal from "@/components/DetourModal";
import VoiceButton from "@/components/ui/VoiceButton";
import PriceChart from "@/components/ui/PriceChart";
import { AlarmToast, AlarmItem } from "@/components/ui/AlarmUI";
import { useGeolocation } from "@/hooks/useGeolocation";
import { usePrices, getPriceStatus, type FuelType } from "@/hooks/usePrices";
import { useVehicleProfile } from "@/hooks/useVehicleProfile";
import { usePriceHistory, getBestTimeAdvice } from "@/hooks/usePriceHistory";
import { useAlarm } from "@/hooks/useAlarm";
import { useFavorites, shareStation } from "@/hooks/useFavorites";
import type { Station } from "@/app/api/prices/route";
import type { VoiceCommand } from "@/hooks/useVoice";

const FUEL_TYPES: { key: FuelType; label: string }[] = [
  { key: "e10",    label: "E10"    },
  { key: "e5",     label: "E5"     },
  { key: "diesel", label: "Diesel" },
];

// ─── Skeleton ────────────────────────────────────────────────────────────────
function StationSkeleton() {
  return (
    <div style={{ padding: "14px 16px", background: "#111118", border: "1px solid #1E1E2E", borderRadius: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
      <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#16161F" }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ height: "14px", width: "60%", borderRadius: "4px", background: "#16161F" }} />
        <div style={{ height: "11px", width: "30%", borderRadius: "4px", background: "#16161F" }} />
      </div>
      <div style={{ height: "24px", width: "70px", borderRadius: "4px", background: "#16161F" }} />
    </div>
  );
}

// ─── Empfehlung ──────────────────────────────────────────────────────────────
function getRecommendation(stations: Station[], fuelType: FuelType) {
  if (!stations.length) return { status: "medium" as const, reason: "Preise werden geladen..." };
  const prices = stations.map((s) => s[fuelType] as number | false).filter((p): p is number => typeof p === "number" && p > 0);
  if (!prices.length) return { status: "medium" as const, reason: "Keine Preisdaten verfügbar." };
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const spread = max - min;
  if (min < avg * 0.985) return { status: "good" as const, reason: `Günstigstes Angebot ${((avg - min) * 100).toFixed(1)}ct unter Durchschnitt. Jetzt tanken!` };
  if (spread < 0.04)     return { status: "medium" as const, reason: `Alle Preise ähnlich (${(spread * 100).toFixed(1)}ct Spanne). Abwarten oder nächste Tankstelle wählen.` };
  return { status: "bad" as const, reason: `Preise steigen (${(spread * 100).toFixed(1)}ct Spanne). Besser morgen tanken.` };
}

// ─── Home Page ───────────────────────────────────────────────────────────────
export default function HomePage() {
  const [fuelType, setFuelType]         = useState<FuelType>("e10");
  const [sortMode, setSortMode]         = useState<"dist" | "price">("dist");
  const [detourStation, setDetourStation] = useState<Station | null>(null);
  const [showAlarmPanel, setShowAlarmPanel] = useState(false);
  const [alarmThreshold, setAlarmThreshold] = useState(1.70);

  const { profile }                           = useVehicleProfile();
  const { addSnapshot, getRecent, getTrend }  = usePriceHistory();
  const bestTime                              = getBestTimeAdvice();
  const { alarms, triggered, addAlarm, removeAlarm, toggleAlarm, checkAlarms, dismissTriggered } = useAlarm();
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Spracheingabe
  function handleVoiceCommand(cmd: VoiceCommand) {
    if (cmd.type === "FUEL_TYPE") setFuelType(cmd.value);
    if (cmd.type === "SORT")      setSortMode(cmd.by);
    if (cmd.type === "REFRESH")   refresh();
  }

  const geo = useGeolocation();
  const { stations, loading, error, source, refresh } = usePrices({
    lat: geo.lat, lng: geo.lng, fuelType, sortMode, refreshInterval: 5 * 60 * 1000,
  });

  const top3        = stations.slice(0, 3);
  const allPrices   = stations.map((s) => s[fuelType] as number | false).filter((p): p is number => typeof p === "number" && p > 0);
  const recommendation = getRecommendation(stations, fuelType);

  // Snapshot + Alarme prüfen
  useEffect(() => {
    if (!stations.length) return;
    const cheapest = stations[0];
    addSnapshot({ e10: cheapest.e10 || null, e5: cheapest.e5 || null, diesel: cheapest.diesel || null, stationId: cheapest.id });
    const prices: Record<FuelType, number | null> = { e10: null, e5: null, diesel: null };
    for (const s of stations) {
      for (const ft of ["e10", "e5", "diesel"] as FuelType[]) {
        const p = s[ft] as number | false;
        if (typeof p === "number" && p > 0) { if (prices[ft] === null || p < prices[ft]!) prices[ft] = p; }
      }
    }
    checkAlarms(prices);
  }, [stations, addSnapshot, checkAlarms]);

  const recentHistory = getRecent(48);
  const historyTrend  = getTrend(fuelType);

  return (
    <>
      {/* Alarm-Toasts */}
      <AlarmToast alarms={triggered} onDismiss={dismissTriggered} />

      <main className="min-h-dvh flex flex-col">
        {/* ── Header ── */}
        <header className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "22px", fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.02em" }}>SpritIQ</h1>
            <p style={{ fontSize: "12px", color: "#64748B", marginTop: "1px" }}>
              {loading ? "Lade Preise…" : error ? "Offline-Modus" : `${stations.length} Tankstellen`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {source === "demo" && (
              <span style={{ fontSize: "10px", color: "#F59E0B", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "6px", padding: "2px 8px", fontWeight: 600 }}>DEMO</span>
            )}
            <VoiceButton onCommand={handleVoiceCommand} size="sm" />
            {/* Bell/Alarm */}
            <button
              onClick={() => setShowAlarmPanel((v) => !v)}
              style={{ width: "36px", height: "36px", borderRadius: "10px", background: showAlarmPanel ? "rgba(245,158,11,0.12)" : "#111118", border: `1px solid ${showAlarmPanel ? "rgba(245,158,11,0.3)" : "#1E1E2E"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}
              aria-label="Preisalarme"
            >
              <Bell size={16} color={alarms.some(a => a.enabled) ? "#F59E0B" : "#64748B"} />
              {alarms.some(a => a.enabled) && (
                <div style={{ position: "absolute", top: "6px", right: "6px", width: "7px", height: "7px", borderRadius: "50%", background: "#F59E0B", border: "2px solid #0A0A0F" }} />
              )}
            </button>
            <button onClick={refresh} style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#111118", border: "1px solid #1E1E2E", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} aria-label="Preise aktualisieren">
              <RefreshCw size={16} color="#64748B" />
            </button>
            <button style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#111118", border: "1px solid #1E1E2E", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} aria-label="Standort">
              <MapPin size={16} color={geo.error ? "#EF4444" : "#64748B"} />
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col gap-4 px-4 py-2 animate-fade-in">

          {/* ── Preisalarm Panel ── */}
          {showAlarmPanel && (
            <Card variant="flat" style={{ padding: "16px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#F59E0B", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>🔔 Preisalarme</p>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", background: "#111118", border: "1px solid #2A2A3C", borderRadius: "10px", padding: "8px 12px" }}>
                  <span style={{ fontSize: "12px", color: "#64748B" }}>{fuelType.toUpperCase()} unter</span>
                  <button onClick={() => setAlarmThreshold(v => Math.max(0.50, +(v - 0.01).toFixed(2)))} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}><Minus size={14} /></button>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "15px", fontWeight: 700, color: "#F8FAFC", minWidth: "42px", textAlign: "center" }}>
                    {alarmThreshold.toFixed(2).replace(".", ",")}€
                  </span>
                  <button onClick={() => setAlarmThreshold(v => Math.min(3.00, +(v + 0.01).toFixed(2)))} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}><Plus size={14} /></button>
                </div>
                <Button size="sm" variant="primary" onClick={() => addAlarm(fuelType, alarmThreshold)}>+</Button>
              </div>
              {alarms.length === 0 ? (
                <p style={{ fontSize: "12px", color: "#475569", textAlign: "center", padding: "8px" }}>Noch keine Alarme — erstelle deinen ersten!</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {alarms.map((alarm) => (<AlarmItem key={alarm.id} alarm={alarm} onToggle={toggleAlarm} onRemove={removeAlarm} />))}
                </div>
              )}
            </Card>
          )}

          {/* ── KI-Empfehlung ── */}
          <Card
            variant="glass"
            glow={loading ? "none" : recommendation.status === "good" ? "accent" : recommendation.status === "bad" ? "bad" : "warn"}
            style={{ padding: "20px" }}
          >
            {error ? (
              <div className="flex items-center gap-3">
                <WifiOff size={20} color="#EF4444" />
                <div>
                  <p style={{ color: "#EF4444", fontWeight: 600, fontSize: "14px" }}>Verbindungsfehler</p>
                  <p style={{ color: "#64748B", fontSize: "12px" }}>{error}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={refresh}>Retry</Button>
              </div>
            ) : loading ? (
              <div className="flex flex-col gap-3">
                <div style={{ height: "32px", width: "220px", borderRadius: "9999px", background: "#16161F" }} />
                <div style={{ height: "13px", width: "80%", borderRadius: "4px", background: "#16161F" }} />
                <div className="flex gap-2 mt-1">
                  <div style={{ flex: 1, height: "44px", borderRadius: "12px", background: "#16161F" }} />
                  <div style={{ flex: 1, height: "44px", borderRadius: "12px", background: "#16161F" }} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <StatusBadge status={recommendation.status} reason={recommendation.reason} size="md" />
                <div className="flex gap-2 mt-1">
                  <Link href="/karte" className="flex-1">
                    <Button variant="primary" fullWidth leftIcon={<Navigation size={16} />}>Zur Karte</Button>
                  </Link>
                  <Link href="/briefing" className="flex-1">
                    <Button variant="secondary" fullWidth>KI-Briefing</Button>
                  </Link>
                </div>
              </div>
            )}
          </Card>

          {/* ── Beste Tankzeit + Chart ── */}
          <Card variant="flat" style={{ padding: "14px 16px" }}>
            <div className="flex items-start gap-3">
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0, background: `rgba(${bestTime.recommendNow ? "34,197,94" : "239,68,68"},0.1)`, border: `1px solid rgba(${bestTime.recommendNow ? "34,197,94" : "239,68,68"},0.2)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Clock size={16} color={bestTime.recommendNow ? "#22C55E" : "#EF4444"} />
              </div>
              <div className="flex-1">
                <p style={{ fontSize: "13px", fontWeight: 600, color: bestTime.color, marginBottom: "2px" }}>{bestTime.text}</p>
                <p style={{ fontSize: "11px", color: "#64748B" }}>{bestTime.weekdayTip}</p>
              </div>
            </div>
            {recentHistory.length >= 2 ? (
              <div style={{ marginTop: "12px" }}>
                <p style={{ fontSize: "10px", color: "#64748B", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "6px" }}>
                  {fuelType.toUpperCase()} Verlauf · {recentHistory.length} Messpunkte
                </p>
                <PriceChart snapshots={recentHistory} fuelKey={fuelType === "e5" ? "e5" : fuelType === "diesel" ? "diesel" : "e10"} color={historyTrend === "down" ? "#22C55E" : historyTrend === "up" ? "#EF4444" : "#F59E0B"} height={72} />
              </div>
            ) : (
              <p style={{ fontSize: "11px", color: "#475569", marginTop: "8px" }}>📊 Preisverlauf erscheint nach dem ersten Tankstopp-Check</p>
            )}
          </Card>

          {/* ── Kraftstoff-Toggle ── */}
          <div style={{ display: "flex", gap: "8px", background: "#111118", borderRadius: "14px", padding: "4px", border: "1px solid #1E1E2E" }}>
            {FUEL_TYPES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFuelType(key)}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "13px", transition: "all 200ms ease", background: fuelType === key ? "#22C55E" : "transparent", color: fuelType === key ? "#0A0A0F" : "#64748B" }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Sortierung ── */}
          <div style={{ display: "flex", gap: "8px" }}>
            {[{ key: "dist", label: "Entfernung" }, { key: "price", label: "Preis" }].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSortMode(key as "dist" | "price")}
                style={{ flex: 1, padding: "8px", borderRadius: "10px", border: `1px solid ${sortMode === key ? "#22C55E" : "#1E1E2E"}`, background: sortMode === key ? "rgba(34,197,94,0.08)" : "#111118", color: sortMode === key ? "#22C55E" : "#64748B", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 200ms" }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Preisübersicht (avg/min/max) ── */}
          {!loading && allPrices.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              {[
                { label: "Günstigster", val: Math.min(...allPrices), color: "#22C55E" },
                { label: "Durchschnitt", val: allPrices.reduce((a, b) => a + b, 0) / allPrices.length, color: "#F59E0B" },
                { label: "Teuerster",   val: Math.max(...allPrices), color: "#EF4444" },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background: "#111118", border: "1px solid #1E1E2E", borderRadius: "12px", padding: "10px 12px", textAlign: "center" }}>
                  <p style={{ fontSize: "10px", color: "#64748B", marginBottom: "4px" }}>{label}</p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "16px", fontWeight: 700, color }}>{val.toFixed(3).replace(".", ",")}€</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Stationsliste ── */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase" }}>Günstigste in der Nähe</p>
              <div className="flex gap-2">
                <span style={{ fontSize: "10px", color: "#475569" }}>Entfernung</span>
                <span style={{ fontSize: "10px", color: "#475569" }}>Alle</span>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col gap-2">{[0, 1, 2].map((i) => <StationSkeleton key={i} />)}</div>
            ) : top3.length === 0 ? (
              <Card variant="flat" style={{ padding: "20px", textAlign: "center" }}>
                <p style={{ color: "#64748B", fontSize: "14px" }}>Keine Tankstationen gefunden.</p>
              </Card>
            ) : (
              top3.map((station, idx) => {
                const price  = station[fuelType] as number | false;
                const status = price ? getPriceStatus(price, allPrices) : "medium";
                return (
                  <Card key={station.id} variant="flat" interactive style={{ padding: "14px 16px" }}>
                    <div className="flex items-center gap-3">
                      {/* Rang */}
                      <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: idx === 0 ? "rgba(34,197,94,0.12)" : "#16161F", border: `1px solid ${idx === 0 ? "rgba(34,197,94,0.25)" : "#2A2A3C"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: idx === 0 ? "#22C55E" : "#475569" }}>#{idx + 1}</span>
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "14px", fontWeight: 600, color: "#F8FAFC", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {station.brand || station.name}
                        </p>
                        <div className="flex items-center gap-2" style={{ marginTop: "2px" }}>
                          <span style={{ fontSize: "11px", color: "#64748B" }}>{station.street}</span>
                          <span style={{ fontSize: "11px", color: "#475569" }}>·</span>
                          <span style={{ fontSize: "11px", color: "#64748B" }}>{station.dist.toFixed(1)} km</span>
                          {!station.isOpen && (
                            <span style={{ fontSize: "10px", color: "#EF4444", fontWeight: 600, background: "rgba(239,68,68,0.1)", padding: "1px 6px", borderRadius: "4px" }}>Geschlossen</span>
                          )}
                        </div>
                      </div>
                      {/* Preis + Aktionen */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {price ? (
                          <PriceTag price={price} fuelType={fuelType === "e10" ? "E10" : fuelType === "e5" ? "E5" : "Diesel"} size="sm" />
                        ) : (
                          <span style={{ fontSize: "12px", color: "#64748B" }}>–</span>
                        )}
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: status === "good" ? "#22C55E" : status === "medium" ? "#F59E0B" : "#EF4444", flexShrink: 0 }} />

                        {/* Favorit */}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(station.id); }}
                          title={isFavorite(station.id) ? "Aus Favoriten entfernen" : "Als Favorit speichern"}
                          style={{ width: "28px", height: "28px", borderRadius: "8px", background: isFavorite(station.id) ? "rgba(245,158,11,0.12)" : "#16161F", border: `1px solid ${isFavorite(station.id) ? "rgba(245,158,11,0.3)" : "#2A2A3C"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 200ms" }}
                        >
                          <Star size={13} color={isFavorite(station.id) ? "#F59E0B" : "#475569"} fill={isFavorite(station.id) ? "#F59E0B" : "none"} />
                        </button>

                        {/* Teilen */}
                        {price && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const shared = await shareStation({ stationName: station.brand || station.name, price, fuelType: fuelType === "e10" ? "E10" : fuelType === "e5" ? "E5" : "Diesel", address: station.street, dist: station.dist });
                              if (shared && !navigator.share) { setCopiedId(station.id); setTimeout(() => setCopiedId(null), 2000); }
                            }}
                            title="Teilen"
                            style={{ width: "28px", height: "28px", borderRadius: "8px", background: copiedId === station.id ? "rgba(34,197,94,0.12)" : "#16161F", border: `1px solid ${copiedId === station.id ? "rgba(34,197,94,0.3)" : "#2A2A3C"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                          >
                            <Share2 size={13} color={copiedId === station.id ? "#22C55E" : "#475569"} />
                          </button>
                        )}

                        {idx > 0 && price && (
                          <button onClick={(e) => { e.stopPropagation(); setDetourStation(station); }} title="Umweg-Rechner" style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#16161F", border: "1px solid #2A2A3C", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                            <Calculator size={13} color="#64748B" />
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* ── Europa-Spot ── */}
          <Card variant="flat" style={{ padding: "14px 16px" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={16} color="#3B82F6" />
                <span style={{ fontSize: "13px", color: "#94A3B8" }}>Europa-Vergleich</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", color: "#22C55E", fontWeight: 700 }}>DE günstigster</p>
                  <p style={{ fontSize: "11px", color: "#64748B" }}>vs. AT +4ct · CH +18ct</p>
                </div>
                <ChevronRight size={16} color="#2A2A3C" />
              </div>
            </div>
          </Card>

          <div style={{ height: "8px" }} />
        </div>

        <BottomNav />
      </main>

      {/* Umweg-Rechner Modal */}
      {detourStation && top3[0] && (() => {
        const nearPrice  = detourStation[fuelType] as number | false;
        const cheapPrice = top3[0][fuelType] as number | false;
        if (!nearPrice || !cheapPrice) return null;
        return (
          <DetourModal
            isOpen={true}
            onClose={() => setDetourStation(null)}
            profile={profile}
            cheapPrice={cheapPrice}
            nearPrice={nearPrice}
            cheapName={top3[0].brand || top3[0].name}
          />
        );
      })()}
    </>
  );
}
