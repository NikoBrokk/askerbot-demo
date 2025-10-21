/**
 * AI-Specific RAG Test Suite
 * Tests queries that should benefit from AI-powered query understanding
 */

const testQueries = [
  // Typo and Misspelling Tests
  {
    query: "Hvem er treeneren på G15-guttene?",
    expectedIntent: "trenere",
    description: "Typo: 'treeneren' instead of 'treneren'"
  },
  {
    query: "Hva koster OBOS akadmi?",
    expectedIntent: "akademi",
    description: "Typo: 'akadmi' instead of 'akademi'"
  },
  {
    query: "Hvor kan jeg kontkte klubben?",
    expectedIntent: "kontakt",
    description: "Typo: 'kontkte' instead of 'kontakte'"
  },
  {
    query: "Hva er adressen til staium?",
    expectedIntent: "stadion",
    description: "Typo: 'staium' instead of 'stadion'"
  },

  // Alternative Phrasing Tests
  {
    query: "Hvor finner jeg stadion?",
    expectedIntent: "stadion",
    description: "Alternative phrasing for location question"
  },
  {
    query: "Hva er adressen til banen?",
    expectedIntent: "stadion",
    description: "Alternative phrasing: 'banen' instead of 'stadion'"
  },
  {
    query: "Hvem kan jeg ringe for å spørre om priser?",
    expectedIntent: "kontakt",
    description: "Complex query asking for contact info for pricing"
  },
  {
    query: "Hvor kan jeg parkere bilen min?",
    expectedIntent: "parkering",
    description: "Alternative phrasing: 'bilen min' instead of 'bil'"
  },

  // Ambiguous Queries
  {
    query: "Hva koster det?",
    expectedIntent: "pris",
    description: "Ambiguous query without context"
  },
  {
    query: "Hvem er ansvarlig?",
    expectedIntent: "trenere",
    description: "Ambiguous query - could be trainer or staff"
  },
  {
    query: "Hvor er det?",
    expectedIntent: "stadion",
    description: "Very ambiguous location query"
  },
  {
    query: "Hvordan melder jeg meg på?",
    expectedIntent: "påmelding",
    description: "Ambiguous registration query"
  },

  // Complex Context Queries
  {
    query: "Jeg vil at sønnen min skal spille fotball, hva er mulighetene?",
    expectedIntent: "akademi",
    description: "Complex query about youth football opportunities"
  },
  {
    query: "Vi er en familie med tre barn, finnes det rabatter?",
    expectedIntent: "familierabatt",
    description: "Complex query about family discounts"
  },
  {
    query: "Hvis jeg vil hjelpe til på kampdag, hvem kontakter jeg?",
    expectedIntent: "frivillig",
    description: "Complex query about volunteer work"
  },

  // Previously Failed Queries (from comprehensive test <60% scores)
  {
    query: "Hvordan melder jeg barnet mitt på OBOS Akademi?",
    expectedIntent: "akademi",
    description: "Previously scored 58% - needs better source matching"
  },
  {
    query: "Hva er åpningstidene i fotballhuset?",
    expectedIntent: "fotballhuset",
    description: "Previously scored 53% - needs better matching"
  },
  {
    query: "Når er neste klubbdugnad?",
    expectedIntent: "dugnad",
    description: "Previously scored 52% - needs better matching"
  },
  {
    query: "Hvem er spillere på A-laget?",
    expectedIntent: "spillere_a_lag",
    description: "Previously scored 56% - needs better matching"
  }
];

/**
 * AI Test Evaluator - Enhanced version focusing on AI-specific improvements
 */
class AITestEvaluator {
  constructor() {
    this.results = [];
    this.aiCallCount = 0;
    this.localMatchCount = 0;
  }

  evaluateAIResponse(query, response, startTime, expectedIntent) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Check if AI was used (look for AI analysis in response metadata)
    const usedAI = response.aiAnalysis || response.source === 'bm25_ai_enhanced';
    
    if (usedAI) {
      this.aiCallCount++;
    } else {
      this.localMatchCount++;
    }
    
    const evaluation = {
      query: query,
      expectedIntent: expectedIntent,
      responseTime: responseTime,
      usedAI: usedAI,
      directAnswer: this.evaluateDirectAnswer(query, response),
      sourceRelevance: this.evaluateSourceRelevance(query, response),
      intentMatch: this.evaluateIntentMatch(query, response, expectedIntent),
      typoHandling: this.evaluateTypoHandling(query, response),
      confidence: this.evaluateConfidence(response),
      overallScore: 0
    };

    // Calculate overall score with AI-specific weights
    evaluation.overallScore = (
      evaluation.directAnswer * 0.25 +
      evaluation.sourceRelevance * 0.25 +
      evaluation.intentMatch * 0.20 +
      evaluation.typoHandling * 0.15 +
      evaluation.confidence * 0.15
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

  evaluateIntentMatch(query, response, expectedIntent) {
    if (!expectedIntent || !response.reply) return 0.5; // Neutral score if no expected intent
    
    const reply = response.reply.toLowerCase();
    
    // Check if response contains terms related to expected intent
    const intentTerms = {
      'trenere': ['trener', 'coach', 'hovedtrener', 'assistenttrener', 'leder'],
      'akademi': ['akademi', 'skole', 'opplæring', 'utvikling', 'OBOS', 'barn'],
      'kontakt': ['kontakt', 'telefon', 'e-post', 'epost', 'ring', 'skriv'],
      'stadion': ['stadion', 'bane', 'felt', 'arena', 'Føyka', 'adresse'],
      'parkering': ['parkering', 'parkere', 'bil', 'avgift', 'billett'],
      'pris': ['pris', 'priser', 'koster', 'måned', 'medlemskap', 'betaling', 'kostnad'],
      'påmelding': ['påmelding', 'registrering', 'melde', 'delta', 'bli med'],
      'familierabatt': ['familierabatt', 'rabatt', 'familie', 'tilbud'],
      'frivillig': ['frivillig', 'kampdag', 'hjelpe', 'bidra', 'melde interesse'],
      'dugnad': ['dugnad', 'frivillig', 'hjelpe', 'bidra', 'medlem'],
      'spillere_a_lag': ['spillere', 'spiller', 'tropp', 'keeper', 'forsvar', 'midtbane', 'angrep'],
      'fotballhuset': ['fotballhus', 'åpningstid', 'åpent', 'butikk', 'supporter']
    };
    
    const terms = intentTerms[expectedIntent] || [];
    const hasIntentTerms = terms.some(term => reply.includes(term));
    
    return hasIntentTerms ? 1 : 0;
  }

  evaluateTypoHandling(query, response) {
    if (!response.reply) return 0;
    
    // Check if response handles typos well by providing relevant information
    // despite typos in the query
    const reply = response.reply.toLowerCase();
    
    // If response is helpful despite typos, score higher
    if (reply.length > 50 && !reply.includes('jeg vet ikke')) {
      return 0.8;
    }
    
    return 0.3;
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

  generateReport() {
    const totalTests = this.results.length;
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / totalTests;
    const avgDirectAnswer = this.results.reduce((sum, r) => sum + r.directAnswer, 0) / totalTests;
    const avgSourceRelevance = this.results.reduce((sum, r) => sum + r.sourceRelevance, 0) / totalTests;
    const avgIntentMatch = this.results.reduce((sum, r) => sum + r.intentMatch, 0) / totalTests;
    const avgTypoHandling = this.results.reduce((sum, r) => sum + r.typoHandling, 0) / totalTests;
    const avgConfidence = this.results.reduce((sum, r) => sum + r.confidence, 0) / totalTests;
    const avgOverallScore = this.results.reduce((sum, r) => sum + r.overallScore, 0) / totalTests;

    const aiUsageRate = (this.aiCallCount / totalTests) * 100;
    const localUsageRate = (this.localMatchCount / totalTests) * 100;

    return {
      summary: {
        totalTests,
        avgResponseTime: Math.round(avgResponseTime),
        avgDirectAnswer: Math.round(avgDirectAnswer * 100) / 100,
        avgSourceRelevance: Math.round(avgSourceRelevance * 100) / 100,
        avgIntentMatch: Math.round(avgIntentMatch * 100) / 100,
        avgTypoHandling: Math.round(avgTypoHandling * 100) / 100,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        avgOverallScore: Math.round(avgOverallScore * 100) / 100,
        aiUsageRate: Math.round(aiUsageRate),
        localUsageRate: Math.round(localUsageRate),
        aiCallCount: this.aiCallCount,
        localMatchCount: this.localMatchCount
      },
      results: this.results
    };
  }
}

/**
 * Main AI test execution
 */
async function runAITest() {
  console.log('🚀 Starting AI-specific RAG test...');
  
  const evaluator = new AITestEvaluator();
  const endpoint = 'http://localhost:8888/.netlify/functions/chat';
  
  for (let i = 0; i < testQueries.length; i++) {
    const testCase = testQueries[i];
    console.log(`\n📝 AI Test ${i + 1}/${testQueries.length}: "${testCase.query}"`);
    console.log(`🎯 Expected Intent: ${testCase.expectedIntent}`);
    console.log(`📋 Description: ${testCase.description}`);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: testCase.query
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const evaluation = evaluator.evaluateAIResponse(testCase.query, data, startTime, testCase.expectedIntent);
      
      console.log(`✅ Response time: ${evaluation.responseTime}ms`);
      console.log(`🤖 AI Used: ${evaluation.usedAI ? 'Yes' : 'No'}`);
      console.log(`📊 Overall score: ${Math.round(evaluation.overallScore * 100)}%`);
      console.log(`🎯 Intent match: ${Math.round(evaluation.intentMatch * 100)}%`);
      console.log(`📝 Typo handling: ${Math.round(evaluation.typoHandling * 100)}%`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      evaluator.evaluateAIResponse(testCase.query, { reply: '', sources: [] }, startTime, testCase.expectedIntent);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  const report = evaluator.generateReport();
  
  console.log('\n' + '='.repeat(80));
  console.log('🤖 AI-SPECIFIC RAG TEST RESULTS');
  console.log('='.repeat(80));
  
  console.log(`\n🎯 AI PERFORMANCE METRICS:`);
  console.log(`Average Response Time: ${report.summary.avgResponseTime}ms`);
  console.log(`Direct Answer Rate: ${Math.round(report.summary.avgDirectAnswer * 100)}%`);
  console.log(`Source Relevance: ${Math.round(report.summary.avgSourceRelevance * 100)}%`);
  console.log(`Intent Match Rate: ${Math.round(report.summary.avgIntentMatch * 100)}%`);
  console.log(`Typo Handling Score: ${Math.round(report.summary.avgTypoHandling * 100)}%`);
  console.log(`Confidence Level: ${Math.round(report.summary.avgConfidence * 100)}%`);
  console.log(`Overall Score: ${Math.round(report.summary.avgOverallScore * 100)}%`);
  
  console.log(`\n🤖 AI USAGE METRICS:`);
  console.log(`AI Call Rate: ${report.summary.aiUsageRate}% (${report.summary.aiCallCount} calls)`);
  console.log(`Local Match Rate: ${report.summary.localUsageRate}% (${report.summary.localMatchCount} matches)`);
  
  // Save detailed report
  const fs = require('fs');
  const reportPath = './storage/metrics/ai-rag-test.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    endpoint,
    testType: 'AI-specific',
    summary: report.summary,
    results: report.results
  }, null, 2));
  
  console.log(`\n💾 Detailed AI test report saved to: ${reportPath}`);
  
  return report;
}

// Run the test if this file is executed directly
if (require.main === module) {
  runAITest().catch(console.error);
}

module.exports = { runAITest, AITestEvaluator, testQueries };
