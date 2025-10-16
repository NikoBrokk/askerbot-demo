#!/usr/bin/env node

/**
 * Smoke test for RAG system - tests 20 representative user questions
 * Generates metrics and scores for pre-deploy validation
 */

const fs = require('fs');
const path = require('path');

// Test questions with expected RAG coverage
const TEST_QUESTIONS = [
  {"q":"Hvordan melder jeg barnet mitt på Asker Fotball camp?", "expectedRag":true},
  {"q":"Hvor finner jeg terminliste for G15 Asker?", "expectedRag":true},
  {"q":"Hvem kontakter jeg om faktura eller betaling?", "expectedRag":true},
  {"q":"Hvor ligger Føyka stadion og hvor kan jeg parkere?", "expectedRag":true},
  {"q":"Hvem er trenerne på utviklingslagene?", "expectedRag":true},
  {"q":"Hvordan blir jeg med på akademiet og hva koster det?", "expectedRag":true},
  {"q":"Hvordan melder jeg interesse for å bli frivillig på kampdag?", "expectedRag":true},
  {"q":"Finnes det et solidaritetsfond eller støtteordning?", "expectedRag":true},
  {"q":"Hvordan kontakter jeg klubben direkte?", "expectedRag":true},
  {"q":"Hva er Asker United, og hvem kan delta?", "expectedRag":true},
  {"q":"Hva er åpningstidene i fotballhuset?", "expectedRag":true},
  {"q":"Hva er klubbens sportsplan eller visjon To Steg Frem?", "expectedRag":true},
  {"q":"Hvor finner jeg informasjon om styret i klubben?", "expectedRag":true},
  {"q":"Hvordan booker jeg baner eller anlegg?", "expectedRag":true},
  {"q":"Hvor finner jeg nyheter om a-laget kvinner/menn?", "expectedRag":true},
  {"q":"Har dere retningslinjer for barnefotballen?", "expectedRag":true},
  {"q":"Når er neste klubbdugnad og hvordan melder jeg meg?", "expectedRag":false},
  {"q":"Jeg finner ikke lagets trenerkontakt – kan dere hjelpe?", "expectedRag":true},
  {"q":"Hvordan kan mitt firma bli sponsor?", "expectedRag":true},
  {"q":"Hvor melder jeg avvik eller sender inn en bekymring?", "expectedRag":true}
];

const API_ENDPOINT = 'http://localhost:8888/.netlify/functions/chat';
const RESULTS_DIR = path.join(__dirname, '..', 'storage', 'metrics');

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

/**
 * Score a response based on quality, sources, and fallback behavior
 */
function scoreResponse(response, expectedRag) {
  let score = 5; // Base score
  
  // Check if it's a fallback response
  const isFallback = response.reply.includes('Uffda, her ble jeg stående uvitende i offside') ||
                    response.reply.includes('prøv denne lenken') ||
                    response.reply.includes('endre spørsmålet');
  
  // Check sources
  const hasSources = response.sources && response.sources.length > 0;
  const sourceCount = hasSources ? response.sources.length : 0;
  
  // Check if RAG was used
  const ragUsed = response.ragUsed === true;
  
  // Scoring logic
  if (isFallback) {
    if (expectedRag) {
      score = 1; // Unexpected fallback for RAG-expected question
    } else {
      score = 6; // Expected fallback for non-RAG question
    }
  } else {
    // Not a fallback, score based on quality
    if (ragUsed && hasSources) {
      score = 8; // Good RAG response with sources
      if (sourceCount >= 2) score = 9; // Multiple sources
      if (response.reply.length > 100 && sourceCount >= 2) score = 10; // Comprehensive response
    } else if (ragUsed && !hasSources) {
      score = 4; // RAG used but no sources
    } else if (!ragUsed && hasSources) {
      score = 6; // Sources but no RAG (might be FAQ)
    } else {
      score = 3; // No RAG, no sources
    }
  }
  
  return {
    score,
    isFallback,
    sourceCount,
    ragUsed,
    hasSources
  };
}

/**
 * Test a single question
 */
async function testQuestion(question, index) {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: question.q })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const scoring = scoreResponse(data, question.expectedRag);
    
    return {
      index: index + 1,
      question: question.q,
      score: scoring.score,
      isFallback: scoring.isFallback,
      sourceCount: scoring.sourceCount,
      expectedRag: question.expectedRag,
      ragUsed: scoring.ragUsed,
      hasSources: scoring.hasSources,
      reply: data.reply,
      sources: data.sources || [],
      error: null
    };
  } catch (error) {
    return {
      index: index + 1,
      question: question.q,
      score: 0,
      isFallback: true,
      sourceCount: 0,
      expectedRag: question.expectedRag,
      ragUsed: false,
      hasSources: false,
      reply: '',
      sources: [],
      error: error.message
    };
  }
}

/**
 * Run all tests
 */
async function runSmokeTest() {
  console.log('🧪 Starting RAG smoke test...\n');
  console.log('📊 Testing 20 questions against:', API_ENDPOINT);
  console.log('⏱️  This may take a few minutes...\n');
  
  const results = [];
  const startTime = Date.now();
  
  // Test each question
  for (let i = 0; i < TEST_QUESTIONS.length; i++) {
    const question = TEST_QUESTIONS[i];
    console.log(`[${i + 1}/20] Testing: ${question.q.substring(0, 50)}...`);
    
    const result = await testQuestion(question, i);
    results.push(result);
    
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  // Calculate statistics
  const scores = results.map(r => r.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const medianScore = scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)];
  const goodScores = scores.filter(s => s >= 7).length;
  const weakScores = scores.filter(s => s < 7).length;
  const fallbackCount = results.filter(r => r.isFallback).length;
  const fallbackRate = (fallbackCount / results.length) * 100;
  
  // Unexpected fallbacks (expected RAG but got fallback)
  const unexpectedFallbacks = results.filter(r => r.expectedRag && r.isFallback);
  
  // Print results table
  console.log('\n📋 RESULTS TABLE');
  console.log('═'.repeat(120));
  console.log('| #  | Question (truncated)'.padEnd(50) + ' | Score | Fallback | Sources | Expected | Notes');
  console.log('═'.repeat(120));
  
  results.forEach(result => {
    const truncated = result.question.substring(0, 40) + (result.question.length > 40 ? '...' : '');
    const fallback = result.isFallback ? 'YES' : 'NO';
    const expected = result.expectedRag ? 'YES' : 'NO';
    const notes = result.error ? 'ERROR' : (result.expectedRag && result.isFallback ? 'UNEXPECTED' : 'OK');
    
    console.log(`| ${result.index.toString().padStart(2)} | ${truncated.padEnd(47)} | ${result.score.toString().padStart(5)} | ${fallback.padStart(8)} | ${result.sourceCount.toString().padStart(7)} | ${expected.padStart(8)} | ${notes}`);
  });
  
  console.log('═'.repeat(120));
  
  // Summary
  console.log('\n📊 SUMMARY');
  console.log('─'.repeat(50));
  console.log(`Total questions tested: ${results.length}`);
  console.log(`Average score: ${avgScore.toFixed(2)}/10`);
  console.log(`Median score: ${medianScore}/10`);
  console.log(`Good scores (≥7): ${goodScores} (${((goodScores/results.length)*100).toFixed(1)}%)`);
  console.log(`Weak scores (<7): ${weakScores} (${((weakScores/results.length)*100).toFixed(1)}%)`);
  console.log(`Total fallback rate: ${fallbackRate.toFixed(1)}%`);
  console.log(`Unexpected fallbacks: ${unexpectedFallbacks.length}`);
  console.log(`Test duration: ${duration.toFixed(1)}s`);
  
  if (unexpectedFallbacks.length > 0) {
    console.log('\n⚠️  UNEXPECTED FALLBACKS:');
    unexpectedFallbacks.forEach(result => {
      console.log(`  ${result.index}. ${result.question}`);
    });
  }
  
  // Save detailed results
  const detailedResults = {
    timestamp: new Date().toISOString(),
    endpoint: API_ENDPOINT,
    duration: duration,
    statistics: {
      totalQuestions: results.length,
      averageScore: avgScore,
      medianScore: medianScore,
      goodScores: goodScores,
      weakScores: weakScores,
      fallbackRate: fallbackRate,
      unexpectedFallbacks: unexpectedFallbacks.length
    },
    results: results
  };
  
  const resultsFile = path.join(RESULTS_DIR, 'smoke-rag.json');
  fs.writeFileSync(resultsFile, JSON.stringify(detailedResults, null, 2));
  console.log(`\n💾 Detailed results saved to: ${resultsFile}`);
  
  // Final assessment
  console.log('\n🎯 FINAL ASSESSMENT');
  console.log('─'.repeat(50));
  
  const isReady = avgScore >= 7.5 && fallbackRate <= 20 && unexpectedFallbacks.length <= 2;
  
  if (isReady) {
    console.log('✅ READY FOR DEPLOYMENT');
    console.log('   - Average score meets threshold (≥7.5)');
    console.log('   - Fallback rate acceptable (≤20%)');
    console.log('   - Few unexpected fallbacks (≤2)');
  } else {
    console.log('❌ NOT READY FOR DEPLOYMENT');
    if (avgScore < 7.5) console.log('   - Average score too low');
    if (fallbackRate > 20) console.log('   - Fallback rate too high');
    if (unexpectedFallbacks.length > 2) console.log('   - Too many unexpected fallbacks');
  }
  
  return {
    isReady,
    avgScore,
    fallbackRate,
    unexpectedFallbacks: unexpectedFallbacks.length,
    results
  };
}

// Run the test
if (require.main === module) {
  runSmokeTest().catch(console.error);
}

module.exports = { runSmokeTest, TEST_QUESTIONS };
