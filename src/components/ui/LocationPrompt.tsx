"use client";

import { useState, useCallback } from "react";
import { MapPin, Search, Crosshair } from "lucide-react";

interface CityResult {
  lat: number;
  lng: number;
  label: string;
}

async function searchCity(query: string): Promise<CityResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=de&format=json&limit=5&addressdetails=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "de" } });
  if (!res.ok) return [];
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((r: any) => ({
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    label: r.display_name.split(",").slice(0, 3).join(", "),
  }));
}

interface LocationPromptProps {
  onLocationGranted: (lat: number, lng: number, label: string) => void;
  onRequestGPS: () => void;
  mode: "permission" | "denied" | "search";
}

export function LocationPrompt({ onLocationGranted, onRequestGPS, mode }: LocationPromptProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(mode === "search" || mode === "denied");

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await searchCity(query);
      setResults(res);
    } finally {
      setSearching(false);
    }
  }, [query]);

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(99,102,241,0.05) 100%)",
      border: "1px solid rgba(34,197,94,0.2)",
      borderRadius: "16px",
      padding: "20px 16px",
      marginBottom: "16px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <MapPin size={18} color="#22C55E" />
        </div>
        <div>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "#F8FAFC" }}>
            {mode === "denied" ? "Standortzugriff verweigert" : "Wo bist du?"}
          </p>
          <p style={{ fontSize: "11px", color: "#64748B", marginTop: "1px" }}>
            {mode === "denied"
              ? "Bitte erlaube in den Browser-Einstellungen oder gib deinen Ort ein"
              : "Erlaube GPS oder gib deinen Ort / PLZ ein"}
          </p>
        </div>
      </div>

      {/* GPS Button */}
      {mode !== "denied" && (
        <button
          onClick={onRequestGPS}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "12px",
            border: "1px solid rgba(34,197,94,0.3)",
            background: "rgba(34,197,94,0.1)",
            color: "#22C55E",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            marginBottom: "10px",
          }}
        >
          <Crosshair size={15} />
          Automatisch ermitteln (GPS)
        </button>
      )}

      {/* Divider */}
      {mode !== "denied" && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          <div style={{ flex: 1, height: "1px", background: "#1E1E2E" }} />
          <span style={{ fontSize: "10px", color: "#475569" }}>oder</span>
          <div style={{ flex: 1, height: "1px", background: "#1E1E2E" }} />
        </div>
      )}

      {/* Stadt/PLZ Suche */}
      {!showSearch && (
        <button
          onClick={() => setShowSearch(true)}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "12px",
            border: "1px solid #1E1E2E",
            background: "#111118",
            color: "#94A3B8",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <Search size={14} />
          Stadt oder PLZ eingeben
        </button>
      )}

      {showSearch && (
        <div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="z.B. Berlin, 80331, München..."
              autoFocus
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid #2A2A3C",
                background: "#16161F",
                color: "#F8FAFC",
                fontSize: "13px",
                outline: "none",
              }}
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid rgba(34,197,94,0.3)",
                background: "rgba(34,197,94,0.1)",
                color: "#22C55E",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {searching ? "…" : <Search size={15} />}
            </button>
          </div>

          {/* Ergebnisse */}
          {results.length > 0 && (
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => onLocationGranted(r.lat, r.lng, r.label)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid #1E1E2E",
                    background: "#111118",
                    color: "#F8FAFC",
                    fontSize: "12px",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <MapPin size={12} color="#64748B" style={{ flexShrink: 0 }} />
                  {r.label}
                </button>
              ))}
            </div>
          )}

          {results.length === 0 && query && !searching && (
            <div style={{ marginTop: "8px" }}>
              {/* Quick suggestions */}
              <p style={{ fontSize: "10px", color: "#475569", marginBottom: "6px" }}>Schnellauswahl:</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {["Berlin", "München", "Hamburg", "Köln", "Frankfurt", "Stuttgart", "Düsseldorf"].map((city) => (
                  <button
                    key={city}
                    onClick={async () => {
                      const r = await searchCity(city);
                      if (r[0]) onLocationGranted(r[0].lat, r[0].lng, city);
                    }}
                    style={{
                      padding: "5px 10px",
                      borderRadius: "8px",
                      border: "1px solid #1E1E2E",
                      background: "#111118",
                      color: "#64748B",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Cities initial */}
          {!query && (
            <div style={{ marginTop: "8px" }}>
              <p style={{ fontSize: "10px", color: "#475569", marginBottom: "6px" }}>Schnellauswahl:</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {["Berlin", "München", "Hamburg", "Köln", "Frankfurt"].map((city) => (
                  <button
                    key={city}
                    onClick={async () => {
                      const r = await searchCity(city);
                      if (r[0]) onLocationGranted(r[0].lat, r[0].lng, city);
                    }}
                    style={{
                      padding: "5px 10px",
                      borderRadius: "8px",
                      border: "1px solid #1E1E2E",
                      background: "#111118",
                      color: "#64748B",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
