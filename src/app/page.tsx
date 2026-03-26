"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Navigation, ChevronRight, Zap, RefreshCw, WifiOff, Calculator } from "lucide-react";
import BottomNav from "@/components/ui/BottomNav";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import PriceTag from "@/components/ui/PriceTag";
import Button from "@/components/ui/Button";
import DetourModal from "@/components/DetourModal";
import { useGeolocation } from "@/hooks/useGeolocation";
import { usePrices, getPriceStatus, type FuelType } from "@/hooks/usePrices";
import { useVehicleProfile } from "@/hooks/useVehicleProfile";
import type { Station } from "@/app/api/prices/route";

const FUEL_TYPES: { key: FuelType; label: string }[] = [
  { key: "e10",    label: "E10"    },
  { key: "e5",     label: "E5"     },
  { key: "diesel", label: "Diesel" },
];

// Skeleton-Karte für Loading State
function StationSkeleton() {
  return (
    <div
      style={{
        padding: "14px 16px",
        background: "#111118",
        border: "1px solid #1E1E2E",
        borderRadius: "16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#16161F" }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ height: "14px", width: "60%", borderRadius: "4px", background: "#16161F" }} />
        <div style={{ height: "11px", width: "30%", borderRadius: "4px", background: "#16161F" }} />
      </div>
      <div style={{ height: "24px", width: "70px", borderRadius: "4px", background: "#16161F" }} />
    </div>
  );
}

// Bestimmt KI-Empfehlung aus Preistrend
function getRecommendation(stations: Station[], fuelType: FuelType) {
  if (!stations.length) return { status: "medium" as const, reason: "Preise werden geladen..." };

  const prices = stations
    .map((s) => s[fuelType] as number | false)
    .filter((p): p is number => typeof p === "number" && p > 0);

  if (!prices.length) return { status: "medium" as const, reason: "Keine Preisdaten verfügbar." };

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const spread = max - min;

  if (min < avg * 0.985) {
    return {
      status: "good" as const,
      reason: `Günstigstes Angebot ${((avg - min) * 100).toFixed(1)}ct unter Durchschnitt. Jetzt tanken!`,
    };
  } else if (spread < 0.04) {
    return {
      status: "medium" as const,
      reason: `Alle Preise ähnlich (${(spread * 100).toFixed(1)}ct Spanne). Abwarten oder nächste Tankstelle wählen.`,
    };
  } else {
    return {
      status: "bad" as const,
      reason: `Preise steigen (${(spread * 100).toFixed(1)}ct Spanne). Besser morgen tanken.`,
    };
  }
}

export default function HomePage() {
  const [fuelType, setFuelType] = useState<FuelType>("e10");
  const [sortMode, setSortMode] = useState<"dist" | "price">("dist");
  const [detourStation, setDetourStation] = useState<Station | null>(null);
  const { profile } = useVehicleProfile();

  const geo = useGeolocation();
  const { stations, loading, error, source, refresh } = usePrices({
    lat: geo.lat,
    lng: geo.lng,
    fuelType,
    sortMode,
    refreshInterval: 5 * 60 * 1000,
  });

  const top3 = stations.slice(0, 3);
  const allPrices = stations
    .map((s) => s[fuelType] as number | false)
    .filter((p): p is number => typeof p === "number" && p > 0);
  const recommendation = getRecommendation(stations, fuelType);

  return (
    <main className="min-h-dvh flex flex-col">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "22px",
              fontWeight: 700,
              color: "#F8FAFC",
              letterSpacing: "-0.02em",
            }}
          >
            SpritIQ
          </h1>
          <p style={{ fontSize: "12px", color: "#64748B" }}>
            {geo.loading
              ? "Standort wird ermittelt..."
              : geo.error
              ? "München (Standard)"
              : `${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {source === "demo" && (
            <span
              style={{
                fontSize: "10px",
                color: "#F59E0B",
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: "6px",
                padding: "2px 8px",
                fontWeight: 600,
              }}
            >
              DEMO
            </span>
          )}
          <button
            onClick={refresh}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#111118",
              border: "1px solid #1E1E2E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            aria-label="Preise aktualisieren"
          >
            <RefreshCw size={16} color="#64748B" />
          </button>
          <button
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#111118",
              border: "1px solid #1E1E2E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            aria-label="Standort"
          >
            <MapPin size={16} color={geo.error ? "#EF4444" : "#64748B"} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col gap-4 px-4 py-2 animate-fade-in">

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
              <StatusBadge
                status={recommendation.status}
                reason={recommendation.reason}
                size="md"
              />
              <div className="flex gap-2 mt-1">
                <Link href="/karte" className="flex-1">
                  <Button variant="primary" fullWidth leftIcon={<Navigation size={16} />}>
                    Zur Karte
                  </Button>
                </Link>
                <Link href="/briefing" className="flex-1">
                  <Button variant="secondary" fullWidth>
                    KI-Briefing
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Card>

        {/* ── Kraftstoff-Toggle ── */}
        <div
          style={{
            display: "flex",
            background: "#111118",
            border: "1px solid #1E1E2E",
            borderRadius: "10px",
            padding: "4px",
            gap: "2px",
          }}
        >
          {FUEL_TYPES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFuelType(key)}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "8px",
                border: "none",
                background: fuelType === key ? "#22C55E" : "transparent",
                color: fuelType === key ? "#0A0A0F" : "#64748B",
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 200ms ease",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Top 3 Tankstellen ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "15px",
                fontWeight: 600,
                color: "#94A3B8",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Günstigste in der Nähe
            </h2>
            <div className="flex items-center gap-2">
              {/* Sort Toggle */}
              <button
                onClick={() => setSortMode(sortMode === "dist" ? "price" : "dist")}
                style={{
                  fontSize: "11px",
                  color: "#64748B",
                  background: "#16161F",
                  border: "1px solid #2A2A3C",
                  borderRadius: "6px",
                  padding: "3px 8px",
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  transition: "all 200ms ease",
                }}
              >
                {sortMode === "dist" ? "📍 Entfernung" : "💰 Preis"}
              </button>
              <Link
                href="/karte"
                style={{
                  fontSize: "13px",
                  color: "#22C55E",
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                  cursor: "pointer",
                }}
              >
                Alle <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {loading
              ? [0, 1, 2].map((i) => <StationSkeleton key={i} />)
              : top3.map((station, idx) => {
                  const price = station[fuelType] as number | false;
                  const status = getPriceStatus(price, allPrices);
                  return (
                    <Card key={station.id} interactive style={{ padding: "14px 16px" }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Rang */}
                          <div
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "8px",
                              background: idx === 0 ? "rgba(34,197,94,0.12)" : "#16161F",
                              border: `1px solid ${idx === 0 ? "rgba(34,197,94,0.25)" : "#2A2A3C"}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: idx === 0 ? "#22C55E" : "#64748B",
                              }}
                            >
                              {idx + 1}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <p
                              style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                fontSize: "14px",
                                fontWeight: 600,
                                color: "#F8FAFC",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {station.brand || station.name}
                            </p>
                            <div className="flex items-center gap-2">
                              <MapPin size={11} color="#64748B" />
                              <span style={{ fontSize: "11px", color: "#64748B" }}>
                                {station.dist.toFixed(1)} km
                              </span>
                              {!station.isOpen && (
                                <span
                                  style={{
                                    fontSize: "10px",
                                    color: "#EF4444",
                                    fontWeight: 600,
                                    background: "rgba(239,68,68,0.1)",
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  Geschlossen
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Preis rechts */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {price ? (
                            <PriceTag
                              price={price}
                              fuelType={fuelType === "e10" ? "E10" : fuelType === "e5" ? "E5" : "Diesel"}
                              size="sm"
                            />
                          ) : (
                            <span style={{ fontSize: "12px", color: "#64748B" }}>–</span>
                          )}
                          <div
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              background:
                                status === "good" ? "#22C55E" :
                                status === "medium" ? "#F59E0B" : "#EF4444",
                              flexShrink: 0,
                            }}
                          />
                          {/* Umweg-Rechner Button */}
                          {idx > 0 && price && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setDetourStation(station); }}
                              title="Umweg-Rechner"
                              style={{
                                width: "28px", height: "28px",
                                borderRadius: "8px",
                                background: "#16161F",
                                border: "1px solid #2A2A3C",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                cursor: "pointer", flexShrink: 0,
                              }}
                            >
                              <Calculator size={13} color="#64748B" />
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
          </div>
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
                <p
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "13px",
                    color: "#22C55E",
                    fontWeight: 700,
                  }}
                >
                  DE günstigster
                </p>
                <p style={{ fontSize: "11px", color: "#64748B" }}>vs. AT +4ct · CH +18ct</p>
              </div>
              <ChevronRight size={16} color="#2A2A3C" />
            </div>
          </div>
        </Card>

        <div style={{ height: "8px" }} />
      </div>

      <BottomNav />

      {/* Umweg-Rechner Modal */}
      {detourStation && top3[0] && (() => {
        const nearPrice = detourStation[fuelType] as number | false;
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
    </main>
  );
}
