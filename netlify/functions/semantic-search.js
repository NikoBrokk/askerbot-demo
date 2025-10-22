/**
 * Semantic Search Module with OpenAI Embeddings + ChromaDB
 * Implements hybrid search (BM25 + Vector Similarity)
 */

const { ChromaClient } = require('chromadb');
const path = require('path');

// Cache for ChromaDB client and collection
let chromaClient = null;
let chromaCollection = null;
let chromaInitialized = false;

/**
 * Initialize ChromaDB client using HTTP API
 * NOTE: Requires ChromaDB server to be running (python services/chromadb_api.py)
 */
async function initializeChromaDB() {
  if (chromaClient && chromaInitialized) {
    return { client: chromaClient, collection: chromaCollection };
  }
  
  try {
    // Use HTTP client (more reliable than file-based client)
    const chromaHost = process.env.CHROMA_HOST || 'localhost';
    const chromaPort = process.env.CHROMA_PORT || '8000';
    
    chromaClient = new ChromaClient({
      host: chromaHost,
      port: chromaPort
    });
    
    // Get the collection (should already exist from embed.py)
    const collections = await chromaClient.listCollections();
    const collectionName = process.env.CHROMA_COLLECTION_NAME || 'asker_fotball_docs';
    
    chromaCollection = collections.find(c => c.name === collectionName);
    
    if (!chromaCollection) {
      console.log('⚠️  ChromaDB collection not found, falling back to BM25 only');
      return null;
    }
    
    chromaInitialized = true;
    console.log(`✅ ChromaDB initialized: ${collectionName}`);
    
    return { client: chromaClient, collection: chromaCollection };
  } catch (error) {
    console.error('❌ ChromaDB initialization failed:', error.message);
    console.log('💡 Tip: For production, ChromaDB vector search requires ChromaDB server');
    console.log('   For now, system will use BM25-only search (still works well!)');
    return null;
  }
}

/**
 * Create query embedding using OpenAI
 */
async function createQueryEmbedding(query, apiKey) {
  if (!apiKey) {
    throw new Error('OpenAI API key required for embeddings');
  }
  
  try {
    const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: embeddingModel,
        input: query
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }
    
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Failed to create query embedding:', error);
    throw error;
  }
}

/**
 * Perform semantic search using ChromaDB + OpenAI embeddings
 */
async function searchVectorDB(query, limit = 5, apiKey = null) {
  if (!apiKey) {
    console.log('⚠️  No OpenAI API key, skipping vector search');
    return [];
  }
  
  try {
    // Initialize ChromaDB
    const chroma = await initializeChromaDB();
    if (!chroma || !chroma.collection) {
      console.log('⚠️  ChromaDB not available, skipping vector search');
      return [];
    }
    
    // Create query embedding
    const queryEmbedding = await createQueryEmbedding(query, apiKey);
    
    // Perform vector search
    const results = await chroma.collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit,
      include: ['metadatas', 'distances', 'documents']
    });
    
    // Format results
    const formattedResults = [];
    
    if (results.ids && results.ids[0]) {
      for (let i = 0; i < results.ids[0].length; i++) {
        const meta = results.metadatas[0][i];
        const distance = results.distances[0][i];
        const document = results.documents[0][i];
        
        // Convert distance to similarity score (lower distance = higher similarity)
        const similarityScore = Math.max(0, 1 - distance);
        
        formattedResults.push({
          id: results.ids[0][i],
          title: meta.title,
          url: meta.url,
          content: document,
          vectorScore: similarityScore * 100, // 0-100 scale
          distance: distance,
          metadata: meta
        });
      }
    }
    
    console.log(`🔍 Vector search found ${formattedResults.length} results`);
    return formattedResults;
    
  } catch (error) {
    console.error('Vector search failed:', error);
    return [];
  }
}

/**
 * Hybrid search: Combine BM25 (keyword) + Vector (semantic)
 * 
 * @param {string} query - User query
 * @param {Array} bm25Results - Results from BM25 search
 * @param {number} limit - Max results to return
 * @param {string} apiKey - OpenAI API key
 * @returns {Array} Combined and ranked results
 */
async function hybridSearch(query, bm25Results, limit = 5, apiKey = null) {
  // Get vector search results
  const vectorResults = await searchVectorDB(query, limit * 2, apiKey);
  
  // If no vector results, return BM25 only
  if (vectorResults.length === 0) {
    console.log('📊 Using BM25-only results (no vector search)');
    return bm25Results.slice(0, limit);
  }
  
  // Combine results with weighted scoring
  // Weight configuration (can be tuned)
  const VECTOR_WEIGHT = 0.7;  // Semantic similarity weight
  const BM25_WEIGHT = 0.3;    // Keyword matching weight
  
  const combinedResults = new Map();
  
  // Add BM25 results
  bm25Results.forEach((result, index) => {
    const id = result.url || result.title;
    combinedResults.set(id, {
      ...result,
      bm25Score: result.score || result.bm25Score || 0,
      bm25Rank: index + 1,
      vectorScore: 0,
      vectorRank: Infinity
    });
  });
  
  // Add/merge vector results
  vectorResults.forEach((result, index) => {
    const id = result.url || result.title;
    
    if (combinedResults.has(id)) {
      // Update existing result
      const existing = combinedResults.get(id);
      existing.vectorScore = result.vectorScore;
      existing.vectorRank = index + 1;
    } else {
      // Add new result
      combinedResults.set(id, {
        title: result.title,
        url: result.url,
        content: result.content,
        bm25Score: 0,
        bm25Rank: Infinity,
        vectorScore: result.vectorScore,
        vectorRank: index + 1,
        metadata: result.metadata
      });
    }
  });
  
  // Calculate hybrid scores
  const scoredResults = Array.from(combinedResults.values()).map(result => {
    // Normalize scores (BM25 scores can vary widely)
    const normalizedBM25 = Math.min(result.bm25Score / 100, 1);
    const normalizedVector = result.vectorScore / 100;
    
    // Combined score
    const hybridScore = (normalizedBM25 * BM25_WEIGHT) + (normalizedVector * VECTOR_WEIGHT);
    
    // Boost if result appears in both searches
    const appearsBothBoost = (result.bm25Rank < Infinity && result.vectorRank < Infinity) ? 0.1 : 0;
    
    return {
      ...result,
      hybridScore: (hybridScore + appearsBothBoost) * 100,
      combinedFrom: result.bm25Rank < Infinity && result.vectorRank < Infinity ? 'both' : 
                    result.bm25Rank < Infinity ? 'bm25' : 'vector'
    };
  });
  
  // Sort by hybrid score and return top results
  const finalResults = scoredResults
    .sort((a, b) => b.hybridScore - a.hybridScore)
    .slice(0, limit);
  
  console.log(`📊 Hybrid search results:`, finalResults.map(r => ({
    title: r.title,
    hybrid: r.hybridScore.toFixed(1),
    bm25: r.bm25Score.toFixed(1),
    vector: r.vectorScore.toFixed(1),
    source: r.combinedFrom
  })));
  
  return finalResults;
}

module.exports = {
  initializeChromaDB,
  createQueryEmbedding,
  searchVectorDB,
  hybridSearch
};

