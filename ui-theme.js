(() => {
  const STORAGE_KEY = 'swimflow-ui-theme';
  const root = document.documentElement;
  const systemTheme = () => window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  const saved = localStorage.getItem(STORAGE_KEY);
  let theme = saved === 'light' || saved === 'dark' ? saved : systemTheme();

  const apply = (next, persist = false) => {
    theme = next;
    root.dataset.uiTheme = next;
    if (persist) localStorage.setItem(STORAGE_KEY, next);
    const btn = document.querySelector('.ui-theme-toggle');
    if (btn) {
      const isLight = next === 'light';
      btn.setAttribute('aria-label', `Switch to ${isLight ? 'dark' : 'light'} interface`);
      btn.setAttribute('title', `Switch to ${isLight ? 'dark' : 'light'} interface`);
      btn.innerHTML = `<span aria-hidden="true">${isLight ? '☾' : '☀'}</span><span class="ui-theme-toggle__label">${isLight ? 'Dark' : 'Light'}</span>`;
    }
  };

  apply(theme);

  const mount = () => {
    if (document.querySelector('.ui-theme-toggle')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ui-theme-toggle';
    btn.addEventListener('click', () => apply(theme === 'light' ? 'dark' : 'light', true));
    document.body.appendChild(btn);
    apply(theme);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();

  window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', (event) => {
    if (!localStorage.getItem(STORAGE_KEY)) apply(event.matches ? 'light' : 'dark');
  });
})();
