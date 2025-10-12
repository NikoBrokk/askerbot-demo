const fs = require('fs');
const path = require('path');
const bm25 = require('wink-bm25-text-search');

// Configuration
const CHUNKS_DIR = path.join(__dirname, '..', 'storage', 'chunks');
const BM25_DIR = path.join(__dirname, '..', 'storage', 'index', 'bm25');

/**
 * Create BM25 directory if it doesn't exist
 */
function ensureBm25Dir() {
  if (!fs.existsSync(BM25_DIR)) {
    fs.mkdirSync(BM25_DIR, { recursive: true });
  }
}

/**
 * Read all chunks from JSONL files
 */
function readAllChunks() {
  if (!fs.existsSync(CHUNKS_DIR)) {
    throw new Error(`Chunks directory not found: ${CHUNKS_DIR}`);
  }

  const files = fs.readdirSync(CHUNKS_DIR)
    .filter(file => file.endsWith('.jsonl'))
    .map(file => path.join(CHUNKS_DIR, file));

  if (files.length === 0) {
    throw new Error(`No JSONL files found in ${CHUNKS_DIR}`);
  }

  const chunks = [];
  const chunkMap = new Map(); // To track chunk metadata

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const chunk = JSON.parse(line);
        chunks.push(chunk);
        chunkMap.set(chunk.chunk_id, chunk);
      } catch (error) {
        console.error(`Error parsing line in ${filePath}:`, error.message);
      }
    }
  }
  
  return { chunks, chunkMap };
}

/**
 * Build BM25 index from chunks
 */
function buildBm25Index(chunks) {
  console.log('🔧 Initializing BM25 search engine...');
  
  // Create BM25 search engine
  const engine = bm25();
  
  // Define configuration with field weights
  engine.defineConfig({ 
    fldWeights: { content: 1 },
    k1: 1.2,      // Term frequency saturation parameter
    b: 0.75       // Length normalization parameter
  });
  
  // Define text preparation tasks
  engine.definePrepTasks([
    // Convert to lowercase
    (text) => text.toLowerCase(),
    // Split into words, remove punctuation, filter empty strings
    (text) => text.split(/\W+/).filter(word => word.length > 0)
  ]);
  
  console.log(`📖 Adding ${chunks.length} chunks to BM25 index...`);
  
  // Add documents to the engine
  chunks.forEach((chunk, index) => {
    engine.addDoc(
      { content: chunk.content },
      chunk.chunk_id // Use chunk_id as document ID
    );
    
    if ((index + 1) % 10 === 0) {
      console.log(`  Added ${index + 1}/${chunks.length} chunks`);
    }
  });
  
  console.log('🔄 Consolidating BM25 index...');
  engine.consolidate();
  
  return engine;
}

/**
 * Save BM25 index and metadata
 */
function saveBm25Index(engine, chunkMap) {
  console.log('💾 Exporting BM25 index...');
  
  // Export the BM25 index
  const indexJson = engine.exportJSON();
  
  // Save the main index
  const indexPath = path.join(BM25_DIR, 'bm25-index.json');
  fs.writeFileSync(indexPath, JSON.stringify(indexJson, null, 2));
  
  // Save chunk metadata for reference
  const metadataPath = path.join(BM25_DIR, 'chunk-metadata.json');
  const metadata = Object.fromEntries(chunkMap);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  
  // Save index statistics
  const stats = {
    total_chunks: chunkMap.size,
    index_created_at: new Date().toISOString(),
    chunk_files: fs.readdirSync(CHUNKS_DIR).filter(f => f.endsWith('.jsonl')),
    bm25_config: {
      k1: 1.2,
      b: 0.75,
      fldWeights: { content: 1 }
    }
  };
  
  const statsPath = path.join(BM25_DIR, 'index-stats.json');
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  
  console.log(`✅ BM25 index saved to: ${indexPath}`);
  console.log(`✅ Chunk metadata saved to: ${metadataPath}`);
  console.log(`✅ Index statistics saved to: ${statsPath}`);
  
  return stats;
}

/**
 * Test the BM25 index with a sample query
 */
function testBm25Index(engine, chunkMap) {
  console.log('🧪 Testing BM25 index with sample queries...');
  
  const testQueries = [
    'fotball',
    'akademi',
    'stadion',
    'klubb',
    'trener'
  ];
  
  testQueries.forEach(query => {
    try {
      const results = engine.search(query, 3); // Get top 3 results
      console.log(`\n🔍 Query: "${query}"`);
      console.log(`   Found ${results.length} results:`);
      
      results.forEach((result, idx) => {
        const chunk = chunkMap.get(result[0]); // result[0] is the document ID
        if (chunk) {
          console.log(`   ${idx + 1}. ${chunk.title} (score: ${result[1].toFixed(4)})`);
          console.log(`      Content preview: ${chunk.content.substring(0, 100)}...`);
        }
      });
    } catch (error) {
      console.error(`Error testing query "${query}":`, error.message);
    }
  });
}

/**
 * Main function
 */
function main() {
  try {
    console.log('🚀 Starting BM25 index build process...');
    
    // Ensure directories exist
    ensureBm25Dir();
    
    // Read all chunks
    const { chunks, chunkMap } = readAllChunks();
    console.log(`📊 Found ${chunks.length} chunks to index`);
    
    if (chunks.length === 0) {
      console.log('❌ No chunks found. Run "npm run chunk" first.');
      return;
    }
    
    // Build BM25 index
    const engine = buildBm25Index(chunks);
    
    // Save index and metadata
    const stats = saveBm25Index(engine, chunkMap);
    
    // Test the index
    testBm25Index(engine, chunkMap);
    
    console.log('\n🎉 BM25 index build completed successfully!');
    console.log(`📁 BM25 index stored at: ${BM25_DIR}`);
    console.log(`📊 Total documents indexed: ${stats.total_chunks}`);
    console.log(`📅 Index created: ${stats.index_created_at}`);
    
  } catch (error) {
    console.error('❌ BM25 index build failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  buildBm25Index,
  saveBm25Index,
  testBm25Index,
  main
};
