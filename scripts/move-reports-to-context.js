#!/usr/bin/env node

/**
 * Script for å flytte alle .md rapporter til kontekst/ mappen
 * Dette scriptet skal kjøres etter at nye rapporter er generert
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const CONTEXT_DIR = path.join(ROOT_DIR, 'kontekst');

// Sørg for at kontekst-mappen eksisterer
if (!fs.existsSync(CONTEXT_DIR)) {
    fs.mkdirSync(CONTEXT_DIR, { recursive: true });
}

// Finn alle .md filer i root-mappen (unntatt docs/ og kontekst/)
function findMarkdownFiles() {
    const files = fs.readdirSync(ROOT_DIR);
    return files.filter(file => {
        const fullPath = path.join(ROOT_DIR, file);
        const stat = fs.statSync(fullPath);
        
        // Kun filer (ikke mapper), .md filer, og ikke i docs/ eller kontekst/
        return stat.isFile() && 
               file.endsWith('.md') && 
               !file.startsWith('.') &&
               file !== 'README.md'; // Behold README.md i root
    });
}

// Flytt fil til kontekst-mappen
function moveFileToContext(filename) {
    const sourcePath = path.join(ROOT_DIR, filename);
    const targetPath = path.join(CONTEXT_DIR, filename);
    
    try {
        fs.renameSync(sourcePath, targetPath);
        console.log(`✅ Flyttet: ${filename} → kontekst/${filename}`);
        return true;
    } catch (error) {
        console.error(`❌ Feil ved flytting av ${filename}:`, error.message);
        return false;
    }
}

// Hovedfunksjon
function main() {
    console.log('🔍 Søker etter .md rapporter i root-mappen...');
    
    const markdownFiles = findMarkdownFiles();
    
    if (markdownFiles.length === 0) {
        console.log('✅ Ingen .md rapporter funnet som trenger flytting');
        return;
    }
    
    console.log(`📄 Fant ${markdownFiles.length} .md fil(er) som skal flyttes:`);
    markdownFiles.forEach(file => console.log(`   - ${file}`));
    
    let movedCount = 0;
    markdownFiles.forEach(file => {
        if (moveFileToContext(file)) {
            movedCount++;
        }
    });
    
    console.log(`\n🎉 Flyttet ${movedCount}/${markdownFiles.length} filer til kontekst/`);
    
    if (movedCount === markdownFiles.length) {
        console.log('✅ Alle rapporter er nå organisert i kontekst/ mappen');
    } else {
        console.log('⚠️  Noen filer kunne ikke flyttes - sjekk feilmeldingene over');
    }
}

// Kjør scriptet
if (require.main === module) {
    main();
}

module.exports = { findMarkdownFiles, moveFileToContext };
