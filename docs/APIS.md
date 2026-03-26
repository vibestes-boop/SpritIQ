# SpritIQ — API Referenz
*Alle APIs verifiziert am 26.03.2026*

🟢 = kostenlos, kein Key  |  🟡 = kostenlos mit Key  |  🔴 = Free-Tier begrenzt

---

## SPRITPREISE

### 🟡 Tankerkönig (Primär)
- **URL:** https://creativecommons.tankerkoenig.de/
- **Key:** kostenlos beantragen (1–2 Tage)
- **Update:** alle 5 Minuten
- **Endpoint:** `GET .../json/list.php?lat=52.52&lng=13.40&rad=5&sort=dist&type=all&apikey=KEY`

---

## KARTE & ROUTING

### 🟢 Leaflet.js + OpenStreetMap
- `npm install leaflet`
- Tiles: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- Kein Key, kein Limit (Fair Use)

### 🟢 OSRM — Routing A→B
- **URL:** https://router.project-osrm.org/
- **Endpoint:** `GET .../route/v1/driving/13.38,52.51;13.39,52.52?overview=false`
- Kein Key, für MVP ausreichend

### 🟢 Nominatim — Geocoding
- **URL:** https://nominatim.openstreetmap.org/
- **Endpoint:** `GET .../search?q=Berlin&format=json&limit=1`
- Max 1 Req/Sek, User-Agent Pflicht

---

## ROHÖL-PREISE

### 🟡 EIA (Primär — täglich)
- **URL:** https://api.eia.gov/v2/petroleum/pri/spt/data/
- **Key:** sofort gratis → https://www.eia.gov/opendata/
- WTI + Brent, täglich aktualisiert

### 🔴 crudepriceapi.com (Backup — 5-Min)
- **URL:** https://crudepriceapi.com/
- Free-Tier vorhanden, ausreichend für 1x/Tag

---

## STROMPREISE

### 🟢 SMARD — Bundesnetzagentur
- **API:** `https://www.smard.de/app/chart_data/{filter}/{region}/{res}_{ts}.json`
- Kein Key, CC BY 4.0
- Börsenstrompreis stündlich

---

## EUROPA-PREISE

### 🟢 EU Weekly Oil Bulletin
- **URL:** https://energy.ec.europa.eu/topics/oil-gas-and-coal/weekly-oil-bulletin_en
- CSV/Excel, wöchentlich (montags), kein Key

### 🟢 ECB Wechselkurse
- **Endpoint:** `https://data-api.ecb.europa.eu/service/data/EXR/D.CHF.EUR.SP00.A?format=json`
- Täglich, kein Key

---

## NACHRICHTEN (RSS)

```
# Kein Key, kein Limit
Tagesschau:   https://www.tagesschau.de/xml/rss2/
Spiegel:      https://www.spiegel.de/wirtschaft/index.rss
Handelsblatt: https://www.handelsblatt.com/contentexport/feed/schlagzeilen
n-tv:         https://www.n-tv.de/wirtschaft/rss
FAZ:          https://www.faz.net/rss/aktuell/wirtschaft/
ADAC:         https://www.adac.de/rss/kraftstoffpreise/
Zeit:         https://newsfeed.zeit.de/wirtschaft/index
```

```bash
npm install rss-parser
```

### 🟡 GNews (Backup)
- **URL:** https://gnews.io/
- Free: 100 Req/Tag
- `GET .../v4/search?q=spritpreise&lang=de&country=de&token=KEY`

---

## E-AUTO LADESTATIONEN

### 🟡 Open Charge Map
- **URL:** https://openchargemap.org/site/develop/api
- **Key:** sofort gratis → https://openchargemap.org/site/profile/applications
- `GET https://api.openchargemap.io/v3/poi/?countrycode=DE&latitude=52.52&longitude=13.40&distance=5&key=KEY`

---

## AI / SPRACHMODELL

### 🟡 Qwen 3.5 via DashScope (OpenAI-kompatibel!)
- **URL:** https://dashscope.aliyuncs.com/compatible-mode/v1
- **Key:** https://dashscope.aliyuncs.com/
- `npm install openai` (gleiche Library wie OpenAI)
- Modell: `qwen3.5-72b-instruct`
- Kosten: ~0,001–0,003€ / 1000 Token ≈ **2€/Monat**

```typescript
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
})

const response = await client.chat.completions.create({
  model: 'qwen3.5-72b-instruct',
  messages: [{ role: 'user', content: 'Analysiere...' }]
})
```

### 🟡 Ollama (lokal für Development)
- **URL:** https://ollama.ai/
- `ollama pull qwen3.5:7b`
- 100% kostenlos, kein externer Call

---

## PUSH-NOTIFICATIONS

### 🟢 Web Push VAPID (Browser-nativ)
```bash
npm install web-push
npx web-push generate-vapid-keys  # einmalig
```
Kein Service nötig — läuft direkt. Safari iOS 16.4+

---

## SPRACHEINGABE

### 🟢 Web Speech API
```typescript
const recognition = new (window as any).SpeechRecognition()
recognition.lang = 'de-DE'
recognition.onresult = (event) => {
  const text = event.results[0][0].transcript
  // → "günstigster Diesel in 5km"
}
recognition.start()
```
Browser-nativ, kostenlos, kein Key.

---

## DATENBANK & AUTH

### 🟡 Supabase
- **URL:** https://supabase.com/
- Free: 500MB DB, 50k MAU
- `npm install @supabase/supabase-js`

---

## HOSTING

### 🟡 Vercel
- Free: 100GB Bandwidth, Serverless, **2 Cron Jobs/Tag**
- Perfekt für tägliches AI-Briefing

---

## Kosten-Übersicht

| Service | €/Monat |
|---------|---------|
| Alle APIs | 0€ |
| Supabase | 0€ |
| Vercel | 0€ |
| Qwen 3.5 | ~2€ |
| Domain | ~1€ |
| **GESAMT** | **~3€** |

## Registrierungs-Reihenfolge

1. **Sofort:** EIA → https://www.eia.gov/opendata/
2. **Sofort:** DashScope (Qwen) → https://dashscope.aliyuncs.com/
3. **Sofort:** Supabase → https://supabase.com/
4. **Sofort:** Open Charge Map → https://openchargemap.org/site/profile/applications
5. **1–2 Tage:** Tankerkönig → https://creativecommons.tankerkoenig.de/
6. **Beim Setup:** GNews → https://gnews.io/
