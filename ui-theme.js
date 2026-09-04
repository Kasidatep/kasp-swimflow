(() => {
  const STORAGE_KEY = 'swimflow-ui-theme';
  const root = document.documentElement;
  const systemTheme = () => window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  const saved = localStorage.getItem(STORAGE_KEY);
  let theme = saved === 'light' || saved === 'dark' ? saved : systemTheme();

  const injectContrastFixes = () => {
    if (document.getElementById('swimflow-contrast-fixes')) return;
    const style = document.createElement('style');
    style.id = 'swimflow-contrast-fixes';
    style.textContent = `
      .ui-theme-toggle svg,
      .btnPrimary svg,
      .btnSecondary svg,
      .btnGhost svg,
      .btnOutline svg,
      .btn svg,
      button svg {
        width: 1em;
        height: 1em;
        flex: 0 0 auto;
        stroke-width: 2.2;
      }

      :root[data-ui-theme="light"] .navLab {
        color: #384860 !important;
        background: linear-gradient(130deg, #edf5ff, #f3efff) !important;
        border-color: #afc8ee !important;
        box-shadow: 0 6px 18px rgba(38, 78, 145, 0.12) !important;
      }

      :root[data-ui-theme="light"] .navLab::before {
        background: #2876d7 !important;
        box-shadow: 0 0 0 3px rgba(40, 118, 215, 0.12) !important;
      }

      :root[data-ui-theme="light"] .heroBadge {
        color: #1f5fb7 !important;
        background: #edf5ff !important;
        border-color: #b8d0ef !important;
      }

      :root[data-ui-theme="light"] .heroBadge::before {
        background: #14805f !important;
      }

      :root[data-ui-theme="light"] .heroDesc,
      :root[data-ui-theme="light"] .lbl,
      :root[data-ui-theme="light"] .sectionSub,
      :root[data-ui-theme="light"] .sectionSubtitle,
      :root[data-ui-theme="light"] .featureDesc,
      :root[data-ui-theme="light"] .card p,
      :root[data-ui-theme="light"] footer,
      :root[data-ui-theme="light"] footer p {
        color: #4d6078 !important;
      }

      :root[data-ui-theme="light"] .num,
      :root[data-ui-theme="light"] .statValue,
      :root[data-ui-theme="light"] .metricValue {
        color: #111827 !important;
      }

      :root[data-ui-theme="light"] .gText {
        background: none !important;
        -webkit-text-fill-color: #5b2fb3 !important;
        color: #5b2fb3 !important;
      }

      :root[data-ui-theme="light"] .btnPrimary,
      :root[data-ui-theme="light"] a.btnPrimary {
        background: linear-gradient(135deg, #1f62c8, #377fd9) !important;
        color: #ffffff !important;
        border-color: #1f62c8 !important;
        text-shadow: none !important;
      }

      :root[data-ui-theme="light"] .btnSecondary,
      :root[data-ui-theme="light"] .btnGhost,
      :root[data-ui-theme="light"] .btnOutline {
        background: #ffffff !important;
        color: #24364c !important;
        border-color: #b9c8da !important;
      }

      :root[data-ui-theme="light"] .btnSecondary:hover,
      :root[data-ui-theme="light"] .btnGhost:hover,
      :root[data-ui-theme="light"] .btnOutline:hover {
        background: #eef4fb !important;
        color: #0f1f33 !important;
        border-color: #8fa9c7 !important;
      }

      :root[data-ui-theme="light"] .navLinks a {
        color: #52647b !important;
      }

      :root[data-ui-theme="light"] .navLinks a:hover {
        color: #0f172a !important;
      }
    `;
    document.head.appendChild(style);
  };

  const refreshIcons = () => {
    window.lucide?.createIcons?.({ attrs: { 'aria-hidden': 'true' } });
  };

  const loadIcons = () => {
    if (window.lucide) {
      refreshIcons();
      return;
    }
    if (document.querySelector('script[data-swimflow-icons]')) return;
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/lucide@latest/dist/umd/lucide.js';
    script.defer = true;
    script.dataset.swimflowIcons = 'true';
    script.addEventListener('load', refreshIcons, { once: true });
    document.head.appendChild(script);
  };

  const upgradeInterfaceIcons = () => {
    const primary = document.querySelector('.btnPrimary');
    if (primary && /Start Building Free/i.test(primary.textContent || '')) {
      primary.innerHTML = '<i data-lucide="play"></i><span>Start Building Free</span>';
    }
    refreshIcons();
  };

  const apply = (next, persist = false) => {
    theme = next;
    root.dataset.uiTheme = next;
    if (persist) localStorage.setItem(STORAGE_KEY, next);
    const btn = document.querySelector('.ui-theme-toggle');
    if (btn) {
      const isLight = next === 'light';
      btn.setAttribute('aria-label', `Switch to ${isLight ? 'dark' : 'light'} interface`);
      btn.setAttribute('title', `Switch to ${isLight ? 'dark' : 'light'} interface`);
      btn.innerHTML = `<i data-lucide="${isLight ? 'moon' : 'sun'}"></i><span class="ui-theme-toggle__label">${isLight ? 'Dark' : 'Light'}</span>`;
      refreshIcons();
    }
  };

  injectContrastFixes();
  apply(theme);

  const mount = () => {
    loadIcons();
    upgradeInterfaceIcons();
    if (!document.querySelector('.ui-theme-toggle')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ui-theme-toggle';
      btn.addEventListener('click', () => apply(theme === 'light' ? 'dark' : 'light', true));
      document.body.appendChild(btn);
    }
    apply(theme);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();

  window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', (event) => {
    if (!localStorage.getItem(STORAGE_KEY)) apply(event.matches ? 'light' : 'dark');
  });
})();
