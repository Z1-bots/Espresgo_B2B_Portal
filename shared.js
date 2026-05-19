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
      { min: 1,  max: 9,  price: 120 },
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
      { min: 1,  max: 9,  price: 130 },
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
      { min: 1,  max: 9,  price: 125 },
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
      { min: 1,  max: 9,  price: 115 },
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
  const initials = user ? (user.contactName || user.companyName || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : '';

  const portalLinks = loggedIn ? `
    <li><a href="catalog.html"    class="nav-link ${activePage==='catalog'    ?'active':''}">Catalog</a></li>
    <li><a href="quick-order.html" class="nav-link ${activePage==='quick-order'?'active':''}">Quick Order</a></li>
    <li><a href="account.html"    class="nav-link ${activePage==='account'    ?'active':''}">Account</a></li>
    <li><div class="nav-divider"></div></li>
  ` : '';

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

  const mobilePortalLinks = loggedIn ? `
    <a href="catalog.html"     class="nav-mobile-link ${activePage==='catalog'     ?'active':''}">📦 Catalog</a>
    <a href="quick-order.html" class="nav-mobile-link ${activePage==='quick-order' ?'active':''}">⚡ Quick Order</a>
    <a href="account.html"     class="nav-mobile-link ${activePage==='account'     ?'active':''}">👤 Account</a>
    <div class="nav-mobile-divider"></div>
  ` : '';

  const mobileAuth = loggedIn ? `
    <a href="admin/admin-login.html" class="nav-mobile-link">🛡 Admin Portal</a>
    <div class="nav-mobile-divider"></div>
    <button onclick="handleLogout()" class="nav-mobile-link" style="background:rgba(239,68,68,.08);color:#ef4444;border:none;cursor:pointer;width:100%;text-align:left;">🚪 Sign Out</button>
  ` : `<a href="login.html" class="nav-mobile-signin">Sign In</a>`;

  const html = `
    <nav class="nav" role="navigation" aria-label="Main navigation">
      <div class="nav-inner">
        <a href="${loggedIn?'catalog':'about'}.html" class="nav-logo" aria-label="ESPRESSGO home">
          <div class="nav-logo-icon">E</div>
          <div class="nav-logo-text">
            <div class="nav-logo-name">ESPRESSGO</div>
            <div class="nav-logo-sub">Wholesale Portal</div>
          </div>
        </a>
        <ul class="nav-links" role="list">
          ${portalLinks}
          <li><a href="about.html"   class="nav-link ${activePage==='about'   ?'active':''}">About</a></li>
          <li><a href="contact.html" class="nav-link ${activePage==='contact' ?'active':''}">Contact</a></li>
        </ul>
        <div class="nav-right-desktop" style="display:flex;align-items:center;gap:.5rem;">${rightDesktop}</div>
        <button class="nav-hamburger" id="hamburger-btn" aria-label="Toggle menu" aria-expanded="false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
      <div class="nav-mobile" id="mobile-menu" role="menu" aria-hidden="true">
        ${mobilePortalLinks}
        <a href="about.html"   class="nav-mobile-link ${activePage==='about'   ?'active':''}">ℹ️ About</a>
        <a href="contact.html" class="nav-mobile-link ${activePage==='contact' ?'active':''}">✉️ Contact</a>
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
  return `<svg width="${size}" height="${h}" viewBox="0 0 100 155" xmlns="http://www.w3.org/2000/svg" style="opacity:${dimmed?.4:1}">
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
