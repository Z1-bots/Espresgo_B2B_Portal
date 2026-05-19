/* ============================================================
   contact.js — Logic for contact.html
   Depends on: shared.js (buildNav, buildFooter)
   ============================================================ */

buildNav('contact');
buildFooter();


// ── Copy email to clipboard ───────────────────────────────
const copyBtn  = document.getElementById('copy-email-btn');
const copyIcon = document.getElementById('copy-icon');

copyBtn.addEventListener('click', () => {
  try {
    // Fallback clipboard method compatible with WAMP localhost
    const ta = document.createElement('textarea');
    ta.value = 'hello@espressgo.sg';
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);

    // Visual feedback — briefly show a tick
    copyIcon.textContent = '✅';
    setTimeout(() => copyIcon.textContent = '📋', 2000);
  } catch (e) {
    // Copy may fail in some sandboxed environments; fail silently
  }
});


// ── Topic tabs (Wholesale / Feedback / Partnership / Other) ──
// Each topic changes the message textarea placeholder text
const placeholders = {
  wholesale:   'Tell us your order volume, frequency, and delivery needs…',
  feedback:    'Share your experience with our product or service…',
  partnership: 'Describe your business and the opportunity you have in mind…',
  other:       'What can we help you with?',
};

let activeTopic = 'wholesale';

document.querySelectorAll('.topic-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    // Deactivate all tabs
    document.querySelectorAll('.topic-tab').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    // Activate selected tab
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    activeTopic = btn.dataset.topic;
    document.getElementById('c-message').placeholder = placeholders[activeTopic];
  });
});


// ── Character counter for the message textarea ────────────
const msgEl   = document.getElementById('c-message');
const countEl = document.getElementById('char-count');

msgEl.addEventListener('input', () => {
  const n = msgEl.value.length;
  countEl.textContent = n + '/500';
  // Turn amber when within 50 characters of the limit
  countEl.classList.toggle('warn', n > 450);
});


// ── Validation helper ─────────────────────────────────────
/** Shows an error below a specific field. */
function showErr(field, msg) {
  const errEl = document.getElementById('err-' + field);
  errEl.textContent = '⚠ ' + msg;
  errEl.style.display = 'flex';
  document.getElementById('c-' + field).classList.add('error');
}


// ── Contact form submit ───────────────────────────────────
const form = document.getElementById('contact-form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name    = document.getElementById('c-name').value.trim();
  const email   = document.getElementById('c-email').value.trim();
  const message = msgEl.value.trim();

  // Clear previous errors
  ['name', 'email', 'message'].forEach(k => {
    document.getElementById('err-' + k).style.display = 'none';
    document.getElementById('c-' + k).classList.remove('error');
  });

  // Validate
  let ok = true;
  if (!name)    { showErr('name',    'Required'); ok = false; }
  if (!email)   { showErr('email',   'Required'); ok = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showErr('email', 'Invalid email'); ok = false; }
  if (!message) { showErr('message', 'Required'); ok = false; }
  if (!ok) return;

  // Show spinner while "sending"
  document.getElementById('submit-label').style.display   = 'none';
  document.getElementById('submit-spinner').style.display = 'inline-block';
  document.getElementById('submit-btn').disabled          = true;

  // Simulate async network delay
  await new Promise(r => setTimeout(r, 700));

  // Save the feedback entry to localStorage (demo — no real backend)
  const feedbacks = JSON.parse(localStorage.getItem('espressgo_feedback') || '[]');
  feedbacks.push({
    name,
    email,
    message: `[${activeTopic}] ${message}`,
    date: new Date().toISOString(),
  });
  localStorage.setItem('espressgo_feedback', JSON.stringify(feedbacks));

  // Show success screen
  document.getElementById('form-state').style.display    = 'none';
  document.getElementById('success-email').textContent   = email;
  document.getElementById('success-state').style.display = 'flex';
});


// ── "Send another message" button ─────────────────────────
document.getElementById('send-another-btn').addEventListener('click', () => {
  // Reset form to initial state
  document.getElementById('success-state').style.display = 'none';
  document.getElementById('form-state').style.display    = 'block';
  form.reset();
  countEl.textContent = '0/500';

  // Reset topic tabs to "Wholesale"
  document.querySelectorAll('.topic-tab').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  document.querySelector('[data-topic="wholesale"]').classList.add('active');
  document.querySelector('[data-topic="wholesale"]').setAttribute('aria-selected', 'true');
  activeTopic = 'wholesale';

  // Reset submit button
  document.getElementById('submit-label').style.display   = 'inline';
  document.getElementById('submit-spinner').style.display = 'none';
  document.getElementById('submit-btn').disabled          = false;
});
