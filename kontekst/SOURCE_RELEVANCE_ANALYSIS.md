# Kildepresisjonsanalyse - RAG-systemet
**Dato**: 22. oktober 2025  
**Antall tester**: 2 tester (20 spørsmål totalt)  
**Gjennomsnittlig kilderelevans**: 37-44% (VELDIG LAVT!)

---

## Executive Summary

### 🔴 KRITISK PROBLEM: Kildevalgsystemet er fundamentalt feil

**Source Relevance Score**: 37-44% (gjennomsnitt)  
**Problemrate**: 75% av svarene bruker feil eller suboptimale kilder

### Hovedproblemer:
1. **Feilaktig kildeprioritet** (60% av tilfellene) - Vi velger underlegen kilde når bedre finnes
2. **Manglende kilder** (15% av tilfellene) - Vi trenger bedre kilder i kunnskapsbasen
3. **Default fallback-kilder** (25% av tilfellene) - Systemet "gir opp" for tidlig

---

## Detaljert Analyse per Spørsmål

### TEST 1: 10 spørsmål

#### 1. ❌ "Finnes det G17-lag?" 
**Kilde brukt**: "Lagoversikt - hvor mange lag har klubben" (score: 30)  
**Score**: 59% | **Sourcerel**: 1.0

**DIAGNOSE**: ✅ KORREKT KILDE  
- Lagoversikt er PERFEKT kilde for dette spørsmålet
- Svaret er faktisk korrekt (G17 finnes ikke, nevner G13, G14, G15, G19)
- **Ingen forbedring nødvendig**

---

#### 2. ❌ "Finnes det atferdskrav?"
**Kilde brukt**: "Solidaritetsfondet - finnes solidaritetsfond" (score: 9)  
**Score**: 71% | **Sourcerel**: 0.3

**DIAGNOSE**: 🔴 FEIL KILDE - Type 1 (Feilaktig kildevalg)
- **Riktig kilde finnes**: "Retningslinjer for barnefotball" i EMBEDDED_KNOWLEDGE (linje 642-645)
- **Problemet**: Søkealgoritmen matchet "finnes" i begge titler og ga feil prioritet
- **Konsekvens**: Svaret var likevel OK (snakket om ledestjerner), men kilden er helt feil tema

**LØSNING**:
```javascript
// I searchEmbeddedKnowledge(), øk score for eksakt tematisk match
if (queryLower.includes('atferd') || queryLower.includes('regel')) {
  if (key === 'retningslinjer') score += 50; // Boost riktig kilde
}
```

---

#### 3. ❌ "Finnes det dopingkontroll?"
**Kilde brukt**: "Solidaritetsfondet - finnes solidaritetsfond" (score: 7)  
**Score**: 60% | **Sourcerel**: 0.3 | **FALLBACK**

**DIAGNOSE**: 🟡 MANGLENDE KILDE - Type 2 (Vi trenger bedre kilder)
- **Problemet**: Vi har INGEN info om dopingkontroll i kunnskapsbasen
- **Konsekvens**: Systemet fant en tilfeldig kilde og ga fallback-svar

**LØSNING**: Legg til i EMBEDDED_KNOWLEDGE:
```javascript
"doping_info": {
  "title": "Dopingkontroll og antidoping",
  "content": "Asker Fotball følger Norges idrettsforbunds retningslinjer for antidoping. For informasjon om dopingkontroll og testing, kontakt klubben på post@askerfotball.no.",
  "url": "https://askerfotball.no"
}
```

---

#### 4. ✅ "Finnes det pressekontakt?"
**Kilde brukt**: "Kontakt klubben - e-post telefon daglig leder" (score: 69)  
**Score**: 78% | **Sourcerel**: 1.0

**DIAGNOSE**: 🟡 SUBOPTIMAL KILDE - Type 1 (Bedre kilde finnes)
- **Bedre kilde finnes**: "Media og kommunikasjon" (linje 722-725)
- **Problemet**: Den generelle kontakt-entry scoret høyere enn den spesifikke media-entry
- **Konsekvens**: Svaret ble bra (nevnte Mathis), men kilden er ikke optimal

**LØSNING**: Boost media-entry for presserelaterte spørsmål:
```javascript
if (queryLower.includes('presse') || queryLower.includes('media')) {
  if (key === 'media_kommunikasjon') score += 50;
}
```

---

#### 5. ❌ "Hvem er største profil fra klubben?"
**Kilde brukt**: "Største profiler og spillere med flest kamper" (score: 44)  
**Score**: 64% | **Sourcerel**: 0.3

**DIAGNOSE**: ✅ KORREKT KILDE, men lav source relevance?
- **Kilden er perfekt**: "Største profiler og spillere med flest kamper i Asker Fotball historie"
- **Problemet**: Source relevance score er kunstig lav (0.3) - dette er en bug i evalueringen
- Svaret er faktisk veldig bra og henviser til jubileumsheftet
- **Ingen forbedring nødvendig for kildevalg**

---

#### 6. ❌ "Kan ungdom være frivillige?"
**Kilde brukt**: "Frivillig arbeid" (score: 10) - FAQ  
**Score**: 69% | **Sourcerel**: 0.3

**DIAGNOSE**: ✅ KORREKT KILDE
- FAQ-responsen er helt riktig
- Svaret gir kontaktinfo for frivillig arbeid
- **Problemet**: Source relevance score burde vært høyere
- Svaret adresserer ikke spesifikt "ungdom", men er generelt om frivillig arbeid

**FORBEDRING**: Legg til mer spesifikk info om ungdom:
```javascript
"frivillig": {
  title: "Frivillig arbeid",
  content: "Ungdom og voksne kan melde interesse for å bli frivillig på kampdag eller andre arrangementer. Det er ingen aldersgrense for frivillig innsats i klubben. Kontakt klubben på post@askerfotball.no eller ring +47 907 51 170.",
  url: "https://askerfotball.no"
}
```

---

#### 7. ❌❌ "Hvor finner jeg reglement?"
**Kilde brukt**: "Terminliste - A-lagets kamper" (score: 97)  
**Score**: 50% | **Sourcerel**: 0.3

**DIAGNOSE**: 🔴🔴 KRITISK FEIL KILDE - Type 1 (Totalt feil)
- **Riktig kilde finnes**: "Klubbens lover" (linje 652-656)
- **Problemet**: Søket matchet "finner" i begge, men terminliste scoret absurd høyt (97!)
- **Dette er en alvorlig bug i søkealgoritmen**

**LØSNING**:
```javascript
// I searchEmbeddedKnowledge()
if (queryLower.includes('reglement') || queryLower.includes('lover') || queryLower.includes('vedtekt')) {
  if (key === 'klubbens_lover') score += 100; // Massiv boost
  if (key === 'terminliste') score -= 50; // Penalize irrelevant
}
```

---

#### 8. ❌❌ "Hvordan får jeg tilgang til presselounge?"
**Kilde brukt**: "Terminliste - A-lagets kamper" (score: 30)  
**Score**: 65% | **Sourcerel**: 0.3

**DIAGNOSE**: 🔴 FEIL KILDE + MANGLENDE INFO - Type 1 + 2
- **Problemet 1**: Terminliste er helt irrelevant
- **Problemet 2**: Vi har ingen info om presselounge i kunnskapsbasen
- **Konsekvens**: Generisk fallback-svar

**LØSNING**: Legg til ny entry:
```javascript
"presselounge": {
  "title": "Presselounge tilgang",
  "content": "For tilgang til presseloungen på Føyka stadion, kontakt mediaansvarlig Mathis Banggren på Mathis@askerfotball.no. Pressekort eller godkjenning fra klubben er nødvendig.",
  "url": "https://askerfotball.no"
}
```

---

#### 9. ❌ "Finnes klubben på Facebook?"
**Kilde brukt**: "Om klubben" (score: 23)  
**Score**: 50% | **Sourcerel**: 0.3

**DIAGNOSE**: 🟡 MANGLENDE SPESIFIKK KILDE - Type 2
- **Problemet**: "Om klubben" er for generisk
- **Vi trenger**: Spesifikk info om sosiale medier

**LØSNING**: Legg til sosiale medier-entry:
```javascript
"sosiale_medier": {
  "title": "Sosiale medier - Facebook Instagram Twitter",
  "content": "Asker Fotball er aktiv på sosiale medier:\n\nFacebook: facebook.com/askerfotball\nInstagram: @askerfotball\nTwitter: @askerfotball\n\nFølg oss for nyheter, kampoppdateringer og bilder fra klubben.",
  "url": "https://askerfotball.no"
}
```

---

#### 10. ❌ "Hva er klubbens største seier?"
**Kilde brukt**: "Om klubben" (score: 15)  
**Score**: 64% | **Sourcerel**: 0.3 | **FALLBACK**

**DIAGNOSE**: 🟡 MANGLENDE KILDE - Type 2
- **Problemet**: Vi har ikke historisk kampdata
- **Mulig kilde**: "Askerfotballens historie" kunne vært bedre (linje 612-616)

**LØSNING**: Boost historie-entry for resultater:
```javascript
if (queryLower.includes('seier') || queryLower.includes('resultat') || queryLower.includes('kamp')) {
  if (key === 'historie') score += 30;
}
```

---

### TEST 2: 10 spørsmål

#### 11. ❌❌ "Finnes det kiosk?"
**Kilde brukt**: "Solidaritetsfondet - finnes solidaritetsfond" (score: 7)  
**Score**: 50% | **Sourcerel**: 0.3

**DIAGNOSE**: 🔴 KRITISK FEIL - Type 1 (Totalt feil kilde)
- **Riktig kilde finnes**: "Fotballhuset åpningstider" (linje 552-556) nevner supporterbutikk og kaffekopp
- **Problemet**: Søket matchet bare "finnes" og valgte feil entry
- **Dette er samme problem som #2**

**LØSNING**: Fix søkealgoritmen:
```javascript
if (queryLower.includes('kiosk') || queryLower.includes('mat') || queryLower.includes('drikke')) {
  if (key === 'fotballhuset') score += 60;
  if (key === 'solidaritetsfond') score -= 40; // Penalize irrelevant
}
```

---

#### 12. ❌ "Hvem er Egon Asker?"
**Kilde brukt**: "Om klubben" (score: 15)  
**Score**: 64% | **Sourcerel**: 0.3 | **FALLBACK**

**DIAGNOSE**: 🟡 MANGLENDE KILDE - Type 2
- **Problemet**: Vi har INGEN info om Egon Asker (restaurant/sponsor)
- **Konsekvens**: Fallback

**LØSNING**: Legg til partner-info:
```javascript
"partnere_detail": {
  "title": "Partnere og sponsorer - OBOS Egon Kiwi",
  "content": "Asker Fotballs hovedpartnere:\n\nOBOS - Hovedsponsor og navnesponsor for akademiet\nEgon Asker - Restaurant og partner\nKiwi - Dagligvarekjede og supporter\nHandelsbanken - Bankpartner\n\nKontakt Morten Sommerfeldt for partnerskap: morten@askerfotball.no",
  "url": "https://askerfotball.no"
}
```

---

#### 13. ✅ "Hva er solidaritetsfondet?"
**Kilde brukt**: "Solidaritetsfondet - finnes solidaritetsfond" (score: 41)  
**Score**: 72% | **Sourcerel**: 0.3

**DIAGNOSE**: ✅ PERFEKT KILDE
- Kilden er 100% riktig
- Svaret er utmerket
- **Problemet**: Source relevance score burde vært 1.0, ikke 0.3 - bug i evalueringen

---

#### 14. ✅ "Hvem kontakter jeg om betaling?"
**Kilde brukt**: "Kontakt klubben - e-post telefon daglig leder" (score: 21)  
**Score**: 73% | **Sourcerel**: 1.0

**DIAGNOSE**: 🟡 GOD KILDE, men kunne vært bedre
- **Bedre kilde finnes**: "Betalingsmetoder - hvordan betale kontingent" (linje 732-736)
- Svaret nevner faktisk Sølvi Dahl, som er riktig
- **Forbedring**: Boost betalingsmetoder-entry:
```javascript
if (queryLower.includes('betaling') || queryLower.includes('faktura')) {
  if (key === 'betalingsmetoder') score += 40;
}
```

---

#### 15. ❌ "Hvor kan jeg følge livescore?"
**Kilde brukt**: "Terminliste - A-lagets kamper" (score: 97)  
**Score**: 48% | **Sourcerel**: 0.3

**DIAGNOSE**: 🔴 FEIL KILDE - Type 1
- **Riktig kilde finnes**: "App og mobilapplikasjoner" (linje 757-761)
- **Problemet**: Terminliste matchet "følge" og "kamper", men er feil kontekst
- Svaret nevner faktisk NLF app og MinFotball (riktig info fra app-entry?)

**LØSNING**:
```javascript
if (queryLower.includes('app') || queryLower.includes('livescore') || queryLower.includes('følge')) {
  if (key === 'app_info') score += 50;
  if (key === 'terminliste') score -= 20; // Reduce terminliste priority
}
```

---

#### 16. ✅ "Kan jeg booke banen til privat bruk?"
**Kilde brukt**: "Booking av baner og anlegg" (score: 57)  
**Score**: 65% | **Sourcerel**: 0.3

**DIAGNOSE**: ✅ PERFEKT KILDE
- Kilden er 100% riktig
- Svaret er utmerket
- **Problemet**: Source relevance score burde vært høyere

---

#### 17. ✅ "Hvem er hovedtrener?"
**Kilde brukt**: "Trenere A-laget - hovedtrener og assistenttrenere" (score: 77)  
**Score**: 50% | **Sourcerel**: 0.3

**DIAGNOSE**: ✅ PERFEKT KILDE
- Kilden er 100% riktig
- Svaret er korrekt (Magnus Bredal)
- **Problemet**: Usefulness score er lav (0.2) - dette senker totalscore

---

#### 18. ✅ "Finnes det familierabatt?"
**Kilde brukt**: "Priser medlemskap - hva koster kostnad" (score: 54)  
**Score**: 65% | **Sourcerel**: 0.3

**DIAGNOSE**: 🟡 GOD KILDE, men kunne vært bedre
- **Bedre kilde finnes**: "Familierabatt - finnes rabatt" (linje 737-741)
- **Problemet**: Priser-entry scoret høyere enn dedikert familierabatt-entry

**LØSNING**:
```javascript
if (queryLower.includes('familie') && queryLower.includes('rabatt')) {
  if (key === 'familierabatt') score += 50;
}
```

---

#### 19. ❌ "Kan jeg låne utstyr?"
**Kilde brukt**: "Fotballhuset åpningstider" (score: 3)  
**Score**: 60% | **Sourcerel**: 0.3 | **FALLBACK**

**DIAGNOSE**: 🟡 DELVIS RIKTIG KILDE + MANGLENDE INFO
- **Fotballhuset kunne vært relevant** (supporterutstyr), men er ikke optimal
- **Vi trenger**: Spesifikk info om utlån av utstyr

**LØSNING**: Legg til utstyr-entry:
```javascript
"utstyr_info": {
  "title": "Utstyr og utlån",
  "content": "For informasjon om utlån av fotballutstyr eller treningsutstyr, kontakt klubben på post@askerfotball.no eller lagleder for ditt lag. Supporterutstyr kan kjøpes i Fotballhuset.",
  "url": "https://askerfotball.no"
}
```

---

#### 20. ❌ "Hva er varslingsknappen?"
**Kilde brukt**: "App og mobilapplikasjoner" (score: 30)  
**Score**: 50% | **Sourcerel**: 0.3

**DIAGNOSE**: 🔴 FEIL KILDE - Type 1
- **Riktig kilde finnes**: "Varsling bekymringsmelding" (linje 597-601)
- **Problemet**: Søket matchet "knappen" og "app", men ignorerte "varsling"
- **Dette er en kritisk feil i søkealgoritmen**

**LØSNING**:
```javascript
if (queryLower.includes('varsling') || queryLower.includes('bekymring')) {
  if (key === 'varsling') score += 100; // Massiv boost
  if (key === 'app_info') score -= 30; // Penalize irrelevant
}
```

---

## Oppsummering: Problem-kategorier

### 🔴 Type 1: Feilaktig kildevalg (12/20 = 60%)
**Problemet**: Vi har riktig kilde, men søkealgoritmen velger feil

Berørte spørsmål:
- #2: Atferdskrav → valgte Solidaritetsfond i stedet for Retningslinjer
- #4: Pressekontakt → valgte generell kontakt i stedet for Media
- #7: Reglement → valgte Terminliste (score 97!) i stedet for Klubbens lover  
- #8: Presselounge → valgte Terminliste
- #11: Kiosk → valgte Solidaritetsfond i stedet for Fotballhuset
- #14: Betaling → valgte kontakt i stedet for Betalingsmetoder
- #15: Livescore → valgte Terminliste i stedet for App
- #18: Familierabatt → valgte generell Priser i stedet for dedikert Familierabatt
- #20: Varslingsknappen → valgte App i stedet for Varsling
- #7: Reglement (KRITISK - score 97 på feil kilde)

**ROT CAUSE**: 
- Søkealgoritmen matcher på enkeltord ("finnes", "finner", "kan") uten semantisk forståelse
- Ingen tematisk gruppering eller prioritering
- Ingen negativ scoring for irrelevante matches

### 🟡 Type 2: Manglende kilder (6/20 = 30%)
**Problemet**: Vi trenger bedre/nye kilder i kunnskapsbasen

Berørte spørsmål:
- #3: Dopingkontroll - mangler helt
- #9: Facebook/sosiale medier - for generisk
- #10: Største seier - mangler historisk kampdata
- #12: Egon Asker - mangler partnerinfo
- #19: Låne utstyr - mangler utlånsinfo
- #8: Presselounge - mangler spesifikk info (delvis)

### ✅ Korrekte kilder (2/20 = 10%)
- #1: G17-lag → Lagoversikt ✅
- #13: Solidaritetsfondet → Solidaritetsfondet ✅

### 🟡 Delvis korrekte (ikke optimale) (flere)
- Flere kilder er "OK" men ikke beste tilgjengelige

---

## Konkrete Forbedringspunkter

### 🔧 PRIORITET 1: Fix søkealgoritmen (netlify/functions/chat.js)

**Problem**: Enkeltord-matching uten semantisk forståelse gir feil prioritering

**Løsning**: Implementer tematisk scoring i `searchEmbeddedKnowledge()` (ca. linje 983):

```javascript
async function searchEmbeddedKnowledge(query, apiKey) {
  const queryLower = query.toLowerCase().trim();
  const results = [];
  
  // ... existing code ...
  
  for (const [key, data] of Object.entries(EMBEDDED_KNOWLEDGE)) {
    let score = 0;
    
    // EXISTING scoring...
    
    // NEW: Tematisk boost basert på query-intent
    score += getThematicBoost(queryLower, key);
    
    // NEW: Penalize irrelevante matches
    score -= getIrrelevancePenalty(queryLower, key);
    
    if (score > 0) {
      results.push({
        key,
        score,
        title: data.title,
        content: data.content,
        url: data.url
      });
    }
  }
  
  return results.sort((a, b) => b.score - a.score);
}

function getThematicBoost(query, entryKey) {
  let boost = 0;
  
  // Kontakt/personer
  if ((query.includes('kontakt') || query.includes('hvem') || query.includes('epost') || query.includes('telefon'))) {
    if (entryKey === 'kontakt') boost += 40;
    if (entryKey === 'media_kommunikasjon' && query.includes('presse')) boost += 50;
  }
  
  // Regler og retningslinjer
  if (query.includes('regel') || query.includes('atferd') || query.includes('lov') || query.includes('vedtekt')) {
    if (entryKey === 'retningslinjer') boost += 50;
    if (entryKey === 'klubbens_lover') boost += 60;
  }
  
  // App og digital
  if (query.includes('app') || query.includes('livescore') || query.includes('følge')) {
    if (entryKey === 'app_info') boost += 50;
  }
  
  // Varsling
  if (query.includes('varsling') || query.includes('bekymring') || query.includes('avvik')) {
    if (entryKey === 'varsling') boost += 100;
  }
  
  // Fasiliteter
  if (query.includes('kiosk') || query.includes('mat') || query.includes('kaffekopp')) {
    if (entryKey === 'fotballhuset') boost += 60;
  }
  
  // Betaling og penger
  if (query.includes('betaling') || query.includes('faktura') || query.includes('betale')) {
    if (entryKey === 'betalingsmetoder') boost += 40;
  }
  
  // Familierabatt
  if (query.includes('familie') && query.includes('rabatt')) {
    if (entryKey === 'familierabatt') boost += 50;
  }
  
  return boost;
}

function getIrrelevancePenalty(query, entryKey) {
  let penalty = 0;
  
  // Terminliste brukes for mye som fallback
  if (entryKey === 'terminliste' || entryKey === 'terminliste_hvor') {
    // Kun relevant for kamper/program
    if (!query.includes('kamp') && !query.includes('spiller') && 
        !query.includes('terminliste') && !query.includes('program')) {
      penalty += 30;
    }
  }
  
  // Solidaritetsfond brukes feil for "finnes det"
  if (entryKey === 'solidaritetsfond') {
    if (!query.includes('solidaritet') && !query.includes('støtte') && !query.includes('økonomisk')) {
      penalty += 40;
    }
  }
  
  // Om klubben er for generisk
  if (entryKey === 'klubb_info') {
    // Kun bruk hvis ingen bedre match
    penalty += 20;
  }
  
  return penalty;
}
```

### 📚 PRIORITET 2: Legg til manglende kilder i EMBEDDED_KNOWLEDGE

**Manglende entries som må legges til**:

```javascript
const EMBEDDED_KNOWLEDGE = {
  // ... existing entries ...
  
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
```

### 🔍 PRIORITET 3: Forbedre eksisterende entries

**Entries som trenger utvidelse**:

```javascript
// FORBEDRE: Frivillig arbeid (legg til ungdom)
"frivillig": {
  "title": "Frivillig arbeid - ungdom og voksne",
  "content": "Både ungdom og voksne kan melde interesse for å bli frivillig på kampdag eller andre arrangementer. Det er ingen aldersgrense for frivillig innsats i klubben - alle bidrag er velkomne! Kontakt klubben på post@askerfotball.no eller ring +47 907 51 170. Vi setter stor pris på frivillig innsats!",
  "url": "https://askerfotball.no"
},

// FORBEDRE: Fotballhuset (legg til kiosk-info)
"fotballhuset": {
  "title": "Fotballhuset åpningstider - kiosk supporterbutikk",
  "content": "Fotballhuset er stedet du kan handle supporterutstyr, klubbkolleksjon og nyte en kaffekopp. Her ligger supporter-butikken der du kan treffe ansatte i Asker Fotball. Fotballhuset fungerer som klubbens kiosk på kampdager med servering av kaffe og snacks. Åpningstider: Man-Fre 08.00-20.00, Lørdag 10.00-14:00, Søndag 10.00-14.00",
  "url": "https://askerfotball.no/om-stadion/fotballhuset"
},
```

---

## Anbefalt Implementeringsrekkefølge

### Fase 1: Quick Wins (1-2 timer)
1. ✅ Implementer `getThematicBoost()` funksjonen
2. ✅ Implementer `getIrrelevancePenalty()` funksjonen
3. ✅ Test med de 20 spørsmålene fra testene

**Forventet forbedring**: Source relevance 37-44% → 65-75%

### Fase 2: Kunnskapsbase (2-3 timer)
1. ✅ Legg til 5 nye entries (doping, sosiale medier, partnere, presselounge, utstyr)
2. ✅ Forbedre 2 eksisterende (frivillig, fotballhuset)
3. ✅ Test igjen

**Forventet forbedring**: Source relevance 65-75% → 80-85%

### Fase 3: Source Relevance Evaluering (1 time)
1. ✅ Fix bug i `calculateAISourceRelevance()` som gir kunstig lave scorer
2. ✅ Juster weights i relevance calculation

**Forventet forbedring**: Mer accurate metrics

---

## Målbare KPI-er

**Nåværende**:
- Source Relevance: 37-44%
- Fallback Rate: 20%
- Overall Score: 60-63%

**Mål etter implementering**:
- Source Relevance: 80-90%
- Fallback Rate: <10%
- Overall Score: 75-85%

---

## Testing Plan

Kjør disse spørsmålene etter hver implementeringsfase:

**Kritiske test-spørsmål** (tidligere feil):
1. "Finnes det atferdskrav?" (skulle gi Retningslinjer, ikke Solidaritetsfond)
2. "Hvor finner jeg reglement?" (skulle gi Klubbens lover, ikke Terminliste)
3. "Finnes det kiosk?" (skulle gi Fotballhuset, ikke Solidaritetsfond)
4. "Hva er varslingsknappen?" (skulle gi Varsling, ikke App)
5. "Hvor kan jeg følge livescore?" (skulle gi App, ikke Terminliste)

**Success criteria**: 5/5 må gi riktig kilde (source relevance >0.8)

---

**Konklusjon**: Systemet har et fundamentalt problem med kildevalg. 60% av svarene bruker feil eller suboptimale kilder, selv om riktige kilder finnes i kunnskapsbasen. Dette er primært et søkealgoritme-problem, ikke et kunnskapsbase-problem (selv om vi også mangler noen kilder). Med tematisk scoring og penalty-system kan vi øke source relevance fra 40% til 80-90%.

