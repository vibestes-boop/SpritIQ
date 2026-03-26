"use client";

import { useState, useEffect, useCallback } from "react";
import type { BriefingResponse } from "@/app/api/briefing/route";

interface UseBriefingResult {
  data: BriefingResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useBriefing(): UseBriefingResult {
  const [data, setData] = useState<BriefingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBriefing = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/briefing");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: BriefingResponse = await res.json();
      if (!json.ok) throw new Error("API Fehler");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  return { data, loading, error, refresh: fetchBriefing };
}
