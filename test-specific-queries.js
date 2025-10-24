#!/usr/bin/env node

/**
 * Test specific queries that had source matching issues
 */

const testQueries = [
  "Hva er hashtag for klubben?",
  "Kan jeg kjøpe VIP-billetter?",
  "Finnes det veteranlag?",
  "Hva koster enkeltbillett?",
  "Hva koster treningsleir?"
];

async function testQuery(query) {
  try {
    const response = await fetch('http://localhost:8888/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query })
    });
    
    const data = await response.json();
    console.log(`\n📝 Q: ${query}`);
    console.log(`📚 Source: ${data.sources?.[0]?.title || 'No source'}`);
    console.log(`🔗 URL: ${data.sources?.[0]?.url || 'No URL'}`);
    console.log(`🎯 Score: ${data.sources?.[0]?.score || 'N/A'}`);
    console.log(`💬 A: ${(data.reply || 'No reply').substring(0, 150)}...`);
  } catch (error) {
    console.error(`Error testing "${query}":`, error.message);
  }
}

async function runTests() {
  console.log('🚀 Testing specific problem queries...\n');
  console.log('=' + '='.repeat(70) + '\n');
  
  for (const query of testQueries) {
    await testQuery(query);
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n' + '='.repeat(71));
  console.log('✅ Test completed!');
}

runTests().catch(console.error);

