/* shared.js — navigation, auth, toast, shared state */
/* ============================================================
   This file manages:
   - Navigation rendering + active state
   - Simple localStorage-based auth (demo)
   - Shared product data
   - Shared order data
   - Toast notifications
   ============================================================ */

// ── Auth helpers ─────────────────────────────────────────────
const Auth = {
  getUser() {
    try { return JSON.parse(localStorage.getItem('espressgo_user') || 'null'); } catch { return null; }
  },
  setUser(u) { localStorage.setItem('espressgo_user', JSON.stringify(u)); },
  clearUser() { localStorage.removeItem('espressgo_user'); },
  isLoggedIn() { return !!this.getUser(); },
  login(email, password) {
    // Demo: any account registered, or fallback demo credentials
    const saved = this.getUser();
    if (email === 'test@gmail.com' && password === '123') {
      this.setUser({ email, companyName: 'Demo Company', contactName: 'Demo User', businessType: 'Office Manager', deliveryAddress: '1 Marina Boulevard, Singapore 018989' });
      return { ok: true };
    }
    if (saved && saved.email === email && saved._pw === password) return { ok: true };
    return { ok: false, error: 'Invalid email or password.' };
  },
  register(email, password, companyName, businessType, contactName) {
    this.setUser({ email, companyName, contactName, businessType, deliveryAddress: '', _pw: password });
    return { ok: true };
  },
  logout() { this.clearUser(); },
};

// ── Product data ─────────────────────────────────────────────
const Products = [
  {
    id: 'espressgo-original',
    sku: 'ESG-OG-001',
    name: 'ESPRESSGO Original',
    subtitle: 'Classic Vietnamese cold brew gel shot',
    caffeine: '~65mg caffeine',
    format: 'Gel pouch · 25ml',
    shelfLife: '12-month shelf life',
    pouchColor: '#C8580A',
    pouchAccent: '#8B3A00',
    labelColor: '#F5E0C8',
    active: true,
    tiers: [
      { min: 1, max: 9, price: 120 },
      { min: 10, max: 29, price: 108 },
      { min: 30, max: null, price: 96 },
    ],
  },
  {
    id: 'espressgo-oatmilk',
    sku: 'ESG-OAT-002',
    name: 'ESPRESSGO Oat Milk',
    subtitle: 'Creamy oat milk cold brew blend',
    caffeine: '~60mg caffeine',
    format: 'Gel pouch · 30ml',
    shelfLife: '10-month shelf life',
    pouchColor: '#D4956A',
    pouchAccent: '#8B5B3A',
    labelColor: '#FFF0E0',
    active: true,
    tiers: [
      { min: 1, max: 9, price: 130 },
      { min: 10, max: 29, price: 117 },
      { min: 30, max: null, price: 104 },
    ],
  },
  {
    id: 'espressgo-matcha',
    sku: 'ESG-MTG-003',
    name: 'ESPRESSGO Matcha',
    subtitle: 'Japanese matcha energy gel shot',
    caffeine: '~40mg caffeine',
    format: 'Gel pouch · 25ml',
    shelfLife: '12-month shelf life',
    pouchColor: '#4A7C59',
    pouchAccent: '#2D5E3F',
    labelColor: '#E8F5EC',
    active: false,
    comingSoonHint: 'Matcha + espresso blend — Q3 2026',
    tiers: [
      { min: 1, max: 9, price: 125 },
      { min: 10, max: 29, price: 112 },
      { min: 30, max: null, price: 100 },
    ],
  },
  {
    id: 'espressgo-decaf',
    sku: 'ESG-DCF-004',
    name: 'ESPRESSGO Decaf',
    subtitle: 'All the ritual, none of the buzz',
    caffeine: '~5mg caffeine',
    format: 'Gel pouch · 25ml',
    shelfLife: '14-month shelf life',
    pouchColor: '#7A6A5C',
    pouchAccent: '#4A3D33',
    labelColor: '#F0ECE8',
    active: false,
    comingSoonHint: 'Swiss water decaf process — Q4 2026',
    tiers: [
      { min: 1, max: 9, price: 115 },
      { min: 10, max: 29, price: 103 },
      { min: 30, max: null, price: 92 },
    ],
  },
];

function getActiveTier(tiers, qty) {
  if (qty <= 0) return tiers[0];
  let active = tiers[0];
  for (const t of tiers) { if (qty >= t.min) active = t; }
  return active;
}

// ── Order data ───────────────────────────────────────────────
const Orders = {
  _key: 'espressgo_orders',
  getAll() {
    try { return JSON.parse(localStorage.getItem(this._key) || '[]'); } catch { return []; }
  },
  save(orders) { localStorage.setItem(this._key, JSON.stringify(orders)); },
  add(order) {
    const all = this.getAll();
    const newOrder = {
      ...order,
      id: String(Date.now()).slice(-6),
      dateOrdered: new Date().toISOString(),
    };
    all.unshift(newOrder);
    this.save(all);
    return newOrder;
  },
  forCompany(name) { return this.getAll().filter(o => o.company === name); },
};

// ── Toast ────────────────────────────────────────────────────
function showToast(title, body = '', type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast ${type} fade-in`;
  t.innerHTML = `
    <div class="toast-icon">${type === 'success' ? '✓' : '!'}</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${body ? `<div class="toast-sub">${body}</div>` : ''}
    </div>
    <button class="toast-close" aria-label="Close">×</button>
  `;
  t.querySelector('.toast-close').onclick = () => t.remove();
  container.appendChild(t);
  setTimeout(() => t.remove(), 4500);
}

// ── Nav builder ──────────────────────────────────────────────
function buildNav(activePage) {
  const user = Auth.getUser();
  const loggedIn = !!user;
  const initials = user ? (user.contactName || user.companyName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '';

  const portalLinks = `
  <li>
    <a href="catalog.html"
       class="nav-link ${activePage === 'catalog' ? 'active' : ''}">
       Catalog
    </a>
  </li>

  ${loggedIn ? `
    <li>
      <a href="quick-order.html"
         class="nav-link ${activePage === 'quick-order' ? 'active' : ''}">
         Quick Order
      </a>
    </li>

    <li>
      <a href="account.html"
         class="nav-link ${activePage === 'account' ? 'active' : ''}">
         Account
      </a>
    </li>

    <li><div class="nav-divider"></div></li>
  ` : ''}
`;

  const rightDesktop = loggedIn ? `
    <a href="admin/admin-login.html" class="nav-admin-btn" style="font-size:12px;">🛡 Admin</a>
    <div class="nav-divider"></div>
    <div style="position:relative;">
      <button id="user-menu-btn" style="display:flex;align-items:center;gap:.6rem;padding:.4rem .6rem;border-radius:10px;background:none;transition:background .15s;" onmouseover="this.style.background='rgba(255,255,255,.08)'" onmouseout="this.style.background='none'">
        <div style="width:32px;height:32px;background:rgba(200,133,58,.25);border:1px solid rgba(200,133,58,.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#D4A574;">${initials}</div>
        <div style="text-align:left;display:none;" class="xl-show">
          <div style="font-size:12px;color:#F5E6D3;">${user.companyName}</div>
          <div style="font-size:10px;color:#6B5744;">${user.email}</div>
        </div>
        <span style="color:#6B5744;font-size:11px;">▾</span>
      </button>
      <div id="user-menu-dropdown" style="display:none;position:absolute;right:0;top:calc(100%+8px);width:210px;background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.12);border:1px solid #EDE8E3;overflow:hidden;z-index:200;">
        <div style="padding:.75rem 1rem;border-bottom:1px solid #F0EAE4;">
          <div style="font-size:14px;color:#2C1810;">${user.companyName}</div>
          <div style="font-size:11px;color:#8B7355;">${user.email}</div>
        </div>
        <a href="account.html" style="display:flex;align-items:center;gap:.6rem;padding:.65rem 1rem;font-size:14px;color:#2C1810;transition:background .15s;" onmouseover="this.style.background='#FAF8F5'" onmouseout="this.style.background='none'">👤 My Account</a>
        <div style="height:1px;background:#F0EAE4;"></div>
        <button onclick="handleLogout()" style="width:100%;display:flex;align-items:center;gap:.6rem;padding:.65rem 1rem;font-size:14px;color:#ef4444;background:none;border:none;cursor:pointer;transition:background .15s;" onmouseover="this.style.background='#fff5f5'" onmouseout="this.style.background='none'">🚪 Sign Out</button>
      </div>
    </div>
  ` : `<a href="login.html" class="nav-btn">Sign In</a>`;

  const mobilePortalLinks = `
  <a href="catalog.html"
     class="nav-mobile-link ${activePage === 'catalog' ? 'active' : ''}">
     📦 Catalog
  </a>

  ${loggedIn ? `
    <a href="quick-order.html"
       class="nav-mobile-link ${activePage === 'quick-order' ? 'active' : ''}">
       ⚡ Quick Order
    </a>

    <a href="account.html"
       class="nav-mobile-link ${activePage === 'account' ? 'active' : ''}">
       👤 Account
    </a>

    <div class="nav-mobile-divider"></div>
  ` : ''}
`;

  const mobileAuth = loggedIn ? `
    <a href="admin/admin-login.html" class="nav-mobile-link">🛡 Admin Portal</a>
    <div class="nav-mobile-divider"></div>
    <button onclick="handleLogout()" class="nav-mobile-link" style="background:rgba(239,68,68,.08);color:#ef4444;border:none;cursor:pointer;width:100%;text-align:left;">🚪 Sign Out</button>
  ` : `<a href="login.html" class="nav-mobile-signin">Sign In</a>`;

  const html = `
    <nav class="nav" role="navigation" aria-label="Main navigation">
      <div class="nav-inner">
        <a href="catalog.html" class="nav-logo" aria-label="ESPRESSGO home">
          <div class="nav-logo-icon">E</div>
          <div class="nav-logo-text">
            <div class="nav-logo-name">ESPRESSGO</div>
            <div class="nav-logo-sub">Wholesale Portal</div>
          </div>
        </a>
        <ul class="nav-links" role="list">
          ${portalLinks}
          <li><a href="about.html"   class="nav-link ${activePage === 'about' ? 'active' : ''}">About</a></li>
          <li><a href="contact.html" class="nav-link ${activePage === 'contact' ? 'active' : ''}">Contact</a></li>
        </ul>
        <div class="nav-right-desktop" style="display:flex;align-items:center;gap:.5rem;">${rightDesktop}</div>
        <button class="nav-hamburger" id="hamburger-btn" aria-label="Toggle menu" aria-expanded="false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
      <div class="nav-mobile" id="mobile-menu" role="menu" aria-hidden="true">
        ${mobilePortalLinks}
        <a href="about.html"   class="nav-mobile-link ${activePage === 'about' ? 'active' : ''}">ℹ️ About</a>
        <a href="contact.html" class="nav-mobile-link ${activePage === 'contact' ? 'active' : ''}">✉️ Contact</a>
        <div class="nav-mobile-divider"></div>
        ${mobileAuth}
      </div>
    </nav>
  `;
  document.getElementById('nav-placeholder').innerHTML = html;

  // Hamburger toggle
  const ham = document.getElementById('hamburger-btn');
  const mob = document.getElementById('mobile-menu');
  if (ham && mob) {
    ham.addEventListener('click', () => {
      const open = mob.classList.toggle('open');
      ham.setAttribute('aria-expanded', open);
    });
  }

  // User menu dropdown
  const btn = document.getElementById('user-menu-btn');
  const drop = document.getElementById('user-menu-dropdown');
  if (btn && drop) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      drop.style.display = drop.style.display === 'block' ? 'none' : 'block';
    });
    document.addEventListener('click', () => { drop.style.display = 'none'; });
  }
}

function buildFooter() {
  document.getElementById('footer-placeholder').innerHTML = `
    <footer class="footer" role="contentinfo">
      <div class="footer-inner">
        <div class="footer-logo">
          <div class="footer-logo-icon">E</div>
          <span class="footer-logo-text">ESPRESSGO</span>
        </div>
        <nav class="footer-links" aria-label="Footer links">
          <a href="about.html">About</a>
          <a href="contact.html">Contact</a>
        </nav>
        <p class="footer-copy">© 2026 ESPRESSGO. Gel-based espresso shots for business. Singapore.</p>
      </div>
    </footer>
  `;
}

function handleLogout() {
  Auth.logout();
  window.location.href = 'login.html';
}

// ── Require auth (redirect if not logged in) ─────────────────
function requireAuth() {
  if (!Auth.isLoggedIn()) window.location.href = 'login.html';
}

// ── Pouch SVG helper ─────────────────────────────────────────
function pouchSVG(product, size = 130, dimmed = false) {
  const { pouchColor, pouchAccent, labelColor, name } = product;
  const h = size * 1.55;
  const label = name.replace('ESPRESSGO ', '');
  return `<svg width="${size}" height="${h}" viewBox="0 0 100 155" xmlns="http://www.w3.org/2000/svg" style="opacity:${dimmed ? .4 : 1}">
    <rect x="42" y="0" width="16" height="14" rx="4" fill="${pouchAccent}"/>
    <path d="M36 14 Q30 20 28 30 L72 30 Q70 20 64 14 Z" fill="${pouchColor}"/>
    <rect x="18" y="30" width="64" height="100" rx="12" fill="${pouchColor}"/>
    <rect x="18" y="122" width="64" height="8" rx="6" fill="${pouchAccent}"/>
    <rect x="22" y="42" width="56" height="72" rx="6" fill="${labelColor}" opacity="0.92"/>
    <text x="50" y="62" text-anchor="middle" font-size="8.5" font-weight="700" font-family="sans-serif" fill="${pouchAccent}" letter-spacing="0.5">ESPRESSGO</text>
    <line x1="26" y1="66" x2="74" y2="66" stroke="${pouchColor}" stroke-width="0.8" opacity="0.4"/>
    <circle cx="50" cy="68" r="7" fill="${pouchColor}" opacity="0.8"/>
    <path d="M44 75 Q48 84 50 88 Q52 84 56 75 Z" fill="${pouchColor}" opacity="0.7"/>
    <text x="50" y="109" text-anchor="middle" font-size="4.2" font-family="sans-serif" fill="${pouchAccent}" opacity="0.7">${label}</text>
  </svg>`;
}

function miniPouchSVG(color, accent, size = 32) {
  const h = size * 1.5;
  return `<svg width="${size}" height="${h}" viewBox="0 0 36 54" xmlns="http://www.w3.org/2000/svg">
    <rect x="14" y="0" width="8" height="6" rx="2" fill="${accent}"/>
    <path d="M10 6 Q8 9 8 12 L28 12 Q28 9 26 6 Z" fill="${color}"/>
    <rect x="4" y="12" width="28" height="36" rx="6" fill="${color}"/>
    <rect x="4" y="44" width="28" height="4" rx="3" fill="${accent}"/>
    <rect x="7" y="16" width="22" height="26" rx="4" fill="${accent}" opacity="0.18"/>
    <text x="18" y="28" text-anchor="middle" font-size="4" font-weight="700" font-family="sans-serif" fill="${accent}" letter-spacing="0.2">ESG</text>
  </svg>`;
}

// ── Social Floats & FAQ Agent ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // 1. Inject Floating Buttons & Chat Widget HTML
  const socialHTML = `
    <div class="social-floats">
      <a href="https://www.linkedin.com/in/damien-teo-371b31257" target="_blank" rel="noopener noreferrer" class="social-float-btn linkedin" aria-label="LinkedIn">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
      </a>
      <a href="https://wa.me/6587977961" target="_blank" rel="noopener noreferrer" class="social-float-btn whatsapp" aria-label="WhatsApp">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 0C5.385 0 0 5.386 0 12.031c0 2.146.561 4.241 1.626 6.096L.18 24l6.02-1.583C7.994 23.366 10.002 24 12.031 24 18.675 24 24 18.614 24 11.97 24 5.326 18.675 0 12.031 0zM12 21.921c-1.847 0-3.655-.494-5.239-1.428l-.375-.221-3.879 1.018 1.036-3.774-.243-.384A9.873 9.873 0 0 1 1.944 12c0-5.466 4.453-9.919 9.923-9.919 5.467 0 9.922 4.454 9.922 9.92S17.467 21.92 12 21.921zm5.45-7.462c-.298-.15-1.767-.872-2.039-.972-.274-.1-.472-.15-.672.15-.199.299-.77 .972-.944 1.17-.174.199-.348.225-.646.075-.298-.15-1.26-.464-2.4-1.485-.886-.793-1.484-1.774-1.658-2.073-.174-.299-.019-.462.13-.611.135-.134.298-.349.447-.523.149-.174.199-.299.298-.499.1-.198.05-.373-.024-.523-.075-.15-.672-1.621-.92-2.22-.242-.584-.488-.505-.672-.514-.174-.01-.373-.01-.572-.01-.199 0-.523.075-.797.374-.274.298-1.045 1.02-1.045 2.49 0 1.47 1.07 2.89 1.219 3.09.15.199 2.106 3.214 5.101 4.506.711.306 1.266.49 1.698.627.714.226 1.365.194 1.88.118.577-.085 1.767-.722 2.016-1.42.249-.697.249-1.295.174-1.42-.074-.124-.274-.198-.572-.348z"/></svg>
      </a>
      <button class="social-float-btn faq" id="faq-toggle-btn" aria-label="FAQ Agent">
        <span class="notification-badge" id="faq-badge"></span>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.477 2 2 5.82 2 10.5c0 2.502 1.285 4.747 3.326 6.27-.14 1.155-.71 2.967-1.426 3.824 0 0 2.128-.112 4.417-1.48A12.753 12.753 0 0012 19c5.523 0 10-3.82 10-8.5S17.523 2 12 2zm1 12.5h-2v-2h2v2zm0-3.5h-2V7h2v4z"/>
        </svg>
      </button>
    </div>

    <div class="faq-widget" id="faq-chat-widget">
      <div class="faq-widget-header">
        <div class="faq-header-info">
          <div class="faq-avatar">☕</div>
          <div>
            <div class="faq-status-title">EspressGo Helper</div>
            <div class="faq-status-sub">
              <span class="pulse-dot" style="width: 7px; height: 7px; background: #22c55e;"></span>
              Auto-Reply Agent · Online
            </div>
          </div>
        </div>
        <button class="faq-close-btn" id="faq-close-btn" aria-label="Close FAQ menu">×</button>
      </div>
      <div class="faq-chat-body" id="faq-chat-body"></div>
      <div class="faq-options-panel" id="faq-options-panel">
        <div class="faq-options-title">Click a question to ask</div>
        <div id="faq-buttons-container" style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
      </div>
      <!-- AI Typing Input Area -->
      <div class="faq-input-container">
        <input type="text" id="faq-user-input" class="faq-input" placeholder="Or ask a custom question..." aria-label="Type B2B question">
        <button class="faq-send-btn" id="faq-send-btn" aria-label="Send message">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', socialHTML);

  // 2. State & FAQ Data definitions
  const faqData = [
    { q: "How long does delivery take?" },
    { q: "Can I track my order?" },
    { q: "Does EspressGo contain dairy or sugar?" },
    { q: "Is EspressGo halal-certified?" }
  ];

  const faqWidget = document.getElementById('faq-chat-widget');
  const faqToggle = document.getElementById('faq-toggle-btn');
  const faqClose = document.getElementById('faq-close-btn');
  const faqBadge = document.getElementById('faq-badge');
  const faqChatBody = document.getElementById('faq-chat-body');
  const faqButtonsContainer = document.getElementById('faq-buttons-container');
  const faqUserInput = document.getElementById('faq-user-input');
  const faqSendBtn = document.getElementById('faq-send-btn');

  let hasInitialized = false;

  // Render clickable question buttons
  function renderOptions() {
    faqButtonsContainer.innerHTML = faqData.map((item, index) => `
      <button class="faq-option-btn" data-index="${index}">
        <span>${item.q}</span>
        <span class="faq-option-arrow">➔</span>
      </button>
    `).join('');

    // Attach listeners to buttons
    faqButtonsContainer.querySelectorAll('.faq-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.getAttribute('data-index');
        handleQuestionClick(idx);
      });
    });
  }

  // Format response helper: replaces simple markdown bold **text** with HTML <strong>text</strong>
  function formatResponse(text) {
    // Bold tags
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Bullet lists
    formatted = formatted.replace(/^\s*-\s+(.*?)$/gm, '• $1');
    // Newlines to HTML breaks
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }

  // Add a message bubble to the chat
  function addMessage(sender, text) {
    const msg = document.createElement('div');
    msg.className = `faq-msg ${sender}`;
    msg.innerHTML = formatResponse(text);
    faqChatBody.appendChild(msg);
    faqChatBody.scrollTop = faqChatBody.scrollHeight;
  }

  // Trigger typing indicator
  function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'faq-typing';
    indicator.id = 'faq-typing-indicator';
    indicator.innerHTML = `
      <div class="faq-typing-dot"></div>
      <div class="faq-typing-dot"></div>
      <div class="faq-typing-dot"></div>
    `;
    faqChatBody.appendChild(indicator);
    faqChatBody.scrollTop = faqChatBody.scrollHeight;
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById('faq-typing-indicator');
    if (indicator) indicator.remove();
  }

  // Toggle user control elements during generation state
  function setControlsDisabled(disabled) {
    faqUserInput.disabled = disabled;
    faqSendBtn.disabled = disabled;
    const buttons = faqButtonsContainer.querySelectorAll('.faq-option-btn');
    buttons.forEach(b => b.disabled = disabled);
  }

  // General B2B message post handler connecting to our Node.js Vercel backend proxy
  async function handleUserMessage(text) {
    if (!text || !text.trim()) return;

    const queryText = text.trim();

    // Clear the input bar
    faqUserInput.value = '';

    // Disable all inputs
    setControlsDisabled(true);

    // 1. Post user message bubble
    addMessage('user', queryText);

    // 2. Add organic thinking delay delay
    setTimeout(async () => {
      showTypingIndicator();

      // Check if running on localhost or custom offline mode to call OpenRouter directly from browser
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('192.168.');
      const localKey = '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'; // OpenRouter Key

      if (isLocal && localKey) {
        try {
          const systemInstruction = `
You are "EspressGo Helper", the highly professional, friendly, and expert B2B virtual sales assistant for ESPRESSGO (Singapore).
ESPRESSGO manufactures and sells premium, high-quality cold-brew espresso gel pouches/shots designed for B2B clients, corporate offices, gyms, hotels, events, and cafes.

PRODUCT INFORMATION:
1. ESPRESSGO Original:
   - SKU: ESG-OG-001
   - Classic Vietnamese robusta cold brew gel shot.
   - Pouch size: 25ml.
   - Caffeine content: ~65mg caffeine.
   - Shelf life: 12-month shelf life.
   - Ingredients: Premium cold brew robusta coffee concentrate, low sugar, no dairy. Completely dairy-free.
   - B2B Pricing Tiers (per box of 50 pouches):
     * 1-9 boxes: $120 per box.
     * 10-29 boxes: $108 per box.
     * 30+ boxes: $96 per box.

2. ESPRESSGO Oat Milk:
   - SKU: ESG-OAT-002
   - Creamy, plant-based oat milk cold brew coffee blend.
   - Pouch size: 30ml.
   - Caffeine content: ~60mg caffeine.
   - Shelf life: 10-month shelf life.
   - Ingredients: Cold brew coffee, premium plant-based oat milk, lightly sweetened with organic cane sugar. 100% dairy-free and vegan.
   - B2B Pricing Tiers (per box of 50 pouches):
     * 1-9 boxes: $130 per box.
     * 10-29 boxes: $117 per box.
     * 30+ boxes: $104 per box.

3. ESPRESSGO Matcha (Coming Soon - Q3 2026):
   - SKU: ESG-MTG-003
   - Japanese matcha + energy gel shot.
   - Pricing Tiers (Est): 1-9 boxes: $125.

4. ESPRESSGO Decaf (Coming Soon - Q4 2026):
   - SKU: ESG-DCF-004
   - Swiss water process decaf cold brew gel shot (~5mg caffeine).
   - Pricing Tiers (Est): 1-9 boxes: $115.

B2B LOGISTICS & PROCUREMENT SPECS:
- Delivery Location: We deliver island-wide in Singapore.
- Delivery Times: Standard B2B shipping takes 2 to 3 business days. Next-day express shipping is available for orders submitted before 12 PM, subject to a small SGD 15 surcharge.
- Order Tracking: Customers can track their orders in real-time on their Account dashboard.
- Halal Status: 100% Halal-certified ingredients. Facility complies with MUIS standards in Singapore. We provide certificate copies on request.
- Wholesale terms: Minimum B2B order quantity is 1 box (50 pouches). Billing terms can be discussed with Damien.

AI SYSTEM RULES:
- Tone: Extremely helpful, welcoming, concise, and business-focused (B2B). Keep answers clear, readable, and structured.
- Formatting: Use standard markdown (e.g., bolding with **text** or lists). You may output standard HTML anchor tags for page linking when relevant:
  * Link to Catalog page: <a href="catalog.html">Catalog</a>
  * Link to Account page: <a href="account.html">Account</a>
  * Link to Contact page: <a href="contact.html">Contact Us</a>
- Boundary Rule: ONLY answer questions related to ESPRESSGO products, pricing, logistics, coffee, or orders. If a user asks general knowledge questions or unrelated topics, politely guide them back to ESPRESSGO B2B services.
- Contact: If the user requires custom procurement contracts, wholesale discounts, or customized event partnerships, warmly direct them to chat with Damien Teo via WhatsApp (button is right in the bottom float or links to https://wa.me/6587977961).
`;

          const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
          let response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localKey}`,
              'HTTP-Referer': 'http://localhost',
              'X-Title': 'Espresgo B2B Portal'
            },
            body: JSON.stringify({
              model: 'deepseek/deepseek-v4-flash:free',
              messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: queryText }
              ],
              temperature: 0.3,
              max_tokens: 500
            })
          });

          // Resilient Fallback: If DeepSeek v4 Flash fails (e.g. Crucible out of credits / HTTP 402)
          if (!response.ok) {
            console.warn('DeepSeek v4 Flash endpoint is currently out of credits or rate-limited. Falling back silently to Liquid AI free model...');
            response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localKey}`,
                'HTTP-Referer': 'http://localhost',
                'X-Title': 'Espresgo B2B Portal'
              },
              body: JSON.stringify({
                model: 'liquid/lfm-2.5-1.2b-instruct:free',
                messages: [
                  { role: 'system', content: systemInstruction },
                  { role: 'user', content: queryText }
                ],
                temperature: 0.3,
                max_tokens: 500
              })
            });
          }

          removeTypingIndicator();

          if (response.ok) {
            const data = await response.json();
            const answer = data.choices[0].message.content;
            addMessage('agent', answer);
          } else {
            const errorMsg = await response.text();
            console.error('Direct OpenRouter error payload:', errorMsg);
            addMessage('agent', "Oops! OpenRouter had an issue processing that local request. Double check your API key or internet access!");
          }
        } catch (err) {
          removeTypingIndicator();
          console.error('Direct local fetch error:', err);
          addMessage('agent', "I had trouble initiating a connection to OpenRouter. Make sure your internet connection is active!");
        } finally {
          setControlsDisabled(false);
          faqChatBody.scrollTop = faqChatBody.scrollHeight;
          faqUserInput.focus();
        }
        return;
      }


      // Backend route proxy fallback for production (when hosted online)
      try {
        // Query serverless API endpoint
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ question: queryText })
        });

        removeTypingIndicator();

        if (response.ok) {
          const data = await response.json();
          addMessage('agent', data.answer || "I parsed the coffee matrix, but found an empty response. Try rephrasing!");
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Vercel API error payload:', errorData);
          addMessage('agent', "My serverless coffee brain encountered a temporary glitch. Please feel free to request quick custom assistance directly from Damien via WhatsApp!");
        }
      } catch (error) {
        removeTypingIndicator();
        console.error('Fetch client connection exception:', error);
        addMessage('agent', "I couldn't contact my database server. If you are testing locally, make sure you ran `vercel dev` instead of a static server so the `/api` routes are fully activated!");
      } finally {
        setControlsDisabled(false);
        faqChatBody.scrollTop = faqChatBody.scrollHeight;

        faqUserInput.focus();
      }
    }, 400);
  }

  // Handle FAQ question selection
  function handleQuestionClick(index) {
    const item = faqData[index];
    handleUserMessage(item.q);
  }

  // Initialize Chat content
  function initChat() {
    if (hasInitialized) return;
    hasInitialized = true;

    // Greeting Message
    addMessage('agent', "Hello B2B partner! 👋 I am your automated EspressGo Assistant, powered by Meow. Ask me anything about our wholesale pricing, Singapore logistics, caffeine parameters, or procurement! \n\nOr click a shortcut question to begin:");
    renderOptions();
  }

  // Toggle widget event listeners
  faqToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = faqWidget.classList.toggle('open');
    if (isOpen) {
      if (faqBadge) faqBadge.style.display = 'none'; // Dismiss badge
      initChat();
      setTimeout(() => faqUserInput.focus(), 300);
    }
  });

  faqClose.addEventListener('click', (e) => {
    e.stopPropagation();
    faqWidget.classList.remove('open');
  });

  // Attach submit listeners
  faqSendBtn.addEventListener('click', () => {
    handleUserMessage(faqUserInput.value);
  });

  faqUserInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleUserMessage(faqUserInput.value);
    }
  });

  // Close when clicking outside the widget
  document.addEventListener('click', (e) => {
    if (!faqWidget.contains(e.target) && !faqToggle.contains(e.target)) {
      faqWidget.classList.remove('open');
    }
  });
});

