(() => {
  'use strict';
  if (!location.pathname.startsWith('/app')) return;

  const TYPE_KEY = 'swimflow_diagram_type_v1';
  const SEQ_KEY = 'swimflow_sequence_code_v1';
  const SWIM_KEY = 'swimflow_code_v7';
  const DEFAULT_SEQUENCE = `diagram "Checkout request"
type sequence
theme dark
config {
  laneWidth 150
  rowHeight 36
  radius 8
  fontSize 11
  actorMargin 72
  noteMargin 12
  mirrorActors true
  showSequenceNumbers true
  wrap true
}

participant App as Mobile App
participant API as API Gateway
participant Service as Order Service
participant DB as Database

App ->> API: POST /orders
activate API
API ->> Service: createOrder(payload)
activate Service
Service ->> DB: INSERT order
DB -->> Service: orderId
Service -->> API: 201 Created
API -->> App: { orderId }
deactivate Service
deactivate API

alt payment required
  App ->> API: POST /payments
  API -->> App: payment accepted
else payment skipped
  Note over App,API: Continue without payment
end`;

  const waitForApp = (attempt = 0) => {
    const ce = document.getElementById('ce');
    const ca = document.getElementById('ca');
    const cv = document.getElementById('cv');
    const topMain = document.getElementById('topMain');
    if (!ce || !ca || !cv || !topMain) {
      if (attempt < 60) setTimeout(() => waitForApp(attempt + 1), 50);
      return;
    }
    init({ ce, ca, cv, topMain });
  };

  const init = ({ ce, ca, cv, topMain }) => {
    if (document.getElementById('diagramTypeSelect')) return;
    injectStyles();

    const overlay = document.createElement('div');
    overlay.id = 'sequenceCanvas';
    overlay.innerHTML = '<div class="seqEmpty">Sequence preview</div>';
    ca.appendChild(overlay);

    const error = document.createElement('div');
    error.id = 'sequenceError';
    ca.appendChild(error);

    const select = document.createElement('select');
    select.id = 'diagramTypeSelect';
    select.className = 'modeSel diagramTypeSelect';
    select.setAttribute('aria-label', 'Diagram type');
    select.innerHTML = '<option value="swimlane">Swimlane</option><option value="sequence">Sequence</option>';
    const logo = topMain.querySelector('.logo');
    if (logo?.nextSibling) topMain.insertBefore(select, logo.nextSibling);
    else topMain.prepend(select);

    const suggestionBar = createSuggestions(ce);
    const snippBar = document.getElementById('snippBar');
    if (snippBar) snippBar.appendChild(suggestionBar);
    else ce.parentElement?.appendChild(suggestionBar);

    const state = {
      type: 'swimlane',
      sequenceRenderId: 0,
      lastSvg: '',
      swimCode: ce.value || localStorage.getItem(SWIM_KEY) || '',
      sequenceCode: localStorage.getItem(SEQ_KEY) || DEFAULT_SEQUENCE,
      renderTimer: 0,
    };

    const detectType = (code) => /^\s*(?:diagram\s+[^\n]+\s*)?type\s+sequence\b/im.test(code || '');
    const initial = detectType(ce.value) ? 'sequence' : (localStorage.getItem(TYPE_KEY) || 'swimlane');

    const setType = (next, { preserve = true } = {}) => {
      const previous = state.type;
      if (next !== 'sequence') next = 'swimlane';
      if (preserve) {
        if (previous === 'sequence') {
          state.sequenceCode = ce.value;
          localStorage.setItem(SEQ_KEY, ce.value);
        } else {
          state.swimCode = ce.value;
          localStorage.setItem(SWIM_KEY, ce.value);
        }
      }

      state.type = next;
      localStorage.setItem(TYPE_KEY, next);
      select.value = next;
      document.documentElement.dataset.diagramType = next;
      ca.dataset.diagramType = next;
      suggestionBar.hidden = next !== 'sequence';
      const builtInError = document.getElementById('ebar');
      if (builtInError) builtInError.style.display = next === 'sequence' ? 'none' : '';

      if (next === 'sequence') {
        const incoming = detectType(ce.value) ? ce.value : state.sequenceCode;
        ce.value = incoming || DEFAULT_SEQUENCE;
        state.sequenceCode = ce.value;
        cv.style.visibility = 'hidden';
        overlay.hidden = false;
        error.hidden = true;
        renderSequence();
      } else {
        ce.value = state.swimCode || localStorage.getItem(SWIM_KEY) || '';
        cv.style.visibility = '';
        overlay.hidden = true;
        error.hidden = true;
        ce.dispatchEvent(new Event('input', { bubbles: true }));
      }
      ce.focus();
    };

    select.addEventListener('change', () => setType(select.value));

    ce.addEventListener('input', () => {
      if (state.type !== 'sequence') {
        state.swimCode = ce.value;
        return;
      }
      state.sequenceCode = ce.value;
      localStorage.setItem(SEQ_KEY, ce.value);
      clearTimeout(state.renderTimer);
      state.renderTimer = setTimeout(renderSequence, 180);
    });

    document.addEventListener('click', (event) => {
      if (state.type !== 'sequence') return;
      const button = event.target.closest('button');
      if (!button) return;
      const onclick = button.getAttribute('onclick') || '';
      if (/saveDraft\(/.test(onclick)) {
        event.preventDefault(); event.stopImmediatePropagation();
        localStorage.setItem(SEQ_KEY, ce.value);
        showToast('Sequence draft saved');
      } else if (/syncCode\(/.test(onclick)) {
        event.preventDefault(); event.stopImmediatePropagation();
        renderSequence(); showToast('Sequence rendered');
      } else if (/expSVG\(/.test(onclick)) {
        event.preventDefault(); event.stopImmediatePropagation();
        exportSvg(state.lastSvg, getTitle(ce.value));
      } else if (/expPNG\(/.test(onclick)) {
        event.preventDefault(); event.stopImmediatePropagation();
        exportPng(state.lastSvg, getTitle(ce.value), false);
      } else if (/copyPNG\(/.test(onclick)) {
        event.preventDefault(); event.stopImmediatePropagation();
        exportPng(state.lastSvg, getTitle(ce.value), true);
      }
    }, true);

    async function renderSequence() {
      if (state.type !== 'sequence') return;
      const renderId = ++state.sequenceRenderId;
      const parsed = parseSequenceSource(ce.value);
      if (parsed.errors.length) return showError(parsed.errors.join('\n'));
      try {
        await ensureMermaid();
        if (renderId !== state.sequenceRenderId) return;
        const themeConfig = buildThemeConfig(parsed.theme, getComputedStyle(document.documentElement), parsed.config);
        window.mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: themeConfig.theme,
          themeVariables: themeConfig.themeVariables,
          sequence: parsed.config,
          fontFamily: 'Inter, JetBrains Mono, system-ui, sans-serif',
        });
        const rendered = await window.mermaid.render(`swimflow-sequence-${Date.now()}-${renderId}`, parsed.mermaid);
        if (renderId !== state.sequenceRenderId) return;
        state.lastSvg = rendered.svg;
        overlay.innerHTML = rendered.svg;
        const svg = overlay.querySelector('svg');
        if (svg) {
          svg.removeAttribute('height');
          svg.style.maxWidth = 'none';
          svg.style.height = 'auto';
          svg.style.minWidth = '720px';
          const radius = Number(parsed.config.__radius || 0);
          if (radius > 0) svg.querySelectorAll('rect').forEach(rect => { rect.setAttribute('rx', radius); rect.setAttribute('ry', radius); });
        }
        error.hidden = true;
        overlay.hidden = false;
        cv.style.visibility = 'hidden';
        setStatus('Sequence diagram rendered');
      } catch (err) {
        showError(normalizeMermaidError(err));
      }
    }

    function showError(message) {
      error.textContent = message;
      error.hidden = false;
      overlay.hidden = false;
      setStatus('Sequence syntax error');
    }

    setType(initial, { preserve: false });
  };

  function parseSequenceSource(source) {
    const lines = String(source || '').replace(/\r\n/g, '\n').split('\n');
    const errors = [];
    let title = '';
    let theme = document.documentElement.dataset.uiTheme === 'light' ? 'light' : 'dark';
    let inConfig = false;
    const rawConfig = {};
    const body = [];

    for (let index = 0; index < lines.length; index++) {
      const raw = lines[index];
      const line = raw.trim();
      if (!line) { body.push(''); continue; }
      if (/^\/\//.test(line)) { body.push(`%% ${line.slice(2).trim()}`); continue; }
      const diagram = line.match(/^diagram\s+["'](.+)["']\s*$/i);
      if (diagram) { title = diagram[1]; continue; }
      if (/^type\s+sequence\s*$/i.test(line)) continue;
      const themeMatch = line.match(/^theme\s+(dark|light|blue|sepia)\s*$/i);
      if (themeMatch) { theme = themeMatch[1].toLowerCase(); continue; }
      if (/^direction\s+(TB|LR)\s*$/i.test(line)) continue;
      if (/^config\s*\{\s*$/i.test(line)) { inConfig = true; continue; }
      if (inConfig && /^\}\s*$/.test(line)) { inConfig = false; continue; }
      if (inConfig) {
        const match = line.match(/^([A-Za-z][\w]*)\s*[:=]?\s*(.+?)\s*,?$/);
        if (!match) { errors.push(`Line ${index + 1}: invalid config entry`); continue; }
        rawConfig[match[1]] = parseValue(match[2]);
        continue;
      }
      body.push(raw);
    }
    if (inConfig) errors.push('Config block is missing closing }');

    const config = normalizeSequenceConfig(rawConfig);
    let code = body.join('\n').trim();
    if (!/^sequenceDiagram\b/i.test(code)) code = `sequenceDiagram\n${code}`;
    if (config.showSequenceNumbers && !/^\s*autonumber\b/im.test(code)) code = code.replace(/^sequenceDiagram\s*/i, 'sequenceDiagram\n  autonumber\n');
    if (title && !/^\s*title\s+/im.test(code)) code = code.replace(/^sequenceDiagram\s*/i, `sequenceDiagram\n  title ${title}\n`);
    if (!/\b(participant|actor)\b/i.test(code)) errors.push('Add at least one participant or actor.');
    return { errors, title, theme, config, mermaid: code };
  }

  function normalizeSequenceConfig(input) {
    const defaults = {
      diagramMarginX: 48, diagramMarginY: 24, actorMargin: 72,
      width: 150, height: 52, boxMargin: 10, boxTextMargin: 5,
      noteMargin: 12, messageMargin: 36, mirrorActors: true,
      bottomMarginAdj: 1, useMaxWidth: true, rightAngles: false,
      showSequenceNumbers: false, wrap: true, __fontSize: 11, __radius: 8,
    };
    const aliases = { laneWidth: 'width', rowHeight: 'messageMargin', fontSize: '__fontSize', radius: '__radius' };
    Object.entries(input).forEach(([key, value]) => {
      const target = aliases[key] || key;
      if (target in defaults) defaults[target] = value;
    });
    return defaults;
  }

  function buildThemeConfig(theme, css, cfg) {
    const ac = css.getPropertyValue('--ac').trim() || '#4f9eff';
    const text = css.getPropertyValue('--br').trim() || '#e8f0ff';
    const surface = css.getPropertyValue('--p1').trim() || css.getPropertyValue('--bg2').trim() || '#0d1018';
    const border = css.getPropertyValue('--b2').trim() || css.getPropertyValue('--border2').trim() || '#243452';
    const bg = css.getPropertyValue('--bg').trim() || '#07090e';
    const fontSize = `${Number(cfg.__fontSize || 11)}px`;
    if (theme === 'light') return { theme: 'base', themeVariables: { fontSize, background:'#fff',primaryColor:'#eef4ff',primaryBorderColor:'#9ebbe2',primaryTextColor:'#172033',lineColor:'#52647b',textColor:'#24364c',actorBkg:'#fff',actorBorder:'#9ebbe2',actorTextColor:'#172033',signalColor:'#24364c',signalTextColor:'#24364c',labelBoxBkgColor:'#edf4ff',labelBoxBorderColor:'#b9cae1',labelTextColor:'#24364c',noteBkgColor:'#fff7df',noteBorderColor:'#d8b455',noteTextColor:'#5e4812',activationBkgColor:'#dceaff',activationBorderColor:'#3971bd' } };
    if (theme === 'blue') return { theme:'base', themeVariables:{ fontSize,background:'#071426',primaryColor:'#102a46',primaryBorderColor:'#4f9eff',primaryTextColor:'#e8f0ff',lineColor:'#7fb9ff',textColor:'#d8e8ff',actorBkg:'#102a46',actorBorder:'#4f9eff',actorTextColor:'#e8f0ff',signalColor:'#9cc9ff',signalTextColor:'#e8f0ff',labelBoxBkgColor:'#143557',labelBoxBorderColor:'#4f9eff',labelTextColor:'#e8f0ff',noteBkgColor:'#23354f',noteBorderColor:'#679ee2',noteTextColor:'#eef6ff' } };
    if (theme === 'sepia') return { theme:'base', themeVariables:{ fontSize,background:'#f5ecd9',primaryColor:'#eee1c5',primaryBorderColor:'#9a7846',primaryTextColor:'#47351d',lineColor:'#795f3a',textColor:'#47351d',actorBkg:'#fff7e7',actorBorder:'#9a7846',actorTextColor:'#47351d',signalColor:'#5d472b',signalTextColor:'#47351d',labelBoxBkgColor:'#eee1c5',labelBoxBorderColor:'#ad8a56',labelTextColor:'#47351d',noteBkgColor:'#fff3bd',noteBorderColor:'#a78538',noteTextColor:'#4c3b1a' } };
    return { theme:'base', themeVariables:{ fontSize,background:bg,primaryColor:surface,primaryBorderColor:ac,primaryTextColor:text,lineColor:ac,textColor:text,actorBkg:surface,actorBorder:ac,actorTextColor:text,signalColor:text,signalTextColor:text,labelBoxBkgColor:surface,labelBoxBorderColor:border,labelTextColor:text,noteBkgColor:'#2e2a18',noteBorderColor:'#a88734',noteTextColor:'#f2dfa2',activationBkgColor:'#173b68',activationBorderColor:ac } };
  }

  function parseValue(raw) {
    const value = String(raw).trim().replace(/,$/, '');
    if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
    if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
    return value.replace(/^["']|["']$/g, '');
  }

  function createSuggestions(ce) {
    const bar = document.createElement('div');
    bar.id = 'sequenceSuggestions';
    bar.className = 'sequenceSuggestions';
    [
      ['Participant','participant API as API Gateway'],['Actor','actor User as Customer'],
      ['Message','App ->> API: Request'],['Return','API -->> App: Response'],
      ['Activate','activate API'],['Deactivate','deactivate API'],
      ['Note','Note over App,API: Important context'],
      ['Alt','alt success\n  API -->> App: OK\nelse failure\n  API -->> App: Error\nend'],
      ['Loop','loop retry up to 3 times\n  App ->> API: Retry\nend'],
      ['Opt','opt optional flow\n  App ->> API: Optional request\nend'],
      ['Par','par task A\n  App ->> API: A\nand task B\n  App ->> API: B\nend'],
      ['Auto #','autonumber'],
    ].forEach(([label,text]) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'seqSuggestion'; button.textContent = label; button.title = text;
      button.addEventListener('click', () => insertAtCursor(ce, text));
      bar.appendChild(button);
    });
    return bar;
  }

  function insertAtCursor(ce, text) {
    const start = ce.selectionStart ?? ce.value.length;
    const end = ce.selectionEnd ?? start;
    const before = ce.value.slice(0, start), after = ce.value.slice(end);
    const insert = `${before && !before.endsWith('\n') ? '\n' : ''}${text}${after && !after.startsWith('\n') ? '\n' : ''}`;
    ce.setRangeText(insert, start, end, 'end');
    ce.dispatchEvent(new Event('input', { bubbles: true }));
    ce.focus();
  }

  function ensureMermaid() {
    if (window.mermaid) return Promise.resolve();
    if (window.__swimflowMermaidPromise) return window.__swimflowMermaidPromise;
    window.__swimflowMermaidPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
      script.defer = true; script.dataset.swimflowMermaid = 'true'; script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load Sequence Diagram renderer. Check your connection and retry.'));
      document.head.appendChild(script);
    });
    return window.__swimflowMermaidPromise;
  }

  function exportSvg(svgText, title) {
    if (!svgText) return showToast('Render the sequence diagram first');
    downloadBlob(new Blob([svgText], { type:'image/svg+xml;charset=utf-8' }), `${safeName(title || 'sequence-diagram')}.svg`);
  }

  async function exportPng(svgText, title, toClipboard) {
    if (!svgText) return showToast('Render the sequence diagram first');
    const url = URL.createObjectURL(new Blob([svgText], { type:'image/svg+xml;charset=utf-8' }));
    try {
      const img = new Image(); img.decoding = 'async';
      await new Promise((resolve,reject) => { img.onload=resolve; img.onerror=reject; img.src=url; });
      const scale = Math.min(2, window.devicePixelRatio || 1.5);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.ceil(img.width * scale)); canvas.height = Math.max(1, Math.ceil(img.height * scale));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = document.documentElement.dataset.uiTheme === 'light' ? '#fff' : '#07090e';
      ctx.fillRect(0,0,canvas.width,canvas.height); ctx.scale(scale,scale); ctx.drawImage(img,0,0);
      const png = await new Promise(resolve => canvas.toBlob(resolve,'image/png'));
      if (toClipboard && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]); showToast('Sequence PNG copied');
      } else downloadBlob(png, `${safeName(title || 'sequence-diagram')}.png`);
    } catch (_) { showToast('PNG export failed'); }
    finally { URL.revokeObjectURL(url); }
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href),1000);
  }
  function getTitle(code) { return String(code || '').match(/^\s*diagram\s+["'](.+?)["']/im)?.[1] || 'sequence-diagram'; }
  function safeName(value) { return String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'') || 'diagram'; }
  function setStatus(message) { const el=document.getElementById('st')||document.getElementById('status'); if(el) el.textContent=message; }
  function showToast(message) {
    let toast=document.getElementById('sequenceToast');
    if(!toast){toast=document.createElement('div');toast.id='sequenceToast';document.body.appendChild(toast);}
    toast.textContent=message;toast.classList.add('show');clearTimeout(toast._timer);toast._timer=setTimeout(()=>toast.classList.remove('show'),1800);
  }
  function normalizeMermaidError(err) { return String(err?.str||err?.message||err||'Invalid sequence syntax').replace(/Parse error on line\s*/i,'Syntax error near line ').replace(/mermaid version.*$/im,'').trim(); }

  function injectStyles() {
    if(document.getElementById('sequenceDiagramStyles')) return;
    const style=document.createElement('style'); style.id='sequenceDiagramStyles'; style.textContent=`
      #ca{position:relative!important}.diagramTypeSelect{min-width:105px;margin-left:5px;font-weight:600}
      #sequenceCanvas{position:absolute;inset:0;overflow:auto;padding:44px;background:var(--bg);z-index:8}#sequenceCanvas[hidden]{display:none!important}
      #sequenceCanvas>svg{display:block;margin:0 auto;filter:drop-shadow(0 12px 32px rgba(0,0,0,.10))}
      #sequenceError{position:absolute;top:16px;left:50%;transform:translateX(-50%);z-index:12;max-width:min(720px,calc(100% - 32px));padding:10px 14px;border:1px solid color-mix(in srgb,var(--re) 55%,transparent);border-radius:9px;background:color-mix(in srgb,var(--re) 10%,var(--p1));color:var(--re);white-space:pre-wrap;font-size:10px;box-shadow:0 12px 30px rgba(0,0,0,.18)}#sequenceError[hidden]{display:none!important}
      .seqEmpty{color:var(--dm);text-align:center;padding-top:80px}.sequenceSuggestions{width:100%;display:flex;gap:4px;align-items:center;overflow-x:auto;padding-top:2px;scrollbar-width:thin}.sequenceSuggestions[hidden]{display:none!important}
      .seqSuggestion{flex:0 0 auto;min-height:24px;padding:3px 8px;border-radius:5px;border:1px solid var(--b2);background:var(--p1);color:var(--tx);font:600 9px/1.1 'JetBrains Mono',monospace;cursor:pointer}.seqSuggestion:hover{border-color:var(--ac);color:var(--br);background:var(--p2)}
      #sequenceToast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,12px);opacity:0;pointer-events:none;z-index:100001;padding:8px 12px;border:1px solid var(--b2);border-radius:8px;background:var(--p1);color:var(--br);font:600 10px/1.2 'JetBrains Mono',monospace;box-shadow:0 10px 28px rgba(0,0,0,.22);transition:opacity .16s,transform .16s}#sequenceToast.show{opacity:1;transform:translate(-50%,0)}
      :root[data-ui-theme='light'] #sequenceCanvas{background:#f6f8fc}:root[data-ui-theme='light'] .seqSuggestion{background:#fff;color:#29384d;border-color:#c5d2e1}:root[data-ui-theme='light'] .seqSuggestion:hover{background:#eef4ff;color:#0b1220;border-color:#8fa9c7}
      @media(max-width:720px){#sequenceCanvas{padding:24px 16px 80px}.diagramTypeSelect{min-width:92px;max-width:105px}}
    `; document.head.appendChild(style);
  }

  waitForApp();
})();
