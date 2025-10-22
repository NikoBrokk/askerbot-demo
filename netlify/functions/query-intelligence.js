/**
 * Query Intelligence Module
 * Handles synonym mapping, query intent classification, and query expansion
 */

/**
 * Comprehensive synonym mapping for Norwegian football queries
 */
const ENHANCED_SYNONYMS = {
  // Temporal/Schedule
  'når': ['terminliste', 'neste kamp', 'kamper', 'dato', 'tid', 'program', 'schedule'],
  'spiller': ['kamp', 'kamper', 'matcher', 'terminliste', 'program'],
  'neste': ['kommende', 'framtidige', 'upcoming', 'nestemann'],
  
  // Price/Cost
  'pris': ['kostnad', 'betaling', 'penger', 'kr', 'koster', 'betale', 'kontingent', 'avgift'],
  'sesongkort': ['billetter', 'adgang', 'inngang', 'sesongpass'],
  'medlemskap': ['kontingent', 'avgift', 'pris'],
  
  // Results
  'resultater': ['seier', 'tap', 'uavgjort', 'tabell', 'poeng', 'kamper', 'scoring'],
  'tabell': ['poeng', 'plassering', 'rangering', 'liga'],
  
  // Contact
  'kontakt': ['telefon', 'epost', 'e-post', 'mail', 'ring', 'ansatte', 'administrasjon'],
  'trener': ['coach', 'hovedtrener', 'assistenttrener', 'sportslig leder'],
  
  // Academy
  'akademi': ['skole', 'opplæring', 'utvikling', 'trening', 'OBOS', 'camp', 'kurs'],
  'obos': ['akademi', 'camp', 'trening', 'utvikling'],
  
  // Stadium/Location
  'stadion': ['bane', 'felt', 'arena', 'Føyka', 'gress', 'kunstgress'],
  'føyka': ['stadion', 'arena', 'fotballhuset', 'bane'],
  'adresse': ['vei', 'sted', 'lokasjon', 'hvor', 'finner'],
  'parkering': ['bil', 'parkere', 'bilplass'],
  
  // Volunteering
  'dugnad': ['frivillig', 'hjelpe', 'bidra', 'engasjere'],
  'frivillig': ['dugnad', 'hjelpe', 'støtte', 'bidra'],
  
  // History
  'historie': ['klubbens historie', 'askerfotballens historie', 'historikk', 'tradisjon', 'opprinnelse', 'grunnlagt', 'etablert', 'stiftet'],
  'stiftet': ['grunnlagt', 'etablert', 'startet', 'opprettet', '1889'],
  
  // Teams - with improved mapping
  'a-laget': ['herrelaget', 'senior', 'førstelag', 'hovedlag'],
  'g14': ['gutter 14', 'g14-laget', 'g14 laget', 'gutter-14', 'gutter14', '2011-kullet'],
  'g13': ['gutter 13', 'g13-laget', 'g13 laget', 'gutter-13', 'gutter13', '2012-kullet'],
  'g15': ['gutter 15', 'g15-laget', 'g15 laget', 'gutter-15', 'gutter15', '2010-kullet'],
  'g16': ['gutter 16', 'g16-laget', 'g16 laget', 'gutter-16', 'gutter16', '2009-kullet'],
  'g19': ['gutter 19', 'g19-laget', 'junior', 'juniorlaget'],
  
  // People/Roster
  'spillere': ['tropp', 'stall', 'lag', 'team', 'roster'],
  'hvem': ['spillere', 'personer', 'folk', 'navn'],
  
  // Digital
  'app': ['applikasjon', 'mobilapp', 'telefonapp', 'nlf', 'minfotball', 'digital'],
  
  // Partners
  'partnere': ['samarbeidspartnere', 'sponsorer', 'samarbeid', 'sponsorater'],
  
  // Social
  'gatelaget': ['asker united', 'samfunnslag', 'inkludering'],
  'asker united': ['gatelaget', 'samfunnsansvar']
};

/**
 * Query intent classification patterns
 */
const QUERY_INTENT_PATTERNS = {
  // Schedule-related
  schedule: {
    patterns: [
      /når (spiller|har).*(kamp|match)/i,
      /neste (kamp|match)/i,
      /terminliste/i,
      /kampoversikt/i,
      /kamprogram/i
    ],
    keywords: ['når', 'spiller', 'neste', 'kamp', 'terminliste', 'program'],
    boost: ['terminliste', 'neste kamp', 'kampprogram']
  },
  
  // Results-related
  results: {
    patterns: [
      /resultater?/i,
      /(tabell|poeng|plassering)/i,
      /(seier|tap|uavgjort)/i,
      /hvordan (gikk|gjekk)/i
    ],
    keywords: ['resultater', 'tabell', 'poeng', 'seier', 'tap'],
    boost: ['resultater', 'tabell', 'poengsum']
  },
  
  // Roster/Players
  roster: {
    patterns: [
      /hvem (er|spiller)/i,
      /spillere (på|i)/i,
      /tropp/i,
      /lagoppstilling/i
    ],
    keywords: ['hvem', 'spillere', 'tropp', 'stall', 'lag'],
    boost: ['spillere', 'tropp', 'lagoppstilling']
  },
  
  // Price-related
  price: {
    patterns: [
      /(pris|kost|betale)/i,
      /hvor mye/i,
      /(sesongkort|billett|medlemskap|kontingent)/i
    ],
    keywords: ['pris', 'koster', 'betale', 'kr', 'sesongkort', 'medlemskap'],
    boost: ['pris', 'kostnad', 'sesongkort']
  },
  
  // Contact-related
  contact: {
    patterns: [
      /kontakt/i,
      /(telefon|epost|mail)/i,
      /hvordan (ta kontakt|nå)/i,
      /ansatte/i
    ],
    keywords: ['kontakt', 'telefon', 'epost', 'ansatte'],
    boost: ['kontakt', 'ansatte', 'telefonnummer']
  },
  
  // Location-related
  location: {
    patterns: [
      /(hvor|adresse|lokasjon)/i,
      /hvordan (finne|komme)/i,
      /(føyka|stadion).*(adresse|sted)/i,
      /parkering/i
    ],
    keywords: ['hvor', 'adresse', 'lokasjon', 'føyka', 'stadion', 'parkering'],
    boost: ['adresse', 'slik finner du frem', 'lokasjon']
  },
  
  // Academy-related
  academy: {
    patterns: [
      /(akademi|obos).*(pris|påmelding)/i,
      /camp/i,
      /trening.*barn/i
    ],
    keywords: ['akademi', 'obos', 'camp', 'trening', 'barn'],
    boost: ['OBOS akademi', 'akademi', 'camp']
  },
  
  // History-related
  history: {
    patterns: [
      /historie/i,
      /(stiftet|grunnlagt|etablert)/i,
      /når (ble|startet)/i
    ],
    keywords: ['historie', 'stiftet', 'grunnlagt', '1889'],
    boost: ['historie', 'historiske fakta', 'klubbens historie']
  },
  
  // Volunteering
  volunteer: {
    patterns: [
      /(dugnad|frivillig)/i,
      /bli (med|involvert)/i,
      /hjelpe/i
    ],
    keywords: ['dugnad', 'frivillig', 'hjelpe', 'bidra'],
    boost: ['frivillig', 'dugnad', 'engasjement']
  }
};

/**
 * Classify query intent
 */
function classifyQueryIntent(query) {
  const queryLower = query.toLowerCase();
  const results = [];
  
  for (const [intent, config] of Object.entries(QUERY_INTENT_PATTERNS)) {
    let score = 0;
    let matchedPatterns = [];
    let matchedKeywords = [];
    
    // Check pattern matches
    for (const pattern of config.patterns) {
      if (pattern.test(query)) {
        score += 30;
        matchedPatterns.push(pattern.source);
      }
    }
    
    // Check keyword matches
    for (const keyword of config.keywords) {
      if (queryLower.includes(keyword)) {
        score += 10;
        matchedKeywords.push(keyword);
      }
    }
    
    if (score > 0) {
      results.push({
        intent,
        score,
        confidence: Math.min(score / 100, 1),
        matchedPatterns,
        matchedKeywords,
        boostTerms: config.boost
      });
    }
  }
  
  // Sort by score
  results.sort((a, b) => b.score - a.score);
  
  return results.length > 0 ? results[0] : null;
}

/**
 * Expand query with synonyms
 */
function expandQueryWithSynonyms(query) {
  const queryWords = query.toLowerCase().split(/\s+/);
  const expandedTerms = new Set([query.toLowerCase()]);
  
  for (const word of queryWords) {
    // Check if word is a synonym key
    if (ENHANCED_SYNONYMS[word]) {
      ENHANCED_SYNONYMS[word].forEach(syn => expandedTerms.add(syn));
    }
    
    // Check if word appears in any synonym values
    for (const [key, synonyms] of Object.entries(ENHANCED_SYNONYMS)) {
      if (synonyms.includes(word)) {
        expandedTerms.add(key);
        synonyms.forEach(syn => expandedTerms.add(syn));
      }
    }
  }
  
  return Array.from(expandedTerms);
}

/**
 * Comprehensive query preprocessing
 */
function preprocessQuery(query) {
  // Classify intent
  const intent = classifyQueryIntent(query);
  
  // Expand with synonyms
  const expandedTerms = expandQueryWithSynonyms(query);
  
  // Add boost terms from intent
  if (intent && intent.boostTerms) {
    intent.boostTerms.forEach(term => expandedTerms.push(term));
  }
  
  return {
    original: query,
    intent: intent ? intent.intent : 'general',
    confidence: intent ? intent.confidence : 0,
    expandedTerms: [...new Set(expandedTerms)], // Remove duplicates
    boostTerms: intent ? intent.boostTerms : [],
    matchedKeywords: intent ? intent.matchedKeywords : []
  };
}

/**
 * Calculate semantic relevance with enhanced synonym matching
 */
function calculateSemanticRelevance(query, chunk) {
  const queryLower = query.toLowerCase();
  const chunkText = (chunk.title + ' ' + chunk.content).toLowerCase();
  
  let score = 0;
  
  // Direct query match
  if (chunkText.includes(queryLower)) {
    score += 20;
  }
  
  // Expand query and check matches
  const expandedTerms = expandQueryWithSynonyms(query);
  
  for (const term of expandedTerms) {
    if (chunkText.includes(term.toLowerCase())) {
      score += 5;
    }
  }
  
  // Intent-based boosting
  const intent = classifyQueryIntent(query);
  if (intent && intent.boostTerms) {
    for (const boostTerm of intent.boostTerms) {
      if (chunkText.includes(boostTerm.toLowerCase())) {
        score += 15;
      }
    }
  }
  
  return Math.min(score, 100);
}

module.exports = {
  ENHANCED_SYNONYMS,
  QUERY_INTENT_PATTERNS,
  classifyQueryIntent,
  expandQueryWithSynonyms,
  preprocessQuery,
  calculateSemanticRelevance
};

