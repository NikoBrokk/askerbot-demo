# Askerbot Demo

Minimal, tilgjengelig chatbot-widget som kan embeddes i iframe på eksterne domener.

## Prosjektstruktur

```
/askerbot-demo
  ├─ index.html          // Alt UI + CSS + JS inline
  ├─ netlify.toml        // Headers for iframe-embedding + redirects
  ├─ README.md           // Dokumentasjon
  ├─ package.json        // Node.js dependencies og scripts
  ├─ config/             // Konfigurasjon
  │   └─ rag-policy.json // RAG policy settings
  ├─ qa/                 // Quality Assurance
  │   └─ checklist.md    // Testspørsmål og QA-checklist
  ├─ scripts/            // Data processing scripts
  │   ├─ fetch.js        // Hent HTML fra askerfotball.no
  │   ├─ parse.js        // Parse HTML til strukturert JSON
  │   ├─ chunk.js        // Del innhold i chunks for RAG
  │   ├─ embed.py        // Generer embeddings med ChromaDB
  │   ├─ build-bm25.js   // Bygg BM25 søkeindeks
  │   └─ reindex.js      // Komplett reindexing pipeline
  ├─ storage/            // Datastorage
  │   ├─ chunks/         // Tekstchunks (JSONL format)
  │   ├─ index/
  │   │   ├─ chroma/     // Vektorembeddings (ChromaDB)
  │   │   └─ bm25/       // BM25 søkeindeks
  │   ├─ logs/           // Execution logs
  │   ├─ parsed/         // Parsed JSON dokumenter
  │   └─ raw/            // Raw HTML files
  └─ netlify/
      └─ functions/
          └─ chat.js     // OpenAI API integration
```

## Hvordan embedde i Enonic XP

Legg til denne iframe-koden i Enonic XP Content Studio:

```html
<iframe
  title="Askerbot"
  src="https://askerbot-demo.netlify.app"
  style="position:fixed; right:24px; bottom:24px; width:380px; height:560px; border:0; border-radius:16px; box-shadow:0 18px 60px rgba(0,0,0,.35); z-index:2147483000; background:transparent;"
  loading="lazy"
  allowtransparency="true"
></iframe>
```

### Iframe-størrelse
- **Anbefalt**: width=380px, height=560px
- **Responsiv**: Fungerer på mobil med max-width: 100vw - 32px
- **Z-index**: 2147483000 (høy nok til å ligge over temaet)

## Utvikling og deploy

### Lokal utvikling
```bash
# Klon repo
git clone <repo-url>
cd askerbot-demo

# Installer dependencies
npm install

# Start lokal server (valgfritt)
python -m http.server 8000
# Eller
npx serve .

# Åpne http://localhost:8000
```

### Data Pipeline

For å bygge kunnskapsbasen:

```bash
# Komplett reindexing (anbefalt)
npm run reindex

# Eller kjør steg for steg:
# 1. Hent HTML fra askerfotball.no
npm run fetch

# 2. Parse HTML til strukturert JSON
npm run parse

# 3. Del innhold i chunks (400-800 tegn med 80 tegn overlap)
npm run chunk

# 4. Generer embeddings med ChromaDB (semantic search)
npm run embed

# 5. Bygg BM25 søkeindeks (keyword search)
npm run bm25
```

#### Hva skjer i hvert steg:

- **`npm run reindex`**: Kjører hele pipelinen automatisk (fetch → parse → chunk → embed → bm25) med progress-logging og feilhåndtering
- **`npm run fetch`**: Henter HTML fra alle sider på askerfotball.no og lagrer i `storage/raw/`
- **`npm run parse`**: Parser HTML til strukturert JSON med metadata (tittel, URL, breadcrumbs) i `storage/parsed/`
- **`npm run chunk`**: Deler tekstinnhold i overlappende chunks for bedre søkeresultater i `storage/chunks/`
- **`npm run embed`**: Generer vektorembeddings med ChromaDB for semantisk søk i `storage/index/chroma/`
- **`npm run bm25`**: Bygger BM25-indeks for nøkkelordsøk i `storage/index/bm25/`

#### Reindexing Pipeline

`npm run reindex` kjører en komplett pipeline som:
- ✅ Rydder gamle indekser automatisk
- ✅ Kjører alle 5 steg i riktig rekkefølge
- ✅ Viser progress-logging med timestamps
- ✅ Stoppar ved første feil med detaljert feilmelding
- ✅ Lager detaljert logg i `storage/logs/reindex-YYYY-MM-DD.json`
- ✅ Viser oppsummering med varighet og status

### Deploy til Netlify
```bash
# Push til GitHub/GitLab
git add .
git commit -m "Update chatbot"
git push

# Netlify deployer automatisk
```

### Environment Variables
I Netlify Dashboard → Site Settings → Environment Variables:
- `OPENAI_API_KEY` = `sk-your-openai-api-key`

For lokal utvikling, opprett `.env` fil basert på `.env.example`:
```bash
cp .env.example .env
# Rediger .env med dine API-nøkler
```

## Sikkerhet og domener

### Content Security Policy
Widgeten tillater iframe-embedding kun fra:
- `'self'` (samme domene)
- `https://askerfotball.no`

### For andre domener
Endre `netlify.toml`:
```toml
Content-Security-Policy = "frame-ancestors 'self' https://askerfotball.no https://nytt-domene.no"
```

## Funksjonalitet

### UI Features
- ✅ Rund knapp med Gabrielsen-AI logo
- ✅ Flytende chatpanel (nederst til høyre)
- ✅ Smooth animasjoner ved åpning/lukking
- ✅ Responsivt design (mobil først)
- ✅ Tilgjengelighet (ARIA, fokus-trap, keyboard navigation)

### Chat Features
- ✅ Send meldinger til OpenAI API
- ✅ Tre hurtigknapper: "Se terminliste", "Kontakt oss", "Meld på camp"
- ✅ "Skriver..." indikator
- ✅ Feilhåndtering med brukervenlige meldinger
- ✅ Kilder vises under svar (hvis tilgjengelig)

### API Integration
- **Endpoint**: `/.netlify/functions/chat`
- **Method**: POST
- **Body**: `{ messages: [{role: 'user'|'assistant', content: string}] }`
- **Response**: `{ reply: string, sources?: Array<{title:string,url:string}> }`

### Søkeindekser
Prosjektet bruker to komplementære søkeindekser:

- **ChromaDB (Semantic Search)**: Vektorembeddings for semantisk søk som forstår mening og kontekst
- **BM25 (Keyword Search)**: Tradisjonell tekstsøk som matcher nøkkelord og fraser

Dette gir en robust søkeopplevelse som kombinerer semantisk forståelse med presis nøkkelordsøk.

### RAG Policy Configuration

RAG-oppførselen konfigureres i `config/rag-policy.json`:

```json
{
  "answerLanguage": "no",
  "maxSources": 3,
  "sourcePriority": ["askerfotball.no"],
  "fallbackOnUncertain": "Jeg finner ikke et sikkert svar – kontakt klubben her: /kontakt/",
  "alwaysCite": true
}
```

### Quality Assurance

Test chatboten med spørsmålene i `qa/checklist.md`:

- **10 testspørsmål** som dekker alle hovedområder
- **Kildevalidering** - sjekk at alle svar har relevante kilder
- **Debugging-tips** for å løse problemer
- **Automatisk testing** med `npm run reindex`

## Tilgjengelighet

- ✅ ARIA-labels og roller
- ✅ Fokus-trap i chatpanel
- ✅ ESC lukker panel
- ✅ Keyboard navigation
- ✅ Skjermleser-støtte
- ✅ Høy kontrast (≥4.5:1)

## Ytelse

- ✅ Lazy-initialisering av chatpanel
- ✅ Debounce på Enter (200ms)
- ✅ Ingen eksterne biblioteker
- ✅ Optimalisert for mobil

## Forbedringer i chat.js

For å støtte kilder i svar, oppdater `chat.js`:

```javascript
// Returner svar med kilder
return {
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  },
  body: JSON.stringify({ 
    reply: reply.trim(),
    sources: [
      { title: "Asker Fotball Terminliste", url: "https://askerfotball.no/terminliste" },
      { title: "Kontakt oss", url: "https://askerfotball.no/kontakt" }
    ]
  })
};
```

## Testing

### Lokal testing
1. Åpne `index.html` i nettleser
2. Test chat-funksjonalitet
3. Test keyboard navigation
4. Test responsivt design

### Iframe testing
1. Deploy til Netlify
2. Test embedding på `askerfotball.no`
3. Verifiser at CSP tillater embedding
4. Test på mobil og desktop

## Quality Assurance

### Testspørsmål for validering av kunnskapsbase

Test disse spørsmålene for å verifisere at chatboten gir korrekte svar med tilhørende kilder:

#### 1. Grunnleggende klubbinformasjon
**Spørsmål:** "Hva er Asker Fotball?"
**Forventet:** Svar om at det er en fotballklubb, "mer enn en fotballklubb", grunnlagt osv.
**Kilder:** Om klubben-sider

#### 2. Stadion og fasiliteter
**Spørsmål:** "Hvor spiller Asker Fotball hjemmekampene sine?"
**Forventet:** Føyka Stadion, kapasitet, historie
**Kilder:** Om stadion-sider

#### 3. Akademi og utviklingslag
**Spørsmål:** "Hva er OBOS-Akademiet?"
**Forventet:** Informasjon om fotballakademi for 7-13 år, pris, påmelding
**Kilder:** Lag/utviklingslag/akademi-sider

#### 4. Kontakt og ansatte
**Spørsmål:** "Hvordan kan jeg kontakte Asker Fotball?"
**Forventet:** E-post, adresse, ansvarlige personer
**Kilder:** Kontakt-sider, ansatte-sider

#### 5. Klubbens historie
**Spørsmål:** "Når ble Føyka Stadion åpnet?"
**Forventet:** 1. juli 1950
**Kilder:** Historiske fakta, stadion-informasjon

### Kilder mangler?

#### Sjekkliste for kildevalidering:
- [ ] **Alle svar har kilder**: Hver respons skal inkludere minst én kilde
- [ ] **Kilder er relevante**: Kildene skal faktisk inneholde informasjonen som brukes i svaret
- [ ] **Kilder er oppdaterte**: URL-ene skal fungere og peke til riktige sider
- [ ] **Kilder er fra askerfotball.no**: Prioriter kilder fra klubbens egne sider
- [ ] **Kilder dekker spørsmålet**: Kildene skal gi tilstrekkelig dekning av spørsmålet

#### Vanlige problemer:
1. **Generiske svar uten kilder**: Chatboten gir generelle svar uten å referere til spesifikke kilder
2. **Feil kilder**: URL-ene peker til feil sider eller eksisterer ikke
3. **Manglende kilder**: Spørsmål som burde ha kilder får ingen
4. **Urelevante kilder**: Kildene inneholder ikke informasjonen som brukes i svaret
5. **Utgåtte lenker**: Kildene peker til sider som ikke lenger eksisterer

#### Debugging-tips:
- Sjekk om spørsmålet matcher innhold i `storage/chunks/`
- Verifiser at BM25-indeksen finner relevante chunks
- Kontroller at ChromaDB embeddings gir gode resultater
- Test både nøkkelordsøk og semantisk søk
- Kjør `npm run reindex` hvis kunnskapsbasen er utdatert

## System Improvements

This chatbot has been enhanced with modern parsing capabilities and improved data quality:

### HTML Parsing Enhancements
- **Modern Content Selectors**: Added support for Angular, React, and Vue app containers
- **Smart Content Scoring**: Implemented content quality scoring to select the best content sections
- **Navigation Filtering**: Automatic detection and filtering of navigation and UI elements
- **Fallback Parsing**: Multiple fallback strategies for problematic pages
- **Better Title Extraction**: Improved title extraction from multiple sources

### Smart Chunking Strategy
- **Larger Chunks**: Increased size to 1000-1500 characters
- **Semantic Breakpoints**: Split on headings, paragraphs, and sentences rather than just words
- **Smart Overlap**: Intelligent overlap between chunks to preserve context
- **Content Type Detection**: Automatic detection of chunk types (player lists, news, etc.)
- **Quality Assessment**: Built-in quality scoring for each chunk

### ChromaDB Search Service
- **HTTP API**: RESTful API for semantic search
- **Multiple Embedding Providers**: Support for both local and cloud embeddings
- **Health Monitoring**: Built-in health checks and statistics
- **Error Handling**: Robust error handling and fallbacks
- **Easy Deployment**: Simple startup scripts and configuration

### Data Quality Improvements
- **Content Validation**: Automatic validation of parsed content
- **Navigation Filtering**: Smart filtering of navigation and UI elements
- **Quality Scoring**: Multi-factor quality assessment
- **Fallback Strategies**: Multiple fallback parsing methods
- **Quality Reporting**: Comprehensive quality analysis and reporting

## Support

For spørsmål eller problemer, sjekk:
1. Netlify deploy logs
2. Browser console for JavaScript errors
3. Network tab for API calls
4. Environment variables i Netlify dashboard