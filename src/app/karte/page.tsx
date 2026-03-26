"use client";

import BottomNav from "@/components/ui/BottomNav";
import dynamic from "next/dynamic";

// Leaflet muss client-side geladen werden (kein SSR)
const MapClient = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0A0A0F",
      }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="animate-spin"
          style={{
            width: "32px",
            height: "32px",
            border: "3px solid #1E1E2E",
            borderTopColor: "#22C55E",
            borderRadius: "50%",
          }}
        />
        <p style={{ fontSize: "13px", color: "#64748B" }}>Karte wird geladen...</p>
      </div>
    </div>
  ),
});

export default function KartePage() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        background: "#0A0A0F",
        // kein bottom-padding hier — Karte geht bis unten, BottomNav liegt drüber
        paddingBottom: 0,
      }}
    >
      {/* Leaflet Karte — nimmt gesamten verfügbaren Platz */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <MapClient />
      </div>

      {/* BottomNav liegt über der Karte */}
      <BottomNav />
    </main>
  );
}
