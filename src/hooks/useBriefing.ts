"use client";

import { useState, useEffect, useCallback } from "react";
import type { BriefingResponse } from "@/app/api/briefing/route";

interface UseBriefingResult {
  data: BriefingResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const CACHE_KEY      = "spritiq_briefing_v1";
const CACHE_MAX_AGE  = 30 * 60 * 1000; // 30 Minuten

interface LocalCache {
  data: BriefingResponse;
  savedAt: number;
}

function loadFromLocalStorage(): BriefingResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: LocalCache = JSON.parse(raw);
    if (Date.now() - parsed.savedAt > CACHE_MAX_AGE) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function saveToLocalStorage(data: BriefingResponse): void {
  try {
    const entry: LocalCache = { data, savedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Storage full o.ä. — ignorieren
  }
}

export function useBriefing(): UseBriefingResult {
  // Sofort mit gecachten Daten initialisieren (kein leerer Loading-State beim ersten Visit)
  const [data, setData] = useState<BriefingResponse | null>(() => {
    if (typeof window === "undefined") return null;
    return loadFromLocalStorage();
  });
  // Loading = false wenn wir bereits gecachte Daten haben
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return loadFromLocalStorage() === null;
  });
  const [error, setError]   = useState<string | null>(null);

  const fetchBriefing = useCallback(async () => {
    // Wenn wir gecachte Daten haben, kein Loading-Spinner zeigen (Hintergrundaktualisierung)
    const hasCached = loadFromLocalStorage() !== null;
    if (!hasCached) setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/briefing");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: BriefingResponse = await res.json();
      if (!json.ok) throw new Error("API Fehler");

      // Daten anzeigen + in localStorage speichern
      setData(json);
      saveToLocalStorage(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      // Fehler: falls gecachte Daten vorhanden, behalten (kein Datenverlust)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  return { data, loading, error, refresh: fetchBriefing };
}
