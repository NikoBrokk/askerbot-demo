# 🔍 Source Relevance Fix - Komplett Guide

**Dato**: 22. oktober 2025  
**Problem**: 60% av svarene bruker feil kilder  
**Løsning**: Tematisk scoring + penalty system  
**Estimert forbedring**: Source Relevance 40% → 85%

---

## 📊 Situasjonen

### Testresultater (2 tester, 20 spørsmål):

| Metric | Score | Status |
|--------|-------|--------|
| Source Relevance | **37-44%** | 🔴 KRITISK LAV |
| Correct Source Rate | **30%** | 🔴 KRITISK LAV |
| Fallback Rate | **20%** | 🟡 Middels |

**Konklusjon**: Systemet velger feil kilde i 70% av tilfellene!

---

## 🎯 Løsningen

### 4-stegs forbedring i `chat.js`:

1. ✅ **Tematisk scoring** - Boost riktige kilder (+40 til +120)
2. ✅ **Irrelevance penalty** - Straff feil kilder (-25 til -50)
3. ✅ **6 nye kilder** - Legg til manglende entries
4. ✅ **Forbedre 2 kilder** - Utvid eksisterende

**Estimert tid**: 3-4 timer (eller 12 min med Cursor Composer!)

---

## 📁 Dokumenter

### Analyse:
- **`SOURCE_RELEVANCE_ANALYSIS.md`** - Detaljert analyse av alle 20 spørsmål
- **`KILDETABELL_ANALYSE.md`** - Visuell tabell over alle resultater
- **`KILDEANALYSE_OPPSUMMERING.md`** - Executive summary

### Implementering:
- **`IMPLEMENTATION_PLAN.md`** - Steg-for-steg guide med kode
- **`CURSOR_COMPOSER_PROMPT.md`** - ⭐ **ANBEFALT** - Bruk Composer
- **`CURSOR_AGENT_PROMPT.md`** - Alternativ med Agent
- **`CURSOR_CHOICE_GUIDE.md`** - Hvilken å velge?

---

## 🚀 Quick Start (Anbefalt Metode)

### Metode 1: Cursor Composer ⭐ RASKEST

**Tid**: 12 minutter totalt

1. **Åpne Composer**: `Cmd+I` (Mac) eller `Ctrl+I` (Windows)
2. **Kopier prompt**: Fra `CURSOR_COMPOSER_PROMPT.md`
3. **Lim inn** og trykk Enter
4. **Review** endringene (2 min)
5. **Accept** hvis OK
6. **Test**: `npm run test` (5 min)
7. **Deploy**: `git add/commit/push`

✅ **Fordeler**: Rask, kontroll, preview, presist  
❌ **Ulemper**: Ingen

---

### Metode 2: Cursor Agent (Hvis du vil)

**Tid**: 20-30 minutter

1. **Start Agent**: `Cmd+Shift+I`
2. **Kopier prompt**: Fra `CURSOR_AGENT_PROMPT.md`
3. **La Agent jobbe** autonom
4. **Følg med** og godkjenn underveis

✅ **Fordeler**: Autonom, tester selv, itererer  
❌ **Ulemper**: Tregere, mindre kontroll

---

### Metode 3: Manuell Implementering

**Tid**: 3-4 timer

Følg `IMPLEMENTATION_PLAN.md` steg for steg.

---

## 📈 Forventede Resultater

### Før:
```
Source Relevance:    40%
Correct Sources:     30%
Fallback Rate:       20%
Overall Score:       60%
```

### Etter:
```
Source Relevance:    85%  ⬆️ +112%
Correct Sources:     90%  ⬆️ +200%
Fallback Rate:       <10% ⬇️ -50%
Overall Score:       80%  ⬆️ +33%
```

---

## 🧪 Testing

### Kritiske test-cases (må alle passere):

```bash
# Test 1: Atferdskrav
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Finnes det atferdskrav?"}'
# SKAL gi: "Retningslinjer for barnefotball"

# Test 2: Reglement  
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hvor finner jeg reglement?"}'
# SKAL gi: "Klubbens lover"

# Test 3: Kiosk
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Finnes det kiosk?"}'
# SKAL gi: "Fotballhuset åpningstider - kiosk supporterbutikk"

# Test 4: Varslingsknappen
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hva er varslingsknappen?"}'
# SKAL gi: "Varsling bekymringsmelding"

# Test 5: Livescore
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hvor kan jeg følge livescore?"}'
# SKAL gi: "App og mobilapplikasjoner"
```

**Success criteria**: 5/5 må gi korrekt kilde

---

## 🔧 Hva Skal Endres

### I `netlify/functions/chat.js`:

**Nye funksjoner** (2 stk):
- `getThematicBoost()` - Gir bonus for relevante kilder
- `getIrrelevancePenalty()` - Straffer irrelevante kilder

**Modifisert funksjon** (1 stk):
- `searchEmbeddedKnowledge()` - Kaller nye funksjoner

**Nye EMBEDDED_KNOWLEDGE entries** (6 stk):
- `doping_antidoping`
- `sosiale_medier`
- `partnere_detail`
- `presselounge_tilgang`
- `utstyr_utlan`

**Forbedrede entries** (2 stk):
- `frivillig` - Legg til ungdom
- `fotballhuset` - Legg til kiosk-info

---

## 📊 Problem-kategorier Funnet

### 🔴 Type 1: Feilaktig kildevalg (60%)
**Eksempler**:
- "Hvor finner jeg reglement?" → valgte Terminliste (score: 97!) i stedet for Klubbens lover
- "Finnes det kiosk?" → valgte Solidaritetsfondet i stedet for Fotballhuset

**Root cause**: Enkeltord-matching uten semantikk  
**Fix**: Tematisk scoring + penalty

### 🟡 Type 2: Manglende kilder (30%)
**Eksempler**:
- "Hvem er Egon Asker?" - mangler partnerinfo
- "Kan jeg låne utstyr?" - mangler utlånsinfo

**Root cause**: Ikke i kunnskapsbasen  
**Fix**: Legg til 6 nye entries

---

## ⚡ ROI

| Investment | Return |
|------------|--------|
| **Tid**: 12 min (Composer) eller 3-4 timer (manuelt) | **Forbedring**: +112% source relevance |
| **Endringer**: 1 fil (chat.js) | **Impact**: 70% flere riktige kilder |
| **Kompleksitet**: Lav-middels | **Brukeropplevelse**: Dramatisk bedre |

**ROI**: Ekstremt høy 🚀

---

## 🎯 Min Anbefaling

```
┌─────────────────────────────────────────────┐
│                                             │
│  1. BRUK CURSOR COMPOSER                   │
│     (åpne CURSOR_COMPOSER_PROMPT.md)       │
│                                             │
│  2. KOPIER PROMPT                           │
│     (hele prompten)                         │
│                                             │
│  3. LIM INN I COMPOSER                      │
│     (Cmd+I)                                 │
│                                             │
│  4. REVIEW & ACCEPT                         │
│     (2 minutter)                            │
│                                             │
│  5. TEST                                    │
│     (npm run test)                          │
│                                             │
│  6. DEPLOY                                  │
│     (git add/commit/push)                   │
│                                             │
│  Total tid: 12 minutter                     │
│  Forbedring: +112%                          │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 📞 Support

Hvis noe feiler:
1. Sjekk `IMPLEMENTATION_PLAN.md` for troubleshooting
2. Kjør `npm run dev` på nytt
3. Sjekk console for feilmeldinger
4. Verifiser at alle krøllparenteser matcher i `chat.js`

---

## ✅ Checklist

- [ ] Lest SOURCE_RELEVANCE_ANALYSIS.md
- [ ] Valgt Composer (anbefalt) eller Agent
- [ ] Kopiert relevant prompt
- [ ] Kjørt i Cursor
- [ ] Reviewet endringer
- [ ] Acceptert endringer
- [ ] Testet med `npm run test`
- [ ] Testet 5 kritiske spørsmål
- [ ] Alle tests passerer
- [ ] Deployed til produksjon
- [ ] Source relevance >80%

---

**Good luck! 🚀**

**Se `CURSOR_COMPOSER_PROMPT.md` for å komme i gang nå!**

