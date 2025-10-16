#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Data Quality Report Generator
 * Analyzes parsed content and chunks for quality issues
 */

const PARSED_DIR = path.join(__dirname, '..', 'storage', 'parsed');
const CHUNKS_DIR = path.join(__dirname, '..', 'storage', 'chunks');

class QualityReporter {
  constructor() {
    this.issues = [];
    this.stats = {
      totalFiles: 0,
      totalChunks: 0,
      qualityIssues: 0,
      parseErrors: 0,
      lowQualityChunks: 0,
      navigationContent: 0
    };
  }

  /**
   * Analyze parsed files for quality issues
   */
  analyzeParsedFiles() {
    console.log('📊 Analyzing parsed files...');
    
    if (!fs.existsSync(PARSED_DIR)) {
      this.issues.push({
        type: 'critical',
        message: 'Parsed directory not found',
        file: PARSED_DIR
      });
      return;
    }

    const files = fs.readdirSync(PARSED_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => path.join(PARSED_DIR, file));

    this.stats.totalFiles = files.length;

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        this.analyzeParsedFile(data, filePath);
      } catch (error) {
        this.issues.push({
          type: 'error',
          message: `Failed to read file: ${error.message}`,
          file: filePath
        });
      }
    }
  }

  /**
   * Analyze individual parsed file
   */
  analyzeParsedFile(data, filePath) {
    const filename = path.basename(filePath);
    
    // Check for parse errors
    if (data.title === 'Parse Error') {
      this.stats.parseErrors++;
      this.issues.push({
        type: 'warning',
        message: 'Parse error detected',
        file: filename,
        details: data.meta?.error || 'Unknown error'
      });
    }

    // Check content quality
    if (!data.content || data.content.length < 100) {
      this.issues.push({
        type: 'warning',
        message: 'Very short content',
        file: filename,
        details: `Content length: ${data.content?.length || 0} characters`
      });
    }

    // Check for navigation content
    const navKeywords = ['meny', 'navigasjon', 'søk', 'profil', 'innlogging', 'cookie'];
    const navCount = navKeywords.filter(keyword => 
      data.content?.toLowerCase().includes(keyword)
    ).length;
    
    if (navCount > 3) {
      this.stats.navigationContent++;
      this.issues.push({
        type: 'warning',
        message: 'Contains navigation content',
        file: filename,
        details: `Found ${navCount} navigation keywords`
      });
    }

    // Check for repetitive content
    if (data.content) {
      const lines = data.content.split('\n').filter(line => line.trim().length > 0);
      const uniqueLines = new Set(lines);
      
      if (lines.length > 0 && uniqueLines.size / lines.length < 0.5) {
        this.issues.push({
          type: 'warning',
          message: 'Repetitive content detected',
          file: filename,
          details: `Unique lines: ${uniqueLines.size}/${lines.length} (${Math.round(uniqueLines.size / lines.length * 100)}%)`
        });
      }
    }

    // Check for missing metadata
    if (!data.breadcrumbs || data.breadcrumbs.length === 0) {
      this.issues.push({
        type: 'info',
        message: 'No breadcrumbs found',
        file: filename
      });
    }

    if (!data.published_at) {
      this.issues.push({
        type: 'info',
        message: 'No publication date found',
        file: filename
      });
    }
  }

  /**
   * Analyze chunks for quality issues
   */
  analyzeChunks() {
    console.log('📊 Analyzing chunks...');
    
    if (!fs.existsSync(CHUNKS_DIR)) {
      this.issues.push({
        type: 'critical',
        message: 'Chunks directory not found',
        file: CHUNKS_DIR
      });
      return;
    }

    const files = fs.readdirSync(CHUNKS_DIR)
      .filter(file => file.endsWith('.jsonl'))
      .map(file => path.join(CHUNKS_DIR, file));

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        this.stats.totalChunks += lines.length;
        
        for (const line of lines) {
          try {
            const chunk = JSON.parse(line);
            this.analyzeChunk(chunk, path.basename(filePath));
          } catch (error) {
            this.issues.push({
              type: 'error',
              message: `Failed to parse chunk: ${error.message}`,
              file: path.basename(filePath)
            });
          }
        }
      } catch (error) {
        this.issues.push({
          type: 'error',
          message: `Failed to read chunks file: ${error.message}`,
          file: path.basename(filePath)
        });
      }
    }
  }

  /**
   * Analyze individual chunk
   */
  analyzeChunk(chunk, filename) {
    // Check chunk quality score
    if (chunk.quality_score !== undefined && chunk.quality_score < 20) {
      this.stats.lowQualityChunks++;
      this.issues.push({
        type: 'warning',
        message: 'Low quality chunk',
        file: filename,
        chunk_id: chunk.chunk_id,
        details: `Quality score: ${chunk.quality_score}, Issues: ${chunk.quality_issues?.join(', ') || 'Unknown'}`
      });
    }

    // Check chunk size
    if (chunk.chunk_char_count < 200) {
      this.issues.push({
        type: 'warning',
        message: 'Very small chunk',
        file: filename,
        chunk_id: chunk.chunk_id,
        details: `Size: ${chunk.chunk_char_count} characters`
      });
    }

    if (chunk.chunk_char_count > 2000) {
      this.issues.push({
        type: 'info',
        message: 'Large chunk',
        file: filename,
        chunk_id: chunk.chunk_id,
        details: `Size: ${chunk.chunk_char_count} characters`
      });
    }

    // Check for empty content
    if (!chunk.content || chunk.content.trim().length === 0) {
      this.issues.push({
        type: 'error',
        message: 'Empty chunk content',
        file: filename,
        chunk_id: chunk.chunk_id
      });
    }
  }

  /**
   * Generate quality report
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 DATA QUALITY REPORT');
    console.log('='.repeat(60));
    
    // Overall statistics
    console.log('\n📊 OVERALL STATISTICS:');
    console.log(`  Total parsed files: ${this.stats.totalFiles}`);
    console.log(`  Total chunks: ${this.stats.totalChunks}`);
    console.log(`  Parse errors: ${this.stats.parseErrors}`);
    console.log(`  Low quality chunks: ${this.stats.lowQualityChunks}`);
    console.log(`  Files with navigation content: ${this.stats.navigationContent}`);
    
    // Quality score
    const qualityScore = this.calculateQualityScore();
    console.log(`\n🎯 OVERALL QUALITY SCORE: ${qualityScore}/100`);
    
    // Issues by type
    const issuesByType = this.groupIssuesByType();
    console.log('\n⚠️  ISSUES BY TYPE:');
    for (const [type, count] of Object.entries(issuesByType)) {
      const emoji = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`  ${emoji} ${type.toUpperCase()}: ${count}`);
    }
    
    // Detailed issues
    if (this.issues.length > 0) {
      console.log('\n📝 DETAILED ISSUES:');
      this.issues.forEach((issue, index) => {
        const emoji = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`\n  ${index + 1}. ${emoji} ${issue.message}`);
        console.log(`     File: ${issue.file}`);
        if (issue.chunk_id) {
          console.log(`     Chunk: ${issue.chunk_id}`);
        }
        if (issue.details) {
          console.log(`     Details: ${issue.details}`);
        }
      });
    }
    
    // Recommendations
    this.generateRecommendations();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Quality report completed');
    console.log('='.repeat(60));
  }

  /**
   * Calculate overall quality score
   */
  calculateQualityScore() {
    let score = 100;
    
    // Deduct points for issues
    score -= this.stats.parseErrors * 10; // 10 points per parse error
    score -= this.stats.lowQualityChunks * 2; // 2 points per low quality chunk
    score -= this.stats.navigationContent * 5; // 5 points per file with navigation content
    
    // Deduct points for other issues
    const errorCount = this.issues.filter(i => i.type === 'error').length;
    const warningCount = this.issues.filter(i => i.type === 'warning').length;
    
    score -= errorCount * 5;
    score -= warningCount * 2;
    
    return Math.max(0, score);
  }

  /**
   * Group issues by type
   */
  groupIssuesByType() {
    const groups = {};
    this.issues.forEach(issue => {
      groups[issue.type] = (groups[issue.type] || 0) + 1;
    });
    return groups;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (this.stats.parseErrors > 0) {
      console.log('  • Fix HTML parsing issues to reduce parse errors');
      console.log('  • Check for modern JavaScript/Angular content handling');
    }
    
    if (this.stats.lowQualityChunks > 0) {
      console.log('  • Review chunking strategy for low quality chunks');
      console.log('  • Consider adjusting chunk size or breakpoints');
    }
    
    if (this.stats.navigationContent > 0) {
      console.log('  • Improve content filtering to remove navigation elements');
      console.log('  • Update content selectors for better main content extraction');
    }
    
    const errorCount = this.issues.filter(i => i.type === 'error').length;
    if (errorCount > 0) {
      console.log('  • Address critical errors first');
    }
    
    const warningCount = this.issues.filter(i => i.type === 'warning').length;
    if (warningCount > 0) {
      console.log('  • Review warnings to improve overall quality');
    }
    
    if (this.issues.length === 0) {
      console.log('  • 🎉 No issues found! Data quality looks good.');
    }
  }

  /**
   * Run complete analysis
   */
  async run() {
    console.log('🔍 Starting data quality analysis...');
    
    this.analyzeParsedFiles();
    this.analyzeChunks();
    this.generateReport();
  }
}

// Run if called directly
if (require.main === module) {
  const reporter = new QualityReporter();
  reporter.run().catch(error => {
    console.error('❌ Quality analysis failed:', error);
    process.exit(1);
  });
}

module.exports = QualityReporter;
