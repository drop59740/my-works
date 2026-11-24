/* ============================================================
   SvyDev — SPA logic
   Hash router · view transitions · modals · demo forms
   ============================================================ */

(function () {
  'use strict';

  const ROUTES = {
    home: {
      view: 'view-home',
      title: 'Мои работы — интерактивное портфолио',
    },
    coffee: {
      view: 'view-coffee',
      title: 'Кофейня «Зерно» — specialty coffee',
    },
    tutor: {
      view: 'view-tutor',
      title: 'EnglishPro — английский с Анной Соколовой',
    },
    barber: {
      view: 'view-barber',
      title: 'Style — барбершоп на Большой Дмитровке',
    },
  };

  let currentRoute = 'home';
  let isTransitioning = false;
  let queuedRoute = null;
  let revealObserver = null;
  const submitTimers = new WeakMap();
  let modalTrigger = null;
  let bodyOverflow = '';

  const $ = (selector, scope) => (scope || document).querySelector(selector);
  const $$ = (selector, scope) => Array.from((scope || document).querySelectorAll(selector));

  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ==========================================================
     Routing
     ========================================================== */

  function routeFromHash() {
    const raw = (window.location.hash || '').replace(/^#\/?/, '').replace(/\/+$/, '').toLowerCase();
    return Object.prototype.hasOwnProperty.call(ROUTES, raw) && raw !== '' ? raw : 'home';
  }

  function setTitle(route) {
    document.title = ROUTES[route].title;
  }

  function navigate(route) {
    if (!ROUTES[route]) route = 'home';

    if (route === currentRoute) {
      if (route === 'home') {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      }
      return;
    }

    const targetHash = '#/' + route;
    if (window.location.hash === targetHash) {
      renderRoute(route);
      return;
    }
    window.location.hash = targetHash;
  }

  function renderRoute(route, initial) {
    if (!ROUTES[route]) route = 'home';

    if (route === currentRoute && !initial) {
      if (!isTransitioning) {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      }
      return;
    }

    if (isTransitioning) {
      queuedRoute = route;
      return;
    }

    const fromEl = document.getElementById(ROUTES[currentRoute].view);
    const toEl = document.getElementById(ROUTES[route].view);
    if (!toEl) return;

    if (initial) {
      $$('.view').forEach((view) => view.classList.add('hidden'));
      toEl.classList.remove('hidden');
      currentRoute = route;
      setTitle(route);
      window.scrollTo(0, 0);
      setupReveal(toEl);
      return;
    }

    isTransitioning = true;
    closeModals(true);

    if (fromEl) fromEl.classList.add('view-leaving');

    window.setTimeout(() => {
      if (fromEl) {
        fromEl.classList.add('hidden');
        fromEl.classList.remove('view-leaving');
      }

      toEl.classList.remove('hidden');
      toEl.classList.add('view-entering');
      window.scrollTo(0, 0);

      currentRoute = route;
      setTitle(route);
      setupReveal(toEl);

      window.setTimeout(() => {
        toEl.classList.remove('view-entering');
        isTransitioning = false;

        if (queuedRoute && queuedRoute !== currentRoute) {
          const next = queuedRoute;
          queuedRoute = null;
          renderRoute(next);
        } else {
          queuedRoute = null;
        }
      }, 760);
    }, 280);
  }

  /* ==========================================================
     Scroll reveal
     ========================================================== */

  function setupReveal(root) {
    if (!root) return;
    if (revealObserver) revealObserver.disconnect();

    const elements = $$('.reveal', root);
    elements.forEach((element) => element.classList.remove('is-visible'));

    if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.06, rootMargin: '0px 0px -6% 0px' }
    );

    elements.forEach((element) => revealObserver.observe(element));
  }

  /* ==========================================================
     Smooth in-page scrolling
     ========================================================== */

  function scrollToSection(id) {
    const target = document.getElementById(id);
    if (!target) return;

    const stickyBar = 42;
    const y = target.getBoundingClientRect().top + window.pageYOffset - stickyBar - 18;
    window.scrollTo({ top: Math.max(0, y), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  /* ==========================================================
     Modals
     ========================================================== */

  function openModal(id) {
    const modal = document.getElementById('modal-' + id);
    if (!modal) return;

    closeModals(true);
    modalTrigger = document.activeElement;

    bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => modal.classList.add('is-open'));
    });

    window.setTimeout(() => {
      const firstField = $('input:not([type="hidden"]), select, textarea', modal) || $('button', modal);
      if (firstField) firstField.focus({ preventScroll: true });
    }, 330);
  }

  function closeModals(instant) {
    const openModals = $$('.modal').filter((modal) => !modal.classList.contains('hidden'));
    if (!openModals.length) {
      document.body.style.overflow = bodyOverflow || '';
      return;
    }

    openModals.forEach((modal) => {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');

      const finish = () => {
        modal.classList.add('hidden');
        resetModal(modal);
      };

      if (instant || prefersReducedMotion()) finish();
      else window.setTimeout(finish, 250);
    });

    document.body.style.overflow = bodyOverflow || '';

    if (modalTrigger && document.contains(modalTrigger) && !instant) {
      const trigger = modalTrigger;
      window.setTimeout(() => {
        if (!document.querySelector('.modal.is-open')) {
          try { trigger.focus({ preventScroll: true }); } catch (error) { /* noop */ }
        }
      }, 280);
    }
    modalTrigger = null;
  }

  function resetModal(modal) {
    $$('form', modal).forEach((form) => {
      const timer = submitTimers.get(form);
      if (timer) {
        window.clearTimeout(timer);
        submitTimers.delete(form);
      }

      form.reset();
      form.classList.remove('hidden');

      const button = $('[type="submit"]', form);
      if (button) {
        button.disabled = false;
        if (button.dataset.originalLabel) button.innerHTML = button.dataset.originalLabel;
      }
    });

    $$('[data-success]', modal).forEach((success) => success.classList.add('hidden'));

    const summary = $('[data-booking-summary]', modal);
    if (summary) summary.textContent = '';
  }

  function resetFormWrap(button) {
    const wrap = button.closest('[data-form-wrap]');
    if (!wrap) return;

    $$('form', wrap).forEach((form) => {
      const timer = submitTimers.get(form);
      if (timer) {
        window.clearTimeout(timer);
        submitTimers.delete(form);
      }

      form.reset();
      form.classList.remove('hidden');

      const submit = $('[type="submit"]', form);
      if (submit) {
        submit.disabled = false;
        if (submit.dataset.originalLabel) submit.innerHTML = submit.dataset.originalLabel;
      }
    });

    $$('[data-success]', wrap).forEach((success) => success.classList.add('hidden'));

    const firstField = $('input, select, textarea', wrap);
    if (firstField) firstField.focus({ preventScroll: true });
  }

  /* ==========================================================
     Forms (visual demo submit)
     ========================================================== */

  function fillBookingSummary(form) {
    const service = $('[name="service"]', form)?.value || 'Стрижка';
    const dateValue = $('[name="date"]', form)?.value || '';
    const time = $('[name="time"]', form)?.value || '';
    const master = $('[name="master"]', form)?.value || '';

    let dateText = dateValue;
    if (dateValue) {
      const parsed = new Date(dateValue + 'T12:00:00');
      if (!Number.isNaN(parsed.getTime())) {
        dateText = parsed.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      }
    }

    const masterText = master && master !== 'Любой свободный' ? ' · мастер ' + master : '';
    const summary = $('#modal-book [data-booking-summary]');
    if (summary) {
      summary.textContent = [service, dateText, time].filter(Boolean).join(' · ') + masterText;
    }
  }

  $$('form[data-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const button = $('[type="submit"]', form);
      if (button) {
        if (!button.dataset.originalLabel) button.dataset.originalLabel = button.innerHTML;
        button.disabled = true;
        button.innerHTML = 'Отправляем…';
      }

      const timer = window.setTimeout(() => {
        submitTimers.delete(form);

        const wrap = form.closest('[data-form-wrap]');
        if (form.dataset.form === 'book') fillBookingSummary(form);

        if (button) {
          button.disabled = false;
          if (button.dataset.originalLabel) button.innerHTML = button.dataset.originalLabel;
        }

        form.reset();
        form.classList.add('hidden');
        const success = wrap ? $('[data-success]', wrap) : null;
        if (success) success.classList.remove('hidden');

        const successPanel = success ? $('.success-inner', success) : null;
        if (successPanel) {
          successPanel.classList.remove('success-inner');
          void successPanel.offsetWidth;
          successPanel.classList.add('success-inner');
        }
      }, 900);

      submitTimers.set(form, timer);
    });
  });

  /* ==========================================================
     Dates: no past bookings
     ========================================================== */

  (function setMinDates() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    const today = local.toISOString().slice(0, 10);
    $$('input[type="date"]').forEach((input) => {
      input.min = today;
    });
  })();

  /* ==========================================================
     Global click handling
     ========================================================== */

  document.addEventListener('click', (event) => {
    const routeTarget = event.target.closest('[data-route]');
    if (routeTarget && routeTarget.tagName !== 'A') {
      event.preventDefault();
      navigate(routeTarget.dataset.route);
      return;
    }

    const backButton = event.target.closest('[data-back]');
    if (backButton) {
      event.preventDefault();
      navigate('home');
      return;
    }

    const scrollTarget = event.target.closest('[data-scroll]');
    if (scrollTarget) {
      event.preventDefault();
      scrollToSection(scrollTarget.dataset.scroll);
      return;
    }

    const opener = event.target.closest('[data-open-modal]');
    if (opener) {
      event.preventDefault();
      const modalId = opener.dataset.openModal;
      const modal = document.getElementById('modal-' + modalId);

      if (opener.dataset.service && modal) {
        const select = $('[name="service"]', modal);
        if (select) select.value = opener.dataset.service;
      }

      openModal(modalId);
      return;
    }

    const closer = event.target.closest('[data-close-modal]');
    if (closer) {
      event.preventDefault();
      closeModals(false);
      return;
    }

    const resetButton = event.target.closest('[data-reset-form]');
    if (resetButton) {
      event.preventDefault();
      resetFormWrap(resetButton);
    }
  });

  /* Anchor-based route links (logo) */
  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[data-route]');
    if (anchor) {
      event.preventDefault();
      navigate(anchor.dataset.route);
    }
  });

  /* ==========================================================
     Keyboard
     ========================================================== */

  document.addEventListener('keydown', (event) => {
    const activeModal = $('.modal.is-open');

    if (event.key === 'Escape' && activeModal) {
      event.preventDefault();
      closeModals(false);
      return;
    }

    if (event.key === 'Tab' && activeModal) {
      const focusables = $$(
        'a[href], button:not([disabled]), input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])',
        activeModal
      ).filter((element) => element.offsetParent !== null);

      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  /* ==========================================================
     Router events + boot
     ========================================================== */

  window.addEventListener('hashchange', () => {
    renderRoute(routeFromHash());
  });

  renderRoute(routeFromHash(), true);
})();
