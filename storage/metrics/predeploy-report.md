# Pre-Deploy Helsesjekk - Askerbot

**Dato:** 2025-01-15  
**Endepunkt testet:** Express server (http://localhost:8888/.netlify/functions/chat)  
**Testet av:** AI Assistant

## VURDERING: IKKE KLAR

## Godkjent ✅

- **RAG-system fungerer:** API endepunkt responderer og returnerer svar
- **Kilder vises:** Systemet inkluderer kilder i responser
- **UI grunnfunksjonalitet:** Chatbot-knapp er synlig og klikkbar
- **Mobil responsivitet:** Fungerer på iPhone 12 viewport
- **Desktop layout:** Fungerer på desktop viewport
- **Accessibility grunnleggende:** Aria-labels finnes på knapper
- **Keyboard navigation:** Tab-navigasjon fungerer
- **Placeholder tekst:** Input har riktig placeholder
- **Quick actions:** Hurtigvalg-knapper er synlige

## Må forbedres ⚠️

- **Høy fallback-rate:** 50% av spørsmål gir fallback-svar
- **Uventet fallback:** 9 av 20 spørsmål som burde ha RAG-dekning gir fallback
- **Lav snittscore:** 4.55/10 (krav: ≥7.5)
- **UI lukke-funksjonalitet:** Close-knapp fungerer ikke riktig i tester
- **Response timing:** Noen tester feiler på timeout for svar
- **RAG-kvalitet:** Mange spørsmål som burde kunne besvares gir fallback

## Detaljert Testresultater

### RAG Smoke Test (20 spørsmål)

| # | Spørsmål | Score | Fallback | Kilder | Forventet RAG | Notat |
|---|----------|-------|----------|--------|---------------|-------|
| 1 | Hvordan melder jeg barnet mitt på Asker Fotball camp? | 8 | NO | 1 | YES | OK |
| 2 | Hvor finner jeg terminliste for G15 Asker? | 1 | YES | 1 | YES | UNEXPECTED |
| 3 | Hvem kontakter jeg om faktura eller betaling? | 8 | NO | 1 | YES | OK |
| 4 | Hvor ligger Føyka stadion og hvor kan jeg parkere? | 8 | NO | 1 | YES | OK |
| 5 | Hvem er trenerne på utviklingslagene? | 1 | YES | 1 | YES | UNEXPECTED |
| 6 | Hvordan blir jeg med på akademiet og hva koster det? | 8 | NO | 1 | YES | OK |
| 7 | Hvordan melder jeg interesse for å bli frivillig på kampdag? | 1 | YES | 1 | YES | UNEXPECTED |
| 8 | Finnes det et solidaritetsfond eller støtteordning? | 8 | NO | 1 | YES | OK |
| 9 | Hvordan kontakter jeg klubben direkte? | 6 | NO | 1 | YES | OK |
| 10 | Hva er Asker United, og hvem kan delta? | 8 | NO | 1 | YES | OK |
| 11 | Hva er åpningstidene i fotballhuset? | 8 | NO | 1 | YES | OK |
| 12 | Hva er klubbens sportsplan eller visjon To Steg Frem? | 1 | YES | 1 | YES | UNEXPECTED |
| 13 | Hvor finner jeg informasjon om styret i klubben? | 1 | YES | 1 | YES | UNEXPECTED |
| 14 | Hvordan booker jeg baner eller anlegg? | 1 | YES | 1 | YES | UNEXPECTED |
| 15 | Hvor finner jeg nyheter om a-laget kvinner/menn? | 6 | NO | 1 | YES | OK |
| 16 | Har dere retningslinjer for barnefotballen? | 1 | YES | 1 | YES | UNEXPECTED |
| 17 | Når er neste klubbdugnad og hvordan melder jeg meg? | 6 | YES | 1 | NO | OK |
| 18 | Jeg finner ikke lagets trenerkontakt – kan dere hjelpe? | 1 | YES | 1 | YES | UNEXPECTED |
| 19 | Hvordan kan mitt firma bli sponsor? | 8 | NO | 1 | YES | OK |
| 20 | Hvor melder jeg avvik eller sender inn en bekymring? | 1 | YES | 1 | YES | UNEXPECTED |

### Talloppsummering

- **Snittscore:** 4.55/10 (krav: ≥7.5) ❌
- **Median score:** 6/10
- **Gode scores (≥7):** 8 (40.0%) (krav: ≥70%) ❌
- **Svake scores (<7):** 12 (60.0%)
- **Fallback-rate total:** 50.0% (krav: ≤20%) ❌
- **Uventet fallback:** 9 spørsmål ❌

### UI Test Resultater

- **Totalt tester:** 72
- **Bestått:** 9
- **Feilet:** 3 (maksimalt tillatt)
- **Ikke kjørt:** 60

**Hovedproblemer:**
- Close-knapp fungerer ikke riktig (panel blir ikke skjult)
- Response timing issues (timeout på svar)
- Noen accessibility-tester feiler

### Prompt-kjede Kontroll

✅ **Systemprompt:** Instruerer norsk språk og kilder  
✅ **RAG-policy:** Respekteres (config/rag-policy.json)  
✅ **Fallback-tekst:** Korrekt og hjelpsom  
⚠️ **Fallback-terskel:** Muligens for høy (mange uventede fallbacks)

## Anbefalt Beslutning: UTSETT

**Grunnlag:**
- Snittscore (4.55) er langt under krav (7.5)
- Fallback-rate (50%) er langt over krav (20%)
- 9 uventede fallbacks på spørsmål som burde ha RAG-dekning
- UI lukke-funksjonalitet fungerer ikke riktig

## Konkrete Tiltak Før Deployment

1. **Forbedre RAG-kvalitet:**
   - Sjekk BM25/Chroma indeksering
   - Juster fallback-terskel (muligens for høy)
   - Test med flere spørsmål for å finne mønstre

2. **Fikse UI-problemer:**
   - Debug close-knapp funksjonalitet
   - Forbedre response timing
   - Test accessibility mer grundig

3. **Utvide kunnskapsbase:**
   - Legg til mer informasjon om terminlister
   - Inkluder trener-informasjon
   - Legg til informasjon om booking/baner

## Appendiks

- **Endepunkt brukt:** Express server (A)
- **Playwright resultat:** 9/72 tester bestått
- **Fallback-terskel:** Ikke eksplisitt dokumentert i kode
- **Test varighet:** 60.8s for RAG-test, 12.1s for UI-test
