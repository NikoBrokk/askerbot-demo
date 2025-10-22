#!/usr/bin/env node

/**
 * Pipeline Verification Script for Askerbot
 * Verifiserer at alle URLer fra allowlist.json har blitt:
 * 1. Fetchet (raw HTML)
 * 2. Parset (parsed JSON)
 * 3. Chunket (chunks JSONL)
 * 4. Embeddet (ChromaDB collection)
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class PipelineVerifier {
  constructor() {
    this.baseDir = path.join(__dirname, '..');
    this.allowlistPath = path.join(this.baseDir, 'allowlist.json');
    this.rawDir = path.join(this.baseDir, 'storage', 'raw');
    this.parsedDir = path.join(this.baseDir, 'storage', 'parsed');
    this.chunksDir = path.join(this.baseDir, 'storage', 'chunks');
    this.chromaDir = path.join(this.baseDir, 'storage', 'index', 'chroma');
    this.bm25Dir = path.join(this.baseDir, 'storage', 'index', 'bm25');
    
    this.results = {
      allowlist: { total: 0, static: 0, news: 0 },
      fetched: { count: 0, missing: [] },
      parsed: { count: 0, missing: [] },
      chunked: { count: 0, missing: [], totalChunks: 0 },
      bm25: { exists: false, chunkCount: 0 },
      chroma: { exists: false, collections: [] }
    };
  }

  /**
   * Generer slug fra URL (samme logikk som fetch.js og parse.js)
   */
  generateSlug(url) {
    const urlObj = new URL(url);
    let slug = urlObj.pathname
      .replace(/^\//, '')
      .replace(/\/$/, '')
      .replace(/\//g, '_');
    
    if (!slug) slug = 'index';
    return slug;
  }

  /**
   * Les allowlist og returner alle URLer
   */
  async loadAllowlist() {
    const data = await fs.readFile(this.allowlistPath, 'utf8');
    const allowlist = JSON.parse(data);
    
    const staticPages = allowlist.static_pages || [];
    const newsArticles = allowlist.news_articles || [];
    
    this.results.allowlist = {
      total: staticPages.length + newsArticles.length,
      static: staticPages.length,
      news: newsArticles.length
    };
    
    return [...staticPages, ...newsArticles];
  }

  /**
   * Sjekk om en fil eksisterer
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verifiser fetch-steget
   */
  async verifyFetched(urls) {
    console.log('\n📥 Verifiserer fetch (raw HTML)...');
    
    for (const url of urls) {
      const slug = this.generateSlug(url);
      const htmlPath = path.join(this.rawDir, `${slug}.html`);
      
      if (await this.fileExists(htmlPath)) {
        this.results.fetched.count++;
      } else {
        this.results.fetched.missing.push({ url, slug, expectedPath: htmlPath });
      }
    }
    
    console.log(`  ✅ Funnet: ${this.results.fetched.count}/${urls.length}`);
    console.log(`  ❌ Mangler: ${this.results.fetched.missing.length}`);
  }

  /**
   * Verifiser parse-steget
   */
  async verifyParsed(urls) {
    console.log('\n🔍 Verifiserer parse (parsed JSON)...');
    
    for (const url of urls) {
      const slug = this.generateSlug(url);
      const jsonPath = path.join(this.parsedDir, `${slug}.json`);
      
      if (await this.fileExists(jsonPath)) {
        this.results.parsed.count++;
      } else {
        this.results.parsed.missing.push({ url, slug, expectedPath: jsonPath });
      }
    }
    
    console.log(`  ✅ Funnet: ${this.results.parsed.count}/${urls.length}`);
    console.log(`  ❌ Mangler: ${this.results.parsed.missing.length}`);
  }

  /**
   * Verifiser chunk-steget
   */
  async verifyChunked(urls) {
    console.log('\n✂️  Verifiserer chunking (chunks JSONL)...');
    
    let totalChunks = 0;
    
    for (const url of urls) {
      const slug = this.generateSlug(url);
      const chunksPath = path.join(this.chunksDir, `${slug}.jsonl`);
      
      if (await this.fileExists(chunksPath)) {
        this.results.chunked.count++;
        
        // Tell antall chunks i filen
        const content = await fs.readFile(chunksPath, 'utf8');
        const lines = content.trim().split('\n').filter(line => line.trim());
        totalChunks += lines.length;
      } else {
        this.results.chunked.missing.push({ url, slug, expectedPath: chunksPath });
      }
    }
    
    this.results.chunked.totalChunks = totalChunks;
    
    console.log(`  ✅ Funnet: ${this.results.chunked.count}/${urls.length}`);
    console.log(`  📊 Totalt antall chunks: ${totalChunks}`);
    console.log(`  ❌ Mangler: ${this.results.chunked.missing.length}`);
  }

  /**
   * Verifiser BM25 index
   */
  async verifyBM25() {
    console.log('\n📇 Verifiserer BM25 index...');
    
    const indexPath = path.join(this.bm25Dir, 'bm25-index.json');
    const metadataPath = path.join(this.bm25Dir, 'chunk-metadata.json');
    const statsPath = path.join(this.bm25Dir, 'index-stats.json');
    
    this.results.bm25.exists = await this.fileExists(indexPath);
    
    if (this.results.bm25.exists) {
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      this.results.bm25.chunkCount = Object.keys(metadata).length;
      
      const stats = JSON.parse(await fs.readFile(statsPath, 'utf8'));
      this.results.bm25.stats = stats;
      
      console.log(`  ✅ BM25 index funnet`);
      console.log(`  📊 Chunks i index: ${this.results.bm25.chunkCount}`);
      console.log(`  📅 Sist oppdatert: ${stats.index_created_at}`);
    } else {
      console.log(`  ❌ BM25 index ikke funnet`);
    }
  }

  /**
   * Verifiser ChromaDB
   */
  async verifyChroma() {
    console.log('\n🗄️  Verifiserer ChromaDB...');
    
    try {
      const chromadb = require('chromadb');
      const { Settings } = require('chromadb');
      
      const client = new chromadb.PersistentClient({
        path: this.chromaDir,
        settings: new Settings({
          anonymized_telemetry: false
        })
      });
      
      const collections = await client.listCollections();
      this.results.chroma.collections = collections.map(c => c.name);
      this.results.chroma.exists = collections.length > 0;
      
      console.log(`  ✅ ChromaDB funnet`);
      console.log(`  📊 Collections: ${collections.length}`);
      
      for (const collection of collections) {
        const count = await collection.count();
        console.log(`    - ${collection.name}: ${count} dokumenter`);
        this.results.chroma[collection.name] = { count };
      }
    } catch (error) {
      console.log(`  ⚠️  Kunne ikke verifisere ChromaDB: ${error.message}`);
      console.log(`  💡 Kjør: python scripts/embed.py for å bygge ChromaDB`);
      this.results.chroma.exists = false;
      this.results.chroma.error = error.message;
    }
  }

  /**
   * Analyser og rapporter problemer
   */
  async analyzeAndReport() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 OPPSUMMERING AV PIPELINE-VERIFIKASJON');
    console.log('='.repeat(70));
    
    // Allowlist oversikt
    console.log(`\n📋 Allowlist:`);
    console.log(`  Totalt URLer: ${this.results.allowlist.total}`);
    console.log(`  - Statiske sider: ${this.results.allowlist.static}`);
    console.log(`  - Nyhetsartikler: ${this.results.allowlist.news}`);
    
    // Fetch status
    console.log(`\n📥 Fetch (raw HTML):`);
    console.log(`  Status: ${this.results.fetched.count}/${this.results.allowlist.total} ` +
      `(${((this.results.fetched.count/this.results.allowlist.total)*100).toFixed(1)}%)`);
    if (this.results.fetched.missing.length > 0) {
      console.log(`  ⚠️  ${this.results.fetched.missing.length} manglende filer`);
    }
    
    // Parse status
    console.log(`\n🔍 Parse (parsed JSON):`);
    console.log(`  Status: ${this.results.parsed.count}/${this.results.allowlist.total} ` +
      `(${((this.results.parsed.count/this.results.allowlist.total)*100).toFixed(1)}%)`);
    if (this.results.parsed.missing.length > 0) {
      console.log(`  ⚠️  ${this.results.parsed.missing.length} manglende filer`);
    }
    
    // Chunking status
    console.log(`\n✂️  Chunking (chunks JSONL):`);
    console.log(`  Status: ${this.results.chunked.count}/${this.results.allowlist.total} ` +
      `(${((this.results.chunked.count/this.results.allowlist.total)*100).toFixed(1)}%)`);
    console.log(`  Totalt chunks: ${this.results.chunked.totalChunks}`);
    if (this.results.chunked.count > 0) {
      console.log(`  Gjennomsnitt chunks per dokument: ${(this.results.chunked.totalChunks/this.results.chunked.count).toFixed(1)}`);
    }
    if (this.results.chunked.missing.length > 0) {
      console.log(`  ⚠️  ${this.results.chunked.missing.length} manglende filer`);
    }
    
    // BM25 status
    console.log(`\n📇 BM25 Index:`);
    if (this.results.bm25.exists) {
      console.log(`  ✅ Status: OK`);
      console.log(`  Chunks indexert: ${this.results.bm25.chunkCount}`);
      const coverage = ((this.results.bm25.chunkCount/this.results.chunked.totalChunks)*100).toFixed(1);
      console.log(`  Dekning: ${coverage}%`);
      
      if (this.results.bm25.chunkCount !== this.results.chunked.totalChunks) {
        console.log(`  ⚠️  Index er ikke oppdatert! Forventet ${this.results.chunked.totalChunks} chunks`);
      }
    } else {
      console.log(`  ❌ Status: Mangler`);
      console.log(`  💡 Kjør: npm run build:bm25`);
    }
    
    // ChromaDB status
    console.log(`\n🗄️  ChromaDB:`);
    if (this.results.chroma.exists) {
      console.log(`  ✅ Status: OK`);
      console.log(`  Collections: ${this.results.chroma.collections.join(', ')}`);
    } else {
      console.log(`  ❌ Status: Mangler eller ikke tilgjengelig`);
      if (this.results.chroma.error) {
        console.log(`  Feil: ${this.results.chroma.error}`);
      }
      console.log(`  💡 Kjør: python scripts/embed.py`);
    }
    
    // Kritiske problemer
    console.log(`\n🔴 KRITISKE PROBLEMER:`);
    
    const issues = [];
    
    if (this.results.fetched.missing.length > 0) {
      issues.push(`${this.results.fetched.missing.length} URLer ikke fetchet`);
    }
    
    if (this.results.parsed.missing.length > 0) {
      issues.push(`${this.results.parsed.missing.length} filer ikke parset`);
    }
    
    if (this.results.chunked.missing.length > 0) {
      issues.push(`${this.results.chunked.missing.length} filer ikke chunket`);
    }
    
    if (this.results.bm25.exists && this.results.bm25.chunkCount !== this.results.chunked.totalChunks) {
      issues.push(`BM25 index er utdatert (${this.results.bm25.chunkCount}/${this.results.chunked.totalChunks} chunks)`);
    }
    
    if (!this.results.bm25.exists) {
      issues.push('BM25 index mangler');
    }
    
    if (!this.results.chroma.exists) {
      issues.push('ChromaDB mangler eller er utilgjengelig');
    }
    
    if (issues.length === 0) {
      console.log(`  ✅ Ingen kritiske problemer funnet!`);
    } else {
      issues.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue}`);
      });
    }
    
    // Manglende filer detaljer
    if (this.results.fetched.missing.length > 0) {
      console.log(`\n📋 MANGLENDE FETCHED FILER:`);
      this.results.fetched.missing.slice(0, 10).forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.url}`);
      });
      if (this.results.fetched.missing.length > 10) {
        console.log(`  ... og ${this.results.fetched.missing.length - 10} flere`);
      }
    }
    
    if (this.results.parsed.missing.length > 0) {
      console.log(`\n📋 MANGLENDE PARSED FILER:`);
      this.results.parsed.missing.slice(0, 10).forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.url}`);
      });
      if (this.results.parsed.missing.length > 10) {
        console.log(`  ... og ${this.results.parsed.missing.length - 10} flere`);
      }
    }
    
    // Anbefalinger
    console.log(`\n💡 ANBEFALTE TILTAK:`);
    
    if (this.results.fetched.missing.length > 0) {
      console.log(`  1. Kjør: npm run fetch (for å hente manglende HTML-filer)`);
    }
    
    if (this.results.parsed.missing.length > 0) {
      console.log(`  2. Kjør: npm run parse (for å parse manglende filer)`);
    }
    
    if (this.results.chunked.missing.length > 0) {
      console.log(`  3. Kjør: npm run chunk (for å chunke manglende filer)`);
    }
    
    if (!this.results.bm25.exists || this.results.bm25.chunkCount !== this.results.chunked.totalChunks) {
      console.log(`  4. Kjør: npm run build:bm25 (for å bygge/oppdatere BM25 index)`);
    }
    
    if (!this.results.chroma.exists) {
      console.log(`  5. Kjør: python scripts/embed.py (for å bygge ChromaDB)`);
    }
    
    console.log('\n' + '='.repeat(70));
  }

  /**
   * Lagre rapport til fil
   */
  async saveReport() {
    const reportPath = path.join(this.baseDir, 'storage', 'metrics', 'pipeline-verification.json');
    
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        total_urls: this.results.allowlist.total,
        fetched_percentage: ((this.results.fetched.count/this.results.allowlist.total)*100).toFixed(1),
        parsed_percentage: ((this.results.parsed.count/this.results.allowlist.total)*100).toFixed(1),
        chunked_percentage: ((this.results.chunked.count/this.results.allowlist.total)*100).toFixed(1),
        total_chunks: this.results.chunked.totalChunks,
        avg_chunks_per_doc: this.results.chunked.count > 0 
          ? (this.results.chunked.totalChunks/this.results.chunked.count).toFixed(1)
          : 0
      }
    };
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n💾 Rapport lagret til: ${reportPath}`);
    
    return report;
  }

  /**
   * Kjør full verifikasjon
   */
  async run() {
    console.log('🚀 Starter Pipeline-verifikasjon for Askerbot');
    console.log('='.repeat(70));
    
    try {
      // Les allowlist
      const urls = await this.loadAllowlist();
      console.log(`✅ Lastet allowlist: ${urls.length} URLer`);
      
      // Verifiser hvert steg
      await this.verifyFetched(urls);
      await this.verifyParsed(urls);
      await this.verifyChunked(urls);
      await this.verifyBM25();
      await this.verifyChroma();
      
      // Analyser og rapporter
      await this.analyzeAndReport();
      
      // Lagre rapport
      await this.saveReport();
      
      console.log('\n🎉 Pipeline-verifikasjon fullført!');
      
    } catch (error) {
      console.error('\n💥 Kritisk feil:', error);
      process.exit(1);
    }
  }
}

// Kjør hvis kalt direkte
if (require.main === module) {
  const verifier = new PipelineVerifier();
  verifier.run().catch(error => {
    console.error('Uventet feil:', error);
    process.exit(1);
  });
}

module.exports = PipelineVerifier;

