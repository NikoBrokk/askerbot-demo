# Askerbot Demo

Minimal, tilgjengelig chatbot-widget som kan embeddes i iframe på eksterne domener.

## Prosjektstruktur

```
/askerbot-demo
  ├─ index.html          // Alt UI + CSS + JS inline
  ├─ netlify.toml        // Headers for iframe-embedding + redirects
  ├─ README.md           // Dokumentasjon
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

# Start lokal server (valgfritt)
python -m http.server 8000
# Eller
npx serve .

# Åpne http://localhost:8000
```

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

## Support

For spørsmål eller problemer, sjekk:
1. Netlify deploy logs
2. Browser console for JavaScript errors
3. Network tab for API calls
4. Environment variables i Netlify dashboard