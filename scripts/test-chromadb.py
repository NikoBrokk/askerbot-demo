#!/usr/bin/env python3
"""
Test ChromaDB embeddings quality
"""

import chromadb
from chromadb.config import Settings
from pathlib import Path
import json

def test_chromadb():
    print("🧪 Testing ChromaDB Embeddings")
    print("=" * 70)
    
    # Setup path
    chroma_dir = Path(__file__).parent.parent / "storage" / "index" / "chroma"
    
    # Initialize client
    client = chromadb.PersistentClient(
        path=str(chroma_dir),
        settings=Settings(anonymized_telemetry=False)
    )
    
    # List collections
    collections = client.list_collections()
    print(f"\n📊 Collections found: {len(collections)}")
    
    for collection in collections:
        print(f"\n📁 Collection: {collection.name}")
        
        count = collection.count()
        print(f"   Documents: {count}")
        
        # Get sample to check embedding dimension
        try:
            sample = collection.get(limit=1, include=['embeddings', 'metadatas'])
            if len(sample['embeddings']) > 0:
                embedding_dim = len(sample['embeddings'][0])
                print(f"   Embedding dimension: {embedding_dim}")
        except:
            print(f"   Embedding dimension: unknown")
        
        # Test semantic search
        test_queries = [
            'OBOS akademi pris',
            'Hvem er treneren for G15',
            'Når spiller A-laget',
            'Føyka stadion adresse',
            'Asker fotball historie',
            'Sesongkort billetter',
            'Kontakt klubben',
            'Resultater A-laget'
        ]
        
        print(f"\n🔍 Testing semantic search:\n")
        
        results_summary = []
        
        for query in test_queries:
            try:
                results = collection.query(
                    query_texts=[query],
                    n_results=3,
                    include=['metadatas', 'distances']
                )
                
                print(f"Query: \"{query}\"")
                print(f"  Results: {len(results['ids'][0])}")
                
                if results['metadatas'] and results['metadatas'][0]:
                    for idx, meta in enumerate(results['metadatas'][0]):
                        distance = results['distances'][0][idx]
                        print(f"  {idx + 1}. {meta['title']} (distance: {distance:.4f})")
                    
                    # Calculate relevance (lower distance = higher relevance)
                    avg_distance = sum(results['distances'][0]) / len(results['distances'][0])
                    relevance = max(0, 1 - avg_distance)  # Convert distance to similarity
                    
                    results_summary.append({
                        'query': query,
                        'avg_distance': avg_distance,
                        'relevance_score': relevance * 100,
                        'top_result': results['metadatas'][0][0]['title'] if results['metadatas'][0] else None
                    })
                
                print('')
            except Exception as e:
                print(f"  ❌ Error: {e}\n")
        
        # Overall statistics
        print("\n📊 Overall Performance:")
        if results_summary:
            avg_relevance = sum(r['relevance_score'] for r in results_summary) / len(results_summary)
            print(f"  Average relevance: {avg_relevance:.1f}%")
            
            print(f"\n  Best performing queries:")
            best = sorted(results_summary, key=lambda x: x['relevance_score'], reverse=True)[:3]
            for i, r in enumerate(best, 1):
                print(f"    {i}. \"{r['query']}\": {r['relevance_score']:.1f}%")
            
            print(f"\n  Needs improvement:")
            worst = sorted(results_summary, key=lambda x: x['relevance_score'])[:3]
            for i, r in enumerate(worst, 1):
                print(f"    {i}. \"{r['query']}\": {r['relevance_score']:.1f}%")
        
        # Compare with expected chunk count
        print(f"\n📈 Coverage Analysis:")
        print(f"  Expected chunks (from BM25): 203")
        print(f"  Actual embeddings: {count}")
        coverage = (count / 203) * 100 if count > 0 else 0
        print(f"  Coverage: {coverage:.1f}%")
        
        if coverage < 100:
            print(f"  ⚠️  Missing {203 - count} embeddings")
        elif coverage > 100:
            print(f"  ⚠️  {count - 203} extra embeddings (possible duplicates)")
        else:
            print(f"  ✅ Perfect coverage!")
    
    print("\n✅ ChromaDB test completed!")

if __name__ == "__main__":
    try:
        test_chromadb()
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

