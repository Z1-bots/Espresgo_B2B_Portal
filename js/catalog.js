/* ============================================================
   catalog.js — Logic for catalog.html
   Depends on: shared.js
   Uses:
   - Auth
   - Products
   - Orders
   - getActiveTier
   - pouchSVG
   - showToast
   - buildNav
   - buildFooter

   Supabase version
   ============================================================ */


/* ============================================================
   Page state
   ============================================================ */

let user = null;

// Cart state: maps productId → quantity in cartons
let cart = JSON.parse(localStorage.getItem('espressgo_cart') || '{}');

// Split products into active and coming-soon lists
const active = Products.filter(p => p.active);
const comingSoon = Products.filter(p => !p.active);


/* ============================================================
   Cart persistence helpers
   ============================================================ */

function saveCart() {
  localStorage.setItem('espressgo_cart', JSON.stringify(cart));
}


function clearCart() {
  cart = {};
  saveCart();
}


/* ============================================================
   Product card renderer
   ============================================================ */

/**
 * Builds the full HTML for one product card.
 * Includes:
 * - product image
 * - price
 * - specs
 * - tier pricing
 * - quantity stepper
 * - subtotal badge
 */
function renderProductCard(product) {
  const qty = cart[product.id] || 0;
  const activeTier = getActiveTier(product.tiers, qty);
  const activeTierIdx = product.tiers.findIndex(t => t.min === activeTier.min);

  return `
    <div class="product-card" role="listitem">

      <!-- Product image -->
      <div
        class="product-image"
        style="
          background: linear-gradient(
            160deg,
            ${product.pouchAccent}EE,
            ${product.pouchColor}CC
          );
        ">
        ${pouchSVG(product, 130)}
      </div>

      <!-- Product content -->
      <div class="product-content">

        <!-- Name -->
        <div class="product-name">
          ${escapeHTML(product.name)}
        </div>

        <!-- Price -->
        <div class="product-price">
          SGD $${product.tiers[0].price}
          <span>/ carton</span>
        </div>

        <!-- Description -->
        <div class="product-description">
          ${escapeHTML(product.subtitle)}
        </div>

        <!-- Specs -->
        <div class="specs">
          ${[
            product.caffeine,
            product.format,
            product.shelfLife
          ].map(s => `
            <span class="spec">${escapeHTML(s)}</span>
          `).join('')}
        </div>

        <!-- Tier pricing -->
        <div class="tier-section">
          <p class="tier-title">
            Volume Pricing
          </p>

          <div class="tier-grid">
            ${product.tiers.map((tier, i) => {
              const isActive = i === activeTierIdx && qty > 0;

              const pct = i > 0
                ? Math.round((1 - tier.price / product.tiers[0].price) * 100)
                : null;

              return `
                <div class="tier-cell ${isActive ? 'active' : ''}">
                  <div class="tier-price">
                    SGD $${tier.price}
                  </div>

                  <div class="tier-range">
                    ${
                      tier.max
                        ? `${tier.min}-${tier.max} ctn`
                        : `${tier.min}+ ctn`
                    }
                  </div>

                  ${
                    pct
                      ? `<div class="tier-pct">-${pct}%</div>`
                      : ''
                  }
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Cart controls -->
        <div class="product-actions">

          <div class="stepper">

            <button
              class="stepper-btn"
              onclick="updateCart('${product.id}', ${Math.max(0, qty - 1)})"
              ${qty === 0 ? 'disabled' : ''}
              aria-label="Decrease ${escapeHTML(product.name)} quantity">
              −
            </button>

            <input
              class="stepper-input"
              type="number"
              min="0"
              value="${qty || ''}"
              placeholder="0"
              aria-label="${escapeHTML(product.name)} quantity in cartons"
              onchange="updateCart(
                '${product.id}',
                Math.max(0, parseInt(this.value) || 0)
              )"
            />

            <button
              class="stepper-btn"
              onclick="updateCart('${product.id}', ${qty + 1})"
              aria-label="Increase ${escapeHTML(product.name)} quantity">
              +
            </button>

          </div>

          ${
            qty > 0
              ? `
                <div class="subtotal-badge">
                  <div class="subtotal-price">
                    SGD $${(activeTier.price * qty).toFixed(2)}
                  </div>

                  <div class="subtotal-pouches">
                    ${(qty * 50).toLocaleString()} pouches
                  </div>
                </div>
              `
              : ''
          }

        </div>

      </div>
    </div>
  `;
}


/* ============================================================
   Render active products
   ============================================================ */

function renderAll() {
  const list = document.getElementById('products-list');

  if (!list) return;

  list.innerHTML = active.map(renderProductCard).join('');
}


/* ============================================================
   Cart management
   ============================================================ */

/**
 * Updates the cart quantity for a product and refreshes the UI.
 * This function is also used by the AI chat widget in shared.js.
 */
function updateCart(id, qty) {
  const cleanQty = Math.max(0, parseInt(qty) || 0);

  if (cleanQty <= 0) {
    delete cart[id];
  } else {
    cart[id] = cleanQty;
  }

  saveCart();
  renderAll();
  updateCheckoutBar();
}

window.updateCart = updateCart;


/**
 * Total cartons across all products in the cart.
 */
function totalCartons() {
  return Object.values(cart).reduce((sum, qty) => {
    return sum + qty;
  }, 0);
}


/**
 * Total price in SGD, applying the correct tier per product.
 */
function totalPrice() {
  return Object.entries(cart).reduce((sum, [id, qty]) => {
    const product = active.find(p => p.id === id);

    if (!product) return sum;

    const tier = getActiveTier(product.tiers, qty);

    return sum + tier.price * qty;
  }, 0);
}


/**
 * Shows/hides the sticky checkout bar and updates summary text.
 */
function updateCheckoutBar() {
  const count = totalCartons();
  const bar = document.getElementById('checkout-bar');

  if (!bar) return;

  if (count > 0) {
    bar.classList.add('visible');

    document.getElementById('cart-count-badge').textContent = count;

    document.getElementById('cart-summary-text').textContent =
      `${count} carton${count !== 1 ? 's' : ''} · ${(count * 50).toLocaleString()} pouches`;

    document.getElementById('cart-total-text').textContent =
      `SGD $${totalPrice().toFixed(2)} total`;
  } else {
    bar.classList.remove('visible');
  }
}


/* ============================================================
   Coming soon section
   ============================================================ */

function renderComingSoon() {
  const section = document.getElementById('coming-soon-section');
  const grid = document.getElementById('coming-grid');

  if (!section || !grid) return;

  if (comingSoon.length <= 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  grid.innerHTML = comingSoon.map(p => `
    <div class="coming-card">

      <div
        class="coming-img"
        style="
          background: linear-gradient(
            145deg,
            ${p.pouchAccent}BB,
            ${p.pouchColor}88
          );
        ">

        ${pouchSVG(p, 72, true)}

        <div class="coming-soon-badge">
          🔒 Soon
        </div>
      </div>

      <div class="coming-body">
        <div class="coming-name">
          ${escapeHTML(p.name)}
        </div>

        <p class="coming-hint">
          ${escapeHTML(p.comingSoonHint || 'Coming soon')}
        </p>
      </div>

    </div>
  `).join('');
}


/* ============================================================
   Checkout modal
   ============================================================ */

const modal = document.getElementById('checkout-modal');


/**
 * Returns the cart as an array of enriched line objects.
 * Used for both the modal and order submission.
 */
function getOrderLines() {
  return active
    .filter(p => (cart[p.id] || 0) > 0)
    .map(p => {
      const qty = cart[p.id];
      const tier = getActiveTier(p.tiers, qty);

      return {
        p,
        qty,
        tier,
        subtotal: qty * tier.price
      };
    });
}


/**
 * Opens the checkout modal and populates it with current cart data.
 */
function openModal() {
  const lines = getOrderLines();

  if (!lines.length) {
    showToast('Cart is empty', 'Please add at least one product before checkout.', 'error');
    return;
  }

  user = Auth.getUser();

  document.getElementById('modal-items').innerHTML = lines.map(({ p, qty, tier, subtotal }) => `
    <div class="modal-item" role="listitem">

      <div
        class="modal-item-color"
        style="background:${p.pouchColor};">
      </div>

      <div>
        <div class="modal-item-name">
          ${escapeHTML(p.name)}
        </div>

        <div class="modal-item-detail">
          ${qty} ctn × SGD $${tier.price}
        </div>
      </div>

      <div class="modal-item-total">
        SGD $${subtotal.toFixed(2)}
      </div>

    </div>
  `).join('');

  const tc = totalCartons();
  const tp = totalPrice();

  document.getElementById('modal-totals').innerHTML = `
    <div class="modal-total-row">
      <span>Cartons</span>
      <span>${tc}</span>
    </div>

    <div class="modal-total-row">
      <span>Pouches</span>
      <span>${(tc * 50).toLocaleString()}</span>
    </div>

    <div class="modal-total-row main">
      <span>Order total</span>
      <span style="color:var(--amber);font-size:1.2rem;">
        SGD $${tp.toFixed(2)}
      </span>
    </div>
  `;

  document.getElementById('delivery-text').textContent =
    `Delivering to: ${user?.deliveryAddress || 'Your registered address'}`;

  modal.classList.add('open');
}


/**
 * Closes checkout modal.
 */
function closeModal() {
  modal.classList.remove('open');
}


/* ============================================================
   Checkout button handlers
   ============================================================ */

document.getElementById('clear-cart-btn').addEventListener('click', () => {
  clearCart();
  renderAll();
  updateCheckoutBar();
});


document.getElementById('checkout-btn').addEventListener('click', async () => {
  const refreshedUser = await Auth.refreshUser();

  if (!refreshedUser) {
    localStorage.setItem('redirectAfterLogin', 'catalog.html');

    showToast('Please sign in to continue checkout.');

    setTimeout(() => {
      window.location.href = 'login.html';
    }, 600);

    return;
  }

  user = refreshedUser;

  openModal();
});


document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-back').addEventListener('click', closeModal);


// Close modal when clicking the backdrop
modal.addEventListener('click', e => {
  if (e.target === modal) {
    closeModal();
  }
});


/* ============================================================
   Place order
   ============================================================ */

document.getElementById('modal-place').addEventListener('click', async () => {
  const placeBtn = document.getElementById('modal-place');

  placeBtn.disabled = true;
  placeBtn.textContent = 'Submitting…';

  const currentUser = await Auth.refreshUser();

  if (!currentUser) {
    showToast('Please sign in before placing your order.');

    localStorage.setItem('redirectAfterLogin', 'catalog.html');

    window.location.href = 'login.html';
    return;
  }

  const lines = getOrderLines();

  if (!lines.length) {
    showToast('Cart is empty', 'Please add items before placing an order.', 'error');

    placeBtn.disabled = false;
    placeBtn.textContent = '✓ Place Order';

    return;
  }

  try {
    await Orders.add({
      company: currentUser.companyName,
      contactName: currentUser.contactName || currentUser.email,
      businessType: currentUser.businessType,
      items: lines.map(({ p, qty, tier }) => ({
        sku: p.sku,
        name: p.name,
        cartons: qty,
        pricePerCarton: tier.price
      })),
      totalCartons: totalCartons(),
      totalAmount: totalPrice(),
      status: 'pending',
      deliveryAddress: currentUser.deliveryAddress || 'Singapore',
    });
  } catch (error) {
    console.error('Order failed:', error);

    showToast(
      'Order failed',
      error.message || 'Could not save order. Please try again.',
      'error'
    );

    placeBtn.disabled = false;
    placeBtn.textContent = '✓ Place Order';

    return;
  }

  closeModal();

  clearCart();
  renderAll();
  updateCheckoutBar();

  placeBtn.disabled = false;
  placeBtn.textContent = '✓ Place Order';

  const toast = document.getElementById('order-success');

  if (toast) {
    toast.style.display = 'flex';

    setTimeout(() => {
      toast.style.display = 'none';
    }, 4000);
  }
});


/* ============================================================
   Page initialisation
   ============================================================ */

async function initCatalogPage() {
  try {
    user = await Auth.refreshUser();
  } catch (error) {
    console.warn('No active Supabase session found:', error);
    user = Auth.getUser();
  }

  buildNav('catalog');
  buildFooter();

  renderAll();
  renderComingSoon();
  updateCheckoutBar();
}

initCatalogPage();