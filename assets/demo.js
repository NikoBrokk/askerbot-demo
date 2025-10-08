/**
 * Askerbot Demo - Regelbasert chatbot logikk
 * Ingen eksterne avhengigheter, isolert funksjonalitet
 */

// DOM elementer
const msgs = document.getElementById('msgs');
const form = document.getElementById('form');
const input = document.getElementById('i');
const dialog = document.getElementById('dialog');
const closeBtn = document.getElementById('btnClose');
const shortcuts = document.querySelectorAll('.shortcuts [data-msg]');

/**
 * Legg til melding i chatten
 * @param {string} text - Meldingstekst
 * @param {string} who - 'bot' eller 'you'
 */
function addMsg(text, who = 'bot') {
  const d = document.createElement('div');
  d.className = 'm ' + (who === 'you' ? 'you' : 'bot');
  d.textContent = text;
  msgs.appendChild(d);
  
  // Autoscroll til bunnen
  msgs.scrollTop = msgs.scrollHeight;
}

/**
 * Send melding til OpenAI API via Netlify Edge Function
 * @param {string} raw - Rå tekst fra bruker
 */
async function respond(raw) {
  const message = String(raw).trim();
  
  // Vis loading state
  const loadingMsg = document.createElement('div');
  loadingMsg.className = 'm bot';
  loadingMsg.textContent = 'Skriver...';
  loadingMsg.style.opacity = '0.6';
  msgs.appendChild(loadingMsg);
  msgs.scrollTop = msgs.scrollHeight;
  
  try {
    // Kall Netlify Edge Function
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });

    // Fjern loading melding
    msgs.removeChild(loadingMsg);

    if (!response.ok) {
      const errorData = await response.json();
      addMsg(errorData.error || 'Beklager, jeg kan ikke svare akkurat nå. Prøv igjen senere.', 'bot');
      return;
    }

    const data = await response.json();
    
    // Legg til AI-svar
    addMsg(data.reply, 'bot');
    
  } catch (error) {
    // Fjern loading melding
    if (msgs.contains(loadingMsg)) {
      msgs.removeChild(loadingMsg);
    }
    
    console.error('Chat error:', error);
    addMsg('Beklager, jeg kan ikke svare akkurat nå. Prøv igjen senere.', 'bot');
  }
}

/**
 * Lukk demoen og vis bekreftelse
 */
function closeDemo() {
  document.body.innerHTML = '<p style="padding:16px; text-align:center; font-size:18px; color:#333;">Demo lukket ✅</p>';
}

// Førstegangsmeldinger når siden lastes
addMsg('Hei! Jeg er Askerbot, Asker Fotballs digitale assistent. Hvordan kan jeg hjelpe deg i dag?');
addMsg('Du kan spørre meg om alt som gjelder klubben - terminlister, påmelding, kontaktinfo, eller bare si hei!');

// Sett fokus på input når siden er klar
window.requestAnimationFrame(() => {
  input.focus();
});

// Form submit håndtering
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const value = (input.value || '').trim();
  
  if (!value) return;
  
  // Legg til brukermelding
  addMsg(value, 'you');
  
  // Tøm input
  input.value = '';
  
  // Generer respons
  respond(value);
  
  // Behold fokus på input
  input.focus();
});

// Snarveiknapper håndtering
shortcuts.forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.msg;
    const text = btn.textContent;
    
    // Legg til som brukermelding
    addMsg(text, 'you');
    
    // Generer respons basert på data-msg attributt
    respond(key);
    
    // Behold fokus på input
    input.focus();
  });
});

// Lukk-knapp håndtering
closeBtn.addEventListener('click', closeDemo);

// Tastatursnarveier
window.addEventListener('keydown', (e) => {
  // Esc lukker demoen
  if (e.key === 'Escape') {
    e.preventDefault();
    closeDemo();
  }
  
  // Enter sender melding (håndteres av form submit)
  // Tab navigerer mellom elementer (standard oppførsel)
});

// Håndter window resize for mobil tastatur
window.addEventListener('resize', () => {
  // Sikre at input ikke dekkes av mobil tastatur
  setTimeout(() => {
    if (document.activeElement === input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 100);
});

// Feilhåndtering for uventede feil
window.addEventListener('error', (e) => {
  console.warn('Askerbot demo feil:', e.error);
  // Ikke vis feil til bruker i demo-modus
});

// Sikre at alt er lastet før vi starter
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    input.focus();
  });
}
