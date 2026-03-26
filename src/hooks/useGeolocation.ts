"use client";

import { useState, useEffect, useCallback } from "react";

interface GeolocationState {
  lat: number;
  lng: number;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
}

// München Fallback
const FALLBACK = { lat: 48.1374, lng: 11.5755 };

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: FALLBACK.lat,
    lng: FALLBACK.lng,
    accuracy: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState((s) => ({ ...s, loading: false, error: "GPS nicht verfügbar" }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          loading: false,
          error: null,
        });
      },
      (err) => {
        // Kein GPS → stille Degradierung auf Fallback
        setState((s) => ({
          ...s,
          loading: false,
          error: err.code === 1 ? "GPS-Berechtigung verweigert" : "GPS-Fehler",
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60_000, // 1 Minute Cache
      }
    );
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}
