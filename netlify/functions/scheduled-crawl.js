/**
 * Netlify Scheduled Function for Automatic Morning News Crawling
 * 
 * This function runs every morning at 06:00 UTC to:
 * 1. Crawl new news articles from askerfotball.no
 * 2. Update allowlist.json with new articles
 * 3. Reindex the search system
 * 4. Log results and send notifications
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const BASE_DIR = path.join(__dirname, '../..');
const LOGS_DIR = path.join(BASE_DIR, 'storage', 'logs');
const SCHEDULED_CRAWL_LOG = path.join(LOGS_DIR, 'scheduled-crawl.jsonl');

/**
 * Ensure logs directory exists
 */
async function ensureLogsDir() {
  try {
    await fs.mkdir(LOGS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create logs directory:', error);
  }
}

/**
 * Log with timestamp
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
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
 * Save log entry to JSONL file
 */
async function saveLogEntry(entry) {
  try {
    await ensureLogsDir();
    const logLine = JSON.stringify(entry) + '\n';
    await fs.appendFile(SCHEDULED_CRAWL_LOG, logLine);
  } catch (error) {
    console.error('Failed to save log entry:', error);
  }
}

/**
 * Run a script and return result
 */
function runScript(scriptPath, description) {
  return new Promise((resolve, reject) => {
    log(`Starting: ${description}`, 'progress');
    
    const child = spawn('node', [scriptPath], {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: BASE_DIR
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        log(`Completed: ${description}`, 'success');
        resolve({ 
          success: true, 
          description, 
          stdout, 
          stderr,
          exitCode: code 
        });
      } else {
        log(`Failed: ${description} (exit code: ${code})`, 'error');
        resolve({ 
          success: false, 
          description, 
          stdout, 
          stderr,
          exitCode: code,
          error: stderr 
        });
      }
    });

    child.on('error', (error) => {
      log(`Error running ${description}: ${error.message}`, 'error');
      resolve({ 
        success: false, 
        description, 
        error: error.message,
        exitCode: -1 
      });
    });
  });
}

/**
 * Check if new articles were found
 */
async function checkForNewArticles() {
  try {
    const crawlResultsPath = path.join(BASE_DIR, 'storage', 'raw', 'news-crawl-results.json');
    const data = await fs.readFile(crawlResultsPath, 'utf8');
    const results = JSON.parse(data);
    
    return {
      totalFound: results.summary?.totalFound || 0,
      totalErrors: results.summary?.totalErrors || 0,
      averageQualityScore: results.summary?.averageQualityScore || 0,
      articles: results.articles || []
    };
  } catch (error) {
    log(`Could not check crawl results: ${error.message}`, 'warning');
    return { totalFound: 0, totalErrors: 0, averageQualityScore: 0, articles: [] };
  }
}

/**
 * Check allowlist statistics
 */
async function checkAllowlistStats() {
  try {
    const allowlistPath = path.join(BASE_DIR, 'config', 'allowlist.json');
    const data = await fs.readFile(allowlistPath, 'utf8');
    const allowlist = JSON.parse(data);
    
    return {
      staticPages: allowlist.static_pages?.length || 0,
      newsArticles: allowlist.news_articles?.length || 0,
      totalUrls: (allowlist.static_pages?.length || 0) + (allowlist.news_articles?.length || 0)
    };
  } catch (error) {
    log(`Could not check allowlist stats: ${error.message}`, 'warning');
    return { staticPages: 0, newsArticles: 0, totalUrls: 0 };
  }
}

/**
 * Main scheduled crawl function
 */
async function scheduledCrawl() {
  const startTime = Date.now();
  const results = [];
  
  try {
    log('🚀 Starting scheduled morning crawl...', 'progress');
    
    // Step 1: Crawl news articles
    const crawlResult = await runScript(
      path.join(BASE_DIR, 'scripts', 'crawl-news-3months.js'),
      'News crawling (3 months)'
    );
    results.push(crawlResult);
    
    if (!crawlResult.success) {
      log('❌ News crawling failed, stopping pipeline', 'error');
      throw new Error('News crawling failed');
    }
    
    // Check crawl results
    const crawlStats = await checkForNewArticles();
    log(`📰 Crawl results: ${crawlStats.totalFound} articles found, ${crawlStats.totalErrors} errors`, 'info');
    
    // Step 2: Update allowlist
    const allowlistResult = await runScript(
      path.join(BASE_DIR, 'scripts', 'update-allowlist-from-crawl.js'),
      'Allowlist update'
    );
    results.push(allowlistResult);
    
    if (!allowlistResult.success) {
      log('⚠️ Allowlist update failed, but continuing with reindexing', 'warning');
    }
    
    // Check allowlist stats
    const allowlistStats = await checkAllowlistStats();
    log(`📋 Allowlist stats: ${allowlistStats.newsArticles} news articles, ${allowlistStats.totalUrls} total URLs`, 'info');
    
    // Step 3: Reindex search system
    const reindexResult = await runScript(
      path.join(BASE_DIR, 'scripts', 'reindex.js'),
      'Search system reindexing'
    );
    results.push(reindexResult);
    
    if (!reindexResult.success) {
      log('❌ Reindexing failed', 'error');
      throw new Error('Reindexing failed');
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Create summary
    const summary = {
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      duration_readable: formatDuration(duration),
      success: results.every(r => r.success),
      steps: results,
      crawlStats,
      allowlistStats,
      summary: {
        total_steps: results.length,
        successful_steps: results.filter(r => r.success).length,
        failed_steps: results.filter(r => !r.success).length,
        new_articles_found: crawlStats.totalFound,
        total_news_articles: allowlistStats.newsArticles
      }
    };
    
    // Save log entry
    await saveLogEntry(summary);
    
    // Final status
    if (summary.success) {
      log('🎉 Scheduled crawl completed successfully!', 'success');
      log(`📊 Summary: ${crawlStats.totalFound} new articles, ${allowlistStats.newsArticles} total articles`, 'success');
      log(`⏱️ Duration: ${formatDuration(duration)}`, 'success');
    } else {
      log(`⚠️ Scheduled crawl completed with ${summary.summary.failed_steps} failed steps`, 'warning');
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: summary.success,
        message: summary.success ? 'Scheduled crawl completed successfully' : 'Scheduled crawl completed with errors',
        summary: summary.summary,
        duration: formatDuration(duration)
      })
    };
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    log(`💥 Scheduled crawl failed: ${error.message}`, 'error');
    
    // Save error log
    const errorSummary = {
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      duration_readable: formatDuration(duration),
      success: false,
      error: error.message,
      steps: results,
      summary: {
        total_steps: results.length,
        successful_steps: results.filter(r => r.success).length,
        failed_steps: results.filter(r => !r.success).length
      }
    };
    
    await saveLogEntry(errorSummary);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        duration: formatDuration(duration)
      })
    };
  }
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
 * Netlify function handler
 */
exports.handler = async (event, context) => {
  // Only allow POST requests (Netlify scheduled functions)
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }
  
  // Check if this is a scheduled trigger
  if (event.headers['x-netlify-scheduled'] !== 'true') {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Access Denied - Only scheduled triggers allowed' })
    };
  }
  
  log('🕕 Scheduled crawl triggered by Netlify', 'info');
  
  try {
    const result = await scheduledCrawl();
    return result;
  } catch (error) {
    log(`💥 Unexpected error in handler: ${error.message}`, 'error');
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
