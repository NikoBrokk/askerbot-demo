/**
 * Optimized Netlify Function for Askerbot with embedded knowledge base
 * Embeds essential data directly in the function to avoid file access issues
 */

// Embedded essential knowledge base data
const EMBEDDED_KNOWLEDGE = {
  "klubb_info": {
    "title": "Asker Fotball",
    "content": "Asker Fotball er fotballklubben i Asker. Klubben spiller på Føyka stadion og har både A-lag og ungdomslag.",
    "url": "https://askerfotball.no"
  },
  "akademi_info": {
    "title": "OBOS Akademi",
    "content": "OBOS Akademi er et fotballakademi for jenter og gutter i alderen 7-13 år. Det følger skoleruta og tar kun fri på skolens fridager. Man kan delta fra 1-5 dager per uke. Pris: 955,- til 2500,- per måned avhengig av antall dager.",
    "url": "https://askerfotball.no/lag/utviklingslag/akademi"
  },
  "trenere": {
    "title": "A-laget trenere",
    "content": "Hovedtrener: Magnus Bredal. Assistenttrener: Bård Heggset.",
    "url": "https://askerfotball.no/lag"
  },
  "stadion": {
    "title": "Føyka stadion",
    "content": "Stadion ligger på Føyka, Asker. Det er et kunstgressbane som brukes av Asker Fotball.",
    "url": "https://askerfotball.no/om-stadion"
  },
  "kontakt": {
    "title": "Kontakt Asker Fotball",
    "content": "Administrasjon: Rolf-Magne Walstad - Daglig og sportslig leder (walstad@askerfotball.no). Morten Sommerfeldt - Markedsansvarlig (morten@askerfotball.no, +47 907 51 170). Generelt: post@askerfotball.no",
    "url": "https://askerfotball.no/om-klubben/ansatte"
  }
};

// FAQ Configuration for common chip questions
const FAQ_RESPONSES = {
  "obos akademi": {
    reply: "OBOS Akademi er et fotballakademi for jenter og gutter i alderen 7-13 år.\n\nDet følger skoleruta og tar kun fri på skolens fridager. Man kan delta fra 1-5 dager per uke.\n\nPris: 955,- til 2500,- per måned avhengig av antall dager.",
    sources: [
      {
        title: "OBOS Akademi - Asker Fotball",
        url: "https://askerfotball.no/lag/utviklingslag/akademi",
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
    reply: "For å kontakte Asker Fotball:\n\nAdministrasjon:\nRolf-Magne Walstad - Daglig og sportslig leder\nE-post: walstad@askerfotball.no\n\nMorten Sommerfeldt - Markedsansvarlig\nE-post: morten@askerfotball.no\nTelefon: +47 907 51 170\n\nGenerelt:\nE-post: post@askerfotball.no",
    source: {
      title: "Kontakt Asker Fotball",
      url: "https://askerfotball.no/om-klubben/ansatte",
      score: 10
    }
  },
  "a-laget": {
    reply: "Asker Fotball A-lag har en sterk spillertropp med både erfarne og unge spillere.\n\nHovedtrener: Magnus Bredal\nAssistenttrener: Bård Heggset",
    source: {
      title: "A-laget - Asker Fotball",
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
 * Search embedded knowledge base
 */
function searchEmbeddedKnowledge(query) {
  const queryLower = query.toLowerCase().trim();
  const results = [];
  
  for (const [key, data] of Object.entries(EMBEDDED_KNOWLEDGE)) {
    let score = 0;
    
    // Title matching
    if (data.title.toLowerCase().includes(queryLower)) {
      score += 10;
    }
    
    // Content matching
    const contentLower = data.content.toLowerCase();
    if (contentLower.includes(queryLower)) {
      score += 5;
    }
    
    // Word-by-word matching
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    queryWords.forEach(word => {
      if (data.title.toLowerCase().includes(word)) score += 3;
      if (data.content.toLowerCase().includes(word)) score += 1;
    });
    
    // Special handling for common terms
    if (queryLower.includes('trener') || queryLower.includes('coach') || queryLower.includes('hovedtrener')) {
      if (key === 'trenere') score += 20;
    }
    if (queryLower.includes('klubb') || queryLower.includes('navn')) {
      if (key === 'klubb_info') score += 15;
    }
    if (queryLower.includes('stadion') || queryLower.includes('bane') || queryLower.includes('hvor')) {
      if (key === 'stadion') score += 15;
        }
        
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

    // EMBEDDED KNOWLEDGE SEARCH
    const searchResults = searchEmbeddedKnowledge(messageToSend);
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
          reply: "Uffda, her ble jeg stående uvitende i offside, prøv denne lenken eller endre spørsmålet!\n\nKontakt klubben direkte på askerfotball.no/kontakt/ for nøyaktig informasjon.",
          sources: [],
          usage: null,
          ragUsed: false,
          fallbackReason: 'no_relevant_sources'
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
