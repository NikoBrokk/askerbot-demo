#!/bin/bash

# ChromaDB Service Startup Script
# This script starts the ChromaDB search service

echo "🚀 Starting ChromaDB Search Service..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "chromadb_service.py" ]; then
    echo "❌ Please run this script from the services directory"
    exit 1
fi

# Check if requirements are installed
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install requirements
echo "📦 Installing requirements..."
pip install -r requirements.txt

# Check if ChromaDB collection exists and has data
echo "🔍 Checking ChromaDB collection..."
python3 -c "
from chromadb_service import get_chromadb_service
try:
    service = get_chromadb_service()
    stats = service.get_collection_stats()
    if 'error' in stats:
        print('⚠️  Collection error:', stats['error'])
    else:
        print(f'✅ Collection ready with {stats.get(\"total_chunks\", 0)} chunks')
except Exception as e:
    print(f'⚠️  Collection check failed: {e}')
"

# Start the API server
echo "🌐 Starting API server on http://localhost:5000"
echo "📡 Health check: http://localhost:5000/health"
echo "📊 Stats: http://localhost:5000/stats"
echo ""
echo "Press Ctrl+C to stop the service"
echo ""

python3 chromadb_api.py
