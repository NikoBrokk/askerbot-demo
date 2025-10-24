# Scheduled Crawler Guide - Automatisk Morgen-Crawling

## Oversikt

Denne guiden beskriver den automatiske morgen-crawleren som kjører hver dag kl. 06:00 UTC (08:00 norsk tid) for å holde Askerbot oppdatert med nye nyhetsartikler.

## Funksjonalitet

### 🕕 **Automatisk kjøring:**
- **Tid**: Hver morgen kl. 06:00 UTC (08:00 norsk tid)
- **Trigger**: Netlify Scheduled Functions
- **Varighet**: 2-5 minutter avhengig av antall nye artikler

### 🔄 **Pipeline:**
1. **Crawl nyhetsartikler** - Henter nye artikler fra siste 3 måneder
2. **Oppdater allowlist** - Legger til kvalifiserte artikler i allowlist.json
3. **Reindex søkesystem** - Oppdaterer ChromaDB og BM25 indekser
4. **Logging** - Lagrer resultater og sender notifikasjoner

### 🛡️ **Kvalitetskontroll:**
- **Duplikatsjekk** - Hopp over artikler som allerede finnes
- **Kvalitetsscore** - Minimum 70% score for godkjenning
- **Ordtelling** - Minimum 150 ord per artikkel
- **Relevans** - Sjekker for Asker Fotball-relaterte nøkkelord
- **Dato** - Kun artikler fra siste 3 måneder

## Konfigurasjon

### **Netlify.toml:**
```toml
# Scheduled Functions - Automatic morning crawl at 06:00 UTC
[[functions.scheduled]]
  function = "scheduled-crawl"
  schedule = "0 6 * * *"  # Every day at 06:00 UTC (08:00 Norwegian time)
```

### **Funksjon:**
- **Fil**: `netlify/functions/scheduled-crawl.js`
- **Trigger**: Netlify Scheduled Functions
- **Sikkerhet**: Kun POST-requests med `x-netlify-scheduled` header

## Logging og Overvåking

### **Loggfiler:**
- `storage/logs/scheduled-crawl.jsonl` - Daglige kjøringer
- `storage/logs/scheduled-crawl-test.json` - Test-resultater
- `storage/logs/reindex-YYYY-MM-DD.json` - Reindexing-logger

### **Loggformat:**
```json
{
  "timestamp": "2025-01-16T06:00:00.000Z",
  "duration_ms": 180000,
  "duration_readable": "3m 0s",
  "success": true,
  "steps": [
    {
      "success": true,
      "description": "News crawling (3 months)",
      "exitCode": 0
    }
  ],
  "crawlStats": {
    "totalFound": 5,
    "totalErrors": 0,
    "averageQualityScore": 85.2
  },
  "allowlistStats": {
    "newsArticles": 150,
    "totalUrls": 200
  },
  "summary": {
    "new_articles_found": 5,
    "new_articles_added": 3,
    "total_news_articles": 150
  }
}
```

## Testing

### **Lokal testing:**
```bash
# Test hele pipeline lokalt
node scripts/test-scheduled-crawl.js

# Test individuelle komponenter
node scripts/crawl-news-3months.js
node scripts/update-allowlist-from-crawl.js
node scripts/reindex.js
```

### **Test-resultater:**
- ✅ **Suksess**: Alle steg fullført uten feil
- ⚠️ **Delvis suksess**: Noen steg feilet, men pipeline fortsatte
- ❌ **Feil**: Kritiske feil som stoppet pipeline

## Feilsøking

### **Vanlige problemer:**

1. **Crawling feiler:**
   ```
   Error: News crawling failed
   ```
   - Sjekk nettverksforbindelse
   - Verifiser at askerfotball.no er tilgjengelig
   - Sjekk timeout-innstillinger

2. **Allowlist oppdatering feiler:**
   ```
   Error: Allowlist update failed
   ```
   - Sjekk at config/allowlist.json er skrivbar
   - Verifiser at crawl-resultater finnes
   - Sjekk diskplass

3. **Reindexing feiler:**
   ```
   Error: Reindexing failed
   ```
   - Sjekk at Python og Node.js er installert
   - Verifiser at ChromaDB kan startes
   - Sjekk diskplass for indekser

### **Debug-modus:**
```bash
# Aktiver detaljert logging
export DEBUG=scheduled-crawl
node scripts/test-scheduled-crawl.js
```

## Ytelse

### **Estimert tid:**
- **Ingen nye artikler**: ~1-2 minutter
- **5-10 nye artikler**: ~2-3 minutter
- **20+ nye artikler**: ~4-5 minutter

### **Ressursbruk:**
- **Minne**: ~100-200MB under kjøring
- **Nettverk**: ~5-10MB avhengig av artikler
- **CPU**: Lav (hovedparten er I/O)
- **Disk**: ~1-5MB per dag i logger

## Sikkerhet

### **Rate limiting:**
- 1 sekund pause mellom batches
- 2 sekunder mellom retry-forsøk
- Respekterer server-ressurser

### **Feilhåndtering:**
- Graceful degradation ved feil
- Detaljert logging av alle feil
- Ingen krasj ved nettverksproblemer
- Automatisk retry ved midlertidige feil

### **Tilgangskontroll:**
- Kun Netlify Scheduled Functions kan trigge
- Validerer `x-netlify-scheduled` header
- Ingen ekstern tilgang til funksjonen

## Vedlikehold

### **Regelmessig overvåking:**
- Sjekk `storage/logs/scheduled-crawl.jsonl` daglig
- Overvåk kvalitetsscore over tid
- Juster konfigurasjon basert på resultater

### **Månedlig vedlikehold:**
- Rydd opp gamle loggfiler
- Sjekk diskplass for indekser
- Verifiser at alle komponenter fungerer

### **Kvartalsvis:**
- Oppdater dependencies
- Test hele pipeline
- Verifiser at Netlify Scheduled Functions fungerer

## Notifikasjoner

### **Suksess-notifikasjoner:**
```json
{
  "success": true,
  "message": "Scheduled crawl completed successfully",
  "summary": {
    "new_articles_found": 5,
    "new_articles_added": 3,
    "total_news_articles": 150
  },
  "duration": "2m 30s"
}
```

### **Feil-notifikasjoner:**
```json
{
  "success": false,
  "error": "News crawling failed",
  "duration": "1m 15s"
}
```

## Fremtidige forbedringer

### **Planlagte funksjoner:**
- [ ] Email-notifikasjoner ved feil
- [ ] Slack/Discord-integrasjon
- [ ] Grafisk dashboard for overvåking
- [ ] Automatisk kvalitetsjustering
- [ ] Støtte for flere nyhetskilder

### **Konfigurerbare alternativer:**
- [ ] Tilpassbare kjøretider
- [ ] Forskjellige kvalitetskriterier
- [ ] Avanserte filtreringsregler
- [ ] A/B testing av crawler-algoritmer

## Support

### **Hvis noe går galt:**
1. Sjekk loggfiler i `storage/logs/`
2. Kjør test-scriptet lokalt
3. Verifiser at alle dependencies er installert
4. Sjekk Netlify Functions dashboard

### **Kontakt:**
- Teknisk support: [GitHub Issues](https://github.com/askerfotball/askerbot/issues)
- Dokumentasjon: [Askerbot Docs](https://github.com/askerfotball/askerbot/tree/main/docs)
