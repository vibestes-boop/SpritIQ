"use client";

import { X, Navigation, Map, Share2, Star, ExternalLink } from "lucide-react";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Station } from "@/app/api/prices/route";
import { shareStation } from "@/hooks/useFavorites";

interface StationSheetProps {
  station: Station | null;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

const PRICE_LABELS: Record<string, string> = { e10: "E10", e5: "E5", diesel: "Diesel" };

export default function StationSheet({ station, onClose, onToggleFavorite, isFavorite }: StationSheetProps) {
  const router = useRouter();
  const sheetRef = useRef<HTMLDivElement>(null);

  // Schließen bei Backdrop-Klick
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // ESC-Taste schließt Sheet
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Body-Scroll sperren während Sheet offen
  useEffect(() => {
    if (station) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [station]);

  if (!station) return null;

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
  const appleUrl = `maps://maps.apple.com/?daddr=${station.lat},${station.lng}`;
  const fav = isFavorite(station.id);

  // Navigieren: iOS → Apple Maps, sonst Google Maps
  const handleNavigate = () => {
    // Versuche Apple Maps erst (iOS), fallback zu Google Maps
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    window.open(isIOS ? appleUrl : mapsUrl, "_blank");
  };

  return (
    // Backdrop
    <div
      onClick={handleBackdrop}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 2000,
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-end",
        animation: "fadeIn 200ms ease",
      }}
    >
      {/* Sheet */}
      <div
        ref={sheetRef}
        style={{
          width: "100%",
          maxWidth: "640px",
          margin: "0 auto",
          background: "#111118",
          borderRadius: "20px 20px 0 0",
          border: "1px solid #1E1E2E",
          borderBottom: "none",
          padding: "0 0 env(safe-area-inset-bottom, 16px)",
          animation: "slideUp 280ms cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        {/* Drag-Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "12px", paddingBottom: "4px" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#2A2A3C" }} />
        </div>

        {/* Header */}
        <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "18px", fontWeight: 700, color: "#F8FAFC", fontFamily: "'Space Grotesk', sans-serif" }}>
              {station.brand || station.name}
            </p>
            <p style={{ fontSize: "13px", color: "#64748B", marginTop: "2px" }}>
              {station.street}, {station.place}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
              <span style={{ fontSize: "12px", color: "#94A3B8" }}>📍 {station.dist.toFixed(1)} km entfernt</span>
              <span style={{
                fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "5px",
                background: station.isOpen ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                color: station.isOpen ? "#22C55E" : "#EF4444",
                border: `1px solid ${station.isOpen ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
              }}>
                {station.isOpen ? "Geöffnet" : "Geschlossen"}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#16161F", border: "1px solid #2A2A3C", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <X size={15} color="#64748B" />
          </button>
        </div>

        {/* Alle Preise */}
        <div style={{ padding: "16px", display: "flex", gap: "8px" }}>
          {(["e10", "e5", "diesel"] as const).map((ft) => {
            const price = station[ft] as number | false;
            return (
              <div key={ft} style={{
                flex: 1, background: "#16161F", border: "1px solid #2A2A3C", borderRadius: "12px",
                padding: "10px 8px", textAlign: "center",
              }}>
                <p style={{ fontSize: "10px", color: "#64748B", fontWeight: 600, letterSpacing: "0.06em", marginBottom: "6px" }}>
                  {PRICE_LABELS[ft]}
                </p>
                {price ? (
                  <p style={{ fontSize: "16px", fontWeight: 700, color: "#F8FAFC", fontFamily: "'JetBrains Mono', monospace" }}>
                    {price.toFixed(3).replace(".", ",")}<span style={{ fontSize: "12px" }}>€</span>
                  </p>
                ) : (
                  <p style={{ fontSize: "16px", color: "#475569" }}>–</p>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ height: "1px", background: "#1E1E2E", margin: "0 16px" }} />

        {/* Action Buttons */}
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>

          {/* Navigieren — primärer CTA */}
          <button
            onClick={handleNavigate}
            style={{
              width: "100%", padding: "14px", borderRadius: "12px",
              background: "linear-gradient(135deg, #22C55E, #16A34A)",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            <Navigation size={18} color="#fff" />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "15px", fontWeight: 700, color: "#fff" }}>
              Navigieren
            </span>
            <ExternalLink size={14} color="rgba(255,255,255,0.7)" />
          </button>

          {/* Sekundäre Aktionen */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => { router.push("/karte"); onClose(); }}
              style={{
                flex: 1, padding: "12px 8px", borderRadius: "12px",
                background: "#16161F", border: "1px solid #2A2A3C",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}
            >
              <Map size={16} color="#3B82F6" />
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#94A3B8" }}>Zur Karte</span>
            </button>

            <button
              onClick={() => { onToggleFavorite(station.id); }}
              style={{
                flex: 1, padding: "12px 8px", borderRadius: "12px",
                background: fav ? "rgba(245,158,11,0.1)" : "#16161F",
                border: `1px solid ${fav ? "rgba(245,158,11,0.3)" : "#2A2A3C"}`,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}
            >
              <Star size={16} color={fav ? "#F59E0B" : "#64748B"} fill={fav ? "#F59E0B" : "none"} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: fav ? "#F59E0B" : "#94A3B8" }}>
                {fav ? "Favorit" : "Speichern"}
              </span>
            </button>

            <button
              onClick={async () => {
                const price = station.e10 || station.e5 || station.diesel;
                if (!price) return;
                await shareStation({
                  stationName: station.brand || station.name,
                  price: price as number,
                  fuelType: station.e10 ? "E10" : station.e5 ? "E5" : "Diesel",
                  address: station.street,
                  dist: station.dist,
                });
              }}
              style={{
                width: "48px", padding: "12px", borderRadius: "12px",
                background: "#16161F", border: "1px solid #2A2A3C",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Share2 size={16} color="#64748B" />
            </button>
          </div>
        </div>

        <div style={{ height: "8px" }} />
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>
  );
}
