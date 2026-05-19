/* ============================================================
   admin-login.js — Logic for admin/admin-login.html
   Depends on: ../shared.js (Auth — for shared CSS tokens only)
   ============================================================ */

// ── Redirect if already logged in as admin ────────────────
if (localStorage.getItem('espressgo_admin') === 'true') {
  window.location.href = 'admin-dashboard.html';
}


// ── Password show/hide toggle ─────────────────────────────
function togglePw() {
  const inp = document.getElementById('a-pw');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}


// ── Field error helper ────────────────────────────────────
/** Shows an error message below a named field. */
function showE(field, msg) {
  const el = document.getElementById('err-' + field);
  el.textContent = '⚠ ' + msg;
  el.style.display = 'flex';
  document.getElementById('a-' + field)?.classList.add('error');
}


// ── Admin login form submit ───────────────────────────────
document.getElementById('admin-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('a-email').value.trim();
  const pw    = document.getElementById('a-pw').value;

  document.getElementById('server-err').style.display = 'none';

  // Basic validation
  let ok = true;
  if (!email) { showE('email', 'Required'); ok = false; }
  if (!pw)    { showE('pw',    'Required'); ok = false; }
  if (!ok) return;

  // Show loading spinner
  document.getElementById('admin-label').style.display   = 'none';
  document.getElementById('admin-spinner').style.display = 'inline-block';
  document.getElementById('admin-submit').disabled       = true;

  // Simulate async (network delay)
  await new Promise(r => setTimeout(r, 500));

  // Hardcoded demo credentials — replace with a real backend check
  if (email === 'admin@espressgo.sg' && pw === 'admin123') {
    localStorage.setItem('espressgo_admin', 'true');
    window.location.href = 'admin-dashboard.html';
  } else {
    document.getElementById('server-err').textContent    = '⚠️ Invalid admin credentials.';
    document.getElementById('server-err').style.display  = 'flex';
    document.getElementById('admin-label').style.display = 'inline';
    document.getElementById('admin-spinner').style.display = 'none';
    document.getElementById('admin-submit').disabled     = false;
  }
});
