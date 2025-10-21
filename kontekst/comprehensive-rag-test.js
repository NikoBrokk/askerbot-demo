/**
 * Comprehensive RAG Test Suite
 * Tests 20 realistic user queries with detailed KPI evaluation
 */

const testQueries = [
  // Basic Information Queries
  "Hvordan melder jeg barnet mitt på OBOS Akademi?",
  "Hva koster det å være med i akademiet?",
  "Hvem er treneren på G15-guttene?",
  "Hvor ligger Føyka stadion?",
  
  // Contact & Communication
  "Hvordan kontakter jeg klubben?",
  "Hvem er daglig leder?",
  "Hva er e-postadressen til klubben?",
  
  // Practical Information
  "Hvor kan jeg parkere på Føyka?",
  "Hva er åpningstidene i fotballhuset?",
  "Kan jeg booke banen til privat bruk?",
  
  // Team & Structure
  "Hvem er spillere på A-laget?",
  "Hva er forskjellen mellom akademi og akademi+?",
  "Finnes det samfunnslag?",
  
  // Membership & Costs
  "Hva koster medlemskap?",
  "Hvordan betaler jeg kontingent?",
  "Finnes det familierabatt?",
  
  // Events & Activities
  "Når er neste klubbdugnad?",
  "Hvordan melder jeg meg som frivillig?",
  "Finnes det sommerleir?",
  
  // Support & Help
  "Finnes det solidaritetsfond?",
  "Hvor sender jeg bekymringsmelding?"
];

/**
 * KPI Evaluation Framework
 */
class KPIEvaluator {
  constructor() {
    this.results = [];
  }

  evaluateResponse(query, response, startTime) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    const evaluation = {
      query: query,
      responseTime: responseTime,
      directAnswer: this.evaluateDirectAnswer(query, response),
      mailProbability: this.evaluateMailProbability(query, response),
      confidence: this.evaluateConfidence(response),
      sourceAccess: this.evaluateSourceAccess(response),
      usefulness: this.evaluateUsefulness(query, response),
      sourceRelevance: this.evaluateSourceRelevance(query, response),
      technicalQuality: this.evaluateTechnicalQuality(response),
      overallScore: 0
    };

    // Calculate overall score (weighted average)
    evaluation.overallScore = (
      evaluation.directAnswer * 0.25 +
      (1 - evaluation.mailProbability) * 0.20 +
      evaluation.confidence * 0.15 +
      evaluation.sourceAccess * 0.10 +
      evaluation.usefulness * 0.15 +
      evaluation.sourceRelevance * 0.10 +
      evaluation.technicalQuality * 0.05
    );

    this.results.push(evaluation);
    return evaluation;
  }

  evaluateDirectAnswer(query, response) {
    if (!response.reply || response.reply.includes('Uffda, her ble jeg stående uvitende')) {
      return 0;
    }
    
    // Check if response directly addresses the query
    const queryWords = query.toLowerCase().split(' ');
    const replyWords = response.reply.toLowerCase();
    
    let relevanceScore = 0;
    queryWords.forEach(word => {
      if (word.length > 2 && replyWords.includes(word)) {
        relevanceScore += 1;
      }
    });
    
    const relevance = relevanceScore / queryWords.length;
    
    // Check for specific answer patterns
    if (response.reply.includes('@') || response.reply.includes('telefon') || response.reply.includes('kontakt')) {
      return Math.min(1, relevance + 0.3);
    }
    
    return Math.min(1, relevance);
  }

  evaluateMailProbability(query, response) {
    if (!response.reply) return 1;
    
    const reply = response.reply.toLowerCase();
    
    // High probability indicators
    if (reply.includes('kontakt klubben') || reply.includes('send e-post') || 
        reply.includes('jeg vet ikke') || reply.includes('spør klubben')) {
      return 0.8;
    }
    
    // Medium probability indicators
    if (reply.includes('kontakt') || reply.includes('e-post') || reply.includes('ring')) {
      return 0.4;
    }
    
    // Low probability - direct answer provided
    return 0.1;
  }

  evaluateConfidence(response) {
    if (!response.reply) return 0;
    
    const reply = response.reply.toLowerCase();
    
    // High confidence indicators
    if (reply.includes('er ') && !reply.includes('kan være') && !reply.includes('trolig')) {
      return 0.9;
    }
    
    // Medium confidence indicators
    if (reply.includes('vanligvis') || reply.includes('normalt')) {
      return 0.6;
    }
    
    // Low confidence indicators
    if (reply.includes('trolig') || reply.includes('kan være') || reply.includes('mulig')) {
      return 0.3;
    }
    
    return 0.7; // Default medium confidence
  }

  evaluateSourceAccess(response) {
    if (!response.sources || response.sources.length === 0) {
      return 0;
    }
    
    // Check if sources are accessible and relevant
    const validSources = response.sources.filter(source => 
      source.url && source.title && !source.url.includes('undefined')
    );
    
    return validSources.length / response.sources.length;
  }

  evaluateUsefulness(query, response) {
    if (!response.reply) return 0;
    
    const reply = response.reply.toLowerCase();
    
    // Check for actionable information
    const actionWords = ['kontakt', 'send', 'ring', 'besøk', 'meld', 'book'];
    const hasAction = actionWords.some(word => reply.includes(word));
    
    // Check for specific details
    const hasDetails = reply.includes('@') || reply.includes('kr') || 
                      reply.includes('kl.') || reply.includes('dag');
    
    let score = 0.3; // Base score
    if (hasAction) score += 0.3;
    if (hasDetails) score += 0.4;
    
    return Math.min(1, score);
  }

  evaluateSourceRelevance(query, response) {
    if (!response.sources || response.sources.length === 0) {
      return 0;
    }
    
    const queryWords = query.toLowerCase().split(' ');
    let totalRelevance = 0;
    
    response.sources.forEach(source => {
      const sourceText = (source.title + ' ' + source.url).toLowerCase();
      let relevance = 0;
      
      queryWords.forEach(word => {
        if (word.length > 2 && sourceText.includes(word)) {
          relevance += 1;
        }
      });
      
      totalRelevance += relevance / queryWords.length;
    });
    
    return Math.min(1, totalRelevance / response.sources.length);
  }

  evaluateTechnicalQuality(response) {
    if (!response.reply) return 0;
    
    const reply = response.reply;
    
    // Check for proper formatting
    const hasLineBreaks = reply.includes('\n');
    const hasProperLength = reply.length > 20 && reply.length < 500;
    const hasNorwegian = reply.includes('å') || reply.includes('ø') || reply.includes('æ');
    
    let score = 0;
    if (hasLineBreaks) score += 0.3;
    if (hasProperLength) score += 0.4;
    if (hasNorwegian) score += 0.3;
    
    return score;
  }

  generateReport() {
    const totalTests = this.results.length;
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / totalTests;
    const avgDirectAnswer = this.results.reduce((sum, r) => sum + r.directAnswer, 0) / totalTests;
    const avgMailProbability = this.results.reduce((sum, r) => sum + r.mailProbability, 0) / totalTests;
    const avgConfidence = this.results.reduce((sum, r) => sum + r.confidence, 0) / totalTests;
    const avgSourceAccess = this.results.reduce((sum, r) => sum + r.sourceAccess, 0) / totalTests;
    const avgUsefulness = this.results.reduce((sum, r) => sum + r.usefulness, 0) / totalTests;
    const avgSourceRelevance = this.results.reduce((sum, r) => sum + r.sourceRelevance, 0) / totalTests;
    const avgOverallScore = this.results.reduce((sum, r) => sum + r.overallScore, 0) / totalTests;

    return {
      summary: {
        totalTests,
        avgResponseTime: Math.round(avgResponseTime),
        avgDirectAnswer: Math.round(avgDirectAnswer * 100) / 100,
        avgMailProbability: Math.round(avgMailProbability * 100) / 100,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        avgSourceAccess: Math.round(avgSourceAccess * 100) / 100,
        avgUsefulness: Math.round(avgUsefulness * 100) / 100,
        avgSourceRelevance: Math.round(avgSourceRelevance * 100) / 100,
        avgOverallScore: Math.round(avgOverallScore * 100) / 100
      },
      results: this.results
    };
  }
}

/**
 * Main test execution
 */
async function runComprehensiveTest() {
  console.log('🚀 Starting comprehensive RAG test...');
  
  const evaluator = new KPIEvaluator();
  const endpoint = 'http://localhost:8888/.netlify/functions/chat';
  
  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    console.log(`\n📝 Test ${i + 1}/20: "${query}"`);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: query
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const evaluation = evaluator.evaluateResponse(query, data, startTime);
      
      console.log(`✅ Response time: ${evaluation.responseTime}ms`);
      console.log(`📊 Overall score: ${Math.round(evaluation.overallScore * 100)}%`);
      console.log(`🎯 Direct answer: ${Math.round(evaluation.directAnswer * 100)}%`);
      console.log(`📧 Mail probability: ${Math.round(evaluation.mailProbability * 100)}%`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      evaluator.evaluateResponse(query, { reply: '', sources: [] }, startTime);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const report = evaluator.generateReport();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPREHENSIVE RAG TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log(`\n🎯 KPI SUMMARY:`);
  console.log(`Average Response Time: ${report.summary.avgResponseTime}ms`);
  console.log(`Direct Answer Rate: ${Math.round(report.summary.avgDirectAnswer * 100)}%`);
  console.log(`Mail Probability: ${Math.round(report.summary.avgMailProbability * 100)}%`);
  console.log(`Confidence Level: ${Math.round(report.summary.avgConfidence * 100)}%`);
  console.log(`Source Access: ${Math.round(report.summary.avgSourceAccess * 100)}%`);
  console.log(`Usefulness: ${Math.round(report.summary.avgUsefulness * 100)}%`);
  console.log(`Source Relevance: ${Math.round(report.summary.avgSourceRelevance * 100)}%`);
  console.log(`Overall Score: ${Math.round(report.summary.avgOverallScore * 100)}%`);
  
  // Save detailed report
  const fs = require('fs');
  const reportPath = './storage/metrics/comprehensive-rag-test.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    endpoint,
    summary: report.summary,
    results: report.results
  }, null, 2));
  
  console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  
  return report;
}

// Run the test if this file is executed directly
if (require.main === module) {
  runComprehensiveTest().catch(console.error);
}

module.exports = { runComprehensiveTest, KPIEvaluator, testQueries };
