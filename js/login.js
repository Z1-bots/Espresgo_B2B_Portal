/* ============================================================
   login.js — ESPRESSGO B2B Login / Register / OTP / Password Reset

   Features:
   - Email/password sign in
   - Buyer registration
   - 8-digit Email OTP login
   - Optional Phone OTP login
   - Forgot password reset link
   - New password update after reset link
   - Redirect fix for Supabase auth links
   - Auto-repair missing public.profiles row after login

   Depends on:
   1. Supabase JS CDN
   2. supabase-config.js
   3. shared.js
   ============================================================ */


document.addEventListener('DOMContentLoaded', () => {
  initLoginPage();
});


function initLoginPage() {
  /* ==========================================================
     Page state
     ========================================================== */

  let isLogin = true;
  let otpMode = 'email';
  let sentOtpMode = null;
  let sentOtpDestination = null;
  let passwordRecoveryMode = false;

  // Your Supabase Email OTP setting is 6 digits.
  const EMAIL_OTP_LENGTH = 6;

  const $ = (id) => document.getElementById(id);


  /* ==========================================================
     Start page
     ========================================================== */

  injectOtpAndResetPanels();
  renderDecorativePouches();
  setupAuthRedirectListener();
  setupExistingSessionRedirect();
  setupLoginRegisterTabs();
  setupPasswordToggles();
  setupPasswordStrength();
  setupForgotPassword();
  setupOtpLogin();
  setupPasswordResetForm();
  setupMainAuthForm();

  switchMode(true);


  /* ==========================================================
     DOM helpers
     ========================================================== */

  function safeText(id, value) {
    const el = $(id);

    if (el) {
      el.textContent = value;
    }
  }


  function safeDisplay(id, value) {
    const el = $(id);

    if (el) {
      el.style.display = value;
    }
  }


  function safeDisabled(id, value) {
    const el = $(id);

    if (el) {
      el.disabled = value;
    }
  }


  function getLoginRedirectUrl() {
    return window.location.origin + window.location.pathname;
  }


  function getReadableError(error, fallback = 'Something went wrong. Please try again.') {
    if (!error) {
      return fallback;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      return error.message || fallback;
    }

    if (typeof error === 'object') {
      return (
        error.message ||
        error.error_description ||
        error.error ||
        error.details ||
        error.hint ||
        JSON.stringify(error, null, 2)
      );
    }

    return String(error);
  }


  function showServerError(error) {
    const errBox = $('server-err');
    const errText = $('server-err-text');

    let readableMessage = getReadableError(
      error,
      'Something went wrong. Check Console and Network tab for the Supabase error.'
    );

    if (!readableMessage || readableMessage === '{}') {
      readableMessage = 'Something went wrong. Check Console and Network tab for the Supabase error.';
    }

    resetServerBoxStyle();

    if (errText) {
      errText.textContent = readableMessage;
    }

    if (errBox) {
      errBox.style.display = 'flex';
    } else {
      alert(readableMessage);
    }

    console.error('Auth error shown to user:', error);
  }


  function showServerInfo(message) {
    const errBox = $('server-err');
    const errText = $('server-err-text');

    if (errText) {
      errText.textContent = message;
    }

    if (errBox) {
      errBox.style.display = 'flex';
      errBox.style.borderColor = '#86efac';
      errBox.style.background = '#f0fdf4';
      errBox.style.color = '#166534';
    }

    console.info('Auth info shown to user:', message);
  }


  function resetServerBoxStyle() {
    const errBox = $('server-err');

    if (errBox) {
      errBox.style.borderColor = '';
      errBox.style.background = '';
      errBox.style.color = '';
    }
  }


  function clearServerError() {
    const errBox = $('server-err');
    const errText = $('server-err-text');

    if (errText) {
      errText.textContent = '';
    }

    if (errBox) {
      errBox.style.display = 'none';
    }

    resetServerBoxStyle();
  }


  function showInlineStatus(id, message, type = 'info') {
    const el = $(id);

    if (!el) return;

    const color =
      type === 'error'
        ? '#ef4444'
        : type === 'success'
          ? '#16a34a'
          : 'var(--muted)';

    el.textContent = message;
    el.style.display = message ? 'block' : 'none';
    el.style.color = color;
  }


  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }


  function normalizePhoneNumber(rawPhone) {
    const cleaned = String(rawPhone || '')
      .trim()
      .replace(/\s+/g, '')
      .replace(/-/g, '');

    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // Singapore mobile number: 91234567 → +6591234567
    if (/^[89]\d{7}$/.test(cleaned)) {
      return '+65' + cleaned;
    }

    // Singapore mobile with country code but no plus: 6591234567
    if (/^65[89]\d{7}$/.test(cleaned)) {
      return '+' + cleaned;
    }

    return cleaned;
  }


  function isValidE164Phone(phone) {
    return /^\+[1-9]\d{7,14}$/.test(phone);
  }


  function getRedirectTarget() {
    const redirectTo = localStorage.getItem('redirectAfterLogin') || 'catalog.html';
    localStorage.removeItem('redirectAfterLogin');
    return redirectTo;
  }


  function redirectAfterSuccessfulLogin() {
    window.location.href = getRedirectTarget();
  }


  function setLoading(isLoading) {
    safeDisplay('auth-label', isLoading ? 'none' : 'inline');
    safeDisplay('auth-spinner', isLoading ? 'inline-block' : 'none');
    safeDisabled('auth-submit', isLoading);
  }


  function resetSubmitButton() {
    setLoading(false);
  }


  function showErr(field, msg) {
    const err = $('err-' + field);
    const input = $('f-' + field);

    if (err) {
      err.textContent = '⚠ ' + msg;
      err.style.display = 'flex';
    }

    if (input) {
      input.classList.add('error');
    }
  }


  function clearErrors() {
    const fields = [
      'contactName',
      'companyName',
      'businessType',
      'email',
      'password',
      'confirm'
    ];

    fields.forEach(field => {
      const err = $('err-' + field);
      const input = $('f-' + field);

      if (err) {
        err.style.display = 'none';
        err.textContent = '';
      }

      if (input) {
        input.classList.remove('error');
      }
    });
  }


  /* ==========================================================
     Profile repair helper
     This fixes:
     "Login succeeded, but your buyer profile was not found."
     ========================================================== */

  async function ensureProfileForCurrentUser(fallbackProfile = {}) {
    if (typeof sb === 'undefined') {
      throw new Error('Supabase client is missing. Check supabase-config.js.');
    }

    const { data: userData, error: userError } = await sb.auth.getUser();

    if (userError || !userData.user) {
      throw userError || new Error('No logged-in Supabase user found.');
    }

    const authUser = userData.user;
    const meta = authUser.user_metadata || {};

    const { data: existingProfile, error: selectError } = await sb
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (selectError) {
      throw selectError;
    }

    if (existingProfile) {
      return existingProfile;
    }

    const newProfile = {
      id: authUser.id,
      email: authUser.email || fallbackProfile.email || '',
      contact_name:
        meta.contact_name ||
        fallbackProfile.contactName ||
        fallbackProfile.contact_name ||
        'New Buyer',
      company_name:
        meta.company_name ||
        fallbackProfile.companyName ||
        fallbackProfile.company_name ||
        'New Company',
      business_type:
        meta.business_type ||
        fallbackProfile.businessType ||
        fallbackProfile.business_type ||
        'Other',
      delivery_address:
        meta.delivery_address ||
        fallbackProfile.deliveryAddress ||
        fallbackProfile.delivery_address ||
        '',
      role: 'buyer'
    };

    const { data: insertedProfile, error: insertError } = await sb
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return insertedProfile;
  }


  /* ==========================================================
     Inject OTP login and password reset panels
     ========================================================== */

  function injectOtpAndResetPanels() {
    const authForm = $('auth-form');

    if (!authForm) {
      console.warn('auth-form not found. OTP and reset panels were not injected.');
      return;
    }

    if (!$('otp-login-panel')) {
      authForm.insertAdjacentHTML('afterend', `
        <div
          id="otp-login-panel"
          class="card"
          style="margin-top:1rem;padding:1rem;border-radius:18px;">

          <div style="display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-bottom:.75rem;">
            <div>
              <div style="font-size:13px;color:var(--brown);font-weight:600;">
                2FA / OTP Login
              </div>

              <div style="font-size:11px;color:var(--muted);">
                Sign in using a one-time code sent to your email or phone.
              </div>
            </div>

            <span
              style="font-size:10px;background:#FEF3E2;color:var(--amber);border:1px solid #F3D6AA;border-radius:999px;padding:.2rem .55rem;white-space:nowrap;">
              Secure Code
            </span>
          </div>

          <div
            style="display:flex;background:#EDE8E3;border-radius:14px;padding:4px;gap:4px;margin-bottom:.75rem;">

            <button
              id="otp-email-tab"
              type="button"
              class="tab-btn active"
              style="flex:1;">
              Email OTP
            </button>

            <button
              id="otp-phone-tab"
              type="button"
              class="tab-btn"
              style="flex:1;">
              Phone OTP
            </button>
          </div>

          <div class="field">
            <label id="otp-destination-label" for="otp-destination">
              Email Address
            </label>

            <input
              class="input"
              id="otp-destination"
              type="email"
              placeholder="buyer@example.com"
              autocomplete="email"/>
          </div>

          <button
            id="otp-send-btn"
            class="btn-amber btn-full"
            type="button">
            Send OTP Code
          </button>

          <div
            id="otp-verify-wrap"
            style="display:none;margin-top:1rem;">

            <div class="field">
              <label id="otp-code-label" for="otp-code">
                6-digit OTP Code
              </label>

              <input
                class="input"
                id="otp-code"
                inputmode="numeric"
                maxlength="6"
                placeholder="123456"
                autocomplete="one-time-code"/>
            </div>

            <button
              id="otp-verify-btn"
              class="btn-dark btn-full"
              type="button">
              Verify & Sign In
            </button>
          </div>

          <p
            id="otp-status"
            style="display:none;font-size:11px;margin-top:.65rem;">
          </p>
        </div>
      `);
    }

    if (!$('password-reset-panel')) {
      authForm.insertAdjacentHTML('afterend', `
        <div
          id="password-reset-panel"
          class="card"
          style="display:none;margin-top:1rem;padding:1rem;border-radius:18px;">

          <div style="margin-bottom:1rem;">
            <div style="font-size:15px;color:var(--brown);font-weight:600;">
              Set New Password
            </div>

            <div style="font-size:12px;color:var(--muted);">
              Enter a new password for your ESPRESSGO buyer account.
            </div>
          </div>

          <div class="field">
            <label for="new-password">
              New Password
            </label>

            <input
              class="input"
              id="new-password"
              type="password"
              placeholder="Min 8 characters"
              autocomplete="new-password"/>
          </div>

          <div class="field">
            <label for="new-password-confirm">
              Confirm New Password
            </label>

            <input
              class="input"
              id="new-password-confirm"
              type="password"
              placeholder="Repeat password"
              autocomplete="new-password"/>
          </div>

          <button
            id="save-new-password-btn"
            class="btn-dark btn-full"
            type="button">
            Update Password
          </button>

          <p
            id="reset-status"
            style="display:none;font-size:11px;margin-top:.65rem;">
          </p>
        </div>
      `);
    }
  }


  /* ==========================================================
     Supabase auth redirect listener
     Handles:
     - Email confirmation link
     - Magic link callback
     - Password recovery callback
     ========================================================== */

  function setupAuthRedirectListener() {
    if (typeof sb === 'undefined') {
      console.error('Supabase client is missing. Check supabase-config.js.');
      return;
    }

    sb.auth.onAuthStateChange(async (event) => {
      console.log('Supabase auth event:', event);

      if (event === 'PASSWORD_RECOVERY') {
        passwordRecoveryMode = true;

        history.replaceState(
          null,
          '',
          window.location.origin + window.location.pathname
        );

        showPasswordResetPanel();
        return;
      }

      if (event === 'SIGNED_IN') {
        if (passwordRecoveryMode) return;

        try {
          await ensureProfileForCurrentUser();
          const profile = await Auth.refreshUser();

          if (profile) {
            history.replaceState(
              null,
              '',
              window.location.origin + window.location.pathname
            );

            redirectAfterSuccessfulLogin();
          }
        } catch (error) {
          console.error('Auth callback profile repair failed:', error);
          showServerError(error);
        }
      }
    });

    const hash = window.location.hash || '';

    if (
      hash.includes('access_token') &&
      !hash.includes('type=recovery')
    ) {
      showServerInfo('Signing you in. Please wait…');
    }

    if (hash.includes('error=')) {
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const description =
        params.get('error_description') ||
        params.get('error') ||
        'Authentication link failed. Please request a new email.';

      showServerError(decodeURIComponent(description.replace(/\+/g, ' ')));

      history.replaceState(
        null,
        '',
        window.location.origin + window.location.pathname
      );
    }
  }


  /* ==========================================================
     Existing session redirect
     ========================================================== */

  function setupExistingSessionRedirect() {
    const currentHash = window.location.hash || '';

    if (
      currentHash.includes('type=recovery') ||
      currentHash.includes('access_token') ||
      currentHash.includes('error=')
    ) {
      return;
    }

    setTimeout(async () => {
      if (passwordRecoveryMode) return;

      try {
        const profile = await Auth.refreshUser();

        if (profile && !passwordRecoveryMode) {
          window.location.href = 'catalog.html';
        }
      } catch (error) {
        console.warn('No active session found:', error);
      }
    }, 250);
  }


  function showPasswordResetPanel() {
    safeDisplay('auth-form', 'none');
    safeDisplay('otp-login-panel', 'none');
    safeDisplay('password-reset-panel', 'block');

    const resetInput = $('new-password');

    if (resetInput) {
      setTimeout(() => resetInput.focus(), 200);
    }
  }


  /* ==========================================================
     Decorative pouch trio
     ========================================================== */

  function renderDecorativePouches() {
    const trio = $('pouch-trio');

    if (!trio || trio.dataset.rendered === 'true') return;

    trio.dataset.rendered = 'true';

    const pouchConfigs = [
      { rotate: -8, ty: 8, opacity: 0.45 },
      { rotate: 0, ty: 0, opacity: 0.85 },
      { rotate: 7, ty: 8, opacity: 0.45 }
    ];

    pouchConfigs.forEach((p, i) => {
      const wrapper = document.createElement('div');

      wrapper.style.cssText = `
        transform: rotate(${p.rotate}deg) translateY(${p.ty}px);
        opacity: ${p.opacity};
      `;

      wrapper.innerHTML = `
        <svg
          width="${i === 1 ? 80 : 62}"
          height="${i === 1 ? 120 : 93}"
          viewBox="0 0 36 54"
          xmlns="http://www.w3.org/2000/svg">

          <rect x="14" y="0" width="8" height="6" rx="2" fill="#8B3A00"/>
          <path d="M10 6 Q8 9 8 12 L28 12 Q28 9 26 6 Z" fill="#C8580A"/>
          <rect x="4" y="12" width="28" height="36" rx="6" fill="#C8580A"/>
          <rect x="4" y="44" width="28" height="4" rx="3" fill="#8B3A00"/>
          <rect x="7" y="16" width="22" height="26" rx="4" fill="#8B3A00" opacity="0.15"/>

          <text
            x="18"
            y="27"
            text-anchor="middle"
            font-size="4"
            font-weight="700"
            font-family="sans-serif"
            fill="#8B3A00"
            letter-spacing="0.3">
            ESPRESSGO
          </text>
        </svg>
      `;

      trio.appendChild(wrapper);
    });
  }


  /* ==========================================================
     Login/Register switch
     ========================================================== */

  function switchMode(toLogin) {
    isLogin = toLogin;

    clearServerError();

    safeDisplay('register-fields', toLogin ? 'none' : 'block');
    safeDisplay('confirm-field', toLogin ? 'none' : 'block');
    safeDisplay('strength-wrap', toLogin ? 'none' : 'block');
    safeDisplay('forgot-btn', toLogin ? 'inline' : 'none');

    safeText('form-title', toLogin ? 'Welcome back' : 'Create account');
    safeText('form-subtitle', toLogin ? 'Sign in to your wholesale account.' : 'Join the ESPRESSGO buyer network.');
    safeText('auth-label', toLogin ? 'Sign In' : 'Create Account');

    const pw = $('f-password');

    if (pw) {
      pw.autocomplete = toLogin ? 'current-password' : 'new-password';
      pw.placeholder = toLogin ? '••••••••' : 'Min 8 characters';
    }

    clearErrors();
    resetSubmitButton();
  }


  function setupLoginRegisterTabs() {
    const signInTab = $('tab-signin');
    const registerTab = $('tab-register');

    if (signInTab) {
      signInTab.addEventListener('click', () => {
        signInTab.classList.add('active');
        signInTab.setAttribute('aria-selected', 'true');

        if (registerTab) {
          registerTab.classList.remove('active');
          registerTab.setAttribute('aria-selected', 'false');
        }

        switchMode(true);
      });
    }

    if (registerTab) {
      registerTab.addEventListener('click', () => {
        registerTab.classList.add('active');
        registerTab.setAttribute('aria-selected', 'true');

        if (signInTab) {
          signInTab.classList.remove('active');
          signInTab.setAttribute('aria-selected', 'false');
        }

        switchMode(false);
      });
    }
  }


  /* ==========================================================
     Password show/hide
     ========================================================== */

  function setupPasswordToggles() {
    makeToggle('pw-toggle-1', 'f-password');
    makeToggle('pw-toggle-2', 'f-confirm');
  }


  function makeToggle(toggleId, inputId) {
    const toggle = $(toggleId);
    const input = $(inputId);

    if (!toggle || !input) return;

    toggle.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';

      toggle.setAttribute(
        'aria-label',
        input.type === 'password' ? 'Show password' : 'Hide password'
      );
    });
  }


  /* ==========================================================
     Password strength
     ========================================================== */

  function setupPasswordStrength() {
    const passwordInput = $('f-password');

    if (!passwordInput) return;

    passwordInput.addEventListener('input', () => {
      if (isLogin) return;

      const pw = passwordInput.value;
      const len = pw.length;

      let score = 0;

      if (len >= 12) {
        score = 4;
      } else if (len >= 10) {
        score = 3;
      } else if (len >= 8) {
        score = 2;
      } else if (len > 0) {
        score = 1;
      }

      const colors = ['', '#f87171', '#fbbf24', '#facc15', '#4ade80'];
      const labels = ['', 'Too short', 'Fair', 'Good', 'Strong'];

      for (let i = 1; i <= 4; i++) {
        const seg = $('s' + i);

        if (seg) {
          seg.style.background = i <= score ? colors[score] : '#E0D5C8';
        }
      }

      safeText('strength-label', labels[score] || '');

      const strengthBar = document.querySelector('.strength-bar');

      if (strengthBar) {
        strengthBar.setAttribute('aria-valuenow', String(score));
      }
    });
  }


  /* ==========================================================
     Forgot password
     ========================================================== */

  function setupForgotPassword() {
    const forgotBtn = $('forgot-btn');

    if (!forgotBtn) return;

    forgotBtn.addEventListener('click', async () => {
      const emailInput = $('f-email');
      const email = emailInput ? emailInput.value.trim() : '';

      clearServerError();

      if (!email) {
        showServerError('Enter your email address first, then click Forgot password.');
        return;
      }

      if (!isValidEmail(email)) {
        showServerError('Enter a valid email address before requesting a password reset.');
        return;
      }

      forgotBtn.disabled = true;
      forgotBtn.textContent = 'Sending…';

      try {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: getLoginRedirectUrl()
        });

        if (error) {
          showServerError(error);
          return;
        }

        showToast(
          'Password reset email sent',
          'Check your inbox for the reset link.'
        );
      } catch (error) {
        console.error('Password reset failed:', error);
        showServerError(error);
      } finally {
        forgotBtn.disabled = false;
        forgotBtn.textContent = 'Forgot password?';
      }
    });
  }


  /* ==========================================================
     New password form after recovery link
     ========================================================== */

  function setupPasswordResetForm() {
    const saveBtn = $('save-new-password-btn');

    if (!saveBtn) return;

    saveBtn.addEventListener('click', async () => {
      const password = $('new-password')?.value || '';
      const confirm = $('new-password-confirm')?.value || '';

      showInlineStatus('reset-status', '', 'info');

      if (password.length < 8) {
        showInlineStatus('reset-status', 'Password must be at least 8 characters.', 'error');
        return;
      }

      if (password !== confirm) {
        showInlineStatus('reset-status', 'Passwords do not match.', 'error');
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Updating…';

      try {
        const { error } = await sb.auth.updateUser({
          password
        });

        if (error) {
          showInlineStatus('reset-status', getReadableError(error), 'error');
          return;
        }

        await ensureProfileForCurrentUser();
        await Auth.refreshUser();

        showInlineStatus('reset-status', 'Password updated successfully. Redirecting…', 'success');

        showToast(
          'Password updated',
          'You can now use your new password.'
        );

        setTimeout(() => {
          window.location.href = 'catalog.html';
        }, 1000);
      } catch (error) {
        console.error('Update password failed:', error);
        showInlineStatus('reset-status', getReadableError(error), 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Update Password';
      }
    });
  }


  /* ==========================================================
     OTP login
     ========================================================== */

  function setupOtpLogin() {
    const emailTab = $('otp-email-tab');
    const phoneTab = $('otp-phone-tab');
    const sendBtn = $('otp-send-btn');
    const verifyBtn = $('otp-verify-btn');
    const destinationInput = $('otp-destination');

    if (!sendBtn || !verifyBtn || !destinationInput) return;

    if (emailTab) {
      emailTab.addEventListener('click', () => {
        setOtpMode('email');
      });
    }

    if (phoneTab) {
      phoneTab.addEventListener('click', () => {
        setOtpMode('phone');
      });
    }

    sendBtn.addEventListener('click', sendOtpCode);
    verifyBtn.addEventListener('click', verifyOtpCode);

    destinationInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendOtpCode();
      }
    });

    const otpCode = $('otp-code');

    if (otpCode) {
      otpCode.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          verifyOtpCode();
        }
      });
    }

    setOtpMode('email');
  }


  function setOtpMode(mode) {
    otpMode = mode;

    const emailTab = $('otp-email-tab');
    const phoneTab = $('otp-phone-tab');
    const input = $('otp-destination');
    const codeInput = $('otp-code');

    if (emailTab) {
      emailTab.classList.toggle('active', mode === 'email');
      emailTab.setAttribute('aria-selected', mode === 'email' ? 'true' : 'false');
    }

    if (phoneTab) {
      phoneTab.classList.toggle('active', mode === 'phone');
      phoneTab.setAttribute('aria-selected', mode === 'phone' ? 'true' : 'false');
    }

    safeText('otp-destination-label', mode === 'email' ? 'Email Address' : 'Phone Number');

    if (input) {
      input.value = '';
      input.type = mode === 'email' ? 'email' : 'tel';
      input.placeholder = mode === 'email' ? 'buyer@example.com' : '+6591234567';
      input.autocomplete = mode === 'email' ? 'email' : 'tel';
    }

    if (codeInput) {
      codeInput.value = '';
      codeInput.maxLength = mode === 'email' ? EMAIL_OTP_LENGTH : 8;
      codeInput.placeholder = mode === 'email' ? '12345678' : '123456';
    }

    safeText(
      'otp-code-label',
      mode === 'email'
        ? '8-digit OTP Code'
        : 'SMS OTP Code'
    );

    safeDisplay('otp-verify-wrap', 'none');
    showInlineStatus('otp-status', '', 'info');

    sentOtpMode = null;
    sentOtpDestination = null;
  }


  async function sendOtpCode() {
    const input = $('otp-destination');
    const sendBtn = $('otp-send-btn');

    if (!input || !sendBtn) return;

    let destination = input.value.trim();

    showInlineStatus('otp-status', '', 'info');

    if (otpMode === 'email') {
      if (!destination || !isValidEmail(destination)) {
        showInlineStatus('otp-status', 'Enter a valid email address.', 'error');
        return;
      }
    }

    if (otpMode === 'phone') {
      destination = normalizePhoneNumber(destination);

      if (!isValidE164Phone(destination)) {
        showInlineStatus(
          'otp-status',
          'Enter phone number in international format, e.g. +6591234567.',
          'error'
        );
        return;
      }

      input.value = destination;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending…';

    try {
      const payload =
        otpMode === 'email'
          ? {
              email: destination,
              options: {
                shouldCreateUser: false,
                emailRedirectTo: getLoginRedirectUrl()
              }
            }
          : {
              phone: destination,
              options: {
                shouldCreateUser: false
              }
            };

      const { error } = await sb.auth.signInWithOtp(payload);

      if (error) {
        showInlineStatus('otp-status', getReadableError(error), 'error');
        return;
      }

      sentOtpMode = otpMode;
      sentOtpDestination = destination;

      safeDisplay('otp-verify-wrap', 'block');

      showInlineStatus(
        'otp-status',
        otpMode === 'email'
          ? 'OTP sent. Check your email inbox for the 8-digit code.'
          : 'OTP sent. Check your SMS messages.',
        'success'
      );

      const codeInput = $('otp-code');

      if (codeInput) {
        codeInput.value = '';
        codeInput.focus();
      }
    } catch (error) {
      console.error('Send OTP failed:', error);
      showInlineStatus('otp-status', getReadableError(error), 'error');
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send OTP Code';
    }
  }


  async function verifyOtpCode() {
    const codeInput = $('otp-code');
    const verifyBtn = $('otp-verify-btn');

    if (!codeInput || !verifyBtn) return;

    const token = codeInput.value.trim();

    showInlineStatus('otp-status', '', 'info');

    if (!sentOtpMode || !sentOtpDestination) {
      showInlineStatus('otp-status', 'Please send an OTP code first.', 'error');
      return;
    }

    if (sentOtpMode === 'email') {
      const emailOtpPattern = new RegExp(`^\\d{${EMAIL_OTP_LENGTH}}$`);

      if (!emailOtpPattern.test(token)) {
        showInlineStatus(
          'otp-status',
          `Enter the ${EMAIL_OTP_LENGTH}-digit email OTP code.`,
          'error'
        );
        return;
      }
    }

    if (sentOtpMode === 'phone') {
      if (!/^\d{6,8}$/.test(token)) {
        showInlineStatus('otp-status', 'Enter the SMS OTP code.', 'error');
        return;
      }
    }

    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying…';

    try {
      const payload =
        sentOtpMode === 'email'
          ? {
              email: sentOtpDestination,
              token,
              type: 'email'
            }
          : {
              phone: sentOtpDestination,
              token,
              type: 'sms'
            };

      const { error } = await sb.auth.verifyOtp(payload);

      if (error) {
        showInlineStatus('otp-status', getReadableError(error), 'error');
        return;
      }

      await ensureProfileForCurrentUser();
      const profile = await Auth.refreshUser();

      if (!profile) {
        showInlineStatus(
          'otp-status',
          'OTP verified, but no buyer profile was found.',
          'error'
        );

        return;
      }

      showInlineStatus('otp-status', 'OTP verified. Signing you in…', 'success');

      setTimeout(() => {
        redirectAfterSuccessfulLogin();
      }, 500);
    } catch (error) {
      console.error('Verify OTP failed:', error);
      showInlineStatus('otp-status', getReadableError(error), 'error');
    } finally {
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verify & Sign In';
    }
  }


  /* ==========================================================
     Main email/password login and register form
     ========================================================== */

  function setupMainAuthForm() {
    const authForm = $('auth-form');

    if (!authForm) return;

    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      clearErrors();
      clearServerError();

      const email = $('f-email')?.value.trim() || '';
      const password = $('f-password')?.value || '';
      const confirm = $('f-confirm')?.value || '';

      const contactName = $('f-contactName')?.value.trim() || '';
      const companyName = $('f-companyName')?.value.trim() || '';
      const businessType = $('f-businessType')?.value || '';

      let valid = true;

      if (!isLogin) {
        if (!contactName) {
          showErr('contactName', 'Contact name is required.');
          valid = false;
        }

        if (!companyName || companyName.length < 2) {
          showErr('companyName', 'Enter your company name. Minimum 2 characters.');
          valid = false;
        }

        if (!businessType) {
          showErr('businessType', 'Please select your business type.');
          valid = false;
        }
      }

      if (!email) {
        showErr('email', 'Email address is required.');
        valid = false;
      } else if (!isValidEmail(email)) {
        showErr('email', 'Enter a valid email address.');
        valid = false;
      }

      if (!password) {
        showErr('password', 'Password is required.');
        valid = false;
      } else if (!isLogin && password.length < 8) {
        showErr('password', 'Password must be at least 8 characters.');
        valid = false;
      }

      if (!isLogin && password && confirm !== password) {
        showErr('confirm', 'Passwords do not match.');
        valid = false;
      }

      if (!valid) return;

      setLoading(true);

      try {
        if (isLogin) {
          const { error } = await sb.auth.signInWithPassword({
            email,
            password
          });

          if (error) {
            showServerError(error);
            resetSubmitButton();
            return;
          }

          await ensureProfileForCurrentUser({
            email
          });

          const profile = await Auth.refreshUser();

          if (!profile) {
            showServerError('Login succeeded, but your buyer profile could not be loaded.');
            resetSubmitButton();
            return;
          }

          redirectAfterSuccessfulLogin();
          return;
        }

        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getLoginRedirectUrl(),
            data: {
              contact_name: contactName,
              company_name: companyName,
              business_type: businessType,
              delivery_address: ''
            }
          }
        });

        if (error) {
          showServerError(error);
          resetSubmitButton();
          return;
        }

        if (data.session) {
          await ensureProfileForCurrentUser({
            email,
            contactName,
            companyName,
            businessType
          });

          const profile = await Auth.refreshUser();

          if (profile) {
            redirectAfterSuccessfulLogin();
            return;
          }
        }

        showServerInfo('Account created. Please check your email and confirm your account before signing in.');

        showToast(
          'Account created',
          'Please check your email and confirm your account before signing in.'
        );

        const signInTab = $('tab-signin');
        const registerTab = $('tab-register');

        if (signInTab && registerTab) {
          setTimeout(() => {
            signInTab.classList.add('active');
            signInTab.setAttribute('aria-selected', 'true');

            registerTab.classList.remove('active');
            registerTab.setAttribute('aria-selected', 'false');

            switchMode(true);

            const emailInput = $('f-email');

            if (emailInput) {
              emailInput.value = email;
            }
          }, 1200);
        }

        resetSubmitButton();
      } catch (error) {
        console.error('Auth form error:', error);
        showServerError(error);
        resetSubmitButton();
      }
    });
  }
}