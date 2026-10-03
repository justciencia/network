(function () {
  'use strict';
  var CFG = window.NETWORK_CONFIG || {};
  var DEMO = !CFG.scriptUrl;
  var main = (CFG.mainSite || 'https://justciencia.com').replace(/\/$/, '');
  var STAGES = ['In school', 'Industry', 'Postdoc or faculty'];
  var state = { all: [], q: '', stage: '', help: '', industry: '', onlyOpen: false, target: null };

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

  // links back to the main site
  $('logo').href = main; $('nav-scientists').href = main;
  $('nav-about').href = main + '/about/'; $('nominate').href = main + '/#nominate';
  if (DEMO) $('demo-banner').hidden = false;

  function showStatus(msg) { var s = $('status'); s.textContent = msg; s.hidden = !msg; }

  function load() {
    showStatus('Loading the network...');
    var url = DEMO ? 'data/sample-members.json' : CFG.scriptUrl + (CFG.scriptUrl.indexOf('?') > -1 ? '&' : '?') + 'action=members';
    fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      state.all = (d.members || []).map(function (m) {
        m.openTo = Array.isArray(m.openTo) ? m.openTo : String(m.openTo || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        return m;
      });
      showStatus('');
      buildFilters(); render();
    }).catch(function () {
      showStatus('The network could not load right now. Please try again in a few minutes.');
    });
  }

  function uniq(a) { return a.filter(function (v, i) { return v && a.indexOf(v) === i; }); }

  function chipGroup(containerId, values, key, allLabel) {
    var box = $(containerId); box.textContent = '';
    ['' ].concat(values).forEach(function (v) {
      var b = el('button', { type: 'button', class: 'chip', text: v || allLabel });
      b.setAttribute('aria-pressed', String(state[key] === v));
      b.addEventListener('click', function () { state[key] = v; chipGroup(containerId, values, key, allLabel); render(); });
      box.appendChild(b);
    });
  }

  function buildFilters() {
    var stages = STAGES.filter(function (s) { return state.all.some(function (m) { return m.stage === s; }); });
    chipGroup('stage-chips', stages, 'stage', 'All');
    var helps = uniq([].concat.apply([], state.all.filter(function (m) { return !isFuture(m); }).map(function (m) { return m.openTo; }))).sort();
    chipGroup('help-chips', helps, 'help', 'Anything');
    var sel = $('industry');
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
    var open = isOpen(m), future = isFuture(m);
    var cls = 'card' + (!open && !future ? ' paused' : '');
    var initials = (m.name || '?').split(/\s+/).slice(0, 2).map(function (p) { return p.charAt(0).toUpperCase(); }).join('');
    var roleLine = [m.role, m.company].filter(Boolean).join(' at ');
    var badgeKind = future ? 'future' : (open ? 'open' : 'paused');
    var badgeText = future ? 'Future mentor' : (open ? 'Open to talk' : 'Not open right now');
    var help = future ? 'Pays it forward after graduating.' : (open ? (m.openTo.length ? 'Open to: ' + m.openTo.join(', ') : '') : 'Taking a break. Check back soon.');
    var kids = [
      el('div', { class: 'who' }, [
        el('div', { class: 'avatar', 'aria-hidden': 'true', text: initials }),
        el('div', {}, [el('h3', { class: 'name', text: m.name }), el('p', { class: 'role', text: roleLine })])
      ]),
      el('span', { class: 'badge ' + badgeKind }, [el('span', { class: 'dot' }), document.createTextNode(badgeText)]),
      el('div', { class: 'tags' }, [m.field, m.industry, m.region, m.stage].filter(Boolean).map(function (t) { return el('span', { class: 'tag', text: t }); })),
      el('p', { class: 'helptext', text: help })
    ];
    var story = safeUrl(m.storyUrl), li = safeUrl(m.linkedin);
    if (open) {
      var b = el('button', { type: 'button', class: 'btn orange', text: 'Request an intro' });
      b.setAttribute('aria-label', 'Request an intro with ' + m.name);
      b.addEventListener('click', function () { openDialog(m); });
      kids.push(b);
    } else if (!future) {
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
    if (!state.all.length) showStatus('The network is just getting started. Check back soon as we publish more stories.');
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
    buildFiltersKeepIndustry(); render();
  });
  function buildFiltersKeepIndustry() {
    var stages = STAGES.filter(function (s) { return state.all.some(function (m) { return m.stage === s; }); });
    chipGroup('stage-chips', stages, 'stage', 'All');
    var helps = uniq([].concat.apply([], state.all.filter(function (m) { return !isFuture(m); }).map(function (m) { return m.openTo; }))).sort();
    chipGroup('help-chips', helps, 'help', 'Anything');
  }

  // ---- request dialog ----
  var dlg = $('dlg'), form = $('req-form');
  function openDialog(m) {
    state.target = m;
    $('dlg-sub').textContent = 'To ' + m.name + '. justciencia reviews every request before passing it on.';
    $('f-member').value = m.id;
    form.reset(); $('f-count').textContent = '0'; $('form-error').hidden = true;
    form.hidden = false; $('req-done').hidden = true; $('dlg-send').disabled = false; $('dlg-send').textContent = 'Send request';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    $('f-name').focus();
  }
  function closeDialog() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  $('dlg-cancel').addEventListener('click', closeDialog);
  $('dlg-close').addEventListener('click', closeDialog);
  $('f-msg').addEventListener('input', function (e) { $('f-count').textContent = e.target.value.length; });
  function fail(msg) { var e = $('form-error'); e.textContent = msg; e.hidden = false; }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var name = $('f-name').value.trim(), email = $('f-email').value.trim(), msg = $('f-msg').value.trim();
    if (!name || !email || !msg) return fail('Please fill in your name, email and message.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('Please enter a valid email address.');
    if (msg.length < 20) return fail('Please write a little more so the member knows how to help.');
    if (!$('f-consent').checked) return fail('Please tick the box to continue.');
    if ($('f-website').value) { $('req-form').hidden = true; $('req-done').hidden = false; return; }
    $('form-error').hidden = true;
    var btn = $('dlg-send'); btn.disabled = true; btn.textContent = 'Sending...';
    var done = function () { form.hidden = true; $('req-done').hidden = false; };
    if (DEMO) { setTimeout(done, 400); return; }
    fetch(CFG.scriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'request', memberId: $('f-member').value, name: name, email: email, message: msg, website: $('f-website').value, consent: true }) })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (r && r.ok) done();
        else { btn.disabled = false; btn.textContent = 'Send request'; fail((r && r.error) || 'Something went wrong. Please try again.'); }
      })
      .catch(function () { btn.disabled = false; btn.textContent = 'Send request'; fail('We could not send that. Please check your connection and try again.'); });
  });

  load();
})();
