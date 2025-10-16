#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');

/**
 * Asker Fotball Knowledge Base Fetcher
 * Henter HTML-innhold fra allowlist og lagrer rå data
 */

class KnowledgeBaseFetcher {
  constructor() {
    this.baseDir = path.join(__dirname, '..');
    this.rawDir = path.join(this.baseDir, 'storage', 'raw');
    this.logsDir = path.join(this.baseDir, 'storage', 'logs');
    this.allowlistPath = path.join(this.baseDir, 'allowlist.json');
    this.logPath = path.join(this.logsDir, 'fetch.jsonl');
    
    // Konfigurasjon
    this.config = {
      timeout: 10000, // 10 sekunder
      maxRetries: 3,
      retryDelay: 1000, // 1 sekund
      userAgent: 'Askerbot-KnowledgeBase/1.0 (+https://askerfotball.no)'
    };
  }

  /**
   * Opprett nødvendige mapper
   */
  async ensureDirectories() {
    await fs.mkdir(this.rawDir, { recursive: true });
    await fs.mkdir(this.logsDir, { recursive: true });
  }

  /**
   * Les allowlist.json
   */
  async loadAllowlist() {
    try {
      const data = await fs.readFile(this.allowlistPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Kunne ikke lese allowlist: ${error.message}`);
    }
  }

  /**
   * Generer filnavn fra URL
   */
  generateSlug(url) {
    const urlObj = new URL(url);
    let slug = urlObj.pathname
      .replace(/^\//, '') // Fjern ledende slash
      .replace(/\/$/, '') // Fjern trailing slash
      .replace(/\//g, '_'); // Erstatt slash med underscore
    
    // Hvis tom, bruk 'index'
    if (!slug) slug = 'index';
    
    return slug;
  }

  /**
   * HTTP request med timeout og retry
   */
  async fetchWithRetry(url, retryCount = 0) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https:') ? https : http;
      
      const options = {
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'no,en;q=0.5',
          'Accept-Encoding': 'identity', // Ikke komprimer
          'Connection': 'keep-alive'
        },
        timeout: this.config.timeout
      };

      const req = client.get(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  /**
   * Hent enkelt URL med retry-logikk
   */
  async fetchUrl(url) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`  Henter ${url} (forsøk ${attempt}/${this.config.maxRetries})`);
        
        const response = await this.fetchWithRetry(url);
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
          return {
            success: true,
            statusCode: response.statusCode,
            contentLength: response.body.length,
            url: url
          };
        } else {
          throw new Error(`HTTP ${response.statusCode}`);
        }
        
      } catch (error) {
        lastError = error;
        console.log(`    Feil: ${error.message}`);
        
        if (attempt < this.config.maxRetries) {
          console.log(`    Prøver igjen om ${this.config.retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      }
    }
    
    return {
      success: false,
      error: lastError.message,
      url: url
    };
  }

  /**
   * Lagre HTML-innhold
   */
  async saveHtml(url, content) {
    const slug = this.generateSlug(url);
    const filePath = path.join(this.rawDir, `${slug}.html`);
    
    await fs.writeFile(filePath, content, 'utf8');
    return filePath;
  }

  /**
   * Logg resultat
   */
  async logResult(result) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...result
    };
    
    const logLine = JSON.stringify(logEntry) + '\n';
    await fs.appendFile(this.logPath, logLine, 'utf8');
  }

  /**
   * Hovedfunksjon - kjør hele fetchen
   */
  async run() {
    console.log('🚀 Starter Asker Fotball Knowledge Base Fetcher');
    console.log('=' .repeat(50));
    
    try {
      // Opprett mapper
      await this.ensureDirectories();
      console.log('✅ Mapper opprettet');
      
      // Les allowlist
      const allowlist = await this.loadAllowlist();
      console.log(`✅ Allowlist lastet: ${allowlist.urls.length} URL-er`);
      
      // Hent hver URL
      const results = [];
      
      for (let i = 0; i < allowlist.urls.length; i++) {
        const url = allowlist.urls[i];
        console.log(`\n📄 [${i + 1}/${allowlist.urls.length}] ${url}`);
        
        const result = await this.fetchUrl(url);
        
        if (result.success) {
          // Lagre HTML
          const response = await this.fetchWithRetry(url);
          const filePath = await this.saveHtml(url, response.body);
          
          result.filePath = filePath;
          console.log(`  ✅ Lagret: ${filePath}`);
        } else {
          console.log(`  ❌ Feilet: ${result.error}`);
        }
        
        results.push(result);
        
        // Logg resultat
        await this.logResult(result);
        
        // Kort pause mellom requests
        if (i < allowlist.urls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Oppsummering
      console.log('\n' + '=' .repeat(50));
      console.log('📊 Oppsummering:');
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log(`  ✅ Vellykkede: ${successful}`);
      console.log(`  ❌ Feilet: ${failed}`);
      console.log(`  📁 Rå HTML lagret i: ${this.rawDir}`);
      console.log(`  📝 Logg lagret i: ${this.logPath}`);
      
      if (failed > 0) {
        console.log('\n❌ Feilet URL-er:');
        results.filter(r => !r.success).forEach(r => {
          console.log(`  - ${r.url}: ${r.error}`);
        });
      }
      
      console.log('\n🎉 Fetchen fullført!');
      
    } catch (error) {
      console.error('💥 Kritisk feil:', error.message);
      process.exit(1);
    }
  }
}

// Kjør hvis kalt direkte
if (require.main === module) {
  const fetcher = new KnowledgeBaseFetcher();
  fetcher.run().catch(error => {
    console.error('Uventet feil:', error);
    process.exit(1);
  });
}

module.exports = KnowledgeBaseFetcher;
