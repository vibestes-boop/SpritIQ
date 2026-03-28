"use client";

import { Brain, TrendingDown, TrendingUp, Minus, RefreshCw, Sparkles, WifiOff, Clock, MapPin, ArrowUp, ArrowDown, ExternalLink, Zap, Landmark } from "lucide-react";

// Relative Zeit: "vor 2h" / "vor 3 Min"
function relativeTime(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1)  return "gerade eben";
    if (min < 60) return `vor ${min} Min`;
    const h = Math.floor(min / 60);
    if (h < 24)   return `vor ${h}h`;
    return `vor ${Math.floor(h / 24)}d`;
  } catch { return ""; }
}
import BottomNav from "@/components/ui/BottomNav";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useBriefing } from "@/hooks/useBriefing";
import type { PriceFactor, DayForecast } from "@/app/api/briefing/route";

function SkeletonBlock({ w = "100%", h = "16px" }: { w?: string; h?: string }) {
  return <div style={{ width: w, height: h, borderRadius: "6px", background: "#16161F", flexShrink: 0 }} />;
}

// ─── Wochenprognose-Bar-Chart ────────────────────────────────────────────────
function WeeklyForecastChart({ forecast }: { forecast: DayForecast[] }) {
  const levelHeight = { low: 28, mid: 48, high: 68 };
  const levelColor  = { low: "#22C55E", mid: "#F59E0B", high: "#EF4444" };
  const levelLabel  = { low: "günstig", mid: "mittel", high: "teuer" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "80px" }}>
        {forecast.map(({ day, level }) => (
          <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "100%", height: `${levelHeight[level]}px`, background: `rgba(${level === "low" ? "34,197,94" : level === "mid" ? "245,158,11" : "239,68,68"},0.2)`, border: `1px solid rgba(${level === "low" ? "34,197,94" : level === "mid" ? "245,158,11" : "239,68,68"},0.4)`, borderRadius: "6px 6px 0 0", transition: "all 300ms ease" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
        {forecast.map(({ day, level }) => (
          <div key={day} style={{ flex: 1, textAlign: "center" }}>
            <p style={{ fontSize: "11px", fontWeight: 600, color: levelColor[level] }}>{day}</p>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "12px", marginTop: "10px", justifyContent: "center" }}>
        {(["low", "mid", "high"] as const).map((l) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: levelColor[l] }} />
            <span style={{ fontSize: "10px", color: "#64748B" }}>{levelLabel[l]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Preis-Faktor-Karte ─────────────────────────────────────────────────────
function FactorCard({ factor }: { factor: PriceFactor }) {
  const Icon = factor.impact === "positive" ? ArrowDown : factor.impact === "negative" ? ArrowUp : Minus;
  const color = factor.impact === "positive" ? "#22C55E" : factor.impact === "negative" ? "#EF4444" : "#F59E0B";
  const bg    = factor.impact === "positive" ? "rgba(34,197,94,0.08)" : factor.impact === "negative" ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)";
  const hint  = factor.impact === "positive" ? "↓ Preis sinkt" : factor.impact === "negative" ? "↑ Preis steigt" : "→ stabil";

  return (
    <div style={{ background: bg, border: `1px solid ${color}22`, borderRadius: "12px", padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
        <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: `${color}18`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={13} color={color} />
        </div>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "#F8FAFC" }}>{factor.label}</p>
        <span style={{ marginLeft: "auto", fontSize: "10px", color, fontWeight: 600, background: `${color}18`, borderRadius: "4px", padding: "1px 6px" }}>{hint}</span>
      </div>
      <p style={{ fontSize: "11px", color: "#64748B", paddingLeft: "32px" }}>{factor.detail}</p>
    </div>
  );
}

// ─── Briefing Page ────────────────────────────────────────────────────────────
export default function BriefingPage() {
  const { data, loading, error, refresh } = useBriefing();

  const TrendIcon =
    data?.trend === "down" ? TrendingDown :
    data?.trend === "up"   ? TrendingUp   : Minus;

  const trendColor =
    data?.trend === "down" ? "#22C55E" :
    data?.trend === "up"   ? "#EF4444" : "#F59E0B";

  const recColor =
    data?.recommendation === "TANKEN EMPFOHLEN" ? "#22C55E" :
    data?.recommendation === "NICHT TANKEN"     ? "#EF4444" : "#F59E0B";

  const generatedTime = data?.generatedAt
    ? new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date(data.generatedAt))
    : null;

  return (
    <main className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "22px", fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.02em" }}>
            KI-Briefing
          </h1>
          <p style={{ fontSize: "12px", color: "#64748B" }}>
            {loading ? "Analyse läuft…" : data
              ? `Heute · ${generatedTime} · ${data.articlesAnalyzed} Artikel · ${data.source === "ai" ? "Qwen AI" : "Demo"}`
              : "Keine Daten"}
          </p>
        </div>
        <button onClick={refresh} style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#111118", border: "1px solid #1E1E2E", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} aria-label="Briefing aktualisieren">
          <RefreshCw size={16} color="#64748B" />
        </button>
      </header>

      <div className="flex-1 flex flex-col gap-4 px-4 py-2 animate-fade-in">

        {/* Fehler */}
        {error && (
          <Card style={{ padding: "16px" }}>
            <div className="flex items-center gap-3">
              <WifiOff size={20} color="#EF4444" />
              <div className="flex-1">
                <p style={{ color: "#EF4444", fontWeight: 600, fontSize: "14px" }}>Verbindungsfehler</p>
                <p style={{ color: "#64748B", fontSize: "12px" }}>{error}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={refresh}>Retry</Button>
            </div>
          </Card>
        )}

        {/* Demo/AI Badge */}
        {!loading && data?.source === "demo" && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "10px" }}>
            <Clock size={14} color="#F59E0B" />
            <p style={{ fontSize: "12px", color: "#F59E0B" }}>Demo-Modus — konfiguriere DASHSCOPE_API_KEY für echte KI-Analyse</p>
          </div>
        )}
        {!loading && data?.source === "ai" && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "10px" }}>
            <Sparkles size={14} color="#22C55E" />
            <p style={{ fontSize: "12px", color: "#22C55E" }}>Echte KI-Analyse · {data.articlesAnalyzed} Artikel aus {new Set(data.newsItems.map(n => n.source)).size} Quellen</p>
          </div>
        )}

        {/* ── Haupt-Empfehlung ── */}
        <Card variant="glass" glow={loading ? "none" : data?.recommendation === "TANKEN EMPFOHLEN" ? "accent" : data?.recommendation === "NICHT TANKEN" ? "bad" : "warn"} style={{ padding: "20px" }}>
          {loading ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#16161F", flexShrink: 0 }} />
                <div className="flex flex-col gap-2 flex-1">
                  <SkeletonBlock w="70%" h="20px" />
                  <SkeletonBlock w="40%" h="12px" />
                </div>
              </div>
              <SkeletonBlock h="14px" />
              <SkeletonBlock w="90%" h="14px" />
            </div>
          ) : data ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: `rgba(${data.recommendation === "TANKEN EMPFOHLEN" ? "34,197,94" : data.recommendation === "NICHT TANKEN" ? "239,68,68" : "245,158,11"},0.12)`, border: `1px solid rgba(${data.recommendation === "TANKEN EMPFOHLEN" ? "34,197,94" : data.recommendation === "NICHT TANKEN" ? "239,68,68" : "245,158,11"},0.25)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Brain size={22} color={recColor} />
                </div>
                <div>
                  <p style={{ fontSize: "11px", color: "#64748B", marginBottom: "2px" }}>SpritIQ Empfehlung</p>
                  <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", fontWeight: 700, color: recColor }}>{data.recommendation}</p>
                </div>
              </div>
              <p style={{ fontSize: "14px", color: "#94A3B8", lineHeight: 1.7 }}>{data.summary}</p>
            </div>
          ) : null}
        </Card>

        {/* ── Trend + Konfidenz ── */}
        <div style={{ display: "flex", gap: "8px" }}>
          <Card variant="flat" style={{ flex: 1, padding: "14px" }}>
            <p style={{ fontSize: "11px", color: "#64748B", marginBottom: "6px" }}>TREND</p>
            {loading ? <SkeletonBlock h="24px" w="80%" /> : (
              <div className="flex items-center gap-2">
                <TrendIcon size={20} color={trendColor} />
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "15px", fontWeight: 700, color: trendColor }}>
                  {data?.trend === "down" ? "Fallend" : data?.trend === "up" ? "Steigend" : "Stabil"}
                </span>
              </div>
            )}
          </Card>
          <Card variant="flat" style={{ flex: 1, padding: "14px" }}>
            <p style={{ fontSize: "11px", color: "#64748B", marginBottom: "6px" }}>KONFIDENZ</p>
            {loading ? <SkeletonBlock h="24px" w="60%" /> : (
              <div>
                <div className="flex items-baseline gap-1" style={{ marginBottom: "8px" }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "22px", fontWeight: 700, color: "#F8FAFC" }}>{data?.confidence ?? "–"}</span>
                  <span style={{ fontSize: "14px", color: "#64748B" }}>/10</span>
                </div>
                {data?.confidence && (
                  <div style={{ height: "4px", borderRadius: "2px", background: "#1E1E2E", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${(data.confidence / 10) * 100}%`,
                      borderRadius: "2px",
                      background: data.confidence >= 7 ? "#22C55E" : data.confidence >= 4 ? "#F59E0B" : "#EF4444",
                      transition: "width 600ms ease",
                    }} />
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* ── Wochenprognose ── */}
        <Card variant="flat" style={{ padding: "16px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "14px" }}>📅 Wochenprognose</p>
          {loading ? (
            <div style={{ display: "flex", gap: "6px", alignItems: "flex-end", height: "80px" }}>
              {[50, 70, 40, 40, 60, 80, 80].map((h, i) => <div key={i} style={{ flex: 1, height: `${h}px`, borderRadius: "6px 6px 0 0", background: "#16161F" }} />)}
            </div>
          ) : data?.weeklyForecast && data.weeklyForecast.length > 0 ? (
            <WeeklyForecastChart forecast={data.weeklyForecast} />
          ) : (
            <p style={{ fontSize: "12px", color: "#475569", textAlign: "center" }}>Prognose nicht verfügbar</p>
          )}
        </Card>

        {/* ── Preiseinflussfaktoren ── */}
        {(loading || (data?.priceFactors && data.priceFactors.length > 0)) && (
          <div>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "11px", fontWeight: 600, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px", paddingLeft: "4px" }}>
              <Zap size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} /> Preiseinflussfaktoren
            </p>
            {loading ? (
              <div className="flex flex-col gap-2">
                {[0, 1, 2].map((i) => <div key={i} style={{ height: "60px", borderRadius: "12px", background: "#111118", border: "1px solid #1E1E2E" }} />)}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {(data?.priceFactors ?? []).map((f, i) => <FactorCard key={i} factor={f} />)}
              </div>
            )}
          </div>
        )}

        {/* ── Politischer Kontext ── */}
        {(loading || data?.politicalContext) && (
          <Card variant="flat" style={{ padding: "14px 16px" }}>
            <p style={{ fontSize: "11px", color: "#3B82F6", fontWeight: 600, letterSpacing: "0.05em", marginBottom: "6px" }}><Landmark size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} /> POLITIK</p>
            {loading ? <div className="flex flex-col gap-2"><SkeletonBlock h="13px" /><SkeletonBlock w="70%" h="13px" /></div> : (
              <p style={{ fontSize: "13px", color: "#94A3B8", lineHeight: 1.6 }}>{data?.politicalContext}</p>
            )}
          </Card>
        )}

        {/* ── Regionale Hotspots ── */}
        {(loading || (data?.regionalHotspots && data.regionalHotspots.length > 0)) && (
          <Card variant="flat" style={{ padding: "14px 16px" }}>
            <p style={{ fontSize: "11px", color: "#22C55E", fontWeight: 600, letterSpacing: "0.05em", marginBottom: "10px" }}><MapPin size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} /> GÜNSTIGSTE REGIONEN</p>
            {loading ? (
              <div className="flex gap-2">{[0, 1, 2].map((i) => <div key={i} style={{ height: "28px", flex: 1, borderRadius: "8px", background: "#16161F" }} />)}</div>
            ) : (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {(data?.regionalHotspots ?? []).map((region, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "8px", padding: "5px 10px" }}>
                    <MapPin size={11} color="#22C55E" />
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#22C55E" }}>#{i + 1} {region}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* ── News-Quellen ── */}
        <div>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "11px", fontWeight: 600, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px", paddingLeft: "4px" }}>
            📰 Analysierte Quellen
          </p>
          <div className="flex flex-col gap-2">
            {loading ? [0, 1, 2].map((i) => (
              <div key={i} style={{ height: "80px", borderRadius: "12px", background: "#111118", border: "1px solid #1E1E2E" }} />
            )) : (data?.newsItems ?? []).map((item, i) => (
              <a
                key={i}
                href={item.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none", display: "block" }}
              >
                <div style={{
                  padding: "12px 14px",
                  background: "#111118",
                  border: "1px solid #1E1E2E",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "border-color 150ms, background 150ms",
                }}>
                  <div className="flex items-start gap-3">
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", background: "#16161F", border: "1px solid #2A2A3C", borderRadius: "5px", padding: "2px 7px", flexShrink: 0, marginTop: "1px" }}>
                      {item.source}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "13px", color: "#F8FAFC", lineHeight: 1.4 }}>{item.title}</p>
                      {item.summary && (
                        <p style={{ fontSize: "11px", color: "#64748B", marginTop: "4px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {item.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-2" style={{ marginTop: "6px" }}>
                        {item.publishedAt && (
                          <span style={{ fontSize: "10px", color: "#475569" }}>
                            <Clock size={9} style={{ display: "inline", marginRight: "2px", verticalAlign: "middle" }} />
                            {relativeTime(item.publishedAt)}
                          </span>
                        )}
                        {item.url && (
                          <span style={{ fontSize: "10px", color: "#3B82F6", display: "flex", alignItems: "center", gap: "2px" }}>
                            <ExternalLink size={9} />
                            Artikel öffnen
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            ))}
            {!loading && (!data?.newsItems || data.newsItems.length === 0) && (
              <p style={{ fontSize: "13px", color: "#64748B", textAlign: "center", padding: "16px" }}>Keine relevanten Nachrichten gefunden</p>
            )}
          </div>
        </div>

        <div style={{ height: "8px" }} />
      </div>

      <BottomNav />
    </main>
  );
}
