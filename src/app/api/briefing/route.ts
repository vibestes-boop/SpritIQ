import { NextRequest, NextResponse } from "next/server";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface NewsItem {
  source: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
}

export interface BriefingResponse {
  ok: boolean;
  recommendation: "TANKEN EMPFOHLEN" | "ABWARTEN" | "NICHT TANKEN";
  trend: "up" | "down" | "stable";
  confidence: number; // 1-10
  summary: string;
  politicalContext: string;
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

Analysiere folgende aktuelle Nachrichtenartikel und erstelle eine Empfehlung ob Deutsche Autofahrer jetzt tanken sollten oder warten:

${newsText || "Keine aktuellen Nachrichten gefunden."}

Antworte NUR mit einem validen JSON-Objekt in diesem Format (kein Markdown, kein Text davor/danach):
{
  "recommendation": "TANKEN EMPFOHLEN" | "ABWARTEN" | "NICHT TANKEN",
  "trend": "up" | "down" | "stable",
  "confidence": <Zahl 1-10>,
  "summary": "<2-3 Sätze Zusammenfassung der Marktlage auf Deutsch, max 200 Zeichen>",
  "politicalContext": "<1 Satz zu politischen/regulatorischen Entwicklungen auf Deutsch, max 150 Zeichen>"
}`;

  const res = await fetch("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      model:      "qwen-plus",
      messages:   [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Qwen API HTTP ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  // JSON aus Response extrahieren
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Kein JSON in Qwen-Antwort");

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    recommendation: parsed.recommendation ?? "ABWARTEN",
    trend:          parsed.trend ?? "stable",
    confidence:     Math.min(10, Math.max(1, Number(parsed.confidence) || 5)),
    summary:        parsed.summary ?? "Analyse nicht verfügbar.",
    politicalContext: parsed.politicalContext ?? "",
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
  };
}

// ─── GET /api/briefing ────────────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  // RSS Feeds parallel abrufen
  const feedResults = await Promise.allSettled(
    RSS_FEEDS.map((f) => fetchRSSItems(f.url, f.name))
  );

  const allNews: NewsItem[] = feedResults
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .slice(0, 12); // Max 12 Artikel für Prompt

  let aiResult: Omit<BriefingResponse, "newsItems" | "articlesAnalyzed" | "generatedAt" | "source" | "ok">;
  let source: "ai" | "demo" = "demo";

  try {
    aiResult = await callQwen(allNews);
    source = "ai";
  } catch (err) {
    console.error("[briefing] Qwen error:", err);
    aiResult = getDemoData();
  }

  const response: BriefingResponse = {
    ok: true,
    ...aiResult,
    newsItems: allNews,
    articlesAnalyzed: allNews.length,
    generatedAt: new Date().toISOString(),
    source,
  };

  return NextResponse.json(response, {
    headers: {
      // 30 Minuten Cache — täglich reicht, aber auch stündlich ok
      "Cache-Control": source === "ai"
        ? "public, s-maxage=1800, stale-while-revalidate=300"
        : "no-store",
    },
  });
}
