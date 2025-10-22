#!/usr/bin/env node

/**
 * Test Hybrid Search Implementation
 * Tests the integration of BM25 + OpenAI vector search
 */

const path = require('path');
require('dotenv').config();

async function testHybridSearch() {
  console.log('🧪 Testing Hybrid Search Implementation');
  console.log('='.repeat(70));
  
  try {
    // Load modules
    const { hybridSearch, searchVectorDB } = require('../netlify/functions/semantic-search');
    const { classifyQueryIntent, preprocessQuery } = require('../netlify/functions/query-intelligence');
    const bm25 = require('wink-bm25-text-search');
    const fs = require('fs');
    
    // Check OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      console.log('❌ OPENAI_API_KEY not set in .env file');
      console.log('   Hybrid search requires OpenAI API key for embeddings');
      process.exit(1);
    }
    
    console.log('✅ OpenAI API key found');
    
    // Initialize BM25
    const indexPath = path.join(__dirname, '../storage/index/bm25/bm25-index.json');
    const metadataPath = path.join(__dirname, '../storage/index/bm25/chunk-metadata.json');
    
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    
    const engine = bm25();
    engine.defineConfig({ 
      fldWeights: { content: 1 },
      k1: 1.2,
      b: 0.75
    });
    engine.definePrepTasks([
      (text) => text.toLowerCase(),
      (text) => text.split(/\W+/).filter(word => word.length > 0)
    ]);
    engine.importJSON(indexData);
    
    console.log('✅ BM25 index loaded');
    
    // Test queries
    const testQueries = [
      { query: 'OBOS akademi pris', description: 'Price query (should use price intent)' },
      { query: 'Når spiller A-laget', description: 'Schedule query (should use schedule intent)' },
      { query: 'Hvem er treneren for G15', description: 'Roster query (should use roster intent)' },
      { query: 'Asker fotball historie', description: 'History query (should use history intent)' },
      { query: 'Føyka stadion adresse', description: 'Location query (should use location intent)' }
    ];
    
    console.log('\n📊 Testing Query Intelligence:\n');
    
    for (const test of testQueries) {
      console.log(`Query: "${test.query}"`);
      console.log(`  Description: ${test.description}`);
      
      // Test intent classification
      const intent = classifyQueryIntent(test.query);
      if (intent) {
        console.log(`  ✅ Intent: ${intent.intent} (${(intent.confidence * 100).toFixed(0)}% confidence)`);
        console.log(`  Boost terms: ${intent.boostTerms.join(', ')}`);
      } else {
        console.log(`  ⚠️  No intent detected`);
      }
      
      // Test query preprocessing
      const processed = preprocessQuery(test.query);
      console.log(`  Expanded terms: ${processed.expandedTerms.slice(0, 5).join(', ')}...`);
      console.log('');
    }
    
    console.log('\n🔍 Testing Hybrid Search:\n');
    
    for (const test of testQueries) {
      console.log(`Query: "${test.query}"`);
      
      // Get BM25 results
      const bm25Results = engine.search(test.query.toLowerCase(), 5);
      const bm25Formatted = bm25Results.map(([id, score]) => {
        const chunk = metadata[id];
        return {
          title: chunk.title,
          url: chunk.url,
          content: chunk.content,
          score: score * 10,
          bm25Score: score * 10
        };
      });
      
      console.log(`  BM25 results: ${bm25Formatted.length}`);
      if (bm25Formatted.length > 0) {
        console.log(`    Top: ${bm25Formatted[0].title} (score: ${bm25Formatted[0].score.toFixed(2)})`);
      }
      
      // Try hybrid search
      try {
        const hybridResults = await hybridSearch(test.query, bm25Formatted, 3, apiKey);
        console.log(`  ✅ Hybrid results: ${hybridResults.length}`);
        
        if (hybridResults.length > 0) {
          console.log(`\n  Top 3 results:`);
          hybridResults.slice(0, 3).forEach((r, idx) => {
            console.log(`    ${idx + 1}. ${r.title}`);
            console.log(`       Hybrid: ${r.hybridScore.toFixed(1)}, BM25: ${r.bm25Score.toFixed(1)}, Vector: ${r.vectorScore.toFixed(1)}`);
            console.log(`       Source: ${r.combinedFrom}`);
          });
        }
      } catch (error) {
        console.log(`  ❌ Hybrid search failed: ${error.message}`);
      }
      
      console.log('');
    }
    
    console.log('\n✅ Hybrid search test completed!');
    console.log('\n💡 Next steps:');
    console.log('  1. Deploy to Netlify with OPENAI_API_KEY environment variable');
    console.log('  2. Test in production with real user queries');
    console.log('  3. Monitor logs for hybrid search success rate');
    console.log('  4. Adjust weights in semantic-search.js if needed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testHybridSearch().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

