/**
 * Optimized Netlify Function for Askerbot with embedded knowledge base
 * Embeds essential data directly in the function to avoid file access issues
 */

// Enhanced embedded knowledge base with comprehensive coverage
const EMBEDDED_KNOWLEDGE = {
  "klubb_info": {
    "title": "Om klubben",
    "content": "Asker Fotball er fotballklubben i Asker. Klubben spiller på Føyka stadion og har både A-lag og ungdomslag. Klubben er sponset av OBOS og har et sterkt fokus på ungdomsutvikling.",
    "url": "https://askerfotball.no"
  },
  "akademi_info": {
    "title": "OBOS Akademi",
    "content": "OBOS Akademi er et fotballakademi for jenter og gutter i alderen 7-13 år. Det følger skoleruta og tar kun fri på skolens fridager. Man kan delta fra 1-5 dager per uke. Pris: 955,- til 2500,- per måned avhengig av antall dager. Akademiet fokuserer på teknisk utvikling og fotballglede. Påmelding: https://app.rubic.no/Public/Events/33825",
    "url": "https://askerfotball.no/lag/utviklingslag/akademi"
  },
  "akademi_plus": {
    "title": "OBOS Akademi+",
    "content": "OBOS Akademi+ er for de ekstra ivrige fotballspillerne. Dette er en intensiv variant av akademiet for barn som ønsker mer trening og utvikling. Kontakt lars.henrik@askerfotball.no for mer informasjon om Akademi+.",
    "url": "https://askerfotball.no/nyheter/velkommen-til-obos-akademi"
  },
  "trenere": {
    "title": "Trenere A-laget",
    "content": "Hovedtrener: Magnus Bredal. Assistenttrener: Bård Heggset. Keepertrener: Ismet Duracak. Analyseansvarlig: Jakob Lillestjerna. Medisinsk ansvarlig: Alain Antonio Astudillo.",
    "url": "https://askerfotball.no/lag"
  },
  "stadion": {
    "title": "Føyka stadion",
    "content": "Stadion ligger på Føyka, Asker. Det er et kunstgressbane som brukes av Asker Fotball. Stadion har også Fotballhuset med garderober og klubbhus. Adresse: Føyka, Asker.",
    "url": "https://askerfotball.no/om-stadion"
  },
  "fotballhuset": {
    "title": "Fotballhuset og åpningstider",
    "content": "Fotballhuset er stedet du kan handle supporterutstyr og klubbkolleksjonen vår. Her ligger supporter-butikken der du kan treffe ansatte i Asker Fotball. Ta gjerne turen innom for en hyggelig fotballprat og en kaffekopp. Åpningstider: Man-Fre 08.00-20.00, Lørdag 10.00-14:00, Søndag 10.00-14.00",
    "url": "https://askerfotball.no/om-stadion/fotballhuset"
  },
  "parkering": {
    "title": "Parkering på Føyka",
    "content": "Du kan parkere mot avgift nedenfor stadion på Føyka. Husk synlig billett i vinduet.",
    "url": "https://askerfotball.no/om-stadion/slik-finner-du-frem"
  },
  "kontakt": {
    "title": "Kontakt",
    "content": "Administrasjon: Rolf-Magne Walstad - Daglig og sportslig leder (walstad@askerfotball.no). Morten Sommerfeldt - Markedsansvarlig (morten@askerfotball.no, +47 907 51 170). Generelt: post@askerfotball.no",
    "url": "https://askerfotball.no/om-klubben/ansatte"
  },
  "lag_struktur": {
    "title": "Lag og struktur",
    "content": "Asker Fotball har A-lag, samfunnslag og utviklingslag. A-laget spiller i sin respektive divisjon. Samfunnslagene er for voksne som vil spille fotball på et mer avslappet nivå. Utviklingslagene inkluderer OBOS Akademi for barn 7-13 år.",
    "url": "https://askerfotball.no/lag"
  },
  "asker_united": {
    "title": "Asker United - samfunnslag",
    "content": "Asker United er en del av Asker Fotballs samfunnsprosjekt. Vi har to lag (junior og senior) som begge deltar i serie og cupspill gjennom sesongen. Lagene trener en gang i uken ute, inkludert kamp, og en gang om vinteren inne i Drengsrudhallen. Trenere: Henrik Vister og Oddvar Høiholdt.",
    "url": "https://askerfotball.no/lag/samfunn/asker-united"
  },
  "priser_medlemskap": {
    "title": "Priser og medlemskap",
    "content": "OBOS Akademi koster 955,- til 2500,- per måned avhengig av antall dager. For oppdaterte priser og medlemskap, kontakt klubben direkte på post@askerfotball.no eller ring +47 907 51 170.",
    "url": "https://askerfotball.no"
  },
  "spillere_a_lag": {
    "title": "Spillere A-laget",
    "content": "A-laget har en sterk spillertropp med både erfarne og unge spillere. Blant spillerne finner du keepere som Oskar Slotta Karlsen og Sigurd Olav Normann, forsvarsspillere som Jonas Skulstad og Joachim Prent-Eckbo, midtbanespillere som Mohammed Jatta og Jimmy Kenyi, og angrepsspillere som Jens-Erik Johansen og Lansana Sesay.",
    "url": "https://askerfotball.no/lag"
  },
  "solidaritetsfond": {
    "title": "Solidaritetsfondet",
    "content": "Asker fotball har etablert Solidaritetsfond som skal gi mulighet for støtte i en økonomisk krevende situasjon med mål om å finne løsninger sammen med familiene uten å fullfinansiere deltagelsen. Fondet skal bidra til å helt eller delvis dekke deltakerkostnader for barn og ungdom i egen klubb. Kontakt sportslig leder: walstad@askerfotball.no",
    "url": "https://askerfotball.no/om-klubben/solidaritetsfondet"
  },
  "varsling": {
    "title": "Varsling av uønskede hendelser",
    "content": "For varsling av uønskede hendelser i klubben, bekymringsmeldinger eller avvik, kontakt klubben på post@askerfotball.no. Alle varsler er beskyttet av personvern og vil bli behandlet deretter.",
    "url": "https://askerfotball.no/om-klubben/varslingsknapp-asker-fotball"
  },
  "to_steg_frem": {
    "title": "To Skritt Frem - klubbens sportsplan",
    "content": "To Skritt Frem er Asker Fotballs program for livsmestring og folkehelse. Programmet handler om å styrke sosiale og emosjonelle ferdigheter og bygge god psykisk helse for alle aktører innenfor idretten. Målet er å utvikle bedre idrettsutøvere og mennesker. Klubben vil styrke den sosiale kompetansen blant ansatte, trenere, lagledere, utøvere og foresatte.",
    "url": "https://askerfotball.no/om-klubben/to-steg-frem"
  },
  "styret": {
    "title": "Styret i Asker Fotball",
    "content": "Styreleder: Ulrik Arneberg (ulrik@profildesign.no). Nestleder: Espen Falck (espen@profildesign.no). Styremedlemmer: Aksel Svensson, Marie Grønnestad, Espen Røisland, Vegard Dokken, Jannicke B Nilsen.",
    "url": "https://askerfotball.no/om-klubben/styret-asker-fotball"
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
    reply: "Et fotballakademi for jenter og gutter i alderen 7-13 år.\n\nFølger skoleruta og tar kun fri på skolens fridager.\n\nMan kan delta fra 1-5 dager per uke.\n\nPris: 955,- til 2500,- per måned avhengig av antall dager.\n\nAkademiet fokuserer på teknisk utvikling og fotballglede.",
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
    sources: [
      {
        title: "Kontakt",
        url: "https://askerfotball.no/om-klubben/ansatte",
        score: 10
      }
    ]
  },
  "a-laget": {
    reply: "Sterk spillertropp med både erfarne og unge spillere.\n\nTrenerteam:\n\nMagnus Bredal - Hovedtrener\nBård Heggset - Assistenttrener\nIsmet Duracak - Keepertrener\nJakob Lillestjerna - Analyseansvarlig\nAlain Antonio Astudillo - Medisinsk ansvarlig\n\nMed fokus på resultater og utvikling.",
    sources: [
      {
        title: "A-laget",
        url: "https://askerfotball.no/lag", 
        score: 10
      }
    ]
  }
};

/**
 * Check if query matches any FAQ responses with enhanced pattern matching
 */
function checkFAQ(query) {
  const queryLower = query.toLowerCase().trim();
  
  // Exact matches first
  if (FAQ_RESPONSES[queryLower]) {
    return FAQ_RESPONSES[queryLower];
  }
  
  // Enhanced pattern matching for common question variations
  const patterns = {
    "obos akademi": [
      /obos[\s-]*akademi(?![\+])/i,
      /akademiet(?!\+)/i,
      /melde.*akademi/i,
      /påmelding.*akademi/i,
      /hvordan.*akademi/i,
      /hva.*akademi/i
    ],
    "akademi+": [
      /akademi[\s-]*\+/i,
      /akademi[\s]*plus/i,
      /intensiv.*akademi/i,
      /ekstra.*akademi/i
    ],
    "kontakt klubben": [
      /hvordan.*kontakt/i,
      /kontakt.*klubb/i,
      /e-?post.*klubb/i,
      /telefon.*klubb/i,
      /ring.*klubb/i,
      /daglig.*leder/i
    ],
    "a-laget": [
      /a-laget/i,
      /trener.*a-lag/i,
      /spiller.*a-lag/i,
      /tropp/i
    ]
  };
  
  // Check pattern matches
  for (const [key, patternList] of Object.entries(patterns)) {
    for (const pattern of patternList) {
      if (pattern.test(queryLower)) {
        return FAQ_RESPONSES[key];
      }
    }
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
 * Enhanced semantic search with keyword-based query understanding
 */
async function searchEmbeddedKnowledge(query) {
  const queryLower = query.toLowerCase().trim();
  const results = [];
  
  console.log('🔍 Searching for:', query);
  
  for (const [key, data] of Object.entries(EMBEDDED_KNOWLEDGE)) {
    let score = 0;
    
    // Title matching
    if (data.title.toLowerCase().includes(queryLower)) {
      score += 15;
    }
    
    // Content matching
    const contentLower = data.content.toLowerCase();
    if (contentLower.includes(queryLower)) {
      score += 10;
    }
    
    // Word-by-word matching with better tokenization
    const searchWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    searchWords.forEach(word => {
      if (data.title.toLowerCase().includes(word)) score += 3;
      if (data.content.toLowerCase().includes(word)) score += 2;
    });
    
    // Enhanced semantic term matching
    const semanticMatches = getSemanticMatches(queryLower, key);
    score += semanticMatches;
    
    if (score > 0) {
      results.push({
        key,
        score,
        title: data.title,
        content: data.content,
        url: data.url
      });
    }
  }
  
  return results.sort((a, b) => b.score - a.score);
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
      terms: ['fotballhus', 'åpningstid', 'åpent', 'butikk', 'supporter', 'kaffekopp', 'besøke', 'innom'],
      score: 20
    },
    'parkering': {
      terms: ['parkering', 'parkere', 'bil', 'avgift', 'billett', 'hvor kan jeg parkere'],
      score: 20
    },
    'akademi_info': {
      terms: ['akademi', 'skole', 'opplæring', 'utvikling', 'OBOS', 'barn', 'ungdom', 'trening', 'kurs', '7-13', 'skoleruta', 'fridager', 'melde på', 'påmelding', 'camp'],
      score: 15
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

  let systemPrompt = `Du er Gabrielsen AI – Asker Fotballs digitale assistent.

AKTUELL DATO OG TID: ${currentDate} kl. ${currentTime}

GRUNNLEGGENDE REGLER:
- Baser svar på informasjon fra kunnskapsbasen nedenfor
- Svar alltid med det du vet fra kilden, selv om det er delvis informasjon
- Hvis du har noe relevant informasjon, bruk den til å svare
- Vær nøyaktig med kontaktinfo, priser og navn fra kunnskapsbasen
- KUN hvis informasjonen er helt fraværende, bruk fallback-melding

SVARSTIL:
- Svar på norsk med vennlig, jovial tone
- Hold svaret kort og konsist - maksimalt 4-5 linjer
- Bruk linjeskift (\\n\\n) for å dele opp svar - IKKE bruk markdown-styling
- Hvis du har delvis info, svar med det du vet og foreslå å kontakte klubben for mer
- Kun hvis informasjonen er HELT fraværende: "Uffda, her ble jeg stående uvitende i offside! Prøv å kontakte klubben på post@askerfotball.no"`;

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
          sources: faqResponse.sources || [faqResponse.source], // FAQ can have up to 2 sources
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

    // EMBEDDED KNOWLEDGE SEARCH
    const searchResults = await searchEmbeddedKnowledge(messageToSend);
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

    // Build sources array - limit to 1 source for RAG responses
    const sources = searchResults.slice(0, 1).map(result => ({
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
