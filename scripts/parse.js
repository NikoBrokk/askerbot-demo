#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');

/**
 * Asker Fotball HTML Parser
 * Konverterer rå HTML til strukturert JSON med ren tekst
 */

class HTMLParser {
  constructor() {
    this.baseDir = path.join(__dirname, '..');
    this.rawDir = path.join(this.baseDir, 'storage', 'raw');
    this.parsedDir = path.join(this.baseDir, 'storage', 'parsed');
    this.allowlistPath = path.join(this.baseDir, 'config/allowlist.json');
    
    // URL mapping will be loaded from allowlist.json
    this.urlMapping = {};
  }

  /**
   * Opprett nødvendige mapper
   */
  async ensureDirectories() {
    await fs.mkdir(this.parsedDir, { recursive: true });
  }

  /**
   * Last allowlist og bygg URL mapping
   */
  async loadAllowlist() {
    try {
      const allowlistData = await fs.readFile(this.allowlistPath, 'utf8');
      const allowlist = JSON.parse(allowlistData);
      
      // Bygg URL mapping basert på allowlist
      this.urlMapping = {};
      
      // Håndter ny struktur med static_pages og news_articles
      if (allowlist.static_pages && allowlist.news_articles) {
        // Legg til statiske sider
        for (const url of allowlist.static_pages) {
          const fileName = this.urlToFileName(url);
          this.urlMapping[fileName] = {
            url: url,
            type: 'static',
            priority: allowlist.config?.static_priority?.base_score || 1.0
          };
        }
        
        // Legg til nyhetsartikler
        for (const url of allowlist.news_articles) {
          const fileName = this.urlToFileName(url);
          this.urlMapping[fileName] = {
            url: url,
            type: 'news',
            priority: allowlist.config?.news_priority?.fresh_boost || 1.0
          };
        }
        
        console.log(`✅ Loaded ${allowlist.static_pages.length} static pages and ${allowlist.news_articles.length} news articles`);
      } else {
        // Bakoverkompatibilitet for gammel struktur
        for (const url of allowlist.urls) {
          const fileName = this.urlToFileName(url);
          this.urlMapping[fileName] = {
            url: url,
            type: 'unknown',
            priority: 1.0
          };
        }
        console.log(`✅ Loaded ${Object.keys(this.urlMapping).length} URLs from allowlist (legacy format)`);
      }
      
      return allowlist;
    } catch (error) {
      throw new Error(`Kunne ikke laste allowlist: ${error.message}`);
    }
  }

  /**
   * Konverter URL til filnavn
   */
  urlToFileName(url) {
    const baseUrl = 'https://askerfotball.no';
    if (!url.startsWith(baseUrl)) {
      return null;
    }
    
    let path = url.replace(baseUrl, '');
    if (path === '') path = '/';
    if (path.startsWith('/')) path = path.substring(1);
    if (path === '') return 'index.html';
    
    // Erstatt / med _ og legg til .html
    return path.replace(/\//g, '_') + '.html';
  }

  /**
   * Les HTML-fil og dekomprimer hvis nødvendig
   */
  async readHtmlFile(filePath) {
    try {
      const data = await fs.readFile(filePath);
      
      // Prøv å dekomprimer som gzip først
      try {
        const decompressed = zlib.gunzipSync(data);
        const text = decompressed.toString('utf8');
        
        // Sjekk om dekomprimert tekst ser ut som HTML
        if (text.includes('<html') || text.includes('<!DOCTYPE')) {
          return text;
        }
        
        // Hvis ikke HTML, prøv som ren tekst
        return data.toString('utf8');
      } catch (gzipError) {
        // Hvis gzip feiler, prøv som ren tekst
        return data.toString('utf8');
      }
    } catch (error) {
      throw new Error(`Kunne ikke lese fil ${filePath}: ${error.message}`);
    }
  }

  /**
   * Forbedret HTML parser for moderne Angular/JavaScript-baserte nettsider
   */
  parseHtml(html) {
    let result = {
      title: '',
      breadcrumbs: [],
      content: '',
      published_at: null,
      meta: {}
    };

    try {
      // Ekstraher title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        result.title = this.cleanText(titleMatch[1]);
      }

      // Ekstraher meta tags
      const metaMatches = html.matchAll(/<meta[^>]+>/gi);
      for (const metaMatch of metaMatches) {
        const metaTag = metaMatch[0];
        
        // Published date
        const pubMatch = metaTag.match(/property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i) ||
                        metaTag.match(/name=["']date["'][^>]*content=["']([^"']+)["']/i) ||
                        metaTag.match(/name=["']publish-date["'][^>]*content=["']([^"']+)["']/i);
        
        if (pubMatch) {
          result.published_at = pubMatch[1];
        }

        // Description
        const descMatch = metaTag.match(/name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                         metaTag.match(/property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
        
        if (descMatch) {
          result.meta.description = descMatch[1];
        }
      }

      // Ekstraher breadcrumbs (forskjellige patterns)
      const breadcrumbSelectors = [
        /<nav[^>]*class=["'][^"']*breadcrumb[^"']*["'][^>]*>([\s\S]*?)<\/nav>/gi,
        /<ol[^>]*class=["'][^"']*breadcrumb[^"']*["'][^>]*>([\s\S]*?)<\/ol>/gi,
        /<ul[^>]*class=["'][^"']*breadcrumb[^"']*["'][^>]*>([\s\S]*?)<\/ul>/gi
      ];

      for (const selector of breadcrumbSelectors) {
        const breadcrumbMatch = html.match(selector);
        if (breadcrumbMatch) {
          const breadcrumbHtml = breadcrumbMatch[1];
          const linkMatches = breadcrumbHtml.matchAll(/<a[^>]*>([^<]+)<\/a>/gi);
          
          for (const linkMatch of linkMatches) {
            const text = this.cleanText(linkMatch[1]);
            if (text && !result.breadcrumbs.includes(text)) {
              result.breadcrumbs.push(text);
            }
          }
          break;
        }
      }

      // Forbedret content-ekstraksjon for moderne nettsider
      let mainContent = this.extractMainContent(html);
      
      // Fallback: hvis ingen content funnet, prøv hele dokumentet
      if (!mainContent.trim()) {
        console.log('⚠️ Ingen hovedinnhold funnet, bruker hele dokumentet');
        mainContent = html;
      }

      // Spesialisert parsing for resultater-siden
      if (result.title && result.title.toLowerCase().includes('resultater')) {
        console.log('🔍 Spesialisert parsing for resultater-siden');
        const resultsData = this.parseResultsTable(mainContent);
        
        // Bygg strukturerte resultater
        let structuredContent = this.buildStructuredResults(resultsData);
        
        // Bruk kun strukturerte resultater hvis de er gode nok
        if (resultsData.matches && resultsData.matches.length > 0) {
          result.content = structuredContent;
          console.log(`✅ Bruker strukturerte resultater: ${resultsData.matches.length} kamper, ${resultsData.tableData ? resultsData.tableData.length : 0} lag i tabell`);
        } else {
          // Fallback til vanlig HTML parsing
          result.content = this.htmlToText(mainContent);
        }
      } else {
        // Konverter HTML til ren tekst (vanlig parsing)
        result.content = this.htmlToText(mainContent);
      }

      // Valider og forbedre innhold
      result = this.validateAndImproveContent(result, html);

      return result;

    } catch (error) {
      console.error('Feil ved HTML parsing:', error);
      return {
        title: 'Parse Error',
        breadcrumbs: [],
        content: this.htmlToText(html),
        published_at: null,
        meta: { error: error.message }
      };
    }
  }

  /**
   * Forbedret content-ekstraksjon for moderne nettsider
   */
  extractMainContent(html) {
    // Fjern script, style, og andre ikke-innholds-elementer først
    const cleanedHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
      .replace(/<embed[^>]*>[\s\S]*?<\/embed>/gi, '');

    // Moderne content-selectorer (prioritert rekkefølge)
    const contentSelectors = [
      // Angular/React/Vue app containers
      /<div[^>]*class=["'][^"']*app[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class=["'][^"']*main[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class=["'][^"']*container[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
      
      // Standard HTML5 semantiske elementer
      /<main[^>]*>([\s\S]*?)<\/main>/gi,
      /<article[^>]*>([\s\S]*?)<\/article>/gi,
      /<section[^>]*>([\s\S]*?)<\/section>/gi,
      
      // CMS-spesifikke content-klasser
      /<div[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class=["'][^"']*post-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class=["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class=["'][^"']*page-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class=["'][^"']*body-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
      
      // ID-baserte selectorer
      /<div[^>]*id=["']content["'][^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*id=["']main["'][^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*id=["']page["'][^>]*>([\s\S]*?)<\/div>/gi,
      
      // Angular-spesifikke patterns
      /<div[^>]*ng-app[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*ng-view[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*ui-view[^>]*>([\s\S]*?)<\/div>/gi,
      
      // React-spesifikke patterns
      /<div[^>]*id=["']root["'][^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*id=["']app["'][^>]*>([\s\S]*?)<\/div>/gi
    ];

    let bestContent = '';
    let bestScore = 0;

    for (const selector of contentSelectors) {
      const matches = [...cleanedHtml.matchAll(selector)];
      
      for (const match of matches) {
        const content = match[1];
        if (!content) continue;

        // Score content basert på kvalitet
        const score = this.scoreContent(content);
        
        if (score > bestScore) {
          bestScore = score;
          bestContent = content;
        }
      }
    }

    // Hvis ingen bra content funnet, prøv å finne den største div uten navigasjon
    if (!bestContent.trim() || bestScore < 10) {
      const divMatches = [...cleanedHtml.matchAll(/<div[^>]*>([\s\S]*?)<\/div>/gi)];
      let largestDiv = '';
      let largestSize = 0;
      
      for (const divMatch of divMatches) {
        const divContent = divMatch[1];
        if (!divContent) continue;
        
        // Filtrer bort navigasjon og UI-elementer
        if (this.isNavigationOrUI(divContent)) continue;
        
        const contentSize = divContent.length;
        if (contentSize > largestSize) {
          largestSize = contentSize;
          largestDiv = divContent;
        }
      }
      
      if (largestDiv) {
        bestContent = largestDiv;
      }
    }

    return bestContent;
  }

  /**
   * Score content basert på kvalitet og relevans
   */
  scoreContent(content) {
    if (!content || content.length < 50) return 0;
    
    let score = 0;
    
    // Bonus for tekstinnhold
    const textLength = this.htmlToText(content).length;
    score += Math.min(textLength / 100, 50); // Max 50 points for length
    
    // Bonus for strukturelle elementer
    const headings = (content.match(/<h[1-6][^>]*>/gi) || []).length;
    score += headings * 5;
    
    const paragraphs = (content.match(/<p[^>]*>/gi) || []).length;
    score += paragraphs * 2;
    
    const lists = (content.match(/<[uo]l[^>]*>/gi) || []).length;
    score += lists * 3;
    
    // Penalty for navigasjon og UI-elementer
    if (this.isNavigationOrUI(content)) {
      score -= 20;
    }
    
    // Penalty for tomme eller nesten tomme elementer
    const textContent = this.htmlToText(content);
    if (textContent.length < 100) {
      score -= 10;
    }
    
    // Bonus for norsk tekst (Asker Fotball spesifikt)
    const norwegianWords = (textContent.match(/\b(asker|fotball|klubb|lag|spillere|kamp|resultat|nyheter|terminliste|stadion|føyka)\b/gi) || []).length;
    score += norwegianWords * 2;
    
    return Math.max(0, score);
  }

  /**
   * Sjekk om content er navigasjon eller UI-elementer
   */
  isNavigationOrUI(content) {
    const lowerContent = content.toLowerCase();
    
    // Navigasjonsindikatorer
    const navPatterns = [
      /<nav[^>]*>/i,
      /<header[^>]*>/i,
      /<footer[^>]*>/i,
      /class=["'][^"']*nav[^"']*["']/i,
      /class=["'][^"']*menu[^"']*["']/i,
      /class=["'][^"']*header[^"']*["']/i,
      /class=["'][^"']*footer[^"']*["']/i,
      /class=["'][^"']*sidebar[^"']*["']/i,
      /class=["'][^"']*widget[^"']*["']/i,
      /class=["'][^"']*advertisement[^"']*["']/i,
      /class=["'][^"']*ad[^"']*["']/i,
      /class=["'][^"']*banner[^"']*["']/i,
      /class=["'][^"']*popup[^"']*["']/i,
      /class=["'][^"']*modal[^"']*["']/i,
      /class=["'][^"']*overlay[^"']*["']/i,
      /class=["'][^"']*cookie[^"']*["']/i,
      /class=["'][^"']*consent[^"']*["']/i
    ];
    
    for (const pattern of navPatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }
    
    // Inneholder hovedsakelig navigasjonslinker
    const linkCount = (content.match(/<a[^>]*>/gi) || []).length;
    const textLength = this.htmlToText(content).length;
    
    if (linkCount > 0 && textLength > 0 && linkCount / textLength > 0.1) {
      return true;
    }
    
    // Inneholder hovedsakelig tomme elementer eller bullet points
    const bulletCount = (content.match(/•/g) || []).length;
    if (bulletCount > 10 && textLength < 200) {
      return true;
    }
    
    return false;
  }

  /**
   * Spesialisert parsing for resultater-tabeller
   */
  parseResultsTable(html) {
    // Finn alle match-resultater
    const matchRows = html.match(/<tr[^>]*class=["'][^"']*schedule__match[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi) || [];
    const matches = [];
    
    for (const row of matchRows) {
      const match = this.parseMatchRow(row);
      if (match) {
        matches.push(match);
      }
    }
    
    // Finn ligatabellen
    const leagueTable = html.match(/<table[^>]*class=["'][^"']*table--league[^"']*["'][^>]*>([\s\S]*?)<\/table>/gi);
    const tableData = leagueTable ? this.parseLeagueTable(leagueTable[0]) : null;
    
    return { matches, tableData };
  }

  /**
   * Parse enkelt match-rad
   */
  parseMatchRow(rowHtml) {
    try {
      // Ekstraher runde nummer
      const roundMatch = rowHtml.match(/<span>#(\d+)<\/span>/);
      const round = roundMatch ? roundMatch[1] : '';
      
      // Ekstraher lag og resultat
      const teamsMatch = rowHtml.match(/class=["'][^"']*schedule__match__item--teams["'][^>]*>([\s\S]*?)<\/td>/);
      let teams = '';
      let result = '';
      let outcome = '';
      
      if (teamsMatch) {
        const teamsHtml = teamsMatch[1];
        
        // Ekstraher resultat-indikator (S=Seier, T=Tap, U=Uavgjort)
        const outcomeMatch = teamsHtml.match(/class=["'][^"']*team-form--(win|lose|draw)["'][^>]*>([^<]+)</);
        if (outcomeMatch) {
          outcome = outcomeMatch[2];
        }
        
        // Ekstraher lag-navn og resultat
        const teamsText = this.htmlToText(teamsHtml);
        const resultMatch = teamsText.match(/\(([^)]+)\)/);
        if (resultMatch) {
          result = resultMatch[1];
        }
        
        teams = teamsText.replace(/\([^)]+\)/g, '').replace(/^[STU]\s*/, '').trim();
      }
      
      // Ekstraher dato og tid
      const dateMatch = rowHtml.match(/class=["'][^"']*schedule__match__item--date["'][^>]*>([\s\S]*?)<\/td>/);
      const dateTime = dateMatch ? this.cleanText(this.htmlToText(dateMatch[1])) : '';
      
      // Ekstraher arena
      const venueMatch = rowHtml.match(/class=["'][^"']*schedule__match__item--venue["'][^>]*>([\s\S]*?)<\/td>/);
      const venue = venueMatch ? this.cleanText(this.htmlToText(venueMatch[1])) : '';
      
      // Ekstraher liga
      const leagueMatch = rowHtml.match(/class=["'][^"']*schedule__match__item--league["'][^>]*>([\s\S]*?)<\/td>/);
      const league = leagueMatch ? this.cleanText(this.htmlToText(leagueMatch[1])) : '';
      
      if (teams && result) {
        return {
          round,
          teams,
          result,
          outcome,
          dateTime,
          venue,
          league
        };
      }
    } catch (error) {
      console.log('Feil ved parsing av match-rad:', error.message);
    }
    
    return null;
  }

  /**
   * Parse ligatabell
   */
  parseLeagueTable(tableHtml) {
    const rows = tableHtml.match(/<tr[^>]*class=["'][^"']*table__row[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi) || [];
    const teams = [];
    
    for (const row of rows) {
      const team = this.parseLeagueRow(row);
      if (team) {
        teams.push(team);
      }
    }
    
    return teams;
  }

  /**
   * Bygg strukturerte resultater fra parsed data
   */
  buildStructuredResults(resultsData) {
    let content = '# Resultater\n\n';
    
    // Legg til kampresultater
    if (resultsData.matches && resultsData.matches.length > 0) {
      content += '## Kampresultater\n\n';
      
      // Grupper kamper etter måned
      const matchesByMonth = {};
      for (const match of resultsData.matches) {
        let month = 'Ukjent måned';
        
        // Prøv forskjellige dato-formater
        const dateFormats = [
          /(\w+)\s+\d+\.\d+\.\d+/,  // "oktober 11.10.2025"
          /(\w+)\s+\d+\.\d+/,       // "oktober 11.10"
          /(\d+)\.(\d+)\.(\d+)/,    // "11.10.2025"
          /(\d+)\.(\d+)/            // "11.10"
        ];
        
        for (const format of dateFormats) {
          const monthMatch = match.dateTime.match(format);
          if (monthMatch) {
            if (monthMatch[1] && isNaN(monthMatch[1])) {
              // Månedsnavn funnet
              month = monthMatch[1];
            } else if (monthMatch[2] && !isNaN(monthMatch[2])) {
              // Månedsnummer funnet
              const monthNum = parseInt(monthMatch[2]);
              const monthNames = ['', 'januar', 'februar', 'mars', 'april', 'mai', 'juni', 
                                'juli', 'august', 'september', 'oktober', 'november', 'desember'];
              month = monthNames[monthNum] || 'Ukjent måned';
            }
            break;
          }
        }
        
        if (!matchesByMonth[month]) {
          matchesByMonth[month] = [];
        }
        matchesByMonth[month].push(match);
      }
      
      // Legg til kamper gruppert etter måned
      for (const [month, matches] of Object.entries(matchesByMonth)) {
        content += `### ${month}\n\n`;
        
        for (const match of matches) {
          const outcomeText = match.outcome === 'S' ? 'Seier' : 
                             match.outcome === 'T' ? 'Tap' : 
                             match.outcome === 'U' ? 'Uavgjort' : '';
          
          content += `**Runde ${match.round}:** ${match.teams} ${match.result}\n`;
          if (outcomeText) content += `- Resultat: ${outcomeText}\n`;
          if (match.dateTime) content += `- Dato: ${match.dateTime}\n`;
          if (match.venue) content += `- Arena: ${match.venue}\n`;
          if (match.league) content += `- Liga: ${match.league}\n`;
          content += '\n';
        }
      }
    }
    
    // Legg til ligatabell
    if (resultsData.tableData && resultsData.tableData.length > 0) {
      content += '## Ligatabell\n\n';
      content += '| Pos | Lag | S | V | U | T | + | - | +/- | P |\n';
      content += '|-----|-----|---|---|---|---|---|---|-----|---|\n';
      
      for (const team of resultsData.tableData) {
        content += `| ${team.position} | ${team.teamName} | ${team.played} | ${team.won} | ${team.drawn} | ${team.lost} | ${team.goalsFor} | ${team.goalsAgainst} | ${team.goalDiff} | ${team.points} |\n`;
      }
      
      content += '\n';
    }
    
    return content;
  }

  /**
   * Parse enkelt ligatabell-rad
   */
  parseLeagueRow(rowHtml) {
    try {
      const cells = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      if (cells.length < 10) return null;
      
      const position = this.cleanText(this.htmlToText(cells[0])).replace(/\|/g, '').trim();
      const teamName = this.cleanText(this.htmlToText(cells[1])).replace(/\|/g, '').trim();
      const played = this.cleanText(this.htmlToText(cells[2])).replace(/\|/g, '').trim();
      const won = this.cleanText(this.htmlToText(cells[3])).replace(/\|/g, '').trim();
      const drawn = this.cleanText(this.htmlToText(cells[4])).replace(/\|/g, '').trim();
      const lost = this.cleanText(this.htmlToText(cells[5])).replace(/\|/g, '').trim();
      const goalsFor = this.cleanText(this.htmlToText(cells[6])).replace(/\|/g, '').trim();
      const goalsAgainst = this.cleanText(this.htmlToText(cells[7])).replace(/\|/g, '').trim();
      const goalDiff = this.cleanText(this.htmlToText(cells[8])).replace(/\|/g, '').trim();
      const points = this.cleanText(this.htmlToText(cells[9])).replace(/\|/g, '').trim();
      
      return {
        position,
        teamName,
        played,
        won,
        drawn,
        lost,
        goalsFor,
        goalsAgainst,
        goalDiff,
        points
      };
    } catch (error) {
      console.log('Feil ved parsing av ligatabell-rad:', error.message);
      return null;
    }
  }

  /**
   * Forbedret HTML til tekst konvertering for moderne nettsider
   */
  htmlToText(html) {
    if (!html) return '';
    
    return html
      // Fjern script, style, og andre ikke-innholds-elementer
      .replace(/<(script|style|noscript|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<(script|style|noscript|iframe|object|embed)[^>]*\/>/gi, '')
      
      // Fjern Angular/React/Vue spesifikke elementer
      .replace(/<ng-[^>]*>[\s\S]*?<\/ng-[^>]*>/gi, '')
      .replace(/<ng-[^>]*\/>/gi, '')
      .replace(/<react-[^>]*>[\s\S]*?<\/react-[^>]*>/gi, '')
      .replace(/<vue-[^>]*>[\s\S]*?<\/vue-[^>]*>/gi, '')
      
      // Fjern data-attributter og Angular-spesifikke attributter
      .replace(/\s*data-[^=]*="[^"]*"/gi, '')
      .replace(/\s*ng-[^=]*="[^"]*"/gi, '')
      .replace(/\s*ng-[^=]*='[^']*'/gi, '')
      .replace(/\s*ng-[^=]*/gi, '')
      .replace(/\s*ui-[^=]*="[^"]*"/gi, '')
      .replace(/\s*ui-[^=]*='[^']*'/gi, '')
      .replace(/\s*ui-[^=]*/gi, '')
      
      // Konverter strukturelle elementer
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/section>/gi, '\n\n')
      .replace(/<\/article>/gi, '\n\n')
      
      // Konverter lister
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<ul[^>]*>/gi, '\n')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<ol[^>]*>/gi, '\n')
      .replace(/<\/ol>/gi, '\n')
      
      // Konverter headings til markdown
      .replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi, (match, level, content) => {
        const hashes = '#'.repeat(parseInt(level));
        return `\n${hashes} ${this.cleanText(content)}\n`;
      })
      
      // Konverter tekstformatering
      .replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**')
      .replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, '*$2*')
      .replace(/<(u)[^>]*>(.*?)<\/\1>/gi, '_$2_')
      
      // Konverter links til markdown (men filtrer bort JavaScript-lenker)
      .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, (match, href, text) => {
        if (href.startsWith('javascript:') || href === '#' || href === '') {
          return this.cleanText(text);
        }
        return `[${this.cleanText(text)}](${href})`;
      })
      
      // Konverter tabeller - forbedret parsing
      .replace(/<table[^>]*>/gi, '\n\n## Tabell\n\n')
      .replace(/<\/table>/gi, '\n\n')
      .replace(/<thead[^>]*>/gi, '\n')
      .replace(/<\/thead>/gi, '\n')
      .replace(/<tbody[^>]*>/gi, '\n')
      .replace(/<\/tbody>/gi, '\n')
      .replace(/<tr[^>]*>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<td[^>]*>/gi, '| ')
      .replace(/<\/td>/gi, '')
      .replace(/<th[^>]*>/gi, '| ')
      .replace(/<\/th>/gi, '')
      
      // Fjern tomme elementer
      .replace(/<[^>]*>\s*<\/[^>]*>/gi, '')
      
      // Fjern alle andre HTML tags
      .replace(/<[^>]*>/g, '')
      
      // Rydd opp i tekst
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Fjern tomme linjer
      .replace(/[ \t]+/g, ' ') // Fjern ekstra spaces
      .replace(/\n\s*\n/g, '\n\n') // Normaliser linjeskift
      .replace(/^\s+|\s+$/gm, '') // Fjern whitespace i start/slutt av linjer
      .trim();
  }

  /**
   * Valider og forbedre parsed innhold
   */
  validateAndImproveContent(result, originalHtml) {
    // Hvis tittel er "Parse Error", prøv å ekstrahere bedre tittel
    if (result.title === 'Parse Error' || !result.title.trim()) {
      result.title = this.extractBetterTitle(originalHtml);
    }

    // Valider innholdskvalitet
    const contentQuality = this.assessContentQuality(result.content);
    
    if (contentQuality.score < 20) {
      console.log('⚠️ Lav innholdskvalitet, prøver fallback parsing...');
      
      // Prøv fallback parsing
      const fallbackContent = this.fallbackContentExtraction(originalHtml);
      if (fallbackContent && fallbackContent.length > result.content.length) {
        result.content = fallbackContent;
        console.log('✅ Fallback parsing forbedret innhold');
      }
    }

    // Filtrer bort navigasjon og UI-elementer fra innhold
    result.content = this.filterNavigationAndUI(result.content);

    // Forbedre breadcrumbs hvis tomme
    if (result.breadcrumbs.length === 0) {
      result.breadcrumbs = this.extractBreadcrumbsFromContent(result.content);
    }

    return result;
  }

  /**
   * Ekstraher bedre tittel fra HTML
   */
  extractBetterTitle(html) {
    // Prøv forskjellige tittel-kilder
    const titleSources = [
      // Meta title
      html.match(/<title[^>]*>([^<]+)<\/title>/i),
      // Open Graph title
      html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i),
      // Twitter title
      html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i),
      // H1 heading
      html.match(/<h1[^>]*>([^<]+)<\/h1>/i),
      // H2 heading
      html.match(/<h2[^>]*>([^<]+)<\/h2>/i)
    ];

    for (const source of titleSources) {
      if (source && source[1]) {
        const title = this.cleanText(source[1]);
        if (title && title.length > 3 && title !== 'Parse Error') {
          return title;
        }
      }
    }

    // Fallback: bruk URL-path
    const urlMatch = html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
    if (urlMatch) {
      const url = urlMatch[1];
      const pathParts = url.split('/').filter(part => part.length > 0);
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        return lastPart.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      }
    }

    return 'Ukjent tittel';
  }

  /**
   * Vurder innholdskvalitet
   */
  assessContentQuality(content) {
    if (!content || content.length < 50) {
      return { score: 0, issues: ['For kort innhold'] };
    }

    let score = 0;
    const issues = [];

    // Bonus for lengde
    score += Math.min(content.length / 100, 30);

    // Bonus for strukturelle elementer
    const headings = (content.match(/^#+\s/gm) || []).length;
    score += headings * 3;

    const paragraphs = (content.match(/\n\n/g) || []).length;
    score += paragraphs * 2;

    const lists = (content.match(/^•\s/gm) || []).length;
    score += lists * 1;

    // Penalty for navigasjonsinnhold
    const navKeywords = ['meny', 'navigasjon', 'søk', 'profil', 'innlogging', 'registrering'];
    const navCount = navKeywords.filter(keyword => 
      content.toLowerCase().includes(keyword)
    ).length;
    
    if (navCount > 3) {
      score -= 15;
      issues.push('Inneholder navigasjonsinnhold');
    }

    // Penalty for tomme eller repetetive innhold
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const uniqueLines = new Set(lines);
    
    if (lines.length > 0 && uniqueLines.size / lines.length < 0.5) {
      score -= 10;
      issues.push('Repetitivt innhold');
    }

    // Bonus for norsk fotball-relatert innhold
    const footballKeywords = ['asker', 'fotball', 'klubb', 'lag', 'spillere', 'kamp', 'resultat', 'nyheter', 'terminliste', 'stadion', 'føyka'];
    const footballCount = footballKeywords.filter(keyword => 
      content.toLowerCase().includes(keyword)
    ).length;
    
    score += footballCount * 2;

    return { score: Math.max(0, score), issues };
  }

  /**
   * Fallback content extraction for problematiske sider
   */
  fallbackContentExtraction(html) {
    // Fjern alt unødvendig først
    const cleaned = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');

    // Prøv å finne alle tekstinnhold
    const textContent = this.htmlToText(cleaned);
    
    // Del opp i seksjoner basert på headings
    const sections = textContent.split(/(?=^#+\s)/m);
    
    // Velg de beste seksjonene
    const goodSections = sections.filter(section => {
      const trimmed = section.trim();
      return trimmed.length > 100 && 
             !this.isNavigationOrUI(trimmed) &&
             !trimmed.match(/^(meny|navigasjon|søk|profil|innlogging)/i);
    });

    return goodSections.join('\n\n');
  }

  /**
   * Filtrer bort navigasjon og UI-elementer fra innhold
   */
  filterNavigationAndUI(content) {
    if (!content) return '';

    const lines = content.split('\n');
    const filteredLines = lines.filter(line => {
      const trimmed = line.trim();
      
      // Fjern tomme linjer
      if (!trimmed) return false;
      
      // Fjern navigasjonsindikatorer
      if (trimmed.match(/^(meny|navigasjon|søk|profil|innlogging|registrering|cookie|personvern|vilkår)/i)) {
        return false;
      }
      
      // Fjern linjer som hovedsakelig inneholder lenker
      const linkCount = (trimmed.match(/\[([^\]]+)\]\([^)]+\)/g) || []).length;
      if (linkCount > 0 && trimmed.length < 50) {
        return false;
      }
      
      // Fjern linjer med bare bullet points
      if (trimmed.match(/^•\s*$/)) {
        return false;
      }
      
      return true;
    });

    return filteredLines.join('\n').trim();
  }

  /**
   * Ekstraher breadcrumbs fra innhold
   */
  extractBreadcrumbsFromContent(content) {
    const breadcrumbs = [];
    
    // Prøv å finne breadcrumb-mønstre i innholdet
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Se etter mønstre som "Hjem > Om klubben > Ansatte"
      if (trimmed.includes('>') && trimmed.length < 100) {
        const parts = trimmed.split('>').map(part => part.trim());
        if (parts.length > 1 && parts.length < 5) {
          breadcrumbs.push(...parts);
          break;
        }
      }
    }
    
    return breadcrumbs.filter(bc => bc.length > 0);
  }

  /**
   * Rydd opp i tekst
   */
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Generer slug fra filnavn
   */
  generateSlug(filename) {
    return filename.replace('.html', '');
  }

  /**
   * Parse enkelt HTML-fil
   */
  async parseFile(filename) {
    console.log(`  📄 Parserer ${filename}`);
    
    const filePath = path.join(this.rawDir, filename);
    const urlMapping = this.urlMapping[filename];
    
    if (!urlMapping) {
      console.log(`    ⚠️  Ingen URL mapping for ${filename}`);
      return null;
    }
    
    // Håndter både ny og gammel struktur
    const url = typeof urlMapping === 'string' ? urlMapping : urlMapping.url;
    const type = typeof urlMapping === 'string' ? 'unknown' : urlMapping.type;
    const priority = typeof urlMapping === 'string' ? 1.0 : urlMapping.priority;

    try {
      // Les HTML
      const html = await this.readHtmlFile(filePath);
      
      // Parse HTML
      const parsed = this.parseHtml(html);
      
      // Bygg resultat
      const result = {
        title: parsed.title,
        url: url,
        type: type,
        priority: priority,
        breadcrumbs: parsed.breadcrumbs,
        content: parsed.content,
        published_at: parsed.published_at,
        lang: "no",
        meta: parsed.meta,
        word_count: parsed.content.split(/\s+/).length,
        parsed_at: new Date().toISOString()
      };

      // Lagre resultat
      const slug = this.generateSlug(filename);
      const outputPath = path.join(this.parsedDir, `${slug}.json`);
      
      await fs.writeFile(outputPath, JSON.stringify(result, null, 2), 'utf8');
      
      console.log(`    ✅ Lagret: ${outputPath} (${result.word_count} ord)`);
      
      return result;

    } catch (error) {
      console.error(`    ❌ Feil ved parsing av ${filename}:`, error.message);
      return null;
    }
  }

  /**
   * Hovedfunksjon - parse alle HTML-filer
   */
  async run() {
    console.log('🔍 Starter Asker Fotball HTML Parser');
    console.log('=' .repeat(50));
    
    try {
      // Opprett mapper
      await this.ensureDirectories();
      console.log('✅ Mapper opprettet');
      
      // Last allowlist og bygg URL mapping
      await this.loadAllowlist();
      
      // Finn alle HTML-filer
      const files = await fs.readdir(this.rawDir);
      const htmlFiles = files.filter(file => file.endsWith('.html'));
      
      console.log(`✅ Funnet ${htmlFiles.length} HTML-filer`);
      
      if (htmlFiles.length === 0) {
        console.log('⚠️  Ingen HTML-filer funnet i storage/raw/');
        console.log('   Kjør først: npm run fetch');
        return;
      }

      // Parse hver fil
      const results = [];
      
      for (let i = 0; i < htmlFiles.length; i++) {
        const filename = htmlFiles[i];
        console.log(`\n📄 [${i + 1}/${htmlFiles.length}] ${filename}`);
        
        const result = await this.parseFile(filename);
        if (result) {
          results.push(result);
        }
      }
      
      // Oppsummering
      console.log('\n' + '=' .repeat(50));
      console.log('📊 Oppsummering:');
      
      const successful = results.length;
      const failed = htmlFiles.length - successful;
      const totalWords = results.reduce((sum, r) => sum + (r.word_count || 0), 0);
      
      console.log(`  ✅ Vellykkede: ${successful}`);
      console.log(`  ❌ Feilet: ${failed}`);
      console.log(`  📝 Totalt ord: ${totalWords.toLocaleString()}`);
      console.log(`  📁 Parsed JSON lagret i: ${this.parsedDir}`);
      
      if (successful > 0) {
        console.log('\n📋 Parsede dokumenter:');
        results.forEach(r => {
          console.log(`  • ${r.title} (${r.word_count} ord)`);
        });
      }
      
      console.log('\n🎉 Parsing fullført!');
      
    } catch (error) {
      console.error('💥 Kritisk feil:', error.message);
      process.exit(1);
    }
  }
}

// Kjør hvis kalt direkte
if (require.main === module) {
  const parser = new HTMLParser();
  parser.run().catch(error => {
    console.error('Uventet feil:', error);
    process.exit(1);
  });
}

module.exports = HTMLParser;
