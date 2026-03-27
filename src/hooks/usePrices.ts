"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Station, PricesResponse } from "@/app/api/prices/route";

export type FuelType = "e10" | "e5" | "diesel";
export type SortMode = "dist" | "price";

interface UsePricesOptions {
  lat: number;
  lng: number;
  radius?: number;
  fuelType?: FuelType;
  sortMode?: SortMode;
  /** Auto-Refresh Intervall in ms. 0 = kein Refresh. Default: 5 Minuten */
  refreshInterval?: number;
}

interface UsePricesResult {
  stations: Station[];     // sortiert (für Anzeige)
  rawStations: Station[];  // API-Reihenfolge (für Snapshots/Effekte)
  loading: boolean;
  error: string | null;
  source: "api" | "cached" | null;
  updatedAt: string | null;
  refresh: () => void;
}

// Preisstatus für Farbkodierung (billiger/mittel/teurer als Median)
export function getPriceStatus(
  price: number | false,
  allPrices: number[]
): "good" | "medium" | "bad" {
  if (!price) return "bad";
  if (allPrices.length < 2) return "medium";
  const sorted = [...allPrices].sort((a, b) => a - b);
  const p33 = sorted[Math.floor(sorted.length * 0.33)];
  const p66 = sorted[Math.floor(sorted.length * 0.66)];
  if (price <= p33) return "good";
  if (price <= p66) return "medium";
  return "bad";
}

// ── Koordinaten-Schwellenwert: Nur fetchen wenn Abstand > 1 km ──────────────
// 0.008° ≈ ~0.9 km — verhindert GPS-Jitter-induzierte Mehrfach-Fetches
const COORD_THRESHOLD = 0.008;

function coordsChangedSignificantly(
  prev: { lat: number; lng: number } | null,
  next: { lat: number; lng: number }
): boolean {
  if (!prev) return true;
  const dLat = Math.abs(prev.lat - next.lat);
  const dLng = Math.abs(prev.lng - next.lng);
  return dLat > COORD_THRESHOLD || dLng > COORD_THRESHOLD;
}

export function usePrices({
  lat,
  lng,
  radius = 5,
  fuelType = "e10",
  sortMode = "dist",
  refreshInterval = 5 * 60 * 1000,
}: UsePricesOptions): UsePricesResult {
  // Alle Stationen (ungefiltert nach Kraftstoff) — werden client-seitig gefiltert/sortiert
  const [allStations, setAllStations] = useState<Station[]>([]);
  const [meta, setMeta] = useState<{
    source: "api" | "cached" | null;
    updatedAt: string | null;
  }>({ source: null, updatedAt: null });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Ref: letzte gefetchte Koordinaten — für GPS-Jitter-Schutz
  const lastFetchedCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sortModeRef = useRef(sortMode);
  sortModeRef.current = sortMode; // immer aktuell ohne Dep-Änderung

  // fetchPrices: KEIN sortMode in Dependencies — Sort-Wechsel triggert keinen Refetch
  const fetchPrices = useCallback(async (force = false) => {
    // GPS-Jitter-Schutz: nur fetchen wenn Koordinaten sich genug verändert haben
    if (!force && !coordsChangedSignificantly(lastFetchedCoordsRef.current, { lat, lng })) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        lat:  String(lat),
        lng:  String(lng),
        rad:  String(radius),
        sort: sortModeRef.current, // Ref lesen statt aus Closure
        type: "all",
      });

      const res = await fetch(`/api/prices?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json: PricesResponse = await res.json();
      if (!json.ok) throw new Error("API Fehler");

      lastFetchedCoordsRef.current = { lat, lng };
      setAllStations(json.stations);
      setMeta({ source: json.source, updatedAt: json.updatedAt });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, [lat, lng, radius]); // sortMode BEWUSST RAUS — Ref-Pattern verhindert cascading effects

  // Initial fetch + Koordinaten-Change (mit GPS-Threshold-Schutz)
  useEffect(() => {
    if (!lat || !lng) return;
    fetchPrices();
  }, [fetchPrices]);

  // Auto-Refresh (force = true bei Timer-Refresh)
  useEffect(() => {
    if (!refreshInterval) return;
    timerRef.current = setInterval(() => fetchPrices(true), refreshInterval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchPrices, refreshInterval]);

  // ── Client-seitiges Sortieren nach Kraftstoff-Typ ────────────────────────
  // Kein Netzwerk-Call bei Kraftstoff-Wechsel — nur Sortierung der vorhandenen Daten
  const stations = sortMode === "price"
    ? [...allStations].sort((a, b) => {
        const pa = a[fuelType] as number | false;
        const pb = b[fuelType] as number | false;
        if (!pa && !pb) return 0;
        if (!pa) return 1;
        if (!pb) return -1;
        return pa - pb;
      })
    : allStations;

  return {
    stations,
    rawStations: allStations, // stabile Referenz — ändert sich nur bei neuem API-Fetch
    loading,
    error,
    source: meta.source,
    updatedAt: meta.updatedAt,
    refresh: () => fetchPrices(true),
  };
}
