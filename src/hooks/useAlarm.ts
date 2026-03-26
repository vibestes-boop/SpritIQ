"use client";

import { useState, useCallback } from "react";
import type { FuelType } from "@/hooks/usePrices";

// ─── Typen ────────────────────────────────────────────────────────────────────
export interface PriceAlarm {
  id:         string;
  fuelType:   FuelType;
  threshold:  number;   // Preis in Euro, z.B. 1.70
  enabled:    boolean;
  createdAt:  number;
  triggeredAt?: number; // letzter Alarm-Trigger
}

const STORAGE_KEY = "spritiq_alarms";

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────
function loadAlarms(): PriceAlarm[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAlarms(alarms: PriceAlarm[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
  } catch { /* ignore */ }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAlarm() {
  const [alarms, setAlarms] = useState<PriceAlarm[]>(() => loadAlarms());
  const [triggered, setTriggered] = useState<PriceAlarm[]>([]);

  const addAlarm = useCallback((fuelType: FuelType, threshold: number) => {
    const alarm: PriceAlarm = {
      id:        crypto.randomUUID(),
      fuelType,
      threshold,
      enabled:   true,
      createdAt: Date.now(),
    };
    setAlarms((prev) => {
      const next = [...prev, alarm];
      saveAlarms(next);
      return next;
    });
  }, []);

  const removeAlarm = useCallback((id: string) => {
    setAlarms((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveAlarms(next);
      return next;
    });
  }, []);

  const toggleAlarm = useCallback((id: string) => {
    setAlarms((prev) => {
      const next = prev.map((a) => a.id === id ? { ...a, enabled: !a.enabled } : a);
      saveAlarms(next);
      return next;
    });
  }, []);

  // Wird aufgerufen wenn neue Preise ankommen — prüft alle Alarme
  const checkAlarms = useCallback((prices: Record<FuelType, number | null>) => {
    const now = Date.now();
    const COOLDOWN = 30 * 60 * 1000; // 30 Minuten kein Doppel-Alarm

    setAlarms((prev) => {
      const newTriggered: PriceAlarm[] = [];
      const next = prev.map((alarm) => {
        if (!alarm.enabled) return alarm;
        const price = prices[alarm.fuelType];
        if (price === null) return alarm;

        // Alarm ausgelöst?
        const wasCooledDown = !alarm.triggeredAt || (now - alarm.triggeredAt) > COOLDOWN;
        if (price <= alarm.threshold && wasCooledDown) {
          const updated = { ...alarm, triggeredAt: now };
          newTriggered.push({ ...updated, threshold: alarm.threshold });
          return updated;
        }
        return alarm;
      });

      if (newTriggered.length > 0) {
        saveAlarms(next);
        setTriggered((t) => [...t, ...newTriggered]);
      }
      return next;
    });
  }, []);

  const dismissTriggered = useCallback((id: string) => {
    setTriggered((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    alarms,
    triggered,
    addAlarm,
    removeAlarm,
    toggleAlarm,
    checkAlarms,
    dismissTriggered,
  };
}
