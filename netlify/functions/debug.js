/**
 * Debug function to test Netlify environment
 */

const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      cwd: process.cwd(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        NETLIFY: process.env.NETLIFY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT_SET'
      }
    };

    // Test file access
    const storagePath = path.join(__dirname, '..', '..', 'storage');
    const metadataPath = path.join(storagePath, 'index', 'bm25', 'chunk-metadata.json');
    
    debugInfo.storageTests = {
      storagePath,
      metadataPath,
      storageExists: fs.existsSync(storagePath),
      metadataExists: fs.existsSync(metadataPath),
      storageContents: fs.existsSync(storagePath) ? fs.readdirSync(storagePath) : 'NOT_FOUND'
    };

    // Test if we can read metadata
    if (fs.existsSync(metadataPath)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        debugInfo.metadataInfo = {
          keys: Object.keys(metadata).length,
          firstKey: Object.keys(metadata)[0],
          sampleEntry: Object.keys(metadata)[0] ? metadata[Object.keys(metadata)[0]] : null
        };
      } catch (error) {
        debugInfo.metadataError = error.message;
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(debugInfo, null, 2)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
    };
  }
};
