#!/usr/bin/env node

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8888;

// Middleware
app.use(express.json());
app.use(express.static('.'));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Mock Netlify Functions endpoint for chat
app.post('/.netlify/functions/chat', async (req, res) => {
  try {
    // Read the actual chat function
    const chatFunctionPath = path.join(__dirname, 'netlify', 'functions', 'chat.js');
    
    if (fs.existsSync(chatFunctionPath)) {
      // Import and run the function
      delete require.cache[require.resolve(chatFunctionPath)];
      const chatHandler = require(chatFunctionPath);
      
      // Mock the event and context
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify(req.body),
        headers: req.headers
      };
      
      const context = {};
      
      const result = await chatHandler.handler(event, context);
      
      res.status(result.statusCode || 200);
      res.json(JSON.parse(result.body));
    } else {
      res.status(500).json({ error: 'Chat function not found' });
    }
  } catch (error) {
    console.error('Chat function error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Express server running at http://localhost:${PORT}/`);
  console.log('📁 Serving static files from:', __dirname);
  console.log('🔧 CORS enabled for all origins');
  console.log('🤖 Chat function available at /.netlify/functions/chat');
  console.log('⏹️  Press Ctrl+C to stop');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  process.exit(0);
});
