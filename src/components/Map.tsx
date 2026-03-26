"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { X, Navigation, ChevronUp } from "lucide-react";
import PriceTag from "@/components/ui/PriceTag";
import Button from "@/components/ui/Button";
import { useGeolocation } from "@/hooks/useGeolocation";
import { usePrices, getPriceStatus, type FuelType } from "@/hooks/usePrices";
import type { Station } from "@/app/api/prices/route";

const STATUS_COLORS = {
  good:   "#22C55E",
  medium: "#F59E0B",
  bad:    "#EF4444",
};

const FUEL_TYPES: { key: FuelType; label: string }[] = [
  { key: "e10",    label: "E10"    },
  { key: "e5",     label: "E5"     },
  { key: "diesel", label: "Diesel" },
];

export default function MapClient() {
  const mapRef        = useRef<LeafletMap | null>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const markersRef    = useRef<unknown[]>([]);
  const [selected, setSelected]   = useState<Station | null>(null);
  const [fuelType, setFuelType]   = useState<FuelType>("e10");

  const geo = useGeolocation();
  const { stations, loading } = usePrices({
    lat: geo.lat,
    lng: geo.lng,
    fuelType,
    refreshInterval: 5 * 60 * 1000,
  });

  // ── Karte initialisieren ─────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let isMounted = true;

    import("leaflet").then((L) => {
      if (!isMounted || !containerRef.current || mapRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
        center:           [geo.lat, geo.lng],
        zoom:             13,
        zoomControl:      false,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains:  "abcd",
        maxZoom:     19,
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapRef.current = map;
    });

    return () => {
      isMounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── User-Standort Marker ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || geo.loading) return;
    import("leaflet").then((L) => {
      if (!mapRef.current) return;
      const userIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#3B82F6;border:3px solid #F8FAFC;box-shadow:0 0 12px rgba(59,130,246,0.6);"></div>`,
        className: "",
        iconSize:  [14, 14],
        iconAnchor:[7, 7],
      });
      L.marker([geo.lat, geo.lng], { icon: userIcon })
        .addTo(mapRef.current)
        .bindTooltip("Mein Standort", { permanent: false });
      mapRef.current.panTo([geo.lat, geo.lng], { animate: true });
    });
  }, [geo.lat, geo.lng, geo.loading]);

  // ── Tankstellen-Marker aktualisieren wenn Stationen oder FuelType ändert ─
  useEffect(() => {
    if (!mapRef.current || loading || !stations.length) return;

    import("leaflet").then((L) => {
      if (!mapRef.current) return;

      // Alte Marker entfernen
      markersRef.current.forEach((m) => (m as { remove: () => void }).remove());
      markersRef.current = [];

      const allPrices = stations
        .map((s) => s[fuelType] as number | false)
        .filter((p): p is number => typeof p === "number" && p > 0);

      stations.forEach((station) => {
        const price  = station[fuelType] as number | false;
        const status = getPriceStatus(price, allPrices);
        const color  = STATUS_COLORS[status];
        const label  = price ? price.toFixed(3).replace(".", ",") : "–";

        const svg = `
          <svg width="56" height="36" viewBox="0 0 56 36" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="56" height="28" rx="8" fill="${color}" opacity="0.95"/>
            <polygon points="24,28 32,28 28,36" fill="${color}" opacity="0.95"/>
            <text x="28" y="15" text-anchor="middle" dominant-baseline="middle"
                  font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#0A0A0F">
              ${label}€
            </text>
          </svg>`;

        const icon = L.divIcon({
          html:       svg,
          className:  "",
          iconSize:   [56, 36],
          iconAnchor: [28, 36],
        });

        const marker = L.marker([station.lat, station.lng], { icon }).addTo(mapRef.current!);
        marker.on("click", () => {
          setSelected(station);
          mapRef.current?.panTo([station.lat, station.lng], { animate: true });
        });

        markersRef.current.push(marker);
      });
    });
  }, [stations, fuelType, loading]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* ── Fuel-Toggle oben ── */}
      <div
        style={{
          position:       "absolute",
          top:            "12px",
          left:           "50%",
          transform:      "translateX(-50%)",
          zIndex:         999,
          display:        "flex",
          gap:            "4px",
          background:     "rgba(10,10,15,0.90)",
          backdropFilter: "blur(12px)",
          border:         "1px solid #1E1E2E",
          borderRadius:   "12px",
          padding:        "4px",
        }}
      >
        {FUEL_TYPES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setFuelType(key); setSelected(null); }}
            style={{
              padding:     "6px 16px",
              borderRadius:"8px",
              border:      "none",
              background:  fuelType === key ? "#22C55E" : "transparent",
              color:        fuelType === key ? "#0A0A0F" : "#64748B",
              fontFamily:  "'Space Grotesk', sans-serif",
              fontSize:    "13px",
              fontWeight:  600,
              cursor:      "pointer",
              transition:  "all 200ms ease",
              minWidth:    "52px",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── GPS-Status / Loading ── */}
      {(loading || !geo.loading) && (
        <div
          style={{
            position:       "absolute",
            top:            "64px",
            left:           "12px",
            background:     "rgba(17,17,24,0.9)",
            border:         "1px solid #1E1E2E",
            borderRadius:   "8px",
            padding:        "6px 10px",
            display:        "flex",
            alignItems:     "center",
            gap:            "6px",
            zIndex:         999,
            backdropFilter: "blur(8px)",
          }}
        >
          {loading ? (
            <>
              <div className="animate-spin" style={{ width: "8px", height: "8px", border: "2px solid #2A2A3C", borderTopColor: "#22C55E", borderRadius: "50%" }} />
              <span style={{ fontSize: "11px", color: "#64748B" }}>Preise laden...</span>
            </>
          ) : (
            <>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: geo.error ? "#F59E0B" : "#3B82F6" }} />
              <span style={{ fontSize: "11px", color: "#94A3B8" }}>
                {geo.error ? "München (Fallback)" : "GPS aktiv"}
              </span>
            </>
          )}
        </div>
      )}

      {/* ── Bottom Sheet ── */}
      {selected && (
        <div
          className="animate-slide-up"
          style={{
            position:     "absolute",
            bottom:       0,
            left:         0,
            right:        0,
            background:   "#111118",
            borderTop:    "1px solid #1E1E2E",
            borderRadius: "20px 20px 0 0",
            padding:      "20px 16px 100px",
            zIndex:       1000,
          }}
          role="dialog"
          aria-label={`Details: ${selected.name}`}
        >
          <div style={{ width: "36px", height: "4px", background: "#2A2A3C", borderRadius: "2px", margin: "0 auto 16px" }} />

          <button
            onClick={() => setSelected(null)}
            style={{
              position:       "absolute",
              top:            "16px",
              right:          "16px",
              width:          "32px",
              height:         "32px",
              borderRadius:   "8px",
              background:     "#16161F",
              border:         "1px solid #2A2A3C",
              cursor:         "pointer",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
            }}
            aria-label="Schließen"
          >
            <X size={16} color="#64748B" />
          </button>

          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", fontWeight: 700, color: "#F8FAFC", marginBottom: "2px" }}>
            {selected.brand || selected.name}
          </h3>
          <p style={{ fontSize: "12px", color: "#64748B", marginBottom: "4px" }}>
            {selected.street}, {selected.place}
          </p>
          <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "16px" }}>
            {selected.dist.toFixed(1)} km entfernt
            {!selected.isOpen && (
              <span style={{ color: "#EF4444", fontWeight: 600, marginLeft: "8px" }}>· Geschlossen</span>
            )}
          </p>

          {/* Alle 3 Preise */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            {([["e10", "E10"], ["e5", "E5"], ["diesel", "Diesel"]] as [FuelType, string][]).map(([key, label]) => {
              const p = selected[key] as number | false;
              return (
                <div
                  key={key}
                  style={{
                    flex:         1,
                    padding:      "10px",
                    background:   fuelType === key ? "rgba(34,197,94,0.08)" : "#16161F",
                    border:       `1px solid ${fuelType === key ? "rgba(34,197,94,0.25)" : "#2A2A3C"}`,
                    borderRadius: "10px",
                  }}
                >
                  {p ? (
                    <PriceTag price={p} fuelType={label as "E10" | "E5" | "Diesel"} size="sm" />
                  ) : (
                    <span style={{ fontSize: "12px", color: "#64748B" }}>{label}: –</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Button
              variant="primary"
              fullWidth
              leftIcon={<Navigation size={16} />}
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`, "_blank")}
            >
              Navigieren
            </Button>
            <Button variant="secondary" leftIcon={<ChevronUp size={16} />}>
              Details
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
