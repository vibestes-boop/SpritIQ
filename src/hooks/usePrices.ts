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
  stations: Station[];
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

export function usePrices({
  lat,
  lng,
  radius = 5,
  fuelType = "e10",
  sortMode = "dist",
  refreshInterval = 5 * 60 * 1000,
}: UsePricesOptions): UsePricesResult {
  const [data, setData] = useState<{
    stations: Station[];
    source: "api" | "cached" | null;
    updatedAt: string | null;
  }>({ stations: [], source: null, updatedAt: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        rad: String(radius),
        sort: sortMode,
        type: "all", // Immer alle Kraftstofftypen laden, Frontend filtert
      });

      const res = await fetch(`/api/prices?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json: PricesResponse = await res.json();
      if (!json.ok) throw new Error("API Fehler");

      const sorted = sortMode === "price"
        ? [...json.stations].sort((a, b) => {
            const pa = a[fuelType] as number | false;
            const pb = b[fuelType] as number | false;
            if (!pa && !pb) return 0;
            if (!pa) return 1;
            if (!pb) return -1;
            return pa - pb;
          })
        : json.stations;

      setData({
        stations: sorted,
        source: json.source,
        updatedAt: json.updatedAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, [lat, lng, radius, fuelType, sortMode]);

  // Initial fetch + Koordinaten-Change
  useEffect(() => {
    if (!lat || !lng) return;
    fetchPrices();
  }, [fetchPrices]);

  // Auto-Refresh
  useEffect(() => {
    if (!refreshInterval) return;
    timerRef.current = setInterval(fetchPrices, refreshInterval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchPrices, refreshInterval]);

  return {
    stations: data.stations,
    loading,
    error,
    source: data.source,
    updatedAt: data.updatedAt,
    refresh: fetchPrices,
  };
}
