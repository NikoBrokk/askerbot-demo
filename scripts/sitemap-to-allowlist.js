#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

/**
 * Convert Sitemap Crawl Results to Allowlist Format
 * 
 * Dette scriptet konverterer resultatene fra sitemap-crawler.js
 * til den eksisterende allowlist.json-formatet for bakoverkompatibilitet
 */

class SitemapToAllowlistConverter {
  constructor() {
    this.baseDir = path.join(__dirname, '..');
    this.sitemapResultsPath = path.join(this.baseDir, 'storage', 'raw', 'sitemap-crawl-results.json');
    this.allowlistPath = path.join(this.baseDir, 'config', 'allowlist.json');
    this.backupPath = path.join(this.baseDir, 'config', 'allowlist.json.backup');
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
   * Konverter sitemap-resultater til allowlist-format
   */
  convertToAllowlist(sitemapResults) {
    const urls = sitemapResults.urls || [];
    
    // Kategoriser URLer
    const staticPages = [];
    const newsArticles = [];
    
    for (const url of urls) {
      if (url.category === 'news') {
        newsArticles.push(url.url);
      } else {
        staticPages.push(url.url);
      }
    }
    
    // Sorter URLer alfabetisk
    staticPages.sort();
    newsArticles.sort();
    
    return {
      base: "https://askerfotball.no",
      static_pages: staticPages,
      news_articles: newsArticles,
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
          urls_included: urls.length,
          average_priority: sitemapResults.stats?.averagePriority || 0,
          average_age_days: sitemapResults.stats?.averageAge || 0
        }
      }
    };
  }

  /**
   * Oppdater allowlist med sitemap-data
   */
  async updateAllowlist() {
    try {
      console.log('🔄 Converting sitemap results to allowlist format...');
      
      // Last data
      const sitemapResults = await this.loadSitemapResults();
      const existingAllowlist = await this.loadAllowlist();
      
      // Opprett backup
      await this.createBackup();
      
      // Konverter til allowlist-format
      const newAllowlist = this.convertToAllowlist(sitemapResults);
      
      // Behold eksisterende konfigurasjon hvis den finnes
      if (existingAllowlist.config) {
        newAllowlist.config = {
          ...existingAllowlist.config,
          ...newAllowlist.config
        };
      }
      
      // Lagre ny allowlist
      await fs.writeFile(this.allowlistPath, JSON.stringify(newAllowlist, null, 2));
      
      console.log('\n🎉 Allowlist updated with sitemap data!');
      console.log(`📊 Summary:`);
      console.log(`   - Static pages: ${newAllowlist.static_pages.length}`);
      console.log(`   - News articles: ${newAllowlist.news_articles.length}`);
      console.log(`   - Total URLs: ${newAllowlist.static_pages.length + newAllowlist.news_articles.length}`);
      console.log(`   - Average priority: ${newAllowlist.config.sitemap_metadata.average_priority.toFixed(2)}`);
      console.log(`   - Average age: ${newAllowlist.config.sitemap_metadata.average_age_days.toFixed(1)} days`);
      
      // Vis nye URLer
      if (newAllowlist.news_articles.length > 0) {
        console.log('\n📰 News articles:');
        newAllowlist.news_articles.slice(0, 10).forEach(url => {
          console.log(`   - ${url}`);
        });
        if (newAllowlist.news_articles.length > 10) {
          console.log(`   ... and ${newAllowlist.news_articles.length - 10} more`);
        }
      }
      
      if (newAllowlist.static_pages.length > 0) {
        console.log('\n📄 Static pages:');
        newAllowlist.static_pages.slice(0, 10).forEach(url => {
          console.log(`   - ${url}`);
        });
        if (newAllowlist.static_pages.length > 10) {
          console.log(`   ... and ${newAllowlist.static_pages.length - 10} more`);
        }
      }
      
    } catch (error) {
      console.error('💥 Error updating allowlist:', error.message);
      process.exit(1);
    }
  }

  /**
   * Sammenlign sitemap med eksisterende allowlist
   */
  async compareWithExisting() {
    try {
      console.log('🔍 Comparing sitemap with existing allowlist...');
      
      const sitemapResults = await this.loadSitemapResults();
      const existingAllowlist = await this.loadAllowlist();
      
      const sitemapUrls = new Set(sitemapResults.urls?.map(u => u.url) || []);
      const existingUrls = new Set([
        ...(existingAllowlist.static_pages || []),
        ...(existingAllowlist.news_articles || [])
      ]);
      
      const onlyInSitemap = [...sitemapUrls].filter(url => !existingUrls.has(url));
      const onlyInAllowlist = [...existingUrls].filter(url => !sitemapUrls.has(url));
      const common = [...sitemapUrls].filter(url => existingUrls.has(url));
      
      console.log('\n📊 Comparison Results:');
      console.log(`   - URLs only in sitemap: ${onlyInSitemap.length}`);
      console.log(`   - URLs only in allowlist: ${onlyInAllowlist.length}`);
      console.log(`   - Common URLs: ${common.length}`);
      console.log(`   - Sitemap total: ${sitemapUrls.size}`);
      console.log(`   - Allowlist total: ${existingUrls.size}`);
      
      if (onlyInSitemap.length > 0) {
        console.log('\n🆕 New URLs from sitemap:');
        onlyInSitemap.slice(0, 10).forEach(url => {
          console.log(`   - ${url}`);
        });
        if (onlyInSitemap.length > 10) {
          console.log(`   ... and ${onlyInSitemap.length - 10} more`);
        }
      }
      
      if (onlyInAllowlist.length > 0) {
        console.log('\n🗑️  URLs only in allowlist (will be removed):');
        onlyInAllowlist.slice(0, 10).forEach(url => {
          console.log(`   - ${url}`);
        });
        if (onlyInAllowlist.length > 10) {
          console.log(`   ... and ${onlyInAllowlist.length - 10} more`);
        }
      }
      
    } catch (error) {
      console.error('💥 Error comparing:', error.message);
    }
  }

  /**
   * Hovedfunksjon
   */
  async run() {
    try {
      console.log('🚀 Starting sitemap to allowlist conversion...');
      
      await this.compareWithExisting();
      await this.updateAllowlist();
      
    } catch (error) {
      console.error('💥 Critical error:', error.message);
      process.exit(1);
    }
  }
}

// Kjør hvis kalt direkte
if (require.main === module) {
  const converter = new SitemapToAllowlistConverter();
  converter.run().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = SitemapToAllowlistConverter;
