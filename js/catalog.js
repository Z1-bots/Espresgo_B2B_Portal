/* ============================================================
   catalog.js — Logic for catalog.html
   Depends on: shared.js (Auth, Products, Orders, getActiveTier,
                          pouchSVG, showToast, buildNav, buildFooter,
                          requireAuth)
   ============================================================ */

// ── Auth & initialisation ─────────────────────────────────
buildNav('catalog');
buildFooter();

const user = Auth.getUser();

// Cart state: maps productId → quantity (cartons)
let cart = {};

// Split products into active and coming-soon lists
const active     = Products.filter(p => p.active);
const comingSoon = Products.filter(p => !p.active);


// ── Render helpers ────────────────────────────────────────
/**
 * Builds the full HTML for one product card, including the
 * volume tier grid, stepper control, and subtotal badge.
 */
function renderProductCard(product) {
  const qty          = cart[product.id] || 0;
  const activeTier   = getActiveTier(product.tiers, qty);
  const activeTierIdx = product.tiers.findIndex(t => t.min === activeTier.min);
  const nextTier     = product.tiers.find(t => qty < t.min);

  return `
    <div class="product-card" role="listitem">
      <div class="product-inner">
        <!-- Coloured visual panel with pouch SVG -->
        <div class="product-visual" style="background:linear-gradient(160deg,${product.pouchAccent}EE,${product.pouchColor}CC);">
          <div style="position:absolute;top:.75rem;right:.75rem;width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.1);"></div>
          ${pouchSVG(product, 105)}
          <span class="stock-badge">✓ In Stock</span>
        </div>

        <!-- Product info: name, specs, pricing tiers, quantity stepper -->
        <div class="product-info">
          <div class="product-header">
            <div>
              <div class="product-name">${product.name}</div>
              <div class="product-sub">${product.subtitle}</div>
            </div>
            <span class="product-sku">${product.sku}</span>
          </div>

          <div class="specs">
            ${[product.caffeine, product.format, product.shelfLife].map(s => `<span class="spec">${s}</span>`).join('')}
          </div>

          <!-- Volume pricing tier grid -->
          <div>
            <p style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem;">Volume Pricing — per carton of 50 pouches</p>
            <div class="tier-grid">
              ${product.tiers.map((tier, i) => {
                const isActive = i === activeTierIdx && qty > 0;
                const pct = i > 0 ? Math.round((1 - tier.price / product.tiers[0].price) * 100) : null;
                return `<div class="tier-cell ${isActive ? 'active' : ''}">
                  <div class="tier-price">$${tier.price}</div>
                  <div class="tier-range">${tier.max ? `${tier.min}–${tier.max} ctn` : `${tier.min}+ ctn`}</div>
                  ${pct ? `<div class="tier-pct">−${pct}%</div>` : ''}
                </div>`;
              }).join('')}
            </div>
          </div>

          <!-- Quantity stepper + subtotal badge -->
          <div style="display:flex;flex-wrap:wrap;align-items:center;gap:.75rem;margin-top:auto;">
            <div class="stepper">
              <button class="stepper-btn" onclick="updateCart('${product.id}', ${Math.max(0, qty - 1)})" ${qty === 0 ? 'disabled' : ''} aria-label="Decrease quantity">−</button>
              <input class="stepper-input" type="number" min="0" value="${qty || ''}" placeholder="0"
                onchange="updateCart('${product.id}', Math.max(0, parseInt(this.value)||0))"
                aria-label="Quantity in cartons for ${product.name}"/>
              <button class="stepper-btn" onclick="updateCart('${product.id}', ${qty + 1})" aria-label="Increase quantity">+</button>
            </div>
            ${qty > 0 ? `
              <div class="subtotal-badge">
                <div class="subtotal-price">$${(activeTier.price * qty).toFixed(2)}</div>
                <div class="subtotal-pouches">${qty * 50} pouches</div>
              </div>
            ` : ''}
          </div>

          <!-- Tier upgrade hint (shown when next tier is reachable) -->
          ${nextTier && qty > 0 ? `
            <div class="tier-hint">📉 Add ${nextTier.min - qty} more carton${nextTier.min - qty !== 1 ? 's' : ''} to unlock <strong>−${Math.round((1 - nextTier.price / product.tiers[0].price) * 100)}% pricing</strong></div>
          ` : ''}
        </div>
      </div>
    </div>`;
}

/** Refreshes the product list (called after any cart change). */
function renderAll() {
  document.getElementById('products-list').innerHTML = active.map(renderProductCard).join('');
}


// ── Cart management ───────────────────────────────────────
/** Updates the cart quantity for a product and refreshes the UI. */
function updateCart(id, qty) {
  if (qty <= 0) { delete cart[id]; } else { cart[id] = qty; }
  renderAll();
  updateCheckoutBar();
}

/** Total cartons across all products in the cart. */
function totalCartons() {
  return Object.values(cart).reduce((s, q) => s + q, 0);
}

/** Total price (in SGD) applying the correct tier per product. */
function totalPrice() {
  return Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = active.find(p => p.id === id);
    return p ? sum + getActiveTier(p.tiers, qty).price * qty : sum;
  }, 0);
}

/** Shows/hides the sticky checkout bar and updates its summary text. */
function updateCheckoutBar() {
  const count = totalCartons();
  const bar   = document.getElementById('checkout-bar');
  if (count > 0) {
    bar.classList.add('visible');
    document.getElementById('cart-count-badge').textContent  = count;
    document.getElementById('cart-summary-text').textContent = `${count} carton${count !== 1 ? 's' : ''} · ${count * 50} pouches`;
    document.getElementById('cart-total-text').textContent   = `SGD $${totalPrice().toFixed(2)} total`;
  } else {
    bar.classList.remove('visible');
  }
}


// ── Coming soon section ───────────────────────────────────
if (comingSoon.length > 0) {
  document.getElementById('coming-soon-section').style.display = 'block';
  document.getElementById('coming-grid').innerHTML = comingSoon.map(p => `
    <div class="coming-card">
      <div class="coming-img" style="background:linear-gradient(145deg,${p.pouchAccent}BB,${p.pouchColor}88);">
        ${pouchSVG(p, 72, true)}
        <div class="coming-soon-badge">🔒 Soon</div>
      </div>
      <div class="coming-body">
        <div class="coming-name">${p.name}</div>
        <p class="coming-hint">${p.comingSoonHint}</p>
      </div>
    </div>`).join('');
}


// ── Checkout modal ────────────────────────────────────────
const modal = document.getElementById('checkout-modal');

document.getElementById('clear-cart-btn').addEventListener('click', () => {
  cart = {};
  renderAll();
  updateCheckoutBar();
});

document.getElementById('checkout-btn').addEventListener('click', () => {

  // Guests can browse but must log in to purchase
  if (typeof Auth !== 'undefined' && !Auth.isLoggedIn()) {

    // Save destination for redirect after login
    localStorage.setItem('redirectAfterLogin', 'catalog.html');

    showToast('Please sign in to continue checkout.');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 600);

    return;
  }

  openModal();
});

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-back').addEventListener('click', closeModal);
// Close modal when clicking the backdrop
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

/**
 * Returns the cart as an array of enriched line objects,
 * used for both the modal and order submission.
 */
function getOrderLines() {
  return active.filter(p => (cart[p.id] || 0) > 0).map(p => {
    const qty  = cart[p.id];
    const tier = getActiveTier(p.tiers, qty);
    return { p, qty, tier, subtotal: qty * tier.price };
  });
}

/** Opens the checkout modal and populates it with current cart data. */
function openModal() {
  const lines = getOrderLines();
  document.getElementById('modal-items').innerHTML = lines.map(({ p, qty, tier, subtotal }) => `
    <div class="modal-item" role="listitem">
      <div class="modal-item-color" style="background:${p.pouchColor};"></div>
      <div>
        <div class="modal-item-name">${p.name}</div>
        <div class="modal-item-detail">${qty} ctn × SGD $${tier.price}</div>
      </div>
      <div class="modal-item-total">SGD $${subtotal.toFixed(2)}</div>
    </div>`).join('');

  const tc = totalCartons();
  const tp = totalPrice();
  document.getElementById('modal-totals').innerHTML = `
    <div class="modal-total-row"><span>Cartons</span><span>${tc}</span></div>
    <div class="modal-total-row"><span>Pouches</span><span>${(tc * 50).toLocaleString()}</span></div>
    <div class="modal-total-row main"><span>Order total</span><span style="color:var(--amber);font-size:1.2rem;">SGD $${tp.toFixed(2)}</span></div>`;

  document.getElementById('delivery-text').textContent = `Delivering to: ${user?.deliveryAddress || 'Your registered address'}`;
  modal.classList.add('open');
}

function closeModal() { modal.classList.remove('open'); }

/** Places the order, clears the cart, and shows a success toast. */
document.getElementById('modal-place').addEventListener('click', () => {

  // Prevent guest checkout
  if (typeof Auth !== 'undefined' && !Auth.isLoggedIn()) {
    showToast('Please sign in before placing your order.');
    window.location.href = 'login.html';
    return;
  }

  // Refresh user data after login
  const currentUser = Auth.getUser();
  
  const lines = getOrderLines();
  Orders.add({
    company: user.companyName,
    contactName: user.email,
    businessType: user.businessType,
    items: lines.map(({ p, qty, tier }) => ({ sku: p.sku, name: p.name, cartons: qty, pricePerCarton: tier.price })),
    totalCartons: totalCartons(),
    totalAmount: totalPrice(),
    status: 'pending',
    deliveryAddress: user.deliveryAddress || 'Singapore',
  });

  closeModal();
  cart = {};
  renderAll();
  updateCheckoutBar();

  // Show a brief bottom-centre success banner
  const toast = document.getElementById('order-success');
  toast.style.display = 'flex';
  setTimeout(() => toast.style.display = 'none', 4000);
});


// ── Initialise ────────────────────────────────────────────
renderAll();
