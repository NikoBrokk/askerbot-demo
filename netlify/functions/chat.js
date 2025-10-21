/**
 * Optimized Netlify Function for Askerbot with embedded knowledge base
 * Embeds essential data directly in the function to avoid file access issues
 */

// Enhanced caching with multiple layers
const responseCache = new Map();
const searchCache = new Map();
const aiAnalysisCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const SEARCH_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const AI_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get cached response if available and not expired
 */
function getCachedResponse(query) {
  const normalizedQuery = query.toLowerCase().trim();
  const cached = responseCache.get(normalizedQuery);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('✅ Cache hit for:', normalizedQuery);
    return cached.response;
  }
  
  return null;
}

/**
 * Cache a response
 */
function setCachedResponse(query, response) {
  const normalizedQuery = query.toLowerCase().trim();
  responseCache.set(normalizedQuery, {
    response,
    timestamp: Date.now()
  });
  
  // Limit cache size to 100 entries
  if (responseCache.size > 100) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
}

// BM25 Integration for enhanced source retrieval
const fs = require('fs');
const path = require('path');
const bm25 = require('wink-bm25-text-search');

let bm25Engine = null;
let chunkMetadata = null;
let bm25Initialized = false;

function initializeBM25() {
  if (bm25Engine && bm25Initialized) return bm25Engine;
  
  try {
    const indexPath = path.join(__dirname, '../../storage/index/bm25/bm25-index.json');
    const metadataPath = path.join(__dirname, '../../storage/index/bm25/chunk-metadata.json');
    
    // Check cache first
    const cacheKey = 'bm25_data';
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
      bm25Engine = cached.engine;
      chunkMetadata = cached.metadata;
      bm25Initialized = true;
      return bm25Engine;
    }
    
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    chunkMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    
    bm25Engine = bm25();
    bm25Engine.importJSON(indexData);
    
    // Cache the initialized data
    searchCache.set(cacheKey, {
      engine: bm25Engine,
      metadata: chunkMetadata,
      timestamp: Date.now()
    });
    
    bm25Initialized = true;
    console.log('BM25 index loaded and cached successfully with', Object.keys(chunkMetadata).length, 'chunks');
    return bm25Engine;
  } catch (error) {
    console.error('Failed to load BM25 index:', error.message);
    return null;
  }
}

/**
 * Enhanced query preprocessing with optional AI assistance
 */
async function preprocessQuery(query, useAI = false, apiKey = null) {
  // Basic preprocessing
  let processedQuery = query
    .toLowerCase()
    .replace(/[^\wæøå\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .join(' ');
  
  // If AI requested and available, enhance preprocessing
  if (useAI && apiKey) {
    try {
      // First try local pattern matching
      const localAnalysis = quickQueryAnalysis(query);
      if (!localAnalysis) {
        // Only use AI if local patterns fail
        const aiAnalysis = await analyzeQueryWithAI(query, apiKey);
        if (aiAnalysis && aiAnalysis.search_terms) {
          // Use AI-generated search terms
          processedQuery = aiAnalysis.search_terms.join(' ');
        }
      }
    } catch (error) {
      console.error('AI preprocessing failed, using basic:', error);
    }
  }
  
  return processedQuery;
}

/**
 * Enhanced semantic relevance calculation with AI analysis support
 */
function calculateSemanticRelevance(query, chunk, aiAnalysis = null) {
  const queryWords = preprocessQuery(query).split(' ');
  const chunkText = (chunk.title + ' ' + chunk.content).toLowerCase();
  
  let semanticScore = 0;
  
  // Use AI analysis if available
  if (aiAnalysis && aiAnalysis.search_terms) {
    aiAnalysis.search_terms.forEach(term => {
      if (chunkText.includes(term.toLowerCase())) {
        semanticScore += 15; // Higher weight for AI-generated terms
      }
    });
    
    // Check semantic variants
    if (aiAnalysis.semantic_variants) {
      aiAnalysis.semantic_variants.forEach(variant => {
        if (chunkText.includes(variant.toLowerCase())) {
          semanticScore += 10;
        }
      });
    }
  }
  
  // Fallback to existing synonym matching
  const synonyms = {
    'pris': ['kostnad', 'betaling', 'penger', 'kr', 'kontingent'],
    'kontakt': ['telefon', 'e-post', 'epost', 'ring'],
    'trener': ['coach', 'hovedtrener', 'assistenttrener'],
    'akademi': ['skole', 'opplæring', 'utvikling', 'OBOS'],
    'stadion': ['bane', 'felt', 'arena', 'Føyka'],
    'terminliste': ['kamper', 'program', 'neste kamp', 'fixture'],
    'dugnad': ['frivillig', 'hjelpe', 'bidra'],
    'historie': ['klubbens historie', 'askerfotballens historie', 'klubbhistorie', 'fotballhistorie', 'tradisjon', 'opprinnelse', 'grunnlagt', 'etablert'],
    // Team mapping improvements - corrected for URL vs actual age discrepancy
    'g14': ['gutter 14', 'g14-laget', 'g14 laget', 'gutter-14', 'gutter14'],
    'g13': ['gutter 13', 'g13-laget', 'g13 laget', 'gutter-13', 'gutter13'],
    'g15': ['gutter 15', 'g15-laget', 'g15 laget', 'gutter-15', 'gutter15'],
    'g16': ['gutter 16', 'g16-laget', 'g16 laget', 'gutter-16', 'gutter16'],
    'app': ['applikasjon', 'mobilapp', 'telefonapp', 'nlf', 'minfotball']
  };
  
  queryWords.forEach(word => {
    // Exact match
    if (chunkText.includes(word)) {
      semanticScore += 10;
    }
    
    // Synonym match
    Object.entries(synonyms).forEach(([key, values]) => {
      if (word === key || values.includes(word)) {
        values.forEach(synonym => {
          if (chunkText.includes(synonym)) semanticScore += 5;
        });
      }
    });
  });
  
  return Math.min(100, semanticScore);
}

/**
 * AI-powered query analysis with caching
 */
async function analyzeQueryWithAI(query, apiKey) {
  const cacheKey = `ai_${query.toLowerCase().trim()}`;
  const cached = aiAnalysisCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < AI_CACHE_TTL) {
    console.log('🧠 AI Analysis cache hit for:', query);
    return cached.analysis;
  }
  
  try {
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
            content: `Du er en ekspert på å analysere norske spørsmål om fotballklubber og transformere dem til optimale søketermer.

OPPGAVE: Analyser brukerens spørsmål og generer en strukturert analyse som maksimalt utnytter eksisterende knowledge chunks.

EKSISTERENDE KNOWLEDGE CHUNKS inkluderer:
- OBOS Akademi (priser, påmelding, alder 7-13)
- Trenere (A-lag, G15, G14, G13, hovedtrenere, assistenter)
- Stadion (Føyka, parkering, åpningstider)
- Kontakt (e-post, telefon, ansatte)
- Lag (A-lag, samfunnslag, utviklingslag)
- Priser (medlemskap, kontingent, betaling)
- Programmer (akademi+, camp, dugnad)
- Praktisk info (terminliste, påmelding, booking)

VIKTIG: Skille mellom spillerstall og kampprogram:
- "Hvem er på A-laget?" = spillerstall/tropp
- "Når spiller A-laget?" = terminliste/kampprogram
- "Hvem er treneren?" = trenerteam
- "Når er neste kamp?" = terminliste

SVAR FORMAT (JSON):
{
  "intent": "hovedintensjon",
  "entities": ["viktige_entiteter"],
  "search_terms": ["optimale_søketermer"],
  "semantic_variants": ["alternative_formuleringer"],
  "context_clues": ["kontekstuelle_ledetråder"],
  "confidence": 0.95
}

REGEL: Fokuser på termer som matcher eksisterende chunk-titler og innhold.`
          },
          {
            role: 'user',
            content: `Analyser dette spørsmålet: "${query}"`
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      })
    });

    if (response.ok) {
      const data = await response.json();
      const analysisText = data.choices?.[0]?.message?.content;
      if (analysisText) {
        try {
          const analysis = JSON.parse(analysisText);
          
          // Cache the analysis
          aiAnalysisCache.set(cacheKey, {
            analysis,
            timestamp: Date.now()
          });
          
          console.log('🧠 AI Analysis successful and cached:', analysis);
          return analysis;
        } catch (parseError) {
          console.error('Failed to parse AI analysis JSON:', parseError);
        }
      }
    }
  } catch (error) {
    console.error('AI query analysis failed:', error);
  }
  
  // Fallback to existing quickQueryAnalysis
  return quickQueryAnalysis(query);
}

/**
 * Generate comprehensive search terms from AI analysis
 */
function generateSearchTerms(aiAnalysis, originalQuery) {
  const searchTerms = new Set();
  
  // Add original query
  searchTerms.add(originalQuery.toLowerCase());
  
  // Add AI-generated search terms
  if (aiAnalysis && aiAnalysis.search_terms) {
    aiAnalysis.search_terms.forEach(term => searchTerms.add(term.toLowerCase()));
  }
  
  // Add semantic variants
  if (aiAnalysis && aiAnalysis.semantic_variants) {
    aiAnalysis.semantic_variants.forEach(variant => searchTerms.add(variant.toLowerCase()));
  }
  
  // Add entities
  if (aiAnalysis && aiAnalysis.entities) {
    aiAnalysis.entities.forEach(entity => searchTerms.add(entity.toLowerCase()));
  }
  
  return Array.from(searchTerms);
}

async function searchBM25(query, limit = 3, apiKey = null) {
  const engine = initializeBM25();
  if (!engine) return [];
  
  // Check search cache first
  const searchCacheKey = `search_${query.toLowerCase().trim()}`;
  const cachedSearch = searchCache.get(searchCacheKey);
  if (cachedSearch && Date.now() - cachedSearch.timestamp < SEARCH_CACHE_TTL) {
    console.log('🔍 Search cache hit for:', query);
    return cachedSearch.results;
  }
  
  try {
    const processedQuery = await preprocessQuery(query);
    const results = engine.search(processedQuery, limit * 2); // Get more results for filtering
    
    // Check if initial results are poor (low scores)
    const hasGoodResults = results.length > 0 && results[0][1] > 0.5;
    
    // Get AI analysis if API key available and results are poor or query is complex
    let aiAnalysis = null;
    const shouldUseAI = apiKey && (
      !hasGoodResults || // Poor initial results
      query.length > 30 || // Complex queries
      /[æøå]/.test(query) && query.length < 20 || // Short Norwegian queries (likely typos)
      query.includes('?') && query.split(' ').length > 5 // Complex questions
    );
    
    if (shouldUseAI) {
      aiAnalysis = await analyzeQueryWithAI(query, apiKey);
    }
    
    // If we have AI analysis, generate comprehensive search terms
    let searchTerms = [processedQuery];
    if (aiAnalysis) {
      searchTerms = generateSearchTerms(aiAnalysis, query);
      console.log('🔍 AI-enhanced search terms:', searchTerms);
    }
    
    // Search with all terms
    const allResults = new Map();
    
    for (const searchTerm of searchTerms) {
      const termResults = engine.search(searchTerm, limit * 2);
      termResults.forEach(([chunkId, score]) => {
        if (!allResults.has(chunkId)) {
          allResults.set(chunkId, { score: 0, terms: [] });
        }
        allResults.get(chunkId).score += score;
        allResults.get(chunkId).terms.push(searchTerm);
      });
    }
    
    // Convert to array and enhance with semantic scoring
    const enhancedResults = Array.from(allResults.entries()).map(([chunkId, data]) => {
      const chunk = chunkMetadata[chunkId];
      if (!chunk) return null;
      
      const semanticScore = calculateSemanticRelevance(query, chunk, aiAnalysis);
      const combinedScore = (data.score * 10) + semanticScore;
      const relevance = calculateRelevance(query, chunk);
      
      return {
        title: chunk.title,
        url: chunk.url,
        content: chunk.content,
        score: combinedScore,
        relevance: relevance,
        bm25Score: data.score,
        semanticScore: semanticScore,
        matchedTerms: data.terms,
        aiAnalysis: aiAnalysis
      };
    }).filter(r => r && r.relevance > (aiAnalysis ? 0.3 : 0.4)) // Lower threshold for AI-enhanced search
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    // Cache the search results
    searchCache.set(searchCacheKey, {
      results: enhancedResults,
      timestamp: Date.now()
    });
    
    return enhancedResults;
  } catch (error) {
    console.error('BM25 search failed:', error.message);
    return [];
  }
}

function calculateRelevance(query, chunk) {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const chunkText = (chunk.title + ' ' + chunk.content).toLowerCase();
  
  let matches = 0;
  let weightedScore = 0;
  
  // Enhanced relevance calculation with weighted scoring
  for (const word of queryWords) {
    if (chunkText.includes(word)) {
      matches++;
      // Weight title matches higher than content matches
      if (chunk.title.toLowerCase().includes(word)) {
        weightedScore += 3;
      } else {
        weightedScore += 1;
      }
    }
  }
  
  // Boost score for exact phrase matches
  const queryPhrase = query.toLowerCase();
  if (chunkText.includes(queryPhrase)) {
    weightedScore += 5;
  }
  
  // Apply priority boost based on content type and age
  let priorityBoost = 1.0;
  
  if (chunk.type === 'static') {
    priorityBoost = 1.0; // Statiske sider er utgangspunktet
  } else if (chunk.type === 'news') {
    // Beregn aldersbasert score for nyhetsartikler
    priorityBoost = calculateNewsPriority(chunk);
  }
  
  // Apply explicit priority if available (overrides type-based calculation)
  if (chunk.priority && typeof chunk.priority === 'number') {
    priorityBoost = chunk.priority;
  }
  
  // Return weighted relevance score (0-1 scale) with priority boost
  const baseScore = queryWords.length > 0 ? matches / queryWords.length : 0;
  const weightedRelevance = Math.min(1, weightedScore / (queryWords.length * 2 + 5));
  const finalScore = Math.max(baseScore, weightedRelevance) * priorityBoost;
  
  return Math.min(1, finalScore); // Cap at 1.0
}

/**
 * Calculate priority score for news articles based on age
 * Fresh articles (0-7 days): 1.0
 * Recent articles (8-14 days): 0.8
 * Older articles (15-30 days): 0.6
 * Very old articles (>30 days): 0.4
 */
function calculateNewsPriority(chunk) {
  if (!chunk.published_at) {
    return 0.8; // Default for articles without date
  }
  
  const publishedDate = new Date(chunk.published_at);
  const now = new Date();
  const daysOld = Math.floor((now - publishedDate) / (1000 * 60 * 60 * 24));
  
  if (daysOld <= 7) {
    return 1.0; // Fresh articles get full priority
  } else if (daysOld <= 14) {
    return 0.8; // Recent articles
  } else if (daysOld <= 30) {
    return 0.6; // Older articles
  } else {
    return 0.4; // Very old articles
  }
}

// Enhanced embedded knowledge base with comprehensive coverage
const EMBEDDED_KNOWLEDGE = {
  "klubb_info": {
    "title": "Om klubben",
    "content": "Asker Fotball er fotballklubben i Asker. Klubben spiller på Føyka stadion og har både A-lag og ungdomslag. Klubben er sponset av OBOS og har et sterkt fokus på ungdomsutvikling.",
    "url": "https://askerfotball.no"
  },
  "akademi_info": {
    "title": "OBOS Akademi - pris, kostnad og påmelding",
    "content": "OBOS Akademi er et fotballakademi for jenter og gutter i alderen 7-13 år. Det følger skoleruta og tar kun fri på skolens fridager. Man kan delta fra 1-5 dager per uke. Pris: 955,- til 2500,- per måned avhengig av antall dager. Akademiet fokuserer på teknisk utvikling og fotballglede. Påmelding: https://app.rubic.no/Public/Events/33825",
    "url": "https://askerfotball.no/lag/utviklingslag/akademi"
  },
  "akademi_plus": {
    "title": "OBOS Akademi+",
    "content": "OBOS Akademi+ er for de ekstra ivrige fotballspillerne. Dette er en intensiv variant av akademiet for barn som ønsker mer trening og utvikling. Kontakt lars.henrik@askerfotball.no for mer informasjon om Akademi+.",
    "url": "https://askerfotball.no/nyheter/velkommen-til-obos-akademi"
  },
  "trenere": {
    "title": "Trenere A-laget - hovedtrener og assistenttrenere",
    "content": "Hovedtrener: Magnus Bredal. Assistenttrener: Bård Heggset. Keepertrener: Ismet Duracak. Analyseansvarlig: Jakob Lillestjerna. Medisinsk ansvarlig: Alain Antonio Astudillo.",
    "url": "https://askerfotball.no/lag"
  },
  "stadion": {
    "title": "Føyka stadion - hvor ligger stadion",
    "content": "Stadion ligger på Føyka, Asker. Det er et kunstgressbane som brukes av Asker Fotball. Stadion har også Fotballhuset med garderober og klubbhus. Adresse: Føyka, Asker.",
    "url": "https://askerfotball.no/om-stadion"
  },
  "fotballhuset": {
    "title": "Fotballhuset åpningstider - når åpent lukket",
    "content": "Fotballhuset er stedet du kan handle supporterutstyr og klubbkolleksjonen vår. Her ligger supporter-butikken der du kan treffe ansatte i Asker Fotball. Ta gjerne turen innom for en hyggelig fotballprat og en kaffekopp. Åpningstider: Man-Fre 08.00-20.00, Lørdag 10.00-14:00, Søndag 10.00-14.00",
    "url": "https://askerfotball.no/om-stadion/fotballhuset"
  },
  "parkering": {
    "title": "Parkering på Føyka - hvor parkere bil",
    "content": "Du kan parkere mot avgift nedenfor stadion på Føyka. Husk synlig billett i vinduet.",
    "url": "https://askerfotball.no/om-stadion/slik-finner-du-frem"
  },
  "kontakt": {
    "title": "Kontakt klubben - e-post telefon daglig leder",
    "content": "Administrasjon: Rolf-Magne Walstad - Daglig og sportslig leder (walstad@askerfotball.no). Morten Sommerfeldt - Markedsansvarlig (morten@askerfotball.no, +47 907 51 170). Generelt: post@askerfotball.no",
    "url": "https://askerfotball.no/om-klubben/ansatte"
  },
  "lag_struktur": {
    "title": "Lag og struktur",
    "content": "Asker Fotball har A-lag, samfunnslag og utviklingslag. A-laget spiller i sin respektive divisjon. Samfunnslagene inkluderer Asker United (junior og senior), Gatelaget (stiftet 2013, et av de mest rutinerte lagene i landet), og Hæppe (nysatsing for ungdom, forebygging av utenforskap). Utviklingslagene inkluderer OBOS Akademi for barn 7-13 år.",
    "url": "https://askerfotball.no/lag"
  },
  "asker_united": {
    "title": "Asker United - samfunnslag finnes det",
    "content": "Asker United er en del av Asker Fotballs samfunnsprosjekt. Vi har to lag (junior og senior) som begge deltar i serie og cupspill gjennom sesongen. Lagene trener en gang i uken ute, inkludert kamp, og en gang om vinteren inne i Drengsrudhallen. Trenere: Henrik Vister og Oddvar Høiholdt.",
    "url": "https://askerfotball.no/lag/samfunn/asker-united"
  },
  "priser_medlemskap": {
    "title": "Priser medlemskap - hva koster kostnad",
    "content": "OBOS Akademi koster 955,- til 2500,- per måned avhengig av antall dager. For oppdaterte priser og medlemskap, kontakt klubben direkte på post@askerfotball.no eller ring +47 907 51 170.",
    "url": "https://askerfotball.no"
  },
  "spillere_a_lag": {
    "title": "Spillere A-laget - tropp og spillertropp",
    "content": "A-laget har en sterk spillertropp med både erfarne og unge spillere. Blant spillerne finner du keepere som Oskar Slotta Karlsen og Sigurd Olav Normann, forsvarsspillere som Jonas Skulstad og Joachim Prent-Eckbo, midtbanespillere som Mohammed Jatta og Jimmy Kenyi, og angrepsspillere som Jens-Erik Johansen og Lansana Sesay.",
    "url": "https://askerfotball.no/lag"
  },
  "lag_oversikt": {
    "title": "Lagoversikt - hvor mange lag har klubben",
    "content": "Asker Fotball har flere lag på ulike nivåer: A-lag (senior), samfunnslag (Asker United), og utviklingslag (OBOS Akademi, G13, G14, G15, G19). Klubben har et variert tilbud for spillere på alle nivåer fra barn til voksne.",
    "url": "https://askerfotball.no/lag"
  },
  "solidaritetsfond": {
    "title": "Solidaritetsfondet - finnes solidaritetsfond",
    "content": "Asker fotball har etablert Solidaritetsfond som skal gi mulighet for støtte i en økonomisk krevende situasjon med mål om å finne løsninger sammen med familiene uten å fullfinansiere deltagelsen. Fondet skal bidra til å helt eller delvis dekke deltakerkostnader for barn og ungdom i egen klubb. Kontakt sportslig leder: walstad@askerfotball.no",
    "url": "https://askerfotball.no/om-klubben/solidaritetsfondet"
  },
  "varsling": {
    "title": "Varsling bekymringsmelding - hvor sender jeg",
    "content": "For varsling av uønskede hendelser i klubben, bekymringsmeldinger eller avvik, kontakt klubben på post@askerfotball.no. Alle varsler er beskyttet av personvern og vil bli behandlet deretter.",
    "url": "https://askerfotball.no/om-klubben/varslingsknapp-asker-fotball"
  },
  "to_steg_frem": {
    "title": "To Skritt Frem - klubbens sportsplan",
    "content": "To Skritt Frem er Asker Fotballs program for livsmestring og folkehelse. Programmet handler om å styrke sosiale og emosjonelle ferdigheter og bygge god psykisk helse for alle aktører innenfor idretten. Målet er å utvikle bedre idrettsutøvere og mennesker. Klubben vil styrke den sosiale kompetansen blant ansatte, trenere, lagledere, utøvere og foresatte.",
    "url": "https://askerfotball.no/om-klubben/to-steg-frem"
  },
  "styret": {
    "title": "Styret i Asker Fotball - daglig leder",
    "content": "Styreleder: Ulrik Arneberg (ulrik@profildesign.no). Nestleder: Espen Falck (espen@profildesign.no). Styremedlemmer: Aksel Svensson, Marie Grønnestad, Espen Røisland, Vegard Dokken, Jannicke B Nilsen.",
    "url": "https://askerfotball.no/om-klubben/styret-asker-fotball"
  },
  "historie": {
    "title": "Askerfotballens historie",
    "content": "Asker Fotball har en rik historie som strekker seg tilbake til 1898 da fotballen begynte å rulle ved Hartmanns pensjonatskole på Hvalstad. Asker Idrettsforening tok sporten videre i mer organisert form i 1913, og i 1923 fusjonerte foreningen med Asker skiklubb. Klubben har gjennomgått flere endringer og har vært en viktig del av lokalsamfunnet i over 125 år. Tidligere styreleder Erik Berg har dokumentert denne historien i et jubileumshefte som kan bestilles.",
    "url": "https://askerfotball.no/nyheter/askerfotballen-historie"
  },
  "obos_camp": {
    "title": "OBOS Camp - sommerleir",
    "content": "Asker Skiklubb og Asker Fotball arrangerer OBOS Camp på Føyka og Risenga kunstgress i uke 26, 32 og 33. Uke 26 (23.-27.juni) (Pris. 1.990 kr), Uke 32 (4.-7.august) (OBS:10-14 år) (Pris - 1590 kr), Uke 33 (11-15.august) (Pris 1.990 kr). Alder: 6-14 år. Sted: Føyka, Asker Idrettspark og Risenga Kunstgress. Prisen inkluderer: Frukt, smoothie, OBOS t-skjorte og shorts og egen OBOS ball. Ved spørsmål kontakt: Lars Henrik Dahl, epost lars.henrik@askerfotball.no mobil 948 36 704",
    "url": "https://askerfotball.no/nyheter/sommerens-beste-eventyr-obos-camp"
  },
  "utviklingslag_trenere": {
    "title": "Trenere på utviklingslagene",
    "content": "Utviklingslagene ledes av trenere som har de samme målene som klubben og treningsgruppene. Spillerutvikler: Svein Roger Pettersen - Sveinroger.pettersen@ntg.no - tlf.: 951 63 103. Gruppene er godt støttet av team med foresatte som backer trenerne.",
    "url": "https://askerfotball.no/lag/utviklingslag/om-utviklingslagene"
  },
  "terminliste": {
    "title": "Terminliste - A-lagets kamper",
    "content": "Terminlisten på askerfotball.no/terminliste viser A-lagets kommende kamper og kampprogram. For andre lag og aldersgrupper, kontakt lagleder eller trener direkte for å få terminliste.",
    "url": "https://askerfotball.no/terminliste"
  },
  "frivillig": {
    "title": "Frivillig arbeid",
    "content": "For å melde interesse for å bli frivillig på kampdag eller andre arrangementer, kontakt klubben på post@askerfotball.no eller ring +47 907 51 170. Vi setter stor pris på frivillig innsats!",
    "url": "https://askerfotball.no"
  },
  "booking_baner": {
    "title": "Booking av baner og anlegg",
    "content": "For å booke baner eller anlegg, kontakt klubben på post@askerfotball.no eller ring +47 907 51 170. Vi kan hjelpe deg med booking av Føyka stadion og andre fasiliteter.",
    "url": "https://askerfotball.no"
  },
  "retningslinjer": {
    "title": "Retningslinjer for barnefotball",
    "content": "Asker Fotball har retningslinjer for barnefotball som fokuserer på spillerutvikling og trivsel. Våre fire ledestjerner er: Ærlighet – Hardt arbeid – Ydmykhet – Laget først. For mer informasjon om retningslinjer, kontakt klubben på post@askerfotball.no.",
    "url": "https://askerfotball.no"
  },
  "sponsor": {
    "title": "Sponsormuligheter",
    "content": "For informasjon om sponsormuligheter, kontakt Morten Sommerfeldt (markedsansvarlig) på morten@askerfotball.no eller ring +47 907 51 170. Vi har flere sponsorpakker tilgjengelig.",
    "url": "https://askerfotball.no"
  },
  "klubbens_lover": {
    "title": "Klubbens lover",
    "content": "Asker Fotballs lover og reglement finnes på nettsiden. Dette inkluderer klubbens grunnleggende regler og retningslinjer for medlemmer.",
    "url": "https://askerfotball.no/om-klubben/klubbens-lover"
  },
  "g13_lag": {
    "title": "G14 lag (Gutter 14) - URL: gutter-13 - trenere",
    "content": "G14 laget har Lars Henrik Dahl som hovedtrener (lars.henrik@askerfotball.no), Erik Hejer som assistenttrener, og Knut Wangen som lagleder. For informasjon om spillere eller påmelding, kontakt en av trenerne direkte.",
    "url": "https://askerfotball.no/lag/utviklingslag/gutter-13"
  },
  "g14_lag": {
    "title": "G15 lag (Gutter 15) - URL: gutter-14 - trenere",
    "content": "G15 laget har Mathis Banggren som hovedtrener (Mathis@askerfotball.no), Eric Haugen som assistenttrener, Nikolai Brokhaug Gabrielsen som assistent trener, og Laurent Sauret (lsauret@hotmail.com). For informasjon om spillere eller påmelding, kontakt en av trenerne direkte.",
    "url": "https://askerfotball.no/lag/utviklingslag/gutter-14"
  },
  "g15_lag": {
    "title": "G16 lag (Gutter 16) - URL: gutter-15 - trenere",
    "content": "G16 laget har Fausto Ferreras Gromaz som hovedtrener (pocholadam@hotmail.com) og Per Christian Brandvik som lagleder. For informasjon om spillere eller påmelding, kontakt en av trenerne direkte.",
    "url": "https://askerfotball.no/lag/utviklingslag/gutter-15"
  },
  "g12_lag": {
    "title": "G12 lag (Gutter 12)",
    "content": "G12 laget er et utviklingslag for gutter i alderen 12 år. For informasjon om trenere og påmelding, kontakt klubben på post@askerfotball.no eller ring +47 907 51 170.",
    "url": "https://askerfotball.no/lag/utviklingslag"
  },
  "g16_lag": {
    "title": "G16 lag (Gutter 16)",
    "content": "G16 laget er et utviklingslag for gutter i alderen 16 år. For informasjon om trenere og påmelding, kontakt klubben på post@askerfotball.no eller ring +47 907 51 170.",
    "url": "https://askerfotball.no/lag/utviklingslag"
  },
  "g19_junior": {
    "title": "G19 Junior - trenere og støtteapparat",
    "content": "G19 Junior laget har et sterkt støtteapparat med Svein Roger Pettersen som hovedtrener, Jakob Lillestjerna som assistenttrener, Lars Skarholm som assistent trener, Øystein Gulliksen som lagleder (oey-gull@online.no), og Stjepan Vazon som lagleder (stjepan.vazon@kiwi.no). For informasjon om spillere eller påmelding, kontakt en av trenerne direkte.",
    "url": "https://askerfotball.no/lag/utviklingslag/g19-junior"
  },
  "2012_kullet": {
    "title": "2012-kullet",
    "content": "2012-kullet er et spesifikt årskull som har egne treningsprogram og aktiviteter. Kontakt klubben for mer informasjon om dette kullet.",
    "url": "https://askerfotball.no/lag/utviklingslag"
  },
  "asker_united": {
    "title": "Asker United",
    "content": "Asker United er en del av Asker Fotballs samfunnsprosjekt med både junior og senior lag. Lagene deltar i serie og cupspill gjennom sesongen og trener en gang i uken ute (inkludert kamp) og en gang om vinteren inne i Drengsrudhallen. Trenere: Henrik Vister og Oddvar Høiholdt.",
    "url": "https://askerfotball.no/lag/samfunnslag/asker-united"
  },
  "samfunnslag_detaljert": {
    "title": "Samfunnslag detaljer",
    "content": "Asker Fotball har tre samfunnslag: Asker United (junior og senior lag, deltar i serie og cupspill), Gatelaget (stiftet 2013, et av de mest rutinerte lagene i landet), og Hæppe (nysatsing for ungdom, forebygging av utenforskap). Kontakt klubben for påmelding og priser.",
    "url": "https://askerfotball.no/lag/samfunnslag"
  },
  "gatelaget": {
    "title": "Gatelaget - samfunnslag for rusrelaterte lidelser",
    "content": "Gatelaget er et samfunnslag i Asker Fotball, stiftet i 2013, og er et av de mest rutinerte lagene i landet. Laget tilbyr fotballaktivitet for mennesker med rusrelaterte lidelser og fungerer som ettervern. Omtales som «Verdens beste ettervern?» og «forbausende gode resultater» i forskningsrapport fra USN. Laget deltar i nasjonale turneringer og er en del av klubbens samfunnsengasjement. Kontakt: post@askerfotball.no",
    "url": "https://askerfotball.no/lag/samfunn"
  },
  "haeppe": {
    "title": "Hæppe",
    "content": "Hæppe er Asker Fotballs nysatsing innen samfunnslag. Det tar sikte på å tilby fotball og fysisk aktivitet til ungdom for å redusere passive hverdager og til forebygging av utenforskap.",
    "url": "https://askerfotball.no/lag/samfunn"
  },
  "veteranlag_gafotball": {
    "title": "Veteranlag - Gåfotball for eldre spillere",
    "content": "Asker Fotball har gåfotball for veteraner og eldre spillere som fortsatt vil spille fotball i et sosialt miljø. Gåfotballen arrangerer kamper og treninger med påfølgende mat og fotballprat. Dette er en flott formiddag med fotballkamp og sosial samling på Brakka. Spillerutvikler Reinhard Førde planlegger samlinger og skuddtrening. Kontakt klubben på post@askerfotball.no for mer informasjon om gåfotball og veteranaktiviteter.",
    "url": "https://askerfotball.no/nyheter/gafotballen-med-besok-fra-baerum"
  },
  "historiske_profiler": {
    "title": "Største profiler og spillere med flest kamper i Asker Fotball historie",
    "content": "Asker Fotball har en rik historie som strekker seg tilbake til 1898. Gjennom årene har mange spillere preget klubben. For detaljert informasjon om spillere med flest kamper og klubbens største profiler gjennom historien, se jubileumsheftet 'Gjennom oppturer og nedturer' skrevet av tidligere styreleder Erik Berg. Dette kan bestilles på post@askerfotball.no for 250 kroner, hvor inntekten går uavkortet til klubben (halvparten øremerkes Gatelaget og Asker United).",
    "url": "https://askerfotball.no/nyheter/askerfotballen-historie"
  },
  "media_kommunikasjon": {
    "title": "Media og kommunikasjon",
    "content": "Mathis Banggren er mediaansvarlig (Mathis@askerfotball.no). For mediahenvendelser og kommunikasjon, kontakt ham direkte.",
    "url": "https://askerfotball.no/om-klubben/media"
  },
  "årsmøter": {
    "title": "Årsmøter",
    "content": "Asker Fotball arrangerer årsmøter for medlemmer. Informasjon om datoer og innkalling finnes på nettsiden eller sendes til medlemmer.",
    "url": "https://askerfotball.no/om-klubben/arsmoter"
  },
  "betalingsmetoder": {
    "title": "Betalingsmetoder - hvordan betale kontingent",
    "content": "Betaling skjer via: 1) Bankoverførsel 2) Vipps 3) Kontant i fotballhuset. Kontakt Sølvi Dahl (solvi.dahl@askerfotball.no) for fakturaer. Automatisk fornyelse hvert år. For spørsmål: post@askerfotball.no eller ring +47 907 51 170.",
    "url": "https://askerfotball.no"
  },
  "familierabatt": {
    "title": "Familierabatt - finnes rabatt",
    "content": "For informasjon om familierabatter og spesielle tilbud, kontakt klubben på post@askerfotball.no eller ring +47 907 51 170. Spesifikke rabatter kan være tilgjengelige for familier med flere barn.",
    "url": "https://askerfotball.no"
  },
  "påmelding_registrering": {
    "title": "Hvordan melde barn på OBOS Akademi - påmelding og registrering",
    "content": "For påmelding: 1) Besøk askerfotball.no 2) Velg riktig lag/aktivitet 3) Fyll ut skjema og betal kontingent. OBOS Akademi: Meld på via https://app.rubic.no/Public/Events/33825. Spørsmål: post@askerfotball.no",
    "url": "https://askerfotball.no"
  },
  "terminliste_hvor": {
    "title": "Terminliste kamper og kampprogram - A-laget",
    "content": "Terminlisten på askerfotball.no/terminliste viser A-lagets kommende kamper og kampprogram. For ungdomslag (G13, G14, G15, G19, etc.) og andre lag, kontakt lagleder eller trener direkte for terminliste. G15: Fausto Ferreras Gromaz (pocholadam@hotmail.com). Generelt: post@askerfotball.no",
    "url": "https://askerfotball.no/terminliste"
  },
  "dugnad_info": {
    "title": "Klubbdugnad frivillig og dugnad",
    "content": "Dugnader arrangeres regelmessig for anleggsvedlikehold. Påmelding via: 1) post@askerfotball.no 2) Lagleder 3) Facebook-grupper. Alle medlemmer forventes å delta.",
    "url": "https://askerfotball.no"
  },
  "app_info": {
    "title": "App og mobilapplikasjoner",
    "content": "Asker Fotball har ikke sin egen app, men vi anbefaler at du laster ned Norsk LigaFotball appen (NLF) for å følge med på kamper og resultater. Du kan også bruke MinFotball for å holde deg oppdatert på fotballaktiviteter.",
    "url": "https://askerfotball.no"
  }
};

// FAQ Configuration for common chip questions
const FAQ_RESPONSES = {
  "obos akademi": {
    reply: "Et fotballakademi for jenter og gutter i alderen 7-13 år.\n\nFølger skoleruta og tar kun fri på skolens fridager.\n\nMan kan delta fra 1-5 dager per uke.\n\nPris: 955,- til 2500,- per måned avhengig av antall dager.\n\nAkademiet fokuserer på teknisk utvikling og fotballglede.\n\n📝 Påmelding: https://app.rubic.no/Public/Events/33825",
    sources: [
      {
        title: "OBOS Akademi",
        url: "https://askerfotball.no/lag/utviklingslag/akademi",
        score: 10
      },
      {
        title: "Meld på OBOS Akademi",
        url: "https://app.rubic.no/Public/Events/33825",
        score: 10
      }
    ]
  },
  "melde barnet mitt på obos akademi": {
    reply: "For å melde barnet ditt på OBOS Akademi:\n\n📝 Gå til påmeldingssiden: https://app.rubic.no/Public/Events/33825\n\n🎯 Akademiet er for barn i alderen 7-13 år\n💰 Pris: 955,- til 2500,- per måned (avhengig av antall dager)\n📅 Man kan delta fra 1-5 dager per uke\n\nAkademiet følger skoleruta og tar kun fri på skolens fridager.\n\nSpørsmål? Kontakt lars.henrik@askerfotball.no",
    sources: [
      {
        title: "Meld på OBOS Akademi",
        url: "https://app.rubic.no/Public/Events/33825",
        score: 10
      },
      {
        title: "OBOS Akademi",
        url: "https://askerfotball.no/lag/utviklingslag/akademi",
        score: 10
      }
    ]
  },
  "hvordan melder jeg barnet mitt på obos akademi": {
    reply: "For å melde barnet ditt på OBOS Akademi:\n\n📝 Gå til påmeldingssiden: https://app.rubic.no/Public/Events/33825\n\n🎯 Akademiet er for barn i alderen 7-13 år\n💰 Pris: 955,- til 2500,- per måned (avhengig av antall dager)\n📅 Man kan delta fra 1-5 dager per uke\n\nAkademiet følger skoleruta og tar kun fri på skolens fridager.\n\nSpørsmål? Kontakt lars.henrik@askerfotball.no",
    sources: [
      {
        title: "Meld på OBOS Akademi",
        url: "https://app.rubic.no/Public/Events/33825",
        score: 10
      },
      {
        title: "OBOS Akademi",
        url: "https://askerfotball.no/lag/utviklingslag/akademi",
        score: 10
      }
    ]
  },
  "akademi+": {
    reply: "For de ekstra ivrige fotballspillerne.\n\nDette er en intensiv variant av akademiet.\n\nFor barn som ønsker mer trening og utvikling.\n\nKontakt lars.henrik@askerfotball.no for mer informasjon.\n\nPerfekt for de som vil ta fotballen til neste nivå.",
    sources: [
      {
        title: "OBOS Akademi+", 
        url: "https://askerfotball.no/nyheter/velkommen-til-obos-akademi",
        score: 10
      },
      {
        title: "Meld på OBOS Akademi+",
        url: "https://askerfotball.ticketco.events/no/nb/e/obos_akademiet__20132015",
        score: 10
      }
    ]
  },
  "kontakt klubben": {
    reply: "Administrasjon:\n\nRolf-Magne Walstad\nDaglig og sportslig leder\nE-post: walstad@askerfotball.no\n\nMorten Sommerfeldt\nMarkedsansvarlig\nE-post: morten@askerfotball.no\nTelefon: +47 907 51 170\n\nGenerelt:\nE-post: post@askerfotball.no\n\nVi svarer raskt på alle henvendelser.",
    source: {
      title: "Kontakt",
      url: "https://askerfotball.no/om-klubben/ansatte",
      score: 10
    }
  },
  "a-laget": {
    reply: "Sterk spillertropp med både erfarne og unge spillere.\n\nTrenerteam:\n\nMagnus Bredal - Hovedtrener\nBård Heggset - Assistenttrener\nIsmet Duracak - Keepertrener\nJakob Lillestjerna - Analyseansvarlig\nAlain Antonio Astudillo - Medisinsk ansvarlig\n\nMed fokus på resultater og utvikling.",
    source: {
      title: "A-laget",
      url: "https://askerfotball.no/lag", 
      score: 10
    }
  },
  "obos camp": {
    reply: "OBOS Camp arrangeres på Føyka og Risenga kunstgress:\n\nUke 26 (23.-27.juni) - 1.990 kr\nUke 32 (4.-7.august) - 1.590 kr (10-14 år)\nUke 33 (11-15.august) - 1.990 kr\n\nAlder: 6-14 år\nPrisen inkluderer: Frukt, smoothie, OBOS t-skjorte og shorts og egen OBOS ball\n\nKontakt: Lars Henrik Dahl\nE-post: lars.henrik@askerfotball.no\nMobil: 948 36 704",
    sources: [
      {
        title: "OBOS Camp - sommerleir",
        url: "https://askerfotball.no/nyheter/sommerens-beste-eventyr-obos-camp",
        score: 10
      }
    ]
  },
  "terminliste": {
    reply: "Terminlisten på askerfotball.no/terminliste viser A-lagets kommende kamper og kampprogram.\n\nFor andre lag og aldersgrupper (G13, G14, G15, G19, etc.), kontakt lagleder eller trener direkte for å få terminliste for det aktuelle laget.",
    source: {
      title: "Terminliste - A-laget",
      url: "https://askerfotball.no/terminliste",
      score: 10
    }
  },
  "utviklingslag trenere": {
    reply: "Utviklingslagene ledes av trenere som har de samme målene som klubben.\n\nSpillerutvikler:\nSvein Roger Pettersen\nE-post: sveinroger.pettersen@ntg.no\nTelefon: 951 63 103\n\nGruppene er godt støttet av team med foresatte som backer trenerne.",
    source: {
      title: "Trenere på utviklingslagene",
      url: "https://askerfotball.no/lag/utviklingslag/om-utviklingslagene",
      score: 10
    }
  },
  "frivillig": {
    reply: "For å melde interesse for å bli frivillig på kampdag eller andre arrangementer:\n\nKontakt klubben på:\nE-post: post@askerfotball.no\nTelefon: +47 907 51 170\n\nVi setter stor pris på frivillig innsats!",
    source: {
      title: "Frivillig arbeid",
      url: "https://askerfotball.no",
      score: 10
    }
  },
  "booking": {
    reply: "For å booke baner eller anlegg:\n\nKontakt klubben på:\nE-post: post@askerfotball.no\nTelefon: +47 907 51 170\n\nVi kan hjelpe deg med booking av Føyka stadion og andre fasiliteter.",
    source: {
      title: "Booking av baner og anlegg",
      url: "https://askerfotball.no",
      score: 10
    }
  },
  "retningslinjer": {
    reply: "Asker Fotball har retningslinjer for barnefotball som fokuserer på spillerutvikling og trivsel.\n\nVåre fire ledestjerner er:\n• Ærlighet\n• Hardt arbeid\n• Ydmykhet\n• Laget først\n\nFor mer informasjon om retningslinjer, kontakt klubben på post@askerfotball.no.",
    source: {
      title: "Retningslinjer for barnefotball",
      url: "https://askerfotball.no",
      score: 10
    }
  },
  "sponsor": {
    reply: "For informasjon om sponsormuligheter:\n\nKontakt Morten Sommerfeldt (markedsansvarlig):\nE-post: morten@askerfotball.no\nTelefon: +47 907 51 170\n\nVi har flere sponsorpakker tilgjengelig.",
    source: {
      title: "Sponsormuligheter",
      url: "https://askerfotball.no",
      score: 10
    }
  }
};

/**
 * Smart fallback logic based on query intent
 */
function getSmartFallback(query, queryAnalysis) {
  const intent = (queryAnalysis?.intent || query.toLowerCase()).toLowerCase();
  
  const fallbackMap = {
    'pris': 'For oppdaterte priser, kontakt klubben på post@askerfotball.no eller ring +47 907 51 170.',
    'påmelding': 'For påmelding, besøk askerfotball.no eller send e-post til post@askerfotball.no.',
    'kontakt': 'Kontakt klubben på post@askerfotball.no eller ring Morten Sommerfeldt på +47 907 51 170.',
    'booking': 'For booking av baner, kontakt klubben på post@askerfotball.no eller ring +47 907 51 170.',
    'betaling': 'For betalingsspørsmål, kontakt klubben på post@askerfotball.no.',
    'kostnad': 'For informasjon om kostnader, kontakt klubben på post@askerfotball.no eller ring +47 907 51 170.',
    'registrering': 'For registrering og påmelding, besøk askerfotball.no eller send e-post til post@askerfotball.no.',
    'solidaritet': 'For informasjon om solidaritetsfond, kontakt walstad@askerfotball.no.',
    'varsling': 'For å varsle uønskede hendelser, send e-post til post@askerfotball.no.',
    'sponsor': 'For sponsormuligheter, kontakt Morten Sommerfeldt på morten@askerfotball.no eller ring +47 907 51 170.',
    'familie': 'For familierabatter, kontakt klubben på post@askerfotball.no.',
    'camp': 'For OBOS Camp informasjon, kontakt lars.henrik@askerfotball.no.',
    'akademi': 'For OBOS Akademi, kontakt lars.henrik@askerfotball.no eller besøk askerfotball.no/lag/utviklingslag/akademi.',
    'terminliste': 'For terminliste og kamper, besøk askerfotball.no/resultater eller kontakt lagets trener.',
    'dugnad': 'For dugnad og frivillig arbeid, kontakt post@askerfotball.no eller lagleder.',
    'trenere': 'For trenerinformasjon, kontakt post@askerfotball.no eller sjekk askerfotball.no/lag.'
  };
  
  for (const [key, response] of Object.entries(fallbackMap)) {
    if (intent.includes(key) || query.toLowerCase().includes(key)) {
  return {
        reply: response,
        sources: [{
          title: 'Kontakt Asker Fotball',
          url: 'https://askerfotball.no/om-klubben/ansatte',
          score: 5
        }]
      };
    }
  }
  
  return null; // Use default fallback
}

/**
 * Check if query matches any FAQ responses with improved context awareness
 */
function checkFAQ(query) {
  const queryLower = query.toLowerCase().trim();
  
  // Context-aware FAQ matching - prioritize schedule-related queries
  if (queryLower.includes('når') && (queryLower.includes('spiller') || queryLower.includes('kamp'))) {
    return {
      reply: "Terminlister for alle lag finner du på askerfotball.no/terminliste.\n\nHer kan du se kamper, treninger og andre arrangementer for alle lag i klubben, inkludert A-laget.\n\nFor oppdaterte kamper og datoer, sjekk terminlisten eller kontakt klubben på post@askerfotball.no.",
      sources: [{
        title: "Terminliste",
        url: "https://askerfotball.no/terminliste",
        score: 10
      }]
    };
  }
  
  // Exact matches first
  if (FAQ_RESPONSES[queryLower]) {
    return FAQ_RESPONSES[queryLower];
  }
  
  // Fuzzy matching for common variations
  const faqKeys = Object.keys(FAQ_RESPONSES);
  for (const key of faqKeys) {
    const keyWords = key.split(' ');
    const matchCount = keyWords.filter(word => queryLower.includes(word)).length;
    
    if (matchCount >= keyWords.length * 0.7) {
      return FAQ_RESPONSES[key];
    }
  }
  
  return null;
}

/**
 * Enhanced semantic search with AI-powered query understanding
 */
async function searchEmbeddedKnowledge(query, apiKey) {
  const queryLower = query.toLowerCase().trim();
  const results = [];
  
  // Try local pattern matching first, but be more selective
  const localAnalysis = quickQueryAnalysis(query);
  let expandedQuery = [queryLower];
  let aiAnalysis = null;
  
  // Use AI for more complex queries, typos, or when local analysis is weak
  const shouldUseAI = apiKey && (
    !localAnalysis || // No local match
    localAnalysis.confidence < 0.7 || // Low confidence local match
    query.length > 30 || // Complex queries
    /[æøå]/.test(query) && query.length < 20 || // Short Norwegian queries (likely typos)
    query.includes('?') && query.split(' ').length > 5 // Complex questions
  );
  
  console.log('🔍 Query analysis debug:', {
    query: query,
    localAnalysis: localAnalysis ? { intent: localAnalysis.intent, confidence: localAnalysis.confidence } : null,
    shouldUseAI: shouldUseAI,
    hasApiKey: !!apiKey
  });
  
  if (shouldUseAI) {
    console.log('🧠 Using AI analysis for enhanced understanding...');
    aiAnalysis = await analyzeQueryWithAI(query, apiKey);
    if (aiAnalysis && aiAnalysis.search_terms) {
      expandedQuery = aiAnalysis.search_terms;
      console.log('🔍 AI-enhanced search terms:', expandedQuery);
    }
  } else if (localAnalysis) {
    console.log('🎯 Local pattern match found:', localAnalysis.intent);
    expandedQuery = localAnalysis.synonyms || [queryLower];
  }
  
  for (const [key, data] of Object.entries(EMBEDDED_KNOWLEDGE)) {
    let score = 0;
    
    // Enhanced semantic matching using expanded query
    const searchTerms = [queryLower, ...expandedQuery];
    
    for (const searchTerm of searchTerms) {
      // Title matching with higher weight for AI terms
      if (data.title.toLowerCase().includes(searchTerm)) {
        score += (aiAnalysis && aiAnalysis.search_terms?.includes(searchTerm)) ? 15 : 10;
      }
      
      // Content matching with semantic understanding
      const contentLower = data.content.toLowerCase();
      if (contentLower.includes(searchTerm)) {
        score += (aiAnalysis && aiAnalysis.search_terms?.includes(searchTerm)) ? 8 : 5;
      }
      
      // Word-by-word matching with better tokenization
      const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 2);
      searchWords.forEach(word => {
        if (data.title.toLowerCase().includes(word)) score += 3;
        if (data.content.toLowerCase().includes(word)) score += 1;
      });
    }
    
    // Enhanced semantic term matching
    const semanticMatches = getSemanticMatches(queryLower, key);
    score += semanticMatches;
    
    if (score > 0) {
      results.push({
        key,
        score,
        title: data.title,
        content: data.content,
        url: data.url,
        matchedTerms: expandedQuery,
        aiAnalysis: aiAnalysis
      });
    }
  }
  
  const sortedResults = results.sort((a, b) => b.score - a.score);
  
  // If no good results from embedded knowledge, try AI-enhanced BM25
  if (sortedResults.length === 0 || sortedResults[0].score < 30) {
    console.log('🔍 Low embedded knowledge scores, trying AI-enhanced BM25 search...');
    const bm25Results = await searchBM25(query, 3, apiKey);
    
    if (bm25Results.length > 0) {
      console.log('✅ Found', bm25Results.length, 'AI-enhanced BM25 results');
      return bm25Results.map(result => ({
        key: `bm25_${result.title.toLowerCase().replace(/\s+/g, '_')}`,
        score: result.score,
        title: result.title,
        content: result.content,
        url: result.url,
        relevance: result.relevance,
        source: 'bm25_ai_enhanced',
        aiAnalysis: result.aiAnalysis
      }));
    }
  }
  
  return sortedResults;
}

/**
 * Quick local pattern matching for common queries
 */
function quickQueryAnalysis(query) {
  const lowerQuery = query.toLowerCase();
  
  const patterns = {
    'pris|kostnad|betaling|penger|kr|faktura': { intent: 'pris', type: 'pricing', creative: false, synonyms: ['pris', 'kostnad', 'betaling', 'penger', 'kr', 'faktura', 'kontingent'] },
    'parkering|parkere|bil|kjøre|adresse|vei': { intent: 'parkering', type: 'facility_info', creative: true, synonyms: ['parkering', 'parkere', 'bil', 'kjøre', 'adresse', 'vei'] },
    'trener|coach|hovedtrener|assistent': { intent: 'trenere', type: 'staff_info', creative: false, synonyms: ['trener', 'coach', 'hovedtrener', 'assistenttrener', 'lagleder'] },
    'kontakt|e-post|telefon|ring|epost|henvendelse': { intent: 'kontakt', type: 'contact_info', creative: false, synonyms: ['kontakt', 'e-post', 'telefon', 'ring', 'epost', 'henvendelse'] },
    'åpningstid|åpen|lukket|tid|når|klokken': { intent: 'åpningstider', type: 'facility_info', creative: true, synonyms: ['åpningstid', 'åpen', 'lukket', 'tid', 'når', 'klokken'] },
    'akademi|skole|opplæring|utvikling|OBOS': { intent: 'akademi', type: 'program_info', creative: false, synonyms: ['akademi', 'skole', 'OBOS', 'opplæring', 'utvikling', 'barn'] },
    'stadion|bane|felt|arena|Føyka': { intent: 'stadion', type: 'facility_info', creative: false, synonyms: ['stadion', 'bane', 'felt', 'arena', 'Føyka', 'anlegg'] },
    'lag|team|spillere|tropp': { intent: 'lag', type: 'team_info', creative: false, synonyms: ['lag', 'team', 'spillere', 'tropp', 'fotball'] },
    'påmelding|registrering|melde|delta': { intent: 'påmelding', type: 'registration', creative: false, synonyms: ['påmelding', 'registrering', 'melde', 'delta', 'bli med'] },
    'camp|sommerleir|sommer|ferie': { intent: 'camp', type: 'program_info', creative: false, synonyms: ['camp', 'sommerleir', 'sommer', 'ferie', 'OBOS Camp'] },
    'terminliste|kamper|program|neste kamp|spiller|fixture|dato|når|hvor|motstander': { intent: 'terminliste', type: 'schedule_info', creative: false, synonyms: ['terminliste', 'kamper', 'program', 'neste kamp', 'fixture', 'dato', 'når', 'hvor', 'motstander', 'kamp', 'spiller'] },
    'dugnad|frivillig|hjelpe|bidra': { intent: 'dugnad', type: 'volunteer_info', creative: false, synonyms: ['dugnad', 'frivillig', 'hjelpe', 'bidra', 'medlem'] }
  };
  
  for (const [pattern, analysis] of Object.entries(patterns)) {
    if (new RegExp(pattern).test(lowerQuery)) {
      // Check for potential typos by looking for exact word matches
      const words = lowerQuery.split(/\s+/);
      const exactMatches = words.filter(word => 
        new RegExp(`\\b${word}\\b`).test(pattern.replace(/\|/g, ' '))
      );
      
      // Lower confidence if no exact word matches (likely typos)
      const confidence = exactMatches.length > 0 ? 0.8 : 0.4;
      
      return {
        ...analysis,
        keywords: lowerQuery.split(/\s+/).filter(w => w.length > 2),
        alternatives: [query],
        confidence: confidence,
        exactMatches: exactMatches
      };
    }
  }
  
  return null;
}

/**
 * Expand query using AI to understand intent and find synonyms
 * Now integrated with analyzeQueryWithAI to avoid duplicate API calls
 */
async function expandQueryWithAI(query, apiKey, existingAnalysis = null) {
  // Try local pattern matching first
  const localAnalysis = quickQueryAnalysis(query);
  if (localAnalysis) {
    console.log('🎯 Local pattern match found:', localAnalysis.intent);
    return localAnalysis.synonyms;
  }
  
  // Use existing AI analysis if available to avoid duplicate API calls
  if (existingAnalysis && existingAnalysis.search_terms) {
    console.log('🔄 Using existing AI analysis for query expansion');
    return existingAnalysis.search_terms;
  }
  
  try {
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
            content: `Du er en ekspert på å forstå norske spørsmål om fotball og klubber. Din oppgave er å utvide et spørsmål med relevante synonymer og alternative formuleringer.

Eksempler:
- "trener" -> ["trener", "coach", "hovedtrener", "assistenttrener", "leder"]
- "akademi" -> ["akademi", "skole", "opplæring", "utvikling", "OBOS"]
- "kontakt" -> ["kontakt", "telefon", "e-post", "epost", "ring", "skriv"]
- "stadion" -> ["stadion", "bane", "felt", "arena", "Føyka"]

Svar kun med en kommaseparert liste av relevante ord og fraser, maksimalt 8 stykker.`
          },
          {
            role: 'user',
            content: `Utvid dette spørsmålet med relevante synonymer: "${query}"`
          }
        ],
        max_tokens: 50,
        temperature: 0.0
      })
    });

    if (response.ok) {
      const data = await response.json();
      const expandedText = data.choices?.[0]?.message?.content;
      if (expandedText) {
        return expandedText.split(',').map(term => term.trim().toLowerCase()).filter(term => term.length > 0);
      }
    }
  } catch (error) {
    console.error('Query expansion failed:', error);
  }
  
  // Fallback to original query
  return [query.toLowerCase()];
}

/**
 * Enhanced semantic matching for common football terms
 */
function getSemanticMatches(query, key) {
  const queryLower = query.toLowerCase();
  let score = 0;
  
  // Enhanced semantic mappings with better coverage
  const semanticMappings = {
    'trenere': {
      terms: ['trener', 'coach', 'hovedtrener', 'assistenttrener', 'leder', 'manager', 'ansvarlig', 'støtteapparat', 'keepertrener', 'analyseansvarlig', 'medisinsk', 'magnus', 'bård', 'ismet'],
      score: 20
    },
    'klubb_info': {
      terms: ['klubb', 'navn', 'laget', 'heter', 'hva', 'hvem', 'identitet', 'organisasjon', 'forening', 'OBOS', 'ungdomsutvikling'],
      score: 15
    },
    'stadion': {
      terms: ['stadion', 'bane', 'hvor', 'spiller', 'arena', 'felt', 'Føyka', 'adresse', 'lokasjon', 'sted', 'ligger'],
      score: 15
    },
    'fotballhuset': {
      terms: ['fotballhus', 'fotballhuset', 'åpningstid', 'åpent', 'butikk', 'supporter', 'kaffekopp', 'besøke', 'innom', 'hvor ligger', 'hvor', 'ligger', 'sted', 'adresse'],
      score: 25
    },
    'parkering': {
      terms: ['parkering', 'parkere', 'bil', 'avgift', 'billett', 'hvor kan jeg parkere'],
      score: 20
    },
    'akademi_info': {
      terms: ['akademi', 'skole', 'opplæring', 'utvikling', 'OBOS', 'barn', 'ungdom', 'trening', 'kurs', '7-13', 'skoleruta', 'fridager', 'melde på', 'påmelding', 'camp'],
      score: 15
    },
    // FIXED: Add missing mappings for better source matching
    'kontakt': {
      terms: ['kontakt', 'daglig leder', 'sportslig leder', 'ansvarlig', 'leder', 'administrasjon', 'manager', 'direktør', 'sjef'],
      score: 25
    },
    'lag_struktur': {
      terms: ['lag', 'mange lag', 'hvor mange', 'lag har', 'lag klubben', 'utviklingslag', 'samfunnslag', 'a-lag', 'struktur', 'organisasjon'],
      score: 25
    },
    'lag_oversikt': {
      terms: ['lag', 'mange lag', 'hvor mange', 'lag har', 'lag klubben', 'oversikt', 'alle lag', 'lag på', 'nivåer'],
      score: 30
    },
    'varsling': {
      terms: ['varsling', 'varslingsknapp', 'varslingsknappen', 'bekymring', 'melde avvik', 'varsle', 'rapportere', 'hendelser', 'uønskede'],
      score: 30
    },
    'akademi_plus': {
      terms: ['akademi+', 'akademi plus', 'intensiv', 'ekstra', 'ivrige', 'mer trening', 'lars.henrik'],
      score: 15
    },
    'kontakt': {
      terms: ['kontakt', 'telefon', 'e-post', 'epost', 'ring', 'skriv', 'mail', 'tlf', 'nummer', 'adresse', 'walstad', 'morten', 'sommerfeldt', 'daglig leder', 'markedsansvarlig'],
      score: 15
    },
    'lag_struktur': {
      terms: ['lag', 'struktur', 'a-lag', 'samfunnslag', 'utviklingslag', 'voksne', 'avslappet', 'nivå'],
      score: 15
    },
    'asker_united': {
      terms: ['asker united', 'united', 'samfunn', 'senior', 'junior', 'voksne', 'henrik vister', 'oddvar'],
      score: 20
    },
    'priser_medlemskap': {
      terms: ['pris', 'priser', 'koster', 'måned', 'medlemskap', 'betaling', 'kostnad', '955', '2500', 'faktura', 'betale'],
      score: 15
    },
    'spillere_a_lag': {
      terms: ['spillere', 'spiller', 'tropp', 'keeper', 'forsvar', 'midtbane', 'angrep', 'oskar', 'sigurd', 'jonas', 'mohammed'],
      score: 15
    },
    'solidaritetsfond': {
      terms: ['solidaritet', 'fond', 'støtte', 'økonomisk', 'hjelp', 'stønad', 'ordning'],
      score: 20
    },
    'varsling': {
      terms: ['varsle', 'varsling', 'bekymring', 'avvik', 'melding', 'uønsket', 'hendelse'],
      score: 20
    },
    'to_steg_frem': {
      terms: ['to steg frem', 'to skritt frem', 'sportsplan', 'visjon', 'livsmestring', 'folkehelse', 'program'],
      score: 20
    },
    'styret': {
      terms: ['styre', 'styret', 'styreleder', 'nestleder', 'styremedlem', 'ulrik', 'arneberg', 'espen'],
      score: 20
    },
    'historie': {
      terms: ['historie', 'historisk', 'etablert', 'produsert', 'gjennom årene', 'tradisjon', '1898', '1913', '1923', 'hartmanns pensjonatskole', 'hvalstad', 'erik berg', 'jubileumshefte', '125 år', 'askerfotballens historie', 'hvor lenge', 'eksistert', 'eksistere', 'grunnlagt', 'startet', 'begynte'],
      score: 30
    },
    'obos_camp': {
      terms: ['camp', 'sommerleir', 'sommer', 'ferie', 'uke 26', 'uke 32', 'uke 33', 'lars henrik', 'dahl', 'melde på'],
      score: 20
    },
    'utviklingslag_trenere': {
      terms: ['utviklingslag', 'trenere', 'trener', 'svein roger', 'pettersen', 'spillerutvikler', 'ungdomslag'],
      score: 20
    },
    'terminliste': {
      terms: ['terminliste', 'termin', 'kamper', 'program', 'neste kamp', 'fixture', 'dato', 'når', 'hvor', 'motstander', 'kamp', 'spiller', 'a-lag', 'a lag'],
      score: 30
    },
    'frivillig': {
      terms: ['frivillig', 'kampdag', 'hjelpe', 'bidra', 'melde interesse'],
      score: 20
    },
    'booking_baner': {
      terms: ['booke', 'booking', 'baner', 'anlegg', 'fasiliteter'],
      score: 20
    },
    'retningslinjer': {
      terms: ['retningslinjer', 'barnefotball', 'regler', 'policy', 'forskrifter'],
      score: 20
    },
    'sponsor': {
      terms: ['sponsor', 'sponsoring', 'firma', 'bedrift', 'partnership'],
      score: 20
    },
    'g13_lag': {
      terms: ['g14', 'g14-laget', 'g14 laget', 'gutter 14', 'gutter-14', 'gutter14', 'lars henrik', 'dahl', 'erik hejer', 'knut wangen'],
      score: 25
    },
    'g14_lag': {
      terms: ['g15', 'g15-laget', 'g15 laget', 'gutter 15', 'gutter-15', 'gutter15', 'mathis', 'banggren', 'eric haugen', 'nikolai brokhaug', 'laurent sauret'],
      score: 25
    },
    'g15_lag': {
      terms: ['g16', 'g16-laget', 'g16 laget', 'gutter 16', 'gutter-16', 'gutter16', 'fausto', 'ferreras', 'gromaz', 'per christian', 'brandvik'],
      score: 25
    },
    'g12_lag': {
      terms: ['g12', 'g12-laget', 'g12 laget', 'gutter 12', 'gutter-12', 'gutter12'],
      score: 25
    },
    'g16_lag': {
      terms: ['g16', 'g16-laget', 'g16 laget', 'gutter 16', 'gutter-16', 'gutter16'],
      score: 25
    },
    'app_info': {
      terms: ['app', 'applikasjon', 'mobilapp', 'telefonapp', 'nlf', 'norsk ligafotball', 'minfotball', 'mobil'],
      score: 30
    }
  };
  
  const mapping = semanticMappings[key];
  if (mapping) {
    const hasMatch = mapping.terms.some(term => queryLower.includes(term));
    if (hasMatch) {
      score += mapping.score;
    }
  }
  
  return score;
}

/**
 * Build system prompt with embedded knowledge
 */
function buildSystemPrompt(query, searchResults) {
  let systemPrompt = `Du er Askerbot – Asker Fotballs assistent.

REGLER:
- Svar basert på informasjon nedenfor
- Vær KREATIV og HJELPSOM - det er bedre å gi et nyttig svar enn å si "jeg vet ikke"
- Du kan gjøre rimelige antagelser basert på kontekst og vanlig praksis
- Norsk, vennlig tone, maks 3-4 linjer
- Bruk \\n for linjeskift, ikke markdown
- Kun hvis informasjonen helt mangler: "Det spørsmålet har jeg ikke informasjon om i øyeblikket. Prøv å stille det på en annen måte, eller kontakt klubben direkte på post@askerfotball.no for personlig hjelp."`;

  if (searchResults && searchResults.length > 0) {
    systemPrompt += `\n\nINFORMASJON:\n`;
    searchResults.forEach((result, index) => {
      systemPrompt += `${result.title} (${result.url}): ${result.content}\n\n`;
    });
  } else {
    systemPrompt += `\n\nHvis du ikke finner eksakt informasjon, gi det beste svaret du kan basert på kontekst.`;
  }
  
  return systemPrompt;
}

exports.handler = async (event, context) => {
  // Handle CORS
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { message, messages } = body;
    
    let messageToSend;
    if (messages && Array.isArray(messages)) {
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

    // CACHE CHECK: Check for cached response first
    const cachedResponse = getCachedResponse(messageToSend);
    if (cachedResponse) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300' // 5 minutes cache
        },
        body: JSON.stringify({ 
          ...cachedResponse,
          cached: true
        })
      };
    }

    // FAQ CHECK: Check for predefined responses first
    const faqResponse = checkFAQ(messageToSend);
    if (faqResponse) {
      const response = { 
          reply: faqResponse.reply,
        sources: faqResponse.sources || [faqResponse.source], // FAQ can have up to 2 sources
          usage: null,
          ragUsed: false,
          faqUsed: true
      };
      
      // Cache the FAQ response
      setCachedResponse(messageToSend, response);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300'
        },
        body: JSON.stringify(response)
      };
    }

    // Check OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Service configuration error' })
      };
    }

    // EMBEDDED KNOWLEDGE SEARCH with AI-powered query understanding
    const searchResults = await searchEmbeddedKnowledge(messageToSend, apiKey);
    console.log('🔍 AI-enhanced search results:', searchResults.length);
    
    if (searchResults.length === 0) {
      // Try smart fallback first
      const smartFallback = getSmartFallback(messageToSend);
      if (smartFallback) {
        // Cache the smart fallback response
        setCachedResponse(messageToSend, smartFallback);
        
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=300'
        },
        body: JSON.stringify({ 
            ...smartFallback,
            ragUsed: false,
            fallbackReason: 'smart_fallback'
          })
        };
      }
      
      // Default fallback if no smart fallback matches
      const defaultFallback = {
        reply: "Det spørsmålet har jeg ikke informasjon om i øyeblikket. Prøv å stille det på en annen måte, eller kontakt klubben direkte på post@askerfotball.no for personlig hjelp.",
          sources: [],
          usage: null,
          ragUsed: false,
          fallbackReason: 'no_relevant_sources'
      };
      
      // Cache the default fallback response
      setCachedResponse(messageToSend, defaultFallback);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300'
        },
        body: JSON.stringify(defaultFallback)
      };
    }

    // Build system prompt with embedded knowledge
    const systemPrompt = buildSystemPrompt(messageToSend, searchResults);
    
    // Call OpenAI API
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
        max_tokens: 150,
        temperature: 0.2,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Kunne ikke få svar fra AI-assistenten. Prøv igjen senere.',
          details: process.env.NODE_ENV === 'development' ? errorData : undefined
        })
      };
    }

    const data = await openaiResponse.json();
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

    // Build sources array - limit to 1 source for RAG responses
    const sources = searchResults.slice(0, 1).map(result => ({
      title: result.title,
      url: result.url,
      score: result.score
    }));

    const response = { 
      reply: reply.trim(),
      sources: sources,
      usage: data.usage,
      ragUsed: sources.length > 0
    };
    
    // Cache the RAG response
    setCachedResponse(messageToSend, response);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300'
      },
      body: JSON.stringify(response)
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
