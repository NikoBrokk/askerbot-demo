# News Crawler Guide - 3 måneders nyhetscrawling

## Oversikt

Denne guiden beskriver hvordan du bruker den nye `crawl-news-3months.js` scriptet for å crawle nyhetsartikler fra Asker Fotball de siste 3 månedene med omfattende kvalitetskontroll.

## Funksjonalitet

### 🔍 **Hva scriptet gjør:**

1. **Crawler hovedsiden** (`/nyheter`) for å finne alle nyhetsartikler
2. **Sjekker for duplikater** mot eksisterende allowlist.json
3. **Validerer kvalitet** på hver artikkel
4. **Filtrerer ut feilmeldinger** og irrelevante sider
5. **Sjekker alder** - kun artikler fra siste 3 måneder
6. **Lagrer resultater** i strukturert format

### 🛡️ **Kvalitetskontroll:**

- **Feilmelding-deteksjon**: Filtrerer ut 404, 500, og andre feilsider
- **Innholdskvalitet**: Sjekker minimum lengde og relevans
- **Nyhetsindikatorer**: Identifiserer ekte nyhetsartikler
- **Asker Fotball-relatert innhold**: Prioriterer relevant innhold
- **Datostrukturer**: Sjekker for publiseringsdatoer
- **Kvalitetsscore**: 0-100 score basert på multiple faktorer

## Bruk

### 1. **Kjør scriptet:**

```bash
cd /Users/nikolaigabrielsen/Downloads/askerbot-demo
node scripts/crawl-news-3months.js
```

### 2. **Overvåk prosessen:**

Scriptet vil vise:
- ✅ Suksessfulle artikler med kvalitetsscore
- ❌ Avviste artikler med årsak
- ⏭️ Duplikater som hoppes over
- 📊 Samlet statistikk

### 3. **Sjekk resultater:**

Resultatene lagres i:
- `storage/raw/news-crawl-results.json` - Komplett resultat
- `storage/logs/news-crawl.jsonl` - Loggfil

## Konfigurasjon

### **Tilpassbare innstillinger:**

```javascript
this.config = {
  baseUrl: 'https://askerfotball.no',
  newsPath: '/nyheter',
  timeout: 15000,           // 15 sekunder timeout
  maxRetries: 3,            // 3 forsøk per URL
  retryDelay: 2000,         // 2 sekunder mellom forsøk
  maxAgeDays: 90,           // 3 måneder (90 dager)
  batchSize: 10,            // 10 URLer per batch
  delayBetweenBatches: 1000 // 1 sekund mellom batches
};
```

### **Kvalitetskriterier:**

```javascript
// Minimum kvalitetsscore for godkjent artikkel
validation.score < 50  // Avvis hvis under 50%

// Minimum innholdslengde
textContent.length < 100  // Avvis hvis under 100 tegn

// Feilmelding-mønstre som avvises
/404.*not found/i
/500.*internal server error/i
/page not found/i
/siden finnes ikke/i
```

## Resultatformat

### **JSON-struktur:**

```json
{
  "crawledAt": "2025-01-16T10:30:00.000Z",
  "config": { /* konfigurasjon */ },
  "summary": {
    "totalFound": 45,
    "totalErrors": 3,
    "averageQualityScore": 78.5,
    "dateRange": "Last 3 months"
  },
  "articles": [
    {
      "url": "https://askerfotball.no/nyheter/kamp-oppdatering",
      "title": "Kamp oppdatering - Asker Fotball",
      "publishedDate": "15.01.2025",
      "qualityScore": 85,
      "type": "news",
      "wordCount": 250,
      "html": "...",
      "crawledAt": "2025-01-16T10:30:00.000Z"
    }
  ],
  "errors": [
    {
      "url": "https://askerfotball.no/nyheter/feil-side",
      "error": "Low quality content",
      "issues": ["Content too short", "Error pattern detected"],
      "score": 25
    }
  ],
  "duplicatesSkipped": 12
}
```

## Integrasjon med eksisterende system

### **1. Oppdater allowlist.json:**

```bash
# Kjør crawler
node scripts/crawl-news-3months.js

# Hent nye URLer fra resultatet
node scripts/update-allowlist-from-crawl.js
```

### **2. Automatisk integrasjon:**

```javascript
// I din eksisterende pipeline
const crawler = require('./scripts/crawl-news-3months');
const NewsCrawler3Months = crawler;

const crawler = new NewsCrawler3Months();
const results = await crawler.run();

// Integrer nye artikler i allowlist
const newUrls = results.articles.map(article => article.url);
// Legg til i allowlist.json
```

## Feilsøking

### **Vanlige problemer:**

1. **Timeout-feil:**
   ```
   Error: Request timeout
   ```
   - Øk `timeout` i konfigurasjonen
   - Sjekk nettverksforbindelse

2. **For mange feil:**
   ```
   Low quality content
   ```
   - Sjekk om siden har endret struktur
   - Juster kvalitetskriterier

3. **Ingen artikler funnet:**
   ```
   Found 0 potential news URLs
   ```
   - Sjekk om `/nyheter` siden er tilgjengelig
   - Verifiser at URL-mønstre er korrekte

### **Debug-modus:**

```javascript
// Aktiver detaljert logging
this.config.debug = true;
this.config.verbose = true;
```

## Vedlikehold

### **Regelmessig kjøring:**

```bash
# Kjør månedlig for å holde nyhetsarkivet oppdatert
0 2 1 * * cd /path/to/askerbot-demo && node scripts/crawl-news-3months.js
```

### **Overvåking:**

- Sjekk `storage/logs/news-crawl.jsonl` for feil
- Overvåk kvalitetsscore over tid
- Juster konfigurasjon basert på resultater

## Ytelse

### **Estimert tid:**
- **50 artikler**: ~2-3 minutter
- **100 artikler**: ~5-7 minutter
- **200+ artikler**: ~10-15 minutter

### **Ressursbruk:**
- **Minne**: ~50-100MB
- **Nettverk**: ~1-5MB avhengig av artikler
- **CPU**: Lav (hovedparten er I/O)

## Sikkerhet

### **Rate limiting:**
- 1 sekund pause mellom batches
- 2 sekunder mellom retry-forsøk
- Respekterer server-ressurser

### **User-Agent:**
```
Askerbot-NewsCrawler/1.0 (+https://askerfotball.no)
```

### **Feilhåndtering:**
- Graceful degradation ved feil
- Detaljert logging av alle feil
- Ingen krasj ved nettverksproblemer

## Fremtidige forbedringer

### **Planlagte funksjoner:**
- [ ] Støtte for paginering
- [ ] Caching av tidligere resultater
- [ ] Automatisk oppdatering av allowlist
- [ ] Webhook-integrasjon
- [ ] Grafisk dashboard for overvåking

### **Konfigurerbare alternativer:**
- [ ] Tilpassbare kvalitetskriterier
- [ ] Forskjellige datoformater
- [ ] Støtte for andre nyhetssider
- [ ] Avanserte filtreringsregler
