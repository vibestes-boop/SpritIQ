"use client";

import { useState, useEffect, useCallback } from "react";

export type GeoPermission = "waiting" | "granted" | "denied" | "unavailable" | "loading";

export interface GeolocationState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  loading: boolean;
  permission: GeoPermission;
  error: string | null;
}

// München Fallback nur für Chart-History – NICHT für Preissuche
export const MUNICH_FALLBACK = { lat: 48.1374, lng: 11.5755 };

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    accuracy: null,
    loading: true,
    permission: "loading",
    error: null,
  });

  // Manuelle Koordinaten-Überschreibung (z.B. aus Stadtsuche)
  const setManualLocation = useCallback((lat: number, lng: number, label?: string) => {
    setState({
      lat,
      lng,
      accuracy: null,
      loading: false,
      permission: "granted",
      error: label ? null : null,
    });
  }, []);

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState((s) => ({ ...s, loading: false, permission: "unavailable", error: "GPS nicht verfügbar" }));
      return;
    }

    setState((s) => ({ ...s, loading: true, permission: "loading", error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          loading: false,
          permission: "granted",
          error: null,
        });
      },
      (err) => {
        setState((s) => ({
          ...s,
          loading: false,
          permission: err.code === 1 ? "denied" : "unavailable",
          error: err.code === 1 ? "GPS-Berechtigung verweigert" : "GPS nicht verfügbar",
        }));
      },
      {
        enableHighAccuracy: false, // Schneller ohne high accuracy
        timeout: 10000,
        maximumAge: 120_000, // 2 Minuten Cache
      }
    );
  }, []);

  useEffect(() => {
    // Prüfe erst ob Permission schon gesetzt ist
    if ("permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          if (result.state === "granted") {
            // Direkt anfragen ohne Popup
            requestLocation();
          } else if (result.state === "denied") {
            setState((s) => ({ ...s, loading: false, permission: "denied", error: "GPS-Berechtigung verweigert" }));
          } else {
            // "prompt" – wir zeigen eigenes UI, fragen NICHT automatisch
            setState((s) => ({ ...s, loading: false, permission: "waiting" }));
          }
          // Auf Änderungen reagieren
          result.onchange = () => {
            if (result.state === "granted") requestLocation();
            else if (result.state === "denied") {
              setState((s) => ({ ...s, loading: false, permission: "denied" }));
            }
          };
        })
        .catch(() => {
          // Permissions API nicht verfügbar – direkt anfragen
          requestLocation();
        });
    } else {
      requestLocation();
    }
  }, [requestLocation]);

  return { ...state, requestLocation, setManualLocation };
}
