#!/usr/bin/env node

/**
 * Test Script for Scheduled Crawl Function
 * 
 * This script tests the scheduled crawl functionality locally
 * to ensure everything works before deploying to Netlify
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const BASE_DIR = path.join(__dirname, '..');
const LOGS_DIR = path.join(BASE_DIR, 'storage', 'logs');

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
 * Test the scheduled crawl pipeline
 */
async function testScheduledCrawl() {
  const startTime = Date.now();
  const results = [];
  
  try {
    log('🧪 Testing scheduled crawl pipeline...', 'progress');
    
    // Ensure logs directory exists
    await ensureLogsDir();
    
    // Get initial stats
    const initialStats = await checkAllowlistStats();
    log(`📊 Initial allowlist: ${initialStats.newsArticles} news articles, ${initialStats.totalUrls} total URLs`, 'info');
    
    // Step 1: Crawl news articles
    const crawlResult = await runScript(
      path.join(BASE_DIR, 'scripts', 'crawl-news-3months.js'),
      'News crawling (3 months)'
    );
    results.push(crawlResult);
    
    if (!crawlResult.success) {
      log('❌ News crawling failed, stopping test', 'error');
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
    
    // Check updated allowlist stats
    const updatedStats = await checkAllowlistStats();
    const newArticles = updatedStats.newsArticles - initialStats.newsArticles;
    log(`📋 Updated allowlist: ${updatedStats.newsArticles} news articles (+${newArticles}), ${updatedStats.totalUrls} total URLs`, 'info');
    
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
    
    // Create test summary
    const summary = {
      timestamp: new Date().toISOString(),
      test_type: 'scheduled_crawl_test',
      duration_ms: duration,
      duration_readable: formatDuration(duration),
      success: results.every(r => r.success),
      steps: results,
      initialStats,
      updatedStats,
      crawlStats,
      summary: {
        total_steps: results.length,
        successful_steps: results.filter(r => r.success).length,
        failed_steps: results.filter(r => !r.success).length,
        new_articles_found: crawlStats.totalFound,
        new_articles_added: newArticles,
        total_news_articles: updatedStats.newsArticles
      }
    };
    
    // Save test log
    const testLogPath = path.join(LOGS_DIR, 'scheduled-crawl-test.json');
    await fs.writeFile(testLogPath, JSON.stringify(summary, null, 2));
    log(`📝 Test log saved: ${testLogPath}`, 'info');
    
    // Final status
    if (summary.success) {
      log('🎉 Scheduled crawl test completed successfully!', 'success');
      log(`📊 Summary: ${crawlStats.totalFound} articles found, ${newArticles} added to allowlist`, 'success');
      log(`⏱️ Duration: ${formatDuration(duration)}`, 'success');
    } else {
      log(`⚠️ Scheduled crawl test completed with ${summary.summary.failed_steps} failed steps`, 'warning');
    }
    
    // Show detailed results
    log('\n📋 Test Results:', 'info');
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      log(`  ${index + 1}. ${result.description}: ${status}`, result.success ? 'success' : 'error');
      if (!result.success && result.error) {
        log(`     Error: ${result.error}`, 'error');
      }
    });
    
    return summary;
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    log(`💥 Scheduled crawl test failed: ${error.message}`, 'error');
    
    // Save error log
    const errorSummary = {
      timestamp: new Date().toISOString(),
      test_type: 'scheduled_crawl_test',
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
    
    const testLogPath = path.join(LOGS_DIR, 'scheduled-crawl-test-error.json');
    await fs.writeFile(testLogPath, JSON.stringify(errorSummary, null, 2));
    log(`📝 Error log saved: ${testLogPath}`, 'error');
    
    throw error;
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
 * Main test function
 */
async function runTest() {
  try {
    log('🚀 Starting scheduled crawl test...', 'progress');
    log('This will test the complete pipeline: crawl → allowlist → reindex', 'info');
    
    const result = await testScheduledCrawl();
    
    if (result.success) {
      log('\n🎉 All tests passed! The scheduled crawl system is ready for deployment.', 'success');
      log('📋 Next steps:', 'info');
      log('  1. Deploy to Netlify', 'info');
      log('  2. Verify scheduled function is active', 'info');
      log('  3. Monitor logs for daily runs', 'info');
    } else {
      log('\n❌ Some tests failed. Please check the logs and fix issues before deployment.', 'error');
      process.exit(1);
    }
    
  } catch (error) {
    log(`💥 Test failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runTest();
}

module.exports = {
  testScheduledCrawl,
  runTest
};
