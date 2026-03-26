"use client";

import { useState, useCallback } from "react";

// ─── Typen ────────────────────────────────────────────────────────────────────
export interface PriceSnapshot {
  timestamp:  number; // Unix-Ms
  e10:        number | null;
  e5:         number | null;
  diesel:     number | null;
  stationId?: string;
}

const STORAGE_KEY = "spritiq_price_history";
const MAX_ENTRIES = 200; // ~200 Snapshots = ~7 Tage bei stündlichem Abruf

// ─── Wochentag-Empfehlungen (basierend auf DE-Tankverhalten-Studien) ──────────
// Quelle: ADAC, MWV, OMV-Analysen
const WEEKDAY_TRENDS: Record<number, { label: string; tip: string; color: string }> = {
  0: { label: "Sonntag",   tip: "Preise hoch — Frühzeitig tanken wenn möglich", color: "#EF4444" },
  1: { label: "Montag",    tip: "Moderate Preise — OK zum Tanken",               color: "#F59E0B" },
  2: { label: "Dienstag",  tip: "Preise sinken — Guter Zeitpunkt",               color: "#22C55E" },
  3: { label: "Mittwoch",  tip: "Günstigster Wochentag — Jetzt tanken!",         color: "#22C55E" },
  4: { label: "Donnerstag",tip: "Noch günstig — Lieber heute als morgen",        color: "#22C55E" },
  5: { label: "Freitag",   tip: "Preise steigen nachmittags — Morgens tanken",   color: "#F59E0B" },
  6: { label: "Samstag",   tip: "Wochenend-Peak — Nur tanken wenn nötig",        color: "#EF4444" },
};

// Tageszeit-Empfehlung (DE-Durchschnitt: 18-19 Uhr günstigster Zeitpunkt)
export function getBestTimeAdvice(): {
  recommendNow: boolean;
  text: string;
  color: string;
  weekdayTip: string;
  weekdayColor: string;
} {
  const now      = new Date();
  const hour     = now.getHours();
  const weekday  = now.getDay();
  const wd       = WEEKDAY_TRENDS[weekday];

  // Günstigste Stunden: 18–19 Uhr (Abfallphase), 7–8 Uhr (Morgen vor Anstieg)
  const isGoodHour = (hour >= 18 && hour <= 20) || (hour >= 6 && hour <= 8);
  const isBadHour  = (hour >= 10 && hour <= 14) || (hour >= 11 && hour <= 13);

  if (isGoodHour) {
    return {
      recommendNow:  true,
      text:          "Jetzt tanken empfohlen",
      color:         "#22C55E",
      weekdayTip:    wd.tip,
      weekdayColor:  wd.color,
    };
  }
  if (isBadHour) {
    return {
      recommendNow:  false,
      text:          "Warte auf 18-19 Uhr — dann günstiger",
      color:         "#EF4444",
      weekdayTip:    wd.tip,
      weekdayColor:  wd.color,
    };
  }
  return {
    recommendNow:  false,
    text:          "Tagespreise variieren — 18-19 Uhr günstiger",
    color:         "#F59E0B",
    weekdayTip:    wd.tip,
    weekdayColor:  wd.color,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function usePriceHistory() {
  // Lazy initializer — liest einmalig aus localStorage, kein setState-in-Effect
  const [history, setHistory] = useState<PriceSnapshot[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as PriceSnapshot[]) : [];
    } catch {
      return [];
    }
  });


  // Speichern wenn sich history ändert
  const addSnapshot = useCallback((snap: Omit<PriceSnapshot, "timestamp">) => {
    setHistory((prev) => {
      // Nicht doppelt speichern wenn der letzte Eintrag < 15 Min alt ist
      const lastTs = prev[prev.length - 1]?.timestamp ?? 0;
      if (Date.now() - lastTs < 15 * 60 * 1000) return prev;

      const next = [...prev, { ...snap, timestamp: Date.now() }].slice(-MAX_ENTRIES);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Letzten N Einträge für Chart
  const getRecent = useCallback((n: number) => history.slice(-n), [history]);

  // Trend berechnen (Steigung der letzten N Einträge)
  const getTrend = useCallback((fuelKey: keyof Pick<PriceSnapshot, "e10" | "e5" | "diesel">, n = 10) => {
    const recent = history.slice(-n).filter((s) => s[fuelKey] !== null);
    if (recent.length < 2) return "stable" as const;
    const first = recent[0][fuelKey]!;
    const last  = recent[recent.length - 1][fuelKey]!;
    const diff  = last - first;
    if (diff > 0.005)  return "up"   as const;
    if (diff < -0.005) return "down" as const;
    return "stable" as const;
  }, [history]);

  return { history, addSnapshot, getRecent, getTrend };
}
