"use client";

import "leaflet/dist/leaflet.css"; // MUSS statisch importiert werden — dynamischer Import funktioniert nicht
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { X, Navigation, ChevronUp } from "lucide-react";
import PriceTag from "@/components/ui/PriceTag";
import Button from "@/components/ui/Button";
import { useGeolocation } from "@/hooks/useGeolocation";
import { usePrices, getPriceStatus, type FuelType } from "@/hooks/usePrices";
import type { Station } from "@/app/api/prices/route";

const STATUS_COLORS = {
  good: "#22C55E",
  medium: "#F59E0B",
  bad: "#EF4444",
};

const FUEL_TYPES: { key: FuelType; label: string }[] = [
  { key: "e10", label: "E10" },
  { key: "e5", label: "E5" },
  { key: "diesel", label: "Diesel" },
];

export default function MapClient() {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<unknown[]>([]);
  const [selected, setSelected] = useState<Station | null>(null);
  const [fuelType, setFuelType] = useState<FuelType>("e10");
  const [mapMoved, setMapMoved] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  // Zoom-Tier statt raw zoom: Marker werden nur neu gerendert wenn Tier-Grenze überschritten wird
  // 0 = Übersicht (≤11), 1 = Stadtteil (12-13), 2 = Detail (≥14)
  const [zoomTier, setZoomTier] = useState(1);

  const geo = useGeolocation();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Suchkoordinaten: mapCenter (wenn Karte bewegt) oder GPS
  const searchLat = mapCenter?.lat ?? geo.lat ?? 48.1374;
  const searchLng = mapCenter?.lng ?? geo.lng ?? 11.5755;
  const { stations, loading, refresh } = usePrices({
    lat: searchLat,
    lng: searchLng,
    fuelType,
    radius: 25, // 25km Radius — maximal bei Tankerkönig, damit Marker beim Panning sichtbar bleiben
    refreshInterval: 5 * 60 * 1000,
  });

  // Karte: GPS automatisch anfragen wenn noch nicht entschieden
  useEffect(() => {
    if (geo.permission === "waiting") {
      geo.requestLocation();
    }
  }, [geo.permission, geo.requestLocation]);

  // ── Karte initialisieren ─────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let isMounted = true;

    import("leaflet").then((L) => {
      if (!isMounted || !containerRef.current || mapRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
        center: [geo.lat ?? 48.1374, geo.lng ?? 11.5755],
        zoom: 13,
        zoomControl: false,
        attributionControl: true,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        },
      ).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapRef.current = map;

      // Beim Bewegen: mapCenter mit 800ms Debounce aktualisieren
      map.on("moveend", () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          const center = map.getCenter();
          setMapCenter({ lat: center.lat, lng: center.lng });
          setMapMoved(true);
        }, 800);
      });

      // Zoom-Tier tracken: 0=Übersicht, 1=Stadtteil, 2=Detail
      // Marker-Effekt läuft nur wenn Tier-Grenze überschritten — kein Flicker bei jedem Zoom-Step
      map.on("zoomend", () => {
        const z = map.getZoom();
        const tier = z >= 14 ? 2 : z >= 12 ? 1 : 0;
        setZoomTier(tier);
      });

      // ResizeObserver: invalidateSize bei Container-Größenänderung
      const ro = new ResizeObserver(() => map.invalidateSize());
      if (containerRef.current) ro.observe(containerRef.current);

      // Sofortiger invalidateSize + Fallback nach 500ms
      map.invalidateSize();
      setTimeout(() => {
        if (isMounted) map.invalidateSize();
      }, 500);

      return () => ro.disconnect();
    });

    return () => {
      isMounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── User-Standort Marker (nur wenn echtes GPS vorhanden) ─────────────────
  useEffect(() => {
    if (!mapRef.current || geo.loading || !geo.lat || !geo.lng) return; // Kein Fallback-Marker
    const userLat = geo.lat;
    const userLng = geo.lng;
    import("leaflet").then((L) => {
      if (!mapRef.current) return;
      const userIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#3B82F6;border:3px solid #F8FAFC;box-shadow:0 0 12px rgba(59,130,246,0.6);"></div>`,
        className: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([userLat, userLng], { icon: userIcon })
        .addTo(mapRef.current)
        .bindTooltip("Mein Standort", { permanent: false });
      mapRef.current.panTo([userLat, userLng], { animate: true });
    });
  }, [geo.lat, geo.lng, geo.loading]);

  // ── Tankstellen-Marker: Zoom-basiertes Clustering (Tier-basiert, kein Flicker) ──
  useEffect(() => {
    if (!mapRef.current || loading || !stations.length) return;

    import("leaflet").then((L) => {
      if (!mapRef.current) return;

      markersRef.current.forEach((m) => (m as { remove: () => void }).remove());
      markersRef.current = [];

      // ── Clustering mit Count: gibt {station, count}[] zurück ──────────────────
      // Tier 0 (Übersicht): ~8km Raster → günstigste pro Zone
      // Tier 1 (Stadtteil): ~3km Raster → reduzierte Dichte
      // Tier 2 (Detail):    alle Stationen anzeigen
      function clusterStations(all: Station[]): { station: Station; count: number }[] {
        if (zoomTier === 2) return all.map((s) => ({ station: s, count: 1 }));
        const gridSize = zoomTier === 0 ? 0.08 : 0.035;
        const cells = new Map<string, { station: Station; count: number }>();
        for (const s of all) {
          const key = `${Math.floor(s.lat / gridSize)}_${Math.floor(s.lng / gridSize)}`;
          const existing = cells.get(key);
          if (!existing) {
            cells.set(key, { station: s, count: 1 });
          } else {
            existing.count++;
            // Günstigste Station pro Zelle behalten
            const newP = s[fuelType] as number | false;
            const oldP = existing.station[fuelType] as number | false;
            if (newP && (!oldP || (newP as number) < (oldP as number))) {
              existing.station = s;
            }
          }
        }
        return Array.from(cells.values());
      }

      // ── Marker-Design pro Tier ───────────────────────────────────────
      const W  = zoomTier === 0 ? 44 : zoomTier === 1 ? 52 : 60;
      const TH = zoomTier === 0 ? 20 : zoomTier === 1 ? 23 : 28; // Kasten-Höhe
      const H  = TH + 8;                                            // Pfeil-Höhe
      const FS = zoomTier === 0 ? 8  : zoomTier === 1 ? 9  : 11;
      const RX = zoomTier === 0 ? 5  : zoomTier === 1 ? 6  : 8;
      const TX = W / 2, TY = TH / 2;
      const P1 = W / 2 - 4, P2 = W / 2 + 4, P3 = W / 2;

      const clusters = clusterStations(stations);
      const allPrices = stations
        .map((s) => s[fuelType] as number | false)
        .filter((p): p is number => typeof p === "number" && p > 0);

      clusters.forEach(({ station, count }) => {
        const price  = station[fuelType] as number | false;
        const status = getPriceStatus(price, allPrices);
        const color  = STATUS_COLORS[status];
        const label  = price ? price.toFixed(3).replace(".", ",") : "–";

        // Count-Badge nur im Übersichts-Modus und wenn > 1 Station aggregiert
        const badge = (zoomTier === 0 && count > 1)
          ? `<text x="${W - 3}" y="4" text-anchor="end" dominant-baseline="hanging"
               font-family="sans-serif" font-size="5" font-weight="700" fill="white"
               paint-order="stroke" stroke="${color}" stroke-width="1.5">${count}×</text>`
          : "";

        const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${W}" height="${TH}" rx="${RX}" fill="${color}" opacity="0.95"/>
  <polygon points="${P1},${TH} ${P2},${TH} ${P3},${H}" fill="${color}" opacity="0.95"/>
  <text x="${TX}" y="${TY}" text-anchor="middle" dominant-baseline="middle"
        font-family="JetBrains Mono,monospace" font-size="${FS}" font-weight="700" fill="#0A0A0F">
    ${label}€
  </text>
  ${badge}
</svg>`;

        const icon = L.divIcon({
          html: svg,
          className: "",
          iconSize:   [W, H],
          iconAnchor: [W / 2, H],
        });

        const tooltipText = count > 1
          ? `${station.brand || station.name} — günstigste von ${count} Stationen`
          : `${station.brand || station.name}`;

        const marker = L.marker([station.lat, station.lng], { icon })
          .addTo(mapRef.current!)
          .bindTooltip(tooltipText, { permanent: false, className: "spritiq-tooltip" });
        marker.on("click", () => {
          setSelected(station);
          mapRef.current?.panTo([station.lat, station.lng], { animate: true });
        });
        markersRef.current.push(marker);
      });
    });
  }, [stations, fuelType, loading, zoomTier]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* ── Fuel-Toggle oben ── */}
      <div
        style={{
          position: "absolute",
          top: "12px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 999,
          display: "flex",
          gap: "4px",
          background: "rgba(10,10,15,0.90)",
          backdropFilter: "blur(12px)",
          border: "1px solid #1E1E2E",
          borderRadius: "12px",
          padding: "4px",
        }}
      >
        {FUEL_TYPES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              setFuelType(key);
              setSelected(null);
            }}
            style={{
              padding: "6px 16px",
              borderRadius: "8px",
              border: "none",
              background: fuelType === key ? "#22C55E" : "transparent",
              color: fuelType === key ? "#0A0A0F" : "#64748B",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 200ms ease",
              minWidth: "52px",
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
            position: "absolute",
            top: "64px",
            left: "12px",
            background: "rgba(17,17,24,0.9)",
            border: "1px solid #1E1E2E",
            borderRadius: "8px",
            padding: "6px 10px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            zIndex: 999,
            backdropFilter: "blur(8px)",
          }}
        >
          {loading ? (
            <>
              <div
                className="animate-spin"
                style={{
                  width: "8px",
                  height: "8px",
                  border: "2px solid #2A2A3C",
                  borderTopColor: "#22C55E",
                  borderRadius: "50%",
                }}
              />
              <span style={{ fontSize: "11px", color: "#64748B" }}>
                Preise laden...
              </span>
            </>
          ) : (
            <>
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: geo.error ? "#F59E0B" : "#3B82F6",
                }}
              />
              <span style={{ fontSize: "11px", color: "#94A3B8" }}>
                {geo.error ? "München (Fallback)" : "GPS aktiv"}
              </span>
            </>
          )}
        </div>
      )}

      {/* ── „In diesem Bereich suchen" Button ── */}
      {mapMoved && !loading && (
        <div
          style={{
            position: "absolute",
            top: "64px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 999,
          }}
        >
          <button
            onClick={() => {
              setMapMoved(false);
              refresh();
            }}
            style={{
              padding: "10px 18px",
              background: "rgba(17,17,24,0.95)",
              border: "1px solid rgba(34,197,94,0.4)",
              borderRadius: "24px",
              color: "#22C55E",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              backdropFilter: "blur(12px)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              whiteSpace: "nowrap",
            }}
          >
            <Navigation size={13} />
            In diesem Bereich suchen
          </button>
        </div>
      )}

      {/* ── „Mein Standort"-Button (unten rechts, wie Google Maps) ── */}
      {!geo.loading && (geo.lat || geo.lng) && (
        <button
          onClick={() => {
            if (mapRef.current && geo.lat && geo.lng) {
              mapRef.current.panTo([geo.lat, geo.lng], { animate: true });
              setMapCenter(null); // zurück zu GPS-Koordinaten
              setMapMoved(false); // "In diesem Bereich"-Button ausblenden
            }
          }}
          title="Mein Standort"
          style={{
            position: "absolute",
            bottom: "160px", // über BottomNav + Zoom-Controls (mobile-safe)
            right: "12px",
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: "rgba(17,17,24,0.95)",
            border: "1px solid #2A2A3C",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 999,
            backdropFilter: "blur(12px)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
            transition: "all 200ms ease",
          }}
        >
          <Navigation size={18} color="#3B82F6" fill="rgba(59,130,246,0.15)" />
        </button>
      )}

      {/* ── Bottom Sheet ── */}
      {selected && (
        <div
          className="animate-slide-up"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#111118",
            borderTop: "1px solid #1E1E2E",
            borderRadius: "20px 20px 0 0",
            padding: "20px 16px 100px",
            zIndex: 1000,
          }}
          role="dialog"
          aria-label={`Details: ${selected.name}`}
        >
          <div
            style={{
              width: "36px",
              height: "4px",
              background: "#2A2A3C",
              borderRadius: "2px",
              margin: "0 auto 16px",
            }}
          />

          <button
            onClick={() => setSelected(null)}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "#16161F",
              border: "1px solid #2A2A3C",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Schließen"
          >
            <X size={16} color="#64748B" />
          </button>

          <h3
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "18px",
              fontWeight: 700,
              color: "#F8FAFC",
              marginBottom: "2px",
            }}
          >
            {selected.brand || selected.name}
          </h3>
          <p
            style={{ fontSize: "12px", color: "#64748B", marginBottom: "4px" }}
          >
            {selected.street}, {selected.place}
          </p>
          <p
            style={{ fontSize: "13px", color: "#64748B", marginBottom: "16px" }}
          >
            {selected.dist.toFixed(1)} km entfernt
            {!selected.isOpen && (
              <span
                style={{ color: "#EF4444", fontWeight: 600, marginLeft: "8px" }}
              >
                · Geschlossen
              </span>
            )}
          </p>

          {/* Alle 3 Preise */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            {(
              [
                ["e10", "E10"],
                ["e5", "E5"],
                ["diesel", "Diesel"],
              ] as [FuelType, string][]
            ).map(([key, label]) => {
              const p = selected[key] as number | false;
              return (
                <div
                  key={key}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background:
                      fuelType === key ? "rgba(34,197,94,0.08)" : "#16161F",
                    border: `1px solid ${fuelType === key ? "rgba(34,197,94,0.25)" : "#2A2A3C"}`,
                    borderRadius: "10px",
                  }}
                >
                  {p ? (
                    <PriceTag
                      price={p}
                      fuelType={label as "E10" | "E5" | "Diesel"}
                      size="sm"
                    />
                  ) : (
                    <span style={{ fontSize: "12px", color: "#64748B" }}>
                      {label}: –
                    </span>
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
              onClick={() =>
                window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`,
                  "_blank",
                )
              }
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
