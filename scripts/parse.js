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
    
    // URL mapping for å gjenkjenne hvilken URL som tilhører hvilken fil
    this.urlMapping = {
      'om-klubben.html': 'https://askerfotball.no/om-klubben',
      'om-klubben_solidaritetsfondet.html': 'https://askerfotball.no/om-klubben/solidaritetsfondet',
      'om-klubben_ansatte.html': 'https://askerfotball.no/om-klubben/ansatte',
      'om-klubben_styret-asker-fotball.html': 'https://askerfotball.no/om-klubben/styret-asker-fotball',
      'lag_utviklingslag_om-utviklingslagene.html': 'https://askerfotball.no/lag/utviklingslag/om-utviklingslagene',
      'lag_utviklingslag_akademi.html': 'https://askerfotball.no/lag/utviklingslag/akademi',
      'om-stadion_foyka-stadion.html': 'https://askerfotball.no/om-stadion/foyka-stadion',
      'om-stadion_fotballhuset.html': 'https://askerfotball.no/om-stadion/fotballhuset',
      'om-klubben_to-steg-frem.html': 'https://askerfotball.no/om-klubben/to-steg-frem',
      'om-klubben_historiske-fakta.html': 'https://askerfotball.no/om-klubben/historiske-fakta'
    };
  }

  /**
   * Opprett nødvendige mapper
   */
  async ensureDirectories() {
    await fs.mkdir(this.parsedDir, { recursive: true });
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
   * Enkel HTML parser (uten eksterne dependencies)
   */
  parseHtml(html) {
    const result = {
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

      // Ekstraher hovedinnhold
      const contentSelectors = [
        /<main[^>]*>([\s\S]*?)<\/main>/gi,
        /<article[^>]*>([\s\S]*?)<\/article>/gi,
        /<div[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
        /<div[^>]*class=["'][^"']*post-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
        /<div[^>]*class=["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
        /<div[^>]*id=["']content["'][^>]*>([\s\S]*?)<\/div>/gi
      ];

      let mainContent = '';
      
      for (const selector of contentSelectors) {
        const contentMatch = html.match(selector);
        if (contentMatch && contentMatch[1].trim().length > mainContent.length) {
          mainContent = contentMatch[1];
        }
      }

      // Hvis ingen spesifikk content-selector fungerte, prøv å finne den største div
      if (!mainContent.trim()) {
        const divMatches = html.matchAll(/<div[^>]*>([\s\S]*?)<\/div>/gi);
        let largestDiv = '';
        
        for (const divMatch of divMatches) {
          const divContent = divMatch[1];
          // Filtrer bort script, style, nav, footer, header
          if (!divContent.match(/<(script|style|nav|footer|header)/i) && 
              divContent.length > largestDiv.length) {
            largestDiv = divContent;
          }
        }
        mainContent = largestDiv;
      }

      // Konverter HTML til ren tekst
      result.content = this.htmlToText(mainContent || html || '');

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
   * Konverter HTML til ren tekst
   */
  htmlToText(html) {
    if (!html) return '';
    
    return html
      // Fjern script og style tags
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
      // Konverter br til newlines
      .replace(/<br\s*\/?>/gi, '\n')
      // Konverter p til newlines
      .replace(/<\/p>/gi, '\n\n')
      // Konverter div til newlines
      .replace(/<\/div>/gi, '\n')
      // Konverter li til bullets
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      // Konverter headings til markdown
      .replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi, (match, level, content) => {
        const hashes = '#'.repeat(parseInt(level));
        return `\n${hashes} ${this.cleanText(content)}\n`;
      })
      // Konverter strong/b til bold
      .replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**')
      // Konverter em/i til italic
      .replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, '*$2*')
      // Konverter links til markdown
      .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      // Fjern alle andre HTML tags
      .replace(/<[^>]*>/g, '')
      // Rydd opp i tekst
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Fjern tomme linjer
      .replace(/[ \t]+/g, ' ') // Fjern ekstra spaces
      .trim();
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
    const url = this.urlMapping[filename];
    
    if (!url) {
      console.log(`    ⚠️  Ingen URL mapping for ${filename}`);
      return null;
    }

    try {
      // Les HTML
      const html = await this.readHtmlFile(filePath);
      
      // Parse HTML
      const parsed = this.parseHtml(html);
      
      // Bygg resultat
      const result = {
        title: parsed.title,
        url: url,
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
