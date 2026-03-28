"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "spritiq_favorites";

// ─── Favoriten-Metadaten ──────────────────────────────────────────────────────
export interface FavoriteStation {
  id: string;
  name: string;
  brand?: string;
  address: string;
  e10?: number | false;
  e5?: number | false;
  diesel?: number | false;
  savedAt: number;
}

type FavoritesMap = Map<string, FavoriteStation>;

function loadFavorites(): FavoritesMap {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw);

    // Neues Format: Array von FavoriteStation-Objekten
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object" && parsed[0].id) {
      const map = new Map<string, FavoriteStation>();
      for (const entry of parsed as FavoriteStation[]) {
        map.set(entry.id, entry);
      }
      return map;
    }

    // Migration: Altes Format (Array von string-IDs)
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
      const map = new Map<string, FavoriteStation>();
      for (const id of parsed as string[]) {
        map.set(id, { id, name: "Tankstelle", address: "–", savedAt: Date.now() });
      }
      // Sofort im neuen Format speichern
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...map.values()]));
      return map;
    }

    return new Map();
  } catch {
    return new Map();
  }
}

// ─── Favoriten Hook ───────────────────────────────────────────────────────────
export function useFavorites() {
  const [favMap, setFavMap] = useState<FavoritesMap>(() => loadFavorites());

  // Set-Interface für Abwärtskompatibilität (favorites.size, favorites.has)
  const favorites = new Set(favMap.keys());

  const toggle = useCallback((stationId: string, meta?: Omit<FavoriteStation, "id" | "savedAt">) => {
    setFavMap((prev) => {
      const next = new Map(prev);
      if (next.has(stationId)) {
        next.delete(stationId);
      } else {
        next.set(stationId, {
          id: stationId,
          name: meta?.name ?? "Tankstelle",
          brand: meta?.brand,
          address: meta?.address ?? "–",
          e10: meta?.e10,
          e5: meta?.e5,
          diesel: meta?.diesel,
          savedAt: Date.now(),
        });
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next.values()]));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (stationId: string) => favMap.has(stationId),
    [favMap]
  );

  const getMeta = useCallback(
    (stationId: string): FavoriteStation | undefined => favMap.get(stationId),
    [favMap]
  );

  const allFavorites = useCallback(
    (): FavoriteStation[] => [...favMap.values()],
    [favMap]
  );

  return { favorites, toggle, isFavorite, getMeta, allFavorites };
}

// ─── Share-Funktion ──────────────────────────────────────────────────────────
export interface ShareData {
  stationName: string;
  price: number;
  fuelType: string;
  address: string;
  dist: number;
}

export async function shareStation(data: ShareData): Promise<boolean> {
  const priceStr = data.price.toFixed(3).replace(".", ",");
  const text = `${data.fuelType} für ${priceStr}€/L\n${data.stationName} · ${data.address} (${data.dist.toFixed(1)} km)\n\nGefunden mit SpritIQ → sprit-iq.vercel.app`;

  // Web Share API (Android/iOS nativ)
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: `SpritIQ — ${data.fuelType} für ${priceStr}€`,
        text,
        url: "https://sprit-iq.vercel.app",
      });
      return true;
    } catch {
      // User abgebrochen — kein Fehler
      return false;
    }
  }

  // Fallback: Clipboard
  try {
    await navigator.clipboard.writeText(text);
    return true; // Caller zeigt "Kopiert!" Toast
  } catch {
    return false;
  }
}
