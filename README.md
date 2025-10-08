# Askerbot Demo

En intelligent chatbot-demo for Asker Fotball som bruker OpenAI GPT-3.5-turbo for naturlige svar på norsk.

## 🚀 Funksjoner

- **Intelligent AI-svar** - Bruker OpenAI API for naturlige samtaler
- **Mobil-optimalisert** - Fungerer perfekt på alle enheter
- **Tilgjengelig** - ARIA-labels, tastatur-navigasjon, skjermleser-støtte
- **Embedding-klar** - Kan enkelt embeddes i Enonic XP via iframe
- **Netlify Edge Functions** - Serverless backend med lav latency

## 📁 Filstruktur

```
/askerbot-demo/
├── askerbot-demo.html        # Hoveddemo med eksterne assets
├── index.html                # Flat versjon med inline CSS/JS
├── netlify.toml              # Netlify konfigurasjon
├── healthz                   # Health check endpoint
└── /netlify/functions/
    └── chat.js               # OpenAI API Edge Function
└── /assets/
    ├── af-logo.svg           # Asker Fotball logo
    ├── styles.css            # CSS-stiler
    └── demo.js               # Frontend JavaScript
```

## ⚙️ Setup og Deploy

### 1. Få OpenAI API-nøkkel

1. Gå til [OpenAI Platform](https://platform.openai.com/)
2. Opprett en konto eller logg inn
3. Gå til "API Keys" i sidebar
4. Klikk "Create new secret key"
5. Kopier nøkkelen (starter med `sk-`)

### 2. Deploy til Netlify

**Alternativ A: Netlify CLI**
```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Logg inn
netlify login

# Deploy
netlify init
netlify deploy --prod
```

**Alternativ B: Netlify Dashboard**
1. Gå til [netlify.com](https://netlify.com)
2. Klikk "Add new site" → "Deploy manually"
3. Dra og slipp hele mappen
4. Gå til "Site settings" → "Environment variables"
5. Legg til: `OPENAI_API_KEY` = `sk-din-nøkkel-her`

### 3. Test deploy

```bash
# Test health check
curl https://your-site-name.netlify.app/healthz

# Test chatbot
curl -X POST https://your-site-name.netlify.app/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hei, hva er åpningstider?"}'
```

## 🎯 Embedding i Enonic XP

1. Gå til **Content Studio** → **Side (Page)** → **Part**
2. Velg **"Embed iframe"**
3. URL: `https://your-site-name.netlify.app/askerbot-demo/askerbot-demo.html`
4. Anbefalte innstillinger:
   - Width: `360-420px`
   - Height: `480-560px`
   - Border: `0`
   - Border-radius: `14px`

## 💰 Kostnader

**OpenAI API (GPT-3.5-turbo):**
- ~$0.0015 per 1K tokens
- Eksempel: 1000 samtaler/dag = ~$5-10/måned
- Første $5 er gratis for nye brukere

**Netlify:**
- Gratis plan: 100GB bandwidth, 300 build minutes
- Pro plan: $19/måned for mer bandwidth

## 🔧 Lokal utvikling

```bash
# Start lokal server
python3 -m http.server 8000

# Test i nettleser
open http://localhost:8000/askerbot-demo.html
```

## 🛠️ Tilpasning

### Endre AI-personlighet

Rediger system-prompten i `netlify/functions/chat.js`:

```javascript
{
  role: 'system',
  content: 'Din tilpassede prompt her...'
}
```

### Endre farger/styling

Rediger `assets/styles.css` - se kommentarer for enkle endringer:

```css
/* Hovedfarger - endre her */
.hdr { background: #111; }  /* Header bakgrunn */
.m.bot { background: #f2f2f5; }  /* Bot meldinger */
.m.you { background: #e8f5ff; }  /* Bruker meldinger */
```

### Legg til flere snarveier

Rediger `askerbot-demo.html`:

```html
<div class="shortcuts">
  <button data-msg="terminliste">Se terminliste</button>
  <button data-msg="kontakt">Kontakt oss</button>
  <button data-msg="camp">Meld på camp</button>
  <!-- Legg til flere her -->
  <button data-msg="medlemskap">Bli medlem</button>
</div>
```

## 🐛 Feilsøking

**"Service configuration error"**
- Sjekk at `OPENAI_API_KEY` er satt i Netlify environment variables

**"Method Not Allowed"**
- Sjekk at Edge Function er deployet korrekt
- Test med: `curl -X POST https://your-site/.netlify/functions/chat`

**CORS-feil**
- Sjekk at `netlify.toml` inneholder riktige CORS-headers

**Lang responstid**
- OpenAI API kan ta 1-3 sekunder
- Loading-melding vises automatisk

## 📞 Support

For spørsmål om denne demoen, kontakt utvikleren eller sjekk Netlify/OpenAI dokumentasjon.
