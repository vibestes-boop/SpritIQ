import { NextResponse } from "next/server";

// ─── In-Memory Cache (30 Min TTL) ────────────────────────────────────────────
// Verhindert dass jeder User-Request einen separaten Qwen AI-Call auslöst.
// Cache lebt im Node.js Modul-Scope — wird bei Vercel Function Cold-Start geleert.
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 Minuten
interface CacheEntry {
  data: Omit<BriefingResponse, "ok">;
  cachedAt: number;
}
const briefingCache = new Map<string, CacheEntry>();

function getCacheKey(): string {
  const now = new Date();
  // Slot = 30-Min-Block: 00:00, 00:30, 01:00, ...
  const slot = Math.floor(now.getMinutes() / 30);
  return `briefing-${now.toISOString().slice(0, 11)}${now.getHours()}-${slot}`;
}

function getFromCache(): Omit<BriefingResponse, "ok"> | null {
  const key = getCacheKey();
  const entry = briefingCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    briefingCache.delete(key);
    return null;
  }
  return entry.data;
}

function setToCache(data: Omit<BriefingResponse, "ok">): void {
  const key = getCacheKey();
  // Alte Einträge bereinigen (max 3 Slots behalten)
  if (briefingCache.size > 3) {
    const oldestKey = briefingCache.keys().next().value;
    if (oldestKey) briefingCache.delete(oldestKey);
  }
  briefingCache.set(key, { data, cachedAt: Date.now() });
}

// ─── Types ───────────────────────────────────────────────────────────────────
export interface NewsItem {
  source: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
}

export interface PriceFactor {
  label: string;        // z.B. "Rohöl (Brent)"
  impact: "positive" | "negative" | "neutral"; // auf Preise
  detail: string;       // z.B. "82 USD/Barrel — stabil"
}

export interface DayForecast {
  day: string;          // "Mo"
  level: "low" | "mid" | "high";
}

export interface BriefingResponse {
  ok: boolean;
  recommendation: "TANKEN EMPFOHLEN" | "ABWARTEN" | "NICHT TANKEN";
  trend: "up" | "down" | "stable";
  confidence: number;
  summary: string;
  politicalContext: string;
  priceFactors: PriceFactor[];     // neu: Top-Einflussfaktoren
  weeklyForecast: DayForecast[];   // neu: Mo-So Prognose
  regionalHotspots: string[];      // neu: günstigste Regionen
  newsItems: NewsItem[];
  articlesAnalyzed: number;
  generatedAt: string;
  source: "ai" | "demo";
}

// ─── RSS Feeds (Deutsche Energie/Wirtschafts-Nachrichten) ────────────────────
const RSS_FEEDS = [
  { name: "Tagesschau",   url: "https://www.tagesschau.de/xml/rss2/" },
  { name: "Spiegel",      url: "https://www.spiegel.de/schlagzeilen/tops/index.rss" },
  { name: "n-tv",         url: "https://www.n-tv.de/rss" },
  { name: "Handelsblatt", url: "https://www.handelsblatt.com/rss/schlagzeilen" },
];

// Keywords die relevant für Spritpreise sind
const RELEVANT_KEYWORDS = [
  "öl", "rohöl", "benzin", "diesel", "sprit", "kraftstoff", "tankstelle",
  "opec", "brent", "wti", "energiepreis", "mineralöl", "raffinerie",
  "energiesteuer", "tankrabatt", "euro", "inflation",
];

// ─── RSS-Parser (ohne externe Library) ──────────────────────────────────────
async function fetchRSSItems(feedUrl: string, sourceName: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: { "User-Agent": "SpritIQ/1.0 (+https://spritiq.de)" },
      next: { revalidate: 900 }, // 15 Min Cache
    });
    if (!res.ok) return [];
    const xml = await res.text();

    // Einfacher Regex-basierter Parser (kein externe Library nötig)
    const items: NewsItem[] = [];
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
      const itemXml = match[1];
      const title   = extractTag(itemXml, "title");
      const desc    = extractTag(itemXml, "description");
      const link    = extractTag(itemXml, "link");
      const pubDate = extractTag(itemXml, "pubDate");

      if (!title) continue;

      // Nur relevante Artikel
      const combined = (title + " " + desc).toLowerCase();
      const isRelevant = RELEVANT_KEYWORDS.some((kw) => combined.includes(kw));
      if (!isRelevant) continue;

      items.push({
        source:      sourceName,
        title:       cleanText(title),
        summary:     cleanText(desc).slice(0, 200),
        url:         cleanText(link),
        publishedAt: pubDate || new Date().toISOString(),
      });
    }

    return items;
  } catch {
    return [];
  }
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, "i"));
  return (match?.[1] ?? match?.[2] ?? "").trim();
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")        // HTML-Tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Qwen API Call ────────────────────────────────────────────────────────────
async function callQwen(newsItems: NewsItem[]): Promise<Omit<BriefingResponse, "newsItems" | "articlesAnalyzed" | "generatedAt" | "source" | "ok">> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error("DASHSCOPE_API_KEY nicht gesetzt");

  const newsText = newsItems
    .map((n, i) => `${i + 1}. [${n.source}] ${n.title}\n   ${n.summary}`)
    .join("\n\n");

  const prompt = `Du bist SpritIQ, ein KI-Assistent für deutsche Kraftstoffpreise.

Analysiere folgende aktuelle Nachrichtenartikel und erstelle eine Empfehlung für deutsche Autofahrer:

${newsText || "Keine aktuellen Nachrichten gefunden."}

Antworte NUR mit einem validen JSON-Objekt (kein Markdown, kein Text davor/danach):
{
  "recommendation": "TANKEN EMPFOHLEN" | "ABWARTEN" | "NICHT TANKEN",
  "trend": "up" | "down" | "stable",
  "confidence": <Zahl 1-10>,
  "summary": "<2-3 Sätze Zusammenfassung der Marktlage auf Deutsch, max 250 Zeichen>",
  "politicalContext": "<1 Satz zu politischen/regulatorischen Entwicklungen, max 150 Zeichen>",
  "priceFactors": [
    { "label": "<Faktor>", "impact": "positive" | "negative" | "neutral", "detail": "<kurze Erklärung max 60 Zeichen>" },
    { "label": "<Faktor>", "impact": "positive" | "negative" | "neutral", "detail": "<kurze Erklärung max 60 Zeichen>" },
    { "label": "<Faktor>", "impact": "positive" | "negative" | "neutral", "detail": "<kurze Erklärung max 60 Zeichen>" }
  ],
  "weeklyForecast": [
    { "day": "Mo", "level": "low" | "mid" | "high" },
    { "day": "Di", "level": "low" | "mid" | "high" },
    { "day": "Mi", "level": "low" | "mid" | "high" },
    { "day": "Do", "level": "low" | "mid" | "high" },
    { "day": "Fr", "level": "low" | "mid" | "high" },
    { "day": "Sa", "level": "low" | "mid" | "high" },
    { "day": "So", "level": "low" | "mid" | "high" }
  ],
  "regionalHotspots": ["<Stadt/Region 1>", "<Stadt/Region 2>", "<Stadt/Region 3>"]
}`;

  const res = await fetch("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      model:       "qwen-plus",
      messages:    [{ role: "user", content: prompt }],
      max_tokens:  800,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Qwen API HTTP ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Kein JSON in Qwen-Antwort");

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    recommendation:    parsed.recommendation ?? "ABWARTEN",
    trend:             parsed.trend ?? "stable",
    confidence:        Math.min(10, Math.max(1, Number(parsed.confidence) || 5)),
    summary:           parsed.summary ?? "Analyse nicht verfügbar.",
    politicalContext:  parsed.politicalContext ?? "",
    priceFactors:      Array.isArray(parsed.priceFactors) ? parsed.priceFactors.slice(0, 3) : [],
    weeklyForecast:    Array.isArray(parsed.weeklyForecast) ? parsed.weeklyForecast : [],
    regionalHotspots:  Array.isArray(parsed.regionalHotspots) ? parsed.regionalHotspots.slice(0, 3) : [],
  };
}

// ─── Demo-Fallback ────────────────────────────────────────────────────────────
function getDemoData(): Omit<BriefingResponse, "newsItems" | "articlesAnalyzed" | "generatedAt" | "source" | "ok"> {
  return {
    recommendation: "TANKEN EMPFOHLEN",
    trend: "down",
    confidence: 7,
    summary: "Rohöl (Brent) stabil bei ~82 USD/Barrel. Demo-Modus aktiv — konfiguriere DASHSCOPE_API_KEY für echte KI-Analyse.",
    politicalContext: "Keine aktuellen politischen Entwicklungen im Demo-Modus.",
    priceFactors: [
      { label: "Rohöl (Brent)", impact: "neutral", detail: "~82 USD/Barrel — seitwärts" },
      { label: "Euro/Dollar", impact: "positive", detail: "1,09 USD — stützend für Importe" },
      { label: "OPEC+ Kürzungen", impact: "negative", detail: "Angebotsdruck bleibt bestehen" },
    ],
    weeklyForecast: [
      { day: "Mo", level: "mid" },
      { day: "Di", level: "mid" },
      { day: "Mi", level: "low" },
      { day: "Do", level: "low" },
      { day: "Fr", level: "mid" },
      { day: "Sa", level: "high" },
      { day: "So", level: "high" },
    ],
    regionalHotspots: ["Bayern", "Baden-Württemberg", "NRW"],
  };
}

// ─── GET /api/briefing ────────────────────────────────────────────────────────
export async function GET() {
  // ── 1. Cache-Prüfung: Wenn frische Daten vorhanden, sofort zurück ────────
  const cached = getFromCache();
  if (cached) {
    console.log("[briefing] Cache-HIT — kein Qwen-Call");
    return NextResponse.json(
      { ok: true, ...cached },
      { headers: { "Cache-Control": cached.source === "ai"
        ? "public, s-maxage=1800, stale-while-revalidate=300"
        : "no-store", "X-Cache": "HIT" } }
    );
  }

  // ── 2. RSS Feeds parallel abrufen ─────────────────────────────────
  const feedResults = await Promise.allSettled(
    RSS_FEEDS.map((f) => fetchRSSItems(f.url, f.name))
  );
  const allNews: NewsItem[] = feedResults
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .slice(0, 12);

  // ── 3. Qwen AI Call (nur bei Cache-MISS) ────────────────────────
  let aiResult: Omit<BriefingResponse, "newsItems" | "articlesAnalyzed" | "generatedAt" | "source" | "ok">;
  let source: "ai" | "demo" = "demo";
  try {
    aiResult = await callQwen(allNews);
    source = "ai";
    console.log("[briefing] Qwen-CALL — Ergebnis wird 30 Min gecacht");
  } catch (err) {
    console.error("[briefing] Qwen error:", err);
    aiResult = getDemoData();
  }

  const responseData: Omit<BriefingResponse, "ok"> = {
    ...aiResult,
    newsItems: allNews,
    articlesAnalyzed: allNews.length,
    generatedAt: new Date().toISOString(),
    source,
  };

  // ── 4. In Cache speichern (nur bei AI-Antwort, nicht bei Demo-Fallback) ──
  if (source === "ai") setToCache(responseData);

  return NextResponse.json(
    { ok: true, ...responseData },
    { headers: { "Cache-Control": source === "ai"
      ? "public, s-maxage=1800, stale-while-revalidate=300"
      : "no-store", "X-Cache": "MISS" } }
  );
}
