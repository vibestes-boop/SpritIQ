# SpritIQ — Strategischer Gesamtplan
*Version 1.1 — Stand: 26.03.2026*

> Die erste deutsche Spritpreis-App die nicht nur Preise anzeigt,
> sondern **erklärt, analysiert, vorhersagt und personalisiert** —
> powered by Qwen 3.5 AI + Echtzeit-Nachrichten.

---

## Kern-Versprechen
> *"SpritIQ sagt dir nicht nur was Sprit kostet — es sagt dir WARUM, WOHIN und WANN."*

---

## 1. UI/UX-Philosophie — Unser stärkster Vorteil

> *"Der UI macht aus ob die Kunden bleiben. Das ist wie die Liebe auf ersten Blick."*

Clever-Tanken sieht aus wie 2015. ADAC Drive ist überladen.
Wir bauen etwas das sich sofort richtig anfühlt.

### Prinzip: Radical Simplicity
```
Alte App-Logik:   Nutzer öffnet App → sucht Info → liest → entscheidet
SpritIQ-Logik:    Nutzer öffnet App → Antwort ist bereits da
```
Jeder Screen hat **eine Kernaussage**. Nicht drei. Eine.

---

### Design-System

#### Farben
```
Hintergrund:  #0A0A0F   (Fast-Schwarz — Premium)
Surface:      #111118   (Cards, Panels)
Border:       #1E1E2E   (Subtile Trennung)
Accent:       #22C55E   (Grün = Tanken empfohlen)
Warn:         #F59E0B   (Amber = Abwarten)
Bad:          #EF4444   (Rot = Nicht tanken)
Text:         #F8FAFC
Text Muted:   #64748B
Highlight:    #3B82F6
```

#### Typografie
```
Headlines:  "Space Grotesk" (Google Fonts)
Body:       "Inter"
Zahlen:     "JetBrains Mono"
```

#### Shape & Radius
```
Cards:    rounded-2xl  (16px)
Buttons:  rounded-xl   (12px)
Tags:     rounded-full
```

---

### Die 5 UI-Flows die Kunden halten

#### 1. Erster Blick (≤ 3 Sekunden)
```
┌─────────────────────────────────┐
│  🟢 TANKEN EMPFOHLEN            │  ← Sofort-Antwort, groß
│  Diesel heute 3ct günstiger     │  ← Begründung, 1 Zeile
│                                 │
│  Günstigste in der Nähe:        │
│  ⚡ Shell Musterstr.  1,729 €   │
│  📍 1,2 km entfernt             │
│                                 │
│  [  Zur Karte  ]  [ Mehr Info ] │
└─────────────────────────────────┘
```
**Kein Login. Kein Onboarding. Kein Scrollen.**

#### 2. Karte — anders als alle anderen
- Preise direkt am Marker: "1,72€" statt "Tankstelle"
- Farbkodierung: 🟢 günstig / 🟡 mittel / 🔴 teuer
- Antippen → Bottom Sheet von unten (keine neue Seite)
- Cluster bei vielen Stationen, aufzoom = aufgeklappt

#### 3. Spracheingabe — der Gamechanger
```
User sagt: "Wo ist günstigster Diesel in 5km?"
→ Karte fokussiert sofort
→ Sprachantwort: "Shell Hauptstr., 1,72€ — 2,1km"
→ "Navigieren?" Button erscheint
```
Technologie: **Web Speech API** (kostenlos, browser-nativ)

#### 4. Widget — täglich sichtbar
```
┌──────────────┐
│  SpritIQ     │
│  🟢 TANKEN   │
│  1,729 €/L   │
│  Diesel ↓ 2ct│
└──────────────┘
```
PWA → Homescreen → Widget-ähnlich. Langfristig: Capacitor Native Widget.

#### 5. AI-Briefing — kompakt, klar
```
┌──────────────────────────────────────┐
│ 🤖 SpritIQ analysierte 47 Artikel   │
│                                      │
│ "Rohöl +2% wegen OPEC. Bundestag    │
│  stimmt heute über Spritsteuer ab."  │
│                                      │
│ Trend: ↑ Steigend   Konfidenz: 7/10 │
│ Empfehlung:  ← HEUTE TANKEN →       │
└──────────────────────────────────────┘
```

---

### Mobile-First
1. Daumen-Zone: Alle Buttons im unteren Drittel
2. Bottom Navigation: 4 Tabs — Home / Karte / Briefing / Einstellungen
3. Touch-Targets min. 44px
4. Swipe-Gesten auf Cards
5. Pull-to-Refresh für Preise

### Was wir NICHT machen
| Konkurrenz | SpritIQ |
|-----------|---------|
| 5 Tabs + Hamburger | 4 klare Bottom-Tabs |
| Login-Pflicht | Sofort nutzbar |
| Preisliste mit 15 Einträgen | Top 3 + Karte |
| Popups sofort | Permissions erst wenn relevant |
| Textblöcke | Icons + 1 Satz |

---

## 2. Features — Vollständige Liste

### Phase 1 — MVP (Woche 1–6)
| # | Feature | Beschreibung |
|---|---------|--------------|
| 1 | Preis-Karte | Leaflet + OSM, Tanks in der Nähe |
| 2 | Preisliste | Sortierbar nach Preis/Entfernung |
| 3 | Fahrzeugprofil | Verbrauch, Tankgröße, Kraftstoff (localStorage) |
| 4 | Umweg-Rechner | Lohnt sich der Umweg? (Formel: Sparpotenzial - Extrasprit) |
| 5 | AI Daily Briefing | 07:00 Uhr: Qwen 3.5 + RSS + EIA → JSON |
| 6 | "Jetzt tanken?" | Ja/Nein + 1-Satz-Begründung |
| 7 | Preis-Alarm | Web Push wenn Preis < Schwellwert |
| 8 | Europa-Vergleich | DE/AT/CH/LU/FR Preistabelle |
| 9 | Spracheingabe | Web Speech API → Tankstellen-Suche |

### Phase 2 (Woche 7–12)
| # | Feature | Beschreibung |
|---|---------|--------------|
| 10 | Route-Suche | A→B → günstigste Tankstelle entlang der Route (OSRM) |
| 11 | Stündliche Prognose | Tageszeit-Muster + News-Sentiment |
| 12 | News-Feed | RSS gefiltert, AI-Summary je Artikel |
| 13 | Preisvalidierung | User meldet falschen Preis → AI prüft |
| 14 | Monats-Report | Wie viel getankt/gespart vs. Durchschnitt |

### Phase 3 (Monat 4+)
| # | Feature | Beschreibung |
|---|---------|--------------|
| 15 | E-Auto Ladepreise | Toggle: Sprit / Strom |
| 16 | Homescreen-Widget | PWA → native Widget via Capacitor |
| 17 | Telegram-Bot | Wöchentliches Briefing (kostenlos) |
| 18 | B2B API | Für Flotten, Taxi, Lieferdienste (49–199€/Mo) |

---

## 3. Tech-Stack

| Layer | Tool | Begründung |
|-------|------|-----------|
| Framework | Next.js 14 (App Router) | SSR, SEO, du kennst es |
| Styling | Tailwind CSS | Schnell, du kennst es |
| Karte | Leaflet.js + OpenStreetMap | 100% kostenlos |
| Geocoding | Nominatim | Kostenlos, OS |
| Routing | OSRM | Kostenlos, OS |
| Datenbank | Supabase (PostgreSQL) | Free-Tier reicht |
| Cronjob | Vercel Cron | Gratis, integriert |
| AI | Qwen 3.5 via DashScope API | OpenAI-kompatibel, günstig |
| Push | Web Push VAPID | Browser-nativ, kostenlos |
| Sprache | Web Speech API | Browser-nativ, kostenlos |
| Hosting | Vercel | Kostenlos, Auto-Deploy |

### Kosten MVP
```
Vercel:         0€
Supabase:       0€
Alle APIs:      0€
Qwen 3.5:    ~2€/Monat
Domain:      ~1€/Monat
─────────────────────
GESAMT:      ~3€/Monat
```

---

## 4. AI-Pipeline

```
Cron 06:30 Uhr täglich
    │
    ├── Tankerkönig → Ø Preis DE
    ├── EIA API → Rohöl WTI/Brent
    ├── RSS-Feeds → Artikel letzte 12h
    │       └── Keyword-Filter: sprit, diesel, opec, bundestag...
    │
    └── Qwen 3.5 Prompt:
        "Analysiere Nachrichten + Rohölkurs.
         Gib JSON zurück:
         { summary, trend, recommendation,
           recommendation_text, confidence,
           political_context }"
         │
         └── Supabase speichern → User sieht Briefing
```

### Umweg-Rechner Formel
```javascript
const sparpotenzial = tankvolumen * preisdifferenz_pro_liter
const extrasprit    = (umweg_km / 100) * verbrauch * aktuellerPreis
const netto         = sparpotenzial - extrasprit

// → "Du sparst 2,40€" ODER "Kostet dich 1,10€ mehr"
```

---

## 5. Monetarisierung

| Phase | Kanal | Erwartung |
|-------|-------|-----------|
| 1 | Google AdSense (KFZ-CPM hoch) | €200–500/Mo bei 10k MAU |
| 2 | CHECK24 Affiliate (KFZ-Versicherung) | 15–80€/Lead |
| 3 | Premium Abo 1,99€/Mo | 400€/Mo bei 10k Nutzern |
| 4 | B2B API 49–199€/Mo | Stabile Einnahmen |

---

## 6. 8-Wochen-Roadmap

### Woche 1 — Fundament
- [ ] Domain spritiq.de registrieren
- [ ] API-Keys holen (Tankerkönig, EIA, Qwen, Supabase)
- [ ] Next.js aufsetzen, Tailwind konfigurieren
- [ ] Design-System: Farben, Fonts, Komponenten

### Woche 2 — Karte & Preise
- [ ] Tankerkönig API-Route `/api/prices`
- [ ] Leaflet Karte mit GPS + Marker
- [ ] Preisliste sortierbar
- [ ] Fuel-Type Toggle (E5/E10/Diesel)

### Woche 3 — Fahrzeugprofil & Umweg
- [ ] Fahrzeugprofil Formular (localStorage)
- [ ] Umweg-Rechner Logik
- [ ] "Lohnt sich?" Button + Ergebnis-Modal

### Woche 4 — AI-Pipeline
- [ ] RSS-Parser (alle 7 Feeds)
- [ ] Keyword-Filter
- [ ] EIA Rohöl-Integration
- [ ] Qwen 3.5 Prompt + Supabase speichern
- [ ] Vercel Cron 06:30 Uhr

### Woche 5 — AI-Frontend
- [ ] Daily Briefing Widget
- [ ] News-Feed Seite
- [ ] Europa-Preisvergleich
- [ ] Preis-Alarm + Web Push

### Woche 6 — Sprache & Polish
- [ ] Web Speech API Integration
- [ ] Mikrofon-Button + Sprach-Antwort
- [ ] Performance (Caching, Core Web Vitals)
- [ ] SEO (Stadtseiten, Sitemap, OG-Tags)
- [ ] DSGVO Cookie-Banner

### Woche 7–8 — Launch & Wachstum
- [ ] Google AdSense einbinden
- [ ] Vercel Deploy → spritiq.de live
- [ ] Google Search Console
- [ ] Erste Presse-Outreach
- [ ] Feedback sammeln, Bugs fixen

---

## 7. Wettbewerbs-Vorteil (Zusammenfassung)

| Kriterium | Clever-Tanken | ADAC Drive | SpritIQ |
|-----------|--------------|------------|---------|
| KI-Erklärungen | ❌ | ❌ | ✅ |
| Spracheingabe | ❌ | ❌ | ✅ |
| Widget | ❌ | ❌ | ✅ |
| Dark Premium UI | ❌ | ❌ | ✅ |
| News-Analyse | ❌ | ❌ | ✅ |
| Umweg-Rechner | ❌ | ❌ | ✅ |
| Sofort nutzbar | Nein | Nein | ✅ |

---

*Datei: docs/MASTERPLAN.md — wird laufend aktualisiert.*
