#!/usr/bin/env python3
"""
ChromaDB API Server
Simple HTTP API wrapper for ChromaDB search service
"""

import json
import logging
from typing import Dict, Any, Optional
from flask import Flask, request, jsonify
from flask_cors import CORS

from chromadb_service import get_chromadb_service, health_check

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    try:
        health_status = health_check()
        status_code = 200 if health_status['status'] == 'healthy' else 503
        return jsonify(health_status), status_code
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503

@app.route('/search', methods=['POST'])
def search():
    """Search endpoint"""
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({
                'error': 'Query is required',
                'message': 'Please provide a query in the request body'
            }), 400
        
        query = data['query']
        max_results = data.get('max_results', 5)
        filter_metadata = data.get('filter_metadata')
        
        if not isinstance(query, str) or not query.strip():
            return jsonify({
                'error': 'Invalid query',
                'message': 'Query must be a non-empty string'
            }), 400
        
        if not isinstance(max_results, int) or max_results < 1 or max_results > 50:
            return jsonify({
                'error': 'Invalid max_results',
                'message': 'max_results must be an integer between 1 and 50'
            }), 400
        
        # Perform search
        service = get_chromadb_service()
        results = service.search(
            query=query,
            max_results=max_results,
            filter_metadata=filter_metadata
        )
        
        return jsonify({
            'query': query,
            'results': results,
            'total_found': len(results)
        }), 200
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        return jsonify({
            'error': 'Search failed',
            'message': str(e)
        }), 500

@app.route('/stats', methods=['GET'])
def stats():
    """Get collection statistics"""
    try:
        service = get_chromadb_service()
        stats = service.get_collection_stats()
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({
            'error': 'Failed to get stats',
            'message': str(e)
        }), 500

@app.route('/', methods=['GET'])
def root():
    """Root endpoint with API information"""
    return jsonify({
        'service': 'ChromaDB Search API',
        'version': '1.0.0',
        'endpoints': {
            'GET /': 'API information',
            'GET /health': 'Health check',
            'GET /stats': 'Collection statistics',
            'POST /search': 'Semantic search'
        },
        'search_example': {
            'method': 'POST',
            'url': '/search',
            'body': {
                'query': 'asker fotball spillere',
                'max_results': 5,
                'filter_metadata': {'chunk_type': 'player_list'}
            }
        }
    }), 200

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'error': 'Not found',
        'message': 'The requested endpoint does not exist'
    }), 404

@app.errorhandler(405)
def method_not_allowed(error):
    """Handle 405 errors"""
    return jsonify({
        'error': 'Method not allowed',
        'message': 'The requested method is not allowed for this endpoint'
    }), 405

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({
        'error': 'Internal server error',
        'message': 'An unexpected error occurred'
    }), 500

if __name__ == '__main__':
    # Run the development server
    print("🚀 Starting ChromaDB Search API...")
    print("📡 API will be available at: http://localhost:5001")
    print("🔍 Health check: http://localhost:5001/health")
    print("📊 Stats: http://localhost:5001/stats")
    
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=True
    )
