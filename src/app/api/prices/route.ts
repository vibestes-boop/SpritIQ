import { NextRequest, NextResponse } from "next/server";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Station {
  id: string;
  name: string;
  brand: string;
  street: string;
  place: string;
  lat: number;
  lng: number;
  dist: number; // km
  e5?: number | false;
  e10?: number | false;
  diesel?: number | false;
  isOpen: boolean;
}

export interface PricesResponse {
  ok: boolean;
  stations: Station[];
  source: "api" | "demo";
  updatedAt: string;
}

// ─── Demo-Daten (wenn kein API-Key vorhanden) ────────────────────────────────
function getDemoStations(lat: number, lng: number): Station[] {
  // Zufällige kleine Preisschwankungen für realistische Demo
  const jitter = () => Math.round((Math.random() * 0.04 - 0.02) * 1000) / 1000;

  return [
    {
      id: "demo-1",
      name: "Shell Station Hauptstraße",
      brand: "Shell",
      street: "Hauptstraße 12",
      place: "München",
      lat: lat + 0.008,
      lng: lng + 0.005,
      dist: 0.9,
      e5:    1.789 + jitter(),
      e10:   1.739 + jitter(),
      diesel: 1.659 + jitter(),
      isOpen: true,
    },
    {
      id: "demo-2",
      name: "Aral Tankstelle Mitte",
      brand: "Aral",
      street: "Leopoldstraße 88",
      place: "München",
      lat: lat + 0.015,
      lng: lng + 0.012,
      dist: 1.7,
      e5:    1.809 + jitter(),
      e10:   1.759 + jitter(),
      diesel: 1.679 + jitter(),
      isOpen: true,
    },
    {
      id: "demo-3",
      name: "JET Westend",
      brand: "JET",
      street: "Landsberger Str. 55",
      place: "München",
      lat: lat - 0.012,
      lng: lng - 0.008,
      dist: 2.1,
      e5:    1.769 + jitter(),
      e10:   1.719 + jitter(),
      diesel: 1.639 + jitter(),
      isOpen: true,
    },
    {
      id: "demo-4",
      name: "AVIA Schwabing",
      brand: "AVIA",
      street: "Schwabing Str. 21",
      place: "München",
      lat: lat + 0.022,
      lng: lng + 0.003,
      dist: 2.5,
      e5:    1.819 + jitter(),
      e10:   1.769 + jitter(),
      diesel: 1.689 + jitter(),
      isOpen: true,
    },
    {
      id: "demo-5",
      name: "Total Energies Maxvorstadt",
      brand: "TotalEnergies",
      street: "Maxvorstadt 14",
      place: "München",
      lat: lat - 0.007,
      lng: lng + 0.015,
      dist: 3.2,
      e5:    1.849 + jitter(),
      e10:   1.799 + jitter(),
      diesel: 1.719 + jitter(),
      isOpen: false,
    },
    {
      id: "demo-6",
      name: "bft Haidhausen",
      brand: "bft",
      street: "Haidhauser Ring 7",
      place: "München",
      lat: lat - 0.018,
      lng: lng + 0.022,
      dist: 4.0,
      e5:    1.779 + jitter(),
      e10:   1.729 + jitter(),
      diesel: 1.649 + jitter(),
      isOpen: true,
    },
  ];
}

// ─── GET /api/prices ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "48.1374");
  const lng = parseFloat(searchParams.get("lng") ?? "11.5755");
  const rad = parseFloat(searchParams.get("rad") ?? "10"); // 10km default
  const sort = searchParams.get("sort") ?? "dist";
  const type = searchParams.get("type") ?? "all";

  const apiKey = process.env.TANKERKOENIG_API_KEY;

  // ── Echter Tankerkönig API-Call ──────────────────────────────────────────
  if (apiKey && apiKey.length > 10) {
    try {
      const url = new URL("https://creativecommons.tankerkoenig.de/json/list.php");
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lng", String(lng));
      url.searchParams.set("rad", String(rad));
      url.searchParams.set("sort", "dist"); // Tankerkönig: sort=price + type=all nicht kompatibel
      url.searchParams.set("type", type);
      url.searchParams.set("apikey", apiKey);

      const res = await fetch(url.toString(), {
        next: { revalidate: 300 }, // 5 Min Cache
      });

      if (!res.ok) throw new Error(`Tankerkönig HTTP ${res.status}`);

      const data = await res.json();

      if (!data.ok) throw new Error(data.message ?? "Tankerkönig error");

      // Normalisiere Tankerkönig-Format → unser Station-Format
      const stations: Station[] = (data.stations ?? [])
        .map(
          (s: {
            id: string;
            name: string;
            brand: string;
            street: string;
            place: string;
            lat: number;
            lng: number;
            dist: number;
            e5: number | false | null;
            e10: number | false | null;
            diesel: number | false | null;
            isOpen: boolean;
          }) => ({
            id: s.id,
            name: s.name ?? s.brand,
            brand: s.brand,
            street: s.street,
            place: s.place,
            lat: s.lat,
            lng: s.lng,
            dist: s.dist,
            e5: s.e5 || false,
            e10: s.e10 || false,
            diesel: s.diesel || false,
            isOpen: s.isOpen,
          })
        )
        // Nur Stationen mit mindestens einem Preis anzeigen
        .filter((s: Station) =>
          (typeof s.e5 === "number" && s.e5 > 0) ||
          (typeof s.e10 === "number" && s.e10 > 0) ||
          (typeof s.diesel === "number" && s.diesel > 0)
        );

      const response: PricesResponse = {
        ok: true,
        stations,
        source: "api",
        updatedAt: new Date().toISOString(),
      };

      return NextResponse.json(response, {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
      });
    } catch (err) {
      console.error("[prices] Tankerkönig error:", err);
      // Fallback auf Demo-Daten wenn API versagt
    }
  }

  // ── Demo-Fallback ────────────────────────────────────────────────────────
  const stations = getDemoStations(lat, lng);

  // Sortierung
  if (sort === "price") {
    const fuelKey = type === "diesel" ? "diesel" : type === "e5" ? "e5" : "e10";
    stations.sort((a, b) => {
      const ap = a[fuelKey as keyof Station] as number | false;
      const bp = b[fuelKey as keyof Station] as number | false;
      if (!ap) return 1;
      if (!bp) return -1;
      return ap - bp;
    });
  } else {
    stations.sort((a, b) => a.dist - b.dist);
  }

  const response: PricesResponse = {
    ok: true,
    stations,
    source: "demo",
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" }, // Demo: kein Caching
  });
}
