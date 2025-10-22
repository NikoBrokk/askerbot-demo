#!/usr/bin/env node

/**
 * Test ChromaDB embeddings quality
 */

const { ChromaClient } = require('chromadb');
const path = require('path');

async function testChromaDB() {
  console.log('🧪 Testing ChromaDB Embeddings');
  console.log('='.repeat(70));
  
  try {
    const chromaPath = path.join(__dirname, '..', 'storage', 'index', 'chroma');
    
    const client = new ChromaClient({
      path: chromaPath
    });
    
    // List collections
    const collections = await client.listCollections();
    console.log(`\n📊 Collections found: ${collections.length}`);
    
    for (const collection of collections) {
      console.log(`\n📁 Collection: ${collection.name}`);
      
      const count = await collection.count();
      console.log(`   Documents: ${count}`);
      
      // Test semantic search
      const testQueries = [
        'OBOS akademi pris',
        'Hvem er treneren for G15',
        'Når spiller A-laget',
        'Føyka stadion adresse',
        'Asker fotball historie'
      ];
      
      console.log(`\n🔍 Testing semantic search:\n`);
      
      for (const query of testQueries) {
        try {
          const results = await collection.query({
            queryTexts: [query],
            nResults: 3
          });
          
          console.log(`Query: "${query}"`);
          console.log(`  Results: ${results.ids[0].length}`);
          
          if (results.metadatas && results.metadatas[0]) {
            results.metadatas[0].forEach((meta, idx) => {
              const distance = results.distances[0][idx];
              console.log(`  ${idx + 1}. ${meta.title} (distance: ${distance.toFixed(4)})`);
            });
          }
          console.log('');
        } catch (error) {
          console.log(`  ❌ Error: ${error.message}\n`);
        }
      }
    }
    
    console.log('\n✅ ChromaDB test completed!');
    
  } catch (error) {
    console.error('❌ ChromaDB test failed:', error.message);
    console.error('\nPossible issues:');
    console.error('- ChromaDB not properly initialized');
    console.error('- Wrong collection name');
    console.error('- Embeddings not generated');
    process.exit(1);
  }
}

testChromaDB().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

