import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

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
  source: "api" | "cached";
  updatedAt: string;
  error?: string;
}

// ─── Tankerkönig-Fetch (roh, ohne Cache) ─────────────────────────────────────
async function fetchFromTankerkoenig(
  lat: number,
  lng: number,
  rad: number,
  type: string,
  apiKey: string
): Promise<Station[]> {
  const url = new URL("https://creativecommons.tankerkoenig.de/json/list.php");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lng", String(lng));
  url.searchParams.set("rad", String(rad));
  url.searchParams.set("sort", "dist");
  url.searchParams.set("type", type);
  url.searchParams.set("apikey", apiKey);

  // Fetch mit Timeout + einmaligem Retry
  async function fetchWithRetry(urlStr: string, retries = 1): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const r = await fetch(urlStr, { cache: "no-store", signal: controller.signal });
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

  return (data.stations ?? [])
    .map(
      (s: {
        id: string; name: string; brand: string; street: string; place: string;
        lat: number; lng: number; dist: number;
        e5: number | false | null; e10: number | false | null; diesel: number | false | null;
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
    .filter(
      (s: Station) =>
        (typeof s.e5 === "number" && s.e5 > 0) ||
        (typeof s.e10 === "number" && s.e10 > 0) ||
        (typeof s.diesel === "number" && s.diesel > 0)
    );
}

// ─── GET /api/prices ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "48.1374");
  const lng = parseFloat(searchParams.get("lng") ?? "11.5755");
  const rad = parseFloat(searchParams.get("rad") ?? "10");
  const type = searchParams.get("type") ?? "all";

  const apiKey = process.env.TANKERKOENIG_API_KEY;
  if (!apiKey || apiKey.length <= 10) {
    return NextResponse.json(
      { ok: false, error: "API-Key nicht konfiguriert." },
      { status: 503 }
    );
  }

  // ── Cache-Grid: Koordinaten auf 1 Dezimalstelle runden (~11km Zellen)  ──
  // Stationen innerhalb derselben Gitterzelle teilen sich einen Cache-Eintrag.
  const gridLat = Math.round(lat * 10) / 10;
  const gridLng = Math.round(lng * 10) / 10;
  const cacheKey = [`prices-${gridLat}-${gridLng}-${rad}-${type}`];

  // ── Mit unstable_cache (Vercel Data Cache, 10 Min TTL) ───────────────────
  const getCached = unstable_cache(
    async () => {
      const stations = await fetchFromTankerkoenig(gridLat, gridLng, rad, type, apiKey);
      return { stations, updatedAt: new Date().toISOString() };
    },
    cacheKey,
    { revalidate: 600, tags: cacheKey } // 10-Minuten-Cache
  );

  try {
    const { stations, updatedAt } = await getCached();

    // Datenalter prüfen: wenn > 60s alt, stammen sie aus dem Cache
    const dataAge = Date.now() - new Date(updatedAt).getTime();
    const source: "api" | "cached" = dataAge > 60_000 ? "cached" : "api";

    const response: PricesResponse = {
      ok: true,
      stations,
      source,
      updatedAt,
    };

    return NextResponse.json(response, {
      headers: {
        // CDN: 5 Min frisch, bis zu 1h stale-while-revalidate
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    console.error("[prices] Tankerkönig error (kein Cache verfügbar):", err);
    return NextResponse.json(
      { ok: false, error: "Preisdaten momentan nicht verfügbar. Bitte versuche es erneut." },
      { status: 503 }
    );
  }
}
