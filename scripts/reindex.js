const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const SCRIPTS_DIR = path.join(__dirname);
const STORAGE_DIR = path.join(__dirname, '..', 'storage');

// Pipeline steps configuration
const PIPELINE_STEPS = [
  {
    name: 'Fetch',
    command: 'node',
    args: [path.join(SCRIPTS_DIR, 'fetch.js')],
    description: 'Fetching HTML from askerfotball.no',
    outputDir: path.join(STORAGE_DIR, 'raw'),
    checkFile: (dir) => fs.existsSync(dir) && fs.readdirSync(dir).length > 0
  },
  {
    name: 'Parse',
    command: 'node',
    args: [path.join(SCRIPTS_DIR, 'parse.js')],
    description: 'Parsing HTML to structured JSON',
    outputDir: path.join(STORAGE_DIR, 'parsed'),
    checkFile: (dir) => fs.existsSync(dir) && fs.readdirSync(dir).filter(f => f.endsWith('.json')).length > 0
  },
  {
    name: 'Chunk',
    command: 'node',
    args: [path.join(SCRIPTS_DIR, 'chunk.js')],
    description: 'Creating text chunks for RAG',
    outputDir: path.join(STORAGE_DIR, 'chunks'),
    checkFile: (dir) => fs.existsSync(dir) && fs.readdirSync(dir).filter(f => f.endsWith('.jsonl')).length > 0
  },
  {
    name: 'Embed',
    command: 'python',
    args: [path.join(SCRIPTS_DIR, 'embed.py')],
    description: 'Generating embeddings with ChromaDB',
    outputDir: path.join(STORAGE_DIR, 'index', 'chroma'),
    checkFile: (dir) => fs.existsSync(dir) && fs.existsSync(path.join(dir, 'chroma.sqlite3'))
  },
  {
    name: 'BM25',
    command: 'node',
    args: [path.join(SCRIPTS_DIR, 'build-bm25.js')],
    description: 'Building BM25 search index',
    outputDir: path.join(STORAGE_DIR, 'index', 'bm25'),
    checkFile: (dir) => fs.existsSync(dir) && fs.existsSync(path.join(dir, 'bm25-index.json'))
  }
];

/**
 * Log with timestamp
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString().substr(11, 8);
  const prefix = {
    info: 'ℹ️ ',
    success: '✅',
    error: '❌',
    warning: '⚠️ ',
    progress: '🔄'
  }[type] || '📝';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

/**
 * Ensure storage directories exist
 */
function ensureStorageDirs() {
  const dirs = [
    STORAGE_DIR,
    path.join(STORAGE_DIR, 'raw'),
    path.join(STORAGE_DIR, 'parsed'),
    path.join(STORAGE_DIR, 'chunks'),
    path.join(STORAGE_DIR, 'logs'),
    path.join(STORAGE_DIR, 'index'),
    path.join(STORAGE_DIR, 'index', 'chroma'),
    path.join(STORAGE_DIR, 'index', 'bm25')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Run a single pipeline step
 */
function runStep(step, stepIndex, totalSteps) {
  return new Promise((resolve, reject) => {
    const stepNumber = stepIndex + 1;
    log(`Starting step ${stepNumber}/${totalSteps}: ${step.description}`, 'progress');
    
    const child = spawn(step.command, step.args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: path.join(__dirname, '..')
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      // Log progress indicators
      if (output.includes('Processing') || output.includes('Found') || output.includes('Added')) {
        log(`  ${output.trim()}`, 'info');
      }
    });

    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      // Only log warnings and errors, not debug info
      if (output.includes('warning') || output.includes('error') || output.includes('Error')) {
        log(`  ${output.trim()}`, 'warning');
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        // Verify the step produced expected output
        if (step.checkFile(step.outputDir)) {
          log(`Step ${stepNumber}/${totalSteps} completed: ${step.name}`, 'success');
          resolve({ success: true, step: step.name, stdout, stderr });
        } else {
          const errorMsg = `Step ${stepNumber}/${totalSteps} failed: ${step.name} - No expected output files created`;
          log(errorMsg, 'error');
          reject(new Error(errorMsg));
        }
      } else {
        const errorMsg = `Step ${stepNumber}/${totalSteps} failed: ${step.name} - Exit code ${code}`;
        log(errorMsg, 'error');
        if (stderr) {
          log(`Error details: ${stderr.trim()}`, 'error');
        }
        reject(new Error(errorMsg));
      }
    });

    child.on('error', (error) => {
      const errorMsg = `Step ${stepNumber}/${totalSteps} failed: ${step.name} - ${error.message}`;
      log(errorMsg, 'error');
      reject(new Error(errorMsg));
    });
  });
}

/**
 * Clean old index files before reindexing
 */
function cleanOldIndexes() {
  log('Cleaning old indexes...', 'progress');
  
  const dirsToClean = [
    path.join(STORAGE_DIR, 'index', 'chroma'),
    path.join(STORAGE_DIR, 'index', 'bm25')
  ];

  dirsToClean.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
            log(`  Removed: ${file}`, 'info');
          }
        });
      } catch (error) {
        log(`Warning: Could not clean ${dir}: ${error.message}`, 'warning');
      }
    }
  });
}

/**
 * Save reindexing log
 */
function saveReindexLog(results, startTime, endTime) {
  const logData = {
    timestamp: new Date().toISOString(),
    duration_ms: endTime - startTime,
    duration_readable: formatDuration(endTime - startTime),
    steps: results,
    success: results.every(r => r.success),
    summary: {
      total_steps: results.length,
      successful_steps: results.filter(r => r.success).length,
      failed_steps: results.filter(r => !r.success).length
    }
  };

  const logFile = path.join(STORAGE_DIR, 'logs', `reindex-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
  log(`Reindex log saved: ${logFile}`, 'info');
}

/**
 * Format duration in human readable format
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}

/**
 * Main reindexing function
 */
async function reindex() {
  const startTime = Date.now();
  const results = [];
  
  try {
    log('🚀 Starting complete reindexing pipeline...', 'progress');
    log(`Pipeline: ${PIPELINE_STEPS.map(s => s.name).join(' → ')}`, 'info');
    
    // Ensure directories exist
    ensureStorageDirs();
    
    // Clean old indexes
    cleanOldIndexes();
    
    // Run each step in sequence
    for (let i = 0; i < PIPELINE_STEPS.length; i++) {
      const step = PIPELINE_STEPS[i];
      
      try {
        const result = await runStep(step, i, PIPELINE_STEPS.length);
        results.push(result);
        
        // Add a small delay between steps for better readability
        if (i < PIPELINE_STEPS.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        results.push({ 
          success: false, 
          step: step.name, 
          error: error.message 
        });
        
        log(`Pipeline failed at step: ${step.name}`, 'error');
        log(`Error: ${error.message}`, 'error');
        
        // Stop pipeline on first failure
        break;
      }
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Save log
    saveReindexLog(results, startTime, endTime);
    
    // Summary
    const successfulSteps = results.filter(r => r.success).length;
    const totalSteps = results.length;
    
    if (successfulSteps === totalSteps) {
      log('🎉 Complete reindexing pipeline finished successfully!', 'success');
      log(`📊 All ${totalSteps} steps completed in ${formatDuration(duration)}`, 'success');
      log(`📁 Indexes updated: ChromaDB + BM25`, 'success');
    } else {
      log(`⚠️  Pipeline completed with ${totalSteps - successfulSteps} failed steps`, 'warning');
      log(`✅ ${successfulSteps}/${totalSteps} steps successful in ${formatDuration(duration)}`, 'warning');
    }
    
    // Show final status
    log('\n📋 Final Status:', 'info');
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      log(`  ${index + 1}. ${result.step}: ${status}`, result.success ? 'success' : 'error');
    });
    
  } catch (error) {
    log(`❌ Fatal error during reindexing: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  reindex().catch(error => {
    log(`❌ Reindexing failed: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = {
  reindex,
  runStep,
  PIPELINE_STEPS
};
