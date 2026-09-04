(() => {
  const EMAIL = 'contact@kasidate.me';

  const injectStyles = () => {
    if (document.getElementById('swimflow-bug-report-style')) return;
    const style = document.createElement('style');
    style.id = 'swimflow-bug-report-style';
    style.textContent = `
      .bug-report-backdrop{position:fixed;inset:0;z-index:100000;background:rgba(2,6,23,.56);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px}
      .bug-report-dialog{width:min(680px,100%);max-height:min(86vh,760px);overflow:auto;border:1px solid var(--ui-border,var(--border2,#334155));border-radius:18px;background:var(--ui-surface,var(--bg2,#0d1018));color:var(--ui-text,var(--tx,#c9d7ea));box-shadow:0 24px 80px rgba(0,0,0,.28)}
      .bug-report-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 20px 12px}.bug-report-head h2{font:700 20px/1.2 Inter,system-ui,sans-serif;margin:0}.bug-report-head p{margin:6px 0 0;color:var(--ui-text-muted,var(--dim));font-size:13px}
      .bug-report-close{width:38px;height:38px;border-radius:10px!important;padding:0!important;display:grid!important;place-items:center!important}
      .bug-report-body{padding:8px 20px 20px;display:grid;gap:14px}.bug-report-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.bug-report-field{display:grid;gap:6px}.bug-report-field.full{grid-column:1/-1}.bug-report-field label{font-size:12px;font-weight:600;color:var(--ui-text-strong,var(--br))}.bug-report-field input,.bug-report-field textarea,.bug-report-field select{width:100%;border:1px solid var(--ui-border,var(--border2));border-radius:10px;padding:10px 12px;background:var(--ui-surface-soft,var(--bg3));color:var(--ui-text,var(--tx));font:500 13px/1.45 Inter,system-ui,sans-serif}.bug-report-field textarea{min-height:92px;resize:vertical}.bug-report-diagnostics{border:1px solid var(--ui-border,var(--border));border-radius:12px;background:var(--ui-surface-soft,var(--bg3));overflow:hidden}.bug-report-diagnostics summary{cursor:pointer;padding:11px 13px;font-size:12px;font-weight:700;color:var(--ui-text-strong,var(--br))}.bug-report-diagnostics pre{margin:0;padding:0 13px 13px;white-space:pre-wrap;word-break:break-word;font:11px/1.55 'JetBrains Mono',monospace;color:var(--ui-text-muted,var(--dim))}.bug-report-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;padding-top:2px}.bug-report-actions button{min-height:40px;padding:0 14px!important}.bug-report-send{background:var(--ui-btn-primary,var(--ac))!important;color:#fff!important;border-color:var(--ui-btn-primary,var(--ac))!important}.bug-report-note{font-size:11px;color:var(--ui-text-muted,var(--dim));margin:0}.bug-report-icon{width:16px;height:16px}
      @media(max-width:640px){.bug-report-backdrop{align-items:flex-end;padding:0}.bug-report-dialog{max-height:92vh;border-radius:20px 20px 0 0}.bug-report-grid{grid-template-columns:1fr}.bug-report-field.full{grid-column:auto}.bug-report-head,.bug-report-body{padding-left:16px;padding-right:16px}}
    `;
    document.head.appendChild(style);
  };

  const getConnection = () => navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  const collectDiagnostics = () => {
    const c = getConnection();
    const uaData = navigator.userAgentData;
    let storage = 'unknown';
    try { localStorage.setItem('__sf_diag__','1'); localStorage.removeItem('__sf_diag__'); storage = 'available'; } catch { storage = 'blocked'; }
    return {
      timestamp: new Date().toISOString(),
      page: location.href,
      referrer: document.referrer || 'direct',
      uiTheme: document.documentElement.dataset.uiTheme || 'unknown',
      colorScheme: matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      screen: `${screen.width}x${screen.height}`,
      pixelRatio: window.devicePixelRatio || 1,
      orientation: screen.orientation?.type || 'unknown',
      language: navigator.language,
      languages: navigator.languages?.join(', ') || navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      online: navigator.onLine,
      touchPoints: navigator.maxTouchPoints || 0,
      platform: uaData?.platform || navigator.platform || 'unknown',
      mobile: uaData?.mobile ?? /Mobi|Android/i.test(navigator.userAgent),
      browserBrands: uaData?.brands?.map(x => `${x.brand} ${x.version}`).join(', ') || 'unavailable',
      userAgent: navigator.userAgent,
      cpuCores: navigator.hardwareConcurrency || 'unknown',
      deviceMemoryGB: navigator.deviceMemory || 'unknown',
      connectionType: c?.effectiveType || c?.type || 'unknown',
      downlinkMbps: c?.downlink || 'unknown',
      rttMs: c?.rtt || 'unknown',
      saveData: c?.saveData ?? 'unknown',
      localStorage: storage,
      cookiesEnabled: navigator.cookieEnabled
    };
  };

  const diagText = (d) => Object.entries(d).map(([k,v]) => `${k}: ${v}`).join('\n');

  const close = () => document.querySelector('.bug-report-backdrop')?.remove();

  const open = (event) => {
    event?.preventDefault?.();
    close();
    injectStyles();
    const d = collectDiagnostics();
    const wrap = document.createElement('div');
    wrap.className = 'bug-report-backdrop';
    wrap.innerHTML = `
      <section class="bug-report-dialog" role="dialog" aria-modal="true" aria-labelledby="bugReportTitle">
        <header class="bug-report-head">
          <div><h2 id="bugReportTitle">Report a bug</h2><p>Tell us what happened. Technical diagnostics are attached automatically.</p></div>
          <button class="bug-report-close" type="button" aria-label="Close report"><i data-lucide="x"></i></button>
        </header>
        <div class="bug-report-body">
          <div class="bug-report-grid">
            <div class="bug-report-field"><label for="bugArea">Area</label><select id="bugArea"><option>Editor</option><option>Preview / Diagram</option><option>Export</option><option>Templates</option><option>Theme / UI</option><option>Mobile</option><option>Other</option></select></div>
            <div class="bug-report-field"><label for="bugSeverity">Impact</label><select id="bugSeverity"><option>Minor</option><option selected>Normal</option><option>Major - blocks work</option><option>Critical - data loss / unusable</option></select></div>
            <div class="bug-report-field full"><label for="bugSummary">What happened?</label><textarea id="bugSummary" placeholder="Describe the problem and what you were trying to do..."></textarea></div>
            <div class="bug-report-field full"><label for="bugSteps">Steps to reproduce</label><textarea id="bugSteps" placeholder="1. Open...&#10;2. Tap...&#10;3. Expected... but instead..."></textarea></div>
          </div>
          <details class="bug-report-diagnostics" open><summary>Automatic diagnostics</summary><pre>${diagText(d).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</pre></details>
          <p class="bug-report-note">Includes device/browser, screen and viewport, theme, network hints, locale/timezone, storage capability, current page and timestamp. No passwords, diagram content, or local data are included.</p>
          <div class="bug-report-actions"><button type="button" class="bug-copy"><i data-lucide="copy"></i> Copy diagnostics</button><button type="button" class="bug-report-send"><i data-lucide="send"></i> Continue to email</button></div>
        </div>
      </section>`;
    document.body.appendChild(wrap);
    window.lucide?.createIcons?.({attrs:{'aria-hidden':'true'}});
    wrap.querySelector('.bug-report-close').addEventListener('click', close);
    wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }, { once: true });
    wrap.querySelector('.bug-copy').addEventListener('click', async e => {
      try { await navigator.clipboard.writeText(diagText(d)); e.currentTarget.textContent = 'Copied'; setTimeout(() => e.currentTarget.innerHTML = '<i data-lucide="copy"></i> Copy diagnostics', 1200); }
      catch { /* clipboard unavailable */ }
    });
    wrap.querySelector('.bug-report-send').addEventListener('click', () => {
      const area = wrap.querySelector('#bugArea').value;
      const impact = wrap.querySelector('#bugSeverity').value;
      const summary = wrap.querySelector('#bugSummary').value.trim() || '(not provided)';
      const steps = wrap.querySelector('#bugSteps').value.trim() || '(not provided)';
      const subject = `[SwimFlow Bug] ${area} - ${impact}`;
      const body = `Bug report\n\nArea: ${area}\nImpact: ${impact}\n\nWhat happened:\n${summary}\n\nSteps to reproduce:\n${steps}\n\n--- Automatic diagnostics ---\n${diagText(d)}\n`;
      location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
    wrap.querySelector('#bugSummary')?.focus();
  };

  const mount = () => {
    document.querySelectorAll('a').forEach(a => {
      if (/report\s*bugs?/i.test(a.textContent || '')) {
        a.removeAttribute('target');
        a.setAttribute('href', '#report-bug');
        a.setAttribute('role', 'button');
        a.addEventListener('click', open);
      }
    });
    window.SwimFlowBugReport = { open, collectDiagnostics };
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true}); else mount();
})();
