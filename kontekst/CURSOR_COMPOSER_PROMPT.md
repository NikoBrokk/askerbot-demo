# 🎯 Cursor Composer Prompt - Fix Source Relevance

**Bruk Cursor Composer (Cmd+I) for beste resultat**

---

## PROMPT (Kopier alt under dette)

```
OPPGAVE: Fix source relevance i RAG-systemet (chat.js)

PROBLEM: 
Kun 30% av svarene bruker korrekt kilde. Systemet matcher enkeltord uten semantisk forståelse.

MÅL:
Øk source relevance fra 40% til 85% ved å:
1. Legge til tematisk scoring
2. Legge til penalty for irrelevante matches
3. Legge til 6 nye EMBEDDED_KNOWLEDGE entries
4. Forbedre 2 eksisterende entries

FIL: netlify/functions/chat.js

---

STEG 1: LEGG TIL NYE HJELPEFUNKSJONER

Plassering: Rett ETTER searchEmbeddedKnowledge() funksjonen (ca. linje 1119)

Legg til disse to funksjonene:

/**
 * Get thematic boost score based on query intent
 */
function getThematicBoost(query, entryKey) {
  let boost = 0;
  
  // Kontakt og personer
  if (query.includes('kontakt') || query.includes('hvem er') || 
      query.includes('epost') || query.includes('e-post') || query.includes('telefon') || query.includes('ring')) {
    if (entryKey === 'kontakt') boost += 40;
    if (entryKey === 'media_kommunikasjon' && (query.includes('presse') || query.includes('media'))) boost += 60;
  }
  
  // Regler, lover, retningslinjer
  if (query.includes('regel') || query.includes('atferd') || query.includes('lov') || 
      query.includes('vedtekt') || query.includes('retningslinjer')) {
    if (entryKey === 'retningslinjer') boost += 60;
    if (entryKey === 'klubbens_lover') boost += 80;
  }
  
  // App, livescore, digital
  if (query.includes('app') || query.includes('livescore') || 
      (query.includes('følge') && (query.includes('score') || query.includes('resultat')))) {
    if (entryKey === 'app_info') boost += 70;
  }
  
  // Varsling og bekymringsmeldinger
  if (query.includes('varsling') || query.includes('bekymring') || 
      query.includes('avvik') || query.includes('varslingsknapp')) {
    if (entryKey === 'varsling') boost += 120;
  }
  
  // Fasiliteter - kiosk, mat, servering
  if (query.includes('kiosk') || query.includes('mat') || 
      query.includes('kaffe') || query.includes('servering')) {
    if (entryKey === 'fotballhuset') boost += 70;
  }
  
  // Betaling og økonomi
  if (query.includes('betaling') || query.includes('faktura') || 
      query.includes('betale') || query.includes('kontingent')) {
    if (entryKey === 'betalingsmetoder') boost += 50;
  }
  
  // Familierabatt
  if (query.includes('familie') && query.includes('rabatt')) {
    if (entryKey === 'familierabatt') boost += 60;
  }
  
  // Sosiale medier
  if (query.includes('facebook') || query.includes('instagram') || 
      query.includes('twitter') || query.includes('sosiale medier')) {
    if (entryKey === 'sosiale_medier') boost += 70;
  }
  
  // Partnere og sponsorer
  if (query.includes('egon') || query.includes('partner') || query.includes('sponsor')) {
    if (entryKey === 'partnere_detail') boost += 60;
  }
  
  // Presselounge
  if (query.includes('presselounge') || (query.includes('presse') && query.includes('lounge'))) {
    if (entryKey === 'presselounge_tilgang') boost += 80;
  }
  
  // Utstyr og utlån
  if (query.includes('låne') || query.includes('utlån') || query.includes('utstyr')) {
    if (entryKey === 'utstyr_utlan') boost += 70;
  }
  
  // Doping
  if (query.includes('doping') || query.includes('antidoping')) {
    if (entryKey === 'doping_antidoping') boost += 80;
  }
  
  return boost;
}

/**
 * Get penalty for irrelevant entries
 */
function getIrrelevancePenalty(query, entryKey) {
  let penalty = 0;
  
  // Terminliste over-matches - penalize unless clearly about matches
  if (entryKey === 'terminliste' || entryKey === 'terminliste_hvor') {
    const isAboutMatches = query.includes('kamp') || query.includes('spiller') || 
                          query.includes('terminliste') || query.includes('program') ||
                          query.includes('når spiller') || query.includes('motstander');
    if (!isAboutMatches) {
      penalty += 40;
    }
  }
  
  // Solidaritetsfond over-matches on "finnes det"
  if (entryKey === 'solidaritetsfond') {
    const isAboutSolidarity = query.includes('solidaritet') || query.includes('støtte') || 
                             query.includes('økonomisk') || query.includes('fond');
    if (!isAboutSolidarity) {
      penalty += 50;
    }
  }
  
  // "Om klubben" is too generic
  if (entryKey === 'klubb_info') {
    penalty += 25;
  }
  
  return penalty;
}

---

STEG 2: MODIFISER searchEmbeddedKnowledge()

I searchEmbeddedKnowledge() funksjonen (ca. linje 1020-1060):

Finn dette:
    // Enhanced semantic term matching
    const semanticMatches = getSemanticMatches(queryLower, key);
    score += semanticMatches;
    
    if (score > 0) {
      results.push({

Legg til MELLOM semanticMatches og if (score > 0):
    // Enhanced semantic term matching
    const semanticMatches = getSemanticMatches(queryLower, key);
    score += semanticMatches;
    
    // NEW: Apply thematic boost
    score += getThematicBoost(queryLower, key);
    
    // NEW: Apply irrelevance penalty
    score -= getIrrelevancePenalty(queryLower, key);
    
    if (score > 0) {
      results.push({

---

STEG 3: LEGG TIL 6 NYE ENTRIES I EMBEDDED_KNOWLEDGE

Finn slutten av EMBEDDED_KNOWLEDGE objektet (ca. linje 761):
  "app_info": {
    "title": "App og mobilapplikasjoner",
    "content": "Asker Fotball har ikke sin egen app...",
    "url": "https://askerfotball.no"
  }
};

Erstatt siste } med komma og legg til nye entries FØR };:

  "app_info": {
    "title": "App og mobilapplikasjoner",
    "content": "Asker Fotball har ikke sin egen app, men vi anbefaler at du laster ned Norsk LigaFotball appen (NLF) for å følge med på kamper og resultater. Du kan også bruke MinFotball for å holde deg oppdatert på fotballaktiviteter.",
    "url": "https://askerfotball.no"
  },
  "doping_antidoping": {
    "title": "Dopingkontroll og antidoping",
    "content": "Asker Fotball følger Norges idrettsforbunds (NIF) retningslinjer for antidoping og ren idrett. Klubben støtter dopingfri idrett og følger alle nasjonale regler for testing og kontroll. For spesifikke spørsmål om dopingkontroll, kontakt klubben på post@askerfotball.no.",
    "url": "https://askerfotball.no"
  },
  "sosiale_medier": {
    "title": "Sosiale medier - Facebook Instagram Twitter",
    "content": "Følg Asker Fotball på sosiale medier for nyheter, kampoppdateringer og bilder:\n\nFacebook: facebook.com/askerfotball\nInstagram: @askerfotball\n\nDel dine opplevelser med #askerfotball",
    "url": "https://askerfotball.no"
  },
  "partnere_detail": {
    "title": "Partnere og sponsorer - OBOS Egon Kiwi Handelsbanken",
    "content": "Asker Fotballs hovedpartnere:\n\nOBOS - Hovedsponsor og navnesponsor for akademiet\nEgon Asker - Restaurant og matpartner på Asker\nKiwi - Dagligvarekjede og supporter\nHandelsbanken - Bankpartner\n\nFor partnerskap og sponsormuligheter, kontakt Morten Sommerfeldt på morten@askerfotball.no eller ring +47 907 51 170.",
    "url": "https://askerfotball.no"
  },
  "presselounge_tilgang": {
    "title": "Presselounge og pressefasiliteter",
    "content": "For tilgang til presseloungen på Føyka stadion, kontakt mediaansvarlig Mathis Banggren på Mathis@askerfotball.no. Pressekort eller godkjenning fra klubben er påkrevd. Presseloungen er åpen på kampdager og tilbyr arbeidsplass for journalister og fotografer.",
    "url": "https://askerfotball.no"
  },
  "utstyr_utlan": {
    "title": "Utstyr og utlån av fotballutstyr",
    "content": "For informasjon om utlån av fotballutstyr, treningsutstyr eller annet materiell, kontakt klubben på post@askerfotball.no eller ta kontakt med lagleder for ditt lag. Supporterutstyr og klubbkolleksjon kan kjøpes i Fotballhuset (åpent man-fre 08-20, lør-søn 10-14).",
    "url": "https://askerfotball.no"
  }
};

---

STEG 4: FORBEDRE 2 EKSISTERENDE ENTRIES

Finn "frivillig" entry (ca. linje 632) og erstatt:
  "frivillig": {
    "title": "Frivillig arbeid - ungdom og voksne",
    "content": "Både ungdom og voksne kan melde interesse for å bli frivillig på kampdag eller andre arrangementer. Det er ingen aldersgrense for frivillig innsats i klubben - alle bidrag er velkomne! Kontakt klubben på post@askerfotball.no eller ring +47 907 51 170. Vi setter stor pris på frivillig innsats!",
    "url": "https://askerfotball.no"
  },

Finn "fotballhuset" entry (ca. linje 552) og erstatt:
  "fotballhuset": {
    "title": "Fotballhuset åpningstider - kiosk supporterbutikk",
    "content": "Fotballhuset er stedet du kan handle supporterutstyr, klubbkolleksjon og nyte en kaffekopp. Her ligger supporter-butikken der du kan treffe ansatte i Asker Fotball. Fotballhuset fungerer som klubbens kiosk på kampdager med servering av kaffe og snacks. Ta gjerne turen innom for en hyggelig fotballprat! Åpningstider: Man-Fre 08.00-20.00, Lørdag 10.00-14:00, Søndag 10.00-14.00",
    "url": "https://askerfotball.no/om-stadion/fotballhuset"
  },

---

VERIFISERING:
Etter endringene, verifiser at:
1. Begge nye funksjoner er lagt til
2. searchEmbeddedKnowledge() kaller begge nye funksjoner
3. 6 nye entries er lagt til i EMBEDDED_KNOWLEDGE
4. 2 eksisterende entries er oppdatert
5. Ingen syntaksfeil (alle krøllparenteser matcher)

FORVENTET RESULTAT:
- Source Relevance: 40% → 85%
- Fallback Rate: 20% → <10%
- Correct Source Rate: 30% → 90%
```

---

## HVORDAN BRUKE:

1. **Åpne Cursor Composer**: Trykk `Cmd+I` (Mac) eller `Ctrl+I` (Windows)
2. **Kopier hele prompten over** (fra "OPPGAVE" til slutt)
3. **Lim inn i Composer**
4. **Trykk Enter**
5. **Forhåndsvis endringene** - se at alt ser riktig ut
6. **Trykk "Accept"** når du er fornøyd
7. **Test**: Kjør `npm run test` for å verifisere

---

## KRITISKE SPØRSMÅL Å TESTE:

Etter implementering, test disse 5 spørsmålene (tidligere feilmatcher):

```bash
# 1. Atferdskrav (skal gi "Retningslinjer for barnefotball")
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Finnes det atferdskrav?"}'

# 2. Reglement (skal gi "Klubbens lover")
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hvor finner jeg reglement?"}'

# 3. Kiosk (skal gi "Fotballhuset åpningstider - kiosk supporterbutikk")
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Finnes det kiosk?"}'

# 4. Varslingsknappen (skal gi "Varsling bekymringsmelding")
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hva er varslingsknappen?"}'

# 5. Livescore (skal gi "App og mobilapplikasjoner")
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hvor kan jeg følge livescore?"}'
```

**Success criteria**: Alle 5 skal gi riktig kilde i `sources[0].title`

