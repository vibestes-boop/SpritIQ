"use client";

import { useState, useEffect, useCallback } from "react";

export interface VehicleProfile {
  /** Kraftstoff-Typ */
  fuelType: "e10" | "e5" | "diesel";
  /** Verbrauch in L/100km */
  consumption: number;
  /** Tankgröße in Liter */
  tankSize: number;
  /** Fahrzeugname (optional) */
  name: string;
}

const DEFAULT_PROFILE: VehicleProfile = {
  fuelType:    "e10",
  consumption: 7.5,
  tankSize:    50,
  name:        "Mein Auto",
};

const STORAGE_KEY = "spritiq_vehicle_profile";

export function useVehicleProfile() {
  const [profile, setProfileState] = useState<VehicleProfile>(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);

  // Lesen aus localStorage (nur Client-Side)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<VehicleProfile>;
        setProfileState({ ...DEFAULT_PROFILE, ...parsed });
      }
    } catch {
      // localStorage nicht verfügbar — Default behalten
    }
    setLoaded(true);
  }, []);

  const setProfile = useCallback((updates: Partial<VehicleProfile>) => {
    setProfileState((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {/* ignore */}
      return next;
    });
  }, []);

  const resetProfile = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {/* ignore */}
    setProfileState(DEFAULT_PROFILE);
  }, []);

  return { profile, setProfile, resetProfile, loaded };
}

// ─── Umweg-Rechner Formel (aus MASTERPLAN) ────────────────────────────────────
export interface DetourResult {
  /** Sparpotenzial in € */
  savings: number;
  /** Zusatzkosten für den Umweg in € */
  detourCost: number;
  /** Netto-Ersparnis (positiv = lohnt sich, negativ = lohnt nicht) */
  netSavings: number;
  /** Lohnt es sich? */
  worthIt: boolean;
  /** Erklärungstext */
  explanation: string;
}

export function calcDetour(
  profile: VehicleProfile,
  detourKm: number,
  priceDiffPerLiter: number,
  currentPricePerLiter: number
): DetourResult {
  const tankvolumen  = profile.tankSize * 0.6; // Annahme: 60% leer
  const savings      = tankvolumen * priceDiffPerLiter;
  const detourCost   = (detourKm / 100) * profile.consumption * currentPricePerLiter;
  const netSavings   = savings - detourCost;
  const worthIt      = netSavings > 0.10; // > 10ct Netto-Vorteil

  const explanation = worthIt
    ? `Du sparst netto ${netSavings.toFixed(2).replace(".", ",")}€ — der Umweg lohnt sich!`
    : netSavings > 0
    ? `Nur ${netSavings.toFixed(2).replace(".", ",")}€ Vorteil — kaum lohnenswert.`
    : `Kostet dich ${Math.abs(netSavings).toFixed(2).replace(".", ",")}€ mehr — nicht tanken gehen!`;

  return { savings, detourCost, netSavings, worthIt, explanation };
}
