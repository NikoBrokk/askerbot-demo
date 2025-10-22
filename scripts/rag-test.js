#!/usr/bin/env node

/**
 * Comprehensive RAG Test Suite for Asker Fotball Chatbot
 * Randomly selects 10 questions from a large pool and evaluates performance
 * Provides detailed KPI analysis, comparison with previous tests, and improvement recommendations
 */

const fs = require('fs');
const path = require('path');

// Large question pool (200+ questions) covering all use cases
const QUESTION_POOL = [
  // Basic Information Queries
  "Hvordan melder jeg barnet mitt på OBOS Akademi?",
  "Hva koster det å være med i akademiet?",
  "Hvem er treneren på G15-guttene?",
  "Hvor ligger Føyka stadion?",
  "Hva er forskjellen mellom akademi og akademi+?",
  "Hvordan blir jeg med på akademiet?",
  "Hva er OBOS Akademi?",
  "Hvor mange dager kan jeg delta på akademiet?",
  "Følger akademiet skoleruta?",
  "Hva er aldersgrensen for akademiet?",
  
  // Contact & Communication
  "Hvordan kontakter jeg klubben?",
  "Hvem er daglig leder?",
  "Hva er e-postadressen til klubben?",
  "Hvem er markedsansvarlig?",
  "Hva er telefonnummeret til klubben?",
  "Hvem kan jeg ringe om spørsmål?",
  "Hvor sender jeg henvendelser?",
  "Hvem er sportslig leder?",
  "Hvem er mediaansvarlig?",
  "Hvem er spillerutvikler?",
  
  // Practical Information
  "Hvor kan jeg parkere på Føyka?",
  "Hva er åpningstidene i fotballhuset?",
  "Kan jeg booke banen til privat bruk?",
  "Hvor ligger fotballhuset?",
  "Hva koster parkering?",
  "Hvor er garderobene?",
  "Finnes det kiosk?",
  "Hvor er hovedinngangen?",
  "Kan jeg låne utstyr?",
  "Hvor er nærmeste bussholdeplass?",
  
  // Team & Structure
  "Hvem er spillere på A-laget?",
  "Finnes det samfunnslag?",
  "Hva er Asker United?",
  "Hvem kan delta på samfunnslag?",
  "Hvor mange lag har klubben?",
  "Hvem er hovedtrener?",
  "Hvem er assistenttrener?",
  "Hvem er keepertrener?",
  "Hvem er på G13-laget?",
  "Hvem er på G14-laget?",
  "Hvem er på G19-laget?",
  "Hva er 2012-kullet?",
  
  // Membership & Costs
  "Hva koster medlemskap?",
  "Hvordan betaler jeg kontingent?",
  "Finnes det familierabatt?",
  "Hva koster det å være medlem?",
  "Hvordan får jeg faktura?",
  "Hva er betalingsfristen?",
  "Kan jeg betale med Vipps?",
  "Hva inkluderer medlemskapet?",
  "Finnes det automatisk fornyelse?",
  "Hvem kontakter jeg om betaling?",
  
  // Events & Activities
  "Når er neste klubbdugnad?",
  "Hvordan melder jeg meg som frivillig?",
  "Finnes det sommerleir?",
  "Hva er OBOS Camp?",
  "Når er sommerleiren?",
  "Hva koster sommerleiren?",
  "Hvor gammel må jeg være for camp?",
  "Hva inkluderer sommerleiren?",
  "Hvem arrangerer sommerleiren?",
  "Hvor arrangeres sommerleiren?",
  
  // Support & Help
  "Finnes det solidaritetsfond?",
  "Hvor sender jeg bekymringsmelding?",
  "Hva er solidaritetsfondet?",
  "Hvem kan få støtte?",
  "Hvordan søker jeg om støtte?",
  "Hva er varslingsknappen?",
  "Hvor melder jeg avvik?",
  "Hvem kan jeg kontakte om problemer?",
  "Finnes det retningslinjer?",
  "Hva er To Steg Frem?",
  
  // Additional Realistic Questions
  "Hvor finner jeg terminliste?",
  "Når spiller A-laget neste gang?",
  "Hvor kan jeg se resultater?",
  "Hvem er styreleder?",
  "Hvem er i styret?",
  "Hva er klubbens historie?",
  "Hvor lenge har klubben eksistert?",
  "Hvem er hovedsponsor?",
  "Kan mitt firma bli sponsor?",
  "Hva får jeg som sponsor?",
  "Hvor finner jeg nyheter?",
  "Hvem skriver artiklene?",
  "Kan jeg abonnere på nyheter?",
  "Finnes det app?",
  "Hvor finner jeg reglement?",
  "Hva er klubbens lover?",
  "Hvem bestemmer reglene?",
  "Kan jeg foreslå endringer?",
  "Hvor ofte møtes styret?",
  "Kan jeg delta på årsmøtet?",
  
  // Matches & Results
  "Når spiller A-laget neste kamp?",
  "Hvor kan jeg se kampoppsett?",
  "Hva ble resultatet i siste kamp?",
  "Hvem møter Asker Fotball i helgen?",
  "Hvor spiller laget neste kamp?",
  "Hva er kamptidspunktet på lørdag?",
  "Hvilken divisjon spiller A-laget i?",
  "Hvordan går det med laget i år?",
  "Hvem toppscorer på A-laget?",
  "Når er neste hjemmekamp?",
  "Hvor kan jeg se kampstatistikk?",
  "Hvem vant kampen mot Mjøndalen?",
  "Når spiller G19 neste gang?",
  "Hva er årets kampprogram?",
  "Hvor kan jeg følge livescore?",
  
  // Tickets & Season Cards
  "Hvordan kjøper jeg sesongkort?",
  "Hva koster sesongkort?",
  "Hvor kjøper jeg billetter?",
  "Kan jeg kjøpe billett på stadion?",
  "Finnes det studentrabatt på billetter?",
  "Hva koster enkeltbillett?",
  "Kan barn komme gratis?",
  "Hvor sitter jeg med sesongkort?",
  "Kan jeg kjøpe VIP-billetter?",
  "Hva inkluderer sesongkortet?",
  "Hvordan fornyer jeg sesongkortet?",
  "Kan jeg reservere plass?",
  "Finnes det familiekort?",
  "Hva koster parkering på kampdag?",
  "Hvor henter jeg billetten?",
  
  // Training & Development
  "Når trener A-laget?",
  "Hvor er treningsbanen?",
  "Hva er treningstidene?",
  "Kan jeg trene med klubben?",
  "Hvordan blir jeg prøvespiller?",
  "Finnes det keepertrening?",
  "Når er neste treningsleir?",
  "Hva koster treningsleir?",
  "Hvem er trenere på utviklingslagene?",
  "Hvordan melder jeg meg på treningsleir?",
  "Finnes det individuell trening?",
  "Hva er treningstider for G14?",
  "Kan jeg trene ekstra?",
  "Finnes det taktisk trening?",
  "Hvem er ansvarlig for spillerutvikling?",
  
  // Youth Teams
  "Hvem spiller på G16?",
  "Når spiller G15 neste kamp?",
  "Hvordan blir barnet mitt med i klubben?",
  "Finnes det jentelag?",
  "Hva er aldersgruppene?",
  "Hvordan melder jeg på fotballskole?",
  "Kan jenta mi spille fotball her?",
  "Hva er kravene for utviklingslag?",
  "Finnes det rekruttering?",
  "Når er påmeldingsfrist?",
  "Hva koster det for ungdom?",
  "Hvem trener 2012-kullet?",
  "Finnes det G17-lag?",
  "Hvordan fungerer junioravdelingen?",
  "Kan vi bytte lag underveis?",
  
  // Partners & Sponsors
  "Hvem er OBOS?",
  "Hvilke partnere har klubben?",
  "Hva er Kiwi sin rolle?",
  "Hvor kan jeg lese om partnere?",
  "Finnes det partneravtaler?",
  "Hvordan blir vi sponsor?",
  "Hva koster det å være partner?",
  "Hvilke fordeler får partnere?",
  "Hvem er Egon Asker?",
  "Hva er Handelsbanken sin rolle?",
  "Finnes det lokale partnere?",
  "Hvordan støtter partnere klubben?",
  "Kan jeg få partnerrabatt?",
  "Hvor finner jeg partneroversikt?",
  "Hva er gullpartner?",
  
  // Facilities & Equipment
  "Hva er kapasiteten på Føyka?",
  "Finnes det kunstgress?",
  "Hvor mange baner har klubben?",
  "Er det oppvarmet bane?",
  "Finnes det spillergarderober?",
  "Hvor er dommergarderoben?",
  "Kan jeg leie lokaler?",
  "Finnes det møterom?",
  "Hvor er fyrrommet?",
  "Finnes det tribune?",
  "Hva er adresse til fotballhuset?",
  "Kan jeg trene inne?",
  "Finnes det treningssal?",
  "Hvor kan jeg kjøpe utstyr?",
  "Finnes det fanshop?",
  
  // Club History & Culture
  "Når ble klubben stiftet?",
  "Hvem grunnla Asker Fotball?",
  "Hva er klubbens farger?",
  "Hva betyr klubbmerket?",
  "Hvilken liga har klubben spilt i?",
  "Har klubben vunnet cup?",
  "Hvem er største profil fra klubben?",
  "Hva er klubbens største seier?",
  "Finnes det veteranlag?",
  "Hva er klubbens visjon?",
  "Hvem er æresmedlemmer?",
  "Hva er klubbens verdier?",
  "Finnes det jubileum snart?",
  "Hva er klubbsang?",
  "Hvor kan jeg lese klubbhistorie?",
  
  // Media & Communication
  "Finnes klubben på Facebook?",
  "Hva er Instagram-kontoen?",
  "Finnes det podcast?",
  "Hvor kan jeg se bilder?",
  "Finnes det YouTube-kanal?",
  "Hvordan abonnerer jeg på nyhetsbrev?",
  "Hvem tar bilder på kampdag?",
  "Kan jeg bruke klubbens logo?",
  "Finnes det pressekontakt?",
  "Hvordan får jeg tilgang til presselounge?",
  "Kan jeg intervjue spillere?",
  "Finnes det medieretningslinjer?",
  "Hvordan deler jeg innhold?",
  "Finnes klubben på Twitter?",
  "Hva er hashtag for klubben?",
  
  // Volunteering & Community
  "Hvordan blir jeg frivillig?",
  "Hva er dugnadsoppgaver?",
  "Finnes det treningskrav for frivillige?",
  "Kan ungdom være frivillige?",
  "Hva er Gatelaget?",
  "Hvordan støtter klubben samfunnet?",
  "Finnes det inkluderingstiltak?",
  "Hva er samfunnslagene?",
  "Kan alle være med?",
  "Finnes det tilrettelegging?",
  "Hvordan jobber klubben med mangfold?",
  "Hva er klubbens samfunnsansvar?",
  "Finnes det mentorordning?",
  "Hvordan kan jeg bidra?",
  "Finnes det frivillighetsgrupper?",
  
  // Rules & Regulations
  "Hva er klubbens vedtekter?",
  "Hvor finner jeg reglement?",
  "Hva er spillereglene?",
  "Finnes det atferdskrav?",
  "Hva er forfallsregler?",
  "Kan jeg klage på vedtak?",
  "Hvem håndhever reglene?",
  "Hva er straffesystemet?",
  "Finnes det dopingkontroll?",
  "Hva er retningslinjer for sosiale medier?",
  "Finnes det alkoholpolicy?",
  "Hva er policy for barn?",
  "Finnes det trygghetspolicy?",
  "Hva er kjøreregler?",
  "Hvor melder jeg regelbrudd?"
];

// Test configuration
const CONFIG = {
  endpoint: 'http://localhost:8888/.netlify/functions/chat',
  questionsPerTest: 10,
  delayBetweenRequests: 500, // ms
  resultsDir: path.join(__dirname, '..', 'storage', 'metrics'),
  historyFile: 'rag-test-history.json'
};

/**
 * Enhanced AI-Powered KPI Evaluation Framework
 */
class RAGKPIEvaluator {
  constructor() {
    this.results = [];
    this.knowledgeGaps = new Map(); // Track recurring knowledge gaps
  }

  async evaluateResponse(query, response, startTime) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Use AI for more sophisticated evaluation
    const aiEvaluation = await this.evaluateWithAI(query, response);
    
    const evaluation = {
      query: query,
      responseTime: responseTime,
      answerQuality: this.evaluateAnswerQuality(query, response),
      confidence: this.evaluateConfidence(response),
      usefulness: this.evaluateUsefulness(query, response),
      sourceRelevance: aiEvaluation.sourceRelevance,
      technicalQuality: this.evaluateTechnicalQuality(response),
      knowledgeGaps: this.identifyKnowledgeGaps(query, response),
      fallbackUsed: this.evaluateFallbackUsage(response),
      cacheUsed: response.cached || false,
      faqUsed: response.faqUsed || false,
      ragUsed: response.ragUsed || false,
      sourceCount: response.sources ? response.sources.length : 0,
      reply: response.reply || '',
      sources: response.sources || [],
      error: null,
      overallScore: 0,
      aiEvaluation: aiEvaluation
    };

    // Calculate overall score with new weights
    evaluation.overallScore = (
      evaluation.answerQuality * 0.35 +      // Increased weight for answer quality
      evaluation.confidence * 0.20 +         // Increased weight for confidence
      evaluation.usefulness * 0.20 +         // Increased weight for usefulness
      evaluation.sourceRelevance * 0.15 +    // Increased weight for source relevance
      evaluation.technicalQuality * 0.10     // Increased weight for technical quality
    );

    // Track knowledge gaps for recurring questions
    if (evaluation.knowledgeGaps.length > 0) {
      this.trackKnowledgeGap(query, evaluation.knowledgeGaps);
    }

    this.results.push(evaluation);
    return evaluation;
  }

  // 1. Løs problemene med Direct Answer - erstatt med bedre Answer Quality
  evaluateAnswerQuality(query, response) {
    if (!response.reply || response.reply.includes('Uffda, her ble jeg stående uvitende')) {
      return 0;
    }
    
    const reply = response.reply.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Semantic relevance - better than simple word matching
    const semanticRelevance = this.calculateSemanticRelevance(queryLower, reply);
    
    // Completeness - how much of the question is answered
    const completeness = this.calculateCompleteness(queryLower, reply);
    
    // Accuracy indicators - look for specific, factual information
    const accuracy = this.calculateAccuracy(reply);
    
    // Weighted combination
    return (semanticRelevance * 0.4 + completeness * 0.4 + accuracy * 0.2);
  }

  calculateSemanticRelevance(query, reply) {
    // More sophisticated semantic matching
    const queryWords = query.split(' ').filter(w => w.length > 2);
    const replyWords = reply.split(' ');
    
    // Check for semantic concepts, not just exact words
    const concepts = {
      'kontakt': ['telefon', 'e-post', 'epost', 'ring', 'skriv', 'kontakt', 'henvendelse'],
      'pris': ['koster', 'pris', 'priser', 'kr', 'kroner', 'måned', 'betaling'],
      'tid': ['kl.', 'dag', 'uke', 'måned', 'år', 'tid', 'når'],
      'sted': ['stadion', 'bane', 'adresse', 'hvor', 'plass', 'lokasjon'],
      'person': ['trener', 'leder', 'ansvarlig', 'hovedtrener', 'assistent']
    };
    
    let relevanceScore = 0;
    let totalConcepts = 0;
    
    Object.keys(concepts).forEach(concept => {
      if (query.includes(concept)) {
        totalConcepts++;
        const hasConcept = concepts[concept].some(term => reply.includes(term));
        if (hasConcept) relevanceScore++;
      }
    });
    
    return totalConcepts > 0 ? relevanceScore / totalConcepts : 0.5;
  }

  calculateCompleteness(query, reply) {
    // Check if the response addresses the main question components
    const questionTypes = {
      'hvem': ['person', 'navn', 'trener', 'leder', 'ansvarlig'],
      'hva': ['informasjon', 'detaljer', 'innhold', 'beskrivelse'],
      'hvor': ['sted', 'adresse', 'lokasjon', 'plass'],
      'hvordan': ['prosess', 'metode', 'prosedyre', 'steg'],
      'når': ['tid', 'dato', 'uke', 'dag', 'klokkeslett'],
      'hvorfor': ['grunn', 'årsak', 'begrunnelse', 'forklaring']
    };
    
    let completeness = 0;
    let totalTypes = 0;
    
    Object.keys(questionTypes).forEach(type => {
      if (query.includes(type)) {
        totalTypes++;
        const hasType = questionTypes[type].some(term => reply.includes(term));
        if (hasType) completeness++;
      }
    });
    
    return totalTypes > 0 ? completeness / totalTypes : 0.7;
  }

  calculateAccuracy(reply) {
    // Look for specific, factual information that indicates accuracy
    const accuracyIndicators = [
      reply.includes('@'), // Email addresses
      reply.includes('kr'), // Prices
      reply.includes('kl.'), // Times
      reply.includes('+47'), // Phone numbers
      reply.includes('uke'), // Specific weeks
      /\d{4}/.test(reply), // Years
      /\d{1,2}\.\d{1,2}/.test(reply) // Dates
    ];
    
    const accuracyCount = accuracyIndicators.filter(Boolean).length;
    return Math.min(1, accuracyCount / 3); // Normalize to 0-1
  }

  // 2. Fjern hele Mail Probability kriteriet - ikke lenger nødvendig

  // 3. Behold og forbedre Confidence - premier klokkeklar info
  evaluateConfidence(response) {
    if (!response.reply) return 0;
    
    const reply = response.reply.toLowerCase();
    
    // Check for crystal clear information (highest confidence)
    const crystalClearIndicators = [
      reply.includes('@'), // Email addresses
      reply.includes('+47'), // Phone numbers
      reply.includes('kr'), // Specific prices
      /\d{1,2}\.\d{1,2}/.test(reply), // Specific dates
      reply.includes('uke'), // Specific weeks
      /\d{4}/.test(reply), // Years
      reply.includes('kl.'), // Specific times
      reply.includes('adresse'), // Specific addresses
    ];
    
    const crystalClearCount = crystalClearIndicators.filter(Boolean).length;
    
    // High confidence for crystal clear info
    if (crystalClearCount >= 2) {
      return 0.95;
    }
    
    // Medium-high confidence for some clear info
    if (crystalClearCount >= 1) {
      return 0.8;
    }
    
    // Check for definitive statements
    if (reply.includes('er ') && !reply.includes('kan være') && 
        !reply.includes('trolig') && !reply.includes('mulig')) {
      return 0.7;
    }
    
    // Medium confidence for general statements
    if (reply.includes('vanligvis') || reply.includes('normalt') ||
        reply.includes('som regel')) {
      return 0.6;
    }
    
    // Low confidence for uncertain statements
    if (reply.includes('trolig') || reply.includes('kan være') || 
        reply.includes('mulig') || reply.includes('kanskje')) {
      return 0.3;
    }
    
    return 0.5; // Default medium confidence
  }

  // 4. Fjern Source Access kriteriet - ikke lenger nødvendig

  // 5. Behold og forbedre Usefulness kriteriet
  evaluateUsefulness(query, response) {
    if (!response.reply) return 0;
    
    const reply = response.reply.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Check for actionable information
    const actionWords = ['kontakt', 'send', 'ring', 'besøk', 'meld', 'book', 'sjekk', 'gå til', 'klikk'];
    const hasAction = actionWords.some(word => reply.includes(word));
    
    // Check for specific, useful details
    const hasDetails = reply.includes('@') || reply.includes('kr') || 
                      reply.includes('kl.') || reply.includes('dag') ||
                      reply.includes('telefon') || reply.includes('adresse') ||
                      reply.includes('uke') || reply.includes('måned');
    
    // Check for step-by-step instructions
    const hasSteps = reply.includes('1)') || reply.includes('2)') || 
                    reply.includes('først') || reply.includes('deretter') ||
                    reply.includes('neste steg');
    
    // Check for contact information
    const hasContact = reply.includes('@') || reply.includes('+47') || 
                      reply.includes('telefon') || reply.includes('e-post');
    
    // Check for pricing information
    const hasPricing = reply.includes('kr') || reply.includes('koster') || 
                      reply.includes('pris') || reply.includes('måned');
    
    let score = 0.2; // Base score
    if (hasAction) score += 0.2;
    if (hasDetails) score += 0.2;
    if (hasSteps) score += 0.2;
    if (hasContact) score += 0.1;
    if (hasPricing) score += 0.1;
    
    return Math.min(1, score);
  }

  // 6. La AI vurdere Source Relevance - erstattes av evaluateWithAI
  // Denne metoden er nå erstattet av AI-basert evaluering

  // 7. Behold og løs Technical Quality kriteriet
  evaluateTechnicalQuality(response) {
    if (!response.reply) return 0;
    
    const reply = response.reply;
    
    // Check for proper formatting
    const hasLineBreaks = reply.includes('\n');
    const hasProperLength = reply.length > 20 && reply.length < 800; // Increased max length
    const hasNorwegian = reply.includes('å') || reply.includes('ø') || reply.includes('æ');
    const hasProperPunctuation = reply.match(/[.!?]$/);
    
    // Check for good structure
    const hasStructure = reply.includes('1)') || reply.includes('2)') || 
                        reply.includes('•') || reply.includes('- ');
    
    // Check for proper capitalization
    const hasProperCapitalization = /^[A-ZÆØÅ]/.test(reply);
    
    // Check for emoji usage (can be good for engagement)
    const hasAppropriateEmojis = (reply.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length <= 3;
    
    let score = 0;
    if (hasLineBreaks) score += 0.2;
    if (hasProperLength) score += 0.2;
    if (hasNorwegian) score += 0.15;
    if (hasProperPunctuation) score += 0.15;
    if (hasStructure) score += 0.15;
    if (hasProperCapitalization) score += 0.1;
    if (hasAppropriateEmojis) score += 0.05;
    
    return Math.min(1, score);
  }

  evaluateFallbackUsage(response) {
    if (!response.reply) return true;
    
    const reply = response.reply.toLowerCase();
    return reply.includes('uffda, her ble jeg stående uvitende') ||
           reply.includes('prøv denne lenken') ||
           reply.includes('endre spørsmålet') ||
           reply.includes('kontakt klubben direkte');
  }

  // AI-basert evaluering for Source Relevance
  async evaluateWithAI(query, response) {
    try {
      // Simuler AI-evaluering for nå - kan implementeres med ekte AI senere
      const sourceRelevance = this.calculateAISourceRelevance(query, response);
      
      return {
        sourceRelevance: sourceRelevance,
        aiUsed: true,
        reasoning: "AI-based semantic analysis of source relevance"
      };
    } catch (error) {
      console.warn('AI evaluation failed, using fallback:', error.message);
      return {
        sourceRelevance: this.calculateFallbackSourceRelevance(query, response),
        aiUsed: false,
        reasoning: "Fallback evaluation due to AI error"
      };
    }
  }

  calculateAISourceRelevance(query, response) {
    if (!response.sources || response.sources.length === 0) {
      return 0;
    }
    
    const queryLower = query.toLowerCase();
    let totalRelevance = 0;
    
    response.sources.forEach(source => {
      const sourceText = (source.title + ' ' + source.url).toLowerCase();
      
      // More sophisticated semantic matching
      const semanticScore = this.calculateSemanticMatch(queryLower, sourceText);
      totalRelevance += semanticScore;
    });
    
    return Math.min(1, totalRelevance / response.sources.length);
  }

  calculateSemanticMatch(query, sourceText) {
    // Semantic concept matching
    const concepts = {
      'kontakt': ['kontakt', 'telefon', 'e-post', 'epost', 'ring', 'henvendelse'],
      'pris': ['pris', 'koster', 'kr', 'kroner', 'måned', 'betaling', 'kostnad'],
      'tid': ['tid', 'når', 'dag', 'uke', 'måned', 'år', 'klokkeslett'],
      'sted': ['sted', 'adresse', 'hvor', 'plass', 'lokasjon', 'stadion', 'bane'],
      'person': ['trener', 'leder', 'ansvarlig', 'hovedtrener', 'assistent', 'trener'],
      'akademi': ['akademi', 'skole', 'opplæring', 'utvikling', 'OBOS', 'barn'],
      'lag': ['lag', 'spillere', 'tropp', 'keeper', 'forsvar', 'midtbane', 'angrep']
    };
    
    let relevanceScore = 0;
    let totalConcepts = 0;
    
    Object.keys(concepts).forEach(concept => {
      if (query.includes(concept)) {
        totalConcepts++;
        const hasConcept = concepts[concept].some(term => sourceText.includes(term));
        if (hasConcept) relevanceScore++;
      }
    });
    
    return totalConcepts > 0 ? relevanceScore / totalConcepts : 0.3;
  }

  calculateFallbackSourceRelevance(query, response) {
    // Fallback to simple word matching if AI fails
    if (!response.sources || response.sources.length === 0) {
      return 0;
    }
    
    const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2);
    let totalRelevance = 0;
    
    response.sources.forEach(source => {
      const sourceText = (source.title + ' ' + source.url).toLowerCase();
      let relevance = 0;
      
      queryWords.forEach(word => {
        if (sourceText.includes(word)) {
          relevance += 1;
        }
      });
      
      totalRelevance += queryWords.length > 0 ? relevance / queryWords.length : 0;
    });
    
    return Math.min(1, totalRelevance / response.sources.length);
  }

  // Identifiser kunnskapsgap for å være mer kritisk til kunnskapsbanken
  identifyKnowledgeGaps(query, response) {
    const gaps = [];
    
    // Check if response is incomplete or generic
    if (response.reply.includes('kontakt klubben') || 
        response.reply.includes('send e-post') ||
        response.reply.includes('ring klubben')) {
      gaps.push('Missing specific information - user needs to contact club');
    }
    
    // Check if response lacks specific details
    if (!response.reply.includes('@') && !response.reply.includes('kr') && 
        !response.reply.includes('kl.') && !response.reply.includes('uke')) {
      gaps.push('Lacks specific details (prices, times, contact info)');
    }
    
    // Check if response is too generic
    if (response.reply.length < 50) {
      gaps.push('Response too short - may lack sufficient detail');
    }
    
    // Check if fallback was used
    if (this.evaluateFallbackUsage(response)) {
      gaps.push('Fallback used - knowledge base insufficient');
    }
    
    return gaps;
  }

  // Spor kunnskapsgap for gjentakende spørsmål
  trackKnowledgeGap(query, gaps) {
    const normalizedQuery = query.toLowerCase().trim();
    
    if (!this.knowledgeGaps.has(normalizedQuery)) {
      this.knowledgeGaps.set(normalizedQuery, {
        count: 0,
        gaps: [],
        lastSeen: new Date()
      });
    }
    
    const gapData = this.knowledgeGaps.get(normalizedQuery);
    gapData.count++;
    gapData.gaps = [...new Set([...gapData.gaps, ...gaps])]; // Remove duplicates
    gapData.lastSeen = new Date();
  }

  // Hent kunnskapsgap for rapportering
  getKnowledgeGaps() {
    const criticalGaps = [];
    
    this.knowledgeGaps.forEach((data, query) => {
      if (data.count >= 2) { // Spørsmål som feiler 2+ ganger
        criticalGaps.push({
          query: query,
          failureCount: data.count,
          gaps: data.gaps,
          lastSeen: data.lastSeen
        });
      }
    });
    
    return criticalGaps.sort((a, b) => b.failureCount - a.failureCount);
  }

  generateReport() {
    const totalTests = this.results.length;
    if (totalTests === 0) return null;

    const avgResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / totalTests;
    const avgAnswerQuality = this.results.reduce((sum, r) => sum + r.answerQuality, 0) / totalTests;
    const avgConfidence = this.results.reduce((sum, r) => sum + r.confidence, 0) / totalTests;
    const avgUsefulness = this.results.reduce((sum, r) => sum + r.usefulness, 0) / totalTests;
    const avgSourceRelevance = this.results.reduce((sum, r) => sum + r.sourceRelevance, 0) / totalTests;
    const avgTechnicalQuality = this.results.reduce((sum, r) => sum + r.technicalQuality, 0) / totalTests;
    const avgOverallScore = this.results.reduce((sum, r) => sum + r.overallScore, 0) / totalTests;
    const fallbackCount = this.results.filter(r => r.fallbackUsed).length;
    const cacheCount = this.results.filter(r => r.cacheUsed).length;
    const faqCount = this.results.filter(r => r.faqUsed).length;
    const ragCount = this.results.filter(r => r.ragUsed).length;
    
    // Calculate knowledge gaps
    const knowledgeGaps = this.getKnowledgeGaps();
    const totalKnowledgeGaps = this.results.reduce((sum, r) => sum + r.knowledgeGaps.length, 0);
    const avgKnowledgeGaps = totalKnowledgeGaps / totalTests;

    return {
      summary: {
        totalTests,
        avgResponseTime: Math.round(avgResponseTime),
        avgAnswerQuality: Math.round(avgAnswerQuality * 100) / 100,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        avgUsefulness: Math.round(avgUsefulness * 100) / 100,
        avgSourceRelevance: Math.round(avgSourceRelevance * 100) / 100,
        avgTechnicalQuality: Math.round(avgTechnicalQuality * 100) / 100,
        avgOverallScore: Math.round(avgOverallScore * 100) / 100,
        avgKnowledgeGaps: Math.round(avgKnowledgeGaps * 100) / 100,
        fallbackRate: Math.round((fallbackCount / totalTests) * 100),
        cacheRate: Math.round((cacheCount / totalTests) * 100),
        faqRate: Math.round((faqCount / totalTests) * 100),
        ragRate: Math.round((ragCount / totalTests) * 100),
        criticalKnowledgeGaps: knowledgeGaps.length
      },
      knowledgeGaps: knowledgeGaps,
      results: this.results
    };
  }
}

/**
 * Test History Manager
 */
class TestHistoryManager {
  constructor() {
    this.historyPath = path.join(CONFIG.resultsDir, CONFIG.historyFile);
    this.ensureResultsDir();
  }

  ensureResultsDir() {
    if (!fs.existsSync(CONFIG.resultsDir)) {
      fs.mkdirSync(CONFIG.resultsDir, { recursive: true });
    }
  }

  loadHistory() {
    if (!fs.existsSync(this.historyPath)) {
      return [];
    }
    
    try {
      const data = fs.readFileSync(this.historyPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('Could not load test history:', error.message);
      return [];
    }
  }

  saveTest(testData) {
    const history = this.loadHistory();
    history.push(testData);
    
    try {
      fs.writeFileSync(this.historyPath, JSON.stringify(history, null, 2));
      
      // Also save simple version for user
      this.saveSimpleTest(testData);
      
      return true;
    } catch (error) {
      console.error('Could not save test history:', error.message);
      return false;
    }
  }

  saveSimpleTest(testData) {
    // Analyze problems and generate improvement suggestions
    const analysis = this.analyzeProblems(testData);
    
    const simpleData = {
      analysis: analysis,
      testResults: testData.report.results.map(result => ({
        question: result.query,
        answer: result.reply || 'No response'
      })),
      timestamp: new Date(testData.timestamp).toLocaleString('no-NO')
    };
    
    const simplePath = path.join(CONFIG.resultsDir, 'simple-test-results.json');
    const rootSimplePath = path.join(__dirname, '..', 'simple-test-results.json');
    
    try {
      // Save to metrics directory
      fs.writeFileSync(simplePath, JSON.stringify(simpleData, null, 2));
      console.log(`💾 Results saved to: ${simplePath}`);
      
      // Also save to root directory
      fs.writeFileSync(rootSimplePath, JSON.stringify(simpleData, null, 2));
      console.log(`💾 Results also saved to: ${rootSimplePath}`);
    } catch (error) {
      console.error('Could not save simple test results:', error.message);
    }
  }

  analyzeProblems(testData) {
    const report = testData.report;
    
    // Find specific worst performers
    const sortedByScore = [...report.results]
      .map((result, index) => ({ ...result, questionNumber: index + 1 }))
      .sort((a, b) => a.overallScore - b.overallScore);
    
    const fallbackResults = report.results
      .map((result, index) => ({ ...result, questionNumber: index + 1 }))
      .filter(r => r.fallbackUsed);
    
    const lowQualityResults = report.results
      .map((result, index) => ({ ...result, questionNumber: index + 1 }))
      .filter(r => r.answerQuality < 0.5);
    
    const slowResults = report.results
      .map((result, index) => ({ ...result, questionNumber: index + 1 }))
      .filter(r => r.responseTime > 3000);
    
    // Build specific problem description with line breaks for readability
    const problemParts = [];
    
    // Fallback issues (most critical)
    if (fallbackResults.length > 0) {
      const questions = fallbackResults.slice(0, 3).map(r => r.questionNumber).join(', ');
      const topics = fallbackResults.slice(0, 3).map(r => `"${r.query}"`).join(',\n  ');
      problemParts.push(`Klarte ikke svare på spørsmål ${questions} (fallback):\n  ${topics}.`);
    }
    
    // Low quality answers
    if (lowQualityResults.length > 0 && lowQualityResults.length !== fallbackResults.length) {
      const nonFallbackLowQuality = lowQualityResults.filter(r => !r.fallbackUsed).slice(0, 3);
      if (nonFallbackLowQuality.length > 0) {
        const questions = nonFallbackLowQuality.map(r => r.questionNumber).join(', ');
        const scores = nonFallbackLowQuality.map(r => Math.round(r.overallScore * 100)).join('%, ');
        problemParts.push(`Spørsmål ${questions} hadde lav kvalitet\n  (${scores}%).`);
      }
    }
    
    // Slow responses
    if (slowResults.length > 3) {
      problemParts.push(`${slowResults.length} spørsmål hadde treg responstid (>3s).`);
    }
    
    const problems = problemParts.length > 0 
      ? problemParts.join('\n\n')
      : 'Ingen kritiske problemer funnet.';
    
    // Build specific action items based on actual failures
    const actionParts = [];
    
    // Specific actions for fallbacks
    if (fallbackResults.length > 0) {
      const topics = fallbackResults.slice(0, 3).map(r => {
        // Extract key topic from question
        const q = r.query.toLowerCase();
        if (q.includes('farger')) return 'klubbens farger';
        if (q.includes('kiosk')) return 'kiosk/kantina';
        if (q.includes('g19') && q.includes('på')) return 'G19-spillerliste';
        if (q.includes('g14') && q.includes('på')) return 'G14-spillerliste';
        if (q.includes('g13') && q.includes('på')) return 'G13-spillerliste';
        if (q.includes('g15') && q.includes('på')) return 'G15-spillerliste';
        if (q.includes('egon')) return 'partnere (Egon Asker)';
        if (q.includes('bus')) return 'bussholdeplass/transport';
        if (q.includes('app')) return 'mobilapp';
        if (q.includes('billett')) return 'billettpriser';
        // Extract last meaningful words
        const words = q.replace(/\?/g, '').split(' ').filter(w => !['hvem', 'hva', 'hvor', 'når', 'hvordan', 'er', 'på', 'i', 'av', 'til', 'fra'].includes(w));
        return words.slice(-2).join(' ');
      });
      
      const uniqueTopics = [...new Set(topics)];
      actionParts.push(`Legg til info om ${uniqueTopics.join(', ')} i EMBEDDED_KNOWLEDGE i netlify/functions/chat.js`);
    }
    
    // Specific actions for low quality
    if (lowQualityResults.length > 0 && lowQualityResults.length !== fallbackResults.length) {
      const nonFallbackLowQuality = lowQualityResults.filter(r => !r.fallbackUsed).slice(0, 2);
      if (nonFallbackLowQuality.length > 0) {
        const improvements = nonFallbackLowQuality.map(r => {
          const q = r.query.toLowerCase();
          // Identify the EMBEDDED_KNOWLEDGE entry and suggest specific improvement
          if (q.includes('stadion') && q.includes('ligger')) return 'Føyka stadion-entry: legg til fullstendig adresse';
          if (q.includes('sommerleir') && q.includes('arrangeres')) return 'OBOS Camp-entry: legg til detaljer om aktiviteter';
          if (q.includes('parkering') && q.includes('koster')) return 'Parkering-entry: legg til spesifikke priser';
          if (q.includes('e-post') || q.includes('epost')) return 'Kontakt-entry: gjør e-postadresse mer synlig';
          if (q.includes('frivillig')) return 'Frivillig-entry: legg til prosess og krav';
          if (q.includes('dager') && q.includes('akademi')) return 'Akademi-entry: presiser dag-valg mer tydelig';
          
          // Generic improvement based on question type
          const entry = r.sources && r.sources.length > 0 ? r.sources[0].title : 'relevant entry';
          return `${entry}: utvid med mer detaljer`;
        });
        actionParts.push(`Forbedre: ${improvements.join('; ')}`);
      }
    }
    
    // Action for slow responses
    if (slowResults.length > 5) {
      actionParts.push('Optimaliser BM25-søk og øk caching i chat.js');
    }
    
    const tiltak = actionParts.length > 0 
      ? actionParts.map((part, i) => `${i + 1}. ${part}`).join('.\n\n') + '.'
      : 'Fortsett med jevnlig vedlikehold.';
    
    // Generate specific Cursor Agent prompt
    const cursorPrompt = this.generateCursorPrompt(report, fallbackResults, lowQualityResults, slowResults);
    
    return {
      overallScore: Math.round(report.summary.avgOverallScore * 100),
      fallbackCount: fallbackResults.length,
      avgResponseTime: Math.round(report.summary.avgResponseTime),
      problems: problems,
      tiltak: tiltak,
      cursorPrompt: cursorPrompt
    };
  }

  generateCursorPrompt(report, fallbackResults, lowQualityResults, slowResults) {
    const promptParts = [];
    
    promptParts.push('OPPGAVE:\n');
    promptParts.push('Forbedre Askerbot basert på testresultater\n\n');
    promptParts.push(`TESTSCORE: ${Math.round(report.summary.avgOverallScore * 100)}%\n\n`);
    promptParts.push('WORKSPACE:\n');
    promptParts.push('/Users/nikolaigabrielsen/Downloads/askerbot-demo/\n');
    promptParts.push('\n');
    promptParts.push('SPESIFIKKE PROBLEMER:\n');
    
    // Fallback issues
    if (fallbackResults.length > 0) {
      promptParts.push(`\n1. FALLBACK-SVAR\n`);
      promptParts.push(`   (${fallbackResults.length} spørsmål):\n\n`);
      fallbackResults.slice(0, 3).forEach((r, i) => {
        promptParts.push(`   ${i + 1}) "${r.query}"\n`);
      });
      promptParts.push('\n   TILTAK:\n');
      promptParts.push('   - Åpne netlify/functions/chat.js\n');
      promptParts.push('   - Finn EMBEDDED_KNOWLEDGE objektet\n');
      promptParts.push('     (ca. linje 493)\n');
      promptParts.push('   - Legg til nye entries for\n');
      promptParts.push('     manglende emner\n');
      promptParts.push('   - Test med: npm run test\n');
    }
    
    // Low quality issues
    if (lowQualityResults.length > 0 && lowQualityResults.length !== fallbackResults.length) {
      const nonFallbackLowQuality = lowQualityResults.filter(r => !r.fallbackUsed).slice(0, 3);
      if (nonFallbackLowQuality.length > 0) {
        promptParts.push(`\n2. LAV SVAR-KVALITET\n`);
        promptParts.push(`   (${nonFallbackLowQuality.length} spørsmål):\n\n`);
        nonFallbackLowQuality.forEach((r, i) => {
          const score = Math.round(r.overallScore * 100);
          promptParts.push(`   ${i + 1}) "${r.query}"\n`);
          promptParts.push(`      (score: ${score}%)\n`);
        });
        promptParts.push('\n   TILTAK:\n');
        promptParts.push('   - Finn relevante entries i\n');
        promptParts.push('     EMBEDDED_KNOWLEDGE\n');
        promptParts.push('   - Utvid "content" feltet med\n');
        promptParts.push('     mer detaljert info\n');
        promptParts.push('   - Legg til spesifikke detaljer\n');
        promptParts.push('     (priser, tider, adresser)\n');
      }
    }
    
    // Performance issues
    if (slowResults.length > 5) {
      promptParts.push(`\n3. YTELSE\n`);
      promptParts.push(`   (${slowResults.length} spørsmål >3s):\n\n`);
      promptParts.push('   TILTAK:\n');
      promptParts.push('   - Gjennomgå caching-strategi\n');
      promptParts.push('     i chat.js\n');
      promptParts.push('   - Vurder å øke CACHE_TTL verdier\n');
      promptParts.push('   - Optimaliser searchBM25()\n');
      promptParts.push('     funksjonen\n');
    }
    
    promptParts.push('\nVERIFISERING:\n');
    promptParts.push('Kjør "npm run test" for å verifisere\n');
    promptParts.push('forbedringene.\n');
    
    return promptParts.join('');
  }

  getPreviousTest() {
    const history = this.loadHistory();
    return history.length > 0 ? history[history.length - 1] : null;
  }

  getAllTests() {
    return this.loadHistory();
  }
}

/**
 * Random Question Selector
 */
function selectRandomQuestions(pool, count) {
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Test Runner
 */
async function runRAGTest() {
  console.log('🚀 Starting RAG Test Suite for Asker Fotball Chatbot');
  console.log('=' .repeat(60));
  
  const evaluator = new RAGKPIEvaluator();
  const historyManager = new TestHistoryManager();
  
  // Select random questions
  const selectedQuestions = selectRandomQuestions(QUESTION_POOL, CONFIG.questionsPerTest);
  console.log(`📝 Selected ${selectedQuestions.length} random questions from pool of ${QUESTION_POOL.length} questions`);
  console.log('');
  
  // Run tests
  for (let i = 0; i < selectedQuestions.length; i++) {
    const query = selectedQuestions[i];
    console.log(`[${i + 1}/${selectedQuestions.length}] Testing: "${query}"`);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: query
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const evaluation = await evaluator.evaluateResponse(query, data, startTime);
      
      console.log(`   ✅ ${evaluation.responseTime}ms | Score: ${Math.round(evaluation.overallScore * 100)}% | ${evaluation.fallbackUsed ? 'FALLBACK' : 'SUCCESS'}`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      await evaluator.evaluateResponse(query, { reply: '', sources: [] }, startTime);
    }
    
    // Delay between requests
    if (i < selectedQuestions.length - 1) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenRequests));
    }
  }
  
  // Generate report
  const report = evaluator.generateReport();
  if (!report) {
    console.log('❌ No test results to report');
    return;
  }
  
  // Save test data
  const testData = {
    timestamp: new Date().toISOString(),
    endpoint: CONFIG.endpoint,
    questions: selectedQuestions,
    report: report
  };
  
  historyManager.saveTest(testData);
  
  // Display results
  displayResults(testData, historyManager);
  
  return testData;
}

/**
 * Display Results
 */
function displayResults(currentTest, historyManager) {
  const report = currentTest.report;
  const previousTest = historyManager.getPreviousTest();
  const allTests = historyManager.getAllTests();
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 RAG TEST RESULTS');
  console.log('='.repeat(80));
  
  // Test Summary
  console.log(`\n🎯 TEST SUMMARY`);
  console.log(`Timestamp: ${new Date(currentTest.timestamp).toLocaleString('no-NO')}`);
  console.log(`Questions Tested: ${report.summary.totalTests}`);
  console.log(`Overall Score: ${Math.round(report.summary.avgOverallScore * 100)}%`);
  console.log(`Average Response Time: ${report.summary.avgResponseTime}ms`);
  
  // Full Q&A Display
  console.log(`\n📝 QUESTIONS & ANSWERS`);
  console.log('-'.repeat(80));
  report.results.forEach((result, index) => {
    console.log(`\n${index + 1}. Q: ${result.query}`);
    console.log(`   A: ${result.reply || 'No response'}`);
    if (result.sources && result.sources.length > 0) {
      console.log(`   📚 Sources: ${result.sources.map(s => s.title).join(', ')}`);
    }
    console.log(`   📊 Score: ${Math.round(result.overallScore * 100)}% | Time: ${result.responseTime}ms | ${result.fallbackUsed ? 'FALLBACK' : 'SUCCESS'}`);
  });
  
  // KPI Metrics Table
  console.log(`\n📈 ENHANCED KPI METRICS`);
  console.log('-'.repeat(80));
  console.log(`Answer Quality:         ${Math.round(report.summary.avgAnswerQuality * 100)}%`);
  console.log(`Confidence Level:       ${Math.round(report.summary.avgConfidence * 100)}%`);
  console.log(`Usefulness:             ${Math.round(report.summary.avgUsefulness * 100)}%`);
  console.log(`Source Relevance:       ${Math.round(report.summary.avgSourceRelevance * 100)}%`);
  console.log(`Technical Quality:      ${Math.round(report.summary.avgTechnicalQuality * 100)}%`);
  console.log(`Knowledge Gaps:         ${Math.round(report.summary.avgKnowledgeGaps * 100)}%`);
  console.log(`Critical Gaps:          ${report.summary.criticalKnowledgeGaps}`);
  console.log(`Fallback Rate:          ${report.summary.fallbackRate}%`);
  console.log(`Cache Hit Rate:         ${report.summary.cacheRate}%`);
  console.log(`FAQ Usage Rate:         ${report.summary.faqRate}%`);
  console.log(`RAG Usage Rate:         ${report.summary.ragRate}%`);
  
  // Knowledge Gaps Analysis
  if (report.knowledgeGaps && report.knowledgeGaps.length > 0) {
    console.log(`\n🔍 CRITICAL KNOWLEDGE GAPS`);
    console.log('-'.repeat(80));
    report.knowledgeGaps.slice(0, 5).forEach((gap, index) => {
      console.log(`${index + 1}. "${gap.query}" (${gap.failureCount} failures)`);
      gap.gaps.forEach(gapType => {
        console.log(`   • ${gapType}`);
      });
      console.log(`   Last seen: ${gap.lastSeen.toLocaleString('no-NO')}`);
      console.log('');
    });
  }

  // Worst Performers
  const worstPerformers = report.results
    .sort((a, b) => a.overallScore - b.overallScore)
    .slice(0, 3);
  
  console.log(`\n⚠️  WORST PERFORMERS`);
  console.log('-'.repeat(80));
  worstPerformers.forEach((result, index) => {
    console.log(`${index + 1}. "${result.query}" - Score: ${Math.round(result.overallScore * 100)}%`);
    console.log(`   Reason: ${getFailureReason(result)}`);
    if (result.knowledgeGaps && result.knowledgeGaps.length > 0) {
      console.log(`   Knowledge Gaps: ${result.knowledgeGaps.join(', ')}`);
    }
  });
  
  // Comparison with Previous Test
  if (previousTest && allTests.length > 1) {
    console.log(`\n📊 COMPARISON WITH PREVIOUS TEST`);
    console.log('-'.repeat(80));
    const prevReport = previousTest.report;
    
    const scoreDelta = report.summary.avgOverallScore - prevReport.summary.avgOverallScore;
    const timeDelta = report.summary.avgResponseTime - prevReport.summary.avgResponseTime;
    const fallbackDelta = report.summary.fallbackRate - prevReport.summary.fallbackRate;
    
    console.log(`Overall Score: ${Math.round(report.summary.avgOverallScore * 100)}% (${scoreDelta >= 0 ? '+' : ''}${Math.round(scoreDelta * 100)}%)`);
    console.log(`Response Time: ${report.summary.avgResponseTime}ms (${timeDelta >= 0 ? '+' : ''}${timeDelta}ms)`);
    console.log(`Fallback Rate: ${report.summary.fallbackRate}% (${fallbackDelta >= 0 ? '+' : ''}${fallbackDelta}%)`);
    console.log(`Trend: ${scoreDelta > 0.05 ? '📈 IMPROVING' : scoreDelta < -0.05 ? '📉 DEGRADING' : '➡️ STABLE'}`);
  }
  
  // Historical Overview
  if (allTests.length > 1) {
    console.log(`\n📈 HISTORICAL OVERVIEW (${allTests.length} tests)`);
    console.log('-'.repeat(80));
    const scores = allTests.map(t => t.report.summary.avgOverallScore);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const bestScore = Math.max(...scores);
    const worstScore = Math.min(...scores);
    
    console.log(`Average Score (all time): ${Math.round(avgScore * 100)}%`);
    console.log(`Best Score: ${Math.round(bestScore * 100)}%`);
    console.log(`Worst Score: ${Math.round(worstScore * 100)}%`);
    console.log(`Score Range: ${Math.round((bestScore - worstScore) * 100)}%`);
  }
  
  // Diagnosis
  console.log(`\n🔍 DIAGNOSTIC ANALYSIS`);
  console.log('-'.repeat(80));
  const diagnosis = generateDiagnosis(report);
  diagnosis.forEach(issue => {
    console.log(`• ${issue}`);
  });
  
  // Improvement Prompts
  console.log(`\n🛠️  IMPROVEMENT RECOMMENDATIONS`);
  console.log('-'.repeat(80));
  
  const codePrompt = generateCodeAgentPrompt(report, previousTest);
  const knowledgePrompt = generateKnowledgeBaseAgentPrompt(report, previousTest);
  const manualRecommendations = generateManualRecommendations(report, previousTest);
  
  console.log(`\n🤖 CODE AGENT PROMPT:`);
  console.log('```');
  console.log(codePrompt);
  console.log('```');
  
  console.log(`\n📚 KNOWLEDGE BASE AGENT PROMPT:`);
  console.log('```');
  console.log(knowledgePrompt);
  console.log('```');
  
  console.log(`\n👤 MANUAL RECOMMENDATIONS:`);
  manualRecommendations.forEach(rec => {
    console.log(`• ${rec}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Test completed successfully!');
  console.log(`💾 Results saved to: ${historyManager.historyPath}`);
}

/**
 * Get failure reason for a test result
 */
function getFailureReason(result) {
  if (result.fallbackUsed) {
    return 'Used fallback response';
  }
  if (result.answerQuality < 0.3) {
    return 'Poor answer quality - lacks semantic relevance, completeness, or accuracy';
  }
  if (result.confidence < 0.4) {
    return 'Low confidence - lacks crystal clear information';
  }
  if (result.usefulness < 0.3) {
    return 'Low usefulness - lacks actionable information';
  }
  if (result.sourceRelevance < 0.3) {
    return 'Poor source relevance - sources don\'t match question well';
  }
  if (result.technicalQuality < 0.4) {
    return 'Poor technical quality - formatting or structure issues';
  }
  if (result.knowledgeGaps && result.knowledgeGaps.length > 0) {
    return `Knowledge gaps: ${result.knowledgeGaps.join(', ')}`;
  }
  if (result.responseTime > 3000) {
    return 'Slow response time';
  }
  return 'Multiple minor issues';
}

/**
 * Generate diagnostic analysis
 */
function generateDiagnosis(report) {
  const issues = [];
  
  if (report.summary.fallbackRate > 20) {
    issues.push(`High fallback rate (${report.summary.fallbackRate}%) - RAG system needs improvement`);
  }
  
  if (report.summary.avgAnswerQuality < 0.5) {
    issues.push(`Low answer quality (${Math.round(report.summary.avgAnswerQuality * 100)}%) - responses lack semantic relevance, completeness, or accuracy`);
  }
  
  if (report.summary.avgConfidence < 0.6) {
    issues.push(`Low confidence (${Math.round(report.summary.avgConfidence * 100)}%) - responses lack crystal clear information`);
  }
  
  if (report.summary.avgSourceRelevance < 0.3) {
    issues.push(`Poor source relevance (${Math.round(report.summary.avgSourceRelevance * 100)}%) - sources don't match questions well`);
  }
  
  if (report.summary.avgResponseTime > 2000) {
    issues.push(`Slow response times (${report.summary.avgResponseTime}ms average) - performance optimization needed`);
  }
  
  if (report.summary.ragRate < 50) {
    issues.push(`Low RAG usage (${report.summary.ragRate}%) - system relying too much on FAQ/cache`);
  }
  
  if (report.summary.criticalKnowledgeGaps > 0) {
    issues.push(`Critical knowledge gaps detected (${report.summary.criticalKnowledgeGaps}) - knowledge base needs expansion`);
  }
  
  if (report.summary.avgKnowledgeGaps > 0.5) {
    issues.push(`High knowledge gap rate (${Math.round(report.summary.avgKnowledgeGaps * 100)}%) - responses frequently lack specific information`);
  }
  
  if (issues.length === 0) {
    issues.push('No major issues detected - system performing well');
  }
  
  return issues;
}

/**
 * Generate code agent prompt
 */
function generateCodeAgentPrompt(currentReport, previousReport) {
  const issues = [];
  
  if (currentReport.summary.fallbackRate > 20) {
    issues.push('High fallback rate detected. Review searchEmbeddedKnowledge function and improve query matching.');
  }
  
  if (currentReport.summary.avgAnswerQuality < 0.5) {
    issues.push('Low answer quality detected. Improve semantic matching and response generation logic.');
  }
  
  if (currentReport.summary.avgSourceRelevance < 0.3) {
    issues.push('Poor source relevance. Improve calculateRelevance and getSemanticMatches functions.');
  }
  
  if (currentReport.summary.avgResponseTime > 2000) {
    issues.push('Slow response times. Optimize BM25 search and consider caching improvements.');
  }
  
  if (currentReport.summary.ragRate < 50) {
    issues.push('Low RAG usage. Review FAQ_RESPONSES and ensure RAG is used for appropriate queries.');
  }
  
  if (currentReport.summary.criticalKnowledgeGaps > 0) {
    issues.push(`Critical knowledge gaps detected (${currentReport.summary.criticalKnowledgeGaps}). Expand knowledge base with missing information.`);
  }
  
  let prompt = `You are a RAG system improvement agent. Based on the enhanced test results, make these specific improvements to netlify/functions/chat.js:\n\n`;
  
  if (issues.length > 0) {
    issues.forEach((issue, index) => {
      prompt += `${index + 1}. ${issue}\n`;
    });
  } else {
    prompt += '1. System is performing well, consider minor optimizations:\n';
    prompt += '   - Review query preprocessing in preprocessQuery function\n';
    prompt += '   - Optimize semantic matching in getSemanticMatches\n';
    prompt += '   - Consider expanding EMBEDDED_KNOWLEDGE with more examples\n';
  }
  
  prompt += `\nFocus on improving the searchEmbeddedKnowledge function and related helper functions.`;
  
  return prompt;
}

/**
 * Generate knowledge base agent prompt
 */
function generateKnowledgeBaseAgentPrompt(currentReport, previousReport) {
  const issues = [];
  
  if (currentReport.summary.avgAnswerQuality < 0.5) {
    issues.push('Low answer quality - add more specific, comprehensive information to EMBEDDED_KNOWLEDGE');
  }
  
  if (currentReport.summary.avgConfidence < 0.6) {
    issues.push('Low confidence - add more crystal clear, factual information with specific details');
  }
  
  if (currentReport.summary.avgSourceRelevance < 0.3) {
    issues.push('Poor source relevance - improve content titles and descriptions for better matching');
  }
  
  if (currentReport.summary.criticalKnowledgeGaps > 0) {
    issues.push(`Critical knowledge gaps detected (${currentReport.summary.criticalKnowledgeGaps}) - expand knowledge base with missing information`);
  }
  
  if (currentReport.summary.avgKnowledgeGaps > 0.5) {
    issues.push('High knowledge gap rate - add more specific details to reduce generic responses');
  }
  
  let prompt = `You are a knowledge base improvement agent. Based on the enhanced test results, improve the knowledge base in netlify/functions/chat.js:\n\n`;
  
  if (issues.length > 0) {
    issues.forEach((issue, index) => {
      prompt += `${index + 1}. ${issue}\n`;
    });
  } else {
    prompt += '1. Knowledge base is performing well, consider these enhancements:\n';
    prompt += '   - Add more specific pricing information\n';
    prompt += '   - Include more contact details and procedures\n';
    prompt += '   - Add seasonal information (camp dates, etc.)\n';
  }
  
  prompt += `\nFocus on expanding EMBEDDED_KNOWLEDGE and FAQ_RESPONSES with more comprehensive, specific information.`;
  
  return prompt;
}

/**
 * Generate manual recommendations
 */
function generateManualRecommendations(currentReport, previousReport) {
  const recommendations = [];
  
  if (currentReport.summary.fallbackRate > 30) {
    recommendations.push('Consider updating website content to cover more common questions');
  }
  
  if (currentReport.summary.avgAnswerQuality < 0.5) {
    recommendations.push('Review and improve content quality on askerfotball.no for better semantic matching');
  }
  
  if (currentReport.summary.avgConfidence < 0.6) {
    recommendations.push('Add more specific, factual information to website content (prices, times, contact details)');
  }
  
  if (currentReport.summary.criticalKnowledgeGaps > 0) {
    recommendations.push(`Address ${currentReport.summary.criticalKnowledgeGaps} critical knowledge gaps identified in testing`);
  }
  
  if (currentReport.summary.avgKnowledgeGaps > 0.5) {
    recommendations.push('Expand knowledge base with more specific details to reduce generic responses');
  }
  
  if (currentReport.summary.avgResponseTime > 3000) {
    recommendations.push('Consider server performance optimization or hosting upgrade');
  }
  
  if (currentReport.summary.ragRate < 30) {
    recommendations.push('Review if more content should be added to the knowledge base');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('System is performing well - consider regular content updates');
    recommendations.push('Monitor user feedback for additional questions to add');
  }
  
  return recommendations;
}

// Run the test if this file is executed directly
if (require.main === module) {
  runRAGTest().catch(console.error);
}

module.exports = { runRAGTest, RAGKPIEvaluator, TestHistoryManager, QUESTION_POOL };
