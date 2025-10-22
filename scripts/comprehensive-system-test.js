#!/usr/bin/env node

/**
 * Comprehensive System Test for Askerbot
 * Tester hele ingest, index, retrieve og answer systemet
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const bm25 = require('wink-bm25-text-search');

class ComprehensiveSystemTest {
  constructor() {
    this.baseDir = path.join(__dirname, '..');
    this.bm25Dir = path.join(this.baseDir, 'storage', 'index', 'bm25');
    this.chunksDir = path.join(this.baseDir, 'storage', 'chunks');
    this.parsedDir = path.join(this.baseDir, 'storage', 'parsed');
    
    this.results = {
      indexing: {},
      retrieval: {},
      quality: {},
      recommendations: []
    };
  }

  /**
   * Test 1: Indexing Quality
   */
  async testIndexingQuality() {
    console.log('\n📇 Test 1: Indexing Quality');
    console.log('='.repeat(70));
    
    // Les BM25 index
    const indexPath = path.join(this.bm25Dir, 'bm25-index.json');
    const metadataPath = path.join(this.bm25Dir, 'chunk-metadata.json');
    const statsPath = path.join(this.bm25Dir, 'index-stats.json');
    
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    const stats = JSON.parse(await fs.readFile(statsPath, 'utf8'));
    
    // Tell chunks i files
    const chunkFiles = await fs.readdir(this.chunksDir);
    const jsonlFiles = chunkFiles.filter(f => f.endsWith('.jsonl'));
    
    let totalChunksInFiles = 0;
    const chunkDetails = [];
    
    for (const file of jsonlFiles) {
      const content = await fs.readFile(path.join(this.chunksDir, file), 'utf8');
      const lines = content.trim().split('\n').filter(l => l.trim());
      totalChunksInFiles += lines.length;
      
      for (const line of lines) {
        const chunk = JSON.parse(line);
        chunkDetails.push({
          id: chunk.chunk_id,
          file: file,
          size: chunk.chunk_word_count,
          quality: chunk.quality_score,
          type: chunk.chunk_type
        });
      }
    }
    
    this.results.indexing = {
      totalChunksInFiles,
      totalChunksInIndex: Object.keys(metadata).length,
      coverage: ((Object.keys(metadata).length / totalChunksInFiles) * 100).toFixed(2),
      avgChunkSize: (chunkDetails.reduce((sum, c) => sum + c.size, 0) / chunkDetails.length).toFixed(1),
      avgQuality: (chunkDetails.reduce((sum, c) => sum + (c.quality || 0), 0) / chunkDetails.length).toFixed(1),
      chunkTypes: this.groupBy(chunkDetails, 'type')
    };
    
    console.log(`Total chunks i filer: ${totalChunksInFiles}`);
    console.log(`Total chunks i index: ${Object.keys(metadata).length}`);
    console.log(`Index coverage: ${this.results.indexing.coverage}%`);
    console.log(`Gjennomsnittlig chunk størrelse: ${this.results.indexing.avgChunkSize} ord`);
    console.log(`Gjennomsnittlig kvalitet score: ${this.results.indexing.avgQuality}`);
    
    console.log('\nChunk types distribution:');
    Object.entries(this.results.indexing.chunkTypes).forEach(([type, chunks]) => {
      console.log(`  - ${type}: ${chunks.length} chunks`);
    });
    
    // Identifiser manglende chunks
    const indexedIds = new Set(Object.keys(metadata));
    const missingChunks = chunkDetails.filter(c => !indexedIds.has(c.id));
    
    if (missingChunks.length > 0) {
      console.log(`\n⚠️  ${missingChunks.length} chunks mangler i index:`);
      missingChunks.forEach(c => {
        console.log(`  - ${c.id} (fra ${c.file})`);
      });
      this.results.recommendations.push({
        priority: 'high',
        category: 'indexing',
        issue: `${missingChunks.length} chunks mangler i BM25 index`,
        action: 'Kjør: npm run bm25 for å reindexere'
      });
    }
    
    // Identifiser lav-kvalitet chunks
    const lowQualityChunks = chunkDetails.filter(c => c.quality < 20);
    if (lowQualityChunks.length > 0) {
      console.log(`\n⚠️  ${lowQualityChunks.length} chunks har lav kvalitet (< 20):`);
      lowQualityChunks.slice(0, 5).forEach(c => {
        console.log(`  - ${c.id}: score ${c.quality}`);
      });
      if (lowQualityChunks.length > 5) {
        console.log(`  ... og ${lowQualityChunks.length - 5} flere`);
      }
      this.results.recommendations.push({
        priority: 'medium',
        category: 'quality',
        issue: `${lowQualityChunks.length} chunks har lav kvalitet`,
        action: 'Vurder å forbedre HTML parsing for bedre content extraction'
      });
    }
  }

  /**
   * Test 2: Retrieval Quality
   */
  async testRetrievalQuality() {
    console.log('\n🔍 Test 2: Retrieval Quality');
    console.log('='.repeat(70));
    
    // Last BM25 index
    const indexPath = path.join(this.bm25Dir, 'bm25-index.json');
    const metadataPath = path.join(this.bm25Dir, 'chunk-metadata.json');
    
    const indexData = JSON.parse(await fs.readFile(indexPath, 'utf8'));
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    
    const engine = bm25();
    
    // Define same config as when indexing
    engine.defineConfig({ 
      fldWeights: { content: 1 },
      k1: 1.2,
      b: 0.75
    });
    
    // Define same text preparation tasks as when indexing
    engine.definePrepTasks([
      (text) => text.toLowerCase(),
      (text) => text.split(/\W+/).filter(word => word.length > 0)
    ]);
    
    engine.importJSON(indexData);
    
    // Test queries
    const testQueries = [
      { query: 'OBOS akademi pris', expectedKeywords: ['akademi', 'pris', 'obos', 'kr'], category: 'akademi' },
      { query: 'Hvem er treneren for G15', expectedKeywords: ['trener', 'g15', 'gutter'], category: 'trenere' },
      { query: 'Når spiller A-laget', expectedKeywords: ['terminliste', 'kamp', 'dato'], category: 'terminliste' },
      { query: 'Føyka stadion adresse', expectedKeywords: ['føyka', 'stadion', 'adresse', 'slik finner'], category: 'stadion' },
      { query: 'Asker fotball historie', expectedKeywords: ['historie', 'stiftet', '1889'], category: 'historie' },
      { query: 'Sesongkort pris', expectedKeywords: ['sesongkort', 'pris', 'billetter'], category: 'billetter' },
      { query: 'Kontakt klubben', expectedKeywords: ['kontakt', 'ansatte', 'telefon', 'epost'], category: 'kontakt' },
      { query: 'Bli frivillig', expectedKeywords: ['frivillig', 'dugnad'], category: 'dugnad' },
      { query: 'Resultater A-laget', expectedKeywords: ['resultater', 'kamp', 'seier', 'tap'], category: 'resultater' },
      { query: 'Partnere samarbeid', expectedKeywords: ['partner', 'samarbeid'], category: 'partnere' }
    ];
    
    const retrievalResults = [];
    
    for (const test of testQueries) {
      const results = engine.search(test.query, 5);
      
      const scores = results.map(r => r[1]);
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      
      // Sjekk relevans
      const topChunks = results.slice(0, 3).map(r => {
        const chunk = metadata[r[0]];
        return {
          id: r[0],
          title: chunk.title,
          score: r[1],
          content: chunk.content.toLowerCase()
        };
      });
      
      let relevanceScore = 0;
      let foundKeywords = [];
      
      for (const chunk of topChunks) {
        for (const keyword of test.expectedKeywords) {
          if (chunk.content.includes(keyword.toLowerCase())) {
            relevanceScore++;
            if (!foundKeywords.includes(keyword)) {
              foundKeywords.push(keyword);
            }
          }
        }
      }
      
      const relevancePercentage = (foundKeywords.length / test.expectedKeywords.length) * 100;
      
      retrievalResults.push({
        query: test.query,
        category: test.category,
        resultsCount: results.length,
        avgScore: avgScore.toFixed(4),
        relevanceScore: relevancePercentage.toFixed(1),
        foundKeywords: foundKeywords.length,
        expectedKeywords: test.expectedKeywords.length,
        topResults: topChunks.map(c => ({ title: c.title, score: c.score }))
      });
      
      console.log(`\nQuery: "${test.query}"`);
      console.log(`  Results: ${results.length}`);
      console.log(`  Avg BM25 score: ${avgScore.toFixed(4)}`);
      console.log(`  Relevans: ${relevancePercentage.toFixed(1)}% (${foundKeywords.length}/${test.expectedKeywords.length} keywords)`);
      console.log(`  Top 3:`);
      topChunks.forEach((c, idx) => {
        console.log(`    ${idx + 1}. ${c.title} (${c.score.toFixed(4)})`);
      });
    }
    
    this.results.retrieval = {
      totalQueries: testQueries.length,
      avgRelevance: (retrievalResults.reduce((sum, r) => sum + parseFloat(r.relevanceScore), 0) / retrievalResults.length).toFixed(1),
      queries: retrievalResults
    };
    
    console.log(`\n📊 Overall Retrieval Quality: ${this.results.retrieval.avgRelevance}%`);
    
    // Identifiser svake queries
    const weakQueries = retrievalResults.filter(r => parseFloat(r.relevanceScore) < 50);
    if (weakQueries.length > 0) {
      console.log(`\n⚠️  ${weakQueries.length} queries med lav relevans:`);
      weakQueries.forEach(q => {
        console.log(`  - "${q.query}": ${q.relevanceScore}%`);
      });
      this.results.recommendations.push({
        priority: 'high',
        category: 'retrieval',
        issue: `${weakQueries.length} queries har lav retrieval kvalitet`,
        action: 'Forbedre synonym mapping og query preprocessing'
      });
    }
  }

  /**
   * Test 3: Content Quality
   */
  async testContentQuality() {
    console.log('\n📝 Test 3: Content Quality');
    console.log('='.repeat(70));
    
    // Les parsed files
    const parsedFiles = await fs.readdir(this.parsedDir);
    const jsonFiles = parsedFiles.filter(f => f.endsWith('.json'));
    
    const contentQuality = {
      totalDocs: jsonFiles.length,
      emptyDocs: 0,
      shortDocs: 0,
      goodDocs: 0,
      avgWordCount: 0,
      issues: []
    };
    
    let totalWords = 0;
    
    for (const file of jsonFiles) {
      const content = await fs.readFile(path.join(this.parsedDir, file), 'utf8');
      const doc = JSON.parse(content);
      
      const wordCount = doc.word_count || 0;
      totalWords += wordCount;
      
      if (wordCount === 0) {
        contentQuality.emptyDocs++;
        contentQuality.issues.push({
          file,
          issue: 'Empty document',
          wordCount: 0
        });
      } else if (wordCount < 50) {
        contentQuality.shortDocs++;
        contentQuality.issues.push({
          file,
          issue: 'Very short document',
          wordCount
        });
      } else {
        contentQuality.goodDocs++;
      }
    }
    
    contentQuality.avgWordCount = (totalWords / jsonFiles.length).toFixed(0);
    
    this.results.quality = contentQuality;
    
    console.log(`Total dokumenter: ${contentQuality.totalDocs}`);
    console.log(`Tomme dokumenter: ${contentQuality.emptyDocs}`);
    console.log(`Korte dokumenter (< 50 ord): ${contentQuality.shortDocs}`);
    console.log(`Gode dokumenter: ${contentQuality.goodDocs}`);
    console.log(`Gjennomsnittlig ordtelling: ${contentQuality.avgWordCount}`);
    
    if (contentQuality.issues.length > 0) {
      console.log(`\n⚠️  ${contentQuality.issues.length} dokumenter med kvalitetsproblemer:`);
      contentQuality.issues.slice(0, 10).forEach(issue => {
        console.log(`  - ${issue.file}: ${issue.issue} (${issue.wordCount} ord)`);
      });
      if (contentQuality.issues.length > 10) {
        console.log(`  ... og ${contentQuality.issues.length - 10} flere`);
      }
      
      if (contentQuality.emptyDocs > 0 || contentQuality.shortDocs > 5) {
        this.results.recommendations.push({
          priority: 'medium',
          category: 'content',
          issue: `${contentQuality.emptyDocs + contentQuality.shortDocs} dokumenter har lite innhold`,
          action: 'Forbedre HTML parsing, spesielt for dynamisk innhold'
        });
      }
    }
  }

  /**
   * Test 4: Chunk Size Distribution
   */
  async testChunkDistribution() {
    console.log('\n📏 Test 4: Chunk Size Distribution');
    console.log('='.repeat(70));
    
    const chunkFiles = await fs.readdir(this.chunksDir);
    const jsonlFiles = chunkFiles.filter(f => f.endsWith('.jsonl'));
    
    const chunkSizes = [];
    
    for (const file of jsonlFiles) {
      const content = await fs.readFile(path.join(this.chunksDir, file), 'utf8');
      const lines = content.trim().split('\n').filter(l => l.trim());
      
      for (const line of lines) {
        const chunk = JSON.parse(line);
        chunkSizes.push(chunk.chunk_word_count);
      }
    }
    
    chunkSizes.sort((a, b) => a - b);
    
    const distribution = {
      total: chunkSizes.length,
      min: Math.min(...chunkSizes),
      max: Math.max(...chunkSizes),
      avg: (chunkSizes.reduce((a, b) => a + b, 0) / chunkSizes.length).toFixed(1),
      median: chunkSizes[Math.floor(chunkSizes.length / 2)],
      tooSmall: chunkSizes.filter(s => s < 50).length,
      tooLarge: chunkSizes.filter(s => s > 500).length,
      optimal: chunkSizes.filter(s => s >= 50 && s <= 500).length
    };
    
    console.log(`Total chunks: ${distribution.total}`);
    console.log(`Min størrelse: ${distribution.min} ord`);
    console.log(`Max størrelse: ${distribution.max} ord`);
    console.log(`Gjennomsnitt: ${distribution.avg} ord`);
    console.log(`Median: ${distribution.median} ord`);
    console.log(`\nDistribusjon:`);
    console.log(`  Too small (< 50 ord): ${distribution.tooSmall}`);
    console.log(`  Optimal (50-500 ord): ${distribution.optimal}`);
    console.log(`  Too large (> 500 ord): ${distribution.tooLarge}`);
    
    this.results.chunkDistribution = distribution;
    
    if (distribution.tooSmall > distribution.total * 0.2) {
      this.results.recommendations.push({
        priority: 'low',
        category: 'chunking',
        issue: `${distribution.tooSmall} chunks er for små (< 50 ord)`,
        action: 'Vurder å øke minimum chunk størrelse eller kombinere små chunks'
      });
    }
  }

  /**
   * Utility: Group by
   */
  groupBy(array, key) {
    return array.reduce((result, item) => {
      const group = item[key] || 'unknown';
      if (!result[group]) {
        result[group] = [];
      }
      result[group].push(item);
      return result;
    }, {});
  }

  /**
   * Generate Final Report
   */
  async generateReport() {
    console.log('\n' + '='.repeat(70));
    console.log('📋 SYSTEM HEALTH REPORT');
    console.log('='.repeat(70));
    
    // Overall scores
    const indexingScore = parseFloat(this.results.indexing.coverage);
    const retrievalScore = parseFloat(this.results.retrieval.avgRelevance);
    const qualityScore = (this.results.quality.goodDocs / this.results.quality.totalDocs) * 100;
    
    const overallScore = ((indexingScore + retrievalScore + qualityScore) / 3).toFixed(1);
    
    console.log(`\n🎯 OVERALL SYSTEM SCORE: ${overallScore}/100`);
    console.log(`\n  📇 Indexing Quality: ${indexingScore}/100`);
    console.log(`  🔍 Retrieval Quality: ${retrievalScore}/100`);
    console.log(`  📝 Content Quality: ${qualityScore.toFixed(1)}/100`);
    
    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS (${this.results.recommendations.length}):`);
    
    const highPriority = this.results.recommendations.filter(r => r.priority === 'high');
    const mediumPriority = this.results.recommendations.filter(r => r.priority === 'medium');
    const lowPriority = this.results.recommendations.filter(r => r.priority === 'low');
    
    if (highPriority.length > 0) {
      console.log(`\n🔴 HIGH PRIORITY (${highPriority.length}):`);
      highPriority.forEach((r, idx) => {
        console.log(`  ${idx + 1}. [${r.category.toUpperCase()}] ${r.issue}`);
        console.log(`     → ${r.action}`);
      });
    }
    
    if (mediumPriority.length > 0) {
      console.log(`\n🟡 MEDIUM PRIORITY (${mediumPriority.length}):`);
      mediumPriority.forEach((r, idx) => {
        console.log(`  ${idx + 1}. [${r.category.toUpperCase()}] ${r.issue}`);
        console.log(`     → ${r.action}`);
      });
    }
    
    if (lowPriority.length > 0) {
      console.log(`\n🟢 LOW PRIORITY (${lowPriority.length}):`);
      lowPriority.forEach((r, idx) => {
        console.log(`  ${idx + 1}. [${r.category.toUpperCase()}] ${r.issue}`);
        console.log(`     → ${r.action}`);
      });
    }
    
    // Save report
    const reportPath = path.join(this.baseDir, 'storage', 'metrics', 'system-health-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      scores: {
        overall: parseFloat(overallScore),
        indexing: indexingScore,
        retrieval: retrievalScore,
        quality: parseFloat(qualityScore.toFixed(1))
      },
      results: this.results,
      recommendations: this.results.recommendations
    };
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n💾 Full report saved to: ${reportPath}`);
  }

  /**
   * Run all tests
   */
  async run() {
    console.log('🚀 Starting Comprehensive System Test');
    console.log('='.repeat(70));
    
    try {
      await this.testIndexingQuality();
      await this.testRetrievalQuality();
      await this.testContentQuality();
      await this.testChunkDistribution();
      await this.generateReport();
      
      console.log('\n🎉 System test completed!');
      
    } catch (error) {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new ComprehensiveSystemTest();
  tester.run().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = ComprehensiveSystemTest;

