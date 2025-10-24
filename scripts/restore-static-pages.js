#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

/**
 * Restore Static Pages from Backup
 * 
 * Dette scriptet gjenoppretter alle statiske sider fra backup
 * og kombinerer dem med sitemap-data for nyhetsartikler
 */

class StaticPagesRestorer {
  constructor() {
    this.baseDir = path.join(__dirname, '..');
    this.allowlistPath = path.join(this.baseDir, 'config', 'allowlist.json');
    this.backupPath = path.join(this.baseDir, 'config', 'allowlist.json.backup');
    this.sitemapResultsPath = path.join(this.baseDir, 'storage', 'raw', 'sitemap-crawl-results.json');
  }

  /**
   * Les backup av allowlist
   */
  async loadBackup() {
    try {
      const data = await fs.readFile(this.backupPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Could not load backup: ${error.message}`);
    }
  }

  /**
   * Les sitemap-resultater
   */
  async loadSitemapResults() {
    try {
      const data = await fs.readFile(this.sitemapResultsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Could not load sitemap results: ${error.message}`);
    }
  }

  /**
   * Les nåværende allowlist
   */
  async loadCurrentAllowlist() {
    try {
      const data = await fs.readFile(this.allowlistPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Could not load current allowlist: ${error.message}`);
    }
  }

  /**
   * Identifiser statiske sider vs nyhetsartikler
   */
  categorizeUrls(urls) {
    const staticPages = [];
    const newsArticles = [];
    
    for (const url of urls) {
      if (url.includes('/nyheter/') && !url.endsWith('/nyheter')) {
        newsArticles.push(url);
      } else {
        staticPages.push(url);
      }
    }
    
    return { staticPages, newsArticles };
  }

  /**
   * Kombiner statiske sider fra backup med nyhetsartikler fra sitemap
   */
  async restoreStaticPages() {
    try {
      console.log('🔄 Restoring static pages from backup...');
      
      // Last data
      const backup = await this.loadBackup();
      const sitemapResults = await this.loadSitemapResults();
      const current = await this.loadCurrentAllowlist();
      
      // Kategoriser URLer fra backup
      const { staticPages: backupStaticPages, newsArticles: backupNewsArticles } = 
        this.categorizeUrls(backup.static_pages || []);
      
      // Hent nyhetsartikler fra sitemap (kun de som er nyere)
      const sitemapNewsArticles = (sitemapResults.urls || [])
        .filter(url => url.category === 'news')
        .map(url => url.url);
      
      // Kombiner statiske sider fra backup med de fra sitemap
      const allStaticPages = [
        ...backupStaticPages,
        ...(current.static_pages || [])
      ];
      
      // Fjern duplikater
      const uniqueStaticPages = [...new Set(allStaticPages)].sort();
      
      // Opprett ny allowlist
      const newAllowlist = {
        base: "https://askerfotball.no",
        static_pages: uniqueStaticPages,
        news_articles: sitemapNewsArticles,
        config: {
          news_priority: {
            enabled: true,
            max_age_days: 90,
            fresh_boost: 1.2,
            decay_factor: 0.1
          },
          static_priority: {
            enabled: true,
            base_score: 1.0
          },
          sitemap_metadata: {
            enabled: true,
            last_crawled: sitemapResults.crawledAt,
            total_urls_found: sitemapResults.stats?.total || 0,
            urls_included: sitemapNewsArticles.length,
            average_priority: sitemapResults.stats?.averagePriority || 0,
            average_age_days: sitemapResults.stats?.averageAge || 0
          }
        }
      };
      
      // Lagre ny allowlist
      await fs.writeFile(this.allowlistPath, JSON.stringify(newAllowlist, null, 2));
      
      console.log('\n🎉 Static pages restored successfully!');
      console.log(`📊 Summary:`);
      console.log(`   - Static pages: ${uniqueStaticPages.length}`);
      console.log(`   - News articles: ${sitemapNewsArticles.length}`);
      console.log(`   - Total URLs: ${uniqueStaticPages.length + sitemapNewsArticles.length}`);
      
      // Vis statiske sider
      console.log('\n📄 Static pages restored:');
      uniqueStaticPages.forEach(url => {
        console.log(`   - ${url}`);
      });
      
      // Vis nyhetsartikler
      console.log('\n📰 News articles (from sitemap):');
      sitemapNewsArticles.slice(0, 10).forEach(url => {
        console.log(`   - ${url}`);
      });
      if (sitemapNewsArticles.length > 10) {
        console.log(`   ... and ${sitemapNewsArticles.length - 10} more`);
      }
      
    } catch (error) {
      console.error('💥 Error restoring static pages:', error.message);
      process.exit(1);
    }
  }

  /**
   * Hovedfunksjon
   */
  async run() {
    try {
      console.log('🚀 Starting static pages restoration...');
      
      await this.restoreStaticPages();
      
    } catch (error) {
      console.error('💥 Critical error:', error.message);
      process.exit(1);
    }
  }
}

// Kjør hvis kalt direkte
if (require.main === module) {
  const restorer = new StaticPagesRestorer();
  restorer.run().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = StaticPagesRestorer;
