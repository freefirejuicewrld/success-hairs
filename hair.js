// Combined client script for hair.html
// - Mobile nav toggle + scrollspy
// - Contact & newsletter handlers using Formspree with logging + mailto fallback
// - Updated Formspree endpoint and fallback email per your request
(() => {
  // Configuration (updated)
  const CONTACT_ENDPOINT = 'https://formspree.io/f/mzznkbra';
  const NEWSLETTER_ENDPOINT = CONTACT_ENDPOINT; // can be a separate form if desired
  const FALLBACK_EMAIL = 'successhairs2020@gmail.com';
  const SCROLL_OFFSET = 120;

  // ======== Utility helpers ========
  function q(selector, ctx = document) { return ctx.querySelector(selector); }
  function qa(selector, ctx = document) { return Array.from(ctx.querySelectorAll(selector)); }

  function setNotice(el, msg, isError = false) {
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? 'rgba(255,120,120,1)' : 'var(--muted)';
  }

  function encodeMailtoParams(params) {
    return Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  }

  async function postJson(url, data) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async function postFormData(url, formData) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Accept': 'application/json' }, // allow JSON response
      body: formData,
    });
  }

  async function submitToFormspree(endpoint, payload, useFormData = false) {
    try {
      if (useFormData) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
        console.log('[form] FormData POST ->', endpoint, payload);
        const res = await postFormData(endpoint, fd);
        const text = await res.text().catch(() => '');
        let body;
        try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
        console.log('[form] FormData response', res.status, body);
        return { ok: res.ok, status: res.status, body };
      } else {
        console.log('[form] JSON POST ->', endpoint, payload);
        const res = await postJson(endpoint, payload);
        const body = await res.json().catch(() => ({}));
        console.log('[form] JSON response', res.status, body);
        return { ok: res.ok, status: res.status, body };
      }
    } catch (err) {
      console.error('[form] Network/fetch error', err);
      return { ok: false, status: null, body: { error: err.message || String(err) } };
    }
  }

  // ======== NAV / MOBILE TOGGLE / SCROLLSPY ========
  const navToggle = q('#navToggle');
  const primaryNav = q('#primaryNav');
  const navLinks = qa('.primary-nav .nav-link');

  function closeNav() {
    if (!primaryNav) return;
    primaryNav.classList.remove('open');
    if (navToggle) {
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  }

  navToggle && navToggle.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    primaryNav && primaryNav.classList.toggle('open');
    navToggle.classList.toggle('open');
  });

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (primaryNav && primaryNav.classList.contains('open')) closeNav();
    });
  });

  document.addEventListener('click', (e) => {
    if (!primaryNav || !primaryNav.classList.contains('open')) return;
    const target = e.target;
    if (primaryNav.contains(target) || (navToggle && navToggle.contains(target))) return;
    closeNav();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && primaryNav && primaryNav.classList.contains('open')) {
      closeNav();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 920 && primaryNav && primaryNav.classList.contains('open')) {
      closeNav();
    }
  });

  // Scrollspy
  const sections = Array.from(document.querySelectorAll('main section[id]'));
  const navAnchors = qa('.primary-nav .nav-link');

  function onScrollSpy(){
    const scrollPos = window.scrollY;
    let currentId = sections[0] && sections[0].id;
    for (let sect of sections) {
      const top = sect.offsetTop - SCROLL_OFFSET;
      if (scrollPos >= top) currentId = sect.id;
    }
    navAnchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === ('#' + currentId)));
  }

  window.addEventListener('scroll', onScrollSpy, { passive: true });
  document.addEventListener('DOMContentLoaded', onScrollSpy);

  // ======== CONTACT FORM HANDLER ========
  const contactForm = q('#contactForm');
  const formNotice = q('#formNotice');

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const origBtnText = submitBtn ? submitBtn.textContent : '';
      const name = (contactForm.name && contactForm.name.value || '').trim();
      const email = (contactForm.email && contactForm.email.value || '').trim();
      const message = (contactForm.message && contactForm.message.value || '').trim();

      if (!name || !email || !message) {
        setNotice(formNotice, 'Please complete all fields before sending.', true);
        return;
      }

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending...'; }
      setNotice(formNotice, 'Sending message...');

      const payload = { name, email, message, _replyto: email, _subject: `Website contact from ${name}` };

      // Try JSON POST first
      const first = await submitToFormspree(CONTACT_ENDPOINT, payload, false);
      if (first.ok) {
        setNotice(formNotice, 'Message sent — we will get back to you shortly.');
        contactForm.reset();
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origBtnText; }
        return;
      }

      // If JSON failed, try FormData fallback
      console.warn('[contact] JSON POST failed. Status:', first.status, 'Body:', first.body);
      setNotice(formNotice, 'Primary submit failed — retrying with alternate method...', true);

      const second = await submitToFormspree(CONTACT_ENDPOINT, payload, true);
      if (second.ok) {
        setNotice(formNotice, 'Message sent (via fallback) — we will get back to you shortly.');
        contactForm.reset();
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origBtnText; }
        return;
      }

      // Both attempts failed -> open mail client as last resort
      console.error('[contact] Both Formspree attempts failed.', { first, second });
      setNotice(formNotice, 'Failed to send via Formspree — opening email client as fallback.', true);

      const mailtoSubject = `Website contact from ${name}`;
      const mailtoBody = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
      const mailto = `mailto:${FALLBACK_EMAIL}?${encodeMailtoParams({ subject: mailtoSubject, body: mailtoBody })}`;
      window.location.href = mailto;
      contactForm.reset();
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origBtnText; }
    });
  }

  // ======== NEWSLETTER HANDLER ========
  const newsletterForm = q('#newsletterForm');
  const newsletterNotice = q('#newsletterNotice');

  if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = q('#newsletterEmail');
      const submitBtn = newsletterForm.querySelector('button[type="submit"]');
      const origBtnText = submitBtn ? submitBtn.textContent : '';
      const email = (emailInput && emailInput.value || '').trim();

      if (!email) {
        setNotice(newsletterNotice, 'Enter a valid email address.', true);
        return;
      }

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Subscribing...'; }
      setNotice(newsletterNotice, 'Subscribing...');

      const payload = { email, _subject: 'Newsletter signup' };

      // Try JSON POST first
      const first = await submitToFormspree(NEWSLETTER_ENDPOINT, payload, false);
      if (first.ok) {
        setNotice(newsletterNotice, 'Subscribed — thanks! Expect occasional updates.');
        newsletterForm.reset();
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origBtnText; }
        return;
      }

      // Try FormData fallback
      console.warn('[newsletter] JSON POST failed. Status:', first.status, 'Body:', first.body);
      const second = await submitToFormspree(NEWSLETTER_ENDPOINT, payload, true);
      if (second.ok) {
        setNotice(newsletterNotice, 'Subscribed — thanks! Expect occasional updates.');
        newsletterForm.reset();
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origBtnText; }
        return;
      }

      console.error('[newsletter] Both attempts failed.', { first, second });
      setNotice(newsletterNotice, 'Subscription failed. Please try again later.', true);
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origBtnText; }
    });
  }

  // Safety: ensure scrollspy runs after images/layout settle
  window.addEventListener('load', onScrollSpy);
})();