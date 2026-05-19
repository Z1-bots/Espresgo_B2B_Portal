/* ============================================================
   about.js — Logic for about.html
   Depends on: shared.js (buildNav, buildFooter)
   ============================================================ */

buildNav('about');
buildFooter();


// ── Animated stat counters ────────────────────────────────
/**
 * Animates a number element from 0 to `to`, appending `suffix`.
 * Runs 40 steps over ~1.2 seconds.
 */
function animateCounter(el, to, suffix) {
  let v        = 0;
  const step   = to / 40;
  const timer  = setInterval(() => {
    v += step;
    if (v >= to) { el.textContent = to + suffix; clearInterval(timer); return; }
    el.textContent = Math.floor(v) + suffix;
  }, 30);
}

// Use IntersectionObserver so counters only fire when scrolled into view
const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      counterObserver.unobserve(e.target);
      const t = e.target;
      if (t.id === 'stat-1')   animateCounter(t, 1,   '');
      if (t.id === 'stat-12')  animateCounter(t, 12,  'mo');
      if (t.id === 'stat-0')   animateCounter(t, 0,   '');
      if (t.id === 'stat-100') animateCounter(t, 100, '%');
    }
  });
}, { threshold: .3 });

['stat-1', 'stat-12', 'stat-0', 'stat-100'].forEach(id => {
  const el = document.getElementById(id);
  if (el) counterObserver.observe(el);
});


// ── Customer segment tabs ─────────────────────────────────
// Content for each segment tab panel
const segData = {
  offices: { icon: '🏢', headline: 'Fuel your team instantly',     points: ['No machine noise or mess', 'Pantry-friendly storage', 'Bulk pricing from 50 units'] },
  gyms:    { icon: '🏋️', headline: 'Pre-workout, pocket-sized',    points: ['Spill-proof pouch format', 'No fridge needed', 'Ideal for member packs'] },
  events:  { icon: '📅', headline: 'Easy to distribute at scale',  points: ['Individually packed', 'Lightweight & portable', 'Custom quantity orders'] },
  retail:  { icon: '🏪', headline: 'Impulse-friendly format',      points: ['Shelf-stable — ambient temp', 'Compact SKU footprint', 'Consignment options available'] },
};

document.querySelectorAll('.seg-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    // Deactivate all tabs
    document.querySelectorAll('.seg-tab').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    // Activate clicked tab
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');

    // Update panel content
    const d = segData[btn.dataset.seg];
    document.getElementById('seg-icon').textContent     = d.icon;
    document.getElementById('seg-headline').textContent = d.headline;
    document.getElementById('seg-points').innerHTML     = d.points.map(p => `<span class="seg-point">${p}</span>`).join('');

    // Replay fade-in animation by forcing a reflow
    const panel = document.getElementById('seg-panel');
    panel.classList.remove('fade-in');
    void panel.offsetWidth; // trigger reflow
    panel.classList.add('fade-in');
  });
});
