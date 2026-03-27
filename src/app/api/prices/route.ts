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
  source: "api";
  updatedAt: string;
  error?: string;
}

// ─── GET /api/prices ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "48.1374");
  const lng = parseFloat(searchParams.get("lng") ?? "11.5755");
  const rad = parseFloat(searchParams.get("rad") ?? "10"); // 10km default
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

      // Fetch mit Timeout + einmaligem Retry
      async function fetchWithRetry(urlStr: string, retries = 1): Promise<Response> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000); // 8s Timeout
        try {
          const r = await fetch(urlStr, { next: { revalidate: 300 }, signal: controller.signal });
          clearTimeout(timer);
          return r;
        } catch (e) {
          clearTimeout(timer);
          if (retries > 0) return fetchWithRetry(urlStr, retries - 1);
          throw e;
        }
      }

      const res = await fetchWithRetry(url.toString());

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
      return NextResponse.json(
        { ok: false, error: "Preisdaten momentan nicht verfügbar. Bitte versuche es erneut." },
        { status: 503 }
      );
    }
  }

  // Kein API-Key konfiguriert
  return NextResponse.json(
    { ok: false, error: "API-Key nicht konfiguriert." },
    { status: 503 }
  );
}
