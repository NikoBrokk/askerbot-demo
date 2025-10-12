const fs = require('fs');
const path = require('path');

// Configuration
const CHUNK_SIZE_MIN = 400;
const CHUNK_SIZE_MAX = 800;
const OVERLAP_SIZE = 80;
const PARSED_DIR = path.join(__dirname, '..', 'storage', 'parsed');
const CHUNKS_DIR = path.join(__dirname, '..', 'storage', 'chunks');

/**
 * Create chunks directory if it doesn't exist
 */
function ensureChunksDir() {
  if (!fs.existsSync(CHUNKS_DIR)) {
    fs.mkdirSync(CHUNKS_DIR, { recursive: true });
  }
}

/**
 * Split text into chunks with overlap
 * @param {string} text - The text to chunk
 * @param {number} minSize - Minimum chunk size
 * @param {number} maxSize - Maximum chunk size
 * @param {number} overlap - Overlap size between chunks
 * @returns {string[]} Array of text chunks
 */
function chunkText(text, minSize = CHUNK_SIZE_MIN, maxSize = CHUNK_SIZE_MAX, overlap = OVERLAP_SIZE) {
  if (!text || text.length <= minSize) {
    return [text];
  }

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    // Determine chunk end position
    let end = Math.min(start + maxSize, text.length);
    
    // If this isn't the last chunk, try to break at a word boundary
    if (end < text.length) {
      // Look for a good break point (space, newline, or punctuation) within the last 100 characters
      const searchStart = Math.max(start + minSize, end - 100);
      for (let i = end - 1; i >= searchStart; i--) {
        if (/\s/.test(text[i]) || /[.!?]/.test(text[i])) {
          end = i + 1;
          break;
        }
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length >= minSize || chunks.length === 0) {
      chunks.push(chunk);
    }

    // Move start position with overlap
    start = Math.max(start + 1, end - overlap);
    
    // Prevent infinite loop
    if (start >= text.length) break;
  }

  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Extract slug from filename
 * @param {string} filename - The JSON filename
 * @returns {string} The slug
 */
function getSlug(filename) {
  return path.basename(filename, '.json');
}

/**
 * Process a single JSON file and create chunks
 * @param {string} filePath - Path to the JSON file
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    const slug = getSlug(filePath);
    const chunks = chunkText(data.content);
    
    console.log(`Processing ${slug}: ${chunks.length} chunks from ${data.content.length} characters`);
    
    // Create chunks array with metadata
    const chunkData = chunks.map((chunkContent, idx) => ({
      title: data.title,
      url: data.url,
      breadcrumbs: data.breadcrumbs,
      chunk_id: `${slug}_chunk_${idx}`,
      idx: idx,
      content: chunkContent,
      total_chunks: chunks.length,
      original_word_count: data.word_count,
      chunk_word_count: chunkContent.split(/\s+/).length
    }));
    
    // Write to JSONL file
    const outputPath = path.join(CHUNKS_DIR, `${slug}.jsonl`);
    const jsonlContent = chunkData.map(chunk => JSON.stringify(chunk)).join('\n');
    fs.writeFileSync(outputPath, jsonlContent, 'utf8');
    
    console.log(`✓ Created ${outputPath} with ${chunks.length} chunks`);
    
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

/**
 * Main function to process all JSON files
 */
function main() {
  console.log('Starting chunking process...');
  
  // Ensure chunks directory exists
  ensureChunksDir();
  
  // Get all JSON files from parsed directory
  if (!fs.existsSync(PARSED_DIR)) {
    console.error(`Parsed directory not found: ${PARSED_DIR}`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(PARSED_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(PARSED_DIR, file));
  
  if (files.length === 0) {
    console.log('No JSON files found in parsed directory');
    return;
  }
  
  console.log(`Found ${files.length} JSON files to process`);
  
  // Process each file
  files.forEach(processFile);
  
  console.log('\nChunking process completed!');
  console.log(`Chunks saved to: ${CHUNKS_DIR}`);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  chunkText,
  processFile,
  main
};
