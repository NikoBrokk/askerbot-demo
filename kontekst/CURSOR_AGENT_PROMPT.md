# 🤖 Cursor Agent Prompt - Fix Source Relevance

**Bruk Cursor Agent for autonome, iterative oppgaver**

---

## PROMPT (Kopier alt under dette)

```
OPPGAVE:
Fix source relevance systemet i Asker Fotball chatbot RAG-pipeline

WORKSPACE:
/Users/nikolaigabrielsen/Downloads/askerbot-demo/

BAKGRUNN:
Jeg har kjørt 2 RAG-tester med 20 spørsmål totalt. Analysen viser at kun 30% av svarene bruker korrekt kilde. Source Relevance score er kritisk lav på 37-44%.

PROBLEM-DIAGNOSE:
1. FEILAKTIG KILDEVALG (60%): Vi har riktige kilder, men søkealgoritmen velger feil
   - "Terminliste" scorer absurd høyt (97) på irrelevante spørsmål
   - "Solidaritetsfondet" matcher feil på "finnes det" spørsmål
   - Eksempel: "Hvor finner jeg reglement?" → valgte Terminliste i stedet for Klubbens lover

2. MANGLENDE KILDER (30%): Vi trenger 6 nye entries i kunnskapsbasen
   - Dopingkontroll, sosiale medier, partnere, presselounge, utstyr, historiske data

3. ROOT CAUSE: Søkealgoritmen matcher enkeltord uten semantisk forståelse

LØSNING:
Implementer 4-stegs forbedring i netlify/functions/chat.js:

STEG 1: Legg til tematisk scoring
- Ny funksjon: getThematicBoost(query, entryKey)
- Gir bonus (+40 til +120) for semantisk relevante kilder
- Eksempel: "varsling" spørsmål → boost "varsling" entry med +120

STEG 2: Legg til irrelevance penalty
- Ny funksjon: getIrrelevancePenalty(query, entryKey)
- Straffer (-25 til -50) kjente problematiske matches
- Eksempel: Terminliste får -40 penalty hvis spørsmål ikke er om kamper

STEG 3: Integrer i searchEmbeddedKnowledge()
- Kall begge nye funksjoner i søkeloopen
- Plasser ETTER semanticMatches, FØR score-sjekk

STEG 4: Legg til 6 nye EMBEDDED_KNOWLEDGE entries
- doping_antidoping
- sosiale_medier (Facebook, Instagram)
- partnere_detail (OBOS, Egon Asker, Kiwi, Handelsbanken)
- presselounge_tilgang
- utstyr_utlan
- Forbedre: frivillig (legg til ungdom), fotballhuset (legg til kiosk)

DETALJERT IMPLEMENTERING:

Se IMPLEMENTATION_PLAN.md for eksakt kode.

Nøkkel-krav:
- getThematicBoost() må håndtere: kontakt, regler, app, varsling, kiosk, betaling, familie, sosiale medier, partnere, presse, utstyr, doping
- getIrrelevancePenalty() må straffe: terminliste (ikke om kamper), solidaritetsfond (ikke om støtte), klubb_info (alltid)
- Alle nye entries må ha title, content, url

TESTING:
Etter implementering, test disse 5 kritiske spørsmålene (tidligere feilmatcher):

1. "Finnes det atferdskrav?" → SKAL gi "Retningslinjer for barnefotball"
2. "Hvor finner jeg reglement?" → SKAL gi "Klubbens lover"
3. "Finnes det kiosk?" → SKAL gi "Fotballhuset åpningstider - kiosk supporterbutikk"
4. "Hva er varslingsknappen?" → SKAL gi "Varsling bekymringsmelding"
5. "Hvor kan jeg følge livescore?" → SKAL gi "App og mobilapplikasjoner"

Kjør: npm run test

SUCCESS CRITERIA:
- Source Relevance: minst 80% (opp fra 40%)
- Alle 5 test-cases må gi riktig kilde
- Ingen syntaksfeil eller runtime errors
- Fallback rate under 10%

PROSESS:
1. Les SOURCE_RELEVANCE_ANALYSIS.md og IMPLEMENTATION_PLAN.md
2. Implementer alle 4 steg
3. Test med 5 kritiske spørsmål
4. Kjør npm run test
5. Analyser resultater
6. Juster boosts/penalties hvis nødvendig
7. Rapporter forbedring

FORVENTET TID: 2-3 timer
```

---

## HVORDAN BRUKE AGENT:

1. **Start Agent**: Trykk `Cmd+Shift+I` (Mac) eller `Ctrl+Shift+I` (Windows)
2. **Kopier prompten over** og lim inn
3. **La Agent jobbe** - den vil:
   - Lese dokumentasjonen
   - Implementere endringene
   - Teste løsningen
   - Iterere hvis nødvendig
4. **Følg med på fremdriften**
5. **Godkjenn eller avvis** Agents forslag underveis

---

## FORDELER MED AGENT:

✅ **Autonomi**: Agent kan lese dokumentene selv og forstå kontekst  
✅ **Iterasjon**: Kan teste og justere basert på resultater  
✅ **Debugging**: Kan fikse feil underveis  
✅ **Grundighet**: Vil verifisere at alt fungerer

---

## ULEMPER MED AGENT:

❌ **Tregere**: Tar lengre tid enn Composer  
❌ **Mindre kontroll**: Du ser ikke alle endringer før de skjer  
❌ **Kan bomme**: Kan gjøre feil som må korrigeres  
❌ **Krever tilsyn**: Du må følge med på hva den gjør

---

## ANBEFALING:

**Bruk Composer** hvis:
- Du vil ha full kontroll
- Du vil forhåndsvise alle endringer
- Du vil ha raskest mulig implementering
- Oppgaven er veldefinert (som denne er)

**Bruk Agent** hvis:
- Du vil ha hands-off løsning
- Du vil at AI skal teste og iterere
- Du har tid til å la Agent jobbe
- Du vil at Agent skal lese dokumentasjonen selv

