/**
 * Optimized Netlify Function for Askerbot with embedded knowledge base
 * Embeds essential data directly in the function to avoid file access issues
 */

// Enhanced embedded knowledge base with comprehensive coverage
const EMBEDDED_KNOWLEDGE = {
  "klubb_info": {
    "title": "Om klubben",
    "content": "Asker Fotball er fotballklubben i Asker. Klubben spiller på Føyka stadion og har både A-lag og ungdomslag. Klubben er en del av OBOS-ligaen og har et sterkt fokus på ungdomsutvikling.",
    "url": "https://askerfotball.no"
  },
  "akademi_info": {
    "title": "OBOS Akademi",
    "content": "OBOS Akademi er et fotballakademi for jenter og gutter i alderen 7-13 år. Det følger skoleruta og tar kun fri på skolens fridager. Man kan delta fra 1-5 dager per uke. Pris: 955,- til 2500,- per måned avhengig av antall dager. Akademiet fokuserer på teknisk utvikling og fotballglede.",
    "url": "https://askerfotball.no/lag/utviklingslag/akademi"
  },
  "akademi_plus": {
    "title": "OBOS Akademi+",
    "content": "OBOS Akademi+ er for de ekstra ivrige fotballspillerne. Dette er en intensiv variant av akademiet for barn som ønsker mer trening og utvikling. Kontakt lars.henrik@askerfotball.no for mer informasjon om Akademi+.",
    "url": "https://askerfotball.no/nyheter/velkommen-til-obos-akademi"
  },
  "trenere": {
    "title": "Trenere",
    "content": "Hovedtrener: Magnus Bredal. Assistenttrener: Bård Heggset. Keepertrener: Ismet Duracak. Analyseansvarlig: Jakob Lillestjerna. Medisinsk ansvarlig: Alain Antonio Astudillo.",
    "url": "https://askerfotball.no/lag"
  },
  "stadion": {
    "title": "Føyka stadion",
    "content": "Stadion ligger på Føyka, Asker. Det er et kunstgressbane som brukes av Asker Fotball. Stadion har også Fotballhuset med garderober og klubbhus. Adresse: Føyka, Asker.",
    "url": "https://askerfotball.no/om-stadion"
  },
  "kontakt": {
    "title": "Kontakt",
    "content": "Administrasjon: Rolf-Magne Walstad - Daglig og sportslig leder (walstad@askerfotball.no). Morten Sommerfeldt - Markedsansvarlig (morten@askerfotball.no, +47 907 51 170). Generelt: post@askerfotball.no",
    "url": "https://askerfotball.no/om-klubben/ansatte"
  },
  "lag_struktur": {
    "title": "Lag og struktur",
    "content": "Asker Fotball har A-lag, samfunnslag og utviklingslag. A-laget spiller i OBOS-ligaen. Samfunnslagene er for voksne som vil spille fotball på et mer avslappet nivå. Utviklingslagene inkluderer OBOS Akademi for barn 7-13 år.",
    "url": "https://askerfotball.no/lag"
  },
  "priser_medlemskap": {
    "title": "Priser og medlemskap",
    "content": "OBOS Akademi koster 955,- til 2500,- per måned avhengig av antall dager. For oppdaterte priser og medlemskap, kontakt klubben direkte på post@askerfotball.no eller ring +47 907 51 170.",
    "url": "https://askerfotball.no"
  },
  "spillere_a_lag": {
    "title": "Spillere",
    "content": "A-laget har en sterk spillertropp med både erfarne og unge spillere. Blant spillerne finner du keepere som Oskar Slotta Karlsen og Sigurd Olav Normann, forsvarsspillere som Jonas Skulstad og Joachim Prent-Eckbo, midtbanespillere som Mohammed Jatta og Jimmy Kenyi, og angrepsspillere som Jens-Erik Johansen og Lansana Sesay.",
    "url": "https://askerfotball.no/lag"
  },
  "historie": {
    "title": "Historie",
    "content": "Asker Fotball har en rik historie og er en etablert klubb i Asker-området. Klubben har fokus på ungdomsutvikling og har produsert mange gode spillere gjennom årene.",
    "url": "https://askerfotball.no"
  }
};

// FAQ Configuration for common chip questions
const FAQ_RESPONSES = {
  "obos akademi": {
    reply: "OBOS Akademi er et fotballakademi for jenter og gutter i alderen 7-13 år.\n\nDet følger skoleruta og tar kun fri på skolens fridager. Man kan delta fra 1-5 dager per uke.\n\nPris: 955,- til 2500,- per måned avhengig av antall dager.",
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
  "akademi+": {
    reply: "OBOS Akademi+ er for de ekstra ivrige fotballspillerne.\n\nDette er en intensiv variant av akademiet for barn som ønsker mer trening og utvikling.\n\nKontakt lars.henrik@askerfotball.no for mer informasjon.",
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
    reply: "For å kontakte Asker Fotball:\n\nAdministrasjon:\nRolf-Magne Walstad - Daglig og sportslig leder\nE-post: walstad@askerfotball.no\n\nMorten Sommerfeldt - Markedsansvarlig\nE-post: morten@askerfotball.no\nTelefon: +47 907 51 170\n\nGenerelt:\nE-post: post@askerfotball.no",
    source: {
      title: "Kontakt",
      url: "https://askerfotball.no/om-klubben/ansatte",
      score: 10
    }
  },
  "a-laget": {
    reply: "Asker Fotball A-lag har en sterk spillertropp med både erfarne og unge spillere.\n\nHovedtrener: Magnus Bredal\nAssistenttrener: Bård Heggset",
    source: {
      title: "A-laget",
      url: "https://askerfotball.no/lag", 
      score: 10
    }
  }
};

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
  
  // First, try to expand the query using AI to understand intent and synonyms
  const expandedQuery = await expandQueryWithAI(query, apiKey);
  console.log('🔍 Original query:', query);
  console.log('🧠 Expanded query:', expandedQuery);
  
  for (const [key, data] of Object.entries(EMBEDDED_KNOWLEDGE)) {
    let score = 0;
    
    // Enhanced semantic matching using expanded query
    const searchTerms = [queryLower, ...expandedQuery];
    
    for (const searchTerm of searchTerms) {
      // Title matching with semantic understanding
      if (data.title.toLowerCase().includes(searchTerm)) {
        score += 10;
      }
      
      // Content matching with semantic understanding
      const contentLower = data.content.toLowerCase();
      if (contentLower.includes(searchTerm)) {
        score += 5;
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
        matchedTerms: expandedQuery
      });
    }
  }
  
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Expand query using AI to understand intent and find synonyms
 */
async function expandQueryWithAI(query, apiKey) {
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
        max_tokens: 100,
        temperature: 0.3
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
  return [queryLower];
}

/**
 * Enhanced semantic matching for common football terms
 */
function getSemanticMatches(query, key) {
  const queryLower = query.toLowerCase();
  let score = 0;
  
  // Comprehensive semantic mappings
  const semanticMappings = {
    'trenere': {
      terms: ['trener', 'coach', 'hovedtrener', 'assistenttrener', 'leder', 'manager', 'ansvarlig', 'støtteapparat', 'keepertrener', 'analyseansvarlig', 'medisinsk'],
      score: 20
    },
    'klubb_info': {
      terms: ['klubb', 'navn', 'laget', 'heter', 'hva', 'hvem', 'identitet', 'organisasjon', 'forening', 'OBOS-ligaen', 'ungdomsutvikling'],
      score: 15
    },
    'stadion': {
      terms: ['stadion', 'bane', 'hvor', 'spiller', 'arena', 'felt', 'Føyka', 'adresse', 'lokasjon', 'fotballhuset', 'garderober', 'klubbhus'],
      score: 15
    },
    'akademi_info': {
      terms: ['akademi', 'skole', 'opplæring', 'utvikling', 'OBOS', 'barn', 'ungdom', 'trening', 'kurs', '7-13', 'skoleruta', 'fridager'],
      score: 15
    },
    'akademi_plus': {
      terms: ['akademi+', 'akademi plus', 'intensiv', 'ekstra', 'ivrige', 'mer trening', 'lars.henrik'],
      score: 15
    },
    'kontakt': {
      terms: ['kontakt', 'telefon', 'e-post', 'epost', 'ring', 'skriv', 'mail', 'tlf', 'nummer', 'adresse', 'walstad', 'morten', 'sommerfeldt'],
      score: 15
    },
    'lag_struktur': {
      terms: ['lag', 'struktur', 'a-lag', 'samfunnslag', 'utviklingslag', 'voksne', 'avslappet', 'nivå'],
      score: 15
    },
    'priser_medlemskap': {
      terms: ['pris', 'priser', 'koster', 'måned', 'medlemskap', 'betaling', 'kostnad', '955', '2500'],
      score: 15
    },
    'spillere_a_lag': {
      terms: ['spillere', 'spiller', 'tropp', 'keeper', 'forsvar', 'midtbane', 'angrep', 'oskar', 'sigurd', 'jonas', 'mohammed'],
      score: 15
    },
    'historie': {
      terms: ['historie', 'historisk', 'etablert', 'produsert', 'gjennom årene', 'tradisjon'],
      score: 15
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

  let systemPrompt = `Du er Askerbot – Asker Fotballs digitale assistent.

AKTUELL DATO OG TID: ${currentDate} kl. ${currentTime}

GRUNNLEGGENDE REGLER:
- Baser svar kun på informasjon fra kunnskapsbasen nedenfor
- Hvis informasjonen ikke finnes, si det tydelig
- Ikke oppfinn eller finn på informasjon som ikke er nevnt
- Vær nøyaktig og presis med fakta fra kunnskapsbasen

SVARSTIL:
- Svar på norsk med vennlig, men direkte tone
- Hold svaret kort - maksimalt 3-4 linjer
- Bruk linjeskift (\\n) for å dele opp svar - IKKE bruk markdown-styling
- Hvis informasjonen mangler, si: "Uffda, her ble jeg stående uvitende i offside, prøv denne lenken eller endre spørsmålet!"`;

  if (searchResults && searchResults.length > 0) {
    systemPrompt += `\n\nDU HAR TILGANG TIL FØLGENDE INFORMASJON FRA ASKER FOTBALL:\n\n`;
    
    searchResults.forEach((result, index) => {
      systemPrompt += `[Kilde ${index + 1}] ${result.title}\nURL: ${result.url}\nRELEVANSSKORE: ${result.score}\n\nINNHOLD:\n${result.content}\n\n---\n\n`;
    });
  } else {
    systemPrompt += `\n\nFALLBACK: Hvis du ikke finner relevant informasjon i kunnskapsbasen, svar: "Uffda, her ble jeg stående uvitende i offside, prøv denne lenken eller endre spørsmålet!"`;
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

    // FAQ CHECK: Check for predefined responses first
    const faqResponse = checkFAQ(messageToSend);
    if (faqResponse) {
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
    console.log('🔍 Search results:', searchResults.length);
    
    if (searchResults.length === 0) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ 
          reply: "Uffda, her ble jeg stående uvitende i offside! 🤔\n\nJeg kan hjelpe deg med:\n• OBOS Akademi og priser\n• Trenere og spillere\n• Stadion og kontaktinfo\n• Lag og struktur\n\nPrøv å stille spørsmålet på en annen måte, eller kontakt klubben direkte på post@askerfotball.no",
          sources: [],
          usage: null,
          ragUsed: false,
          fallbackReason: 'no_relevant_sources'
        })
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
        max_tokens: 200,
        temperature: 0.3,
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

    // Build sources array
    const sources = searchResults.map(result => ({
      title: result.title,
      url: result.url,
      score: result.score
    }));

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
