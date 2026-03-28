"use client";

import { X, Navigation, Map, Share2, Star, ExternalLink, TrendingDown, TrendingUp, Minus, Zap, Calculator, MapPin } from "lucide-react";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { Station } from "@/app/api/prices/route";
import type { PriceSnapshot } from "@/hooks/usePriceHistory";
import { shareStation } from "@/hooks/useFavorites";
import { getBestTimeAdvice } from "@/hooks/usePriceHistory";

// PriceChart dynamisch laden — verhindert Recharts SSR-Probleme
const PriceChart = dynamic(() => import("@/components/ui/PriceChart"), {
  ssr: false,
  loading: () => <div style={{ height: "80px", background: "#16161F", borderRadius: "10px" }} />,
});

interface StationSheetProps {
  station: Station | null;
  onClose: () => void;
  onToggleFavorite: (id: string, meta?: { name: string; brand?: string; address: string; e10?: number | false; e5?: number | false; diesel?: number | false }) => void;
  isFavorite: (id: string) => boolean;
  snapshots?: PriceSnapshot[];
  allPrices?: number[];           // Alle Preise in der Nähe für Vergleich
  activeFuelType?: "e10" | "e5" | "diesel";
}

// ─── Preis mit deutschem Superscript (2,23⁹) ─────────────────────────────────
function PriceTag({
  price, mainSize = 24, subSize = 14, color = "#F8FAFC",
}: {
  price: number | false;
  mainSize?: number;
  subSize?: number;
  color?: string;
}) {
  if (!price) return <span style={{ fontSize: mainSize, color: "#475569" }}>—</span>;
  const str = price.toFixed(3).replace(".", ","); // "2,239"
  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", color }}>
      <span style={{ fontSize: mainSize, fontWeight: 800, lineHeight: 1 }}>{str.slice(0, -1)}</span>
      <span style={{ fontSize: subSize, fontWeight: 700, verticalAlign: "super" }}>{str.slice(-1)}</span>
      <span style={{ fontSize: subSize, color: "rgba(255,255,255,0.5)", marginLeft: "1px" }}>€</span>
    </span>
  );
}

// ─── Preisfarbe: Günstig / Mittel / Teuer ─────────────────────────────────────
function getPriceColor(price: number | false, prices: number[]): string {
  if (!price || prices.length < 2) return "#F8FAFC";
  const sorted = [...prices].sort((a, b) => a - b);
  const p33 = sorted[Math.floor(sorted.length * 0.33)];
  const p66 = sorted[Math.floor(sorted.length * 0.66)];
  if (price <= p33) return "#22C55E";
  if (price <= p66) return "#F59E0B";
  return "#EF4444";
}

// ─── Differenz zum Durchschnitt ───────────────────────────────────────────────
function getDiffLabel(price: number | false, prices: number[]): string | null {
  if (!price || prices.length < 2) return null;
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const diff = price - avg;
  const ct = Math.round(diff * 100);
  if (Math.abs(ct) < 1) return null;
  return ct < 0 ? `${Math.abs(ct)} ct günstiger als Ø` : `${ct} ct teurer als Ø`;
}

const FUEL_META: Record<string, { label: string; icon: string }> = {
  e10: { label: "Super E10", icon: "e10" },
  e5:  { label: "Super E5",  icon: "e5" },
  diesel: { label: "Diesel", icon: "diesel" },
};

export default function StationSheet({
  station, onClose, onToggleFavorite, isFavorite,
  snapshots = [], allPrices = [], activeFuelType = "e10",
}: StationSheetProps) {
  const router  = useRouter();
  const sheetRef = useRef<HTMLDivElement>(null);
  const fav     = station ? isFavorite(station.id) : false;

  // ESC schließt Sheet
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Body-Scroll sperren
  useEffect(() => {
    if (station) { document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [station]);

  if (!station) return null;

  // Aktiver Preis dieser Station
  const activePrice = station[activeFuelType] as number | false;
  const activeColor = getPriceColor(activePrice, allPrices);
  const activeDiff  = getDiffLabel(activePrice, allPrices);
  const bestTime    = getBestTimeAdvice();

  // Kostenrechner: 50L-Tank
  const tankLiters = 50;
  const totalCost  = activePrice ? (activePrice * tankLiters).toFixed(2) : null;
  const maxPrice   = allPrices.length > 0 ? Math.max(...allPrices) : null;
  const savings    = activePrice && maxPrice ? ((maxPrice - activePrice) * tankLiters).toFixed(2) : null;

  // Maps URLs
  const mapsUrl  = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
  const appleUrl = `maps://maps.apple.com/?daddr=${station.lat},${station.lng}`;
  const isIOS    = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  const hasPriceHistory = snapshots.length >= 2;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "flex-end",
        animation: "sheetFadeIn 200ms ease",
      }}
    >
      {/* ── Sheet ── */}
      <div
        ref={sheetRef}
        style={{
          width: "100%", maxWidth: "640px", margin: "0 auto",
          background: "linear-gradient(180deg, #13131F 0%, #0E0E1A 100%)",
          borderRadius: "22px 22px 0 0",
          border: "1px solid #1E1E2E", borderBottom: "none",
          display: "flex", flexDirection: "column",
          maxHeight: "92dvh",
          animation: "sheetSlideUp 300ms cubic-bezier(0.32,0.72,0,1)",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.6), 0 -1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* ══ SCROLLBARER INHALT ══════════════════════════════════════════════ */}
        <div style={{ overflowY: "auto", WebkitOverflowScrolling: "touch" as never, flex: 1 }}>

          {/* Drag-Handle */}
          <div style={{ display: "flex", justifyContent: "center", paddingTop: "10px", paddingBottom: "6px" }}>
            <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#2A2A3C" }} />
          </div>

          {/* ── §1 STATION HEADER ──────────────────────────────────────────── */}
          <div style={{ padding: "8px 16px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Brand-Pill */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "6px",
                background: "rgba(255,255,255,0.04)", border: "1px solid #2A2A3C",
                borderRadius: "20px", padding: "3px 10px 3px 6px" }}>
                <div style={{ width: "22px", height: "22px", borderRadius: "6px",
                  background: "linear-gradient(135deg, #22C55E22, #3B82F622)",
                  border: "1px solid #2A2A3C", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "10px", fontWeight: 800, color: "#94A3B8" }}>
                  {(station.brand || station.name).charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {station.brand || "Tankstelle"}
                </span>
              </div>

              <h2 style={{ fontSize: "19px", fontWeight: 700, color: "#F8FAFC",
                fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.2, marginBottom: "4px" }}>
                {station.name || station.brand}
              </h2>
              <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "8px" }}>
                {station.street}, {station.place}
              </p>

              {/* Chips: Distanz + Status */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "#94A3B8", background: "#16161F",
                  border: "1px solid #2A2A3C", borderRadius: "6px", padding: "3px 8px" }}>
                  <MapPin size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} />{station.dist.toFixed(1)} km
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "5px",
                  fontSize: "12px", fontWeight: 600, padding: "3px 8px", borderRadius: "6px",
                  background: station.isOpen ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                  color: station.isOpen ? "#22C55E" : "#EF4444",
                  border: `1px solid ${station.isOpen ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                  {/* Pulsierender Dot */}
                  <span style={{ position: "relative", width: "7px", height: "7px", display: "inline-block" }}>
                    <span style={{ position: "absolute", inset: 0, borderRadius: "50%",
                      background: station.isOpen ? "#22C55E" : "#EF4444",
                      animation: station.isOpen ? "pulseDot 1.8s ease-in-out infinite" : "none" }} />
                  </span>
                  {station.isOpen ? "Geöffnet" : "Geschlossen"}
                </span>
              </div>
            </div>

            {/* Close Button */}
            <button onClick={onClose} style={{
              width: "44px", height: "44px", borderRadius: "12px", background: "#16161F",
              border: "1px solid #2A2A3C", display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer", flexShrink: 0, marginLeft: "12px" }}>
              <X size={18} color="#64748B" />
            </button>
          </div>

          {/* ── §2 PREISE ──────────────────────────────────────────────────── */}
          <div style={{ margin: "0 16px 16px", background: "#111118",
            border: "1px solid #1E1E2E", borderRadius: "16px", overflow: "hidden" }}>

            {/* Aktiver Kraftstoff — Hero-Preis */}
            <div style={{ padding: "16px", background: `linear-gradient(135deg, ${activeColor}12, ${activeColor}06)`,
              borderBottom: "1px solid #1E1E2E", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: "10px", fontWeight: 700, color: "#64748B",
                  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
                  {FUEL_META[activeFuelType]?.label ?? activeFuelType.toUpperCase()} · Ausgewählt
                </p>
                <PriceTag price={activePrice} mainSize={32} subSize={18} color={activeColor} />
              </div>
              <div style={{ textAlign: "right" }}>
                {activeDiff && (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px",
                    fontSize: "11px", fontWeight: 600, color: activeColor,
                    background: `${activeColor}15`, border: `1px solid ${activeColor}30`,
                    borderRadius: "6px", padding: "4px 8px" }}>
                    {activePrice && allPrices.length > 0 && activePrice <= Math.min(...allPrices) + 0.005
                      ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                    {activeDiff}
                  </div>
                )}
              </div>
            </div>

            {/* Alle Kraftstoffarten — Listenformat */}
            {(["e10", "e5", "diesel"] as const).filter((ft) => ft !== activeFuelType || true).map((ft, i, arr) => {
              const p     = station[ft] as number | false;
              const col   = getPriceColor(p, allPrices);
              const diff  = getDiffLabel(p, allPrices);
              const isActive = ft === activeFuelType;
              return (
                <div key={ft} style={{ padding: "12px 16px",
                  borderBottom: i < arr.length - 1 ? "1px solid #1E1E2E" : "none",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: isActive ? `${col}08` : "transparent" }}>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: isActive ? "#F8FAFC" : "#94A3B8", marginBottom: "2px" }}>
                      {FUEL_META[ft].label}
                    </p>
                    {diff && (
                      <p style={{ fontSize: "10px", color: col, fontWeight: 600 }}>{diff}</p>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {/* Farb-Indikator */}
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: col, flexShrink: 0 }} />
                    <PriceTag price={p} mainSize={20} subSize={12} color={p ? col : "#475569"} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── §3 KI-EMPFEHLUNG ───────────────────────────────────────────── */}
          <div style={{ margin: "0 16px 16px", padding: "14px",
            background: bestTime.recommendNow ? "rgba(34,197,94,0.06)" : "rgba(245,158,11,0.06)",
            border: `1px solid ${bestTime.recommendNow ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
            borderRadius: "14px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <div style={{ width: "34px", height: "34px", borderRadius: "10px", flexShrink: 0,
                background: bestTime.recommendNow ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={16} color={bestTime.recommendNow ? "#22C55E" : "#F59E0B"} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "13px", fontWeight: 700,
                  color: bestTime.recommendNow ? "#22C55E" : "#F59E0B", marginBottom: "3px" }}>
                  KI-Empfehlung
                </p>
                <p style={{ fontSize: "12px", color: "#94A3B8", lineHeight: 1.5 }}>
                  {bestTime.text}
                </p>
                <p style={{ fontSize: "11px", color: "#64748B", marginTop: "4px" }}>
                  {bestTime.weekdayTip}
                </p>
              </div>
            </div>
          </div>

          {/* ── §4 KOSTENRECHNER ───────────────────────────────────────────── */}
          {totalCost && (
            <div style={{ margin: "0 16px 16px", padding: "14px",
              background: "#111118", border: "1px solid #1E1E2E", borderRadius: "14px" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "10px", flexShrink: 0,
                  background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Calculator size={16} color="#3B82F6" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                    Vollkosten bei 50 Litern
                  </p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "22px",
                      fontWeight: 800, color: "#F8FAFC" }}>
                      {totalCost}€
                    </span>
                    {savings && Number(savings) > 0.10 && (
                      <span style={{ fontSize: "11px", color: "#22C55E", fontWeight: 600 }}>
                        ↓ {savings}€ gespart vs. teuerster
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "10px", color: "#475569", marginTop: "2px" }}>
                    {FUEL_META[activeFuelType]?.label} · Aktuelle Preise · ohne Garantie
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── §5 PREISENTWICKLUNG ────────────────────────────────────────── */}
          {hasPriceHistory && (
            <div style={{ margin: "0 16px 16px", padding: "14px",
              background: "#111118", border: "1px solid #1E1E2E", borderRadius: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                {activeColor === "#22C55E" ? (
                  <TrendingDown size={14} color="#22C55E" />
                ) : activeColor === "#EF4444" ? (
                  <TrendingUp size={14} color="#EF4444" />
                ) : (
                  <Minus size={14} color="#F59E0B" />
                )}
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#64748B",
                  textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Preisentwicklung · {snapshots.length} Messpunkte
                </p>
              </div>
              <PriceChart
                snapshots={snapshots}
                fuelKey={activeFuelType}
                color={activeColor}
                height={90}
                showGrid={true}
              />
            </div>
          )}

          {/* ── Externe Links ──────────────────────────────────────────────── */}
          <div style={{ margin: "0 16px 8px", display: "flex", gap: "8px" }}>
            <a href={`https://maps.google.com/?q=${station.lat},${station.lng}`} target="_blank" rel="noopener"
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                padding: "10px", borderRadius: "10px", background: "#16161F", border: "1px solid #2A2A3C",
                fontSize: "12px", fontWeight: 600, color: "#64748B", textDecoration: "none" }}>
              <ExternalLink size={13} color="#64748B" />
              Google Maps
            </a>
            <a href={`https://www.cleverdaten.de/tankstellen/`} target="_blank" rel="noopener"
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                padding: "10px", borderRadius: "10px", background: "#16161F", border: "1px solid #2A2A3C",
                fontSize: "12px", fontWeight: 600, color: "#64748B", textDecoration: "none" }}>
              <ExternalLink size={13} color="#64748B" />
              Preise melden
            </a>
          </div>

          {/* Spacer für fixed Footer */}
          <div style={{ height: "160px" }} />
        </div>

        {/* ══ FIXIERTER FOOTER MIT AKTIONEN ══════════════════════════════════ */}
        <div style={{
          position: "sticky", bottom: 0, background: "linear-gradient(180deg, transparent 0%, #0E0E1A 20%)",
          padding: "16px 16px",
          paddingBottom: `calc(16px + env(safe-area-inset-bottom, 8px))`,
        }}>
          {/* Navigieren — primärer CTA */}
          <button
            onClick={() => window.open(isIOS ? appleUrl : mapsUrl, "_blank")}
            style={{ width: "100%", padding: "15px", borderRadius: "14px", border: "none",
              background: "linear-gradient(135deg, #22C55E, #16A34A)",
              boxShadow: "0 4px 20px rgba(34,197,94,0.35)",
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", gap: "8px", marginBottom: "10px" }}>
            <Navigation size={18} color="#fff" />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "16px",
              fontWeight: 700, color: "#fff" }}>
              Navigieren starten
            </span>
            <ExternalLink size={14} color="rgba(255,255,255,0.6)" />
          </button>

          {/* Sekundäre Buttons — 3-Spaltig */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => {
                router.push(`/karte?highlight=${station.id}&lat=${station.lat}&lng=${station.lng}`);
                onClose();
              }}
              style={{ flex: 1, padding: "12px 6px", borderRadius: "12px",
                background: "#16161F", border: "1px solid #2A2A3C", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <Map size={17} color="#3B82F6" />
              <span style={{ fontSize: "10px", fontWeight: 600, color: "#64748B" }}>Zur Karte</span>
            </button>

            <button
              onClick={() => onToggleFavorite(station.id, {
                name: station.name,
                brand: station.brand,
                address: station.street,
                e10: station.e10,
                e5: station.e5,
                diesel: station.diesel,
              })}
              style={{ flex: 1, padding: "12px 6px", borderRadius: "12px",
                background: fav ? "rgba(245,158,11,0.08)" : "#16161F",
                border: `1px solid ${fav ? "rgba(245,158,11,0.3)" : "#2A2A3C"}`,
                cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <Star size={17} color={fav ? "#F59E0B" : "#64748B"} fill={fav ? "#F59E0B" : "none"} />
              <span style={{ fontSize: "10px", fontWeight: 600, color: fav ? "#F59E0B" : "#64748B" }}>
                {fav ? "Gespeichert" : "Speichern"}
              </span>
            </button>

            <button
              onClick={async () => {
                const price = station[activeFuelType] || station.e10 || station.e5 || station.diesel;
                if (!price) return;
                await shareStation({
                  stationName: station.brand || station.name,
                  price: price as number,
                  fuelType: FUEL_META[activeFuelType]?.label ?? activeFuelType.toUpperCase(),
                  address: station.street,
                  dist: station.dist,
                });
              }}
              style={{ flex: 1, padding: "12px 6px", borderRadius: "12px",
                background: "#16161F", border: "1px solid #2A2A3C", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <Share2 size={17} color="#64748B" />
              <span style={{ fontSize: "10px", fontWeight: 600, color: "#64748B" }}>Teilen</span>
            </button>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes sheetFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sheetSlideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}
