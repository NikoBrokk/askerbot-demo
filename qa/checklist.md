# QA Checklist - Asker Fotball Chatbot

## Testspørsmål for validering av kunnskapsbase

Test disse spørsmålene for å verifisere at chatboten gir korrekte svar med tilhørende kilder.

### 1. Grunnleggende klubbinformasjon
**Spørsmål:** "Hva er Asker Fotball?"
**Forventet:** Svar om at det er en fotballklubb, "mer enn en fotballklubb", grunnlagt osv.
**Kilder:** Om klubben-sider

### 2. Stadion og fasiliteter
**Spørsmål:** "Hvor spiller Asker Fotball hjemmekampene sine?"
**Forventet:** Føyka Stadion, kapasitet, historie
**Kilder:** Om stadion-sider

### 3. Akademi og utviklingslag
**Spørsmål:** "Hva er OBOS-Akademiet?"
**Forventet:** Informasjon om fotballakademi for 7-13 år, pris, påmelding
**Kilder:** Lag/utviklingslag/akademi-sider

### 4. Kontakt og ansatte
**Spørsmål:** "Hvordan kan jeg kontakte Asker Fotball?"
**Forventet:** E-post, adresse, ansvarlige personer
**Kilder:** Kontakt-sider, ansatte-sider

### 5. Klubbens historie
**Spørsmål:** "Når ble Føyka Stadion åpnet?"
**Forventet:** 1. juli 1950
**Kilder:** Historiske fakta, stadion-informasjon

### 6. Organisasjon og styre
**Spørsmål:** "Hvem er i styret i Asker Fotball?"
**Forventet:** Navn på styremedlemmer
**Kilder:** Styret-sider

### 7. Solidaritet og samfunnsansvar
**Spørsmål:** "Hva er Solidaritetsfondet?"
**Forventet:** Forklaring av fondets formål og aktiviteter
**Kilder:** Solidaritetsfondet-sider

### 8. Utviklingslag og treningsprogrammer
**Spørsmål:** "Hvilke utviklingslag har Asker Fotball?"
**Forventet:** Informasjon om ulike lag og aldersgrupper
**Kilder:** Utviklingslag-sider

### 9. Praktisk informasjon
**Spørsmål:** "Hva koster det å være med i OBOS-Akademiet?"
**Forventet:** Priser per måned, antall dager per uke
**Kilder:** Akademi-sider

### 10. Fasiliteter og tilbud
**Spørsmål:** "Hvilke fasiliteter finnes på Føyka?"
**Forventet:** Stadion, kunstgress, tribuner, Fotballhuset
**Kilder:** Stadion-sider

## Kilder mangler?

### Sjekkliste for kildevalidering:

- [ ] **Alle svar har kilder**: Hver respons skal inkludere minst én kilde
- [ ] **Kilder er relevante**: Kildene skal faktisk inneholde informasjonen som brukes i svaret
- [ ] **Kilder er oppdaterte**: URL-ene skal fungere og peke til riktige sider
- [ ] **Kilder er fra askerfotball.no**: Prioriter kilder fra klubbens egne sider
- [ ] **Kilder dekker spørsmålet**: Kildene skal gi tilstrekkelig dekning av spørsmålet

### Vanlige problemer:

1. **Generiske svar uten kilder**: Chatboten gir generelle svar uten å referere til spesifikke kilder
2. **Feil kilder**: URL-ene peker til feil sider eller eksisterer ikke
3. **Manglende kilder**: Spørsmål som burde ha kilder får ingen
4. **Urelevante kilder**: Kildene inneholder ikke informasjonen som brukes i svaret
5. **Utgåtte lenker**: Kildene peker til sider som ikke lenger eksisterer

### Debugging-tips:

- Sjekk om spørsmålet matcher innhold i `storage/chunks/`
- Verifiser at BM25-indeksen finner relevante chunks
- Kontroller at ChromaDB embeddings gir gode resultater
- Test både nøkkelordsøk og semantisk søk
- Kjør `npm run reindex` hvis kunnskapsbasen er utdatert

### Kvalitetssjekk:

- [ ] Chatboten gir svar på norsk
- [ ] Svarene er faktisk korrekte basert på kildene
- [ ] Kildene er oppdaterte og relevante
- [ ] Fallback-meldingen brukes når informasjonen mangler
- [ ] Ingen hallucineringer (oppdiktede fakta)

## Automatisk testing

For å teste kunnskapsbasen automatisk:

```bash
# Kjør komplett reindexing
npm run reindex

# Test BM25-indeksen
npm run bm25

# Verifiser at alle filer eksisterer
ls -la storage/index/chroma/
ls -la storage/index/bm25/
```

## Oppfølging

Hvis du finner problemer:

1. **Dokumenter feilen**: Skriv ned spørsmålet og det feilaktige svaret
2. **Sjekk kildene**: Verifiser om informasjonen finnes i rådata
3. **Test søk**: Sjekk om både BM25 og ChromaDB finner relevante chunks
4. **Oppdater kunnskapsbasen**: Kjør `npm run reindex` hvis nødvendig
5. **Test igjen**: Verifiser at problemet er løst
