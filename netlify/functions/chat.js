/**
 * Netlify Edge Function for OpenAI API integration with RAG
 * Håndterer chat-forespørsler til Askerbot med kunnskapsbase-søk
 */

const fs = require('fs');
const path = require('path');

// FAQ Configuration for common chip questions
const FAQ_RESPONSES = {
  "obos akademi": {
    reply: "OBOS Akademi er et fotballakademi for jenter og gutter i alderen 7-13 år.\n\nDet følger skoleruta og tar kun fri på skolens fridager. Man kan delta fra 1-5 dager per uke.\n\nPris: 955,- til 2500,- per måned avhengig av antall dager.",
    sources: [
      {
        title: "OBOS Akademi - Asker Fotball",
        url: "https://askerfotball.no/lag/utviklingslag/akademi",
        score: 10
      },
      {
        title: "OBOS-Fotballakademi - Påmelding",
        url: "https://app.rubic.no/Public/Events/33825",
        score: 10
      }
    ]
  },
  "akademi+": {
    reply: "OBOS Akademi+ er for de ekstra ivrige fotballspillerne.\n\nDette er en intensiv variant av akademiet for barn som ønsker mer trening og utvikling.\n\nKontakt lars.henrik@askerfotball.no for mer informasjon.",
    source: {
      title: "OBOS Akademi+ - Asker Fotball", 
      url: "https://askerfotball.no/nyheter/velkommen-til-obos-akademi",
      score: 10
    }
  },
  "kontakt klubben": {
    reply: "For å kontakte Asker Fotball:\n\nAdministrasjon:\nRolf-Magne Walstad - Daglig og sportslig leder\nE-post: walstad@askerfotball.no\n\nMorten Sommerfeldt - Markedsansvarlig\nE-post: morten@askerfotball.no\nTelefon: +47 907 51 170\n\nGenerelt:\nE-post: post@askerfotball.no\n\nBesøk askerfotball.no for mer informasjon.",
    source: {
      title: "Kontakt Asker Fotball",
      url: "https://askerfotball.no/om-klubben/ansatte",
      score: 10
    }
  },
  "a-laget": {
    reply: "Asker Fotball A-lag har en sterk spillertropp med både erfarne og unge spillere.\n\nHovedtrener: Magnus Bredal\nAssistenttrener: Bård Heggset\n\nSe fullstendig spillertropp med posisjoner og fødselsdatoer på lag-siden.",
    source: {
      title: "A-laget - Asker Fotball",
      url: "https://askerfotball.no/lag", 
      score: 10
    }
  }
};

// RAG Configuration
const RAG_CONFIG = {
  maxSources: 1,
  sourcePriority: ["askerfotball.no"],
  fallbackOnUncertain: "Jeg finner ikke denne informasjonen. Kontakt klubben på post@askerfotball.no",
  alwaysCite: true,
  answerLanguage: "no"
};

// Load RAG policy if available
let ragPolicy = RAG_CONFIG;
try {
  const policyPath = path.join(__dirname, '..', '..', 'config', 'rag-policy.json');
  if (fs.existsSync(policyPath)) {
    ragPolicy = { ...RAG_CONFIG, ...JSON.parse(fs.readFileSync(policyPath, 'utf8')) };
  }
} catch (error) {
  console.warn('Could not load RAG policy, using defaults:', error.message);
}

/**
 * Check if query matches any FAQ responses
 */
function checkFAQ(query) {
  const queryLower = query.toLowerCase().trim();
  
  // Exact matches first
  if (FAQ_RESPONSES[queryLower]) {
    return FAQ_RESPONSES[queryLower];
  }
  
  // Fuzzy matching for common variations
  const faqKeys = Object.keys(FAQ_RESPONSES);
  for (const key of faqKeys) {
    // Check if query contains key words
    const keyWords = key.split(' ');
    const matchCount = keyWords.filter(word => queryLower.includes(word)).length;
    
    if (matchCount >= keyWords.length * 0.7) { // 70% match threshold
      return FAQ_RESPONSES[key];
    }
  }
  
  return null;
}

/**
 * Load chunk metadata for text search
 */
function loadChunkMetadata() {
  try {
    // Try multiple possible paths for Netlify Functions environment
    const possiblePaths = [
      path.join(__dirname, '..', '..', 'storage', 'index', 'bm25', 'chunk-metadata.json'),
      path.join(process.cwd(), 'storage', 'index', 'bm25', 'chunk-metadata.json'),
      path.join('/tmp', 'storage', 'index', 'bm25', 'chunk-metadata.json')
    ];
    
    let metadataPath = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        metadataPath = testPath;
        console.log('Found metadata at:', metadataPath);
        break;
      }
    }
    
    if (!metadataPath) {
      console.warn('Chunk metadata not found in any location:', possiblePaths);
      return null;
    }
    
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    console.log(`Loaded ${Object.keys(metadata).length} metadata entries`);
    return metadata;
  } catch (error) {
    console.error('Error loading chunk metadata:', error.message);
    return null;
  }
}

/**
 * AI-powered query understanding and rewriting
 * Uses OpenAI to understand user intent and generate better search queries
 */
async function aiQueryUnderstanding(query) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OpenAI API key not available, using fallback preprocessing');
      return fallbackQueryPreprocessing(query);
    }

    // Use OpenAI to understand and rewrite the query
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Du er en ekspert på å forstå fotball-spørsmål og konvertere dem til effektive søkeord for en kunnskapsbase om Asker Fotball.

OPPGAVE: Konverter brukerens spørsmål til 3-5 alternative søkeord som vil gi de beste resultatene i en fotball-kunnskapsbase.

VIGTIGE FORBEDRINGER:
- "alaget" = "a-laget" (norsk slang for A-laget)
- "alagspillere" = "a-laget spillere"
- Aldersspørsmål: "hvor gammel er X" → søk etter spillernavn + fødselsdato/alder
- Målstatistikk: "mål scoret" → "resultater", "tabell", "mål", "statistikk"
- Ungdomslag: "ungdomslag", "utviklingslag" → "g19", "g16", "g15", "g14", "g13"

EKSEMPLER:
- "hvem spiller på alaget" → ["a-laget", "spillere", "spillertropp", "lag", "truppen"]
- "hvem er alagspillere" → ["a-laget", "spillere", "spillertropp", "lag", "truppen"]
- "hvor gammel er nikolai gabrielsen" → ["nikolai", "gabrielsen", "fødsel", "alder", "spillere"]
- "antall mål scoret" → ["resultater", "tabell", "mål", "statistikk", "score"]
- "ungdomslag" → ["utviklingslag", "g19", "g16", "g15", "g14", "g13"]
- "neste a-kamp" → ["terminliste", "kommende kamper", "kamp program", "neste kamp"]
- "obos akademi" → ["akademi", "obos", "utviklingslag", "akademi"]
- "obos akademi+" → ["akademi", "obos", "utviklingslag", "akademi+", "plus"]
- "a-laget" → ["a-laget", "spillere", "truppen", "lag"]

RETURNFORMAT: Kun en JSON-array med søkeord, ingen annen tekst.`
          },
          {
            role: 'user',
            content: query
          }
        ],
        max_tokens: 150,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content?.trim();
    
    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    // Parse AI response as JSON array
    let searchTerms;
    try {
      searchTerms = JSON.parse(aiResponse);
      if (!Array.isArray(searchTerms)) {
        throw new Error('Response is not an array');
      }
    } catch (parseError) {
      console.warn('⚠️ Failed to parse AI response as JSON, using fallback');
      return fallbackQueryPreprocessing(query);
    }

    // Ensure we have at least the original query
    if (searchTerms.length === 0) {
      searchTerms = [query];
    }

    return {
      original: query,
      searchTerms: searchTerms,
      method: 'ai'
    };

  } catch (error) {
    console.warn('⚠️ AI query understanding failed:', error.message);
    return fallbackQueryPreprocessing(query);
  }
}

/**
 * Fallback query preprocessing when AI is not available
 */
function fallbackQueryPreprocessing(query) {
  const queryLower = query.toLowerCase().trim();
  
  // Basic keyword extraction and expansion
  let keywords = queryLower.split(/\s+/).filter(word => word.length > 2);
  
  // Handle Norwegian slang and variations
  const normalizedKeywords = keywords.map(word => {
    // Handle "alaget" slang
    if (word === 'alaget' || word === 'alagspillere') {
      return 'a-laget';
    }
    // Handle age questions
    if (word === 'gammel' || word === 'alder') {
      return 'fødsel';
    }
    return word;
  });
  
  // Add common football-related terms
  const footballTerms = [];
  
  // A-lag related
  if (queryLower.includes('alaget') || queryLower.includes('alagspillere') || 
      queryLower.includes('a-laget') || queryLower.includes('lag') || queryLower.includes('spillere')) {
    footballTerms.push('a-laget', 'spillere', 'truppen', 'lag');
  }
  
  // Match/fixture related
  if (queryLower.includes('kamp') || queryLower.includes('neste')) {
    footballTerms.push('terminliste', 'kamper', 'program');
  }
  
  // Statistics and results
  if (queryLower.includes('poeng') || queryLower.includes('tabell') || 
      queryLower.includes('seiere') || queryLower.includes('tap') ||
      queryLower.includes('mål') || queryLower.includes('scoret')) {
    footballTerms.push('resultater', 'tabell', 'poeng', 'seiere', 'tap', 'uavgjort', 'mål', 'statistikk');
  }
  
  // Age questions
  if (queryLower.includes('gammel') || queryLower.includes('alder') || 
      queryLower.includes('år') || queryLower.includes('født')) {
    footballTerms.push('fødsel', 'alder', 'spillere');
  }
  
  // Youth teams
  if (queryLower.includes('ungdomslag') || queryLower.includes('utviklingslag')) {
    footballTerms.push('utviklingslag', 'g19', 'g16', 'g15', 'g14', 'g13');
  }
  
  // OBOS Akademi specific handling
  if (queryLower.includes('obos') && queryLower.includes('akademi')) {
    if (queryLower.includes('akademi+') || queryLower.includes('plus')) {
      footballTerms.push('akademi+', 'plus', 'ekstra');
    } else {
      footballTerms.push('akademi', 'obos');
    }
  }
  
  // A-lag specific handling
  if (queryLower.includes('a-lag') || queryLower.includes('alag') || queryLower.includes('alaget')) {
    footballTerms.push('a-laget', 'spillere', 'truppen', 'lag');
  }
  
  const searchTerms = [...new Set([...normalizedKeywords, ...footballTerms])];
  
  return {
    original: query,
    searchTerms: searchTerms,
    method: 'fallback'
  };
}

/**
 * Search chunks with AI-powered query understanding and simple text matching
 */
async function searchChunks(metadata, query, maxResults = 1) {
  try {
    // Use AI to understand the query and generate search terms
    const queryData = await aiQueryUnderstanding(query);
    console.log('🤖 AI Query Understanding:', {
      original: queryData.original,
      searchTerms: queryData.searchTerms,
      method: queryData.method
    });
    
    const allResults = new Map();
    
    // Search with each AI-generated term
    for (const searchTerm of queryData.searchTerms) {
      if (!searchTerm.trim()) continue;
      
      const queryLower = searchTerm.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
      
      for (const [chunkId, data] of Object.entries(metadata)) {
        const content = (data.content || '').toLowerCase();
        const title = (data.title || '').toLowerCase();
        
        // Calculate relevance score
        let score = 0;
        
        // URL matches are most important for specific topics
        if (data.url && data.url.toLowerCase().includes(queryLower)) {
          score += 5; // Increased from 1 to 5 for better URL matching
        }
        
        // URL path matching for specific terms
        if (data.url) {
          const urlPath = data.url.toLowerCase();
          // Special scoring for important pages
          if (urlPath.includes('/akademi') && (queryLower.includes('akademi') || queryLower.includes('obos'))) {
            score += 10; // High priority for OBOS Akademi page
          }
          if (urlPath.includes('/lag') && (queryLower.includes('a-lag') || queryLower.includes('alag') || queryLower.includes('alaget') || queryLower.includes('spillere'))) {
            score += 10; // High priority for lag page
          }
          if (urlPath.includes('/terminliste') && (queryLower.includes('kamp') || queryLower.includes('termin'))) {
            score += 10; // High priority for terminliste page
          }
        }
        
        // Title matches are important but less than URL
        if (title.includes(queryLower)) {
          score += 3;
        }
        
        // Word-by-word matching in title
        queryWords.forEach(word => {
          if (title.includes(word)) {
            score += 2;
          }
        });
        
        // Content matches
        const contentMatches = (content.match(new RegExp(queryLower, 'g')) || []).length;
        score += contentMatches * 0.5;
        
        // Word-by-word matching in content
        queryWords.forEach(word => {
          const wordMatches = (content.match(new RegExp(word, 'g')) || []).length;
          score += wordMatches * 0.3;
        });
        
        // Bonus for exact phrase matches
        if (content.includes(queryLower)) {
          score += 1;
        }
        
        if (score > 0) {
          if (!allResults.has(chunkId)) {
            allResults.set(chunkId, {
              chunkId,
              score,
              metadata: data,
              searchTerm
            });
          } else {
            // Boost score if found by multiple terms
            const existing = allResults.get(chunkId);
            existing.score = Math.max(existing.score, score * 1.2);
          }
        }
      }
    }
    
    // Sort by score and return top results
    return Array.from(allResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
      
  } catch (error) {
    console.error('Search error:', error.message);
    return [];
  }
}

/**
 * Build context from search results
 */
function buildContext(searchResults) {
  if (searchResults.length === 0) {
    return {
      context: '',
      sources: []
    };
  }
  
  // Sort by relevance score and build structured context
  const sortedResults = searchResults
    .filter((result) => {
      const metadata = result.metadata;
      // Filter out sources with empty or invalid content
      return metadata.content && 
             metadata.content.trim().length > 20 && // Minimum content length
             !metadata.content.includes('javascript:void(0)') && // Remove navigation elements
             !metadata.content.match(/^[\s\-\•\n]+$/); // Remove content that's only formatting
    })
    .sort((a, b) => b.score - a.score);
  
  const context = sortedResults.map((result, index) => {
    const metadata = result.metadata;
    let title = metadata.title || 'Ukjent tittel';
    
    // Create better title from URL if title is "Parse Error"
    if (title === 'Parse Error' && metadata.url) {
      const urlParts = metadata.url.split('/').filter(part => part.length > 0);
      if (urlParts.length > 0) {
        const lastPart = urlParts[urlParts.length - 1];
        title = lastPart.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      }
    }
    
    const content = metadata.content || '';
    const url = metadata.url || '#';
    
    return `[KILDE ${index + 1}] ${title}
URL: ${url}
RELEVANSSKORE: ${result.score.toFixed(2)}

INNHOLD:
${content}

---`;
  }).join('\n\n');
  
  const sources = sortedResults.map((result, index) => {
    const metadata = result.metadata;
    let title = metadata.title || 'Ukjent tittel';
    
    // Create better title from URL if title is "Parse Error"
    if (title === 'Parse Error' && metadata.url) {
      const urlParts = metadata.url.split('/').filter(part => part.length > 0);
      if (urlParts.length > 0) {
        const lastPart = urlParts[urlParts.length - 1];
        title = lastPart.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      }
    }
    
    return {
      title: title,
      url: metadata.url || '#',
      score: result.score
    };
  });
  
  return { context, sources };
}

/**
 * Build enhanced system prompt with context
 */
function buildSystemPrompt(context, sources) {
  // Get current date and time in Norwegian format
  const now = new Date();
  const currentDate = now.toLocaleDateString('no-NO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const currentTime = now.toLocaleTimeString('no-NO', {
    hour: '2-digit',
    minute: '2-digit'
  });
  const currentDateTime = `${currentDate} kl. ${currentTime}`;

  let systemPrompt = `Du er Askerbot – Asker Fotballs digitale assistent.

AKTUELL DATO OG TID: ${currentDateTime}

GRUNNLEGGENDE REGLER:
- Baser svar kun på informasjon fra kunnskapsbasen nedenfor
- Hvis informasjonen ikke finnes, si det tydelig
- Ikke oppfinn eller finn på informasjon som ikke er nevnt
- Vær nøyaktig og presis med fakta fra kunnskapsbasen

SVARSTIL:
- Svar på norsk med vennlig, men direkte tone
- Hold svaret kort - maksimalt 3-4 linjer
- Bruk linjeskift (\n) for å dele opp svar - IKKE bruk markdown-styling
- Hvis informasjonen mangler, si: "Uffda, her ble jeg stående uvitende i offside, prøv denne lenken eller endre spørsmålet!"

TABELLER OG STATISTIKK:
- Når du leser tabeller, vær nøyaktig med tall og data
- For spørsmål om poeng, seiere, tap eller mål: Finn riktig linje i tabellen for Asker
- I PostNord-ligaen tabellen: Asker er siste lag (linje 14) - sjekk kolonnene nøye for riktige tall
- For målstatistikk: Se etter kolonner med "+" (mål for) og "-" (mål mot)

SPILLERE OG ALDER:
- For aldersspørsmål: Se etter fødselsdatoer i spilleroppstillinger
- Regn ut alderen basert på fødselsdato og nåværende år
- Hvis fødselsdato ikke er tilgjengelig, si at du ikke har denne informasjonen

UNGDOMSLAG OG AKADEMI:
- For "ungdomslag" eller "utviklingslag": Gi kort oversikt over tilgjengelige lag
- For "OBOS Akademi": Fokuser på hovedakademiet for 7-13 åringer
- For "OBOS Akademi+": Dette er for de ekstra ivrige
- Hold svaret kort og fokuser på hovedinformasjonen`;

  if (context && context.trim()) {
    systemPrompt += `\n\nDU HAR TILGANG TIL FØLGENDE INFORMASJON FRA ASKER FOTBALL:\n\n${context}`;
    
    if (ragPolicy.alwaysCite && sources.length > 0) {
      systemPrompt += `\n\nVIGTIG: Ikke inkluder referanser som [Kilde X] eller URLs i svaret ditt. Kilder vil bli vist separat.`;
    }
  } else {
    systemPrompt += `\n\nFALLBACK: Hvis du ikke finner relevant informasjon i kunnskapsbasen, svar: "${ragPolicy.fallbackOnUncertain}"`;
  }
  
  return systemPrompt;
}

exports.handler = async (event, context) => {
  // Kun tillat POST-forespørsler
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // Håndter CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    // Parse melding fra request body
    const body = JSON.parse(event.body);
    const { message, messages } = body;
    
    // Støtt både ny format (messages array) og gammel format (message string)
    let messageToSend;
    if (messages && Array.isArray(messages)) {
      // Ny format: ta den siste brukermeldingen
      const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
      if (!lastUserMessage) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: 'No user message found in messages array' })
        };
      }
      messageToSend = lastUserMessage.content;
    } else if (message && typeof message === 'string') {
      // Gammel format: direkte message string
      messageToSend = message;
    } else {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Message or messages is required' })
      };
    }

    // FAQ CHECK: Check for predefined responses first
    console.log('🔍 Checking FAQ for:', messageToSend);
    const faqResponse = checkFAQ(messageToSend);

    if (faqResponse) {
      console.log('✅ FAQ match found, returning predefined response');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ 
          reply: faqResponse.reply,
          sources: faqResponse.sources || [faqResponse.source],
          usage: null,
          ragUsed: false,
          faqUsed: true
        })
      };
    }

    // RAG RETRIEVAL: Søk i kunnskapsbasen
    console.log('🔍 Searching knowledge base for:', messageToSend);
    
    let searchResults = [];
    let sources = [];
    
    try {
      // Load chunk metadata
      const metadata = loadChunkMetadata();
      
      if (metadata) {
        // Search chunks with AI-powered understanding
        searchResults = await searchChunks(metadata, messageToSend, ragPolicy.maxSources);
        console.log(`📊 Search found ${searchResults.length} results`);
        
        // Build context and sources
        const contextData = buildContext(searchResults);
        sources = contextData.sources;
        
        if (contextData.context) {
          console.log('📝 Context built with', sources.length, 'sources');
        } else {
          console.log('⚠️ No relevant context found');
        }
      } else {
        console.warn('⚠️ Chunk metadata not available, proceeding without RAG');
      }
    } catch (ragError) {
      console.error('❌ RAG retrieval failed:', ragError.message);
      // Continue without RAG if retrieval fails
    }

    // Sjekk at API-nøkkel er tilgjengelig
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY environment variable is not set');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Service configuration error' })
      };
    }

    // If no relevant sources found, return fallback message with helpful context
    if (sources.length === 0) {
      const fallbackMessage = `Uffda, her ble jeg stående uvitende i offside, prøv denne lenken eller endre spørsmålet!

Kontakt klubben direkte på askerfotball.no/kontakt/ for nøyaktig informasjon.`;

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ 
          reply: fallbackMessage,
          sources: [],
          usage: null,
          ragUsed: false,
          fallbackReason: 'no_relevant_sources'
        })
      };
    }

    // Build enhanced system prompt with RAG context
    const systemPrompt = buildSystemPrompt(searchResults.map((result, index) => {
      const metadata = result.metadata;
      let title = metadata.title || 'Ukjent tittel';
      
      // Create better title from URL if title is "Parse Error"
      if (title === 'Parse Error' && metadata.url) {
        const urlParts = metadata.url.split('/').filter(part => part.length > 0);
        if (urlParts.length > 0) {
          const lastPart = urlParts[urlParts.length - 1];
          title = lastPart.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
        }
      }
      
      return `[Kilde ${index + 1}] ${title}\n${metadata.content || ''}`;
    }).join('\n\n'), sources);
    
    console.log('🤖 Sending to OpenAI with context:', sources.length > 0 ? `${sources.length} sources` : 'no context');

    // Kall OpenAI API med RAG-kontekst
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: messageToSend
          }
        ],
        max_tokens: 200, /* Reduced from 400 to 200 for shorter responses */
        temperature: 0.3,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      
      let errorMessage = 'Kunne ikke få svar fra AI-assistenten. Prøv igjen senere.';
      
      if (openaiResponse.status === 401) {
        errorMessage = 'API-nøkkel er ugyldig. Kontakt systemadministrator.';
      } else if (openaiResponse.status === 429) {
        errorMessage = 'For mange forespørsler. Prøv igjen om noen minutter.';
      } else if (openaiResponse.status === 500) {
        errorMessage = 'OpenAI-tjenesten har midlertidige problemer. Prøv igjen senere.';
      }
      
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? errorData : undefined,
          statusCode: openaiResponse.status
        })
      };
    }

    const data = await openaiResponse.json();
    
    // Hent svar fra OpenAI
    const reply = data.choices?.[0]?.message?.content;
    
    if (!reply) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Uventet svar fra AI-assistenten' })
      };
    }

    // Returner svar med kilder
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ 
        reply: reply.trim(),
        sources: sources,
        usage: data.usage,
        ragUsed: sources.length > 0
      })
    };

  } catch (error) {
    console.error('Chat function error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'En feil oppstod. Prøv igjen senere.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};