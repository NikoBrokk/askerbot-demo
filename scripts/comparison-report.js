/**
 * Comparison Report Generator
 * Compares baseline vs AI-enhanced RAG performance
 */

const fs = require('fs');

function generateComparisonReport() {
  try {
    // Read baseline results
    const baselinePath = './storage/metrics/comprehensive-rag-test.json';
    const aiTestPath = './storage/metrics/ai-rag-test.json';
    
    if (!fs.existsSync(baselinePath) || !fs.existsSync(aiTestPath)) {
      console.error('❌ Missing test result files. Run tests first.');
      return;
    }
    
    const baselineData = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    const aiTestData = JSON.parse(fs.readFileSync(aiTestPath, 'utf8'));
    
    const baseline = baselineData.summary;
    const aiTest = aiTestData.summary;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 AI-POWERED RAG ENHANCEMENT COMPARISON REPORT');
    console.log('='.repeat(80));
    
    console.log('\n🎯 PERFORMANCE COMPARISON:');
    console.log('┌─────────────────────────┬─────────────┬─────────────┬─────────────┐');
    console.log('│ Metric                  │ Baseline    │ AI-Enhanced │ Change      │');
    console.log('├─────────────────────────┼─────────────┼─────────────┼─────────────┤');
    
    const metrics = [
      ['Overall Score', baseline.avgOverallScore, aiTest.avgOverallScore],
      ['Direct Answer Rate', baseline.avgDirectAnswer, aiTest.avgDirectAnswer],
      ['Source Relevance', baseline.avgSourceRelevance, aiTest.avgSourceRelevance],
      ['Response Time (ms)', baseline.avgResponseTime, aiTest.avgResponseTime],
      ['Confidence Level', baseline.avgConfidence, aiTest.avgConfidence],
      ['Usefulness', baseline.avgUsefulness, aiTest.avgUsefulness]
    ];
    
    metrics.forEach(([name, baselineVal, aiVal]) => {
      const change = aiVal - baselineVal;
      const changePercent = ((change / baselineVal) * 100).toFixed(1);
      const changeStr = change >= 0 ? `+${changePercent}%` : `${changePercent}%`;
      
      console.log(`│ ${name.padEnd(23)} │ ${(baselineVal * 100).toFixed(1).padStart(11)}% │ ${(aiVal * 100).toFixed(1).padStart(11)}% │ ${changeStr.padStart(11)} │`);
    });
    
    console.log('└─────────────────────────┴─────────────┴─────────────┴─────────────┘');
    
    console.log('\n🤖 AI USAGE ANALYSIS:');
    console.log(`AI Call Rate: ${aiTest.aiUsageRate}% (${aiTest.aiCallCount} calls)`);
    console.log(`Local Match Rate: ${aiTest.localUsageRate}% (${aiTest.localMatchCount} matches)`);
    console.log(`Total Tests: ${aiTest.totalTests}`);
    
    console.log('\n📈 KEY INSIGHTS:');
    
    // Overall score analysis
    if (aiTest.avgOverallScore > baseline.avgOverallScore) {
      console.log(`✅ Overall Score improved by ${((aiTest.avgOverallScore - baseline.avgOverallScore) * 100).toFixed(1)}%`);
    } else {
      console.log(`❌ Overall Score decreased by ${((baseline.avgOverallScore - aiTest.avgOverallScore) * 100).toFixed(1)}%`);
    }
    
    // AI usage analysis
    if (aiTest.aiUsageRate === 0) {
      console.log(`⚠️  AI was never called - local patterns are too effective`);
      console.log(`💡 Consider lowering local pattern matching threshold or adding more complex queries`);
    } else {
      console.log(`✅ AI was called ${aiTest.aiUsageRate}% of the time - good cost efficiency`);
    }
    
    // Source relevance analysis
    if (aiTest.avgSourceRelevance > baseline.avgSourceRelevance) {
      console.log(`✅ Source Relevance improved by ${((aiTest.avgSourceRelevance - baseline.avgSourceRelevance) * 100).toFixed(1)}%`);
    } else {
      console.log(`❌ Source Relevance decreased by ${((baseline.avgSourceRelevance - aiTest.avgSourceRelevance) * 100).toFixed(1)}%`);
    }
    
    // Response time analysis
    const timeDiff = aiTest.avgResponseTime - baseline.avgResponseTime;
    if (timeDiff < 1000) {
      console.log(`✅ Response time impact minimal (+${timeDiff}ms)`);
    } else {
      console.log(`⚠️  Response time increased by ${timeDiff}ms - may need optimization`);
    }
    
    console.log('\n🎯 TARGET ANALYSIS:');
    console.log(`Overall Score Target: 85% (Current: ${(aiTest.avgOverallScore * 100).toFixed(1)}%)`);
    console.log(`Source Relevance Target: 70% (Current: ${(aiTest.avgSourceRelevance * 100).toFixed(1)}%)`);
    console.log(`Direct Answer Target: 70% (Current: ${(aiTest.avgDirectAnswer * 100).toFixed(1)}%)`);
    
    const overallGap = 0.85 - aiTest.avgOverallScore;
    const sourceGap = 0.70 - aiTest.avgSourceRelevance;
    const directGap = 0.70 - aiTest.avgDirectAnswer;
    
    console.log('\n📊 GAPS TO TARGET:');
    console.log(`Overall Score Gap: ${(overallGap * 100).toFixed(1)}%`);
    console.log(`Source Relevance Gap: ${(sourceGap * 100).toFixed(1)}%`);
    console.log(`Direct Answer Gap: ${(directGap * 100).toFixed(1)}%`);
    
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (aiTest.aiUsageRate === 0) {
      console.log('1. 🎯 AI Integration Issue: AI is never being called');
      console.log('   - Check if local pattern matching is too aggressive');
      console.log('   - Consider adding more complex/ambiguous test queries');
      console.log('   - Verify AI analysis function is working correctly');
    }
    
    if (aiTest.avgSourceRelevance < baseline.avgSourceRelevance) {
      console.log('2. 📉 Source Relevance Decreased:');
      console.log('   - AI analysis may not be generating optimal search terms');
      console.log('   - Consider improving AI prompt engineering');
      console.log('   - Check if AI analysis is being used in search functions');
    }
    
    if (overallGap > 0.2) {
      console.log('3. 🎯 Significant Gap to Target:');
      console.log('   - Need more aggressive AI integration');
      console.log('   - Consider lowering AI trigger thresholds');
      console.log('   - May need to enhance AI prompt for better understanding');
    }
    
    // Save comparison report
    const comparisonData = {
      timestamp: new Date().toISOString(),
      baseline: baseline,
      aiEnhanced: aiTest,
      gaps: {
        overallScore: overallGap,
        sourceRelevance: sourceGap,
        directAnswer: directGap
      },
      recommendations: [
        aiTest.aiUsageRate === 0 ? 'AI integration needs debugging' : 'AI integration working',
        aiTest.avgSourceRelevance < baseline.avgSourceRelevance ? 'Source relevance decreased' : 'Source relevance improved',
        overallGap > 0.2 ? 'Significant gap to target remains' : 'Close to target'
      ]
    };
    
    const reportPath = './storage/metrics/ai-comparison-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(comparisonData, null, 2));
    
    console.log(`\n💾 Comparison report saved to: ${reportPath}`);
    
    return comparisonData;
    
  } catch (error) {
    console.error('❌ Error generating comparison report:', error);
    return null;
  }
}

// Run if executed directly
if (require.main === module) {
  generateComparisonReport();
}

module.exports = { generateComparisonReport };
