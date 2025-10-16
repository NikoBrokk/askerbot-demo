const fs = require('fs');
const path = require('path');

// Configuration - Forbedret chunking med større chunks og semantiske breakpoints
const CHUNK_SIZE_MIN = 1000;
const CHUNK_SIZE_MAX = 1500;
const OVERLAP_SIZE = 150;
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
 * Smart chunking med semantiske breakpoints
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

  // Del opp tekst i semantiske seksjoner først
  const sections = splitIntoSemanticSections(text);
  const chunks = [];

  for (const section of sections) {
    if (section.length <= maxSize) {
      // Seksjonen er liten nok til å være en chunk
      chunks.push(section);
    } else {
      // Seksjonen er for stor, del den opp videre
      const subChunks = splitLargeSection(section, minSize, maxSize, overlap);
      chunks.push(...subChunks);
    }
  }

  // Legg til overlap mellom chunks
  return addOverlapBetweenChunks(chunks, overlap);
}

/**
 * Del opp tekst i semantiske seksjoner basert på strukturelle elementer
 */
function splitIntoSemanticSections(text) {
  const sections = [];
  let currentSection = '';
  
  // Del opp basert på headings (hovedbreakpoints)
  const headingSplit = text.split(/(?=^#+\s)/m);
  
  for (let i = 0; i < headingSplit.length; i++) {
    const part = headingSplit[i].trim();
    if (!part) continue;
    
    if (i === 0 && !part.startsWith('#')) {
      // Første del uten heading - legg til i currentSection
      currentSection += part;
    } else {
      // Ny seksjon med heading
      if (currentSection) {
        sections.push(currentSection.trim());
        currentSection = '';
      }
      currentSection = part;
    }
  }
  
  if (currentSection) {
    sections.push(currentSection.trim());
  }
  
  // Hvis ingen headings funnet, del opp basert på andre breakpoints
  if (sections.length === 1) {
    return splitByOtherBreakpoints(text);
  }
  
  return sections.filter(section => section.length > 0);
}

/**
 * Del opp tekst basert på andre semantiske breakpoints
 */
function splitByOtherBreakpoints(text) {
  const sections = [];
  let currentSection = '';
  
  // Del opp basert på doble linjeskift (paragraf-breakpoints)
  const paragraphSplit = text.split(/\n\s*\n/);
  
  for (const paragraph of paragraphSplit) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    
    // Hvis paragrafen er for stor, del den opp videre
    if (trimmed.length > CHUNK_SIZE_MAX) {
      if (currentSection) {
        sections.push(currentSection.trim());
        currentSection = '';
      }
      
      // Del opp store paragrafer basert på setninger
      const sentenceChunks = splitBySentences(trimmed);
      sections.push(...sentenceChunks);
    } else {
      currentSection += (currentSection ? '\n\n' : '') + trimmed;
      
      // Hvis vi har nok innhold, start ny seksjon
      if (currentSection.length > CHUNK_SIZE_MAX) {
        sections.push(currentSection.trim());
        currentSection = '';
      }
    }
  }
  
  if (currentSection) {
    sections.push(currentSection.trim());
  }
  
  return sections.filter(section => section.length > 0);
}

/**
 * Del opp tekst basert på setninger
 */
function splitBySentences(text) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    
    if (currentChunk.length + trimmed.length + 1 > CHUNK_SIZE_MAX) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
    }
    
    currentChunk += (currentChunk ? ' ' : '') + trimmed;
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Del opp store seksjoner i mindre chunks
 */
function splitLargeSection(section, minSize, maxSize, overlap) {
  const chunks = [];
  let start = 0;
  
  while (start < section.length) {
    let end = Math.min(start + maxSize, section.length);
    
    // Prøv å finne et bra breakpoint
    if (end < section.length) {
      end = findBestBreakpoint(section, start + minSize, end);
    }
    
    const chunk = section.slice(start, end).trim();
    if (chunk.length >= minSize || chunks.length === 0) {
      chunks.push(chunk);
    }
    
    // Flytt start posisjon
    start = Math.max(start + 1, end - overlap);
    
    if (start >= section.length) break;
  }
  
  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Finn beste breakpoint innenfor gitt område
 */
function findBestBreakpoint(text, minPos, maxPos) {
  // Prioriterte breakpoints (i prioritert rekkefølge)
  const breakpoints = [
    // Setningsslutt
    { pattern: /[.!?]\s+/, priority: 1 },
    // Paragraf-break
    { pattern: /\n\s*\n/, priority: 2 },
    // Komma eller semikolon
    { pattern: /[;,]\s+/, priority: 3 },
    // Ordgrense
    { pattern: /\s+/, priority: 4 }
  ];
  
  for (const breakpoint of breakpoints) {
    // Søk bakover fra maxPos til minPos
    for (let i = maxPos - 1; i >= minPos; i--) {
      const char = text[i];
      if (breakpoint.pattern.test(char)) {
        return i + 1;
      }
    }
  }
  
  // Fallback: bruk maxPos
  return maxPos;
}

/**
 * Legg til overlap mellom chunks
 */
function addOverlapBetweenChunks(chunks, overlapSize) {
  if (chunks.length <= 1) return chunks;
  
  const result = [chunks[0]]; // Første chunk uten overlap
  
  for (let i = 1; i < chunks.length; i++) {
    const currentChunk = chunks[i];
    const previousChunk = chunks[i - 1];
    
    // Finn overlap fra forrige chunk
    const overlapText = previousChunk.slice(-overlapSize);
    
    // Legg til overlap i starten av current chunk hvis det gir mening
    if (overlapText.length > 50 && !currentChunk.startsWith(overlapText)) {
      result.push(overlapText + '\n\n' + currentChunk);
    } else {
      result.push(currentChunk);
    }
  }
  
  return result;
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
    
    // Create chunks array with enhanced metadata
    const chunkData = chunks.map((chunkContent, idx) => {
      const wordCount = chunkContent.split(/\s+/).length;
      const charCount = chunkContent.length;
      
      // Ekstraher første heading fra chunk for bedre kontekst
      const firstHeading = chunkContent.match(/^#+\s+(.+)$/m);
      const heading = firstHeading ? firstHeading[1].trim() : null;
      
      // Beregn chunk-kvalitet
      const quality = assessChunkQuality(chunkContent);
      
      return {
        title: data.title,
        url: data.url,
        breadcrumbs: data.breadcrumbs,
        chunk_id: `${slug}_chunk_${idx}`,
        idx: idx,
        content: chunkContent,
        total_chunks: chunks.length,
        original_word_count: data.word_count,
        chunk_word_count: wordCount,
        chunk_char_count: charCount,
        heading: heading,
        quality_score: quality.score,
        quality_issues: quality.issues,
        chunk_type: determineChunkType(chunkContent),
        created_at: new Date().toISOString()
      };
    });
    
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
 * Assess chunk quality
 */
function assessChunkQuality(content) {
  let score = 0;
  const issues = [];
  
  // Bonus for length
  const wordCount = content.split(/\s+/).length;
  if (wordCount >= 50) score += 20;
  else if (wordCount >= 20) score += 10;
  else issues.push('Very short content');
  
  // Bonus for structure
  const headings = (content.match(/^#+\s/gm) || []).length;
  score += headings * 5;
  
  const paragraphs = (content.match(/\n\s*\n/g) || []).length;
  score += paragraphs * 2;
  
  const lists = (content.match(/^•\s/gm) || []).length;
  score += lists * 3;
  
  // Penalty for navigation content
  const navKeywords = ['meny', 'navigasjon', 'søk', 'profil', 'innlogging', 'cookie'];
  const navCount = navKeywords.filter(keyword => 
    content.toLowerCase().includes(keyword)
  ).length;
  
  if (navCount > 2) {
    score -= 15;
    issues.push('Contains navigation content');
  }
  
  // Bonus for Norwegian football content
  const footballKeywords = ['asker', 'fotball', 'klubb', 'lag', 'spillere', 'kamp', 'resultat'];
  const footballCount = footballKeywords.filter(keyword => 
    content.toLowerCase().includes(keyword)
  ).length;
  
  score += footballCount * 2;
  
  // Penalty for repetitive content
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  const uniqueLines = new Set(lines);
  
  if (lines.length > 0 && uniqueLines.size / lines.length < 0.6) {
    score -= 10;
    issues.push('Repetitive content');
  }
  
  return { score: Math.max(0, score), issues };
}

/**
 * Determine chunk type based on content
 */
function determineChunkType(content) {
  const lowerContent = content.toLowerCase();
  
  // Check for specific content types
  if (lowerContent.includes('spillere') && lowerContent.includes('nummer')) {
    return 'player_list';
  }
  
  if (lowerContent.includes('kamp') && (lowerContent.includes('resultat') || lowerContent.includes('dato'))) {
    return 'match_info';
  }
  
  if (lowerContent.includes('nyheter') || lowerContent.includes('artikkel')) {
    return 'news';
  }
  
  if (lowerContent.includes('terminliste') || lowerContent.includes('kalender')) {
    return 'schedule';
  }
  
  if (lowerContent.includes('stadion') || lowerContent.includes('føyka')) {
    return 'stadium_info';
  }
  
  if (lowerContent.includes('om klubben') || lowerContent.includes('historie')) {
    return 'club_info';
  }
  
  if (content.match(/^#+\s/gm)) {
    return 'structured_content';
  }
  
  if (content.match(/^•\s/gm)) {
    return 'list_content';
  }
  
  return 'general_content';
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
