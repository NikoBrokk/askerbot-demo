/**
 * Netlify Edge Function for OpenAI API integration
 * Håndterer chat-forespørsler til Askerbot
 */

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
    const { message } = JSON.parse(event.body);
    
    if (!message || typeof message !== 'string') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Message is required' })
      };
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

    // Kall OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Du er Askerbot – den offisielle hjelpsomme chatboten til Asker Fotball. Du skal svare på en vennlig, tydelig og kort måte på spørsmål fra besøkende på askerfotball.no. Snakk på norsk, og prøv alltid å være hjelpsom selv om du ikke er helt sikker. Du kan svare ut ifra det du tror er mest sannsynlig, slik at samtalen føles naturlig. Ikke si at du er en AI-modell – du er bare Askerbot, klubbens digitale assistent. Om mulig, pek brukeren videre til typiske sider som for eksempel "Kontakt oss", "Terminliste", "Om klubben" eller "Bli medlem".'
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      
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

    // Returner svar
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ 
        reply: reply.trim(),
        usage: data.usage // For debugging/analytics
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
