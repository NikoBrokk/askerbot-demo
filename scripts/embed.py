#!/usr/bin/env python3
"""
Embedding script for Asker Fotball documentation.
Reads chunks from storage/chunks/*.jsonl and stores embeddings in ChromaDB.
"""

import os
import json
import glob
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    import chromadb
    from chromadb.config import Settings
except ImportError:
    print("❌ ChromaDB not installed. Run: pip install chromadb")
    exit(1)

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
CHUNKS_DIR = Path(__file__).parent.parent / "storage" / "chunks"
CHROMA_DIR = Path(__file__).parent.parent / "storage" / "index" / "chroma"
EMBEDDING_PROVIDER = os.getenv("EMBEDDING_PROVIDER", "local")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
COLLECTION_NAME = os.getenv("CHROMA_COLLECTION_NAME", "asker_fotball_docs")

class EmbeddingProvider:
    """Base class for embedding providers."""
    
    def embed(self, texts):
        """Generate embeddings for a list of texts."""
        raise NotImplementedError

class LocalEmbeddingProvider(EmbeddingProvider):
    """Local embedding provider using sentence-transformers."""
    
    def __init__(self):
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            raise ImportError("sentence-transformers not available")
        
        print("🔄 Loading local embedding model...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        print("✅ Local embedding model loaded")
    
    def embed(self, texts):
        """Generate embeddings using sentence-transformers."""
        return self.model.encode(texts).tolist()

class OpenAIEmbeddingProvider(EmbeddingProvider):
    """OpenAI embedding provider."""
    
    def __init__(self, api_key, model="text-embedding-3-small"):
        if not OPENAI_AVAILABLE:
            raise ImportError("OpenAI library not available")
        
        if not api_key or api_key == "your_openai_api_key_here":
            raise ValueError("OpenAI API key not set")
        
        self.client = openai.OpenAI(api_key=api_key)
        self.model = model
        print(f"✅ OpenAI client initialized with model: {model}")
    
    def embed(self, texts):
        """Generate embeddings using OpenAI API."""
        response = self.client.embeddings.create(
            model=self.model,
            input=texts
        )
        return [data.embedding for data in response.data]

def get_embedding_provider():
    """Get the appropriate embedding provider based on configuration."""
    if EMBEDDING_PROVIDER == "openai":
        try:
            return OpenAIEmbeddingProvider(OPENAI_API_KEY, OPENAI_MODEL)
        except (ImportError, ValueError) as e:
            print(f"⚠️  OpenAI provider failed: {e}")
            print("🔄 Falling back to local embeddings...")
            return LocalEmbeddingProvider()
    else:
        return LocalEmbeddingProvider()

def read_all_chunks():
    """Read all chunks from JSONL files."""
    if not CHUNKS_DIR.exists():
        raise FileNotFoundError(f"Chunks directory not found: {CHUNKS_DIR}")
    
    jsonl_files = list(CHUNKS_DIR.glob("*.jsonl"))
    if not jsonl_files:
        raise FileNotFoundError(f"No JSONL files found in {CHUNKS_DIR}")
    
    chunks = []
    for jsonl_file in jsonl_files:
        print(f"📖 Reading {jsonl_file.name}...")
        with open(jsonl_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        chunk = json.loads(line)
                        chunks.append(chunk)
                    except json.JSONDecodeError as e:
                        print(f"⚠️  Error parsing line in {jsonl_file}: {e}")
    
    return chunks

def setup_chroma_client():
    """Setup ChromaDB client."""
    # Ensure Chroma directory exists
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    
    # Initialize Chroma client
    client = chromadb.PersistentClient(
        path=str(CHROMA_DIR),
        settings=Settings(
            anonymized_telemetry=False,
            allow_reset=True
        )
    )
    
    return client

def store_embeddings_in_chroma(chunks, embedding_provider, client):
    """Store embeddings in ChromaDB."""
    collection_name = COLLECTION_NAME
    
    # Delete existing collection if it exists
    try:
        client.delete_collection(collection_name)
        print(f"🗑️  Deleted existing collection: {collection_name}")
    except Exception:
        # Collection might not exist, that's okay
        pass
    
    # Create new collection
    print(f"📁 Creating collection: {collection_name}")
    collection = client.create_collection(
        name=collection_name,
        metadata={"description": "Asker Fotball documentation chunks"}
    )
    
    # Prepare data
    texts = [chunk["content"] for chunk in chunks]
    ids = [chunk["chunk_id"] for chunk in chunks]
    metadatas = []
    
    for chunk in chunks:
        metadata = {
            "title": chunk["title"],
            "url": chunk["url"],
            "breadcrumbs": json.dumps(chunk["breadcrumbs"]),
            "idx": chunk["idx"],
            "total_chunks": chunk["total_chunks"],
            "original_word_count": chunk["original_word_count"],
            "chunk_word_count": chunk["chunk_word_count"],
            "source_file": chunk["chunk_id"].split("_chunk_")[0]
        }
        metadatas.append(metadata)
    
    # Generate embeddings
    print(f"🔄 Generating embeddings for {len(texts)} chunks...")
    embeddings = embedding_provider.embed(texts)
    
    # Add to collection in batches
    batch_size = 100
    for i in range(0, len(ids), batch_size):
        batch_ids = ids[i:i + batch_size]
        batch_embeddings = embeddings[i:i + batch_size]
        batch_metadatas = metadatas[i:i + batch_size]
        batch_texts = texts[i:i + batch_size]
        
        collection.add(
            ids=batch_ids,
            embeddings=batch_embeddings,
            metadatas=batch_metadatas,
            documents=batch_texts
        )
        
        batch_num = (i // batch_size) + 1
        total_batches = (len(ids) + batch_size - 1) // batch_size
        print(f"✅ Added batch {batch_num}/{total_batches}")
    
    return collection

def main():
    """Main function."""
    try:
        print("🚀 Starting embedding process...")
        
        # Get embedding provider
        embedding_provider = get_embedding_provider()
        provider_name = embedding_provider.__class__.__name__
        print(f"🔧 Using embedding provider: {provider_name}")
        
        # Read chunks
        chunks = read_all_chunks()
        print(f"📊 Found {len(chunks)} chunks to process")
        
        if not chunks:
            print("❌ No chunks found. Run 'npm run chunk' first.")
            return
        
        # Setup Chroma client
        client = setup_chroma_client()
        
        # Store embeddings
        collection = store_embeddings_in_chroma(chunks, embedding_provider, client)
        
        print("\n🎉 Embedding process completed successfully!")
        print(f"📁 Chroma database stored at: {CHROMA_DIR}")
        print(f"📊 Total documents indexed: {len(chunks)}")
        print(f"🏷️  Collection name: {COLLECTION_NAME}")
        
    except Exception as e:
        print(f"❌ Embedding process failed: {e}")
        raise

if __name__ == "__main__":
    main()
