#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');

/**
 * Asker Fotball News Crawler - Last 3 Months
 * 
 * Crawler som:
 * 1. Henter alle nyhetsartikler fra siste 3 måneder
 * 2. Sjekker for duplikater mot eksisterende allowlist
 * 3. Validerer kvalitet og filtrerer ut feilmeldinger
 * 4. Lagrer resultater i strukturert format
 */

class NewsCrawler3Months {
  constructor() {
    this.baseDir = path.join(__dirname, '..');
    this.allowlistPath = path.join(this.baseDir, 'config/allowlist.json');
    this.outputPath = path.join(this.baseDir, 'storage', 'raw', 'news-crawl-results.json');
    this.logsDir = path.join(this.baseDir, 'storage', 'logs');
    this.logPath = path.join(this.logsDir, 'news-crawl.jsonl');
    
    // Konfigurasjon
    this.config = {
      baseUrl: 'https://askerfotball.no',
      newsPath: '/nyheter',
      timeout: 15000,
      maxRetries: 3,
      retryDelay: 2000,
      userAgent: 'Askerbot-NewsCrawler/1.0 (+https://askerfotball.no)',
      maxAgeDays: 90, // 3 måneder
      batchSize: 10,
      delayBetweenBatches: 1000
    };
    
    this.existingUrls = new Set();
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
   * Last eksisterende allowlist for duplikatsjekk
   */
  async loadExistingUrls() {
    try {
      const data = await fs.readFile(this.allowlistPath, 'utf8');
      const allowlist = JSON.parse(data);
      
      // Legg til alle eksisterende URLer
      if (allowlist.static_pages) {
        allowlist.static_pages.forEach(url => this.existingUrls.add(url));
      }
      if (allowlist.news_articles) {
        allowlist.news_articles.forEach(url => this.existingUrls.add(url));
      }
      
      console.log(`📋 Loaded ${this.existingUrls.size} existing URLs for duplicate check`);
    } catch (error) {
      console.warn('⚠️  Could not load existing allowlist:', error.message);
    }
  }

  /**
   * Hent HTML fra URL med retry-logikk
   */
  async fetchHtml(url) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`    Fetching ${url} (attempt ${attempt}/${this.config.maxRetries})`);
        
        const result = await new Promise((resolve, reject) => {
          const protocol = url.startsWith('https:') ? https : http;
          
          const req = protocol.request(url, {
            headers: {
              'User-Agent': this.config.userAgent,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'no,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1'
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
                html: data,
                statusCode: res.statusCode,
                headers: res.headers,
                url: url
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
      error: lastError.message,
      url: url
    };
  }

  /**
   * Valider kvalitet på HTML-innhold
   */
  validateContent(html, url) {
    const validation = {
      isValid: true,
      issues: [],
      score: 100,
      type: 'unknown'
    };

    // Sjekk for feilmeldinger og redirects
    const errorPatterns = [
      /404.*not found/i,
      /500.*internal server error/i,
      /403.*forbidden/i,
      /page not found/i,
      /siden finnes ikke/i,
      /error\s*$/i,  // Kun "error" som står alene
      /feil\s*$/i    // Kun "feil" som står alene
    ];

    for (const pattern of errorPatterns) {
      if (pattern.test(html)) {
        validation.isValid = false;
        validation.issues.push(`Error pattern detected: ${pattern}`);
        validation.score -= 50;
      }
    }

    // Sjekk for nyhetsartikkel-indikatorer
    const newsIndicators = [
      /nyheter/i,
      /artikkel/i,
      /publisert/i,
      /publish/i,
      /dato/i,
      /date/i,
      /forfatter/i,
      /author/i
    ];

    let newsScore = 0;
    for (const pattern of newsIndicators) {
      if (pattern.test(html)) {
        newsScore += 10;
      }
    }

    if (newsScore > 20) {
      validation.type = 'news';
      validation.score += 20;
    }

    // Sjekk for minimum innhold
    const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (textContent.length < 100) {
      validation.isValid = false;
      validation.issues.push('Content too short (less than 100 characters)');
      validation.score -= 30;
    }

    // Sjekk for navigasjonssider
    const navPatterns = [
      /nyheter\s*$/i,
      /^nyheter/i,
      /arkiv/i,
      /archive/i,
      /oversikt/i,
      /overview/i
    ];

    for (const pattern of navPatterns) {
      if (pattern.test(html)) {
        validation.type = 'navigation';
        validation.score -= 10;
      }
    }

    // Sjekk for datostrukturer (DD.MM.YYYY eller YYYY-MM-DD)
    const datePatterns = [
      /\d{1,2}\.\d{1,2}\.\d{4}/,
      /\d{4}-\d{2}-\d{2}/,
      /\d{1,2}\s+\w+\s+\d{4}/
    ];

    let hasDate = false;
    for (const pattern of datePatterns) {
      if (pattern.test(html)) {
        hasDate = true;
        break;
      }
    }

    if (hasDate) {
      validation.score += 15;
    }

    // Sjekk for Asker Fotball-relatert innhold
    const askerPatterns = [
      /asker fotball/i,
      /askerfotball/i,
      /føyka/i,
      /obos/i,
      /fotball/i
    ];

    let askerScore = 0;
    for (const pattern of askerPatterns) {
      if (pattern.test(html)) {
        askerScore += 5;
      }
    }

    if (askerScore > 10) {
      validation.score += 10;
    }

    return validation;
  }

  /**
   * Ekstraher URLer fra HTML (nyhetsartikler)
   */
  extractNewsUrls(html) {
    const urls = new Set();
    
    // Regex for å finne href-attributter
    const hrefRegex = /href=["']([^"']+)["']/gi;
    let match;
    
    while ((match = hrefRegex.exec(html)) !== null) {
      let url = match[1];
      
      // Konverter relative URLer til absolute
      if (url.startsWith('/')) {
        url = this.config.baseUrl + url;
      } else if (url.startsWith('http')) {
        // Bare aksepter askerfotball.no URLer
        if (!url.includes('askerfotball.no')) {
          continue;
        }
      } else {
        continue;
      }
      
      // Filtrer kun nyhetsartikler - utvidet logikk
      if (url.includes('/nyheter/')) {
        // Ekskluder hovedsider og arkiv
        if (url.endsWith('/nyheter') || 
            url.endsWith('/nyheter/') || 
            url.includes('/nyheter/arkiv') ||
            url.includes('/nyheter?') ||
            url.includes('rss-nyheter')) {
          continue;
        }
        
        // Inkluder alle andre nyhetsartikler
        urls.add(url);
      }
    }
    
    return Array.from(urls);
  }

  /**
   * Sjekk om URL er nyere enn 3 måneder
   */
  async isRecentArticle(url) {
    try {
      const result = await this.fetchHtml(url);
      if (!result.success) {
        return false;
      }
      
      const html = result.html;
      
      // Sjekk for datostrukturer i HTML
      const datePatterns = [
        /(\d{1,2}\.\d{1,2}\.\d{4})/g,
        /(\d{4}-\d{2}-\d{2})/g,
        /(\d{1,2}\s+\w+\s+\d{4})/g
      ];
      
      const now = new Date();
      const threeMonthsAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
      
      for (const pattern of datePatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          try {
            let dateStr = match[1];
            
            // Konverter forskjellige datoformater
            let date;
            if (dateStr.includes('.')) {
              // DD.MM.YYYY format
              const parts = dateStr.split('.');
              date = new Date(parts[2], parts[1] - 1, parts[0]);
            } else if (dateStr.includes('-')) {
              // YYYY-MM-DD format
              date = new Date(dateStr);
            } else {
              // Månedsnavn format - forenklet parsing
              date = new Date(dateStr);
            }
            
            if (!isNaN(date.getTime()) && date >= threeMonthsAgo) {
              return true;
            }
          } catch (e) {
            // Ignorer feil i dato-parsing
            continue;
          }
        }
      }
      
      // Hvis ingen dato funnet, anta at det er nytt innhold
      return true;
      
    } catch (error) {
      console.warn(`Could not check date for ${url}:`, error.message);
      return false;
    }
  }

  /**
   * Crawl hovedsiden for nyhetsartikler (med paginering)
   */
  async crawlNewsPage() {
    console.log('🔍 Crawling news pages with pagination...');
    
    const allUrls = new Set();
    let currentPage = 1;
    let hasMorePages = true;
    
    while (hasMorePages && currentPage <= 10) { // Maks 10 sider
      const newsUrl = currentPage === 1 
        ? this.config.baseUrl + this.config.newsPath
        : `${this.config.baseUrl}${this.config.newsPath}?paged=${currentPage}`;
      
      console.log(`  📄 Crawling page ${currentPage}: ${newsUrl}`);
      
      const result = await this.fetchHtml(newsUrl);
      
      if (!result.success) {
        console.log(`  ❌ Failed to fetch page ${currentPage}: ${result.error}`);
        break;
      }
      
      const urls = this.extractNewsUrls(result.html);
      console.log(`  📰 Found ${urls.length} URLs on page ${currentPage}`);
      
      // Legg til nye URLer
      urls.forEach(url => allUrls.add(url));
      
      // Sjekk om det finnes flere sider
      hasMorePages = result.html.includes(`?paged=${currentPage + 1}`) || 
                     result.html.includes(`paged=${currentPage + 1}`);
      
      if (urls.length === 0) {
        console.log(`  📄 No more articles found on page ${currentPage}`);
        hasMorePages = false;
      }
      
      currentPage++;
      
      // Kort pause mellom sider
      if (hasMorePages) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    const uniqueUrls = Array.from(allUrls);
    console.log(`📰 Total found ${uniqueUrls.length} unique news URLs across ${currentPage - 1} pages`);
    
    return uniqueUrls;
  }

  /**
   * Crawl individuelle nyhetsartikler
   */
  async crawlNewsArticles(urls) {
    console.log(`🚀 Starting crawl of ${urls.length} news articles...`);
    
    const results = [];
    
    for (let i = 0; i < urls.length; i += this.config.batchSize) {
      const batch = urls.slice(i, i + this.config.batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / this.config.batchSize) + 1}/${Math.ceil(urls.length / this.config.batchSize)}`);
      
      const batchPromises = batch.map(async (url) => {
        // Sjekk for duplikater
        if (this.existingUrls.has(url) || this.crawledUrls.has(url)) {
          console.log(`  ⏭️  Skipping duplicate: ${url}`);
          return null;
        }
        
        this.crawledUrls.add(url);
        
        // Hent HTML
        const result = await this.fetchHtml(url);
        if (!result.success) {
          this.errors.push({ url, error: result.error });
          return null;
        }
        
        // Valider kvalitet
        const validation = this.validateContent(result.html, url);
        if (!validation.isValid || validation.score < 30) {
          console.log(`  ❌ Low quality: ${url} (score: ${validation.score})`);
          this.errors.push({ 
            url, 
            error: 'Low quality content', 
            issues: validation.issues,
            score: validation.score 
          });
          return null;
        }
        
        // Sjekk om artikkelen er fra siste 3 måneder
        const isRecent = await this.isRecentArticle(url);
        if (!isRecent) {
          console.log(`  📅 Too old: ${url}`);
          return null;
        }
        
        console.log(`  ✅ Valid article: ${url} (score: ${validation.score}, type: ${validation.type})`);
        
        return {
          url,
          title: this.extractTitle(result.html),
          publishedDate: this.extractPublishedDate(result.html),
          qualityScore: validation.score,
          type: validation.type,
          wordCount: this.extractWordCount(result.html),
          html: result.html,
          crawledAt: new Date().toISOString()
        };
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(r => r !== null));
      
      // Pause mellom batches
      if (i + this.config.batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenBatches));
      }
    }
    
    return results;
  }

  /**
   * Ekstraher tittel fra HTML
   */
  extractTitle(html) {
    const titleRegex = /<title[^>]*>([^<]+)<\/title>/i;
    const match = html.match(titleRegex);
    return match ? match[1].trim() : 'Untitled';
  }

  /**
   * Ekstraher publiseringsdato fra HTML
   */
  extractPublishedDate(html) {
    const datePatterns = [
      /(\d{1,2}\.\d{1,2}\.\d{4})/,
      /(\d{4}-\d{2}-\d{2})/,
      /(\d{1,2}\s+\w+\s+\d{4})/
    ];
    
    for (const pattern of datePatterns) {
      const match = html.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * Ekstraher ordtelling fra HTML
   */
  extractWordCount(html) {
    const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return textContent.split(' ').length;
  }

  /**
   * Lagre resultater
   */
  async saveResults(results) {
    const output = {
      crawledAt: new Date().toISOString(),
      config: this.config,
      summary: {
        totalFound: results.length,
        totalErrors: this.errors.length,
        averageQualityScore: results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length,
        dateRange: 'Last 3 months'
      },
      articles: results,
      errors: this.errors,
      duplicatesSkipped: this.existingUrls.size + this.crawledUrls.size - results.length
    };
    
    await fs.writeFile(this.outputPath, JSON.stringify(output, null, 2));
    console.log(`💾 Results saved to: ${this.outputPath}`);
    
    // Log til JSONL
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'news_crawl_3months',
      summary: output.summary
    };
    
    await fs.appendFile(this.logPath, JSON.stringify(logEntry) + '\n');
  }

  /**
   * Hovedfunksjon
   */
  async run() {
    try {
      console.log('🚀 Starting 3-month news crawl...');
      
      await this.ensureDirectories();
      await this.loadExistingUrls();
      
      // Crawl hovedsiden for nyhetsartikler
      const newsUrls = await this.crawlNewsPage();
      
      // Crawl individuelle artikler
      const results = await this.crawlNewsArticles(newsUrls);
      
      // Lagre resultater
      await this.saveResults(results);
      
      console.log('\n🎉 News crawl completed!');
      console.log(`📊 Summary:`);
      console.log(`   - Articles found: ${results.length}`);
      console.log(`   - Errors: ${this.errors.length}`);
      console.log(`   - Duplicates skipped: ${this.existingUrls.size + this.crawledUrls.size - results.length}`);
      console.log(`   - Average quality score: ${Math.round(results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length)}%`);
      
      if (this.errors.length > 0) {
        console.log('\n❌ Errors encountered:');
        this.errors.slice(0, 5).forEach(error => {
          console.log(`   - ${error.url}: ${error.error}`);
        });
        if (this.errors.length > 5) {
          console.log(`   ... and ${this.errors.length - 5} more errors`);
        }
      }
      
    } catch (error) {
      console.error('💥 Critical error:', error.message);
      process.exit(1);
    }
  }
}

// Kjør hvis kalt direkte
if (require.main === module) {
  const crawler = new NewsCrawler3Months();
  crawler.run().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = NewsCrawler3Months;
