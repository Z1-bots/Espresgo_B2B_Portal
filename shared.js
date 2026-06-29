/* shared.js — navigation, auth, toast, shared state */
/* ============================================================
   ESPRESSGO B2B Portal — Shared JavaScript

   This file manages:
   - Supabase authentication helpers
   - Shared fallback product data
   - Supabase order helpers
   - Navigation rendering
   - Footer rendering
   - Toast notifications
   - Product pouch SVG helpers
   - Floating social buttons
   - FAQ / AI chat widget

   IMPORTANT:
   HTML pages must load scripts in this order:
   1. Supabase JS CDN
   2. supabase-config.js
   3. shared.js
   ============================================================ */


/* ============================================================
   Supabase client resolver
   ============================================================ */

function getSupabaseClient() {
  if (window.sb) return window.sb;
  if (window.supabaseClient) return window.supabaseClient;

  try {
    if (typeof sb !== 'undefined') return sb;
  } catch (error) {
    // Ignore missing global lexical variable.
  }

  return null;
}


/* ============================================================
   Small safety helper
   ============================================================ */

function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


function formatCurrency(amount) {
  return `SGD $${Number(amount || 0).toFixed(2)}`;
}


/* ============================================================
   Auth helpers using Supabase
   ============================================================ */

const Auth = {
  _profileKey: 'espressgo_profile',

  getUser() {
    try {
      return JSON.parse(localStorage.getItem(this._profileKey) || 'null');
    } catch (error) {
      return null;
    }
  },

  setUser(profile) {
    if (!profile) return;
    localStorage.setItem(this._profileKey, JSON.stringify(profile));
  },

  clearUser() {
    localStorage.removeItem(this._profileKey);
    localStorage.removeItem('espressgo_user');
    localStorage.removeItem('espressgo_admin');
  },

  isLoggedIn() {
    return !!this.getUser();
  },

  normalizeProfile(profile = {}, authUser = null) {
    const metadata = authUser?.user_metadata || {};

    return {
      id: profile?.id || authUser?.id || null,
      email: profile?.email || authUser?.email || '',
      contactName: profile?.contact_name || metadata.contact_name || metadata.contactName || '',
      companyName: profile?.company_name || metadata.company_name || metadata.companyName || '',
      businessType: profile?.business_type || metadata.business_type || metadata.businessType || '',
      deliveryAddress: profile?.delivery_address || metadata.delivery_address || metadata.deliveryAddress || '',
      role: profile?.role || metadata.role || authUser?.app_metadata?.role || 'buyer'
    };
  },

  async refreshUser() {
    const client = getSupabaseClient();

    if (!client) {
      console.error('Supabase client is missing. Check supabase-config.js.');
      this.clearUser();
      return null;
    }

    const { data: sessionData, error: sessionError } = await client.auth.getSession();

    if (sessionError || !sessionData?.session?.user) {
      this.clearUser();
      return null;
    }

    const authUser = sessionData.session.user;

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileError) {
      console.error('Failed to load profile:', profileError);
      this.clearUser();
      return null;
    }

    if (!profile) {
      console.warn('No public.profiles row found for current user:', authUser.id);
      this.clearUser();
      return null;
    }

    const normalizedProfile = this.normalizeProfile(profile, authUser);
    this.setUser(normalizedProfile);
    return normalizedProfile;
  },

  async login(email, password) {
    const client = getSupabaseClient();

    if (!client) {
      return {
        ok: false,
        error: 'Supabase is not connected. Check supabase-config.js.'
      };
    }

    const { error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return {
        ok: false,
        error: error.message || 'Invalid email or password.'
      };
    }

    const profile = await this.refreshUser();

    if (!profile) {
      return {
        ok: false,
        error: 'Login succeeded, but your buyer profile was not found.'
      };
    }

    return {
      ok: true,
      user: profile
    };
  },

  async register(email, password, companyName, businessType, contactName) {
    const client = getSupabaseClient();

    if (!client) {
      return {
        ok: false,
        error: 'Supabase is not connected. Check supabase-config.js.'
      };
    }

    const redirectTo = window.location.origin + window.location.pathname;

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          contact_name: contactName,
          company_name: companyName,
          business_type: businessType,
          delivery_address: ''
        }
      }
    });

    if (error) {
      return {
        ok: false,
        error: error.message || 'Could not create account.'
      };
    }

    if (!data.session) {
      return {
        ok: true,
        needsEmailConfirmation: true,
        message: 'Account created. Please check your email, confirm your account, then sign in.'
      };
    }

    const profile = await this.refreshUser();

    return {
      ok: true,
      user: profile
    };
  },

  async updateProfile(profile) {
    const client = getSupabaseClient();
    const current = this.getUser();

    if (!client) {
      return {
        ok: false,
        error: 'Supabase is not connected. Check supabase-config.js.'
      };
    }

    if (!current) {
      return {
        ok: false,
        error: 'Not logged in.'
      };
    }

    const updatePayload = {
      contact_name: profile.contactName,
      company_name: profile.companyName,
      business_type: profile.businessType,
      delivery_address: profile.deliveryAddress
    };

    const { error } = await client
      .from('profiles')
      .update(updatePayload)
      .eq('id', current.id);

    if (error) {
      return {
        ok: false,
        error: error.message
      };
    }

    const updatedProfile = {
      ...current,
      ...profile
    };

    this.setUser(updatedProfile);

    return {
      ok: true,
      user: updatedProfile
    };
  },

  async logout() {
    const client = getSupabaseClient();

    if (client) {
      await client.auth.signOut();
    }

    this.clearUser();
  }
};


/* ============================================================
   Product data
   Products are stored in frontend JS for now.
   Later, you can move this into a Supabase products table.
   ============================================================ */

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
      { min: 30, max: null, price: 96 }
    ]
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
      { min: 30, max: null, price: 104 }
    ]
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
      { min: 30, max: null, price: 100 }
    ]
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
      { min: 30, max: null, price: 92 }
    ]
  }
];

function getActiveTier(tiers, qty) {
  const cleanTiers = Array.isArray(tiers) && tiers.length
    ? tiers
    : [{ min: 1, max: null, price: 0 }];

  const cleanQty = Number(qty || 0);

  let activeTier = cleanTiers[0];

  if (cleanQty <= 0) {
    return activeTier;
  }

  for (const tier of cleanTiers) {
    const min = Number(tier.min || 0);
    const max = tier.max === null || tier.max === undefined ? Infinity : Number(tier.max);

    if (cleanQty >= min && cleanQty <= max) {
      activeTier = tier;
      break;
    }

    if (cleanQty >= min) {
      activeTier = tier;
    }
  }

  return activeTier;
}


/* ============================================================
   Order data using Supabase

   Primary supported schema:
   - orders.user_id
   - orders.items jsonb
   - orders.date_ordered

   Fallback supported schema:
   - orders.profile_id
   - orders.created_at
   - order_items table
   ============================================================ */

const Orders = {
  async getAll() {
    const client = getSupabaseClient();

    if (!client) return [];

    const result = await this._selectOrders(client, null);
    return result.map(row => this._fromDb(row));
  },

  async add(order) {
    const client = getSupabaseClient();
    const user = Auth.getUser();

    if (!client) {
      throw new Error('Supabase is not connected. Check supabase-config.js.');
    }

    if (!user) {
      throw new Error('You must be logged in to place an order.');
    }

    const items = Array.isArray(order.items) ? order.items : [];

    const primaryPayload = {
      user_id: user.id,
      company: order.company || user.companyName || 'Unknown Company',
      contact_name: order.contactName || user.contactName || user.email || 'Unknown Contact',
      business_type: order.businessType || user.businessType || null,
      items,
      total_cartons: Number(order.totalCartons || 0),
      total_amount: Number(order.totalAmount || 0),
      status: order.status || 'pending',
      delivery_address: order.deliveryAddress || user.deliveryAddress || 'Singapore',
      notes: order.notes || null
    };

    let { data: savedOrder, error: orderError } = await client
      .from('orders')
      .insert(primaryPayload)
      .select()
      .single();

    if (!orderError && savedOrder) {
      return this._fromDb(savedOrder);
    }

    console.warn('Primary orders insert failed. Trying fallback schema:', orderError?.message || orderError);

    const fallbackPayload = {
      profile_id: user.id,
      company: primaryPayload.company,
      contact_name: primaryPayload.contact_name,
      business_type: primaryPayload.business_type,
      delivery_address: primaryPayload.delivery_address,
      total_cartons: primaryPayload.total_cartons,
      total_amount: primaryPayload.total_amount,
      status: primaryPayload.status,
      notes: primaryPayload.notes
    };

    const fallback = await client
      .from('orders')
      .insert(fallbackPayload)
      .select()
      .single();

    if (fallback.error) {
      console.error('Failed to add order:', fallback.error);
      throw fallback.error;
    }

    savedOrder = fallback.data;

    if (items.length) {
      const itemPayload = items.map(item => ({
        order_id: savedOrder.id,
        product_id: item.productId || item.product_id || item.id || null,
        sku: item.sku || '',
        name: item.name || '',
        cartons: Number(item.cartons || item.qty || 0),
        price_per_carton: Number(item.pricePerCarton || item.price_per_carton || item.price || 0)
      }));

      const { error: itemsError } = await client
        .from('order_items')
        .insert(itemPayload);

      if (itemsError) {
        console.warn('Order saved, but fallback order_items insert failed:', itemsError.message);
      } else {
        savedOrder.order_items = itemPayload;
      }
    }

    return this._fromDb(savedOrder);
  },

  async updateStatus(id, status) {
    const client = getSupabaseClient();

    if (!client) {
      throw new Error('Supabase is not connected. Check supabase-config.js.');
    }

    const { error } = await client
      .from('orders')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('Failed to update order:', error);
      throw error;
    }

    return { ok: true };
  },

  async forCurrentUser() {
    const client = getSupabaseClient();
    const user = Auth.getUser();

    if (!client || !user) return [];

    const result = await this._selectOrders(client, user.id);
    return result.map(row => this._fromDb(row));
  },

  async forCompany(companyName) {
    const client = getSupabaseClient();

    if (!client || !companyName) return [];

    const { data, error } = await client
      .from('orders')
      .select('*')
      .eq('company', companyName);

    if (error) {
      console.error('Failed to load company orders:', error);
      return [];
    }

    return (data || []).map(row => this._fromDb(row));
  },

  async _selectOrders(client, userId = null) {
    async function tryQuery(columnName, orderColumn) {
      let query = client.from('orders').select('*');

      if (userId && columnName) {
        query = query.eq(columnName, userId);
      }

      if (orderColumn) {
        query = query.order(orderColumn, { ascending: false });
      }

      return query;
    }

    const attempts = [];

    if (userId) {
      attempts.push(() => tryQuery('user_id', 'date_ordered'));
      attempts.push(() => tryQuery('user_id', 'created_at'));
      attempts.push(() => tryQuery('profile_id', 'created_at'));
      attempts.push(() => tryQuery('profile_id', 'date_ordered'));
      attempts.push(() => tryQuery('user_id', null));
      attempts.push(() => tryQuery('profile_id', null));
    } else {
      attempts.push(() => tryQuery(null, 'date_ordered'));
      attempts.push(() => tryQuery(null, 'created_at'));
      attempts.push(() => tryQuery(null, null));
    }

    for (const attempt of attempts) {
      const { data, error } = await attempt();

      if (!error) {
        return data || [];
      }

      console.warn('Order select attempt failed:', error.message);
    }

    return [];
  },

  _fromDb(row) {
    const nestedItems = Array.isArray(row.order_items) ? row.order_items : [];
    const legacyItems = Array.isArray(row.items) ? row.items : [];

    const items = nestedItems.length
      ? nestedItems.map(item => ({
          id: item.id,
          productId: item.product_id,
          sku: item.sku,
          name: item.name,
          cartons: Number(item.cartons || 0),
          pricePerCarton: Number(item.price_per_carton || 0)
        }))
      : legacyItems;

    return {
      id: String(row.id),
      userId: row.user_id || row.profile_id || null,
      profileId: row.profile_id || row.user_id || null,
      company: row.company || '',
      contactName: row.contact_name || '',
      businessType: row.business_type || '',
      items,
      totalCartons: Number(row.total_cartons || 0),
      totalAmount: Number(row.total_amount || 0),
      status: row.status || 'pending',
      deliveryAddress: row.delivery_address || '',
      notes: row.notes || '',
      dateOrdered: row.date_ordered || row.created_at || null,
      createdAt: row.created_at || row.date_ordered || null
    };
  }
};


/* ============================================================
   Toast notifications
   ============================================================ */

function showToast(title, body = '', type = 'success') {
  let container = document.getElementById('toast-container');

  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type} fade-in`;

  toast.innerHTML = `
    <div class="toast-icon">${type === 'success' ? '✓' : '!'}</div>

    <div class="toast-body">
      <div class="toast-title">${escapeHTML(title)}</div>
      ${body ? `<div class="toast-sub">${escapeHTML(body)}</div>` : ''}
    </div>

    <button class="toast-close" aria-label="Close" type="button">×</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');

  if (closeBtn) {
    closeBtn.onclick = () => toast.remove();
  }

  container.appendChild(toast);

  setTimeout(() => {
    if (toast && toast.parentNode) {
      toast.remove();
    }
  }, 4500);
}


/* ============================================================
   Navigation builder
   ============================================================ */

function buildNav(activePage) {
  const currentUser = Auth.getUser();
  const loggedIn = !!currentUser;
  const inAdmin = window.location.pathname.includes('/admin/');
  const rootPrefix = inAdmin ? '../' : '';
  const adminPrefix = inAdmin ? '' : 'admin/';

  const safeCompany = escapeHTML(currentUser?.companyName || '');
  const safeEmail = escapeHTML(currentUser?.email || '');

  const initials = currentUser
    ? (currentUser.contactName || currentUser.companyName || 'U')
        .split(' ')
        .filter(Boolean)
        .map(word => word[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '';

  const portalLinks = `
    <li>
      <a href="${rootPrefix}catalog.html" class="nav-link ${activePage === 'catalog' ? 'active' : ''}">
        Catalog
      </a>
    </li>

    ${loggedIn ? `
      <li>
        <a href="${rootPrefix}quick-order.html" class="nav-link ${activePage === 'quick-order' ? 'active' : ''}">
          Quick Order
        </a>
      </li>

      <li>
        <a href="${rootPrefix}account.html" class="nav-link ${activePage === 'account' ? 'active' : ''}">
          Account
        </a>
      </li>

      <li><div class="nav-divider"></div></li>
    ` : ''}
  `;

  const rightDesktop = loggedIn ? `
    <a href="${adminPrefix}admin-login.html" class="nav-admin-btn" style="font-size:12px;">🛡 Admin</a>

    <div class="nav-divider"></div>

    <div style="position:relative;">
      <button
        id="user-menu-btn"
        type="button"
        style="display:flex;align-items:center;gap:.6rem;padding:.4rem .6rem;border-radius:10px;background:none;border:none;cursor:pointer;transition:background .15s;"
        onmouseover="this.style.background='rgba(255,255,255,.08)'"
        onmouseout="this.style.background='none'">

        <div style="width:32px;height:32px;background:rgba(200,133,58,.25);border:1px solid rgba(200,133,58,.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#D4A574;">
          ${escapeHTML(initials)}
        </div>

        <div style="text-align:left;display:none;" class="xl-show">
          <div style="font-size:12px;color:#F5E6D3;">${safeCompany}</div>
          <div style="font-size:10px;color:#6B5744;">${safeEmail}</div>
        </div>

        <span style="color:#6B5744;font-size:11px;">▾</span>
      </button>

      <div
        id="user-menu-dropdown"
        style="display:none;position:absolute;right:0;top:calc(100% + 8px);width:210px;background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.12);border:1px solid #EDE8E3;overflow:hidden;z-index:200;">

        <div style="padding:.75rem 1rem;border-bottom:1px solid #F0EAE4;">
          <div style="font-size:14px;color:#2C1810;">${safeCompany}</div>
          <div style="font-size:11px;color:#8B7355;">${safeEmail}</div>
        </div>

        <a
          href="${rootPrefix}account.html"
          style="display:flex;align-items:center;gap:.6rem;padding:.65rem 1rem;font-size:14px;color:#2C1810;text-decoration:none;transition:background .15s;"
          onmouseover="this.style.background='#FAF8F5'"
          onmouseout="this.style.background='none'">
          👤 My Account
        </a>

        <a
          href="${rootPrefix}mfa-setup.html"
          style="display:flex;align-items:center;gap:.6rem;padding:.65rem 1rem;font-size:14px;color:#2C1810;text-decoration:none;transition:background .15s;"
          onmouseover="this.style.background='#FAF8F5'"
          onmouseout="this.style.background='none'">
          🔐 MFA Setup
        </a>

        <div style="height:1px;background:#F0EAE4;"></div>

        <button
          onclick="handleLogout()"
          type="button"
          style="width:100%;display:flex;align-items:center;gap:.6rem;padding:.65rem 1rem;font-size:14px;color:#ef4444;background:none;border:none;cursor:pointer;transition:background .15s;"
          onmouseover="this.style.background='#fff5f5'"
          onmouseout="this.style.background='none'">
          🚪 Sign Out
        </button>
      </div>
    </div>
  ` : `
    <a href="${rootPrefix}login.html" class="nav-btn">Sign In</a>
  `;

  const mobilePortalLinks = `
    <a href="${rootPrefix}catalog.html" class="nav-mobile-link ${activePage === 'catalog' ? 'active' : ''}">
      📦 Catalog
    </a>

    ${loggedIn ? `
      <a href="${rootPrefix}quick-order.html" class="nav-mobile-link ${activePage === 'quick-order' ? 'active' : ''}">
        ⚡ Quick Order
      </a>

      <a href="${rootPrefix}account.html" class="nav-mobile-link ${activePage === 'account' ? 'active' : ''}">
        👤 Account
      </a>

      <a href="${rootPrefix}mfa-setup.html" class="nav-mobile-link ${activePage === 'mfa' ? 'active' : ''}">
        🔐 MFA Setup
      </a>

      <div class="nav-mobile-divider"></div>
    ` : ''}
  `;

  const mobileAuth = loggedIn ? `
    <a href="${adminPrefix}admin-login.html" class="nav-mobile-link">🛡 Admin Portal</a>

    <div class="nav-mobile-divider"></div>

    <button
      onclick="handleLogout()"
      type="button"
      class="nav-mobile-link"
      style="background:rgba(239,68,68,.08);color:#ef4444;border:none;cursor:pointer;width:100%;text-align:left;">
      🚪 Sign Out
    </button>
  ` : `
    <a href="${rootPrefix}login.html" class="nav-mobile-signin">Sign In</a>
  `;

  const html = `
    <nav class="nav" role="navigation" aria-label="Main navigation">
      <div class="nav-inner">

        <a href="${rootPrefix}catalog.html" class="nav-logo" aria-label="ESPRESSGO home">
          <div class="nav-logo-icon">E</div>

          <div class="nav-logo-text">
            <div class="nav-logo-name">ESPRESSGO</div>
            <div class="nav-logo-sub">Wholesale Portal</div>
          </div>
        </a>

        <ul class="nav-links" role="list">
          ${portalLinks}

          <li>
            <a href="${rootPrefix}about.html" class="nav-link ${activePage === 'about' ? 'active' : ''}">
              About
            </a>
          </li>

          <li>
            <a href="${rootPrefix}contact.html" class="nav-link ${activePage === 'contact' ? 'active' : ''}">
              Contact
            </a>
          </li>
        </ul>

        <div class="nav-right-desktop" style="display:flex;align-items:center;gap:.5rem;">
          ${rightDesktop}
        </div>

        <button
          class="nav-hamburger"
          id="hamburger-btn"
          type="button"
          aria-label="Toggle menu"
          aria-expanded="false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="nav-mobile" id="mobile-menu" role="menu" aria-hidden="true">
        ${mobilePortalLinks}

        <a href="${rootPrefix}about.html" class="nav-mobile-link ${activePage === 'about' ? 'active' : ''}">
          ℹ️ About
        </a>

        <a href="${rootPrefix}contact.html" class="nav-mobile-link ${activePage === 'contact' ? 'active' : ''}">
          ✉️ Contact
        </a>

        <div class="nav-mobile-divider"></div>

        ${mobileAuth}
      </div>
    </nav>
  `;

  const navPlaceholder = document.getElementById('nav-placeholder');

  if (navPlaceholder) {
    navPlaceholder.innerHTML = html;
  }

  const ham = document.getElementById('hamburger-btn');
  const mob = document.getElementById('mobile-menu');

  if (ham && mob) {
    ham.addEventListener('click', () => {
      const open = mob.classList.toggle('open');
      ham.setAttribute('aria-expanded', open ? 'true' : 'false');
      mob.setAttribute('aria-hidden', open ? 'false' : 'true');
    });
  }

  const userMenuBtn = document.getElementById('user-menu-btn');
  const userMenuDropdown = document.getElementById('user-menu-dropdown');

  if (userMenuBtn && userMenuDropdown) {
    userMenuBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      userMenuDropdown.style.display = userMenuDropdown.style.display === 'block' ? 'none' : 'block';
    });

    userMenuDropdown.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    document.addEventListener('click', () => {
      userMenuDropdown.style.display = 'none';
    });
  }
}


/* ============================================================
   Footer builder
   ============================================================ */

function buildFooter() {
  const footerPlaceholder = document.getElementById('footer-placeholder');

  if (!footerPlaceholder) return;

  const inAdmin = window.location.pathname.includes('/admin/');
  const rootPrefix = inAdmin ? '../' : '';

  footerPlaceholder.innerHTML = `
    <footer class="footer" role="contentinfo">
      <div class="footer-inner">

        <div class="footer-logo">
          <div class="footer-logo-icon">E</div>
          <span class="footer-logo-text">ESPRESSGO</span>
        </div>

        <nav class="footer-links" aria-label="Footer links">
          <a href="${rootPrefix}about.html">About</a>
          <a href="${rootPrefix}contact.html">Contact</a>
        </nav>

        <p class="footer-copy">
          © 2026 ESPRESSGO. Gel-based espresso shots for business. Singapore.
        </p>

      </div>
    </footer>
  `;
}


/* ============================================================
   Logout and auth guard
   ============================================================ */

async function handleLogout() {
  await Auth.logout();

  const inAdmin = window.location.pathname.includes('/admin/');
  window.location.href = inAdmin ? '../login.html' : 'login.html';
}

function requireAuth() {
  if (!Auth.isLoggedIn()) {
    localStorage.setItem(
      'redirectAfterLogin',
      window.location.pathname.split('/').pop() || 'catalog.html'
    );

    window.location.href = 'login.html';
  }
}


/* ============================================================
   Pouch SVG helpers
   ============================================================ */

function pouchSVG(product, size = 130, dimmed = false) {
  const {
    pouchColor = '#C8580A',
    pouchAccent = '#8B3A00',
    labelColor = '#F5E0C8',
    name = 'ESPRESSGO'
  } = product || {};

  const height = size * 1.55;
  const label = String(name).replace('ESPRESSGO ', '');

  return `
    <svg width="${size}" height="${height}" viewBox="0 0 100 155" xmlns="http://www.w3.org/2000/svg" style="opacity:${dimmed ? 0.4 : 1}">
      <rect x="42" y="0" width="16" height="14" rx="4" fill="${escapeHTML(pouchAccent)}"/>
      <path d="M36 14 Q30 20 28 30 L72 30 Q70 20 64 14 Z" fill="${escapeHTML(pouchColor)}"/>
      <rect x="18" y="30" width="64" height="100" rx="12" fill="${escapeHTML(pouchColor)}"/>
      <rect x="18" y="122" width="64" height="8" rx="6" fill="${escapeHTML(pouchAccent)}"/>
      <rect x="22" y="42" width="56" height="72" rx="6" fill="${escapeHTML(labelColor)}" opacity="0.92"/>
      <text x="50" y="62" text-anchor="middle" font-size="8.5" font-weight="700" font-family="sans-serif" fill="${escapeHTML(pouchAccent)}" letter-spacing="0.5">ESPRESSGO</text>
      <line x1="26" y1="66" x2="74" y2="66" stroke="${escapeHTML(pouchColor)}" stroke-width="0.8" opacity="0.4"/>
      <circle cx="50" cy="78" r="8" fill="${escapeHTML(pouchColor)}" opacity="0.8"/>
      <path d="M44 86 Q48 96 50 101 Q52 96 56 86 Z" fill="${escapeHTML(pouchColor)}" opacity="0.7"/>
      <text x="50" y="111" text-anchor="middle" font-size="4.5" font-family="sans-serif" fill="${escapeHTML(pouchAccent)}" opacity="0.75">${escapeHTML(label)}</text>
    </svg>
  `;
}

function miniPouchSVG(color, accent, size = 32) {
  const height = size * 1.5;

  return `
    <svg width="${size}" height="${height}" viewBox="0 0 36 54" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="0" width="8" height="6" rx="2" fill="${escapeHTML(accent)}"/>
      <path d="M10 6 Q8 9 8 12 L28 12 Q28 9 26 6 Z" fill="${escapeHTML(color)}"/>
      <rect x="4" y="12" width="28" height="36" rx="6" fill="${escapeHTML(color)}"/>
      <rect x="4" y="44" width="28" height="4" rx="3" fill="${escapeHTML(accent)}"/>
      <rect x="7" y="16" width="22" height="26" rx="4" fill="${escapeHTML(accent)}" opacity="0.18"/>
      <text x="18" y="28" text-anchor="middle" font-size="4" font-weight="700" font-family="sans-serif" fill="${escapeHTML(accent)}" letter-spacing="0.2">ESG</text>
    </svg>
  `;
}


/* ============================================================
   Make helpers available globally
   ============================================================ */

window.getSupabaseClient = getSupabaseClient;
window.Auth = Auth;
window.Products = Products;
window.Orders = Orders;
window.getActiveTier = getActiveTier;
window.formatCurrency = formatCurrency;
window.showToast = showToast;
window.buildNav = buildNav;
window.buildFooter = buildFooter;
window.handleLogout = handleLogout;
window.requireAuth = requireAuth;
window.pouchSVG = pouchSVG;
window.miniPouchSVG = miniPouchSVG;
window.escapeHTML = escapeHTML;


/* ============================================================
   Social Floats & FAQ Agent
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('faq-chat-widget')) return;

  const socialHTML = `
    <div class="social-floats">

      <a
        href="https://www.linkedin.com/in/damien-teo-371b31257"
        target="_blank"
        rel="noopener noreferrer"
        class="social-float-btn linkedin"
        aria-label="LinkedIn">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
      </a>

      <a
        href="https://wa.me/6587977961"
        target="_blank"
        rel="noopener noreferrer"
        class="social-float-btn whatsapp"
        aria-label="WhatsApp">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.031 0C5.385 0 0 5.386 0 12.031c0 2.146.561 4.241 1.626 6.096L.18 24l6.02-1.583C7.994 23.366 10.002 24 12.031 24 18.675 24 24 18.614 24 11.97 24 5.326 18.675 0 12.031 0zM12 21.921c-1.847 0-3.655-.494-5.239-1.428l-.375-.221-3.879 1.018 1.036-3.774-.243-.384A9.873 9.873 0 0 1 1.944 12c0-5.466 4.453-9.919 9.923-9.919 5.467 0 9.922 4.454 9.922 9.92S17.467 21.92 12 21.921zm5.45-7.462c-.298-.15-1.767-.872-2.039-.972-.274-.1-.472-.15-.672.15-.199.299-.77 .972-.944 1.17-.174.199-.348.225-.646.075-.298-.15-1.26-.464-2.4-1.485-.886-.793-1.484-1.774-1.658-2.073-.174-.299-.019-.462.13-.611.135-.134.298-.349.447-.523.149-.174.199-.299.298-.499.1-.198.05-.373-.024-.523-.075-.15-.672-1.621-.92-2.22-.242-.584-.488-.505-.672-.514-.174-.01-.373-.01-.572-.01-.199 0-.523.075-.797.374-.274.298-1.045 1.02-1.045 2.49 0 1.47 1.07 2.89 1.219 3.09.15.199 2.106 3.214 5.101 4.506.711.306 1.266.49 1.698.627.714.226 1.365.194 1.88.118.577-.085 1.767-.722 2.016-1.42.249-.697.249-1.295.174-1.42-.074-.124-.274-.198-.572-.348z"/>
        </svg>
      </a>

      <button class="social-float-btn faq" id="faq-toggle-btn" type="button" aria-label="FAQ Agent">
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
              <span class="pulse-dot" style="width:7px;height:7px;background:#22c55e;"></span>
              Auto-Reply Agent · Online
            </div>
          </div>
        </div>
        <button class="faq-close-btn" id="faq-close-btn" type="button" aria-label="Close FAQ menu">×</button>
      </div>

      <div class="faq-chat-body" id="faq-chat-body"></div>

      <div class="faq-options-panel" id="faq-options-panel">
        <div class="faq-options-title">Click a question to ask</div>
        <div id="faq-buttons-container"></div>
      </div>

      <div class="faq-input-container">
        <input
          type="text"
          id="faq-user-input"
          class="faq-input"
          placeholder="Or ask a custom question..."
          aria-label="Type B2B question"/>

        <button class="faq-send-btn" id="faq-send-btn" type="button" aria-label="Send message">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', socialHTML);

  const faqData = [
    {
      q: 'How long does delivery take?',
      answer: 'Singapore logistics typically take **2 to 3 business days** to arrive at your B2B warehouse. We offer free delivery islandwide for wholesale orders of 5 cartons or more.'
    },
    {
      q: 'Does EspressGo contain dairy or sugar?',
      answer: 'We offer two premium B2B variants:\n- **ESPRESSGO Original**: dairy-free robusta gel.\n- **ESPRESSGO Oat Milk**: contains oat milk, is dairy-free, and has a lightly sweetened profile.'
    },
    {
      q: 'Is EspressGo halal-certified?',
      answer: 'ESPRESSGO uses Halal-friendly ingredients. For official certificates or procurement documents, please contact us through WhatsApp.'
    },
    {
      q: 'Can I track my order?',
      answer: 'Yes. After signing in, go to **Account** to view your submitted orders and status updates such as pending, processing, shipped, or delivered.'
    },
    {
      q: 'What is the minimum wholesale order?',
      answer: 'The catalog supports carton-based ordering. 1 carton contains 50 pouches. Volume pricing improves when you order more cartons.'
    }
  ];

  const faqWidget = document.getElementById('faq-chat-widget');
  const faqToggle = document.getElementById('faq-toggle-btn');
  const faqClose = document.getElementById('faq-close-btn');
  const faqBadge = document.getElementById('faq-badge');
  const faqChatBody = document.getElementById('faq-chat-body');
  const faqButtonsContainer = document.getElementById('faq-buttons-container');
  const faqUserInput = document.getElementById('faq-user-input');
  const faqSendBtn = document.getElementById('faq-send-btn');

  if (!faqWidget || !faqToggle || !faqClose || !faqChatBody || !faqButtonsContainer || !faqUserInput || !faqSendBtn) {
    return;
  }

  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let moved = false;
  let hasInitialized = false;

  faqButtonsContainer.addEventListener('mousedown', (event) => {
    isDown = true;
    moved = false;
    startX = event.pageX - faqButtonsContainer.offsetLeft;
    scrollLeft = faqButtonsContainer.scrollLeft;
  });

  faqButtonsContainer.addEventListener('mouseleave', () => {
    isDown = false;
  });

  faqButtonsContainer.addEventListener('mouseup', () => {
    isDown = false;
  });

  faqButtonsContainer.addEventListener('mousemove', (event) => {
    if (!isDown) return;

    event.preventDefault();

    const x = event.pageX - faqButtonsContainer.offsetLeft;
    const walk = (x - startX) * 1.5;

    if (Math.abs(x - startX) > 5) {
      moved = true;
    }

    faqButtonsContainer.scrollLeft = scrollLeft - walk;
  });

  faqButtonsContainer.addEventListener('click', (event) => {
    if (moved) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  function renderOptions() {
    faqButtonsContainer.innerHTML = faqData.map((item, index) => `
      <button class="faq-option-btn" type="button" data-index="${index}">
        <span>${escapeHTML(item.q)}</span>
      </button>
    `).join('');

    faqButtonsContainer.querySelectorAll('.faq-option-btn').forEach(button => {
      button.addEventListener('click', () => {
        const idx = button.getAttribute('data-index');
        handleQuestionClick(idx);
      });
    });
  }

  function formatResponse(text, sender = 'agent') {
    if (sender === 'user') {
      return escapeHTML(text);
    }

    let formatted = escapeHTML(text || '');

    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/^\s*-\s+(.*?)$/gm, '• $1');
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
  }

  function addMessage(sender, text) {
    const msg = document.createElement('div');
    msg.className = `faq-msg ${sender}`;
    msg.innerHTML = formatResponse(text, sender);
    faqChatBody.appendChild(msg);
    faqChatBody.scrollTop = faqChatBody.scrollHeight;
  }

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

    if (indicator) {
      indicator.remove();
    }
  }

  function setControlsDisabled(disabled) {
    faqUserInput.disabled = disabled;
    faqSendBtn.disabled = disabled;

    faqButtonsContainer.querySelectorAll('.faq-option-btn').forEach(button => {
      button.disabled = disabled;
    });
  }

  function tryApplyOrderAction(rawAnswer) {
    const orderMatch = String(rawAnswer || '').match(/\[\[ORDER_ACTION:\s*([a-zA-Z0-9_-]+),\s*(\d+)\s*\]\]/);

    if (!orderMatch) return String(rawAnswer || '');

    const productId = orderMatch[1];
    const cartons = parseInt(orderMatch[2], 10);
    const cleanedAnswer = String(rawAnswer).replace(/\[\[.*?\]\]/g, '').trim();

    const localCart = JSON.parse(localStorage.getItem('espressgo_cart') || '{}');
    localCart[productId] = (localCart[productId] || 0) + cartons;
    localStorage.setItem('espressgo_cart', JSON.stringify(localCart));

    if (typeof window.updateCart === 'function') {
      window.updateCart(productId, localCart[productId]);
    }

    const product = Products.find(item => item.id === productId);
    const productName = product?.name || productId;

    showToast(
      'AI Order Drafted!',
      `Added ${cartons} cartons of ${productName} to your cart.`,
      'success'
    );

    return cleanedAnswer;
  }

  async function handleUserMessage(text) {
    if (!text || !text.trim()) return;

    const queryText = text.trim();

    faqUserInput.value = '';
    setControlsDisabled(true);

    addMessage('user', queryText);

    const matchedFaq = faqData.find(item =>
      item.answer && item.q.toLowerCase().trim() === queryText.toLowerCase().trim()
    );

    if (matchedFaq) {
      setTimeout(() => {
        showTypingIndicator();

        setTimeout(() => {
          removeTypingIndicator();
          addMessage('agent', matchedFaq.answer);
          setControlsDisabled(false);
          faqChatBody.scrollTop = faqChatBody.scrollHeight;
          faqUserInput.focus();
        }, 600);
      }, 300);

      return;
    }

    setTimeout(async () => {
      showTypingIndicator();

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            question: queryText
          })
        });

        removeTypingIndicator();

        if (response.ok) {
          const data = await response.json();

          const rawAnswer =
            data.answer ||
            'I parsed the coffee matrix, but found an empty response. Try rephrasing!';

          const cleanedAnswer = tryApplyOrderAction(rawAnswer);
          addMessage('agent', cleanedAnswer);
        } else {
          console.error('API non-OK response status:', response.status);

          if (
            response.status === 404 &&
            (window.location.hostname === 'localhost' ||
             window.location.hostname === '127.0.0.1')
          ) {
            addMessage(
              'agent',
              '⚠️ **Local Server Warning**: WAMP/static localhost cannot run Node.js API routes like `/api/chat`. The website still works, but the AI chat backend needs Vercel dev or deployment.'
            );
          } else if (response.status === 502) {
            addMessage(
              'agent',
              "☕ Our AI brain is taking a quick coffee break. For immediate B2B assistance, Damien is available on <a href='https://wa.me/6587977961' target='_blank'>WhatsApp</a>."
            );
          } else {
            addMessage(
              'agent',
              "Something went wrong on our end. Please reach out to Damien directly on <a href='https://wa.me/6587977961' target='_blank'>WhatsApp</a> for immediate B2B support."
            );
          }
        }
      } catch (error) {
        removeTypingIndicator();

        console.error('Fetch client connection exception:', error);

        addMessage(
          'agent',
          'I could not contact the AI server. If you are testing locally with WAMP, this is expected because `/api` routes need a Node/Vercel server.'
        );
      } finally {
        setControlsDisabled(false);
        faqChatBody.scrollTop = faqChatBody.scrollHeight;
        faqUserInput.focus();
      }
    }, 400);
  }

  function handleQuestionClick(index) {
    const item = faqData[index];

    if (!item) return;

    handleUserMessage(item.q);
  }

  function initChat() {
    if (hasInitialized) return;

    hasInitialized = true;

    addMessage(
      'agent',
      'Hello B2B partner! 👋 I am your automated EspressGo Assistant. Ask me anything about wholesale pricing, Singapore delivery, caffeine, products, or procurement.\n\nOr click a shortcut question to begin:'
    );

    renderOptions();
  }

  faqToggle.addEventListener('click', (event) => {
    event.stopPropagation();

    const isOpen = faqWidget.classList.toggle('open');

    if (isOpen) {
      if (faqBadge) {
        faqBadge.style.display = 'none';
      }

      initChat();

      setTimeout(() => {
        faqUserInput.focus();
      }, 300);
    }
  });

  faqClose.addEventListener('click', (event) => {
    event.stopPropagation();
    faqWidget.classList.remove('open');
  });

  faqSendBtn.addEventListener('click', () => {
    handleUserMessage(faqUserInput.value);
  });

  faqUserInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      handleUserMessage(faqUserInput.value);
    }
  });

  document.addEventListener('click', (event) => {
    if (!faqWidget.contains(event.target) && !faqToggle.contains(event.target)) {
      faqWidget.classList.remove('open');
    }
  });
});