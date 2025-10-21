# 📋 Regler for Rapport-håndtering

## 🎯 **Hovedregel**
**Alle `.md` rapporter skal umiddelbart flyttes til `kontekst/` mappen etter at de er opprettet.**

## 📁 **Organisering**

### **Kontekst-mappen (`kontekst/`)**
- **Formål**: Lagre alle rapporter, analyser og kontekstuelle filer
- **Innhold**: 
  - `.md` rapporter (alle typer)
  - Test-resultater (`.json`)
  - Scripts og agenter
  - Dokumentasjon og notater

### **Root-mappen**
- **Formål**: Kun kjerne-filer for applikasjonen
- **Tillatt innhold**:
  - `index.html` (hovedapplikasjon)
  - `package.json` (dependencies)
  - `netlify.toml` (deployment config)
  - `allowlist.json` (sikkerhet)
  - `express-server.js` (server)
  - `playwright.config.ts` (testing)
  - Mapper: `assets/`, `config/`, `docs/`, `netlify/`, `scripts/`, `services/`, `storage/`

## 🔄 **Automatisk flytting**

### **Script for flytting**
```bash
# Kjør dette scriptet etter å ha opprettet nye rapporter
node scripts/move-reports-to-context.js
```

### **Hva scriptet gjør**
1. 🔍 Finner alle `.md` filer i root-mappen
2. 📁 Flytter dem til `kontekst/` mappen
3. ✅ Beholder `README.md` i root (hvis den eksisterer)
4. 📊 Rapporterer resultatet

## 📝 **Rapport-typer som skal flyttes**

### **Test-rapporter**
- `*_test_results.json`
- `*_comparison.json`
- `*_metrics.json`

### **Analyse-rapporter**
- `*_ANALYSIS.md`
- `*_AUDIT.md`
- `*_COMPARISON.md`
- `*_SUMMARY.md`
- `*_REPORT.md`

### **Dokumentasjon**
- `*_IMPROVEMENTS.md`
- `*_FIXES.md`
- `*_DEPLOYMENT.md`

## 🚫 **Filer som IKKE skal flyttes**

### **Kjerne-filer (forblir i root)**
- `README.md` (hvis den er hoveddokumentasjon)
- `package.json`
- `netlify.toml`
- `index.html`
- `express-server.js`

### **Konfigurasjon**
- `allowlist.json`
- `playwright.config.ts`
- Filer i `config/` mappen

## 🎯 **Workflow**

### **Når du oppretter en ny rapport:**
1. 📝 Opprett rapporten i root-mappen
2. 🔄 Kjør: `node scripts/move-reports-to-context.js`
3. ✅ Verifiser at filen er flyttet til `kontekst/`
4. 💬 Oppdater chat med: "Rapporten er lagret i kontekst/"

### **Når du oppdaterer eksisterende rapporter:**
1. 📝 Rediger filen i `kontekst/` mappen direkte
2. ✅ Ingen flytting nødvendig

## 📊 **Fordeler med denne organiseringen**

### **Ryddighet**
- Root-mappen inneholder kun kjerne-filer
- Alle rapporter er samlet på ett sted
- Lettere å navigere i prosjektet

### **Organisering**
- Klar separasjon mellom kode og dokumentasjon
- Enkelt å finne gamle rapporter
- Bedre oversikt over prosjektets historie

### **Automatisering**
- Script håndterer flytting automatisk
- Konsistent organisering
- Mindre manuell arbeid

## 🔧 **Tekniske detaljer**

### **Script-lokasjon**
- `scripts/move-reports-to-context.js`
- Kjørbar med `node scripts/move-reports-to-context.js`

### **Mappestruktur**
```
askerbot-demo/
├── kontekst/           # Alle rapporter og analyser
│   ├── *.md           # Markdown rapporter
│   ├── *.json         # Test-resultater
│   └── *.js           # Scripts og agenter
├── scripts/           # Utility scripts
│   └── move-reports-to-context.js
└── [kjerne-filer]     # Applikasjonsfiler
```

## ⚠️ **Viktige notater**

1. **Backup**: Scriptet flytter filer, ikke kopierer dem
2. **Konflikt**: Hvis fil allerede eksisterer i `kontekst/`, vil flytting feile
3. **Sikkerhet**: Scriptet sjekker at `kontekst/` mappen eksisterer før flytting
4. **Logging**: Scriptet viser detaljert output om hva som skjer

---

*Opprettet: $(date)*  
*Formål: Automatisk organisering av rapporter og dokumentasjon*
