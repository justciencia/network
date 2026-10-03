(function () {
  'use strict';
  var CFG = window.NETWORK_CONFIG || {};
  var DEMO = !CFG.scriptUrl;
  var main = (CFG.mainSite || 'https://justciencia.com').replace(/\/$/, '');
  var STAGES = ['In school', 'Industry', 'Postdoc or faculty'];
  var STORE_KEY = 'justciencia_network_key';
  var state = { all: [], me: null, key: '', q: '', stage: '', help: '', industry: '', onlyOpen: false, target: null };

  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function safeUrl(u) { return /^https:\/\//i.test(u || '') ? u : ''; }
  function isFuture(m) { return m.stage === 'In school'; }
  function isOpen(m) { return !isFuture(m) && String(m.status).toLowerCase() === 'open'; }
  function rank(m) { return isFuture(m) ? 2 : (isOpen(m) ? 0 : 1); }
  function uniq(a) { return a.filter(function (v, i) { return v && a.indexOf(v) === i; }); }

  // ---- links back to the main site ----
  $('logo').href = main; $('nav-scientists').href = main; $('nav-about').href = main + '/about/';
  $('nominate').href = main + '/#nominate'; $('gate-join').href = main + '/#nominate'; $('gate-site').href = main;
  if (CFG.contactEmail) { $('gate-mail').textContent = CFG.contactEmail; $('gate-mail').href = 'mailto:' + CFG.contactEmail; $('gate-lost').hidden = false; }

  // ---- key handling: take it from the link, keep it on this device, remove it from the address bar ----
  function storeGet() { try { return localStorage.getItem(STORE_KEY) || ''; } catch (e) { return ''; } }
  function storeSet(k) { try { localStorage.setItem(STORE_KEY, k); } catch (e) {} }
  function storeClear() { try { localStorage.removeItem(STORE_KEY); } catch (e) {} }
  function readKey() {
    var fromUrl = '';
    try { fromUrl = new URLSearchParams(window.location.search).get('key') || ''; } catch (e) {}
    if (fromUrl) {
      storeSet(fromUrl);
      try { window.history.replaceState({}, document.title, window.location.pathname); } catch (e) {}
      return fromUrl;
    }
    return storeGet();
  }
  function apiUrl(params) {
    var q = Object.keys(params).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
    return CFG.scriptUrl + (CFG.scriptUrl.indexOf('?') > -1 ? '&' : '?') + q;
  }

  // ---- views ----
  function showGate(msg) {
    $('app').hidden = true; $('gate').hidden = false; $('signout').hidden = true;
    var m = $('gate-msg'); m.textContent = msg || ''; m.hidden = !msg;
    $('gate-lost').hidden = !CFG.contactEmail;
    // public teaser: counts only, never names
    var done = function (d) {
      if (d && d.ok && d.count > 0) {
        var c = $('gate-count');
        c.textContent = d.count + (d.count === 1 ? ' first-gen scientist' : ' first-gen scientists') + (d.fields > 1 ? ' across ' + d.fields + ' fields' : '') + ' and growing.';
        c.hidden = false;
      }
    };
    if (DEMO) { done({ ok: true, count: 28, fields: 12 }); return; }
    fetch(apiUrl({ action: 'teaser' })).then(function (r) { return r.json(); }).then(done).catch(function () {});
  }
  function showApp() {
    $('gate').hidden = true; $('app').hidden = false; $('signout').hidden = false;
    buildFilters(); render();
  }
  function showStatus(msg) { var s = $('status'); s.textContent = msg; s.hidden = !msg; }

  function normalize(list) {
    return (list || []).map(function (m) {
      m.openTo = Array.isArray(m.openTo) ? m.openTo : String(m.openTo || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      return m;
    });
  }

  function load(key) {
    if (!key) { showGate(); return; }
    if (DEMO) {
      if (key !== 'demo') { storeClear(); showGate('This link is not valid. In demo mode, use index.html?key=demo'); return; }
      fetch('data/sample-members.json').then(function (r) { return r.json(); }).then(function (d) {
        state.key = key; state.all = normalize(d.members); state.me = { id: 'demo', firstName: 'there' }; showApp();
      }).catch(function () { showGate('Could not load the demo data. Serve this folder with a local web server.'); });
      return;
    }
    fetch(apiUrl({ action: 'members', key: key })).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.ok) { state.key = key; state.all = normalize(d.members); state.me = d.me || null; showApp(); }
      else { storeClear(); showGate('That link is not valid or has been turned off. Please use the personal link from your welcome email.'); }
    }).catch(function () { showGate('The network could not load right now. Please try again in a few minutes.'); });
  }

  // ---- filters and cards ----
  function chipGroup(containerId, values, key, allLabel) {
    var box = $(containerId); box.textContent = '';
    [''].concat(values).forEach(function (v) {
      var b = el('button', { type: 'button', class: 'chip', text: v || allLabel });
      b.setAttribute('aria-pressed', String(state[key] === v));
      b.addEventListener('click', function () { state[key] = v; chipGroup(containerId, values, key, allLabel); render(); });
      box.appendChild(b);
    });
  }
  function buildChips() {
    var stages = STAGES.filter(function (s) { return state.all.some(function (m) { return m.stage === s; }); });
    chipGroup('stage-chips', stages, 'stage', 'All');
    var helps = uniq([].concat.apply([], state.all.filter(function (m) { return !isFuture(m); }).map(function (m) { return m.openTo; }))).sort();
    chipGroup('help-chips', helps, 'help', 'Anything');
  }
  function buildFilters() {
    buildChips();
    var sel = $('industry'); sel.textContent = ''; sel.appendChild(el('option', { value: '', text: 'Any industry' }));
    uniq(state.all.map(function (m) { return m.industry; })).sort().forEach(function (i) { sel.appendChild(el('option', { value: i, text: i })); });
  }
  function matches(m) {
    if (state.stage && m.stage !== state.stage) return false;
    if (state.help && m.openTo.indexOf(state.help) === -1) return false;
    if (state.industry && m.industry !== state.industry) return false;
    if (state.onlyOpen && !isOpen(m)) return false;
    if (state.q) {
      var hay = [m.name, m.role, m.company, m.field, m.industry, m.region].join(' ').toLowerCase();
      if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
    }
    return true;
  }
  function card(m) {
    var open = isOpen(m), future = isFuture(m), mine = state.me && state.me.id === m.id;
    var cls = 'card' + (!open && !future ? ' paused' : '');
    var initials = (m.name || '?').split(/\s+/).slice(0, 2).map(function (p) { return p.charAt(0).toUpperCase(); }).join('');
    var roleLine = [m.role, m.company].filter(Boolean).join(' at ');
    var badgeKind = future ? 'future' : (open ? 'open' : 'paused');
    var badgeText = future ? 'Future mentor' : (open ? 'Open to talk' : 'Not open right now');
    var help = future ? 'Pays it forward after graduating.' : (open ? (m.openTo.length ? 'Open to: ' + m.openTo.join(', ') : '') : 'Taking a break. Check back soon.');
    var kids = [
      el('div', { class: 'who' }, [
        el('div', { class: 'avatar', 'aria-hidden': 'true', text: initials }),
        el('div', {}, [el('h3', { class: 'name', text: m.name + (mine ? ' (you)' : '') }), el('p', { class: 'role', text: roleLine })])
      ]),
      el('span', { class: 'badge ' + badgeKind }, [el('span', { class: 'dot' }), document.createTextNode(badgeText)]),
      el('div', { class: 'tags' }, [m.field, m.industry, m.region, m.stage].filter(Boolean).map(function (t) { return el('span', { class: 'tag', text: t }); })),
      el('p', { class: 'helptext', text: help })
    ];
    var story = safeUrl(m.storyUrl), li = safeUrl(m.linkedin);
    if (open && !mine) {
      var b = el('button', { type: 'button', class: 'btn orange', text: 'Request an intro' });
      b.setAttribute('aria-label', 'Request an intro with ' + m.name);
      b.addEventListener('click', function () { openDialog(m); });
      kids.push(b);
    } else if (!future && !mine) {
      var d = el('button', { type: 'button', class: 'btn', text: 'Not taking requests right now' }); d.disabled = true; kids.push(d);
    }
    var links = [];
    if (story) links.push(el('a', { href: story, class: future ? 'btn outline' : '', text: 'Read their story' }));
    if (li) links.push(el('a', { href: li, target: '_blank', rel: 'noopener noreferrer', text: 'LinkedIn' }));
    if (links.length) kids.push(el('div', { class: 'card-links' }, links));
    return el('article', { class: cls }, kids);
  }
  function render() {
    var list = state.all.filter(matches).sort(function (a, b) { return rank(a) - rank(b) || String(a.name).localeCompare(String(b.name)); });
    var g = $('grid'); g.textContent = '';
    list.forEach(function (m) { g.appendChild(card(m)); });
    $('count').textContent = list.length + (list.length === 1 ? ' person' : ' people');
    var filtered = state.q || state.stage || state.help || state.industry || state.onlyOpen;
    $('clear').hidden = !filtered;
    if (!state.all.length) showStatus('The network is just getting started. Check back soon.');
    else if (!list.length) showStatus('No one matches yet. Try removing a filter.');
    else showStatus('');
  }

  $('q').addEventListener('input', function (e) { state.q = e.target.value.trim(); render(); });
  $('industry').addEventListener('change', function (e) { state.industry = e.target.value; render(); });
  $('only-open').addEventListener('click', function (e) {
    state.onlyOpen = !state.onlyOpen; e.currentTarget.setAttribute('aria-pressed', String(state.onlyOpen)); render();
  });
  $('clear').addEventListener('click', function () {
    state.q = state.stage = state.help = state.industry = ''; state.onlyOpen = false;
    $('q').value = ''; $('industry').value = ''; $('only-open').setAttribute('aria-pressed', 'false');
    buildChips(); render();
  });
  $('signout').addEventListener('click', function () {
    storeClear(); state.key = ''; state.all = []; state.me = null; showGate('You have signed out on this device. Use your personal link to come back.');
  });

  // ---- request dialog (the requester is identified by their key, so no name or email needed) ----
  var dlg = $('dlg'), form = $('req-form');
  function openDialog(m) {
    state.target = m;
    $('dlg-sub').textContent = 'To ' + m.name + '. justciencia reviews every request before passing it on.';
    $('dlg-from').textContent = 'We will send it on your behalf using the details we already have for you.';
    $('f-member').value = m.id;
    form.reset(); $('f-count').textContent = '0'; $('form-error').hidden = true;
    form.hidden = false; $('req-done').hidden = true; $('dlg-send').disabled = false; $('dlg-send').textContent = 'Send request';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    $('f-msg').focus();
  }
  function closeDialog() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  $('dlg-cancel').addEventListener('click', closeDialog);
  $('dlg-close').addEventListener('click', closeDialog);
  $('f-msg').addEventListener('input', function (e) { $('f-count').textContent = e.target.value.length; });
  function fail(msg) { var e = $('form-error'); e.textContent = msg; e.hidden = false; }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var msg = $('f-msg').value.trim();
    if (msg.length < 20) return fail('Please write a little more so the member knows how to help.');
    if (!$('f-consent').checked) return fail('Please tick the box to continue.');
    if ($('f-website').value) { form.hidden = true; $('req-done').hidden = false; return; }
    $('form-error').hidden = true;
    var btn = $('dlg-send'); btn.disabled = true; btn.textContent = 'Sending...';
    var done = function () { form.hidden = true; $('req-done').hidden = false; };
    if (DEMO) { setTimeout(done, 400); return; }
    fetch(CFG.scriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'request', key: state.key, memberId: $('f-member').value, message: msg, website: $('f-website').value, consent: true }) })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (r && r.ok) done();
        else if (r && r.locked) { closeDialog(); storeClear(); showGate(r.error); }
        else { btn.disabled = false; btn.textContent = 'Send request'; fail((r && r.error) || 'Something went wrong. Please try again.'); }
      })
      .catch(function () { btn.disabled = false; btn.textContent = 'Send request'; fail('We could not send that. Please check your connection and try again.'); });
  });

  load(readKey());
})();
