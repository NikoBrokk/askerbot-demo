#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const { XMLParser } = require('fast-xml-parser');

/**
 * Asker Fotball Sitemap Crawler
 * 
 * Crawler som bruker sitemap.xml for å oppdage og prioritere URLer
 * i stedet for manuell allowlist-tilnærming
 */

class SitemapCrawler {
  constructor() {
    this.baseDir = path.join(__dirname, '..');
    this.sitemapUrl = 'https://askerfotball.no/sitemap.xml';
    this.outputPath = path.join(this.baseDir, 'storage', 'raw', 'sitemap-crawl-results.json');
    this.logsDir = path.join(this.baseDir, 'storage', 'logs');
    this.logPath = path.join(this.logsDir, 'sitemap-crawl.jsonl');
    
    // Konfigurasjon
    this.config = {
      timeout: 15000,
      maxRetries: 3,
      retryDelay: 2000,
      userAgent: 'Askerbot-SitemapCrawler/1.0 (+https://askerfotball.no)',
      // Filtreringskriterier
      minPriority: 0.3,        // Minimum prioritet
      maxAgeDays: null,        // Ingen maksimal alder - inkluder alle fra 2025
      cutoffDate: new Date('2025-01-01'), // Kun artikler fra 1. januar 2025
      excludePatterns: [       // Ekskluder disse mønstrene
        '/wp-admin/',
        '/wp-content/',
        '/wp-includes/',
        '/feed/',
        '/rss',
        '/sitemap',
        '/robots.txt',
        '/favicon.ico'
      ],
      includePatterns: [       // Inkluder kun disse mønstrene
        '/nyheter/',
        '/om-klubben/',
        '/lag/',
        '/terminliste',
        '/resultater',
        '/partnere/',
        '/om-stadion/'
      ]
    };
    
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    
    this.crawledUrls = new Set();
    this.qualityResults = [];
    this.errors = [];
  }

  /**
   * Opprett nødvendige mapper
   */
  async ensureDirectories() {
    await fs.mkdir(this.logsDir, { recursive: true });
    await fs.mkdir(path.dirname(this.outputPath), { recursive: true });
  }

  /**
   * Hent sitemap.xml
   */
  async fetchSitemap() {
    let lastError;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`🔍 Fetching sitemap (attempt ${attempt}/${this.config.maxRetries})`);
        
        const result = await new Promise((resolve, reject) => {
          const protocol = this.sitemapUrl.startsWith('https:') ? https : http;
          
          const req = protocol.request(this.sitemapUrl, {
            headers: {
              'User-Agent': this.config.userAgent,
              'Accept': 'application/xml,text/xml,application/rss+xml,*/*',
              'Accept-Language': 'no,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate',
              'Connection': 'keep-alive'
            },
            timeout: this.config.timeout
          }, (res) => {
            let data = '';
            
            // Håndter gzip
            let stream = res;
            if (res.headers['content-encoding'] === 'gzip') {
              const zlib = require('zlib');
              stream = res.pipe(zlib.createGunzip());
            }
            
            stream.on('data', chunk => data += chunk);
            stream.on('end', () => {
              resolve({
                success: true,
                xml: data,
                statusCode: res.statusCode,
                headers: res.headers
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
          
          req.end();
        });
        
        if (result.success) {
          return result;
        }
        
      } catch (error) {
        lastError = error;
        console.log(`    Error: ${error.message}`);
        
        if (attempt < this.config.maxRetries) {
          console.log(`    Retrying in ${this.config.retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      }
    }
    
    return {
      success: false,
      error: lastError.message
    };
  }

  /**
   * Parse sitemap XML
   */
  parseSitemap(xml) {
    try {
      const parsed = this.xmlParser.parse(xml);
      const urlset = parsed.urlset || parsed.sitemapindex;
      
      if (!urlset) {
        throw new Error('Invalid sitemap format');
      }
      
      // Håndter både sitemap og sitemapindex
      if (urlset.sitemap) {
        // Sitemap index - hent alle under-sitemaps
        console.log('📋 Found sitemap index, processing sub-sitemaps...');
        return this.processSitemapIndex(urlset.sitemap);
      } else if (urlset.url) {
        // Direkte sitemap
        return this.processUrls(urlset.url);
      } else {
        throw new Error('No URLs found in sitemap');
      }
      
    } catch (error) {
      console.error('Failed to parse sitemap:', error.message);
      return [];
    }
  }

  /**
   * Prosesser sitemap index
   */
  async processSitemapIndex(sitemaps) {
    const allUrls = [];
    
    for (const sitemap of sitemaps) {
      if (sitemap.loc) {
        console.log(`  📄 Processing sub-sitemap: ${sitemap.loc}`);
        
        // Hent sub-sitemap
        const subResult = await this.fetchSitemapFromUrl(sitemap.loc);
        if (subResult.success) {
          const urls = this.processUrls(subResult.xml);
          allUrls.push(...urls);
        }
      }
    }
    
    return allUrls;
  }

  /**
   * Hent sitemap fra spesifikk URL
   */
  async fetchSitemapFromUrl(url) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https:') ? https : http;
      
      const req = protocol.request(url, {
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'application/xml,text/xml,application/rss+xml,*/*'
        },
        timeout: this.config.timeout
      }, (res) => {
        let data = '';
        
        let stream = res;
        if (res.headers['content-encoding'] === 'gzip') {
          const zlib = require('zlib');
          stream = res.pipe(zlib.createGunzip());
        }
        
        stream.on('data', chunk => data += chunk);
        stream.on('end', () => {
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            xml: data,
            statusCode: res.statusCode
          });
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  }

  /**
   * Prosesser URLer fra sitemap
   */
  processUrls(urls) {
    const processedUrls = [];
    
    // Normaliser til array hvis det er en enkelt URL
    const urlArray = Array.isArray(urls) ? urls : [urls];
    
    for (const url of urlArray) {
      if (url.loc) {
        const processedUrl = {
          url: url.loc,
          lastmod: url.lastmod || null,
          changefreq: url.changefreq || 'weekly',
          priority: parseFloat(url.priority) || 0.5,
          // Beregn alder
          age: this.calculateAge(url.lastmod),
          // Kategoriser URL
          category: this.categorizeUrl(url.loc)
        };
        
        processedUrls.push(processedUrl);
      }
    }
    
    return processedUrls;
  }

  /**
   * Beregn alder i dager
   */
  calculateAge(lastmod) {
    if (!lastmod) return null;
    
    try {
      const lastModDate = new Date(lastmod);
      const now = new Date();
      const diffTime = Math.abs(now - lastModDate);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (error) {
      return null;
    }
  }

  /**
   * Sjekk om URL er fra 2025 eller nyere
   */
  isFrom2025OrNewer(lastmod) {
    if (!lastmod) return true; // Inkluder hvis ingen dato
    
    try {
      const lastModDate = new Date(lastmod);
      return lastModDate >= this.config.cutoffDate;
    } catch (error) {
      return true; // Inkluder hvis feil i dato-parsing
    }
  }

  /**
   * Kategoriser URL basert på path
   */
  categorizeUrl(url) {
    if (url.includes('/nyheter/')) return 'news';
    if (url.includes('/om-klubben/')) return 'about';
    if (url.includes('/lag/')) return 'teams';
    if (url.includes('/terminliste')) return 'schedule';
    if (url.includes('/resultater')) return 'results';
    if (url.includes('/partnere/')) return 'partners';
    if (url.includes('/om-stadion/')) return 'stadium';
    if (url === 'https://askerfotball.no/') return 'homepage';
    return 'other';
  }

  /**
   * Filtrer URLer basert på konfigurasjon
   */
  filterUrls(urls) {
    console.log(`🔍 Filtering ${urls.length} URLs from sitemap...`);
    
    const filtered = urls.filter(url => {
      // Ekskluder mønstre
      for (const pattern of this.config.excludePatterns) {
        if (url.url.includes(pattern)) {
          console.log(`  ❌ Excluded (pattern): ${url.url}`);
          return false;
        }
      }
      
      // Inkluder kun relevante mønstre
      const hasRelevantPattern = this.config.includePatterns.some(pattern => 
        url.url.includes(pattern)
      );
      
      if (!hasRelevantPattern) {
        console.log(`  ❌ Excluded (not relevant): ${url.url}`);
        return false;
      }
      
      // Prioritet
      if (url.priority < this.config.minPriority) {
        console.log(`  ❌ Excluded (low priority): ${url.url} (${url.priority})`);
        return false;
      }
      
      // Alder - kun inkluder fra 2025 og fremover
      if (!this.isFrom2025OrNewer(url.lastmod)) {
        console.log(`  ❌ Excluded (before 2025): ${url.url} (${url.lastmod || 'no date'})`);
        return false;
      }
      
      console.log(`  ✅ Included: ${url.url} (priority: ${url.priority}, age: ${url.age} days, category: ${url.category})`);
      return true;
    });
    
      console.log(`📊 Filtered to ${filtered.length} URLs (${urls.length - filtered.length} excluded)`);
      console.log(`📅 Only including articles from 2025-01-01 and newer`);
      return filtered;
  }

  /**
   * Sorter URLer basert på prioritet og alder
   */
  sortUrls(urls) {
    return urls.sort((a, b) => {
      // Først prioritet (høyest først)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      // Deretter alder (nyest først, null alder sist)
      if (a.age === null && b.age === null) return 0;
      if (a.age === null) return 1;
      if (b.age === null) return -1;
      
      return a.age - b.age;
    });
  }

  /**
   * Generer statistikk
   */
  generateStats(urls) {
    const stats = {
      total: urls.length,
      byCategory: {},
      byPriority: {
        high: 0,    // >= 0.8
        medium: 0,  // 0.5-0.79
        low: 0      // < 0.5
      },
      byAge: {
        fresh: 0,   // < 7 dager
        recent: 0,  // 7-30 dager
        old: 0      // > 30 dager
      },
      averagePriority: 0,
      averageAge: 0
    };
    
    let totalPriority = 0;
    let totalAge = 0;
    let ageCount = 0;
    
    for (const url of urls) {
      // Kategori
      stats.byCategory[url.category] = (stats.byCategory[url.category] || 0) + 1;
      
      // Prioritet
      if (url.priority >= 0.8) stats.byPriority.high++;
      else if (url.priority >= 0.5) stats.byPriority.medium++;
      else stats.byPriority.low++;
      
      // Alder
      if (url.age !== null) {
        if (url.age < 7) stats.byAge.fresh++;
        else if (url.age < 30) stats.byAge.recent++;
        else stats.byAge.old++;
        
        totalAge += url.age;
        ageCount++;
      }
      
      totalPriority += url.priority;
    }
    
    stats.averagePriority = totalPriority / urls.length;
    stats.averageAge = ageCount > 0 ? totalAge / ageCount : null;
    
    return stats;
  }

  /**
   * Lagre resultater
   */
  async saveResults(urls, stats) {
    const output = {
      crawledAt: new Date().toISOString(),
      sitemapUrl: this.sitemapUrl,
      config: this.config,
      stats: stats,
      urls: urls,
      errors: this.errors
    };
    
    await fs.writeFile(this.outputPath, JSON.stringify(output, null, 2));
    console.log(`💾 Results saved to: ${this.outputPath}`);
    
    // Log til JSONL
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'sitemap_crawl',
      stats: stats
    };
    
    await fs.appendFile(this.logPath, JSON.stringify(logEntry) + '\n');
  }

  /**
   * Hovedfunksjon
   */
  async run() {
    try {
      console.log('🚀 Starting sitemap crawl...');
      console.log(`📋 Sitemap URL: ${this.sitemapUrl}`);
      
      await this.ensureDirectories();
      
      // Hent sitemap
      const sitemapResult = await this.fetchSitemap();
      if (!sitemapResult.success) {
        throw new Error(`Failed to fetch sitemap: ${sitemapResult.error}`);
      }
      
      // Parse sitemap
      const allUrls = this.parseSitemap(sitemapResult.xml);
      console.log(`📄 Found ${allUrls.length} URLs in sitemap`);
      
      // Filtrer URLer
      const filteredUrls = this.filterUrls(allUrls);
      
      // Sorter URLer
      const sortedUrls = this.sortUrls(filteredUrls);
      
      // Generer statistikk
      const stats = this.generateStats(sortedUrls);
      
      // Lagre resultater
      await this.saveResults(sortedUrls, stats);
      
      console.log('\n🎉 Sitemap crawl completed!');
      console.log(`📊 Summary:`);
      console.log(`   - Total URLs found: ${stats.total}`);
      console.log(`   - Average priority: ${stats.averagePriority.toFixed(2)}`);
      console.log(`   - Average age: ${stats.averageAge ? stats.averageAge.toFixed(1) + ' days' : 'N/A'}`);
      console.log(`   - Date range: 2025-01-01 and newer`);
      console.log(`   - By category:`, stats.byCategory);
      console.log(`   - By priority:`, stats.byPriority);
      console.log(`   - By age:`, stats.byAge);
      
    } catch (error) {
      console.error('💥 Critical error:', error.message);
      process.exit(1);
    }
  }
}

// Kjør hvis kalt direkte
if (require.main === module) {
  const crawler = new SitemapCrawler();
  crawler.run().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = SitemapCrawler;
