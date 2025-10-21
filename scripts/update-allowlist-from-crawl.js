#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

/**
 * Update Allowlist from News Crawl Results
 * 
 * Dette scriptet tar resultatene fra crawl-news-3months.js
 * og legger til nye, kvalifiserte nyhetsartikler i allowlist.json
 */

class AllowlistUpdater {
  constructor() {
    this.baseDir = path.join(__dirname, '..');
    this.allowlistPath = path.join(this.baseDir, 'allowlist.json');
    this.crawlResultsPath = path.join(this.baseDir, 'storage', 'raw', 'news-crawl-results.json');
    this.backupPath = path.join(this.baseDir, 'allowlist.json.backup');
  }

  /**
   * Les eksisterende allowlist
   */
  async loadAllowlist() {
    try {
      const data = await fs.readFile(this.allowlistPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Could not load allowlist: ${error.message}`);
    }
  }

  /**
   * Les crawl-resultater
   */
  async loadCrawlResults() {
    try {
      const data = await fs.readFile(this.crawlResultsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Could not load crawl results: ${error.message}`);
    }
  }

  /**
   * Lag backup av eksisterende allowlist
   */
  async createBackup() {
    try {
      const allowlist = await this.loadAllowlist();
      await fs.writeFile(this.backupPath, JSON.stringify(allowlist, null, 2));
      console.log(`📋 Backup created: ${this.backupPath}`);
    } catch (error) {
      console.warn(`⚠️  Could not create backup: ${error.message}`);
    }
  }

  /**
   * Filtrer artikler basert på kvalitetskriterier
   */
  filterArticles(articles, minQualityScore = 70, minWordCount = 150) {
    return articles.filter(article => {
      // Kvalitetsscore
      if (article.qualityScore < minQualityScore) {
        console.log(`  ❌ Low quality score: ${article.url} (${article.qualityScore})`);
        return false;
      }

      // Ordtelling
      if (article.wordCount < minWordCount) {
        console.log(`  ❌ Too short: ${article.url} (${article.wordCount} words)`);
        return false;
      }

      // Type-sjekk
      if (article.type !== 'news') {
        console.log(`  ❌ Wrong type: ${article.url} (${article.type})`);
        return false;
      }

      // Sjekk for relevante nøkkelord
      const relevantKeywords = [
        'asker fotball',
        'askerfotball',
        'føyka',
        'obos',
        'fotball',
        'kamp',
        'lag',
        'spiller'
      ];

      const title = article.title.toLowerCase();
      const hasRelevantKeyword = relevantKeywords.some(keyword => 
        title.includes(keyword.toLowerCase())
      );

      if (!hasRelevantKeyword) {
        console.log(`  ❌ No relevant keywords: ${article.url}`);
        return false;
      }

      console.log(`  ✅ Approved: ${article.url} (score: ${article.qualityScore}, words: ${article.wordCount})`);
      return true;
    });
  }

  /**
   * Oppdater allowlist med nye artikler
   */
  async updateAllowlist() {
    try {
      console.log('🔄 Updating allowlist from crawl results...');

      // Last data
      const allowlist = await this.loadAllowlist();
      const crawlResults = await this.loadCrawlResults();

      // Opprett backup
      await this.createBackup();

      // Filtrer artikler
      console.log(`📰 Filtering ${crawlResults.articles.length} articles...`);
      const qualifiedArticles = this.filterArticles(crawlResults.articles);

      if (qualifiedArticles.length === 0) {
        console.log('❌ No qualified articles found to add');
        return;
      }

      // Hent eksisterende URLer for duplikatsjekk
      const existingUrls = new Set([
        ...(allowlist.static_pages || []),
        ...(allowlist.news_articles || [])
      ]);

      // Legg til nye URLer
      const newUrls = [];
      for (const article of qualifiedArticles) {
        if (!existingUrls.has(article.url)) {
          newUrls.push(article.url);
          existingUrls.add(article.url);
        } else {
          console.log(`  ⏭️  Duplicate: ${article.url}`);
        }
      }

      if (newUrls.length === 0) {
        console.log('❌ No new URLs to add (all are duplicates)');
        return;
      }

      // Oppdater allowlist
      if (!allowlist.news_articles) {
        allowlist.news_articles = [];
      }

      // Legg til nye URLer
      allowlist.news_articles.push(...newUrls);

      // Sorter URLer alfabetisk
      allowlist.news_articles.sort();

      // Oppdater konfigurasjon hvis nødvendig
      if (!allowlist.config) {
        allowlist.config = {};
      }

      if (!allowlist.config.news_priority) {
        allowlist.config.news_priority = {
          enabled: true,
          max_age_days: 90,
          fresh_boost: 1.2,
          decay_factor: 0.2
        };
      }

      // Lagre oppdatert allowlist
      await fs.writeFile(this.allowlistPath, JSON.stringify(allowlist, null, 2));

      console.log('\n🎉 Allowlist updated successfully!');
      console.log(`📊 Summary:`);
      console.log(`   - New articles added: ${newUrls.length}`);
      console.log(`   - Total news articles: ${allowlist.news_articles.length}`);
      console.log(`   - Qualified articles: ${qualifiedArticles.length}`);
      console.log(`   - Duplicates skipped: ${qualifiedArticles.length - newUrls.length}`);

      // Vis nye URLer
      if (newUrls.length > 0) {
        console.log('\n📰 New articles added:');
        newUrls.slice(0, 10).forEach(url => {
          console.log(`   - ${url}`);
        });
        if (newUrls.length > 10) {
          console.log(`   ... and ${newUrls.length - 10} more`);
        }
      }

    } catch (error) {
      console.error('💥 Error updating allowlist:', error.message);
      process.exit(1);
    }
  }

  /**
   * Vis statistikk over allowlist
   */
  async showStats() {
    try {
      const allowlist = await this.loadAllowlist();
      
      console.log('\n📊 Allowlist Statistics:');
      console.log(`   - Static pages: ${allowlist.static_pages?.length || 0}`);
      console.log(`   - News articles: ${allowlist.news_articles?.length || 0}`);
      console.log(`   - Total URLs: ${(allowlist.static_pages?.length || 0) + (allowlist.news_articles?.length || 0)}`);
      
      if (allowlist.config) {
        console.log(`   - News priority enabled: ${allowlist.config.news_priority?.enabled || false}`);
        console.log(`   - Max age days: ${allowlist.config.news_priority?.max_age_days || 'N/A'}`);
      }
      
    } catch (error) {
      console.error('Error showing stats:', error.message);
    }
  }

  /**
   * Hovedfunksjon
   */
  async run() {
    try {
      console.log('🚀 Starting allowlist update...');
      
      await this.updateAllowlist();
      await this.showStats();
      
    } catch (error) {
      console.error('💥 Critical error:', error.message);
      process.exit(1);
    }
  }
}

// Kjør hvis kalt direkte
if (require.main === module) {
  const updater = new AllowlistUpdater();
  updater.run().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = AllowlistUpdater;
