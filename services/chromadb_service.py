#!/usr/bin/env python3
"""
ChromaDB Search Service for Asker Fotball
Provides semantic search capabilities for the RAG system
"""

import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    print("❌ ChromaDB not installed. Run: pip install chromadb")
    CHROMADB_AVAILABLE = False

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    print("⚠️  sentence-transformers not available. Install with: pip install sentence-transformers")
    SENTENCE_TRANSFORMERS_AVAILABLE = False

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    print("⚠️  OpenAI not available. Install with: pip install openai")
    OPENAI_AVAILABLE = False

# Configuration
CHROMA_DIR = Path(__file__).parent.parent / "storage" / "index" / "chroma"
COLLECTION_NAME = os.getenv("CHROMA_COLLECTION_NAME", "asker_fotball_docs")
EMBEDDING_PROVIDER = os.getenv("EMBEDDING_PROVIDER", "local")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ChromaDBSearchService:
    """ChromaDB search service for semantic search"""
    
    def __init__(self):
        if not CHROMADB_AVAILABLE:
            raise ImportError("ChromaDB not available")
        
        self.client = None
        self.collection = None
        self.embedding_provider = None
        self._initialize()
    
    def _initialize(self):
        """Initialize ChromaDB client and collection"""
        try:
            # Ensure Chroma directory exists
            CHROMA_DIR.mkdir(parents=True, exist_ok=True)
            
            # Initialize Chroma client
            self.client = chromadb.PersistentClient(
                path=str(CHROMA_DIR),
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # Get or create collection
            try:
                self.collection = self.client.get_collection(COLLECTION_NAME)
                logger.info(f"✅ Connected to existing collection: {COLLECTION_NAME}")
            except Exception:
                self.collection = self.client.create_collection(
                    name=COLLECTION_NAME,
                    metadata={"description": "Asker Fotball documentation chunks"}
                )
                logger.info(f"✅ Created new collection: {COLLECTION_NAME}")
            
            # Initialize embedding provider
            self.embedding_provider = self._get_embedding_provider()
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize ChromaDB service: {e}")
            raise
    
    def _get_embedding_provider(self):
        """Get the appropriate embedding provider"""
        if EMBEDDING_PROVIDER == "openai":
            try:
                return OpenAIEmbeddingProvider(OPENAI_API_KEY, OPENAI_MODEL)
            except (ImportError, ValueError) as e:
                logger.warning(f"⚠️  OpenAI provider failed: {e}")
                logger.info("🔄 Falling back to local embeddings...")
                return LocalEmbeddingProvider()
        else:
            return LocalEmbeddingProvider()
    
    def search(self, query: str, max_results: int = 5, filter_metadata: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """
        Search for similar chunks using semantic similarity
        
        Args:
            query: Search query
            max_results: Maximum number of results to return
            filter_metadata: Optional metadata filters
            
        Returns:
            List of search results with metadata
        """
        try:
            if not self.collection:
                raise RuntimeError("Collection not initialized")
            
            # Generate query embedding
            query_embedding = self.embedding_provider.embed([query])[0]
            
            # Search in ChromaDB
            search_results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=max_results,
                where=filter_metadata,
                include=["documents", "metadatas", "distances"]
            )
            
            # Format results
            results = []
            if search_results['documents'] and search_results['documents'][0]:
                for i, (doc, metadata, distance) in enumerate(zip(
                    search_results['documents'][0],
                    search_results['metadatas'][0],
                    search_results['distances'][0]
                )):
                    # Convert distance to similarity score (lower distance = higher similarity)
                    similarity_score = 1.0 - distance
                    
                    result = {
                        'chunk_id': metadata.get('chunk_id', f'unknown_{i}'),
                        'content': doc,
                        'metadata': metadata,
                        'similarity_score': similarity_score,
                        'distance': distance
                    }
                    results.append(result)
            
            logger.info(f"🔍 Found {len(results)} semantic search results for query: {query[:50]}...")
            return results
            
        except Exception as e:
            logger.error(f"❌ Search failed: {e}")
            return []
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get collection statistics"""
        try:
            if not self.collection:
                return {"error": "Collection not initialized"}
            
            count = self.collection.count()
            return {
                "collection_name": COLLECTION_NAME,
                "total_chunks": count,
                "embedding_provider": self.embedding_provider.__class__.__name__,
                "chroma_path": str(CHROMA_DIR)
            }
        except Exception as e:
            logger.error(f"❌ Failed to get collection stats: {e}")
            return {"error": str(e)}
    
    def health_check(self) -> Dict[str, Any]:
        """Check service health"""
        try:
            stats = self.get_collection_stats()
            return {
                "status": "healthy" if "error" not in stats else "unhealthy",
                "stats": stats,
                "chromadb_available": CHROMADB_AVAILABLE,
                "embedding_available": self.embedding_provider is not None
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "chromadb_available": CHROMADB_AVAILABLE
            }

class EmbeddingProvider:
    """Base class for embedding providers"""
    
    def embed(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts"""
        raise NotImplementedError

class LocalEmbeddingProvider(EmbeddingProvider):
    """Local embedding provider using sentence-transformers"""
    
    def __init__(self):
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            raise ImportError("sentence-transformers not available")
        
        logger.info("🔄 Loading local embedding model...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("✅ Local embedding model loaded")
    
    def embed(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using sentence-transformers"""
        return self.model.encode(texts).tolist()

class OpenAIEmbeddingProvider(EmbeddingProvider):
    """OpenAI embedding provider"""
    
    def __init__(self, api_key: str, model: str = "text-embedding-3-small"):
        if not OPENAI_AVAILABLE:
            raise ImportError("OpenAI library not available")
        
        if not api_key or api_key == "your_openai_api_key_here":
            raise ValueError("OpenAI API key not set")
        
        self.client = openai.OpenAI(api_key=api_key)
        self.model = model
        logger.info(f"✅ OpenAI client initialized with model: {model}")
    
    def embed(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using OpenAI API"""
        response = self.client.embeddings.create(
            model=self.model,
            input=texts
        )
        return [data.embedding for data in response.data]

# Global service instance
_service_instance = None

def get_chromadb_service() -> ChromaDBSearchService:
    """Get or create the global ChromaDB service instance"""
    global _service_instance
    if _service_instance is None:
        _service_instance = ChromaDBSearchService()
    return _service_instance

def search_similar_chunks(query: str, max_results: int = 5, filter_metadata: Optional[Dict] = None) -> List[Dict[str, Any]]:
    """Convenience function for searching similar chunks"""
    service = get_chromadb_service()
    return service.search(query, max_results, filter_metadata)

def get_service_stats() -> Dict[str, Any]:
    """Get service statistics"""
    service = get_chromadb_service()
    return service.get_collection_stats()

def health_check() -> Dict[str, Any]:
    """Check service health"""
    service = get_chromadb_service()
    return service.health_check()

if __name__ == "__main__":
    # Test the service
    print("🧪 Testing ChromaDB Search Service...")
    
    try:
        service = ChromaDBSearchService()
        
        # Health check
        health = service.health_check()
        print(f"Health Status: {health['status']}")
        print(f"Collection Stats: {health['stats']}")
        
        # Test search
        if health['status'] == 'healthy':
            results = service.search("asker fotball spillere", max_results=3)
            print(f"\n🔍 Test search results: {len(results)} chunks found")
            for i, result in enumerate(results):
                print(f"  {i+1}. {result['chunk_id']} (score: {result['similarity_score']:.3f})")
        
    except Exception as e:
        print(f"❌ Service test failed: {e}")
