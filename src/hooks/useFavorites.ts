"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "spritiq_favorites";

// ─── Favoriten Hook ───────────────────────────────────────────────────────────
export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggle = useCallback((stationId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(stationId)) {
        next.delete(stationId);
      } else {
        next.add(stationId);
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (stationId: string) => favorites.has(stationId),
    [favorites]
  );

  return { favorites, toggle, isFavorite };
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
