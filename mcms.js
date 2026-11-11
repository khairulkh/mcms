/* MCMS frontend — file gabungan otomatis (tools/build.js). Sumber: assets/app.js & assets/js/*.js */
/* =========================================================
   MCMS Frontend V1.0 — satu halaman (SPA) tanpa build tool.
   Semua data dinamis di-escape sebelum masuk ke HTML.
   ========================================================= */
(function () {
  'use strict';

  var CFG = window.MCMS_CONFIG || {};
  var DEMO = !!CFG.DEMO_MODE;
  var STORE_KEY = 'mcms.session';
  var MODE_KEY_BASE = 'mcms.mode.';
  function modeKey() { return MODE_KEY_BASE + (state.me ? state.me.userId : ''); }

  /* ---------------- Utilitas ---------------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  function esc(v) {
    return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function safeImg(src) { return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(String(src || '')) ? src : ''; }
  function safeHttps(src) { return /^https:\/\/[^\s"'<>]+$/.test(String(src || '')) ? src : ''; }
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* mode privat */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } }
  };
  function initials(name) {
    var parts = String(name || '?').trim().split(/\s+/);
    return ((parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
  var fmtDateLong = function (d) {
    try { return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d); }
    catch (e) { return d.toDateString(); }
  };
  function fmtDate(iso, withTime) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d)) return '—';
    var opt = { day: 'numeric', month: 'short', year: 'numeric' };
    if (withTime) { opt.hour = '2-digit'; opt.minute = '2-digit'; }
    try { return new Intl.DateTimeFormat('id-ID', opt).format(d); } catch (e) { return d.toLocaleString(); }
  }
  function greeting() {
    var h = new Date().getHours();
    return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  }

  /* ---------------- Ikon (SVG inline) ---------------- */
  var ICON_PATHS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    tasks: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 12 2.5 2.5L14 10"/><path d="M16 9h2M16 15h2"/>',
    sparkles: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5L5 20"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
    report: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    arrowRight: '<path d="M5 12h14M13 5l7 7-7 7"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    pause: '<circle cx="12" cy="12" r="10"/><path d="M10 9v6M14 9v6"/>',
    ban: '<circle cx="12" cy="12" r="10"/><path d="m5 5 14 14"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    palette: '<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A5.6 5.6 0 0 0 22 9.8C22 5.5 17.5 2 12 2Z"/>',
    server: '<rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 7h.01M6 17h.01"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    whatsapp: '<path d="M3 21l1.6-4.7A8.5 8.5 0 1 1 8 19.6Z"/><path d="M9 10c0 3 2 5 5 5l1.5-1.5-2-1-1 1c-1 0-2.5-1.5-2.5-2.5l1-1-1-2Z"/>',
    sidebar: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    kanban: '<rect x="3" y="3" width="5" height="18" rx="1.5"/><rect x="10" y="3" width="5" height="12" rx="1.5"/><rect x="17" y="3" width="4" height="8" rx="1.5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/>',
    video: '<rect x="2" y="5" width="15" height="14" rx="2"/><path d="m17 10 5-3v10l-5-3"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    printer: '<path d="M6 9V2h12v7"/><rect x="6" y="14" width="12" height="8"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>',
    flag: '<path d="M4 22V4a1 1 0 0 1 1-1h12l-2 4 2 4H5"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5Z"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
    play: '<circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4Z"/>'
  };
  function icon(name, extra) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"' +
      (extra ? ' ' + extra : '') + '>' + (ICON_PATHS[name] || '') + '</svg>';
  }

  /* ---------------- State ---------------- */
  var state = {
    session: null,       // { token, expiresAt }
    me: null,            // { userId, email, displayName, role, modes, permissions }
    mode: 'personal',
    branding: null,
    route: '',
    pendingInvite: null
  };

  /* ---------------- API ---------------- */
  function ApiError(code, message) { this.code = code; this.message = message; }
  var READ_ACTIONS = ['system.ping', 'branding.getPublic', 'auth.me', 'dashboard.owner', 'dashboard.executive', 'users.list', 'settings.system'];

  function isConfigured() {
    return DEMO || (/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(CFG.API_URL || '') || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(CFG.API_URL || ''));
  }

  function rawCall(action, payload) {
    var body = JSON.stringify({ action: action, payload: payload || {}, token: state.session ? state.session.token : '' });
    if (DEMO) return window.MCMSDemo.call(body);
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 45000);
    // text/plain = "simple request" → tidak memicu preflight CORS yang tidak didukung Apps Script
    return fetch(CFG.API_URL, {
      method: 'POST', redirect: 'follow', body: body, signal: ctrl ? ctrl.signal : undefined,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    }).then(function (res) {
      clearTimeout(timer);
      if (!res.ok) throw new ApiError('NETWORK', 'Server tidak merespons dengan benar (' + res.status + '). Coba lagi.');
      return res.json().catch(function () { throw new ApiError('NETWORK', 'Respons server tidak terbaca. Pastikan URL API benar.'); });
    }, function (err) {
      clearTimeout(timer);
      if (err && err.name === 'AbortError') throw new ApiError('TIMEOUT', 'Server terlalu lama merespons. Periksa koneksi lalu coba lagi.');
      throw new ApiError('NETWORK', 'Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.');
    });
  }

  function api(action, payload, attempt) {
    attempt = attempt || 0;
    return rawCall(action, payload).then(function (json) {
      if (!json || json.success !== true) {
        var code = json && json.errorCode ? json.errorCode : 'INTERNAL';
        var err = new ApiError(code, (json && json.message) || 'Terjadi kesalahan.');
        if (code === 'UNAUTHENTICATED' && action.indexOf('auth.') !== 0 && state.session) handleSessionExpired(err.message);
        throw err;
      }
      noteWrite(action);
      return json.data;
    }, function (err) {
      // Coba ulang otomatis sekali untuk aksi baca saat jaringan bermasalah
      if (err instanceof ApiError && (err.code === 'NETWORK' || err.code === 'TIMEOUT') && attempt < 1 && READ_ACTIONS.indexOf(action) >= 0) {
        return new Promise(function (r) { setTimeout(r, 1200); }).then(function () { return api(action, payload, attempt + 1); });
      }
      throw err instanceof ApiError ? err : new ApiError('NETWORK', 'Tidak dapat terhubung ke server.');
    });
  }

  /* ---------------- Cache tampilan: tampil langsung dari data terakhir, lalu diperbarui diam-diam ----------------
     Data terakhir setiap halaman disimpan di browser (per akun). Saat halaman dibuka, data itu langsung tampil
     (tanpa menunggu Apps Script), sementara data terbaru diambil di latar belakang dan menggantikannya. */
  var CACHE_PREFIX = 'mcms.c.';
  var READ_RE = /^(dashboard\.|exec\.)|\.(list|get|thumbs|preview|all|global|getPublic|me|system|ping)$/;
  var CACHEABLE_RE = /^(dashboard\.(owner|executive)|exec\.(projects|project|activity|assets|reports)|(projects|tasks|activities|assets|reports|reviews|requests|categories|users)\.list|projects\.get|lookup\.all|settings\.system|requests\.get)$/;
  var lastWriteAt = Number(store.get('mcms.cw') || 0);
  function cacheKey(action, payload) { return CACHE_PREFIX + (state.me ? state.me.userId : '_') + '|' + action + '|' + JSON.stringify(payload || {}); }
  function cacheGet(k) { try { var raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
  function cacheClear() {
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(CACHE_PREFIX) === 0) localStorage.removeItem(k); }); } catch (e) { /* abaikan */ }
  }
  function cachePut(k, data) {
    var str;
    try { str = JSON.stringify({ t: Date.now(), d: data }); } catch (e) { return; }
    if (str.length > 400000) return;
    try { localStorage.setItem(k, str); } catch (e) { cacheClear(); try { localStorage.setItem(k, str); } catch (e2) { /* penyimpanan penuh */ } }
  }
  function stable(d) { return JSON.stringify(d, function (k, v) { return k === 'generatedAt' ? undefined : v; }); }
  function noteWrite(action) {
    if (READ_RE.test(action) || action.indexOf('auth.') === 0) return;
    lastWriteAt = Date.now();
    store.set('mcms.cw', lastWriteAt);
  }
  /**
   * load(action, payload, render, onError, opts)
   * render(data, fromCache) bisa dipanggil dua kali: dari cache (instan) lalu dari server (jika berbeda).
   * opts.skeleton: dipanggil bila belum ada data sama sekali.
   */
  function load(action, payload, render, onError, opts) {
    opts = opts || {};
    var key = cacheKey(action, payload);
    var cacheable = CACHEABLE_RE.test(action) && !(payload && payload.q); // hasil pencarian tidak disimpan
    var view = location.hash;
    var sameView = state.lastView === view;
    var c = cacheable ? cacheGet(key) : null;
    var shown = '';
    // Setelah menyimpan perubahan di halaman yang sama, jangan tampilkan data lama sesaat.
    if (c && !(sameView && c.t < lastWriteAt)) {
      shown = stable(c.d);
      try { render(c.d, true); } catch (e) { shown = ''; }
    } else if (opts.skeleton && !sameView) opts.skeleton();
    return api(action, payload).then(function (d) {
      if (cacheable) cachePut(key, d);
      if (location.hash !== view || !state.me) return;
      state.lastView = view;
      if (stable(d) !== shown) render(d, false);
    }, function (err) {
      if (location.hash !== view || !state.me) return;
      if (shown && (err.code === 'NETWORK' || err.code === 'TIMEOUT')) { toast('Offline: menampilkan data tersimpan terakhir.', 'error'); return; }
      if (onError) onError(err);
    });
  }

  /* ---------------- Toast & dialog ---------------- */
  function toast(message, type) {
    var root = $('#toast-root');
    var el = document.createElement('div');
    el.className = 'toast ' + (type || 'success');
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = icon(type === 'error' ? 'alert' : 'checkCircle') + '<div>' + esc(message) + '</div>' +
      '<button class="x" type="button" aria-label="Tutup notifikasi">' + icon('x', 'width="16" height="16"') + '</button>';
    root.appendChild(el);
    while (root.children.length > 3) root.removeChild(root.firstChild);
    var remove = function () { if (el.parentNode) el.parentNode.removeChild(el); };
    $('.x', el).addEventListener('click', remove);
    setTimeout(remove, type === 'error' ? 7000 : 4000);
  }

  var lastFocus = null;
  var overlayDocKey = null;
  var overlayOnClose = null;
  function openOverlay(html, opts) {
    opts = opts || {};
    closeOverlay();
    lastFocus = document.activeElement;
    var root = $('#overlay-root');
    root.innerHTML = '<div class="overlay' + (opts.sheet ? ' as-sheet' : '') + (opts.drawer ? ' as-drawer' : '') + (opts.wide ? ' is-wide' : '') + '" data-overlay>' +
      '<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title">' + html + '</div></div>';
    document.body.classList.add('has-overlay');
    var ov = $('[data-overlay]', root);
    ov.addEventListener('click', function (e) { if (e.target === ov && !opts.persistent) closeOverlay(); });
    ov.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { if (!opts.persistent) closeOverlay(); return; }
      if (e.key !== 'Tab') return;
      var f = $$('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', ov).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    var first = $('[data-autofocus]', ov) || $('input:not([type=hidden]), select, textarea, button, a[href]', ov);
    if (first) first.focus();
    /* Jika isi dialog digambar ulang, fokus bisa jatuh ke <body>. Esc & Tab tetap bekerja dan fokus dikembalikan ke dialog. */
    overlayOnClose = opts.onClose || null;
    ov.setAttribute('tabindex', '-1');
    if (overlayDocKey) document.removeEventListener('keydown', overlayDocKey);
    overlayDocKey = function (e) {
      if (!document.body.contains(ov) || ov.contains(document.activeElement)) return;
      if (e.key === 'Escape') { if (!opts.persistent) closeOverlay(); }
      else if (e.key === 'Tab') { e.preventDefault(); var t = $('input:not([type=hidden]), select, textarea, button, a[href]', ov); (t || ov).focus(); }
    };
    document.addEventListener('keydown', overlayDocKey);
    return ov;
  }
  function closeOverlay() {
    var root = $('#overlay-root');
    if (root && root.innerHTML) {
      root.innerHTML = '';
      document.body.classList.remove('has-overlay');
      if (overlayDocKey) { document.removeEventListener('keydown', overlayDocKey); overlayDocKey = null; }
      if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
      var cb = overlayOnClose; overlayOnClose = null;
      if (cb) setTimeout(cb, 0);
    }
  }

  /** Dialog konfirmasi. Mengembalikan Promise<boolean>. */
  function confirmDialog(o) {
    return new Promise(function (resolve) {
      var tone = o.danger ? 'tone-danger' : 'tone-primary';
      var ov = openOverlay(
        '<div class="dialog-head ' + tone + '"><span class="ico ic">' + icon(o.icon || 'alert') + '</span>' +
        '<div><h2 id="dlg-title">' + esc(o.title) + '</h2></div></div>' +
        '<div class="dialog-body"><p>' + esc(o.message) + '</p></div>' +
        '<div class="dialog-foot"><button class="btn btn-secondary" type="button" data-no data-autofocus>Batal</button>' +
        '<button class="btn ' + (o.danger ? 'btn-danger-solid' : 'btn-primary') + '" type="button" data-yes>' + esc(o.confirmText || 'Ya, lanjutkan') + '</button></div>'
      );
      $('[data-no]', ov).addEventListener('click', function () { closeOverlay(); resolve(false); });
      $('[data-yes]', ov).addEventListener('click', function () { closeOverlay(); resolve(true); });
    });
  }

  function setLoading(btn, on) {
    if (!btn) return;
    btn.classList.toggle('is-loading', !!on);
    btn.disabled = !!on;
    btn.setAttribute('aria-busy', on ? 'true' : 'false');
  }

  /* ---------------- Branding ---------------- */
  function brandMarkup(b, opts) {
    b = b || {};
    opts = opts || {};
    var p = safeImg(b.primaryLogo), s = safeImg(b.secondaryLogo);
    var mode = b.logoMode || 'NONE';
    var alt = b.logoAlt || 'Logo';
    var logos = '';
    if (mode === 'MEDIA' && p) logos = '<img src="' + p + '" alt="' + esc(alt) + '">';
    else if (mode === 'SCHOOL' && s) logos = '<img src="' + s + '" alt="' + esc('Logo ' + (b.organizationName || 'sekolah')) + '">';
    else if (mode === 'BOTH' && (p || s)) {
      logos = (p ? '<img src="' + p + '" alt="' + esc(alt) + '">' : '') + (p && s ? '<span class="divider" aria-hidden="true"></span>' : '') +
        (s ? '<img src="' + s + '" alt="' + esc('Logo ' + (b.organizationName || 'sekolah')) + '">' : '');
    }
    if (!logos) logos = '<span class="monogram" aria-hidden="true">MC</span>';
    var names = opts.noNames ? '' : '<span class="names"><span class="app-name">' + esc(b.appName || 'MCMS') + '</span>' +
      (b.organizationName ? '<span class="org-name">' + esc(b.organizationName) + '</span>' : '<span class="org-name">Media Center Workspace</span>') + '</span>';
    return '<span class="logos">' + logos + '</span>' + names;
  }

  function applyBranding(b) {
    state.branding = b;
    if (b && b.appName) store.set('mcms.branding', b);
    document.title = (b && b.appName) ? b.appName : 'MCMS — Media Center Workspace';
    var brand = $('#brand');
    [brand, $('#brand-side')].forEach(function (el) {
      if (el) { el.innerHTML = brandMarkup(b); el.setAttribute('aria-label', (b.appName || 'MCMS') + ' — ke beranda'); }
    });
  }

  function loadBranding() {
    var cached = store.get('mcms.branding');
    if (cached && cached.appName) {
      // Logo & nama langsung tampil; versi terbaru diambil di latar belakang.
      applyBranding(cached);
      api('branding.getPublic').then(function (b) { if (stable(b) !== stable(cached)) applyBranding(b); }, function () {});
      return Promise.resolve(cached);
    }
    return api('branding.getPublic').then(function (b) { applyBranding(b); return b; }, function () {
      var fallback = { appName: 'MCMS — Media Center Workspace', tagline: 'Manage work. Build impact.', organizationName: '', logoMode: 'NONE' };
      applyBranding(fallback);
      return fallback;
    });
  }

  /* ---------------- Google Sign-In ---------------- */
  var gsiReady = null;
  function loadGsi() {
    if (DEMO) return Promise.resolve(false);
    if (gsiReady) return gsiReady;
    gsiReady = new Promise(function (resolve, reject) {
      if (window.google && window.google.accounts && window.google.accounts.id) return resolve(true);
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true; s.defer = true;
      s.onload = function () { resolve(true); };
      s.onerror = function () { gsiReady = null; reject(new Error('gsi')); };
      document.head.appendChild(s);
    });
    return gsiReady;
  }

  function renderGoogleButton(slot, onCredential) {
    return loadGsi().then(function () {
      window.google.accounts.id.initialize({
        client_id: CFG.GOOGLE_CLIENT_ID,
        callback: function (resp) { onCredential(resp.credential); },
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: 'popup',
        itp_support: true
      });
      var width = Math.min(360, Math.max(240, slot.clientWidth || 320));
      window.google.accounts.id.renderButton(slot, { type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', logo_alignment: 'left', locale: 'id', width: width });
    }).catch(function () {
      slot.innerHTML = '<div class="alert alert-error">' + icon('alert') + '<div><strong>Tombol Google gagal dimuat.</strong>Periksa koneksi internet, matikan pemblokir iklan untuk situs ini, lalu muat ulang halaman.</div></div>';
    });
  }

  /* ---------------- Halaman login & undangan ---------------- */
  function authShell(cardHtml) {
    var b = state.branding || {};
    return '<section class="auth-hero" aria-hidden="false">' +
      '<div><span class="demo-ribbon" ' + (DEMO ? '' : 'hidden') + '>' + icon('eye', 'width="14" height="14"') + ' MODE DEMO</span></div>' +
      '<div><h1>' + esc(b.tagline || 'Manage work. Build impact.') + '</h1>' +
      '<p class="lead">Proyek, konten kreatif, arsip bukti kerja, laporan, dan portofolio Media Center dalam satu workspace.</p>' +
      '<ul><li><span class="dot">' + icon('folder') + '</span>Kelola proyek & tugas harian</li>' +
      '<li><span class="dot">' + icon('image') + '</span>Arsip bukti kerja di Google Drive</li>' +
      '<li><span class="dot">' + icon('chart') + '</span>Laporan rapi untuk atasan</li></ul></div>' +
      '<p class="foot">' + esc(b.organizationName || 'Media Center Workspace') + ' · MCMS V1.0</p></section>' +
      '<section class="auth-panel"><div class="auth-card">' + cardHtml + '</div></section>';
  }

  function authBrand() {
    var b = state.branding || {};
    var markup = brandMarkup(b, { noNames: true });
    return '<div class="brand-lg"><div class="logos">' + markup.replace(/^<span class="logos">|<\/span>$/g, '') + '</div>' +
      '<div><div style="font:800 18px var(--font-head)">' + esc(b.appName || 'MCMS') + '</div>' +
      (b.organizationName ? '<div class="hint">' + esc(b.organizationName) + '</div>' : '') + '</div></div>';
  }

  function showAuthView() {
    $('#boot').hidden = true;
    $('#app-view').hidden = true;
    $('#auth-view').hidden = false;
  }

  function renderLogin(notice) {
    showAuthView();
    var configMissing = !isConfigured();
    var card = authBrand() +
      '<h2>Masuk ke workspace</h2>' +
      '<p class="muted">Gunakan akun Google yang terdaftar di MCMS.</p>' +
      '<div id="auth-msg" style="margin-top:20px">' + (notice ? '<div class="alert alert-info">' + icon('alert') + '<div>' + esc(notice) + '</div></div>' : '') + '</div>' +
      (configMissing
        ? '<div class="alert alert-warning" style="margin-top:20px">' + icon('settings') + '<div><strong>Aplikasi belum dikonfigurasi.</strong>Isi API_URL dan GOOGLE_CLIENT_ID di file config.js (lihat PANDUAN-SETUP).</div></div>'
        : DEMO
          ? '<div class="gsi-slot" style="flex-direction:column;gap:10px">' +
            '<button class="btn btn-primary btn-block" type="button" data-demo="OWNER">' + icon('user') + 'Masuk sebagai Pemilik (demo)</button>' +
            '<button class="btn btn-secondary btn-block" type="button" data-demo="SUPERVISOR">' + icon('eye') + 'Masuk sebagai Atasan (demo)</button></div>'
          : '<div class="gsi-slot" id="gsi-slot"></div>') +
      '<div class="auth-note">' + icon('shield') + '<div>Akun atasan dibuat melalui <b>undangan</b> dari pemilik. Belum menerima undangan? Hubungi pengelola Media Center.</div></div>';
    $('#auth-view').innerHTML = authShell(card);

    if (configMissing) return;
    if (DEMO) {
      $$('[data-demo]').forEach(function (btn) {
        btn.addEventListener('click', function () { doLogin(btn.getAttribute('data-demo'), btn); });
      });
    } else {
      renderGoogleButton($('#gsi-slot'), function (credential) { doLogin(credential, null); });
    }
  }

  function authMessage(type, text) {
    var box = $('#auth-msg');
    if (box) box.innerHTML = '<div class="alert alert-' + type + '" role="alert">' + icon(type === 'error' ? 'alert' : 'checkCircle') + '<div>' + esc(text) + '</div></div>';
  }

  function doLogin(credential, btn) {
    setLoading(btn, true);
    authMessage('info', 'Memeriksa akun…');
    var payload = DEMO ? { idToken: 'demo', demoRole: credential } : { idToken: credential };
    api('auth.login', payload).then(function (res) {
      startSession(res);
    }, function (err) {
      setLoading(btn, false);
      authMessage('error', err.message);
    });
  }

  function renderInvite(inviteToken) {
    showAuthView();
    var card = authBrand() +
      '<h2>Kamu diundang sebagai Atasan</h2>' +
      '<p class="muted">Masuk dengan akun Google yang menerima email undangan untuk mengaktifkan akses pemantauan.</p>' +
      '<div id="auth-msg" style="margin-top:20px"></div>' +
      (DEMO ? '<div class="gsi-slot"><button class="btn btn-primary btn-block" type="button" id="demo-accept">' + icon('check') + 'Terima undangan (demo)</button></div>'
        : '<div class="gsi-slot" id="gsi-slot"></div>') +
      '<div class="auth-note">' + icon('lock') + '<div>Akses atasan bersifat <b>baca saja</b>: melihat progres, aktivitas, bukti kerja yang dibagikan, dan laporan. Tautan undangan hanya bisa dipakai satu kali.</div></div>' +
      '<p style="text-align:center;margin-top:18px"><a href="#" id="to-login">Sudah punya akses? Masuk biasa</a></p>';
    $('#auth-view').innerHTML = authShell(card);
    $('#to-login').addEventListener('click', function (e) { e.preventDefault(); state.pendingInvite = null; renderLogin(); });

    var accept = function (credential, btn) {
      setLoading(btn, true);
      authMessage('info', 'Memverifikasi undangan…');
      api('auth.acceptInvite', { idToken: credential, inviteToken: inviteToken }).then(function (res) {
        state.pendingInvite = null;
        toast('Undangan diterima. Selamat datang!');
        startSession(res);
      }, function (err) {
        setLoading(btn, false);
        authMessage('error', err.message);
      });
    };
    if (DEMO) $('#demo-accept').addEventListener('click', function (e) { accept('demo', e.currentTarget); });
    else renderGoogleButton($('#gsi-slot'), function (c) { accept(c, null); });
  }

  /* ---------------- Sesi ---------------- */
  function startSession(res) {
    $('#toast-root').innerHTML = '';
    state.session = res.session;
    state.me = res.me;
    store.set(STORE_KEY, Object.assign({}, res.session, { me: res.me }));
    var saved = store.get(modeKey());
    state.mode = res.me.modes.indexOf(saved) >= 0 ? saved : res.me.modes[0];
    enterApp();
  }

  function handleSessionExpired(message) {
    if (!state.me && !state.session) return;
    cacheClear();
    state.session = null; state.me = null;
    store.del(STORE_KEY);
    closeOverlay();
    renderLogin(message || 'Sesi berakhir. Silakan masuk kembali.');
  }

  function logout() {
    var done = function () {
      state.session = null; state.me = null; NAV_BADGE = {};
      cacheClear(); state.lastView = '';
      $('#toast-root').innerHTML = '';
      store.del(STORE_KEY);
      if (!DEMO && window.google && window.google.accounts) window.google.accounts.id.disableAutoSelect();
      location.hash = '';
      renderLogin('Kamu sudah keluar.');
    };
    api('auth.logout').then(done, done);
  }

  /* ---------------- Navigasi ---------------- */
  var NAV = {
    personal: [
      { group: 'Workspace', items: [
        { id: 'overview', label: 'Beranda', icon: 'home' },
        { id: 'projects', label: 'Proyek', icon: 'folder' },
        { id: 'tasks', label: 'Tugas', icon: 'tasks' },
        { id: 'activity', label: 'Aktivitas', icon: 'activity' },
        { id: 'assets', label: 'Arsip & Bukti', icon: 'image' }
      ] },
      { group: 'Laporan', items: [
        { id: 'reports', label: 'Laporan', icon: 'report' },
        { id: 'feedback', label: 'Feedback Atasan', icon: 'message' }
      ] },
      { group: 'Sistem', items: [{ id: 'settings', label: 'Pengaturan', icon: 'settings' }] }
    ],
    executive: [
      { group: 'Mode Atasan', items: [
        { id: 'exec', label: 'Ringkasan', icon: 'grid' },
        { id: 'exec-requests', label: 'Permintaan', icon: 'send' },
        { id: 'exec-projects', label: 'Proyek', icon: 'folder' },
        { id: 'exec-activity', label: 'Aktivitas', icon: 'activity' },
        { id: 'exec-assets', label: 'Bukti Kerja', icon: 'image' },
        { id: 'exec-reports', label: 'Laporan', icon: 'report' }
      ] },
      { group: 'Akun', items: [{ id: 'settings', label: 'Pengaturan', icon: 'settings' }] }
    ]
  };
  var BOTTOM = {
    personal: ['overview', 'tasks', '__create', 'projects', '__more'],
    executive: ['exec', 'exec-requests', 'exec-projects', 'exec-reports', '__more']
  };
  var SHORT = { 'exec-requests': 'Permintaan', overview: 'Beranda', tasks: 'Tugas', projects: 'Proyek', exec: 'Ringkasan', 'exec-projects': 'Proyek', 'exec-reports': 'Laporan', 'exec-activity': 'Aktivitas' };

  function navItems(mode) {
    var out = [];
    NAV[mode].forEach(function (g) { g.items.forEach(function (i) { out.push(i); }); });
    return out;
  }
  function homeOf(mode) { return mode === 'executive' ? 'exec' : 'overview'; }

  function parseRoute() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var parts = h.split('/');
    return { page: parts[0] || '', sub: decodeURIComponent(parts[1] || ''), rest: parts.slice(2).map(decodeURIComponent) };
  }

  var NAV_BADGE = {};
  function setNavBadge(id, n) { NAV_BADGE[id] = n > 0 ? n : 0; if (state.me) renderNav(); }
  function renderNav() {
    var mode = state.mode;
    var current = parseRoute().page;
    $('#side-nav').innerHTML = NAV[mode].map(function (g) {
      return '<div class="nav-group"><div class="nav-label">' + esc(g.group) + '</div>' + g.items.map(function (i) {
        return '<a class="nav-link" href="#/' + i.id + '"' + (current === i.id ? ' aria-current="page"' : '') + ' title="' + esc(i.label) + '">' +
          icon(i.icon) + '<span>' + esc(i.label) + '</span>' + (NAV_BADGE[i.id] ? '<span class="nav-count" aria-label="' + NAV_BADGE[i.id] + ' baru">' + NAV_BADGE[i.id] + '</span>' : '') + '</a>';
      }).join('') + '</div>';
    }).join('');

    var all = navItems(mode);
    $('#bottom-nav').innerHTML = BOTTOM[mode].map(function (id) {
      if (id === '__create') return '<button class="bn-create" type="button" data-create aria-label="Buat baru">' + icon('plus') + '</button>';
      if (id === '__more') return '<button class="bn-item" type="button" data-more>' + icon('menu') + '<span>Lainnya</span></button>';
      var it = all.filter(function (x) { return x.id === id; })[0];
      return '<a class="bn-item" href="#/' + id + '"' + (current === id ? ' aria-current="page"' : '') + '>' + icon(it.icon) + '<span>' + esc(SHORT[id] || it.label) + '</span></a>';
    }).join('');
    var bn = $('#bottom-nav');
    var c = $('[data-create]', bn); if (c) c.addEventListener('click', openCreateSheet);
    var m = $('[data-more]', bn); if (m) m.addEventListener('click', openMoreSheet);
  }

  function renderModeSwitch() {
    var el = $('#mode-switch');
    var modes = state.me.modes;
    if (modes.length < 2) {
      el.className = '';
      el.innerHTML = '<span class="mode-pill">' + icon('eye') + '<span>Mode Atasan</span></span>';
      return;
    }
    el.className = 'mode-switch';
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', 'Pilih mode dashboard');
    el.innerHTML = [['personal', 'user', 'Saya'], ['executive', 'eye', 'Atasan']].map(function (m) {
      return '<button type="button" data-mode="' + m[0] + '" aria-pressed="' + (state.mode === m[0]) + '">' + icon(m[1]) +
        '<span><span class="lbl-long">Mode </span>' + m[2] + '</span></button>';
    }).join('');
    $$('[data-mode]', el).forEach(function (b) {
      b.addEventListener('click', function () { switchMode(b.getAttribute('data-mode')); });
    });
  }

  function renderSearchButton() {
    var btn = $('#btn-search');
    if (!btn) return;
    btn.hidden = !(state.me && state.me.role === 'OWNER' && state.mode === 'personal');
    btn.innerHTML = icon('search') + '<span class="lbl">Cari…</span><kbd>/</kbd>';
  }

  function switchMode(mode) {
    if (state.me.modes.indexOf(mode) < 0 || state.mode === mode) return;
    state.mode = mode;
    store.set(modeKey(), mode);
    renderModeSwitch();
    renderSearchButton();
    toast(mode === 'executive' ? 'Mode Atasan aktif — tampilan sama seperti yang dilihat atasan.' : 'Kembali ke Mode Saya.');
    location.hash = '#/' + homeOf(mode);
  }

  function renderModeBanner() {
    var el = $('#mode-banner');
    if (state.mode === 'executive' && state.me.role === 'OWNER') {
      el.className = 'mode-banner';
      el.innerHTML = '<div class="alert alert-info">' + icon('eye') + '<div class="grow"><strong>Kamu sedang melihat Mode Atasan.</strong>Tampilan ini sama persis dengan yang dilihat atasan. Data berstatus pribadi tidak ditampilkan.</div>' +
        '<button class="btn btn-secondary btn-sm" type="button" id="back-personal">' + icon('user') + 'Kembali ke Mode Saya</button></div>';
      $('#back-personal').addEventListener('click', function () { switchMode('personal'); });
    } else {
      el.className = ''; el.innerHTML = '';
    }
  }

  function renderUserMenu() {
    var me = state.me;
    var avatar = '<span class="avatar">' + (safeHttps(me.photoUrl) ? '<img src="' + esc(me.photoUrl) + '" alt="" referrerpolicy="no-referrer">' : esc(initials(me.displayName))) + '</span>';
    var btn = $('#btn-user');
    btn.innerHTML = avatar;
    btn.setAttribute('aria-label', 'Menu akun ' + me.displayName);
    var pop = $('#user-popover');
    pop.innerHTML = '<div class="who"><strong>' + esc(me.displayName) + '</strong><span>' + esc(me.email) + '</span>' +
      '<div style="margin-top:8px"><span class="badge ' + (me.role === 'OWNER' ? 'badge-primary' : 'badge-info') + '">' + icon('shield') + (me.role === 'OWNER' ? 'Pemilik' : 'Atasan') + '</span></div></div>' +
      '<a class="menu-item" role="menuitem" href="#/settings/profile">' + icon('user') + 'Profil saya</a>' +
      (me.role === 'OWNER' ? '<a class="menu-item" role="menuitem" href="#/settings/branding">' + icon('palette') + 'Logo & identitas</a>' +
        '<a class="menu-item" role="menuitem" href="#/settings/accounts">' + icon('users') + 'Kelola atasan</a>' : '') +
      '<button class="menu-item danger" role="menuitem" type="button" id="btn-logout">' + icon('logout') + 'Keluar</button>';
    $('#btn-logout').addEventListener('click', function () { togglePopover(false); logout(); });
    $$('a.menu-item', pop).forEach(function (a) { a.addEventListener('click', function () { togglePopover(false); }); });
  }
  function togglePopover(force) {
    var pop = $('#user-popover'), btn = $('#btn-user');
    var open = force === undefined ? pop.hidden : force;
    pop.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) { var f = $('.menu-item', pop); if (f) f.focus(); }
  }

  function openCreateSheet() {
    var items = [
      ['task', 'tasks', 'Tugas baru', 'Catat pekerjaan proyek atau mandiri'],
      ['activity', 'activity', 'Catat aktivitas', 'Input cepat 10–30 detik'],
      ['project', 'folder', 'Proyek baru', 'Buat proyek dengan deadline & folder Drive'],
      ['upload', 'upload', 'Unggah bukti / file', 'Simpan ke Google Drive'],
      ['report', 'report', 'Buat laporan', 'Harian, mingguan, atau bulanan']
    ];
    var ov = openOverlay('<div class="dialog-head"><div><h2 id="dlg-title">Buat baru</h2></div>' +
      '<button class="icon-btn" type="button" data-close aria-label="Tutup" style="margin-left:auto">' + icon('x') + '</button></div>' +
      '<div class="sheet-list" style="padding-bottom:22px">' + items.map(function (i) {
        return '<button class="sheet-item" type="button" data-create-type="' + i[0] + '"><span class="dot-ico">' + icon(i[1]) + '</span><span class="grow"><span class="t">' + esc(i[2]) + '</span><span class="d">' + esc(i[3]) + '</span></span>' + icon('arrowRight', 'width="18" height="18"') + '</button>';
      }).join('') + '</div>', { sheet: true });
    $('[data-close]', ov).addEventListener('click', closeOverlay);
    $$('[data-create-type]', ov).forEach(function (b) {
      b.addEventListener('click', function () { var t = b.getAttribute('data-create-type'); closeOverlay(); MC.create(t); });
    });
  }

  function openMoreSheet() {
    var shown = BOTTOM[state.mode];
    var rest = navItems(state.mode).filter(function (i) { return shown.indexOf(i.id) < 0; });
    var ov = openOverlay('<div class="dialog-head"><div><h2 id="dlg-title">Menu lainnya</h2></div>' +
      '<button class="icon-btn" type="button" data-close aria-label="Tutup" style="margin-left:auto">' + icon('x') + '</button></div>' +
      '<div class="sheet-list" style="padding-bottom:22px">' + rest.map(function (i) {
        return '<a class="sheet-item" href="#/' + i.id + '" data-go><span class="dot-ico">' + icon(i.icon) + '</span><span class="grow"><span class="t">' + esc(i.label) + '</span></span>' +
          (NAV_BADGE[i.id] ? '<span class="nav-count">' + NAV_BADGE[i.id] + '</span>' : icon('arrowRight', 'width="18" height="18"')) + '</a>';
      }).join('') +
      '<button class="sheet-item" type="button" data-logout><span class="dot-ico" style="background:var(--danger-bg);color:var(--danger-text)">' + icon('logout') + '</span><span class="grow"><span class="t">Keluar</span></span></button>' +
      '</div>', { sheet: true });
    $('[data-close]', ov).addEventListener('click', closeOverlay);
    $$('[data-go]', ov).forEach(function (a) { a.addEventListener('click', function () { closeOverlay(); }); });
    $('[data-logout]', ov).addEventListener('click', function () { closeOverlay(); logout(); });
  }

  /* ---------------- Masuk ke aplikasi ---------------- */
  var shellBound = false;
  function enterApp() {
    $('#boot').hidden = true;
    $('#auth-view').hidden = true;
    $('#auth-view').innerHTML = '';
    $('#app-view').hidden = false;
    applyBranding(state.branding || {});
    renderModeSwitch();
    renderUserMenu();
    renderSearchButton();
    if (!shellBound) {
      shellBound = true;
      window.addEventListener('hashchange', route);
      $('#btn-user').addEventListener('click', function (e) { e.stopPropagation(); togglePopover(); });
      document.addEventListener('click', function (e) {
        var pop = $('#user-popover');
        if (!pop.hidden && !pop.contains(e.target)) togglePopover(false);
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#user-popover').hidden) { togglePopover(false); $('#btn-user').focus(); } });
      var col = $('#btn-collapse');
      col.innerHTML = icon('sidebar');
      col.addEventListener('click', function () {
        var app = $('#app-view');
        var exp = !app.classList.contains('expanded');
        app.classList.toggle('expanded', exp);
        col.setAttribute('aria-expanded', String(exp));
      });
      $('#side-nav').addEventListener('click', function (e) {
        if (e.target.closest('.nav-link') && window.innerWidth < 1024) $('#app-view').classList.remove('expanded');
      });
    }
    NAV_BADGE = {};
    var r = parseRoute();
    if (!r.page) location.hash = '#/' + homeOf(state.mode);
    else route();
    if (window.MC && MC.refreshFeedbackBadge) MC.refreshFeedbackBadge();
  }

  var PAGES = {};
  function route() {
    if (!state.me) return;
    var r = parseRoute();
    var allowed = navItems(state.mode).map(function (i) { return i.id; });
    // Halaman di luar mode aktif → arahkan ke beranda mode (izin tetap dicek server)
    if (allowed.indexOf(r.page) < 0) {
      // OWNER membuka halaman personal dari mode atasan → pindah mode otomatis
      if (state.me.modes.indexOf('personal') >= 0 && navItems('personal').some(function (i) { return i.id === r.page; })) {
        state.mode = 'personal'; store.set(modeKey(), 'personal'); renderModeSwitch();
      } else if (state.me.modes.indexOf('executive') >= 0 && navItems('executive').some(function (i) { return i.id === r.page; })) {
        state.mode = 'executive'; store.set(modeKey(), 'executive'); renderModeSwitch();
      } else {
        location.replace('#/' + homeOf(state.mode));
        return;
      }
    }
    state.route = r.page;
    renderNav();
    renderModeBanner();
    var item = navItems(state.mode).filter(function (i) { return i.id === r.page; })[0];
    var main = $('#main');
    var render = PAGES[r.page];
    if (!render) { location.replace('#/' + homeOf(state.mode)); return; }
    closeOverlay();
    render(main, r.sub, r.rest);
    window.scrollTo(0, 0);
    focusHeading();
  }

  /** Fokus ke judul halaman setelah pindah halaman (pembaca layar mengumumkan halaman baru). */
  function focusHeading() {
    var h = $('#main h1');
    if (h && !$('#overlay-root').innerHTML) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  /* ---------------- Komponen ---------------- */
  function statCard(o) {
    var tag = o.href ? 'a' : 'div';
    return '<' + tag + ' class="card stat tone-' + o.tone + '"' + (o.href ? ' href="' + o.href + '"' : '') + '>' +
      '<div class="top"><span class="label">' + esc(o.label) + '</span><span class="ico">' + icon(o.icon) + '</span></div>' +
      '<div class="value num">' + esc(o.value) + '</div>' + (o.meta ? '<div class="meta">' + esc(o.meta) + '</div>' : '') + '</' + tag + '>';
  }
  function emptyState(ic, title, text, action) {
    return '<div class="empty"><div class="art">' + icon(ic) + '</div><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' + (action || '') + '</div>';
  }
  function errorState(main, err, retry) {
    if (!main || !document.body.contains(main)) return;
    main.innerHTML = '<div class="page"><div class="card card-pad">' +
      '<div class="empty"><div class="art" style="background:var(--danger-bg);color:var(--danger-text)">' + icon('alert') + '</div>' +
      '<h3>Data belum bisa dimuat</h3><p>' + esc(err.message) + '</p>' +
      '<button class="btn btn-primary" type="button" id="retry">' + icon('refresh') + 'Coba lagi</button></div></div></div>';
    $('#retry').addEventListener('click', retry);
  }
  function skeletonPage(main) {
    var s = function (h, w) { return '<div class="skeleton" style="height:' + h + 'px;width:' + (w || '100%') + '"></div>'; };
    main.innerHTML = '<div class="page" aria-busy="true"><span class="sr-only" role="status">Memuat data…</span>' + s(28, '40%') + '<div style="height:20px"></div>' +
      '<div class="grid grid-stats">' + [1, 2, 3, 4].map(function () { return '<div class="card card-pad">' + s(14, '60%') + '<div style="height:14px"></div>' + s(30, '40%') + '</div>'; }).join('') + '</div>' +
      '<div style="height:24px"></div><div class="grid grid-main"><div class="card card-pad">' + s(18, '30%') + '<div style="height:16px"></div>' + s(46) + '<div style="height:10px"></div>' + s(46) + '</div>' +
      '<div class="card card-pad">' + s(18, '40%') + '<div style="height:16px"></div>' + s(46) + '</div></div></div>';
  }
  var STATUS_LABEL = { TODO: ['Belum mulai', 'neutral'], IN_PROGRESS: ['Dikerjakan', 'primary'], REVIEW: ['Review', 'info'], DONE: ['Selesai', 'success'],
    CANCELLED: ['Batal', 'neutral'], PLANNING: ['Perencanaan', 'neutral'], ON_HOLD: ['Ditunda', 'warning'], ARCHIVED: ['Arsip', 'neutral'] };
  function statusBadge(s) {
    var m = STATUS_LABEL[s] || [s || '—', 'neutral'];
    return '<span class="badge badge-' + m[1] + '">' + esc(m[0]) + '</span>';
  }
  function progressRow(p) {
    if (p === null || p === undefined) return '<span class="hint">Belum cukup data</span>';
    return '<div class="progress-row"><div class="progress" role="progressbar" aria-valuenow="' + p + '" aria-valuemin="0" aria-valuemax="100" aria-label="Progres"><span style="width:' + p + '%"></span></div><span class="pct">' + p + '%</span></div>';
  }
  function taskList(items, emptyTitle, emptyText) {
    if (!items || !items.length) return emptyState('tasks', emptyTitle, emptyText);
    return '<ul class="list">' + items.map(function (t) {
      return '<li class="list-item"><span class="dot-ico">' + icon('tasks') + '</span><div class="main"><div class="title">' + esc(t.title) + '</div>' +
        '<div class="meta">' + (t.standalone ? '<span class="badge badge-neutral">Mandiri</span>' : esc(t.projectName)) +
        (t.dueDate ? '<span>' + icon('clock', 'width="13" height="13"') + ' ' + esc(fmtDate(t.dueDate)) + '</span>' : '') + '</div></div>' + statusBadge(t.status) + '</li>';
    }).join('') + '</ul>';
  }
  function projectList(items, emptyText) {
    if (!items || !items.length) return emptyState('folder', 'Belum ada proyek aktif', emptyText);
    return '<ul class="list">' + items.map(function (p) {
      return '<li class="list-item" style="display:block"><div style="display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:8px">' +
        '<div class="title" style="min-width:0">' + esc(p.name) + '</div><div style="display:flex;gap:6px">' + (p.overdue ? '<span class="badge badge-danger">' + icon('alert') + 'Terlambat</span>' : '') + statusBadge(p.status) + '</div></div>' +
        progressRow(p.progress) + '<div class="meta" style="margin-top:6px">' + esc(p.taskCount) + ' tugas' + (p.dueDate ? ' · Deadline ' + esc(fmtDate(p.dueDate)) : '') + '</div></li>';
    }).join('') + '</ul>';
  }
  function activityList(items, emptyText) {
    if (!items || !items.length) return emptyState('activity', 'Belum ada aktivitas', emptyText);
    return '<ul class="list">' + items.map(function (a) {
      return '<li class="list-item"><span class="dot-ico">' + icon('activity') + '</span><div class="main"><div class="title">' + esc(a.title) + '</div>' +
        '<div class="meta">' + esc(fmtDate(a.date, true)) + (a.result ? ' · ' + esc(a.result) : '') + '</div></div></li>';
    }).join('') + '</ul>';
  }

  /* ---------------- Halaman: Settings ---------------- */
  PAGES.settings = function (main, sub) {
    var owner = state.me.role === 'OWNER';
    var tabs = owner
      ? [['branding', 'palette', 'Logo & identitas'], ['accounts', 'users', 'Akun & atasan'], ['categories', 'tag', 'Kategori'], ['profile', 'user', 'Profil'], ['system', 'server', 'Sistem & data']]
      : [['profile', 'user', 'Profil']];
    var ids = tabs.map(function (t) { return t[0]; });
    if (ids.indexOf(sub) < 0) sub = ids[0];
    main.innerHTML = '<div class="page"><div class="page-head"><div><div class="eyebrow">Settings</div><h1>Pengaturan</h1>' +
      '<p class="sub">' + (owner ? 'Atur identitas workspace, akses atasan, dan profil kamu.' : 'Atur profil akun kamu.') + '</p></div></div>' +
      '<div class="tabs" role="tablist" aria-label="Bagian pengaturan">' + tabs.map(function (t) {
        return '<a class="tab" role="tab" href="#/settings/' + t[0] + '" aria-selected="' + (t[0] === sub) + '">' + icon(t[1]) + esc(t[2]) + '</a>';
      }).join('') + '</div><div id="settings-body" role="tabpanel"></div></div>';
    var body = $('#settings-body');
    ({ branding: settingsBranding, accounts: settingsAccounts, profile: settingsProfile, system: settingsSystem, categories: function (b) { MC.settingsCategories(b); } })[sub](body);
  };

  /* ----- Branding ----- */
  /** Kompres gambar di browser: maks 320px, hasil ≤ 70KB (PNG, lalu WEBP bila perlu). */
  function processLogo(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return reject(new Error('Tidak ada file.'));
      if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) return reject(new Error('Format tidak didukung. Gunakan PNG, JPG, WEBP, atau SVG.'));
      if (file.size > 5 * 1024 * 1024) return reject(new Error('File terlalu besar (maks 5 MB).'));
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var w = img.naturalWidth || 512, h = img.naturalHeight || 512;
          var attempts = [[320, 'image/png'], [320, 'image/webp'], [240, 'image/webp'], [180, 'image/webp']];
          for (var i = 0; i < attempts.length; i++) {
            var max = attempts[i][0], type = attempts[i][1];
            var scale = Math.min(1, max / Math.max(w, h));
            var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
            var canvas = document.createElement('canvas');
            canvas.width = cw; canvas.height = ch;
            var ctx = canvas.getContext('2d');
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, cw, ch);
            var data = canvas.toDataURL(type, 0.9);
            if (data.indexOf('data:' + type) !== 0) continue; // browser tidak mendukung tipe ini
            var bytes = Math.floor((data.length - data.indexOf(',') - 1) * 3 / 4);
            if (bytes <= 70 * 1024) { URL.revokeObjectURL(url); return resolve({ dataUrl: data, bytes: bytes, width: cw, height: ch }); }
          }
          URL.revokeObjectURL(url);
          reject(new Error('Logo terlalu rumit untuk dikompres. Coba gambar yang lebih sederhana.'));
        } catch (e) { URL.revokeObjectURL(url); reject(new Error('Gambar tidak dapat diproses.')); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('File gambar rusak atau tidak dapat dibaca.')); };
      img.src = url;
    });
  }

  function settingsBranding(body) {
    var saved = state.branding || {};
    var form = {
      appName: saved.appName || '', tagline: saved.tagline || '', organizationName: saved.organizationName || '',
      logoAlt: saved.logoAlt || '', logoMode: saved.logoMode || 'NONE',
      primary: { action: 'keep', preview: safeImg(saved.primaryLogo) },
      secondary: { action: 'keep', preview: safeImg(saved.secondaryLogo) }
    };
    var initial = JSON.stringify(form);

    function uploader(key, title, desc) {
      return '<div class="uploader" data-up="' + key + '"><div><div class="title">' + esc(title) + '</div><div class="hint">' + esc(desc) + '</div></div>' +
        '<div class="logo-box" data-box="' + key + '"></div>' +
        '<div class="actions"><label class="btn btn-secondary btn-sm" style="cursor:pointer">' + icon('upload') + '<span data-pick-label="' + key + '">Pilih gambar</span>' +
        '<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" data-file="' + key + '" class="sr-only"></label>' +
        '<button class="btn btn-danger btn-sm" type="button" data-remove="' + key + '">' + icon('trash') + 'Hapus</button></div>' +
        '<div class="field-error" data-err="' + key + '" role="alert" hidden></div></div>';
    }
    var modes = [['MEDIA', 'Logo Media Center', 'Hanya logo utama'], ['SCHOOL', 'Logo Sekolah', 'Hanya logo sekolah'],
      ['BOTH', 'Keduanya', 'Media Center + sekolah'], ['NONE', 'Tanpa logo', 'Tampilkan inisial MC']];

    body.innerHTML = '<div class="settings-grid"><form class="card" id="brand-form" novalidate>' +
      '<div class="card-head"><div><h2>Identitas workspace</h2><p>Tampil di header aplikasi, halaman login, Mode Saya, dan Mode Atasan.</p></div></div>' +
      '<div class="card-body">' +
      '<div class="field"><label class="label" for="f-app">Nama aplikasi <span class="req" aria-hidden="true">*</span></label>' +
      '<input class="input" id="f-app" name="appName" maxlength="60" required aria-describedby="c-app"><span class="counter" id="c-app"></span><div class="field-error" id="e-app" hidden></div></div>' +
      '<div class="field-row" style="margin-top:16px"><div class="field"><label class="label" for="f-org">Nama sekolah / lembaga</label>' +
      '<input class="input" id="f-org" name="organizationName" maxlength="80" placeholder="Contoh: SMA Harapan Bangsa"></div>' +
      '<div class="field" style="margin-top:0"><label class="label" for="f-tag">Slogan (halaman login)</label>' +
      '<input class="input" id="f-tag" name="tagline" maxlength="80" placeholder="Manage work. Build impact."></div></div>' +
      '<h3 style="margin:26px 0 4px">Logo</h3><p class="hint" style="margin-bottom:14px">PNG, JPG, WEBP, atau SVG. Gambar otomatis diperkecil agar cepat dimuat. Disarankan latar transparan.</p>' +
      '<div class="uploader-grid">' + uploader('primary', 'Logo Media Center', 'Identitas utama') + uploader('secondary', 'Logo Sekolah', 'Identitas pendamping') + '</div>' +
      '<fieldset style="border:0;padding:0;margin:24px 0 0"><legend class="label" style="margin-bottom:10px">Logo yang ditampilkan</legend><div class="choice-grid">' +
      modes.map(function (m) {
        return '<label class="choice"><input type="radio" name="logoMode" value="' + m[0] + '"><span class="radio" aria-hidden="true"></span><span><span class="ct">' + m[1] + '</span><br><span class="cd">' + m[2] + '</span></span></label>';
      }).join('') + '</div><div class="field-error" id="e-mode" role="alert" hidden style="margin-top:8px"></div></fieldset>' +
      '<div class="field" style="margin-top:20px"><label class="label" for="f-alt">Deskripsi logo <span class="hint">(untuk pembaca layar)</span></label>' +
      '<input class="input" id="f-alt" name="logoAlt" maxlength="120" placeholder="Logo Media Center SMA Harapan"></div>' +
      '</div>' +
      '<div class="action-bar"><span class="status" id="brand-status" aria-live="polite">' + icon('checkCircle', 'width="16" height="16"') + 'Semua perubahan tersimpan</span>' +
      '<button class="btn btn-secondary" type="button" id="brand-reset">Batalkan perubahan</button>' +
      '<button class="btn btn-primary" type="submit" id="brand-save">' + icon('check') + 'Simpan perubahan</button></div></form>' +
      '<aside class="card sticky" aria-label="Pratinjau"><div class="card-head"><div><h2>Pratinjau langsung</h2><p>Begini header akan terlihat</p></div></div>' +
      '<div class="card-body"><div class="preview-frame"><div class="preview-top"><span class="brand" id="pv-desktop"></span></div>' +
      '<div class="preview-body"><div class="skeleton" style="width:55%"></div><div class="skeleton" style="width:80%"></div><div class="skeleton" style="width:40%"></div></div></div>' +
      '<div class="preview-phone" aria-hidden="true"><div class="preview-top"><span class="brand" id="pv-mobile"></span></div><div class="preview-body"><div class="skeleton" style="width:70%"></div><div class="skeleton" style="width:50%"></div></div></div>' +
      '</div></aside></div>';

    var f = $('#brand-form');
    var fields = { appName: $('#f-app'), organizationName: $('#f-org'), tagline: $('#f-tag'), logoAlt: $('#f-alt') };

    function sync() {
      Object.keys(fields).forEach(function (k) { if (fields[k].value !== form[k]) fields[k].value = form[k]; });
      $$('input[name=logoMode]', f).forEach(function (r) { r.checked = r.value === form.logoMode; });
      ['primary', 'secondary'].forEach(function (k) {
        var p = form[k].preview;
        $('[data-box="' + k + '"]').innerHTML = p ? '<img src="' + p + '" alt="Pratinjau ' + (k === 'primary' ? 'logo Media Center' : 'logo sekolah') + '">' :
          '<span class="placeholder">' + icon('image') + 'Belum ada logo</span>';
        $('[data-remove="' + k + '"]').hidden = !p;
        $('[data-pick-label="' + k + '"]').textContent = p ? 'Ganti gambar' : 'Pilih gambar';
      });
      $('#c-app').textContent = form.appName.length + '/60';
      var pv = { appName: form.appName || 'Nama aplikasi', organizationName: form.organizationName, logoMode: form.logoMode, logoAlt: form.logoAlt,
        primaryLogo: form.primary.preview, secondaryLogo: form.secondary.preview };
      $('#pv-desktop').innerHTML = brandMarkup(pv);
      $('#pv-mobile').innerHTML = brandMarkup(pv);
      var dirty = JSON.stringify(form) !== initial;
      var stEl = $('#brand-status');
      stEl.className = 'status' + (dirty ? ' dirty' : '');
      stEl.innerHTML = dirty ? icon('alert', 'width="16" height="16"') + 'Ada perubahan yang belum disimpan' : icon('checkCircle', 'width="16" height="16"') + 'Semua perubahan tersimpan';
      $('#brand-reset').disabled = !dirty;
      $('#brand-save').disabled = !dirty;
    }

    Object.keys(fields).forEach(function (k) {
      fields[k].addEventListener('input', function () { form[k] = fields[k].value; if (k === 'appName') { $('#e-app').hidden = true; fields.appName.removeAttribute('aria-invalid'); } sync(); });
    });
    $$('input[name=logoMode]', f).forEach(function (r) {
      r.addEventListener('change', function () { form.logoMode = r.value; $('#e-mode').hidden = true; sync(); });
    });

    function hasLogo(k) { return !!form[k].preview; }
    function handleFile(key, file) {
      var err = $('[data-err="' + key + '"]');
      err.hidden = true;
      processLogo(file).then(function (res) {
        form[key] = { action: 'replace', preview: res.dataUrl, dataUrl: res.dataUrl };
        // Otomatis memilih mode yang masuk akal → pengguna tidak perlu berpikir
        if (form.logoMode === 'NONE') form.logoMode = key === 'primary' ? 'MEDIA' : 'SCHOOL';
        else if ((form.logoMode === 'MEDIA' && key === 'secondary') || (form.logoMode === 'SCHOOL' && key === 'primary')) form.logoMode = 'BOTH';
        sync();
        toast('Logo siap. Klik "Simpan perubahan" untuk menerapkan.');
      }, function (e) { err.innerHTML = icon('alert', 'width="14" height="14"') + esc(e.message); err.hidden = false; });
    }
    ['primary', 'secondary'].forEach(function (key) {
      var input = $('[data-file="' + key + '"]');
      input.addEventListener('change', function () { if (input.files[0]) handleFile(key, input.files[0]); input.value = ''; });
      var zone = $('[data-up="' + key + '"]');
      ['dragenter', 'dragover'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('drag'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('drag'); }); });
      zone.addEventListener('drop', function (e) { var file = e.dataTransfer.files[0]; if (file) handleFile(key, file); });
      $('[data-remove="' + key + '"]').addEventListener('click', function () {
        form[key] = { action: 'remove', preview: '' };
        if (form.logoMode === 'BOTH') form.logoMode = key === 'primary' ? (hasLogo('secondary') ? 'SCHOOL' : 'NONE') : (hasLogo('primary') ? 'MEDIA' : 'NONE');
        else if ((form.logoMode === 'MEDIA' && key === 'primary') || (form.logoMode === 'SCHOOL' && key === 'secondary')) form.logoMode = 'NONE';
        sync();
      });
    });

    $('#brand-reset').addEventListener('click', function () { form = JSON.parse(initial); sync(); toast('Perubahan dibatalkan.'); });

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      if (form.appName.trim().length < 2) {
        $('#e-app').innerHTML = icon('alert', 'width="14" height="14"') + 'Nama aplikasi minimal 2 karakter.'; $('#e-app').hidden = false;
        fields.appName.setAttribute('aria-invalid', 'true'); fields.appName.focus(); ok = false;
      }
      var need = { MEDIA: ['primary'], SCHOOL: ['secondary'], BOTH: ['primary', 'secondary'], NONE: [] }[form.logoMode];
      var missing = need.filter(function (k) { return !hasLogo(k); });
      if (missing.length) {
        $('#e-mode').innerHTML = icon('alert', 'width="14" height="14"') + 'Unggah ' + (missing[0] === 'primary' ? 'logo Media Center' : 'logo sekolah') + ' terlebih dahulu, atau pilih opsi lain.';
        $('#e-mode').hidden = false; ok = false;
      }
      if (!ok) return;
      var btn = $('#brand-save');
      setLoading(btn, true);
      var change = function (k) { return form[k].action === 'replace' ? { action: 'replace', dataUrl: form[k].dataUrl } : { action: form[k].action }; };
      api('branding.save', {
        appName: form.appName.trim(), tagline: form.tagline, organizationName: form.organizationName, logoAlt: form.logoAlt,
        logoMode: form.logoMode, primaryLogo: change('primary'), secondaryLogo: change('secondary')
      }).then(function (b) {
        applyBranding(b);
        toast('Branding tersimpan dan langsung diterapkan.');
        settingsBranding(body);
      }, function (err) {
        setLoading(btn, false);
        toast(err.message, 'error');
      });
    });
    sync();
  }

  /* ----- Akun & atasan ----- */
  var USER_STATUS = {
    ACTIVE: ['Aktif', 'success', 'checkCircle'], INVITED: ['Menunggu', 'warning', 'mail'], EXPIRED: ['Kedaluwarsa', 'danger', 'clock'],
    REVOKED: ['Dicabut', 'neutral', 'ban'], SUSPENDED: ['Dinonaktifkan', 'warning', 'pause']
  };
  function settingsAccounts(body) {
    body.innerHTML = '<div class="grid grid-main">' +
      '<section class="card"><div class="card-head"><div><h2>Daftar akun</h2><p>Kelola siapa yang bisa memantau pekerjaan kamu</p></div></div><div class="card-body" id="user-list"><div class="skeleton" style="height:64px"></div></div></section>' +
      '<div class="stack"><form class="card" id="invite-form" novalidate><div class="card-head"><div><h2>Undang atasan</h2><p>Atasan masuk dengan akun Google (Gmail) yang kamu undang.</p></div></div>' +
      '<div class="card-body"><div class="field"><label class="label" for="i-email">Email Google atasan <span class="req" aria-hidden="true">*</span></label>' +
      '<input class="input" id="i-email" type="email" inputmode="email" autocomplete="off" placeholder="nama@gmail.com" required><div class="field-error" id="e-email" role="alert" hidden></div></div>' +
      '<div class="field"><label class="label" for="i-name">Nama <span class="hint">(opsional)</span></label><input class="input" id="i-name" maxlength="80" placeholder="Contoh: Bapak Kepala Sekolah"></div>' +
      '<button class="btn btn-primary btn-block" type="submit" id="invite-btn" style="margin-top:18px">' + icon('send') + 'Buat & kirim undangan</button>' +
      '<div id="invite-result" style="margin-top:16px"></div></div></form>' +
      '<div class="card card-pad"><h3>Apa yang bisa dilihat atasan?</h3><ul class="feature-list" style="grid-template-columns:1fr;margin-top:10px">' +
      ['Ringkasan & progres proyek', 'Aktivitas dan bukti kerja yang kamu bagikan', 'Laporan periodik'].map(function (x) { return '<li>' + icon('check') + '<span>' + x + '</span></li>'; }).join('') +
      '<li>' + icon('lock', 'style="color:var(--danger-text)"') + '<span>Tidak bisa mengubah data, dan tidak melihat catatan/draf pribadi</span></li></ul></div></div></div>';

    function loadUsers() {
      var list = $('#user-list');
      api('users.list').then(function (users) {
        if (!$('#user-list')) return;
        var others = users.filter(function (u) { return u.role !== 'OWNER'; });
        list.innerHTML = users.map(function (u) {
          var st = USER_STATUS[u.status] || [u.status, 'neutral', 'alert'];
          var isOwner = u.role === 'OWNER';
          var acts = [];
          if (!isOwner) {
            if (['INVITED', 'EXPIRED', 'REVOKED'].indexOf(u.status) >= 0) acts.push(['resend', 'send', u.status === 'INVITED' ? 'Kirim ulang' : 'Undang lagi', 'btn-secondary']);
            if (u.status === 'ACTIVE') acts.push(['suspend', 'pause', 'Nonaktifkan', 'btn-secondary']);
            if (u.status === 'SUSPENDED') acts.push(['reactivate', 'refresh', 'Aktifkan kembali', 'btn-secondary']);
            if (['ACTIVE', 'SUSPENDED', 'INVITED'].indexOf(u.status) >= 0) acts.push(['revoke', 'ban', u.status === 'INVITED' ? 'Batalkan' : 'Cabut akses', 'btn-danger']);
          }
          var meta = isOwner ? 'Login terakhir: ' + fmtDate(u.lastLogin, true)
            : u.status === 'ACTIVE' || u.status === 'SUSPENDED' ? 'Aktif sejak ' + fmtDate(u.acceptedAt) + ' · Login terakhir: ' + fmtDate(u.lastLogin, true)
              : u.status === 'INVITED' ? 'Diundang ' + fmtDate(u.invitedAt) + ' · Berlaku sampai ' + fmtDate(u.invitationExpiresAt, true)
                : 'Diundang ' + fmtDate(u.invitedAt);
          return '<div class="user-card"><span class="avatar">' + esc(initials(u.displayName || u.email)) + '</span><div class="info">' +
            '<div class="name">' + esc(u.displayName || u.email.split('@')[0]) + ' <span class="badge ' + (isOwner ? 'badge-primary' : 'badge-info') + '">' + (isOwner ? 'Pemilik' : 'Atasan') + '</span>' +
            '<span class="badge badge-' + st[1] + '">' + icon(st[2]) + esc(st[0]) + '</span></div>' +
            '<div class="email">' + esc(u.email) + '</div><div class="meta">' + esc(meta) + '</div></div>' +
            (acts.length ? '<div class="acts">' + acts.map(function (a) {
              return '<button class="btn btn-sm ' + a[3] + '" type="button" data-act="' + a[0] + '" data-id="' + esc(u.userId) + '" data-email="' + esc(u.email) + '">' + icon(a[1]) + esc(a[2]) + '</button>';
            }).join('') + '</div>' : '') + '</div>';
        }).join('') + (others.length ? '' : '<div style="border-top:1px solid var(--border)">' + emptyState('users', 'Belum ada atasan', 'Undang atasan melalui formulir di samping. Mereka akan menerima email berisi tautan aktivasi.') + '</div>');

        $$('[data-act]', list).forEach(function (b) {
          b.addEventListener('click', function () { userAction(b.getAttribute('data-act'), b.getAttribute('data-id'), b.getAttribute('data-email'), b); });
        });
      }, function (err) {
        list.innerHTML = '<div class="alert alert-error">' + icon('alert') + '<div>' + esc(err.message) + ' <button class="btn btn-sm btn-secondary" type="button" id="ul-retry">Coba lagi</button></div></div>';
        $('#ul-retry').addEventListener('click', loadUsers);
      });
    }

    function showInviteResult(res) {
      var link = res.inviteLink;
      var waText = 'Assalamu\'alaikum/Halo, berikut tautan akses pemantauan Media Center (berlaku 7 hari, masuk dengan akun Google ' + res.user.email + '): ' + link;
      $('#invite-result').innerHTML = '<div class="alert ' + (res.emailSent ? 'alert-success' : 'alert-warning') + '">' + icon(res.emailSent ? 'checkCircle' : 'alert') +
        '<div><strong>' + (res.emailSent ? 'Email undangan dikirim ke ' + esc(res.user.email) : 'Undangan dibuat, tetapi email gagal terkirim') + '</strong>' +
        (res.emailSent ? 'Email dikirim dari Gmail <b>' + esc(res.senderEmail || '') + '</b> (salinannya ada di folder Terkirim). Bila belum masuk dalam beberapa menit, minta atasan memeriksa folder <b>Spam</b> atau <b>Promosi</b>, atau kirim tautan di bawah lewat WhatsApp.'
          : '<b>Penyebab:</b> ' + esc(res.emailError || 'tidak diketahui') + ' Sementara itu, kirim tautan di bawah lewat WhatsApp atau salin manual.') +
        ' Tautan hanya tampil sekali.</div></div>' +
        '<div class="link-box"><label class="sr-only" for="inv-link">Tautan undangan</label><input class="input" id="inv-link" readonly value="' + esc(link) + '">' +
        '<button class="btn btn-secondary" type="button" id="copy-link">' + icon('copy') + 'Salin</button></div>' +
        '<a class="btn btn-ghost btn-block" style="margin-top:8px" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(waText) + '">' + icon('whatsapp') + 'Bagikan via WhatsApp</a>';
      $('#copy-link').addEventListener('click', function () {
        var input = $('#inv-link');
        var done = function () { toast('Tautan undangan disalin.'); };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(input.value).then(done, function () { input.select(); document.execCommand('copy'); done(); });
        else { input.select(); document.execCommand('copy'); done(); }
      });
    }

    function userAction(act, id, email, btn) {
      var conf = {
        revoke: { title: 'Cabut akses ' + email + '?', message: 'Atasan ini langsung keluar dan tidak bisa masuk lagi. Kamu bisa mengundangnya kembali kapan saja.', confirmText: 'Cabut akses', danger: true, icon: 'ban' },
        suspend: { title: 'Nonaktifkan sementara?', message: email + ' tidak bisa masuk sampai kamu mengaktifkannya kembali.', confirmText: 'Nonaktifkan', icon: 'pause' }
      }[act];
      var go = function () {
        setLoading(btn, true);
        var map = { resend: 'users.resendInvite', revoke: 'users.revoke', suspend: 'users.suspend', reactivate: 'users.reactivate' };
        api(map[act], { userId: id }).then(function (res) {
          if (act === 'resend') { showInviteResult(res); toast('Undangan baru dibuat. Tautan lama tidak berlaku lagi.'); }
          else toast({ revoke: 'Akses dicabut.', suspend: 'Akun dinonaktifkan sementara.', reactivate: 'Akun aktif kembali.' }[act]);
          loadUsers();
        }, function (err) { setLoading(btn, false); toast(err.message, 'error'); });
      };
      if (conf) confirmDialog(conf).then(function (yes) { if (yes) go(); });
      else go();
    }

    $('#invite-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('#i-email').value.trim().toLowerCase();
      var err = $('#e-email');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        err.innerHTML = icon('alert', 'width="14" height="14"') + 'Masukkan alamat email yang valid.'; err.hidden = false;
        $('#i-email').setAttribute('aria-invalid', 'true'); $('#i-email').focus(); return;
      }
      err.hidden = true; $('#i-email').removeAttribute('aria-invalid');
      var btn = $('#invite-btn');
      setLoading(btn, true);
      api('users.invite', { email: email, displayName: $('#i-name').value.trim() }).then(function (res) {
        setLoading(btn, false);
        $('#i-email').value = ''; $('#i-name').value = '';
        showInviteResult(res);
        toast(res.emailSent ? 'Undangan terkirim.' : 'Undangan dibuat. Bagikan tautannya secara manual.', res.emailSent ? 'success' : 'error');
        loadUsers();
      }, function (er) {
        setLoading(btn, false);
        err.innerHTML = icon('alert', 'width="14" height="14"') + esc(er.message); err.hidden = false;
      });
    });
    $('#i-email').addEventListener('input', function () { $('#e-email').hidden = true; $('#i-email').removeAttribute('aria-invalid'); });
    loadUsers();
  }

  /* ----- Profil ----- */
  function settingsProfile(body) {
    var me = state.me;
    body.innerHTML = '<form class="card" id="profile-form" style="max-width:640px" novalidate><div class="card-body" style="padding-top:22px">' +
      '<div style="display:flex;gap:16px;align-items:center;margin-bottom:22px"><span class="avatar lg">' +
      (safeHttps(me.photoUrl) ? '<img src="' + esc(me.photoUrl) + '" alt="" referrerpolicy="no-referrer">' : esc(initials(me.displayName))) + '</span>' +
      '<div><div style="font-weight:700;font-size:17px">' + esc(me.displayName) + '</div><span class="badge ' + (me.role === 'OWNER' ? 'badge-primary' : 'badge-info') + '">' + icon('shield') + (me.role === 'OWNER' ? 'Pemilik — akses penuh' : 'Atasan — hanya baca') + '</span></div></div>' +
      '<div class="field"><label class="label" for="p-name">Nama tampilan</label><input class="input" id="p-name" maxlength="80" value="' + esc(me.displayName) + '"><div class="field-error" id="e-pname" role="alert" hidden></div></div>' +
      '<div class="field"><label class="label" for="p-email">Email Google</label><input class="input" id="p-email" readonly value="' + esc(me.email) + '"><span class="hint">Email mengikuti akun Google yang dipakai masuk.</span></div>' +
      '<div class="field"><span class="label">Mode yang tersedia</span><div style="display:flex;gap:8px;flex-wrap:wrap">' +
      me.modes.map(function (m) { return '<span class="badge badge-neutral">' + (m === 'personal' ? 'Mode Saya' : 'Mode Atasan') + '</span>'; }).join('') + '</div></div></div>' +
      '<div class="action-bar"><button class="btn btn-danger" type="button" id="p-logout">' + icon('logout') + 'Keluar</button><button class="btn btn-primary" type="submit" id="p-save">' + icon('check') + 'Simpan profil</button></div></form>';
    $('#p-logout').addEventListener('click', logout);
    $('#profile-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#p-name').value.trim();
      if (name.length < 2) { $('#e-pname').textContent = 'Nama minimal 2 karakter.'; $('#e-pname').hidden = false; return; }
      var btn = $('#p-save');
      setLoading(btn, true);
      api('account.updateProfile', { displayName: name }).then(function (me2) {
        setLoading(btn, false);
        state.me = me2; renderUserMenu();
        toast('Profil disimpan.');
      }, function (err) { setLoading(btn, false); toast(err.message, 'error'); });
    });
  }

  /* ----- Sistem ----- */
  function settingsSystem(body) {
    body.innerHTML = '<div class="card card-pad"><div class="skeleton" style="height:120px"></div></div>';
    api('settings.system').then(function (s) {
      body.innerHTML = '<div class="grid grid-2"><section class="card"><div class="card-head"><div><h2>Status sistem</h2><p>Informasi instalasi MCMS</p></div></div><div class="card-body"><dl class="kv">' +
        '<dt>Versi aplikasi</dt><dd>' + esc(s.version) + '</dd><dt>Versi database</dt><dd>' + esc(s.schemaVersion) + ' · ' + esc(s.sheetCount) + ' sheet</dd>' +
        '<dt>Zona waktu</dt><dd>' + esc(s.timezone) + '</dd><dt>Jumlah akun</dt><dd>' + esc(s.userCount) + '</dd><dt>Alamat aplikasi</dt><dd>' + esc(s.appUrl || '—') + '</dd>' +
        '<dt>Mode</dt><dd>' + (DEMO ? '<span class="badge badge-warning">Demo</span>' : '<span class="badge badge-success">' + icon('checkCircle') + 'Terhubung ke Google</span>') + '</dd></dl>' +
        '<button class="btn btn-secondary" type="button" id="ping" style="margin-top:18px">' + icon('refresh') + 'Cek koneksi server</button></div></section>' +
        '<section class="card"><div class="card-head"><div><h2>Data & arsip</h2><p>Hanya bisa dibuka oleh akun pemilik</p></div></div><div class="card-body" style="display:grid;gap:10px">' +
        (safeHttps(s.spreadsheetUrl) ? '<a class="sheet-item" target="_blank" rel="noopener" href="' + esc(s.spreadsheetUrl) + '"><span class="dot-ico">' + icon('grid') + '</span><span class="grow"><span class="t">Database (Google Sheets)</span><span class="d">20 sheet data MCMS</span></span>' + icon('external', 'width="18" height="18"') + '</a>' : '') +
        (safeHttps(s.driveUrl) ? '<a class="sheet-item" target="_blank" rel="noopener" href="' + esc(s.driveUrl) + '"><span class="dot-ico">' + icon('folder') + '</span><span class="grow"><span class="t">Folder Google Drive</span><span class="d">Logo, arsip, laporan, backup</span></span>' + icon('external', 'width="18" height="18"') + '</a>' : '') +
        '<div class="alert alert-info">' + icon('lock') + '<div>Spreadsheet dan folder Drive tetap privat. Atasan melihat data hanya melalui aplikasi ini.</div></div></div></section>' +
        '<section class="card"><div class="card-head"><div><h2>Backup database</h2><p>Salinan spreadsheet disimpan di folder 05_SYSTEM_BACKUP</p></div></div><div class="card-body">' +
        (s.backups && s.backups.length ? '<ul class="list">' + s.backups.map(function (b) {
          return '<li class="list-item"><span class="dot-ico">' + icon('database') + '</span><div class="main"><div class="title">' + esc(b.name) + '</div><div class="meta">' + esc(fmtDate(b.createdAt, true)) + '</div></div>' +
            (safeHttps(b.url) && !DEMO ? '<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="' + esc(b.url) + '">' + icon('external') + 'Buka</a>' : '') + '</li>';
        }).join('') + '</ul>' : '<p class="hint">Belum ada backup. Disarankan membuat backup setiap akhir bulan.</p>') +
        '<button class="btn btn-primary" type="button" id="do-backup" style="margin-top:16px">' + icon('database') + 'Buat backup sekarang</button></div></section>' +
        (DEMO ? '<section class="card"><div class="card-head"><div><h2>Data demo</h2><p>Kembalikan data contoh seperti semula</p></div></div><div class="card-body">' +
          '<p class="hint" style="margin-bottom:14px">Mode demo menyimpan data di browser ini saja. Atur ulang bila ingin mencoba dari awal.</p>' +
          '<button class="btn btn-danger" type="button" id="demo-reset">' + icon('refresh') + 'Atur ulang data demo</button></div></section>' : '') +
        '</div>';
      $('#do-backup').addEventListener('click', function (e) {
        var btn = e.currentTarget;
        setLoading(btn, true);
        api('system.backup').then(function (b) { toast('Backup "' + b.name + '" dibuat.'); settingsSystem(body); },
          function (err) { setLoading(btn, false); toast(err.message, 'error'); });
      });
      if (DEMO) $('#demo-reset').addEventListener('click', function () {
        confirmDialog({ title: 'Atur ulang data demo?', message: 'Semua perubahan yang kamu buat di mode demo akan hilang dan data contoh dimuat ulang.', danger: true, confirmText: 'Atur ulang', icon: 'refresh' })
          .then(function (yes) { if (!yes) return; window.MCMSDemo.reset(); store.del(STORE_KEY); location.hash = ''; location.reload(); });
      });
      $('#ping').addEventListener('click', function (e) {
        var btn = e.currentTarget, t0 = Date.now();
        setLoading(btn, true);
        api('system.ping').then(function () { setLoading(btn, false); toast('Server terhubung (' + (Date.now() - t0) + ' ms).'); },
          function (err) { setLoading(btn, false); toast(err.message, 'error'); });
      });
    }, function (err) { errorState(body, err, function () { settingsSystem(body); }); });
  }

  /* ---------------- Boot ---------------- */
  function readInviteFromHash() {
    var m = /(?:^#|&)invite=([a-f0-9]{64}|demo)/.exec(location.hash || '');
    if (!m) return null;
    try { sessionStorage.setItem('mcms.invite', m[1]); } catch (e) { /* abaikan */ }
    history.replaceState(null, '', location.pathname + location.search); // token tidak tertinggal di riwayat/URL
    return m[1];
  }

  function boot() {
    var invite = readInviteFromHash();
    if (!invite) { try { invite = sessionStorage.getItem('mcms.invite'); } catch (e) { invite = null; } }
    state.pendingInvite = invite;

    loadBranding().then(function () {
      if (state.pendingInvite) {
        try { sessionStorage.removeItem('mcms.invite'); } catch (e) { /* abaikan */ }
        return renderInvite(state.pendingInvite);
      }
      var saved = store.get(STORE_KEY);
      if (!saved || !saved.token || new Date(saved.expiresAt) < new Date() || !isConfigured()) {
        if (saved) store.del(STORE_KEY);
        return renderLogin();
      }
      state.session = saved;
      var refreshMe = function (me) {
        var changed = !state.me || stable(me) !== stable(state.me);
        state.me = me;
        store.set(STORE_KEY, Object.assign({}, saved, { me: me }));
        return changed;
      };
      if (saved.me && saved.me.userId) {
        // Jalur cepat: langsung masuk dengan data akun tersimpan, verifikasi sesi di latar belakang.
        state.me = saved.me;
        var m0 = store.get(modeKey());
        state.mode = state.me.modes.indexOf(m0) >= 0 ? m0 : state.me.modes[0];
        enterApp();
        api('auth.me').then(function (me) {
          if (refreshMe(me)) {
            if (me.modes.indexOf(state.mode) < 0) switchMode(me.modes[0]);
            else { renderNav(); renderUserMenu(); renderModeSwitch(); }
          }
        }, function (err) {
          if (err.code === 'UNAUTHENTICATED' || err.code === 'FORBIDDEN') handleSessionExpired('Sesi berakhir. Silakan masuk kembali.');
        });
        return;
      }
      api('auth.me').then(function (me) {
        refreshMe(me);
        var m = store.get(modeKey());
        state.mode = me.modes.indexOf(m) >= 0 ? m : me.modes[0];
        enterApp();
      }, function (err) {
        state.session = null;
        store.del(STORE_KEY);
        renderLogin(err.code === 'UNAUTHENTICATED' ? 'Sesi berakhir. Silakan masuk kembali.' : err.message);
      });
    });
  }

  // Skip link: lompat ke konten yang sedang tampil (login atau aplikasi)
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.skip-link');
    if (!a) return;
    e.preventDefault();
    var target = !$('#app-view').hidden ? $('#main') : $('#auth-view');
    target.focus();
  });

  window.addEventListener('online', function () { toast('Koneksi kembali tersambung.'); });
  window.addEventListener('offline', function () { toast('Koneksi internet terputus. Perubahan belum bisa disimpan.', 'error'); });

  /* ---------------- Namespace bersama untuk modul halaman ---------------- */
  var MC = window.MC = {
    CFG: CFG, DEMO: DEMO, state: state, PAGES: PAGES, store: store,
    $: $, $$: $$, esc: esc, icon: icon, safeImg: safeImg, safeHttps: safeHttps, initials: initials,
    fmtDate: fmtDate, fmtDateLong: fmtDateLong, greeting: greeting,
    api: api, load: load, cacheClear: cacheClear, ApiError: ApiError, toast: toast, openOverlay: openOverlay, closeOverlay: closeOverlay,
    confirmDialog: confirmDialog, setLoading: setLoading, focusHeading: focusHeading,
    statCard: statCard, emptyState: emptyState, errorState: errorState, skeletonPage: skeletonPage,
    statusBadge: statusBadge, progressRow: progressRow, STATUS_LABEL: STATUS_LABEL,
    switchMode: switchMode, setNavBadge: setNavBadge, route: route, parseRoute: parseRoute,
    create: function () { toast('Modul belum dimuat.', 'error'); },
    settingsCategories: function () {},
    boot: boot
  };
  document.addEventListener('keydown', function (e) {
    if (e.key !== '/' || !state.me || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '') || $('#overlay-root').innerHTML) return;
    var b = $('#btn-search');
    if (b && !b.hidden) { e.preventDefault(); b.click(); }
  });
})();

;
/* =========================================================
   MCMS Kit — komponen & utilitas bersama untuk semua halaman.
   Semua teks dinamis di-escape. Semua form: label, validasi langsung,
   data tidak hilang saat gagal, tombol berstatus loading.
   ========================================================= */
(function (MC) {
  'use strict';
  var $ = MC.$, $$ = MC.$$, esc = MC.esc, icon = MC.icon;

  /* ---------- Label status tambahan ---------- */
  var SL = MC.STATUS_LABEL;
  SL.DRAFT = ['Draf', 'neutral']; SL.PUBLISHED = ['Terbit', 'success'];
  SL.OPEN = ['Baru', 'warning']; SL.ACKNOWLEDGED = ['Dibaca', 'neutral'];
  SL.REVIEW = ['Review', 'info'];
  MC.TASK_STATUSES = [['TODO', 'Belum mulai'], ['IN_PROGRESS', 'Dikerjakan'], ['REVIEW', 'Review'], ['DONE', 'Selesai'], ['CANCELLED', 'Batal']];
  MC.PROJECT_STATUSES = [['PLANNING', 'Perencanaan'], ['IN_PROGRESS', 'Dikerjakan'], ['ON_HOLD', 'Ditunda'], ['DONE', 'Selesai'], ['ARCHIVED', 'Arsip']];
  MC.PRIORITIES = [['LOW', 'Rendah'], ['MEDIUM', 'Sedang'], ['HIGH', 'Tinggi'], ['URGENT', 'Mendesak']];
  var STATUS_ICON = { TODO: 'clock', IN_PROGRESS: 'play', REVIEW: 'eye', DONE: 'checkCircle', CANCELLED: 'ban', PLANNING: 'flag', ON_HOLD: 'pause', ARCHIVED: 'database', DRAFT: 'edit', PUBLISHED: 'checkCircle', OPEN: 'message', ACKNOWLEDGED: 'check' };
  /** Status selalu ikon + teks (tidak hanya warna). */
  MC.statusBadge = function (s) {
    var m = SL[s] || [s || '—', 'neutral'];
    return '<span class="badge badge-' + m[1] + '">' + (STATUS_ICON[s] ? icon(STATUS_ICON[s]) : '') + esc(m[0]) + '</span>';
  };
  MC.priorityBadge = function (p) {
    if (p === 'HIGH') return '<span class="badge badge-warning">' + icon('flag') + 'Tinggi</span>';
    if (p === 'URGENT') return '<span class="badge badge-danger">' + icon('flag') + 'Mendesak</span>';
    return '';
  };
  MC.visBadge = function (v) {
    return v === 'PRIVATE' ? '<span class="badge badge-neutral" title="Tidak terlihat oleh atasan">' + icon('lock') + 'Pribadi</span>'
      : '<span class="badge badge-info" title="Terlihat di Mode Atasan">' + icon('eye') + 'Atasan</span>';
  };

  /* ---------- Tanggal ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  MC.todayKey = function (offset) {
    var d = new Date(Date.now() + (offset || 0) * 86400000);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  var DAYS_LONG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  function parseKey(k) { var p = String(k).split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
  MC.fmtDay = function (k, withYear) {
    if (!k) return '—';
    var d = parseKey(k);
    if (isNaN(d)) return '—';
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + (withYear === false ? '' : ' ' + d.getFullYear());
  };
  MC.fmtDayName = function (k) {
    var d = parseKey(k);
    var t = MC.todayKey(), y = MC.todayKey(-1);
    if (k === t) return 'Hari ini';
    if (k === y) return 'Kemarin';
    return DAYS_LONG[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  };
  MC.dayShort = function (k) { return DAYS[parseKey(k).getDay()]; };
  function daysBetween(a, b) { return Math.round((parseKey(b) - parseKey(a)) / 86400000); }
  /** Label deadline yang mudah dipahami + nada warna. */
  MC.dueLabel = function (k, done) {
    if (!k) return null;
    var diff = daysBetween(MC.todayKey(), k);
    if (done) return { text: MC.fmtDay(k, false), tone: 'neutral' };
    if (diff < 0) return { text: 'Terlambat ' + (-diff) + ' hari', tone: 'danger' };
    if (diff === 0) return { text: 'Hari ini', tone: 'warning' };
    if (diff === 1) return { text: 'Besok', tone: 'warning' };
    if (diff <= 7) return { text: diff + ' hari lagi', tone: 'info' };
    return { text: MC.fmtDay(k, false), tone: 'neutral' };
  };
  MC.dueChip = function (k, done) {
    var d = MC.dueLabel(k, done);
    if (!d) return '';
    return '<span class="due due-' + d.tone + '">' + icon(d.tone === 'danger' ? 'alert' : 'clock', 'width="13" height="13"') + esc(d.text) + '</span>';
  };
  MC.fmtMinutes = function (m) {
    m = Number(m) || 0;
    if (!m) return '0 m';
    var h = Math.floor(m / 60), r = m % 60;
    return (h ? h + ' j' : '') + (h && r ? ' ' : '') + (r ? r + ' m' : '');
  };
  MC.fmtSize = function (b) {
    b = Number(b) || 0;
    if (b < 1024) return b + ' B';
    if (b < 1048576) return Math.round(b / 1024) + ' KB';
    if (b < 1073741824) return (b / 1048576).toFixed(1).replace('.', ',') + ' MB';
    return (b / 1073741824).toFixed(1).replace('.', ',') + ' GB';
  };

  /* ---------- Data pilihan form (proyek, tugas, kategori) ---------- */
  var lookupPromise = null;
  MC.lookup = function (force) {
    if (!lookupPromise || force) lookupPromise = MC.api('lookup.all').catch(function (e) { lookupPromise = null; throw e; });
    return lookupPromise;
  };
  MC.invalidate = function () { lookupPromise = null; };

  /* ---------- Form ---------- */
  var fid = 0;
  /**
   * o: { name, label, type: text|textarea|select|date|number|range|checkbox|switch, value, options:[[v,l]], required, hint, placeholder, min, max, maxlength, rows, full }
   */
  MC.field = function (o) {
    var id = 'f-' + o.name + '-' + (++fid);
    var req = o.required ? ' required aria-required="true"' : '';
    var hintId = o.hint ? id + '-h' : '';
    var desc = ' aria-describedby="' + id + '-e' + (hintId ? ' ' + hintId : '') + '"';
    var v = o.value === undefined || o.value === null ? '' : o.value;
    var control;
    if (o.type === 'textarea') {
      control = '<textarea class="input" id="' + id + '" name="' + o.name + '" rows="' + (o.rows || 3) + '"' + (o.maxlength ? ' maxlength="' + o.maxlength + '"' : '') +
        (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + req + desc + '>' + esc(v) + '</textarea>';
    } else if (o.type === 'select') {
      control = '<select class="input" id="' + id + '" name="' + o.name + '"' + req + desc + '>' + (o.options || []).map(function (op) {
        return '<option value="' + esc(op[0]) + '"' + (String(op[0]) === String(v) ? ' selected' : '') + '>' + esc(op[1]) + '</option>';
      }).join('') + '</select>';
    } else if (o.type === 'switch') {
      return '<div class="field' + (o.full ? ' full' : '') + '"><label class="switch" for="' + id + '"><input type="checkbox" id="' + id + '" name="' + o.name + '"' + (v ? ' checked' : '') +
        (hintId ? ' aria-describedby="' + hintId + '"' : '') + '><span class="track" aria-hidden="true"></span><span class="switch-text"><span class="t">' + esc(o.label) + '</span>' +
        (o.hint ? '<span class="hint" id="' + hintId + '">' + esc(o.hint) + '</span>' : '') + '</span></label></div>';
    } else if (o.type === 'range') {
      control = '<div class="range-row"><input type="range" id="' + id + '" name="' + o.name + '" min="' + (o.min || 0) + '" max="' + (o.max || 100) + '" step="' + (o.step || 5) + '" value="' + esc(v) + '"' + desc + '>' +
        '<output for="' + id + '" class="num">' + esc(v) + (o.suffix || '') + '</output></div>';
    } else {
      control = '<input class="input" id="' + id + '" name="' + o.name + '" type="' + (o.type || 'text') + '" value="' + esc(v) + '"' +
        (o.maxlength ? ' maxlength="' + o.maxlength + '"' : '') + (o.min !== undefined ? ' min="' + o.min + '"' : '') + (o.max !== undefined ? ' max="' + o.max + '"' : '') +
        (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + (o.inputmode ? ' inputmode="' + o.inputmode + '"' : '') +
        (o.autocomplete ? ' autocomplete="' + o.autocomplete + '"' : '') + req + desc + '>';
    }
    return '<div class="field' + (o.full ? ' full' : '') + '"><label class="label" for="' + id + '">' + esc(o.label) + (o.required ? ' <span class="req" aria-hidden="true">*</span>' : ' <span class="opt">(opsional)</span>') + '</label>' +
      control + (o.hint ? '<span class="hint" id="' + hintId + '">' + esc(o.hint) + '</span>' : '') +
      '<div class="field-error" id="' + id + '-e" role="alert" hidden></div></div>';
  };

  MC.readForm = function (form) {
    var out = {};
    $$('[name]', form).forEach(function (el) {
      if (el.type === 'checkbox') out[el.name] = el.checked;
      else if (el.type === 'number' || el.type === 'range') out[el.name] = el.value === '' ? '' : Number(el.value);
      else out[el.name] = el.value.trim ? el.value.trim() : el.value;
    });
    return out;
  };
  MC.fieldError = function (form, name, msg) {
    var el = $('[name="' + name + '"]', form);
    if (!el) return;
    var box = $('#' + el.id + '-e', form);
    el.setAttribute('aria-invalid', 'true');
    if (box) { box.innerHTML = icon('alert', 'width="14" height="14"') + esc(msg); box.hidden = false; }
    el.focus();
  };
  MC.clearErrors = function (form) {
    $$('[aria-invalid]', form).forEach(function (el) { el.removeAttribute('aria-invalid'); });
    $$('.field-error', form).forEach(function (b) { b.hidden = true; });
    var top = $('.form-alert', form); if (top) top.innerHTML = '';
  };
  /** Validasi sederhana di browser (server tetap memvalidasi ulang). */
  MC.validate = function (form, rules) {
    MC.clearErrors(form);
    var v = MC.readForm(form);
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i], val = v[r[0]];
      if (r[1] === 'required' && String(val || '').length < (r[3] || 1)) { MC.fieldError(form, r[0], r[2]); return null; }
      if (r[1] === 'after' && val && v[r[3]] && val < v[r[3]]) { MC.fieldError(form, r[0], r[2]); return null; }
    }
    return v;
  };
  MC.formAlert = function (form, msg) {
    var box = $('.form-alert', form);
    if (box) box.innerHTML = '<div class="alert alert-error" role="alert">' + icon('alert') + '<div>' + esc(msg) + '</div></div>';
    else MC.toast(msg, 'error');
  };

  /**
   * Dialog form standar (bottom sheet di HP, dialog di desktop).
   * o: { title, sub, icon, body(html), submitText, wide, onSubmit(values, form) → Promise }
   */
  MC.formDialog = function (o) {
    var ov = MC.openOverlay(
      '<form class="dlg-form" novalidate>' +
      '<div class="dialog-head"><span class="ico ic tone-primary-ico">' + icon(o.icon || 'plus') + '</span><div class="grow"><h2 id="dlg-title">' + esc(o.title) + '</h2>' +
      (o.sub ? '<p class="hint">' + esc(o.sub) + '</p>' : '') + '</div>' +
      '<button class="icon-btn" type="button" data-close aria-label="Tutup">' + icon('x') + '</button></div>' +
      '<div class="dialog-body"><div class="form-alert"></div><div class="form-grid">' + o.body + '</div></div>' +
      '<div class="dialog-foot">' + (o.extraFoot || '') + '<button class="btn btn-secondary" type="button" data-close>Batal</button>' +
      '<button class="btn btn-primary" type="submit">' + icon(o.submitIcon || 'check') + esc(o.submitText || 'Simpan') + '</button></div></form>',
      { sheet: true, wide: o.wide, persistent: true });
    var form = $('form', ov);
    $$('[data-close]', ov).forEach(function (b) { b.addEventListener('click', MC.closeOverlay); });
    $$('input[type=range]', form).forEach(function (r) {
      var out = r.parentNode.querySelector('output');
      r.addEventListener('input', function () { out.textContent = r.value + (r.getAttribute('data-suffix') || '%'); });
      out.textContent = r.value + '%';
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('button[type=submit]', form);
      if (btn.disabled) return;
      var res = o.onSubmit(form);
      if (!res || !res.then) return;
      MC.setLoading(btn, true);
      res.then(function () { MC.setLoading(btn, false); }, function (err) {
        MC.setLoading(btn, false);
        if (err && err.message) MC.formAlert(form, err.message);
      });
    });
    if (o.onOpen) o.onOpen(form, ov);
    return { ov: ov, form: form };
  };

  /* ---------- Halaman ---------- */
  MC.pageHead = function (eyebrow, title, sub, actions) {
    return '<div class="page-head"><div class="ph-text">' + (eyebrow ? '<div class="eyebrow">' + esc(eyebrow) + '</div>' : '') + '<h1>' + esc(title) + '</h1>' +
      (sub ? '<p class="sub">' + sub + '</p>' : '') + '</div>' + (actions ? '<div class="ph-actions">' + actions + '</div>' : '') + '</div>';
  };
  /** Kontrol segmen (tampilan list/kanban, filter). */
  MC.segmented = function (name, items, current, label) {
    return '<div class="segmented" role="group" aria-label="' + esc(label) + '">' + items.map(function (it) {
      return '<button type="button" data-seg="' + name + '" data-val="' + esc(it[0]) + '" aria-pressed="' + (it[0] === current) + '">' +
        (it[2] ? icon(it[2]) : '') + '<span>' + esc(it[1]) + '</span>' + (it[3] !== undefined ? '<span class="cnt num">' + esc(it[3]) + '</span>' : '') + '</button>';
    }).join('') + '</div>';
  };
  MC.bindSegmented = function (root, name, fn) {
    $$('[data-seg="' + name + '"]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-seg="' + name + '"]', root).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        fn(b.getAttribute('data-val'));
      });
    });
  };
  /** Halaman tidak lagi aktif (pengguna sudah pindah) → hasil request diabaikan. */
  MC.stillOn = function (page) { return MC.state.route === page && !!MC.state.me; };

  MC.loadingBox = function (h) {
    return '<div class="card card-pad" aria-busy="true"><span class="sr-only" role="status">Memuat…</span><div class="skeleton" style="height:' + (h || 120) + 'px"></div></div>';
  };

  /* ---------- Aset & thumbnail ---------- */
  var FT_ICON = { IMAGE: 'image', VIDEO: 'video', AUDIO: 'music', DOCUMENT: 'file', DESIGN: 'palette', OTHER: 'file' };
  var FT_LABEL = { IMAGE: 'Foto/gambar', VIDEO: 'Video', AUDIO: 'Audio', DOCUMENT: 'Dokumen', DESIGN: 'Desain', OTHER: 'Lainnya' };
  MC.FT_LABEL = FT_LABEL;
  MC.fileIcon = function (t) { return icon(FT_ICON[t] || 'file'); };
  /* Thumbnail: cache permanen di browser (maks ±200 file, ±3 MB). Thumbnail tidak berubah, jadi cukup diunduh sekali. */
  var TPRE = 'mcms.t.', TIDX = 'mcms.t.idx', TMAX = 200;
  var memThumb = {};
  function tGet(id) {
    if (Object.prototype.hasOwnProperty.call(memThumb, id)) return memThumb[id];
    try { var v = localStorage.getItem(TPRE + id); if (v !== null) { memThumb[id] = v; return v; } } catch (e) { /* abaikan */ }
    return undefined;
  }
  function tPut(id, url) {
    memThumb[id] = url;
    if (!url) return; // kosong: hanya diingat selama sesi ini (thumbnail Drive mungkin belum siap)
    try {
      var idx = JSON.parse(localStorage.getItem(TIDX) || '[]').filter(function (x) { return x !== id; });
      idx.push(id);
      while (idx.length > TMAX) localStorage.removeItem(TPRE + idx.shift());
      localStorage.setItem(TPRE + id, url);
      localStorage.setItem(TIDX, JSON.stringify(idx));
    } catch (e) {
      try { JSON.parse(localStorage.getItem(TIDX) || '[]').slice(0, 60).forEach(function (x) { localStorage.removeItem(TPRE + x); }); } catch (e2) { /* abaikan */ }
    }
  }
  MC.thumbPut = tPut;
  /** Muat thumbnail untuk elemen [data-thumb] di dalam root: dari cache browser dulu, sisanya 24 per panggilan. */
  MC.loadThumbs = function (root) {
    var els = $$('[data-thumb]:not([data-thumb-done])', root);
    var need = [];
    function apply(el, url) {
      el.setAttribute('data-thumb-done', '1');
      if (MC.safeImg(url) || /^data:image\/(gif|webp);base64,/.test(url)) {
        el.innerHTML = '<img src="' + url + '" alt="" loading="lazy" decoding="async">';
        el.classList.add('has-img');
      }
    }
    els.forEach(function (el) {
      var id = el.getAttribute('data-thumb');
      if (!id) return;
      var c = tGet(id);
      if (c !== undefined) apply(el, c);
      else if (need.indexOf(id) < 0) need.push(id);
    });
    for (var i = 0; i < need.length; i += 24) {
      (function (ids) {
        MC.api('assets.thumbs', { ids: ids }).then(function (map) {
          ids.forEach(function (id) { tPut(id, map[id] || ''); });
          $$('[data-thumb]:not([data-thumb-done])', root).forEach(function (el) {
            var c = tGet(el.getAttribute('data-thumb'));
            if (c !== undefined) apply(el, c);
          });
        }, function () { /* thumbnail opsional */ });
      })(need.slice(i, i + 24));
    }
  };
  /**
   * Membuat thumbnail sangat kecil di browser sebelum unggah (foto & video).
   * Hasil: WebP (atau JPEG di browser lama) maks 360 px, ±8–30 KB. Mengembalikan {data, mime} atau null.
   */
  MC.makeThumb = function (file) {
    var isImg = /^image\/(png|jpeg|webp|gif|bmp)$/.test(file.type), isVid = /^video\//.test(file.type);
    if (!isImg && !isVid) return Promise.resolve(null);
    function encode(src, w, h) {
      return new Promise(function (resolve) {
        var tries = [[360, 0.6], [260, 0.5]], t = 0;
        (function step() {
          var max = tries[t][0], q = tries[t][1];
          var sc = Math.min(1, max / Math.max(w, h));
          var cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(w * sc)); cv.height = Math.max(1, Math.round(h * sc));
          var g = cv.getContext('2d');
          g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
          g.drawImage(src, 0, 0, cv.width, cv.height);
          var url = cv.toDataURL('image/webp', q);
          var mime = 'image/webp';
          if (url.indexOf('data:image/webp') !== 0) { url = cv.toDataURL('image/jpeg', q); mime = 'image/jpeg'; }
          var data = url.split(',')[1] || '';
          if (data.length > 80000 && ++t < tries.length) return step();
          resolve(data && data.length <= 88000 ? { data: data, mime: mime } : null);
        })();
      });
    }
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var done = function (v) { URL.revokeObjectURL(url); resolve(v); };
      var timer = setTimeout(function () { done(null); }, 6000);
      try {
        if (isImg) {
          var img = new Image();
          img.onload = function () { encode(img, img.naturalWidth, img.naturalHeight).then(function (v) { clearTimeout(timer); done(v); }); };
          img.onerror = function () { clearTimeout(timer); done(null); };
          img.src = url;
        } else {
          var v = document.createElement('video');
          v.muted = true; v.playsInline = true; v.preload = 'auto';
          v.onloadeddata = function () { try { v.currentTime = Math.min(1, (v.duration || 2) / 3); } catch (e) { clearTimeout(timer); done(null); } };
          v.onseeked = function () { encode(v, v.videoWidth, v.videoHeight).then(function (r) { clearTimeout(timer); done(r); }); };
          v.onerror = function () { clearTimeout(timer); done(null); };
          v.src = url;
        }
      } catch (e) { clearTimeout(timer); done(null); }
    });
  };
  MC.forgetThumb = function (id) { delete memThumb[id]; try { localStorage.removeItem(TPRE + id); } catch (e) { /* abaikan */ } };

  /** Buka file asli di Google Drive (atasan diberi akses saat itu juga). */
  MC.openAsset = function (assetId, btn) {
    if (MC.DEMO) {
      MC.setLoading(btn, true);
      return MC.api('assets.open', { assetId: assetId }).then(function (r) {
        MC.setLoading(btn, false);
        MC.toast('Mode demo: di versi asli, "' + r.fileName + '" terbuka di Google Drive.');
      }, function (e) { MC.setLoading(btn, false); MC.toast(e.message, 'error'); });
    }
    var win = window.open('about:blank', '_blank');
    MC.setLoading(btn, true);
    return MC.api('assets.open', { assetId: assetId }).then(function (r) {
      MC.setLoading(btn, false);
      if (win && MC.safeHttps(r.url)) { win.opener = null; win.location.href = r.url; }
      else if (MC.safeHttps(r.url)) location.href = r.url;
    }, function (e) { MC.setLoading(btn, false); if (win) win.close(); MC.toast(e.message, 'error'); });
  };

  /** Kartu aset (grid). opts.exec → tanpa menu kelola. */
  MC.assetCard = function (a, opts) {
    opts = opts || {};
    return '<article class="asset-card">' +
      '<div class="asset-thumb-wrap"><button class="asset-thumb" type="button" data-asset-open="' + esc(a.assetId) + '" aria-label="Lihat detail ' + esc(a.fileName) + '" data-thumb="' + (a.fileType === 'IMAGE' || a.fileType === 'VIDEO' || a.fileType === 'DESIGN' ? esc(a.assetId) : '') + '">' +
      '<span class="ft-ico">' + MC.fileIcon(a.fileType) + '</span>' + (a.fileType === 'VIDEO' ? '<span class="play-badge" aria-hidden="true">' + icon('play') + '</span>' : '') + '</button>' +
      MC.driveButton(a, 'asset-drive') + '</div>' +
      '<div class="asset-info"><div class="asset-name" title="' + esc(a.fileName) + '">' + esc(a.fileName) + '</div>' +
      '<div class="asset-meta">' + esc(FT_LABEL[a.fileType] || 'File') + (a.sizeBytes ? ' · ' + MC.fmtSize(a.sizeBytes) : '') + (a.source === 'LINK' ? ' · ' + icon('link', 'width="12" height="12"') + 'Drive' : '') + '</div>' +
      (a.projectName ? '<div class="asset-meta">' + icon('folder', 'width="12" height="12"') + esc(a.projectName) + '</div>' : '') +
      (opts.exec ? '' : '<div class="asset-badges">' + MC.visBadge(a.visibility) + (a.stage === 'FINAL' ? '<span class="badge badge-success">' + icon('star') + 'Final</span>' : '') + '</div>') +
      '</div></article>';
  };
  /** Tombol "buka file asli di Google Drive". Pemilik: tautan langsung (tanpa menunggu server). Atasan: akses diberikan saat diklik. */
  MC.driveButton = function (a, cls, withText) {
    var label = 'Buka file asli di Google Drive: ' + a.fileName;
    var inner = icon('external') + (withText ? 'Buka di Google Drive' : '');
    if (!MC.DEMO && MC.safeHttps(a.driveUrl)) {
      return '<a class="' + cls + '" href="' + esc(a.driveUrl) + '" target="_blank" rel="noopener" aria-label="' + esc(label) + '"' + (withText ? '' : ' title="Buka di Google Drive"') + '>' + inner + '</a>';
    }
    return '<button class="' + cls + '" type="button" data-asset-drive="' + esc(a.assetId) + '" aria-label="' + esc(label) + '"' + (withText ? '' : ' title="Buka di Google Drive"') + '>' + inner + '</button>';
  };

  /* ---------- Tabel proyek dengan urutan (sort) ---------- */
  var P_STATUS_ORDER = ['IN_PROGRESS', 'PLANNING', 'ON_HOLD', 'DONE', 'ARCHIVED'];
  var P_PRIO_ORDER = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
  var P_COLS = [
    ['name', 'Proyek'], ['status', 'Status'], ['priority', 'Prioritas'], ['progress', 'Progres'],
    ['tasks', 'Tugas'], ['dueDate', 'Deadline'], ['updatedAt', 'Diperbarui']
  ];
  function pVal(p, k) {
    if (k === 'name') return String(p.name).toLowerCase();
    if (k === 'status') return P_STATUS_ORDER.indexOf(p.status);
    if (k === 'priority') return P_PRIO_ORDER.indexOf(p.priority);
    if (k === 'progress') return p.progress === null ? -1 : p.progress;
    if (k === 'tasks') return p.taskCount;
    if (k === 'dueDate') return p.dueDate || '9999-99-99';
    return p[k] || '';
  }
  MC.sortProjects = function (items, sort) {
    var dir = sort.dir === 'desc' ? -1 : 1;
    return items.slice().sort(function (a, b) {
      var x = pVal(a, sort.key), y = pVal(b, sort.key);
      if (x < y) return -dir; if (x > y) return dir;
      return String(a.name).localeCompare(String(b.name));
    });
  };
  MC.projectTable = function (items, base, sort, opts) {
    opts = opts || {};
    var rows = MC.sortProjects(items, sort);
    return '<div class="table-wrap card" role="region" aria-label="Tabel proyek" tabindex="0"><table class="data-table"><caption class="sr-only">Daftar proyek, diurutkan berdasarkan ' +
      esc(P_COLS.filter(function (c) { return c[0] === sort.key; })[0][1]) + (sort.dir === 'desc' ? ' menurun' : ' menaik') + '</caption><thead><tr>' +
      P_COLS.map(function (c) {
        var on = sort.key === c[0];
        return '<th scope="col" aria-sort="' + (on ? (sort.dir === 'desc' ? 'descending' : 'ascending') : 'none') + '"><button type="button" class="th-sort" data-sort="' + c[0] + '">' + esc(c[1]) +
          '<span class="sort-ico' + (on ? ' on' : '') + '" aria-hidden="true">' + (on ? (sort.dir === 'desc' ? '↓' : '↑') : '↕') + '</span></button></th>';
      }).join('') + (opts.owner ? '<th scope="col">Visibilitas</th>' : '') + '</tr></thead><tbody>' +
      (rows.length ? rows.map(function (p) {
        var due = MC.dueLabel(p.dueDate, p.status === 'DONE' || p.status === 'ARCHIVED');
        return '<tr><th scope="row"><a class="tbl-name" href="' + base + encodeURIComponent(p.projectId) + '">' + esc(p.name) + '</a><span class="tbl-sub">' + esc(p.projectId) + (p.category ? ' · ' + esc(p.category.name) : '') + '</span></th>' +
          '<td>' + MC.statusBadge(p.status) + '</td><td>' + (MC.priorityBadge(p.priority) || '<span class="hint">' + esc((MC.PRIORITIES.filter(function (x) { return x[0] === p.priority; })[0] || ['', '—'])[1]) + '</span>') + '</td>' +
          '<td class="tbl-prog">' + (p.progress === null ? '<span class="hint">—</span>' : '<div class="progress thin" aria-hidden="true"><span style="width:' + p.progress + '%"></span></div><span class="num">' + p.progress + '%</span>') + '</td>' +
          '<td class="num">' + p.taskDone + '/' + p.taskCount + '</td>' +
          '<td><span class="nowrap">' + esc(p.dueDate ? MC.fmtDay(p.dueDate) : '—') + '</span>' + (due && p.dueDate && due.tone !== 'neutral' ? '<br>' + MC.dueChip(p.dueDate, p.status === 'DONE') : '') + '</td>' +
          '<td class="nowrap hint">' + esc(MC.fmtDate(p.updatedAt)) + '</td>' +
          (opts.owner ? '<td>' + MC.visBadge(p.visibility) + '</td>' : '') + '</tr>';
      }).join('') : '<tr><td colspan="' + (P_COLS.length + (opts.owner ? 1 : 0)) + '" class="hint" style="text-align:center;padding:28px">Tidak ada proyek.</td></tr>') +
      '</tbody></table></div>';
  };
  MC.bindProjectTable = function (root, sort, redraw) {
    $$('[data-sort]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-sort');
        if (sort.key === k) sort.dir = sort.dir === 'asc' ? 'desc' : 'asc';
        else { sort.key = k; sort.dir = (k === 'updatedAt' || k === 'progress') ? 'desc' : 'asc'; }
        redraw();
        var nb = $('[data-sort="' + k + '"]', root); if (nb) nb.focus();
      });
    });
  };

  MC.assetGrid = function (items, opts) {
    return '<div class="asset-grid">' + items.map(function (a) { return MC.assetCard(a, opts); }).join('') + '</div>';
  };

  /* ---------- Grafik 7 hari (satu seri → tanpa legenda; tabel untuk pembaca layar) ---------- */
  MC.weekChart = function (week, metric, unitLabel) {
    if (!week || !week.length) return '';
    var vals = week.map(function (d) { return Number(d[metric]) || 0; });
    var max = Math.max.apply(null, vals);
    if (!max) return '<p class="hint chart-empty">' + icon('activity', 'width="16" height="16"') + ' Belum ada ' + esc(unitLabel) + ' tercatat 7 hari terakhir.</p>';
    var fmt = metric === 'minutes' ? MC.fmtMinutes : function (v) { return v + ' ' + unitLabel; };
    var bars = week.map(function (d, i) {
      var v = vals[i], h = Math.max(v ? 4 : 0, Math.round(v / max * 100));
      var label = MC.fmtDayName(d.date) + ': ' + fmt(v);
      return '<div class="wk-col" tabindex="0" aria-label="' + esc(label) + '" data-tip="' + esc(label) + '">' +
        '<div class="wk-bar-wrap"><div class="wk-bar' + (d.date === MC.todayKey() ? ' is-today' : '') + '" style="height:' + h + '%"></div></div>' +
        '<div class="wk-day">' + esc(MC.dayShort(d.date)) + '</div></div>';
    }).join('');
    var table = '<table class="sr-only"><caption>' + esc(unitLabel) + ' per hari, 7 hari terakhir</caption><tr><th>Hari</th><th>Nilai</th></tr>' +
      week.map(function (d, i) { return '<tr><td>' + esc(MC.fmtDayName(d.date)) + '</td><td>' + esc(fmt(vals[i])) + '</td></tr>'; }).join('') + '</table>';
    return '<div class="wk-chart" aria-hidden="false">' + bars + '</div>' + table;
  };

  /* ---------- Bar status tugas (satu bar bertumpuk + legenda berlabel) ---------- */
  MC.statusBar = function (ts) {
    if (!ts || !ts.total) return '<p class="hint chart-empty">' + icon('tasks', 'width="16" height="16"') + ' Belum ada tugas.</p>';
    var parts = [['DONE', 'Selesai', 'sb-done'], ['REVIEW', 'Review', 'sb-review'], ['IN_PROGRESS', 'Dikerjakan', 'sb-prog'], ['TODO', 'Belum mulai', 'sb-todo']];
    var bar = parts.filter(function (p) { return ts[p[0]]; }).map(function (p) {
      var pct = ts[p[0]] / ts.total * 100;
      return '<span class="sb-seg ' + p[2] + '" style="width:' + pct.toFixed(2) + '%" title="' + esc(p[1] + ': ' + ts[p[0]]) + '"></span>';
    }).join('');
    return '<div class="sb-bar" role="img" aria-label="' + esc(parts.map(function (p) { return p[1] + ' ' + ts[p[0]]; }).join(', ') + ' dari ' + ts.total + ' tugas') + '">' + bar + '</div>' +
      '<dl class="sb-legend">' + parts.map(function (p) {
        return '<div><dt><span class="sb-key ' + p[2] + '" aria-hidden="true"></span>' + esc(p[1]) + '</dt><dd class="num">' + ts[p[0]] + '</dd></div>';
      }).join('') + '<div><dt><span class="sb-key sb-late" aria-hidden="true"></span>Terlambat</dt><dd class="num">' + ts.overdue + '</dd></div></dl>';
  };

  /** Kartu pengingat bergradasi (ajakan bertindak utama). */
  MC.reminderCard = function (o) {
    return '<section class="reminder-card" aria-labelledby="rm-title"><div class="rm-art" aria-hidden="true"><span></span><span></span><span></span>' + icon(o.icon || 'activity') + '</div>' +
      '<div class="rm-text"><div class="rm-eyebrow">' + esc(o.eyebrow || 'Pengingat') + '</div><h2 id="rm-title">' + esc(o.title) + '</h2>' +
      (o.sub ? '<p>' + esc(o.sub) + '</p>' : '') + '</div>' +
      (o.action ? '<button class="btn rm-btn" type="button" ' + o.action + '>' + esc(o.button) + '</button>' : '') + '</section>';
  };

  /* ---------- Daftar ringkas ---------- */
  MC.taskRow = function (t, opts) {
    opts = opts || {};
    var done = t.status === 'DONE';
    return '<li class="task-row' + (done ? ' is-done' : '') + '">' +
      (opts.readonly ? '<span class="tr-check ro" aria-hidden="true">' + (done ? icon('check') : '') + '</span>' :
        '<button class="tr-check" type="button" data-done="' + esc(t.taskId) + '" aria-pressed="' + done + '" aria-label="' + (done ? 'Tandai belum selesai: ' : 'Tandai selesai: ') + esc(t.title) + '">' + (done ? icon('check') : '') + '</button>') +
      '<' + (opts.readonly ? 'div' : 'button type="button" data-task="' + esc(t.taskId) + '"') + ' class="tr-main"><span class="tr-title">' + esc(t.title) + '</span>' +
      '<span class="tr-meta">' + (t.fromSupervisor ? '<span class="badge badge-req">' + icon('send') + 'Dari atasan</span>' : '') + (t.standalone ? '<span class="badge badge-neutral">Mandiri</span>' : (t.projectName ? '<span class="tr-proj">' + icon('folder', 'width="12" height="12"') + esc(t.projectName) + '</span>' : '')) +
      MC.dueChip(t.dueDate, done) + (t.blockerNote && !done ? '<span class="due due-warning">' + icon('alert', 'width="13" height="13"') + 'Ada kendala</span>' : '') +
      (t.evidenceCount ? '<span class="tr-ev">' + icon('image', 'width="13" height="13"') + t.evidenceCount + '</span>' : '') + '</span></' + (opts.readonly ? 'div' : 'button') + '>' +
      '<span class="tr-side">' + MC.priorityBadge(t.priority) + MC.statusBadge(t.status) + '</span></li>';
  };
  MC.activityRow = function (a, opts) {
    opts = opts || {};
    return '<li class="act-row"><span class="act-dot" aria-hidden="true"></span><div class="act-main">' +
      '<div class="act-title">' + esc(a.title) + '</div>' +
      '<div class="act-meta">' + (opts.showDate ? '<span>' + esc(MC.fmtDayName(a.date)) + '</span>' : '') +
      (a.durationMinutes ? '<span>' + icon('clock', 'width="12" height="12"') + esc(MC.fmtMinutes(a.durationMinutes)) + '</span>' : '') +
      (a.projectName ? '<span>' + icon('folder', 'width="12" height="12"') + esc(a.projectName) + '</span>' : '') +
      (opts.owner && a.visibility === 'PRIVATE' ? '<span>' + icon('lock', 'width="12" height="12"') + 'Pribadi</span>' : '') + '</div>' +
      (a.result ? '<div class="act-result">' + icon('checkCircle', 'width="13" height="13"') + esc(a.result) + '</div>' : '') +
      (a.blockerNote ? '<div class="act-blocker">' + icon('alert', 'width="13" height="13"') + esc(a.blockerNote) + '</div>' : '') + '</div>' +
      (opts.owner ? '<button class="icon-btn sm" type="button" data-act-menu="' + esc(a.activityId) + '" aria-label="Kelola aktivitas: ' + esc(a.title) + '">' + icon('edit') + '</button>' : '') + '</li>';
  };
  MC.projectCard = function (p, href) {
    return '<a class="card project-card" href="' + href + '">' +
      '<div class="pc-top"><span class="pc-cat" style="--cat:' + esc(p.category ? p.category.color : '#7868ED') + '">' + esc(p.category ? p.category.name : 'Proyek') + '</span>' +
      '<span class="pc-badges">' + (p.overdue ? '<span class="badge badge-danger">' + icon('alert') + 'Terlambat</span>' : '') + MC.statusBadge(p.status) + '</span></div>' +
      '<h3 class="pc-name">' + esc(p.name) + '</h3>' +
      MC.progressRow(p.progress) +
      '<div class="pc-foot"><span>' + icon('tasks', 'width="14" height="14"') + esc(p.taskDone) + '/' + esc(p.taskCount) + ' tugas</span>' +
      (p.dueDate ? '<span>' + icon('calendar', 'width="14" height="14"') + esc(MC.fmtDay(p.dueDate)) + '</span>' : '') +
      (p.visibility === 'PRIVATE' ? '<span>' + icon('lock', 'width="14" height="14"') + 'Pribadi</span>' : '') + '</div></a>';
  };
  MC.reviewItem = function (r, opts) {
    opts = opts || {};
    var stars = r.rating ? '<span class="stars"><span aria-hidden="true">' + new Array(r.rating + 1).join('★') + '<span class="off">' + new Array(6 - r.rating).join('★') + '</span></span><span class="sr-only">Penilaian ' + r.rating + ' dari 5</span></span>' : '';
    return '<li class="review"><div class="rv-head"><span class="avatar sm" aria-hidden="true">' + esc(MC.initials(r.reviewerName)) + '</span>' +
      '<div class="grow"><strong>' + esc(r.reviewerName) + '</strong> ' + stars +
      '<div class="hint">' + esc(MC.fmtDate(r.createdAt, true)) + (opts.showEntity && r.entityTitle ? ' · ' + esc(r.entityTitle) : '') + '</div></div>' +
      (opts.owner ? (r.status === 'OPEN' ? '<button class="btn btn-secondary btn-sm" type="button" data-ack="' + esc(r.reviewId) + '">' + icon('check') + 'Tandai dibaca</button>' : MC.statusBadge('ACKNOWLEDGED')) : '') +
      '</div><p class="rv-body">' + esc(r.comment) + '</p></li>';
  };
  MC.bindAck = function (root, after) {
    $$('[data-ack]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        MC.setLoading(b, true);
        MC.api('reviews.acknowledge', { reviewId: b.getAttribute('data-ack') }).then(function () {
          MC.toast('Feedback ditandai sudah dibaca.');
          MC.refreshFeedbackBadge();
          if (after) after();
        }, function (e) { MC.setLoading(b, false); MC.toast(e.message, 'error'); });
      });
    });
  };
  MC.refreshFeedbackBadge = function () {
    if (!MC.state.me || MC.state.me.role !== 'OWNER') return;
    MC.api('reviews.list', {}).then(function (r) { MC.setNavBadge('feedback', r.open); }, function () {});
    MC.api('requests.list', {}).then(function (l) { MC.setNavBadge('tasks', l.filter(function (t) { return t.status === 'TODO'; }).length); }, function () {});
  };

  /** Pilihan proyek untuk <select>. */
  MC.projectOptions = function (lk, emptyLabel) {
    return [['', emptyLabel || '— Tanpa proyek (tugas mandiri) —']].concat(lk.projects.map(function (p) { return [p.id, p.name]; }));
  };
  MC.categoryOptions = function (lk) {
    return [['', '— Tanpa kategori —']].concat(lk.categories.map(function (c) { return [c.categoryId, c.name]; }));
  };

  /** Ubah file menjadi base64 (tanpa prefix data:). */
  MC.fileToBase64 = function (file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).split(',')[1] || ''); };
      r.onerror = function () { reject(new Error('File tidak dapat dibaca.')); };
      r.readAsDataURL(file);
    });
  };

  /** Teks tanpa format: buat paragraf dengan baris baru tetap terjaga. */
  MC.multiline = function (s) { return esc(s).replace(/\n/g, '<br>'); };
})(window.MC);

;
/* =========================================================
   Beranda (Mode Saya) & Ringkasan (Mode Atasan)
   Dashboard menjawab: apa yang dikerjakan, apa yang harus selesai hari ini,
   apa yang tertinggal, apa yang sudah dihasilkan, apa berikutnya.
   ========================================================= */
(function (MC) {
  'use strict';
  var $ = MC.$, $$ = MC.$$, esc = MC.esc, icon = MC.icon;

  /** Pasang aksi standar pada daftar tugas (centang selesai & buka detail). */
  MC.bindTaskRows = function (root, onChange) {
    $$('[data-done]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var done = b.getAttribute('aria-pressed') === 'true';
        var id = b.getAttribute('data-done');
        b.disabled = true;
        MC.api('tasks.update', { taskId: id, status: done ? 'IN_PROGRESS' : 'DONE' }).then(function (t) {
          MC.toast(t.status === 'DONE' ? 'Tugas selesai. Kerja bagus!' : 'Tugas dibuka kembali.');
          if (onChange) onChange(t);
        }, function (e) { b.disabled = false; MC.toast(e.message, 'error'); });
      });
    });
    $$('[data-task]', root).forEach(function (b) {
      b.addEventListener('click', function () { MC.openTask(b.getAttribute('data-task'), onChange); });
    });
  };

  /** Pengingat kontekstual: laporan mingguan di akhir pekan, catat aktivitas bila hari ini masih kosong. */
  function reminder(d) {
    var dow = new Date().getDay();
    var today = d.week && d.week.length ? d.week[d.week.length - 1] : null;
    if (d.stats.requestsNew) {
      return MC.reminderCard({ icon: 'send', eyebrow: 'Dari atasan', title: d.stats.requestsNew + ' permintaan perlu ditanggapi', sub: 'Permintaan baru atau komentar atasan yang belum dibalas.', button: 'Lihat permintaan', action: 'data-go="#/tasks/requests"' });
    }
    if (dow === 5 || dow === 6 || dow === 0) {
      return MC.reminderCard({ icon: 'report', title: 'Buat laporan mingguan', sub: 'Rangkum pekerjaan minggu ini dan terbitkan untuk atasan.', button: 'Buat laporan', action: 'data-create="report"' });
    }
    if (today && !today.activities) {
      return MC.reminderCard({ icon: 'activity', title: 'Catat aktivitas hari ini', sub: 'Cukup 10–30 detik. Catatan ini otomatis masuk laporan.', button: 'Catat sekarang', action: 'data-create="activity"' });
    }
    if (d.stats.overdueTasks) {
      return MC.reminderCard({ icon: 'alert', title: d.stats.overdueTasks + ' tugas terlambat', sub: 'Perbarui status atau tulis kendalanya agar atasan tahu.', button: 'Lihat tugas', action: 'data-go="#/tasks/overdue"' });
    }
    return MC.reminderCard({ icon: 'checkCircle', eyebrow: 'Kerja bagus', title: 'Aktivitas hari ini tercatat', sub: 'Jangan lupa unggah bukti kerja dari tugas yang selesai.', button: 'Unggah bukti', action: 'data-create="upload"' });
  }

  MC.PAGES.overview = function (main) {
    if (MC.state.lastView !== location.hash) MC.skeletonPage(main);
    MC.load('dashboard.owner', {}, function (d) {
      if (!MC.stillOn('overview')) return;
      var s = d.stats, st = d.setup, me = MC.state.me;
      MC.setNavBadge('feedback', s.feedbackOpen);
      MC.setNavBadge('tasks', s.requestsNew);
      var steps = [
        { done: st.firstProject, t: 'Buat proyek pertama', href: '#/projects', act: 'project' },
        { done: st.brandingDone, t: 'Pasang logo Media Center / sekolah', href: '#/settings/branding' },
        { done: st.organizationSet, t: 'Isi nama sekolah / lembaga', href: '#/settings/branding' },
        { done: st.supervisorInvited, t: 'Undang atasan', href: '#/settings/accounts' }
      ];
      var doneCount = steps.filter(function (x) { return x.done; }).length;
      var setupCard = doneCount === steps.length ? '' :
        '<section class="card card-pad setup-card"><div class="setup-head"><div><h2>Siapkan workspace kamu</h2><p class="hint">' + doneCount + ' dari ' + steps.length + ' langkah selesai</p></div>' +
        '<div class="progress" role="progressbar" aria-valuenow="' + Math.round(doneCount / steps.length * 100) + '" aria-valuemin="0" aria-valuemax="100" aria-label="Kesiapan workspace"><span style="width:' + (doneCount / steps.length * 100) + '%"></span></div></div>' +
        '<ul class="checklist">' + steps.map(function (x) {
          return '<li class="check-item' + (x.done ? ' done' : '') + '"><span class="tick" aria-hidden="true">' + (x.done ? icon('check') : '') + '</span>' +
            (x.done ? '<span>' + esc(x.t) + '</span><span class="sr-only">(selesai)</span>' : (x.act ? '<button type="button" class="linkish" data-setup-act="' + x.act + '">' + esc(x.t) + '</button>' : '<a href="' + x.href + '">' + esc(x.t) + '</a>')) + '</li>';
        }).join('') + '</ul></section>';

      var focus = d.overdueTasks.concat(d.todayTasks.filter(function (t) { return !d.overdueTasks.some(function (o) { return o.taskId === t.taskId; }); }));
      var focusHtml = focus.length ? '<ul class="task-list">' + focus.map(function (t) { return MC.taskRow(t); }).join('') + '</ul>'
        : MC.emptyState('checkCircle', 'Tidak ada yang mendesak hari ini', 'Tugas dengan deadline hari ini atau yang terlambat akan muncul di sini.',
          '<button class="btn btn-secondary btn-sm" type="button" data-create="task">' + icon('plus') + 'Tambah tugas</button>');
      var progHtml = d.inProgress.length ? '<ul class="task-list">' + d.inProgress.map(function (t) { return MC.taskRow(t); }).join('') + '</ul>'
        : '<p class="hint pad">Belum ada tugas yang sedang dikerjakan.</p>';
      var upcomingHtml = d.upcoming.length ? '<ul class="task-list compact">' + d.upcoming.map(function (t) { return MC.taskRow(t); }).join('') + '</ul>'
        : '<p class="hint pad">Tidak ada deadline dalam 7 hari ke depan.</p>';
      var fb = d.feedback.filter(function (r) { return r.status === 'OPEN'; });

      main.innerHTML = '<div class="page">' +
        MC.pageHead(MC.fmtDateLong(new Date()), MC.greeting() + ', ' + (me.displayName || '').split(' ')[0] + '!', 'Ini ringkasan pekerjaan Media Center kamu.',
          '<button class="btn btn-secondary" type="button" data-create="task">' + icon('plus') + 'Tugas</button>' +
          '<button class="btn btn-primary" type="button" data-create="activity">' + icon('activity') + 'Catat aktivitas</button>') +
        setupCard +
        '<div class="grid grid-stats five">' +
        MC.statCard({ label: 'Proyek aktif', value: s.activeProjects, icon: 'folder', tone: 'primary', href: '#/projects' }) +
        MC.statCard({ label: 'Tugas hari ini', value: s.tasksToday, icon: 'calendar', tone: 'info', href: '#/tasks/today' }) +
        MC.statCard({ label: 'Terlambat', value: s.overdueTasks, icon: s.overdueTasks ? 'alert' : 'checkCircle', tone: s.overdueTasks ? 'danger' : 'success', href: '#/tasks/overdue', meta: s.overdueTasks ? 'Perlu perhatian' : 'Semua sesuai jadwal' }) +
        MC.statCard({ label: 'Selesai 7 hari', value: s.tasksDoneThisWeek, icon: 'checkCircle', tone: 'success', href: '#/tasks/done' }) +
        MC.statCard({ label: 'Jam kerja 7 hari', value: String(s.hoursThisWeek).replace('.', ','), icon: 'clock', tone: 'warning', href: '#/activity', meta: 'dari catatan aktivitas' }) +
        '</div>' +
        '<div class="grid grid-main">' +
        '<div class="stack">' +
        '<section class="card"><div class="card-head"><div><h2>Fokus hari ini</h2><p>Terlambat & deadline hari ini</p></div><a class="btn btn-ghost btn-sm" href="#/tasks">Semua tugas' + icon('arrowRight') + '</a></div><div class="card-body flush" id="focus-list">' + focusHtml + '</div></section>' +
        '<section class="card"><div class="card-head"><div><h2>Sedang dikerjakan</h2></div></div><div class="card-body flush" id="prog-list">' + progHtml + '</div></section>' +
        '</div><div class="stack">' + reminder(d) +
        '<section class="card"><div class="card-head"><div><h2>Statistik tugas</h2><p>' + d.taskStatus.total + ' tugas aktif & selesai</p></div><a class="btn btn-ghost btn-sm" href="#/tasks/all">Semua' + icon('arrowRight') + '</a></div><div class="card-body">' + MC.statusBar(d.taskStatus) + '</div></section>' +
        '<section class="card"><div class="card-head"><div><h2>Jam kerja 7 hari</h2><p>Total ' + esc(String(s.hoursThisWeek).replace('.', ',')) + ' jam dari catatan aktivitas</p></div></div><div class="card-body">' + MC.weekChart(d.week, 'minutes', 'jam kerja') + '</div></section>' +
        (fb.length ? '<section class="card accent-card"><div class="card-head"><div><h2>' + icon('message') + ' Feedback atasan</h2><p>' + fb.length + ' belum dibaca</p></div><a class="btn btn-ghost btn-sm" href="#/feedback">Lihat semua</a></div><div class="card-body"><ul class="review-list">' +
          fb.slice(0, 2).map(function (r) { return MC.reviewItem(r, { owner: true, showEntity: true }); }).join('') + '</ul></div></section>' : '') +
        '<section class="card"><div class="card-head"><div><h2>7 hari ke depan</h2><p>Deadline mendatang</p></div></div><div class="card-body flush">' + upcomingHtml + '</div></section>' +
        '</div></div>' +
        '<section class="section"><div class="section-head"><h2>Proyek aktif</h2><a class="btn btn-ghost btn-sm" href="#/projects">Semua proyek' + icon('arrowRight') + '</a></div>' +
        (d.projects.length ? '<div class="project-grid">' + d.projects.map(function (p) { return MC.projectCard(p, '#/projects/' + encodeURIComponent(p.projectId)); }).join('') + '</div>'
          : '<div class="card card-pad">' + MC.emptyState('folder', 'Belum ada proyek aktif', 'Buat proyek untuk pekerjaan besar seperti campaign atau dokumentasi acara.', '<button class="btn btn-primary" type="button" data-create="project">' + icon('plus') + 'Buat proyek</button>') + '</div>') + '</section>' +
        '<section class="card"><div class="card-head"><div><h2>Aktivitas terbaru</h2></div><a class="btn btn-ghost btn-sm" href="#/activity">Semua aktivitas' + icon('arrowRight') + '</a></div><div class="card-body">' +
        (d.recentActivity.length ? '<ul class="act-list">' + d.recentActivity.map(function (a) { return MC.activityRow(a, { showDate: true }); }).join('') + '</ul>'
          : MC.emptyState('activity', 'Belum ada aktivitas', 'Catat pekerjaan harian dalam 10–30 detik. Catatan ini menjadi bahan laporan otomatis.')) +
        '</div></section></div>';

      var reload = function () { MC.PAGES.overview(main); };
      MC.bindTaskRows(main, reload);
      MC.bindAck(main, reload);
      $$('[data-create]', main).forEach(function (b) { b.addEventListener('click', function () { MC.create(b.getAttribute('data-create'), reload); }); });
      $$('[data-go]', main).forEach(function (b) { b.addEventListener('click', function () { location.hash = b.getAttribute('data-go'); }); });
      $$('[data-setup-act]', main).forEach(function (b) { b.addEventListener('click', function () { MC.create(b.getAttribute('data-setup-act'), reload); }); });
      MC.focusHeading();
    }, function (err) { MC.errorState(main, err, function () { MC.PAGES.overview(main); }); });
  };

  /* ---------------- Mode Atasan ---------------- */
  MC.PAGES.exec = function (main) {
    if (MC.state.lastView !== location.hash) MC.skeletonPage(main);
    MC.load('dashboard.executive', {}, function (d) {
      if (!MC.stillOn('exec')) return;
      var b = MC.state.branding || {}, s = d.stats;
      var isOwner = MC.state.me.role === 'OWNER';
      main.innerHTML = '<div class="page">' +
        MC.pageHead('Mode Atasan', 'Ringkasan Media Center', esc(b.organizationName ? b.organizationName + ' · ' : '') + 'Data per ' + esc(MC.fmtDate(d.generatedAt, true)),
          '<button class="btn btn-secondary" type="button" id="exec-refresh">' + icon('refresh') + 'Muat ulang</button>' +
          (isOwner ? '' : '<button class="btn btn-primary" type="button" id="exec-fb">' + icon('message') + 'Beri feedback</button>')) +
        '<div class="grid grid-stats five">' +
        MC.statCard({ label: 'Proyek berjalan', value: s.activeProjects, icon: 'folder', tone: 'primary', href: '#/exec-projects' }) +
        MC.statCard({ label: 'Proyek selesai', value: s.completedProjects, icon: 'checkCircle', tone: 'success', href: '#/exec-projects' }) +
        MC.statCard({ label: 'Proyek terlambat', value: s.lateProjects, icon: s.lateProjects ? 'alert' : 'checkCircle', tone: s.lateProjects ? 'danger' : 'success', href: '#/exec-projects', meta: s.lateProjects ? 'Lewat deadline' : 'Semua sesuai jadwal' }) +
        MC.statCard({ label: 'Tugas selesai bulan ini', value: s.tasksDoneThisMonth, icon: 'tasks', tone: 'info' }) +
        MC.statCard({ label: 'Aktivitas bulan ini', value: s.activitiesThisMonth, icon: 'activity', tone: 'warning', href: '#/exec-activity', meta: String(s.hoursThisMonth).replace('.', ',') + ' jam tercatat' }) +
        '</div>' +
        '<div class="grid grid-main"><div class="stack">' +
        '<section class="card"><div class="card-head"><div><h2>Progres proyek</h2><p>Proyek yang dibagikan ke atasan</p></div><a class="btn btn-ghost btn-sm" href="#/exec-projects">Semua' + icon('arrowRight') + '</a></div><div class="card-body">' +
        (d.projects.length ? '<ul class="list">' + d.projects.map(function (p) {
          return '<li class="list-item block"><a class="row-link" href="#/exec-projects/' + encodeURIComponent(p.projectId) + '"><div class="row-top"><span class="title">' + esc(p.name) + '</span><span class="row-badges">' +
            (p.overdue ? '<span class="badge badge-danger">' + icon('alert') + 'Terlambat</span>' : '') + MC.statusBadge(p.status) + '</span></div>' +
            MC.progressRow(p.progress) + '<div class="meta">' + esc(p.taskDone) + '/' + esc(p.taskCount) + ' tugas selesai' + (p.dueDate ? ' · Deadline ' + esc(MC.fmtDay(p.dueDate)) : '') + '</div></a></li>';
        }).join('') + '</ul>' : MC.emptyState('folder', 'Belum ada proyek', 'Proyek yang dibagikan ke atasan akan tampil di sini.')) +
        '</div></section>' +
        '<section class="card"><div class="card-head"><div><h2>Bukti kerja terbaru</h2><p>' + esc(s.evidence) + ' file dibagikan</p></div><a class="btn btn-ghost btn-sm" href="#/exec-assets">Semua' + icon('arrowRight') + '</a></div><div class="card-body">' +
        (d.recentEvidence.length ? MC.assetGrid(d.recentEvidence, { exec: true }) : MC.emptyState('image', 'Belum ada bukti kerja', 'Foto, video, dan dokumen yang dibagikan akan tampil di sini.')) + '</div></section>' +
        '</div><div class="stack">' +
        '<section class="card"><div class="card-head"><div><h2>Laporan terbaru</h2></div><a class="btn btn-ghost btn-sm" href="#/exec-reports">Semua' + icon('arrowRight') + '</a></div><div class="card-body">' +
        (d.latestReport ? '<a class="report-mini" href="#/exec-reports/' + encodeURIComponent(d.latestReport.reportId) + '"><span class="dot-ico">' + icon('report') + '</span><span class="grow"><span class="t">' + esc(d.latestReport.title) + '</span>' +
          '<span class="d">' + (d.latestReport.stats ? esc(d.latestReport.stats.tasksDone) + ' tugas selesai · ' + esc(d.latestReport.stats.activities) + ' aktivitas' : '') + '</span></span>' + icon('arrowRight', 'width="18" height="18"') + '</a>'
          : '<p class="hint">Belum ada laporan yang diterbitkan.</p>') + '</div></section>' +
        '<section class="card"><div class="card-head"><div><h2>Statistik tugas</h2><p>Tugas yang dibagikan</p></div></div><div class="card-body">' + MC.statusBar(d.taskStatus) + '</div></section>' +
        '<section class="card"><div class="card-head"><div><h2>Aktivitas 7 hari</h2><p>Jumlah kegiatan per hari</p></div></div><div class="card-body">' + MC.weekChart(d.week, 'activities', 'aktivitas') + '</div></section>' +
        '<section class="card"><div class="card-head"><div><h2>Aktivitas terbaru</h2></div><a class="btn btn-ghost btn-sm" href="#/exec-activity">Semua' + icon('arrowRight') + '</a></div><div class="card-body">' +
        (d.recentActivity.length ? '<ul class="act-list">' + d.recentActivity.map(function (a) { return MC.activityRow(a, { showDate: true }); }).join('') + '</ul>'
          : MC.emptyState('activity', 'Belum ada aktivitas', 'Aktivitas yang dibagikan akan muncul di sini.')) + '</div></section>' +
        '</div></div></div>';
      $('#exec-refresh').addEventListener('click', function () { MC.PAGES.exec(main); });
      if ($('#exec-fb')) $('#exec-fb').addEventListener('click', function () { MC.feedbackDialog('GENERAL', '', 'Feedback umum'); });
      MC.bindAssetOpen(main, true);
      MC.loadThumbs(main);
      MC.focusHeading();
    }, function (err) { MC.errorState(main, err, function () { MC.PAGES.exec(main); }); });
  };
})(window.MC);

;
/* =========================================================
   Proyek, Tugas, Aktivitas + Quick Create
   ========================================================= */
(function (MC) {
  'use strict';
  var $ = MC.$, $$ = MC.$$, esc = MC.esc, icon = MC.icon;

  function opt(list) { return list.map(function (x) { return [x[0], x[1]]; }); }
  var WEIGHTS = [['1', '1 — ringan'], ['2', '2'], ['3', '3 — sedang'], ['4', '4'], ['5', '5 — berat']];

  /* =================== Quick Create =================== */
  MC.create = function (type, after, preset) {
    preset = preset || {};
    if (type === 'task') return taskForm(null, preset, after);
    if (type === 'activity') return activityForm(null, preset, after);
    if (type === 'project') return projectForm(null, after);
    if (type === 'upload') return MC.uploadDialog(preset, after);
    if (type === 'report') { location.hash = '#/reports/new'; return null; }
  };
  function done(after, fallback) {
    return function (x) { MC.invalidate(); MC.closeOverlay(); if (after) after(x); else if (fallback) fallback(x); };
  }
  function refreshCurrent() { MC.route(); }

  /* =================== Form Proyek =================== */
  function projectForm(p, after) {
    MC.lookup().then(function (lk) {
      var edit = !!p;
      p = p || { status: 'IN_PROGRESS', priority: 'MEDIUM', visibility: 'SUPERVISOR', startDate: MC.todayKey() };
      MC.formDialog({
        title: edit ? 'Ubah proyek' : 'Proyek baru', icon: 'folder', wide: true,
        sub: edit ? p.projectId : 'Folder Google Drive dibuat otomatis untuk proyek ini.',
        submitText: edit ? 'Simpan perubahan' : 'Buat proyek',
        body:
          MC.field({ name: 'name', label: 'Nama proyek', required: true, value: p.name, maxlength: 120, placeholder: 'Contoh: Campaign PPDB 2027', full: true }) +
          MC.field({ name: 'dueDate', label: 'Deadline', type: 'date', value: p.dueDate }) +
          MC.field({ name: 'priority', label: 'Prioritas', type: 'select', value: p.priority, options: opt(MC.PRIORITIES), required: true }) +
          MC.field({ name: 'categoryId', label: 'Kategori', type: 'select', value: p.categoryId, options: MC.categoryOptions(lk) }) +
          MC.field({ name: 'status', label: 'Status', type: 'select', value: p.status, options: opt(MC.PROJECT_STATUSES), required: true }) +
          MC.field({ name: 'startDate', label: 'Tanggal mulai', type: 'date', value: p.startDate }) +
          MC.field({ name: 'description', label: 'Brief / deskripsi', type: 'textarea', value: p.description, maxlength: 5000, placeholder: 'Apa yang dikerjakan, untuk siapa, kebutuhan konten…', full: true }) +
          MC.field({ name: 'objective', label: 'Tujuan', type: 'textarea', rows: 2, value: p.objective, maxlength: 2000, placeholder: 'Contoh: menambah pendaftar 20%', full: true }) +
          MC.field({ name: 'sharedWithSupervisor', label: 'Tampilkan ke atasan', type: 'switch', value: p.visibility !== 'PRIVATE', full: true,
            hint: 'Jika dimatikan, proyek beserta tugas, aktivitas, dan file di dalamnya tidak terlihat di Mode Atasan.' }),
        onSubmit: function (form) {
          var v = MC.validate(form, [['name', 'required', 'Nama proyek minimal 3 karakter.', 3], ['dueDate', 'after', 'Deadline tidak boleh sebelum tanggal mulai.', 'startDate']]);
          if (!v) return null;
          if (edit) v.projectId = p.projectId;
          return MC.api(edit ? 'projects.update' : 'projects.create', v).then(function (r) {
            MC.toast(edit ? 'Proyek diperbarui.' : 'Proyek "' + r.project.name + '" dibuat.');
            if (r.warning) MC.toast(r.warning, 'error');
            done(after, function () { location.hash = '#/projects/' + encodeURIComponent(r.project.projectId); })(r);
          });
        }
      });
    }, function (e) { MC.toast(e.message, 'error'); });
  }

  /* =================== Form Tugas =================== */
  function taskForm(t, preset, after) {
    MC.lookup().then(function (lk) {
      var edit = !!t;
      t = t || { priority: 'MEDIUM', weight: 1, visibility: 'SUPERVISOR', projectId: preset.projectId || '', dueDate: preset.dueDate || '' };
      MC.formDialog({
        title: edit ? 'Ubah tugas' : 'Tugas baru', icon: 'tasks', wide: true,
        sub: edit ? '' : 'Tugas tanpa proyek otomatis menjadi tugas mandiri.',
        submitText: edit ? 'Simpan perubahan' : 'Tambah tugas',
        body:
          MC.field({ name: 'title', label: 'Judul tugas', required: true, value: t.title, maxlength: 200, placeholder: 'Contoh: Desain poster lomba kebersihan', full: true }) +
          MC.field({ name: 'projectId', label: 'Proyek', type: 'select', value: t.projectId, options: MC.projectOptions(lk) }) +
          MC.field({ name: 'dueDate', label: 'Deadline', type: 'date', value: t.dueDate }) +
          MC.field({ name: 'priority', label: 'Prioritas', type: 'select', value: t.priority, options: opt(MC.PRIORITIES), required: true }) +
          MC.field({ name: 'weight', label: 'Bobot terhadap progres proyek', type: 'select', value: String(t.weight || 1), options: WEIGHTS, required: true }) +
          MC.field({ name: 'categoryId', label: 'Kategori', type: 'select', value: t.categoryId, options: MC.categoryOptions(lk) }) +
          MC.field({ name: 'plannedDate', label: 'Rencana dikerjakan', type: 'date', value: t.plannedDate }) +
          MC.field({ name: 'description', label: 'Catatan / detail', type: 'textarea', value: t.description, maxlength: 5000, full: true }) +
          MC.field({ name: 'sharedWithSupervisor', label: 'Tampilkan ke atasan', type: 'switch', value: t.visibility !== 'PRIVATE', full: true,
            hint: 'Matikan untuk tugas pribadi (misalnya catatan belajar).' }),
        onSubmit: function (form) {
          var v = MC.validate(form, [['title', 'required', 'Judul tugas minimal 2 karakter.', 2]]);
          if (!v) return null;
          v.weight = Number(v.weight);
          if (edit) v.taskId = t.taskId;
          return MC.api(edit ? 'tasks.update' : 'tasks.create', v).then(function (r) {
            MC.toast(edit ? 'Tugas diperbarui.' : 'Tugas ditambahkan.');
            done(after, refreshCurrent)(r);
          });
        }
      });
    }, function (e) { MC.toast(e.message, 'error'); });
  }

  /* =================== Form Aktivitas =================== */
  var DURATIONS = [[15, '15 m'], [30, '30 m'], [60, '1 j'], [90, '1,5 j'], [120, '2 j'], [180, '3 j']];
  function activityForm(a, preset, after) {
    MC.lookup().then(function (lk) {
      var edit = !!a;
      a = a || { date: MC.todayKey(), durationMinutes: preset.durationMinutes || '', title: preset.title || '', projectId: preset.projectId || '', taskId: preset.taskId || '', visibility: 'SUPERVISOR' };
      var taskOpts = function (projectId) {
        return [['', '— Tidak terkait tugas —']].concat(lk.tasks.filter(function (t) { return !projectId || t.projectId === projectId; })
          .map(function (t) { return [t.id, t.title]; }));
      };
      var f = MC.formDialog({
        title: edit ? 'Ubah aktivitas' : 'Catat aktivitas', icon: 'activity', wide: true,
        sub: edit ? '' : 'Catatan ini otomatis masuk ke laporan harian, mingguan, dan bulanan.',
        submitText: edit ? 'Simpan perubahan' : 'Simpan aktivitas',
        body:
          MC.field({ name: 'title', label: 'Apa yang dikerjakan?', required: true, value: a.title, maxlength: 200, placeholder: 'Contoh: Liputan upacara HUT sekolah', full: true }) +
          MC.field({ name: 'date', label: 'Tanggal', type: 'date', value: a.date, max: MC.todayKey(), required: true }) +
          '<div class="field"><label class="label" for="dur-in">Durasi (menit) <span class="opt">(opsional)</span></label><input class="input" id="dur-in" name="durationMinutes" type="number" min="0" max="1440" inputmode="numeric" value="' + esc(a.durationMinutes || '') + '" aria-describedby="dur-in-e">' +
          '<div class="chips" role="group" aria-label="Pilih durasi cepat">' + DURATIONS.map(function (d) { return '<button type="button" class="chip" data-dur="' + d[0] + '">' + d[1] + '</button>'; }).join('') + '</div>' +
          '<div class="field-error" id="dur-in-e" role="alert" hidden></div></div>' +
          MC.field({ name: 'result', label: 'Hasil', value: a.result, maxlength: 500, placeholder: 'Contoh: 48 foto terarsip, draft selesai', full: true }) +
          MC.field({ name: 'projectId', label: 'Proyek', type: 'select', value: a.projectId, options: MC.projectOptions(lk, '— Tidak terkait proyek —') }) +
          MC.field({ name: 'taskId', label: 'Tugas', type: 'select', value: a.taskId, options: taskOpts(a.projectId) }) +
          MC.field({ name: 'categoryId', label: 'Kategori', type: 'select', value: a.categoryId, options: MC.categoryOptions(lk) }) +
          MC.field({ name: 'blockerNote', label: 'Kendala', value: a.blockerNote, maxlength: 1000, placeholder: 'Kosongkan bila tidak ada' }) +
          MC.field({ name: 'description', label: 'Catatan tambahan', type: 'textarea', rows: 2, value: a.description, maxlength: 3000, full: true }) +
          MC.field({ name: 'sharedWithSupervisor', label: 'Tampilkan ke atasan', type: 'switch', value: a.visibility !== 'PRIVATE', full: true,
            hint: 'Matikan untuk catatan pribadi seperti catatan belajar.' }),
        onSubmit: function (form) {
          var v = MC.validate(form, [['title', 'required', 'Judul aktivitas minimal 3 karakter.', 3], ['date', 'required', 'Tanggal wajib diisi.']]);
          if (!v) return null;
          if (v.date > MC.todayKey()) { MC.fieldError(form, 'date', 'Tanggal aktivitas tidak boleh di masa depan.'); return null; }
          if (edit) v.activityId = a.activityId;
          return MC.api(edit ? 'activities.update' : 'activities.create', v).then(function (r) {
            MC.toast(edit ? 'Aktivitas diperbarui.' : 'Aktivitas tercatat.');
            done(after, refreshCurrent)(r);
          });
        },
        onOpen: function (form) {
          $$('[data-dur]', form).forEach(function (c) {
            c.addEventListener('click', function () { $('[name=durationMinutes]', form).value = c.getAttribute('data-dur'); });
          });
          var ps = $('[name=projectId]', form), ts = $('[name=taskId]', form);
          ps.addEventListener('change', function () {
            var cur = ts.value;
            ts.innerHTML = taskOpts(ps.value).map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join('');
            if ($('option[value="' + cur + '"]', ts)) ts.value = cur;
          });
          ts.addEventListener('change', function () {
            var t = lk.tasks.filter(function (x) { return x.id === ts.value; })[0];
            if (t && t.projectId && ps.value !== t.projectId) ps.value = t.projectId;
          });
        }
      });
      return f;
    }, function (e) { MC.toast(e.message, 'error'); });
  }
  MC.activityForm = activityForm;

  /* =================== Panel detail tugas =================== */
  MC.openTask = function (taskId, onChange, wasChanged) {
    var changed = !!wasChanged;
    var ov = MC.openOverlay('<div class="drawer-head"><h2 id="dlg-title">Detail tugas</h2><button class="icon-btn" type="button" data-close aria-label="Tutup">' + icon('x') + '</button></div>' +
      '<div class="drawer-body" id="td-body">' + MC.loadingBox(200) + '</div>', {
        drawer: true,
        // Dipanggil untuk semua cara menutup (X, Esc, klik di luar). Saat berpindah ke form lain (handoff), daftar tidak dimuat ulang dulu.
        onClose: function () { if (changed && onChange && !handoff) onChange(); }
      });
    var handoff = false;
    $('[data-close]', ov).addEventListener('click', MC.closeOverlay);

    function load() {
      MC.api('tasks.get', { taskId: taskId }).then(render, function (e) {
        $('#td-body').innerHTML = '<div class="alert alert-error">' + icon('alert') + '<div>' + esc(e.message) + '</div></div>';
      });
    }
    function update(patch, msg) {
      patch.taskId = taskId;
      return MC.api('tasks.update', patch).then(function () { changed = true; if (msg) MC.toast(msg); load(); }, function (e) { MC.toast(e.message, 'error'); load(); });
    }
    function render(d) {
      var t = d.task;
      var results = d.assets.filter(function (a) { return a.stage !== 'REFERENCE'; });
      var body = $('#td-body');
      if (!body) return;
      body.innerHTML =
        '<div class="td-title"><h3>' + esc(t.title) + '</h3><div class="td-badges">' + MC.statusBadge(t.status) + MC.priorityBadge(t.priority) + MC.visBadge(t.visibility) +
        (t.standalone ? '<span class="badge badge-neutral">Mandiri</span>' : '') + '</div>' +
        (t.projectName ? '<a class="td-proj" href="#/projects/' + encodeURIComponent(t.projectId) + '">' + icon('folder', 'width="14" height="14"') + esc(t.projectName) + '</a>' : '') + '</div>' +
        (t.fromSupervisor ? requestBox(t, d) : '') +
        '<div class="td-section"><span class="label" id="st-lbl">Status</span>' +
        MC.segmented('st', [['TODO', 'Belum'], ['IN_PROGRESS', 'Dikerjakan'], ['REVIEW', 'Review'], ['DONE', 'Selesai']], t.status, 'Ubah status tugas') + '</div>' +
        '<div class="td-section"><label class="label" for="td-prog">Progres</label><div class="range-row"><input type="range" id="td-prog" min="0" max="100" step="5" value="' + t.progress + '"' + (t.status === 'DONE' ? ' disabled' : '') + '><output class="num" for="td-prog">' + t.progress + '%</output></div>' +
        '<span class="hint">Geser ke 100% untuk menandai selesai.</span></div>' +
        '<dl class="kv td-kv"><dt>Deadline</dt><dd>' + (t.dueDate ? esc(MC.fmtDay(t.dueDate)) + ' ' + MC.dueChip(t.dueDate, t.status === 'DONE') : '—') + '</dd>' +
        '<dt>Bobot</dt><dd>' + esc(t.weight) + (t.standalone ? '' : ' <span class="hint">(memengaruhi progres proyek)</span>') + '</dd>' +
        (t.plannedDate ? '<dt>Rencana</dt><dd>' + esc(MC.fmtDay(t.plannedDate)) + '</dd>' : '') +
        (t.category ? '<dt>Kategori</dt><dd>' + esc(t.category.name) + '</dd>' : '') +
        (t.completedAt ? '<dt>Selesai</dt><dd>' + esc(MC.fmtDate(t.completedAt, true)) + '</dd>' : '') + '</dl>' +
        (t.description ? '<div class="td-section"><span class="label">Catatan</span><p class="td-desc">' + MC.multiline(t.description) + '</p></div>' : '') +
        '<div class="td-section"><label class="label" for="td-block">Kendala</label><div class="inline-form"><input class="input" id="td-block" maxlength="1000" value="' + esc(t.blockerNote) + '" placeholder="Tulis kendala, kosongkan bila tidak ada">' +
        '<button class="btn btn-secondary" type="button" id="td-block-save">Simpan</button></div></div>' +
        '<div class="td-actions">' +
        '<button class="btn btn-primary" type="button" id="td-log">' + icon('activity') + 'Catat aktivitas</button>' +
        '<button class="btn btn-secondary" type="button" id="td-up">' + icon('upload') + 'Unggah bukti</button>' +
        '<button class="btn btn-secondary" type="button" id="td-edit">' + icon('edit') + 'Ubah</button>' +
        '<button class="btn btn-danger" type="button" id="td-del">' + icon('trash') + 'Hapus</button></div>' +
        '<div class="td-section"><h4>Bukti kerja (' + results.length + ')</h4>' + (results.length ? MC.assetGrid(results) : '<p class="hint">Belum ada file. Unggah hasil kerja agar bisa dilihat atasan & masuk portofolio.</p>') + '</div>' +
        '<div class="td-section"><h4>Aktivitas (' + d.activities.length + ')</h4>' + (d.activities.length ? '<ul class="act-list">' + d.activities.map(function (a) { return MC.activityRow(a, { showDate: true }); }).join('') + '</ul>' : '<p class="hint">Belum ada aktivitas untuk tugas ini.</p>') + '</div>';

      var cf = $('#rq-form');
      if (cf) cf.addEventListener('submit', function (e) {
        e.preventDefault();
        var inp = $('#rq-comment'), txt = inp.value.trim();
        if (txt.length < 2) { MC.toast('Tulis komentar minimal 2 karakter.', 'error'); inp.focus(); return; }
        var btn = $('button[type=submit]', cf);
        MC.setLoading(btn, true);
        MC.api('requests.comment', { taskId: t.taskId, comment: txt }).then(function () { changed = true; MC.toast('Balasan terkirim ke atasan.'); load(); },
          function (er) { MC.setLoading(btn, false); MC.toast(er.message, 'error'); });
      });
      MC.bindSegmented(body, 'st', function (v) { update({ status: v }, v === 'DONE' ? 'Tugas selesai. Kerja bagus!' : 'Status diperbarui.'); });
      var r = $('#td-prog'), out = r.nextElementSibling, deb;
      r.addEventListener('input', function () { out.textContent = r.value + '%'; });
      r.addEventListener('change', function () { clearTimeout(deb); deb = setTimeout(function () { update({ progress: Number(r.value) }, 'Progres disimpan.'); }, 150); });
      $('#td-block-save').addEventListener('click', function () { update({ blockerNote: $('#td-block').value }, 'Kendala disimpan.'); });
      $('#td-log').addEventListener('click', function () { handoff = true; activityForm(null, { taskId: t.taskId, projectId: t.projectId, title: t.title }, function () { changed = true; MC.openTaskAgain(); }); });
      $('#td-up').addEventListener('click', function () { handoff = true; MC.uploadDialog({ taskId: t.taskId, projectId: t.projectId, label: t.title }, function () { changed = true; MC.openTaskAgain(); }); });
      $('#td-edit').addEventListener('click', function () { handoff = true; taskForm(t, {}, function () { changed = true; MC.openTaskAgain(); }); });
      $('#td-del').addEventListener('click', function () {
        handoff = true;
        MC.confirmDialog({ title: 'Hapus tugas?', message: '"' + t.title + '" akan dihapus dari daftar. File bukti di Google Drive tidak ikut terhapus.', danger: true, confirmText: 'Hapus tugas', icon: 'trash' })
          .then(function (yes) {
            if (!yes) { MC.openTaskAgain(); return; }
            MC.api('tasks.remove', { taskId: t.taskId }).then(function () { MC.toast('Tugas dihapus.'); if (onChange) onChange(); else MC.route(); },
              function (e) { MC.toast(e.message, 'error'); });
          });
      });
      MC.bindAssetOpen(body);
      MC.loadThumbs(body);
    }
    MC.openTaskAgain = function () { MC.openTask(taskId, onChange, changed); };
    load();
  };

  /** Kotak permintaan atasan di panel tugas: brief, tautan, file referensi, diskusi. */
  function requestBox(t, d) {
    var refs = d.assets.filter(function (a) { return a.stage === 'REFERENCE'; });
    return '<section class="req-box" aria-label="Permintaan dari atasan"><div class="req-head">' + icon('send') + '<div><strong>Permintaan dari ' + esc(t.requestedBy) + '</strong>' +
      '<span class="hint">' + esc(MC.fmtDate(t.requestedAt, true)) + '</span></div></div>' +
      (t.referenceLinks.length ? '<div class="req-sec"><span class="label">Tautan referensi</span><ul class="link-list">' + t.referenceLinks.map(function (u) {
        return '<li><a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + icon('link', 'width="14" height="14"') + '<span>' + esc(u.replace(/^https?:\/\/(www\.)?/, '')) + '</span></a></li>';
      }).join('') + '</ul></div>' : '') +
      (refs.length ? '<div class="req-sec"><span class="label">File referensi (' + refs.length + ')</span>' + MC.assetGrid(refs) + '</div>' : '') +
      '<div class="req-sec"><span class="label">Diskusi dengan atasan</span>' +
      ((d.comments || []).length ? '<ul class="chat">' + d.comments.map(function (c) {
        var mine = MC.state.me && c.reviewerName === MC.state.me.displayName;
        return '<li class="bubble' + (mine ? ' me' : '') + '"><div class="b-meta"><strong>' + esc(c.reviewerName) + '</strong> · ' + esc(MC.fmtDate(c.createdAt, true)) + '</div><p>' + MC.multiline(c.comment) + '</p></li>';
      }).join('') + '</ul>' : '<p class="hint">Belum ada komentar.</p>') +
      '<form class="inline-form" id="rq-form" novalidate><label class="sr-only" for="rq-comment">Balas atasan</label>' +
      '<input class="input" id="rq-comment" maxlength="2000" placeholder="Balas atau tanyakan detail ke atasan…" autocomplete="off">' +
      '<button class="btn btn-secondary" type="submit">' + icon('send') + 'Kirim</button></form></div></section>';
  }

  /* =================== Halaman Proyek =================== */
  var projFilter = 'ACTIVE';
  var projView = MC.store.get('mcms.projects.view') || 'cards';
  var projSort = { key: 'dueDate', dir: 'asc' };
  MC.PAGES.projects = function (main, sub, rest) {
    if (sub) return projectDetail(main, sub, rest[0] || 'tasks');
    main.innerHTML = '<div class="page">' + MC.pageHead('Workspace', 'Proyek', 'Pekerjaan besar seperti campaign, dokumentasi acara, atau produksi video.',
      '<button class="btn btn-primary" type="button" id="new-proj">' + icon('plus') + 'Proyek baru</button>') +
      '<div class="toolbar">' + MC.segmented('pf', [['ACTIVE', 'Aktif'], ['DONE', 'Selesai'], ['ARCHIVED', 'Arsip'], ['ALL', 'Semua']], projFilter, 'Filter status proyek') +
      '<div class="toolbar-right">' + MC.segmented('pv', [['cards', 'Kartu', 'grid'], ['table', 'Tabel', 'list']], projView, 'Tampilan proyek') +
      '<div class="search-field">' + icon('search') + '<input class="input" type="search" id="proj-q" placeholder="Cari proyek…" aria-label="Cari proyek"></div></div></div>' +
      '<div id="proj-list">' + MC.loadingBox(180) + '</div></div>';
    $('#new-proj').addEventListener('click', function () { MC.create('project'); });
    var q = $('#proj-q'), deb;
    function load() {
      MC.load('projects.list', { status: projFilter === 'ALL' ? '' : projFilter, includeArchived: projFilter === 'ALL', q: q.value }, function (items) {
        if (!MC.stillOn('projects')) return;
        lastItems = items;
        if (projView === 'table') return drawTable();
        $('#proj-list').innerHTML = items.length ? '<div class="project-grid">' + items.map(function (p) { return MC.projectCard(p, '#/projects/' + encodeURIComponent(p.projectId)); }).join('') + '</div>'
          : '<div class="card card-pad">' + MC.emptyState('folder', q.value ? 'Tidak ada proyek yang cocok' : 'Belum ada proyek di sini',
            q.value ? 'Coba kata kunci lain.' : 'Buat proyek untuk mengelompokkan tugas, file, dan aktivitas.',
            q.value ? '' : '<button class="btn btn-primary" type="button" id="empty-new">' + icon('plus') + 'Buat proyek</button>') + '</div>';
        var en = $('#empty-new'); if (en) en.addEventListener('click', function () { MC.create('project'); });
      }, function (e) { MC.errorState($('#proj-list'), e, load); });
    }
    var lastItems = [];
    function drawTable() {
      var box = $('#proj-list'); if (!box) return;
      box.innerHTML = '<p class="hint table-hint">' + lastItems.length + ' proyek · klik judul kolom untuk mengurutkan</p>' + MC.projectTable(lastItems, '#/projects/', projSort, { owner: true });
      MC.bindProjectTable(box, projSort, drawTable);
    }
    MC.bindSegmented(main, 'pf', function (v) { projFilter = v; load(); });
    MC.bindSegmented(main, 'pv', function (v) { projView = v; MC.store.set('mcms.projects.view', v); load(); });
    q.addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(function () { if (document.body.contains(q)) load(); }, 250); });
    load();
  };

  function projectDetail(main, id, tab) {
    if (MC.state.lastView !== location.hash) MC.skeletonPage(main);
    MC.load('projects.get', { projectId: id }, function (d) {
      if (!MC.stillOn('projects')) return;
      var p = d.project;
      var tabs = [['tasks', 'Tugas', 'tasks', d.tasks.length], ['overview', 'Ringkasan', 'file'], ['files', 'File', 'image', d.assets.length],
        ['activity', 'Aktivitas', 'activity', d.activities.length], ['feedback', 'Feedback', 'message', d.reviews.length]];
      if (!tabs.some(function (t) { return t[0] === tab; })) tab = 'tasks';
      var due = MC.dueLabel(p.dueDate, p.status === 'DONE');
      main.innerHTML = '<div class="page">' +
        '<a class="back-link" href="#/projects">' + icon('chevronLeft') + 'Semua proyek</a>' +
        '<div class="detail-hero card">' +
        '<div class="dh-top"><div class="dh-text"><div class="eyebrow">' + esc(p.projectId) + (p.category ? ' · ' + esc(p.category.name) : '') + '</div><h1>' + esc(p.name) + '</h1>' +
        '<div class="dh-badges">' + MC.statusBadge(p.status) + MC.priorityBadge(p.priority) + MC.visBadge(p.visibility) + (p.overdue ? '<span class="badge badge-danger">' + icon('alert') + 'Terlambat</span>' : '') + '</div></div>' +
        '<div class="dh-actions"><button class="btn btn-secondary" type="button" id="pj-edit">' + icon('edit') + 'Ubah</button>' +
        '<div class="menu-wrap"><button class="icon-btn bordered" type="button" id="pj-more" aria-haspopup="menu" aria-expanded="false" aria-label="Aksi lain">' + icon('menu') + '</button>' +
        '<div class="popover" id="pj-pop" role="menu" hidden>' +
        (p.status !== 'DONE' ? '<button class="menu-item" role="menuitem" type="button" data-pj="DONE">' + icon('checkCircle') + 'Tandai selesai</button>' : '<button class="menu-item" role="menuitem" type="button" data-pj="IN_PROGRESS">' + icon('refresh') + 'Buka kembali</button>') +
        (p.status !== 'ARCHIVED' ? '<button class="menu-item" role="menuitem" type="button" data-pj="ARCHIVED">' + icon('database') + 'Arsipkan</button>' : '') +
        (MC.safeHttps(p.driveFolderUrl) && !MC.DEMO ? '<a class="menu-item" role="menuitem" target="_blank" rel="noopener" href="' + esc(p.driveFolderUrl) + '">' + icon('external') + 'Buka folder Drive</a>' : '') +
        '<button class="menu-item danger" role="menuitem" type="button" id="pj-del">' + icon('trash') + 'Hapus proyek</button></div></div></div></div>' +
        '<div class="dh-progress">' + MC.progressRow(p.progress) + '</div>' +
        '<div class="dh-stats"><div><span class="v num">' + p.taskDone + '/' + p.taskCount + '</span><span class="l">tugas selesai</span></div>' +
        '<div><span class="v">' + (p.dueDate ? esc(MC.fmtDay(p.dueDate)) : '—') + '</span><span class="l">' + (due ? esc(due.text) : 'tanpa deadline') + '</span></div>' +
        '<div><span class="v num">' + esc(MC.fmtMinutes(d.minutes)) + '</span><span class="l">waktu tercatat</span></div>' +
        '<div><span class="v num">' + d.assets.length + '</span><span class="l">file bukti</span></div></div></div>' +
        '<div class="tabs" role="tablist" aria-label="Bagian proyek">' + tabs.map(function (t) {
          return '<a class="tab" role="tab" href="#/projects/' + encodeURIComponent(p.projectId) + '/' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + icon(t[2]) + esc(t[1]) +
            (t[3] !== undefined ? '<span class="cnt num">' + t[3] + '</span>' : '') + '</a>';
        }).join('') + '</div><div id="pj-body" role="tabpanel"></div></div>';

      var reload = function () { projectDetail(main, id, tab); };
      var body = $('#pj-body');
      if (tab === 'tasks') {
        body.innerHTML = '<form class="quick-add card" id="qa" novalidate><label class="sr-only" for="qa-title">Judul tugas baru</label>' +
          '<input class="input" id="qa-title" maxlength="200" placeholder="+ Tambah tugas cepat, tekan Enter" autocomplete="off">' +
          '<label class="sr-only" for="qa-due">Deadline</label><input class="input" type="date" id="qa-due">' +
          '<button class="btn btn-primary" type="submit">' + icon('plus') + '<span>Tambah</span></button></form>' +
          '<section class="card"><div class="card-body flush">' + (d.tasks.length ? '<ul class="task-list">' + d.tasks.map(function (t) { return MC.taskRow(t); }).join('') + '</ul>'
            : MC.emptyState('tasks', 'Belum ada tugas', 'Pecah proyek menjadi tugas kecil. Progres proyek dihitung otomatis dari bobot tugas.')) + '</div></section>';
        $('#qa').addEventListener('submit', function (e) {
          e.preventDefault();
          var title = $('#qa-title').value.trim();
          if (title.length < 2) { MC.toast('Judul tugas minimal 2 karakter.', 'error'); $('#qa-title').focus(); return; }
          var btn = $('#qa button');
          MC.setLoading(btn, true);
          MC.api('tasks.create', { projectId: p.projectId, title: title, dueDate: $('#qa-due').value }).then(function () {
            MC.toast('Tugas ditambahkan.'); MC.invalidate(); reload();
            setTimeout(function () { var i = $('#qa-title'); if (i) i.focus(); }, 50);
          }, function (er) { MC.setLoading(btn, false); MC.toast(er.message, 'error'); });
        });
        MC.bindTaskRows(body, reload);
      } else if (tab === 'overview') {
        body.innerHTML = '<div class="grid grid-2"><section class="card"><div class="card-head"><div><h2>Brief</h2></div></div><div class="card-body">' +
          (p.description ? '<p class="prose">' + MC.multiline(p.description) + '</p>' : '<p class="hint">Belum ada brief.</p>') +
          (p.objective ? '<h3 style="margin-top:18px">Tujuan</h3><p class="prose">' + MC.multiline(p.objective) + '</p>' : '') + '</div></section>' +
          '<section class="card"><div class="card-head"><div><h2>Informasi</h2></div></div><div class="card-body"><dl class="kv">' +
          '<dt>ID proyek</dt><dd>' + esc(p.projectId) + '</dd><dt>Mulai</dt><dd>' + esc(MC.fmtDay(p.startDate)) + '</dd><dt>Deadline</dt><dd>' + esc(MC.fmtDay(p.dueDate)) + '</dd>' +
          (p.completedAt ? '<dt>Selesai</dt><dd>' + esc(MC.fmtDate(p.completedAt, true)) + '</dd>' : '') +
          '<dt>Visibilitas</dt><dd>' + MC.visBadge(p.visibility) + '</dd><dt>Dibuat</dt><dd>' + esc(MC.fmtDate(p.createdAt, true)) + '</dd></dl>' +
          '<div class="alert alert-info" style="margin-top:16px">' + icon('folder') + '<div>File proyek tersimpan di Drive: <b>01_PROJECTS/' + esc(p.projectId) + '</b> dengan subfolder Brief, Working, Review, dan Final.</div></div></div></section></div>';
      } else if (tab === 'files') {
        body.innerHTML = '<div class="toolbar"><p class="hint">Unggah file ke folder proyek di Google Drive, atau tautkan video besar dari Drive.</p>' +
          '<button class="btn btn-primary" type="button" id="pj-up">' + icon('upload') + 'Unggah / tautkan</button></div>' +
          (d.assets.length ? MC.assetGrid(d.assets) : '<div class="card card-pad">' + MC.emptyState('image', 'Belum ada file', 'Simpan brief, file kerja, dan hasil final di sini.') + '</div>');
        $('#pj-up').addEventListener('click', function () { MC.uploadDialog({ projectId: p.projectId, label: p.name }, reload); });
        MC.bindAssetOpen(body);
        MC.loadThumbs(body);
      } else if (tab === 'activity') {
        body.innerHTML = '<div class="toolbar"><p class="hint">Riwayat pekerjaan pada proyek ini.</p><button class="btn btn-primary" type="button" id="pj-log">' + icon('activity') + 'Catat aktivitas</button></div>' +
          '<section class="card"><div class="card-body">' + (d.activities.length ? '<ul class="act-list">' + d.activities.map(function (a) { return MC.activityRow(a, { showDate: true, owner: true }); }).join('') + '</ul>'
            : MC.emptyState('activity', 'Belum ada aktivitas', 'Catat apa yang dikerjakan untuk proyek ini.')) + '</div></section>';
        $('#pj-log').addEventListener('click', function () { activityForm(null, { projectId: p.projectId }, reload); });
        bindActivityMenus(body, d.activities, reload);
      } else {
        body.innerHTML = '<section class="card"><div class="card-body">' + (d.reviews.length ? '<ul class="review-list">' + d.reviews.map(function (r) { return MC.reviewItem(r, { owner: true }); }).join('') + '</ul>'
          : MC.emptyState('message', 'Belum ada feedback', p.visibility === 'PRIVATE' ? 'Proyek ini pribadi, sehingga atasan tidak bisa melihat atau memberi feedback.' : 'Feedback dari atasan untuk proyek ini akan muncul di sini.')) + '</div></section>';
        MC.bindAck(body, reload);
      }

      $('#pj-edit').addEventListener('click', function () { projectForm(p, reload); });
      var pop = $('#pj-pop'), more = $('#pj-more');
      more.addEventListener('click', function (e) { e.stopPropagation(); pop.hidden = !pop.hidden; more.setAttribute('aria-expanded', String(!pop.hidden)); if (!pop.hidden) $('.menu-item', pop).focus(); });
      document.addEventListener('click', function close(e) { if (!pop.contains(e.target)) { pop.hidden = true; more.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', close); } });
      pop.addEventListener('keydown', function (e) { if (e.key === 'Escape') { pop.hidden = true; more.focus(); } });
      $$('[data-pj]', pop).forEach(function (b) {
        b.addEventListener('click', function () {
          var st = b.getAttribute('data-pj');
          MC.api('projects.update', { projectId: p.projectId, status: st }).then(function () {
            MC.toast(st === 'DONE' ? 'Proyek ditandai selesai.' : st === 'ARCHIVED' ? 'Proyek diarsipkan.' : 'Proyek dibuka kembali.'); MC.invalidate(); reload();
          }, function (e) { MC.toast(e.message, 'error'); });
        });
      });
      $('#pj-del').addEventListener('click', function () {
        MC.confirmDialog({ title: 'Hapus proyek?', message: '"' + p.name + '" dan ' + p.taskCount + ' tugasnya akan dihapus dari MCMS. Folder dan file di Google Drive TIDAK dihapus.', danger: true, confirmText: 'Hapus proyek', icon: 'trash' })
          .then(function (yes) {
            if (!yes) return;
            MC.api('projects.remove', { projectId: p.projectId }).then(function () { MC.toast('Proyek dihapus.'); MC.invalidate(); location.hash = '#/projects'; },
              function (e) { MC.toast(e.message, 'error'); });
          });
      });
      MC.focusHeading();
    }, function (err) { MC.errorState(main, err, function () { projectDetail(main, id, tab); }); });
  }

  /* =================== Halaman Tugas =================== */
  var TF = { view: MC.store.get('mcms.tasks.view') || 'list', filter: 'open', project: '' };
  var FILTERS = [['open', 'Terbuka'], ['requests', 'Dari atasan'], ['today', 'Hari ini'], ['overdue', 'Terlambat'], ['done', 'Selesai'], ['all', 'Semua']];
  MC.PAGES.tasks = function (main, sub) {
    if (sub && FILTERS.some(function (f) { return f[0] === sub; })) TF.filter = sub;
    main.innerHTML = '<div class="page">' + MC.pageHead('Workspace', 'Tugas', 'Pekerjaan proyek dan tugas mandiri dalam satu tempat.',
      '<button class="btn btn-primary" type="button" id="new-task">' + icon('plus') + 'Tugas baru</button>') +
      '<div class="toolbar">' + MC.segmented('tv', [['list', 'Daftar', 'list'], ['kanban', 'Kanban', 'kanban']], TF.view, 'Tampilan') +
      '<div class="toolbar-right"><label class="sr-only" for="tf-proj">Filter proyek</label><select class="input" id="tf-proj"><option value="">Semua proyek</option><option value="__standalone">Tugas mandiri</option></select>' +
      '<div class="search-field">' + icon('search') + '<input class="input" type="search" id="task-q" placeholder="Cari tugas…" aria-label="Cari tugas"></div></div></div>' +
      '<div id="tf-filter"></div><div id="task-body">' + MC.loadingBox(220) + '</div></div>';
    $('#new-task').addEventListener('click', function () { MC.create('task', load, { projectId: TF.project && TF.project !== '__standalone' ? TF.project : '' }); });
    var all = [];
    MC.lookup().then(function (lk) {
      var sel = $('#tf-proj');
      if (!sel) return;
      sel.innerHTML += lk.projects.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>'; }).join('');
      sel.value = TF.project;
    }, function () {});
    $('#tf-proj').addEventListener('change', function (e) { TF.project = e.target.value; load(); });
    var deb; $('#task-q').addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(draw, 200); });
    MC.bindSegmented(main, 'tv', function (v) { TF.view = v; MC.store.set('mcms.tasks.view', v); draw(); });

    function load() {
      MC.load('tasks.list', { projectId: TF.project }, function (items) { if (!MC.stillOn('tasks')) return; all = items; draw(); },
        function (e) { MC.errorState($('#task-body'), e, load); });
    }
    function matchesFilter(t, f) {
      var today = MC.todayKey();
      if (f === 'open') return ['TODO', 'IN_PROGRESS', 'REVIEW'].indexOf(t.status) >= 0;
      if (f === 'today') return ['TODO', 'IN_PROGRESS', 'REVIEW'].indexOf(t.status) >= 0 && (t.dueDate === today || t.plannedDate === today);
      if (f === 'overdue') return t.overdue;
      if (f === 'done') return t.status === 'DONE';
      if (f === 'requests') return t.fromSupervisor;
      return true;
    }
    function draw() {
      if (!MC.stillOn('tasks') || !$('#tf-filter')) return;
      var q = ($('#task-q') || {}).value || '';
      var ql = q.toLowerCase();
      var base = all.filter(function (t) { return !ql || (t.title + ' ' + t.projectName).toLowerCase().indexOf(ql) >= 0; });
      var counts = {};
      FILTERS.forEach(function (f) { counts[f[0]] = base.filter(function (t) { return matchesFilter(t, f[0]); }).length; });
      var fbox = $('#tf-filter');
      if (TF.view === 'list') {
        fbox.innerHTML = '<div class="filter-row">' + MC.segmented('tf', FILTERS.map(function (f) { return [f[0], f[1], null, counts[f[0]]]; }), TF.filter, 'Filter tugas') + '</div>';
        MC.bindSegmented(fbox, 'tf', function (v) { TF.filter = v; draw(); });
      } else fbox.innerHTML = '';
      var bodyEl = $('#task-body');
      if (TF.view === 'kanban') return drawKanban(bodyEl, base.filter(function (t) { return t.status !== 'CANCELLED'; }));
      var items = base.filter(function (t) { return matchesFilter(t, TF.filter); });
      if (!items.length) {
        bodyEl.innerHTML = '<div class="card card-pad">' + MC.emptyState(TF.filter === 'overdue' ? 'checkCircle' : 'tasks',
          TF.filter === 'overdue' ? 'Tidak ada tugas terlambat' : q ? 'Tidak ada tugas yang cocok' : 'Belum ada tugas di sini',
          TF.filter === 'overdue' ? 'Semua tugas sesuai jadwal. Pertahankan!' : 'Tambahkan tugas baru atau ubah filter.') + '</div>';
        return;
      }
      var today = MC.todayKey(), week = MC.todayKey(7);
      var groups = TF.filter === 'done' ? [['Selesai', items]] : [
        ['Terlambat', items.filter(function (t) { return t.overdue; })],
        ['Hari ini', items.filter(function (t) { return !t.overdue && t.status !== 'DONE' && t.dueDate === today; })],
        ['7 hari ke depan', items.filter(function (t) { return t.status !== 'DONE' && t.dueDate > today && t.dueDate <= week; })],
        ['Nanti', items.filter(function (t) { return t.status !== 'DONE' && t.dueDate > week; })],
        ['Tanpa deadline', items.filter(function (t) { return t.status !== 'DONE' && !t.dueDate && t.status !== 'CANCELLED'; })],
        ['Selesai', items.filter(function (t) { return t.status === 'DONE'; })],
        ['Batal', items.filter(function (t) { return t.status === 'CANCELLED'; })]
      ];
      bodyEl.innerHTML = groups.filter(function (g) { return g[1].length; }).map(function (g) {
        return '<section class="card task-group"><div class="card-head"><div><h2>' + esc(g[0]) + ' <span class="cnt num">' + g[1].length + '</span></h2></div></div>' +
          '<div class="card-body flush"><ul class="task-list">' + g[1].map(function (t) { return MC.taskRow(t); }).join('') + '</ul></div></section>';
      }).join('');
      MC.bindTaskRows(bodyEl, load);
    }
    function drawKanban(el, items) {
      var cols = [['TODO', 'Belum mulai'], ['IN_PROGRESS', 'Dikerjakan'], ['REVIEW', 'Review'], ['DONE', 'Selesai']];
      el.innerHTML = '<p class="hint kanban-hint">Seret kartu antar kolom, atau buka kartu lalu ubah statusnya.</p><div class="kanban">' + cols.map(function (c, ci) {
        var list = items.filter(function (t) { return t.status === c[0]; });
        if (c[0] === 'DONE') list = list.slice(0, 30);
        return '<section class="kb-col" data-col="' + c[0] + '" aria-label="' + esc(c[1]) + '"><div class="kb-head">' + MC.statusBadge(c[0]) + '<span class="cnt num">' + list.length + '</span></div>' +
          '<div class="kb-list">' + (list.length ? list.map(function (t) {
            return '<article class="kb-card" draggable="true" data-id="' + esc(t.taskId) + '"><button type="button" class="kb-open" data-task="' + esc(t.taskId) + '">' + esc(t.title) + '</button>' +
              '<div class="kb-meta">' + (t.projectName ? '<span class="tr-proj">' + icon('folder', 'width="12" height="12"') + esc(t.projectName) + '</span>' : '<span class="badge badge-neutral">Mandiri</span>') +
              MC.dueChip(t.dueDate, t.status === 'DONE') + MC.priorityBadge(t.priority) + '</div>' +
              (t.status !== 'DONE' && t.progress ? '<div class="progress thin" aria-hidden="true"><span style="width:' + t.progress + '%"></span></div>' : '') +
              '<div class="kb-move">' + (ci > 0 ? '<button type="button" class="icon-btn sm" data-move="' + cols[ci - 1][0] + '" data-id="' + esc(t.taskId) + '" aria-label="Pindah ke ' + esc(cols[ci - 1][1]) + '">' + icon('chevronLeft') + '</button>' : '<span></span>') +
              (ci < cols.length - 1 ? '<button type="button" class="icon-btn sm" data-move="' + cols[ci + 1][0] + '" data-id="' + esc(t.taskId) + '" aria-label="Pindah ke ' + esc(cols[ci + 1][1]) + '">' + icon('chevronRight') + '</button>' : '') + '</div></article>';
          }).join('') : '<p class="kb-empty">Kosong</p>') + '</div></section>';
      }).join('') + '</div>';
      function move(id, status) {
        MC.api('tasks.update', { taskId: id, status: status }).then(function () { MC.toast(status === 'DONE' ? 'Tugas selesai. Kerja bagus!' : 'Status diperbarui.'); load(); },
          function (e) { MC.toast(e.message, 'error'); load(); });
      }
      $$('[data-move]', el).forEach(function (b) { b.addEventListener('click', function () { b.disabled = true; move(b.getAttribute('data-id'), b.getAttribute('data-move')); }); });
      $$('[data-task]', el).forEach(function (b) { b.addEventListener('click', function () { MC.openTask(b.getAttribute('data-task'), load); }); });
      $$('.kb-card', el).forEach(function (c) {
        c.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', c.getAttribute('data-id')); c.classList.add('dragging'); });
        c.addEventListener('dragend', function () { c.classList.remove('dragging'); });
      });
      $$('.kb-col', el).forEach(function (col) {
        col.addEventListener('dragover', function (e) { e.preventDefault(); col.classList.add('drop'); });
        col.addEventListener('dragleave', function () { col.classList.remove('drop'); });
        col.addEventListener('drop', function (e) {
          e.preventDefault(); col.classList.remove('drop');
          var id = e.dataTransfer.getData('text/plain');
          var t = all.filter(function (x) { return x.taskId === id; })[0];
          if (t && t.status !== col.getAttribute('data-col')) move(id, col.getAttribute('data-col'));
        });
      });
    }
    load();
  };

  /* =================== Halaman Aktivitas =================== */
  var AF = { period: '7' };
  function bindActivityMenus(root, items, reload) {
    $$('[data-act-menu]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var a = items.filter(function (x) { return x.activityId === b.getAttribute('data-act-menu'); })[0];
        if (!a) return;
        var ov = MC.openOverlay('<div class="dialog-head"><div class="grow"><h2 id="dlg-title">' + esc(a.title) + '</h2><p class="hint">' + esc(MC.fmtDayName(a.date)) + '</p></div>' +
          '<button class="icon-btn" type="button" data-close aria-label="Tutup">' + icon('x') + '</button></div><div class="sheet-list" style="padding-bottom:22px">' +
          '<button class="sheet-item" type="button" data-a="edit"><span class="dot-ico">' + icon('edit') + '</span><span class="grow"><span class="t">Ubah aktivitas</span></span></button>' +
          '<button class="sheet-item" type="button" data-a="up"><span class="dot-ico">' + icon('upload') + '</span><span class="grow"><span class="t">Lampirkan bukti</span><span class="d">' + (a.evidenceCount ? a.evidenceCount + ' file terlampir' : 'Foto, video, dokumen') + '</span></span></button>' +
          '<button class="sheet-item" type="button" data-a="del"><span class="dot-ico danger-ico">' + icon('trash') + '</span><span class="grow"><span class="t">Hapus aktivitas</span></span></button></div>', { sheet: true });
        $('[data-close]', ov).addEventListener('click', MC.closeOverlay);
        $('[data-a=edit]', ov).addEventListener('click', function () { MC.closeOverlay(); activityForm(a, {}, reload); });
        $('[data-a=up]', ov).addEventListener('click', function () { MC.closeOverlay(); MC.uploadDialog({ activityId: a.activityId, projectId: a.projectId, taskId: a.taskId, label: a.title }, reload); });
        $('[data-a=del]', ov).addEventListener('click', function () {
          MC.closeOverlay();
          MC.confirmDialog({ title: 'Hapus aktivitas?', message: '"' + a.title + '" akan dihapus dan tidak lagi masuk laporan baru.', danger: true, confirmText: 'Hapus', icon: 'trash' }).then(function (yes) {
            if (!yes) return;
            MC.api('activities.remove', { activityId: a.activityId }).then(function () { MC.toast('Aktivitas dihapus.'); reload(); }, function (e) { MC.toast(e.message, 'error'); });
          });
        });
      });
    });
  }
  MC.groupByDay = function (items, rowFn) {
    var groups = {}, order = [];
    items.forEach(function (a) { if (!groups[a.date]) { groups[a.date] = []; order.push(a.date); } groups[a.date].push(a); });
    return order.map(function (k) {
      var mins = groups[k].reduce(function (s, a) { return s + a.durationMinutes; }, 0);
      return '<section class="day-group"><h3 class="day-head"><span>' + esc(MC.fmtDayName(k)) + '</span>' + (mins ? '<span class="hint">' + esc(MC.fmtMinutes(mins)) + '</span>' : '') + '</h3>' +
        '<ul class="act-list">' + groups[k].map(rowFn).join('') + '</ul></section>';
    }).join('');
  };
  MC.periodRange = function (p) {
    if (p === '7') return { from: MC.todayKey(-6), to: '' };
    if (p === '30') return { from: MC.todayKey(-29), to: '' };
    if (p === 'month') return { from: MC.todayKey().slice(0, 8) + '01', to: '' };
    return { from: '', to: '' };
  };
  MC.PAGES.activity = function (main) {
    main.innerHTML = '<div class="page">' + MC.pageHead('Workspace', 'Aktivitas', 'Catatan pekerjaan harian — bahan otomatis untuk laporan.',
      '<button class="btn btn-primary" type="button" id="new-act">' + icon('plus') + 'Catat aktivitas</button>') +
      '<form class="quick-log card" id="ql" novalidate><div class="ql-title"><span class="dot-ico">' + icon('activity') + '</span><div><strong>Catat cepat</strong><span class="hint">Tulis pekerjaanmu, pilih durasi, simpan.</span></div></div>' +
      '<div class="ql-row"><label class="sr-only" for="ql-title">Apa yang dikerjakan?</label><input class="input" id="ql-title" maxlength="200" placeholder="Apa yang kamu kerjakan?" autocomplete="off">' +
      '<label class="sr-only" for="ql-dur">Durasi</label><select class="input" id="ql-dur"><option value="">Durasi</option>' + DURATIONS.map(function (d) { return '<option value="' + d[0] + '">' + d[1] + '</option>'; }).join('') + '</select>' +
      '<button class="btn btn-primary" type="submit">' + icon('check') + 'Simpan</button></div>' +
      '<button class="linkish" type="button" id="ql-more">+ Tambah detail (proyek, hasil, bukti)</button></form>' +
      '<div class="toolbar">' + MC.segmented('ap', [['7', '7 hari'], ['30', '30 hari'], ['month', 'Bulan ini'], ['all', 'Semua']], AF.period, 'Periode') +
      '<div class="search-field">' + icon('search') + '<input class="input" type="search" id="act-q" placeholder="Cari aktivitas…" aria-label="Cari aktivitas"></div></div>' +
      '<div id="act-body">' + MC.loadingBox(200) + '</div></div>';
    $('#new-act').addEventListener('click', function () { activityForm(null, {}, load); });
    $('#ql-more').addEventListener('click', function () { activityForm(null, { title: $('#ql-title').value, durationMinutes: $('#ql-dur').value }, load); });
    $('#ql').addEventListener('submit', function (e) {
      e.preventDefault();
      var title = $('#ql-title').value.trim();
      if (title.length < 3) { MC.toast('Tulis aktivitas minimal 3 karakter.', 'error'); $('#ql-title').focus(); return; }
      var btn = $('#ql button[type=submit]');
      MC.setLoading(btn, true);
      MC.api('activities.create', { title: title, durationMinutes: $('#ql-dur').value || 0 }).then(function () {
        MC.setLoading(btn, false);
        $('#ql-title').value = ''; $('#ql-dur').value = '';
        MC.toast('Aktivitas tercatat.'); load(); $('#ql-title').focus();
      }, function (er) { MC.setLoading(btn, false); MC.toast(er.message, 'error'); });
    });
    var deb; $('#act-q').addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(function () { if ($('#act-q')) load(); }, 250); });
    MC.bindSegmented(main, 'ap', function (v) { AF.period = v; load(); });
    function load() {
      var r = MC.periodRange(AF.period);
      MC.load('activities.list', { from: r.from, q: $('#act-q').value }, function (d) {
        if (!MC.stillOn('activity')) return;
        $('#act-body').innerHTML = '<div class="summary-strip"><div><span class="v num">' + d.total + '</span><span class="l">aktivitas</span></div>' +
          '<div><span class="v num">' + esc(MC.fmtMinutes(d.totalMinutes)) + '</span><span class="l">waktu tercatat</span></div></div>' +
          (d.items.length ? '<div class="card"><div class="card-body">' + MC.groupByDay(d.items, function (a) { return MC.activityRow(a, { owner: true }); }) + '</div></div>'
            : '<div class="card card-pad">' + MC.emptyState('activity', 'Belum ada aktivitas di periode ini', 'Gunakan "Catat cepat" di atas — cukup 10 detik.') + '</div>');
        bindActivityMenus($('#act-body'), d.items, load);
      }, function (e) { MC.errorState($('#act-body'), e, load); });
    }
    load();
  };
})(window.MC);

;
/* =========================================================
   Arsip & Bukti Kerja (Google Drive)
   ========================================================= */
(function (MC) {
  'use strict';
  var $ = MC.$, $$ = MC.$$, esc = MC.esc, icon = MC.icon;
  var MAX_BYTES = MC.DEMO ? 2 * 1024 * 1024 : 10 * 1024 * 1024;
  var STAGES = [['EVIDENCE', 'Bukti kerja'], ['BRIEF', 'Brief / bahan'], ['WORKING', 'File kerja (draft)'], ['REVIEW', 'Untuk review'], ['FINAL', 'Hasil final']];
  var STAGE_LABEL = {}; STAGES.forEach(function (s) { STAGE_LABEL[s[0]] = s[1]; }); STAGE_LABEL.OTHER = 'Lainnya';

  /* Registri aset yang sedang tampil (untuk dialog pratinjau). */
  var registry = {};
  var baseCard = MC.assetCard;
  MC.assetCard = function (a, opts) { registry[a.assetId] = a; return baseCard(a, opts); };

  /* =================== Dialog unggah / tautkan =================== */
  MC.uploadDialog = function (preset, after) {
    preset = preset || {};
    MC.lookup().then(function (lk) {
      var mode = 'file';
      var files = [];
      var f = MC.formDialog({
        title: 'Unggah bukti / file', icon: 'upload', wide: true, submitText: 'Unggah', submitIcon: 'upload',
        sub: preset.label ? 'Untuk: ' + preset.label : 'File disimpan ke Google Drive milik pemilik MCMS.',
        body:
          '<div class="field full">' + MC.segmented('um', [['file', 'Unggah file', 'upload'], ['link', 'Tautkan dari Drive', 'link']], 'file', 'Cara menambahkan file') + '</div>' +
          '<div class="field full" id="u-file-box"><div class="uploader" id="u-zone"><input type="file" id="u-input" multiple class="sr-only" ' +
          'accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.psd,.ai,.zip,.txt,.csv">' +
          '<label for="u-input" class="uploader-label">' + icon('upload') + '<span><strong>Pilih file</strong> atau seret ke sini</span>' +
          '<span class="hint">Foto, video pendek, PDF, dokumen, desain · maks ' + MC.fmtSize(MAX_BYTES) + ' per file' + (MC.DEMO ? ' (demo)' : '') + '</span></label></div>' +
          '<ul class="upload-list" id="u-list" aria-live="polite"></ul>' +
          '<p class="hint">Video lebih dari ' + MC.fmtSize(MAX_BYTES) + '? Unggah langsung ke Google Drive, lalu pilih <b>Tautkan dari Drive</b>.</p></div>' +
          '<div class="field full" id="u-link-box" hidden>' +
          MC.field({ name: 'url', label: 'Tautan file Google Drive', placeholder: 'https://drive.google.com/file/d/…/view', full: true, hint: 'Di Drive: klik kanan file → Bagikan → Salin link. File harus milik/terbagi ke akun pemilik.' }) +
          MC.field({ name: 'fileName', label: 'Nama tampilan', placeholder: 'Kosongkan untuk memakai nama file di Drive', full: true }) + '</div>' +
          MC.field({ name: 'stage', label: 'Jenis file', type: 'select', value: preset.stage || 'EVIDENCE', options: STAGES, required: true }) +
          (preset.taskId || preset.activityId ? '' : MC.field({ name: 'projectId', label: 'Proyek', type: 'select', value: preset.projectId || '', options: MC.projectOptions(lk, '— Arsip umum (tanpa proyek) —') })) +
          MC.field({ name: 'description', label: 'Keterangan', maxlength: 1000, placeholder: 'Contoh: Foto prosesi wisuda sesi pagi', full: true }) +
          MC.field({ name: 'sharedWithSupervisor', label: 'Bisa dilihat atasan', type: 'switch', value: true, full: true,
            hint: 'Atasan bisa melihat pratinjau & membuka file ini. Matikan untuk draft atau file internal.' }),
        onSubmit: function (form) {
          var v = MC.readForm(form);
          var base = { stage: v.stage, description: v.description, sharedWithSupervisor: v.sharedWithSupervisor,
            projectId: v.projectId !== undefined ? v.projectId : (preset.projectId || ''), taskId: preset.taskId || '', activityId: preset.activityId || '' };
          if (mode === 'link') {
            if (!/^https?:\/\/|^[A-Za-z0-9_-]{25,}$/.test(v.url || '')) { MC.fieldError(form, 'url', 'Tempel tautan file Google Drive.'); return null; }
            return MC.api('assets.linkDrive', Object.assign({ url: v.url, fileName: v.fileName }, base)).then(function () {
              MC.toast('File Drive ditautkan.'); MC.closeOverlay(); if (after) after(); else MC.route();
            });
          }
          if (!files.length) { MC.formAlert(form, 'Pilih minimal satu file.'); return null; }
          return uploadAll(form, base);
        },
        onOpen: function (form) {
          MC.bindSegmented(form, 'um', function (v) {
            mode = v;
            $('#u-file-box', form).hidden = v !== 'file';
            $('#u-link-box', form).hidden = v !== 'link';
            $('button[type=submit]', form).lastChild.textContent = v === 'file' ? 'Unggah' : 'Tautkan';
          });
          var input = $('#u-input', form), zone = $('#u-zone', form);
          input.addEventListener('change', function () { addFiles(input.files); input.value = ''; });
          ['dragenter', 'dragover'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('drag'); }); });
          ['dragleave', 'drop'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('drag'); }); });
          zone.addEventListener('drop', function (e) { addFiles(e.dataTransfer.files); });
        }
      });
      var form = f.form;

      function addFiles(list) {
        Array.prototype.forEach.call(list, function (file) {
          var err = '';
          if (file.size > MAX_BYTES) err = 'Lebih dari ' + MC.fmtSize(MAX_BYTES) + '. Gunakan "Tautkan dari Drive".';
          else if (!file.size) err = 'File kosong.';
          else if (/\.(html?|js|exe|bat|cmd|sh|php|svg)$/i.test(file.name)) err = 'Tipe file ini tidak diizinkan.';
          files.push({ file: file, err: err, state: err ? 'error' : 'ready' });
        });
        drawList();
      }
      function drawList() {
        var ul = $('#u-list', form);
        ul.innerHTML = files.map(function (x, i) {
          var st = x.state === 'error' ? '<span class="due due-danger">' + icon('alert', 'width="13" height="13"') + esc(x.err) + '</span>'
            : x.state === 'uploading' ? '<span class="due due-info"><span class="spinner" aria-hidden="true"></span>Mengunggah…</span>'
              : x.state === 'done' ? '<span class="due due-success">' + icon('check', 'width="13" height="13"') + 'Tersimpan</span>'
                : '<span class="hint">' + MC.fmtSize(x.file.size) + '</span>';
          return '<li class="upload-item"><span class="dot-ico">' + icon(/^image\//.test(x.file.type) ? 'image' : /^video\//.test(x.file.type) ? 'video' : 'file') + '</span>' +
            '<span class="grow"><span class="t">' + esc(x.file.name) + '</span>' + st + '</span>' +
            (x.state === 'ready' || x.state === 'error' ? '<button class="icon-btn sm" type="button" data-rm="' + i + '" aria-label="Hapus ' + esc(x.file.name) + ' dari daftar">' + icon('x') + '</button>' : '') + '</li>';
        }).join('');
        $$('[data-rm]', ul).forEach(function (b) { b.addEventListener('click', function () { files.splice(Number(b.getAttribute('data-rm')), 1); drawList(); }); });
      }
      function uploadAll(form, base) {
        var queue = files.filter(function (x) { return x.state === 'ready'; });
        if (!queue.length) { MC.formAlert(form, files.length ? 'Tidak ada file yang bisa diunggah. Periksa pesan di daftar.' : 'Pilih minimal satu file.'); return null; }
        var ok = 0, failed = 0;
        var chain = Promise.resolve();
        queue.forEach(function (x) {
          chain = chain.then(function () {
            x.state = 'uploading'; drawList();
            // Thumbnail kecil dibuat di browser → pratinjau ringan tanpa memuat file asli
            return Promise.all([MC.fileToBase64(x.file), MC.makeThumb(x.file)]).then(function (r) {
              var th = r[1];
              return MC.api('assets.upload', Object.assign({ fileName: x.file.name, mimeType: x.file.type || 'application/octet-stream', dataBase64: r[0],
                thumbBase64: th ? th.data : '', thumbMime: th ? th.mime : '' }, base)).then(function (a) {
                if (th) MC.thumbPut(a.assetId, 'data:' + th.mime + ';base64,' + th.data);
                return a;
              });
            }).then(function () { x.state = 'done'; ok++; drawList(); }, function (e) { x.state = 'error'; x.err = e.message; failed++; drawList(); });
          });
        });
        return chain.then(function () {
          if (!failed) { MC.toast(ok + ' file tersimpan di Google Drive.'); MC.closeOverlay(); if (after) after(); else MC.route(); return; }
          MC.toast(ok + ' berhasil, ' + failed + ' gagal. File yang gagal bisa dicoba lagi.', 'error');
          files.forEach(function (x) { if (x.state === 'error' && !/Tipe|Lebih|kosong/.test(x.err)) x.state = 'ready'; });
          files = files.filter(function (x) { return x.state !== 'done'; });
          drawList();
          if (ok && after) after();
        });
      }
    }, function (e) { MC.toast(e.message, 'error'); });
  };

  /* =================== Pratinjau aset =================== */
  MC.bindAssetOpen = function (root, exec) {
    $$('[data-asset-open]', root).forEach(function (b) {
      b.addEventListener('click', function () { assetDialog(b.getAttribute('data-asset-open'), exec); });
    });
    $$('[data-asset-drive]', root).forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); MC.openAsset(b.getAttribute('data-asset-drive'), b); });
    });
  };
  function assetDialog(id, exec) {
    var a = registry[id];
    if (!a) return;
    var owner = MC.state.me.role === 'OWNER' && !exec;
    var ov = MC.openOverlay('<div class="dialog-head"><span class="ico ic tone-primary-ico">' + MC.fileIcon(a.fileType) + '</span><div class="grow"><h2 id="dlg-title" class="break">' + esc(a.fileName) + '</h2>' +
      '<p class="hint">' + esc(MC.FT_LABEL[a.fileType] || 'File') + (a.sizeBytes ? ' · ' + MC.fmtSize(a.sizeBytes) : '') + ' · ' + esc(MC.fmtDate(a.createdAt, true)) + '</p></div>' +
      '<button class="icon-btn" type="button" data-close aria-label="Tutup">' + icon('x') + '</button></div>' +
      '<div class="dialog-body"><div class="preview-big" data-thumb="' + (a.fileType === 'IMAGE' || a.fileType === 'VIDEO' || a.fileType === 'DESIGN' ? esc(a.assetId) : '') + '"><span class="ft-ico">' + MC.fileIcon(a.fileType) + '</span></div>' +
      '<dl class="kv"><dt>Jenis</dt><dd>' + esc(STAGE_LABEL[a.stage] || a.stage) + '</dd>' +
      (a.projectName ? '<dt>Proyek</dt><dd>' + esc(a.projectName) + '</dd>' : '') +
      (a.links.filter(function (l) { return l.entityType === 'TASK'; }).map(function (l) { return '<dt>Tugas</dt><dd>' + esc(l.title) + '</dd>'; }).join('')) +
      (a.description ? '<dt>Keterangan</dt><dd>' + esc(a.description) + '</dd>' : '') +
      '<dt>Sumber</dt><dd>' + (a.source === 'LINK' ? 'Ditautkan dari Drive' : 'Diunggah lewat MCMS') + '</dd>' +
      (owner ? '<dt>Visibilitas</dt><dd>' + MC.visBadge(a.visibility) + '</dd>' : '') + '</dl>' +
      (owner ? '<div class="field" style="margin-top:14px"><label class="switch" for="av-share"><input type="checkbox" id="av-share"' + (a.visibility !== 'PRIVATE' ? ' checked' : '') + '><span class="track" aria-hidden="true"></span>' +
        '<span class="switch-text"><span class="t">Bisa dilihat atasan</span><span class="hint">Mematikan ini juga mencabut akses atasan ke file di Drive.</span></span></label></div>' : '') +
      '</div><div class="dialog-foot">' +
      (owner ? '<button class="btn btn-danger" type="button" id="av-del">' + icon('trash') + 'Hapus dari arsip</button><span class="grow"></span>' : '') +
      MC.driveButton(owner ? a : { assetId: a.assetId, fileName: a.fileName }, 'btn btn-primary', true) + '</div>', { wide: true });
    $('[data-close]', ov).addEventListener('click', MC.closeOverlay);
    MC.loadThumbs(ov);
    MC.bindAssetOpen(ov, true);
    if (!owner) return;
    $('#av-share').addEventListener('change', function (e) {
      var on = e.target.checked;
      e.target.disabled = true;
      MC.api('assets.update', { assetId: a.assetId, sharedWithSupervisor: on }).then(function (n) {
        registry[a.assetId] = n; e.target.disabled = false;
        MC.toast(on ? 'File kini bisa dilihat atasan.' : 'File dijadikan pribadi; akses atasan dicabut.');
        MC.closeOverlay(); MC.route();
      }, function (er) { e.target.disabled = false; e.target.checked = !on; MC.toast(er.message, 'error'); });
    });
    $('#av-del').addEventListener('click', function () {
      MC.confirmDialog({ title: 'Hapus dari arsip?', message: '"' + a.fileName + '" akan dihapus dari MCMS. File asli tetap aman di Google Drive.', danger: true, confirmText: 'Hapus', icon: 'trash' })
        .then(function (yes) {
          if (!yes) return;
          MC.api('assets.remove', { assetId: a.assetId }).then(function () { MC.toast('File dihapus dari arsip.'); MC.route(); }, function (er) { MC.toast(er.message, 'error'); });
        });
    });
  }

  /* =================== Halaman Arsip (Mode Saya) =================== */
  var FT_FILTER = [['', 'Semua'], ['IMAGE', 'Foto'], ['VIDEO', 'Video'], ['DOCUMENT', 'Dokumen'], ['DESIGN', 'Desain']];
  var AS = { type: '', vis: '', project: '' };
  MC.PAGES.assets = function (main) {
    main.innerHTML = '<div class="page">' + MC.pageHead('Workspace', 'Arsip & Bukti', 'Semua file kerja di Google Drive — terhubung ke proyek dan tugas.',
      '<button class="btn btn-primary" type="button" id="as-up">' + icon('upload') + 'Unggah / tautkan</button>') +
      '<div class="toolbar">' + MC.segmented('ft', FT_FILTER, AS.type, 'Jenis file') +
      '<div class="toolbar-right"><label class="sr-only" for="as-vis">Visibilitas</label><select class="input" id="as-vis"><option value="">Semua visibilitas</option><option value="SUPERVISOR">Terlihat atasan</option><option value="PRIVATE">Pribadi</option></select>' +
      '<label class="sr-only" for="as-proj">Proyek</label><select class="input" id="as-proj"><option value="">Semua proyek</option></select>' +
      '<div class="search-field">' + icon('search') + '<input class="input" type="search" id="as-q" placeholder="Cari file…" aria-label="Cari file"></div></div></div>' +
      '<div id="as-body">' + MC.loadingBox(240) + '</div></div>';
    $('#as-vis').value = AS.vis;
    MC.lookup().then(function (lk) {
      var sel = $('#as-proj'); if (!sel) return;
      sel.innerHTML += lk.projects.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>'; }).join('');
      sel.value = AS.project;
    }, function () {});
    $('#as-up').addEventListener('click', function () { MC.uploadDialog({ projectId: AS.project }, load); });
    MC.bindSegmented(main, 'ft', function (v) { AS.type = v; load(); });
    $('#as-vis').addEventListener('change', function (e) { AS.vis = e.target.value; load(); });
    $('#as-proj').addEventListener('change', function (e) { AS.project = e.target.value; load(); });
    var deb; $('#as-q').addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(function () { if ($('#as-q')) load(); }, 250); });
    function load() {
      MC.load('assets.list', { fileType: AS.type, visibility: AS.vis, projectId: AS.project, q: $('#as-q').value }, function (d) {
        if (!MC.stillOn('assets')) return;
        var body = $('#as-body');
        body.innerHTML = '<div class="summary-strip"><div><span class="v num">' + d.items.length + '</span><span class="l">file</span></div>' +
          '<div><span class="v num">' + esc(MC.fmtSize(d.totalBytes)) + '</span><span class="l">total ukuran</span></div>' +
          '<div><span class="v num">' + d.items.filter(function (a) { return a.visibility !== 'PRIVATE'; }).length + '</span><span class="l">terlihat atasan</span></div></div>' +
          (d.items.length ? MC.assetGrid(d.items) : '<div class="card card-pad">' + MC.emptyState('image', 'Belum ada file di sini', 'Unggah foto, video, atau dokumen sebagai bukti kerja.',
            '<button class="btn btn-primary" type="button" id="as-empty">' + icon('upload') + 'Unggah file</button>') + '</div>');
        var em = $('#as-empty'); if (em) em.addEventListener('click', function () { MC.uploadDialog({}, load); });
        MC.bindAssetOpen(body);
        MC.loadThumbs(body);
      }, function (e) { MC.errorState($('#as-body'), e, load); });
    }
    load();
  };

  /* =================== Bukti Kerja (Mode Atasan) =================== */
  var EX = { type: '' };
  MC.PAGES['exec-assets'] = function (main) {
    main.innerHTML = '<div class="page">' + MC.pageHead('Mode Atasan', 'Bukti Kerja', 'Foto, video, dan dokumen hasil kerja yang dibagikan.') +
      '<div class="toolbar">' + MC.segmented('eft', FT_FILTER, EX.type, 'Jenis file') +
      '<div class="search-field">' + icon('search') + '<input class="input" type="search" id="ea-q" placeholder="Cari file…" aria-label="Cari file"></div></div>' +
      '<div id="ea-body">' + MC.loadingBox(240) + '</div></div>';
    MC.bindSegmented(main, 'eft', function (v) { EX.type = v; load(); });
    var deb; $('#ea-q').addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(function () { if ($('#ea-q')) load(); }, 250); });
    function load() {
      MC.load('exec.assets', { fileType: EX.type, q: $('#ea-q').value }, function (d) {
        if (!MC.stillOn('exec-assets')) return;
        var body = $('#ea-body');
        body.innerHTML = d.items.length ? MC.assetGrid(d.items, { exec: true }) : '<div class="card card-pad">' + MC.emptyState('image', 'Belum ada bukti kerja', 'File yang dibagikan pemilik akan tampil di sini.') + '</div>';
        MC.bindAssetOpen(body, true);
        MC.loadThumbs(body);
      }, function (e) { MC.errorState($('#ea-body'), e, load); });
    }
    load();
  };
})(window.MC);

;
/* =========================================================
   Laporan harian / mingguan / bulanan
   Snapshot dibekukan saat laporan dibuat. Atasan hanya melihat laporan terbit.
   ========================================================= */
(function (MC) {
  'use strict';
  var $ = MC.$, $$ = MC.$$, esc = MC.esc, icon = MC.icon;
  var TYPES = [['DAILY', 'Harian'], ['WEEKLY', 'Mingguan'], ['MONTHLY', 'Bulanan']];

  /** Dokumen laporan (dipakai pemilik, atasan, dan saat dicetak). */
  MC.reportDoc = function (r) {
    var s = r.snapshot || {}, st = s.stats || {};
    var b = MC.state.branding || {};
    function sec(title, inner) { return '<section class="rd-sec"><h3>' + esc(title) + '</h3>' + inner + '</section>'; }
    function ul(items, fn, empty) { return items && items.length ? '<ul class="rd-list">' + items.map(function (x) { return '<li>' + fn(x) + '</li>'; }).join('') + '</ul>' : '<p class="hint">' + esc(empty) + '</p>'; }
    var stats = [['Tugas selesai', st.tasksDone], ['Aktivitas', st.activities], ['Jam kerja', String(st.hours || 0).replace('.', ',')], ['File/bukti baru', st.assetsAdded], ['Proyek aktif', st.activeProjects], ['Tugas tertunda', st.pending]];
    var actsByDay = {};
    (s.activities || []).forEach(function (a) { (actsByDay[a.date] = actsByDay[a.date] || []).push(a); });
    return '<article class="report-doc" id="report-doc">' +
      '<header class="rd-head"><div class="rd-brand">' + esc(b.appName || 'MCMS') + (b.organizationName ? ' · ' + esc(b.organizationName) : '') + '</div>' +
      '<h2 class="rd-title">' + esc(r.title) + '</h2><div class="rd-meta">Periode ' + esc(s.period ? s.period.label : '') + ' · ' + MC.statusBadge(r.status) +
      (r.publishedAt ? ' <span>diterbitkan ' + esc(MC.fmtDate(r.publishedAt, true)) + '</span>' : '') + (s.scope === 'ALL' ? ' <span class="badge badge-neutral">' + icon('lock') + 'Memuat data pribadi</span>' : '') + '</div></header>' +
      '<div class="rd-stats">' + stats.map(function (x) { return '<div><span class="v num">' + esc(x[1] === undefined ? 0 : x[1]) + '</span><span class="l">' + esc(x[0]) + '</span></div>'; }).join('') + '</div>' +
      (r.summaryNote ? sec('Ringkasan', '<p class="prose">' + MC.multiline(r.summaryNote) + '</p>') : '') +
      sec('Progres proyek', ul(s.projects, function (p) {
        return '<div class="rd-proj"><span class="t">' + esc(p.name) + '</span>' + (p.overdue ? ' <span class="badge badge-danger">' + icon('alert') + 'Terlambat</span>' : '') +
          (p.status === 'DONE' ? ' ' + MC.statusBadge('DONE') : '') + '</div>' + MC.progressRow(p.progress) +
          '<div class="hint">' + p.taskDone + '/' + p.taskCount + ' tugas' + (p.dueDate ? ' · deadline ' + esc(MC.fmtDay(p.dueDate)) : '') + '</div>';
      }, 'Tidak ada proyek aktif.')) +
      sec('Pekerjaan selesai', ul(s.tasksDone, function (t) { return icon('checkCircle', 'width="14" height="14" class="ok-ico"') + esc(t.title) + (t.projectName ? ' <span class="hint">— ' + esc(t.projectName) + '</span>' : ''); }, 'Belum ada tugas selesai pada periode ini.')) +
      sec('Aktivitas', Object.keys(actsByDay).length ? Object.keys(actsByDay).map(function (k) {
        return '<div class="rd-day"><div class="rd-day-h">' + esc(MC.fmtDayName(k)) + '</div><ul class="rd-list">' + actsByDay[k].map(function (a) {
          return '<li><strong>' + esc(a.title) + '</strong>' + (a.result ? ' — ' + esc(a.result) : '') + (a.durationMinutes ? ' <span class="hint">(' + esc(MC.fmtMinutes(a.durationMinutes)) + ')</span>' : '') + '</li>';
        }).join('') + '</ul></div>';
      }).join('') : '<p class="hint">Belum ada aktivitas tercatat.</p>') +
      sec('Pekerjaan tertunda', ul(s.pending, function (t) { return esc(t.title) + ' <span class="hint">· deadline ' + esc(MC.fmtDay(t.dueDate)) + ' · ' + esc(t.progress) + '%</span>' + (t.overdue ? ' <span class="badge badge-danger">Terlambat</span>' : ''); }, 'Tidak ada pekerjaan tertunda.')) +
      ((s.blockers && s.blockers.length) || r.obstacles ? sec('Kendala', (r.obstacles ? '<p class="prose">' + MC.multiline(r.obstacles) + '</p>' : '') +
        ul(s.blockers, function (x) { return '<strong>' + esc(x.title) + ':</strong> ' + esc(x.note); }, '')) : '') +
      sec('Rencana berikutnya', (r.nextPlan ? '<p class="prose">' + MC.multiline(r.nextPlan) + '</p>' : '') +
        ul(s.upcoming, function (t) { return esc(t.title) + ' <span class="hint">· ' + esc(MC.fmtDay(t.dueDate)) + '</span>'; }, r.nextPlan ? '' : 'Belum ada deadline pada periode berikutnya.')) +
      (s.assets && s.assets.length ? sec('Bukti kerja (' + s.assets.length + ')', ul(s.assets, function (a) { return MC.fileIcon(a.fileType) + ' ' + esc(a.fileName) + (a.projectName ? ' <span class="hint">— ' + esc(a.projectName) + '</span>' : ''); }, '')) : '') +
      (s.truncated ? '<p class="hint">Sebagian daftar dipangkas karena sangat panjang; angka statistik tetap lengkap.</p>' : '') +
      '<footer class="rd-foot">Dibuat otomatis oleh MCMS dari data kerja tercatat · ' + esc(MC.fmtDate(s.generatedAt, true)) + '</footer></article>';
  };

  MC.printReport = function () { window.print(); };

  /* =================== Halaman Laporan (pemilik) =================== */
  var GEN = { type: 'WEEKLY' };
  MC.PAGES.reports = function (main, sub) {
    if (sub && sub !== 'new') return reportView(main, sub);
    main.innerHTML = '<div class="page">' + MC.pageHead('Laporan', 'Laporan', 'Dibuat otomatis dari tugas, aktivitas, dan bukti kerja. Terbitkan agar atasan bisa membacanya.') +
      '<div class="grid grid-main"><section class="card" id="gen-card"><div class="card-head"><div><h2>Buat laporan</h2><p>Pratinjau dulu, lalu simpan</p></div></div><div class="card-body">' +
      '<form id="gen-form" novalidate><div class="form-alert"></div>' +
      '<div class="field"><span class="label" id="gt-l">Jenis laporan</span>' + MC.segmented('gt', TYPES, GEN.type, 'Jenis laporan') + '</div>' +
      '<div class="form-grid">' + MC.field({ name: 'date', label: 'Tanggal dalam periode', type: 'date', value: MC.todayKey(), required: true, hint: 'Mingguan: Senin–Minggu dari tanggal ini. Bulanan: bulan dari tanggal ini.' }) +
      MC.field({ name: 'includePrivate', label: 'Sertakan data pribadi', type: 'switch', value: false, hint: 'Hanya untuk arsip pribadi — laporan ini tidak bisa diterbitkan ke atasan.' }) +
      MC.field({ name: 'summaryNote', label: 'Ringkasan', type: 'textarea', rows: 3, maxlength: 3000, full: true, placeholder: 'Contoh: Fokus minggu ini produksi konten campaign dan dokumentasi wisuda.' }) +
      MC.field({ name: 'obstacles', label: 'Kendala', type: 'textarea', rows: 2, maxlength: 2000, full: true }) +
      MC.field({ name: 'nextPlan', label: 'Rencana berikutnya', type: 'textarea', rows: 2, maxlength: 2000, full: true }) + '</div>' +
      '<div class="form-actions"><button class="btn btn-secondary" type="button" id="gen-prev">' + icon('eye') + 'Pratinjau</button>' +
      '<button class="btn btn-primary" type="submit" id="gen-save">' + icon('check') + 'Simpan laporan</button></div></form>' +
      '<div id="gen-preview"></div></div></section>' +
      '<section class="card"><div class="card-head"><div><h2>Riwayat laporan</h2></div></div><div class="card-body flush" id="rep-list">' + MC.loadingBox(160) + '</div></section></div></div>';
    var form = $('#gen-form');
    MC.bindSegmented(form, 'gt', function (v) { GEN.type = v; $('#gen-preview').innerHTML = ''; });
    function payload() {
      var v = MC.validate(form, [['date', 'required', 'Pilih tanggal.']]);
      if (!v) return null;
      v.type = GEN.type;
      return v;
    }
    $('#gen-prev').addEventListener('click', function (e) {
      var v = payload(); if (!v) return;
      var btn = e.currentTarget;
      MC.setLoading(btn, true);
      MC.api('reports.preview', v).then(function (snap) {
        MC.setLoading(btn, false);
        var label = TYPES.filter(function (t) { return t[0] === v.type; })[0][1];
        $('#gen-preview').innerHTML = '<div class="preview-wrap"><div class="alert alert-info">' + icon('eye') + '<div>Pratinjau — belum disimpan.</div></div>' +
          MC.reportDoc({ title: 'Laporan ' + label + ' · ' + snap.period.label, status: 'DRAFT', snapshot: snap, summaryNote: v.summaryNote, obstacles: v.obstacles, nextPlan: v.nextPlan }) + '</div>';
        $('#gen-preview').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, function (er) { MC.setLoading(btn, false); MC.formAlert(form, er.message); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = payload(); if (!v) return;
      var btn = $('#gen-save');
      MC.setLoading(btn, true);
      MC.api('reports.generate', v).then(function (r) {
        MC.toast('Laporan dibuat sebagai draf.');
        location.hash = '#/reports/' + encodeURIComponent(r.reportId);
      }, function (er) { MC.setLoading(btn, false); MC.formAlert(form, er.message); });
    });
    function loadList() {
      MC.load('reports.list', {}, function (items) {
        if (!MC.stillOn('reports')) return;
        $('#rep-list').innerHTML = items.length ? reportList(items, '#/reports/') : '<div class="card-pad">' + MC.emptyState('report', 'Belum ada laporan', 'Buat laporan mingguan pertama dari formulir di samping.') + '</div>';
      }, function (er) { MC.errorState($('#rep-list'), er, loadList); });
    }
    loadList();
    if (sub === 'new') setTimeout(function () { var el = $('#gen-card'); if (el) el.scrollIntoView(); var d = $('[name=date]', form); if (d) d.focus(); }, 50);
  };

  function reportList(items, base) {
    return '<ul class="list">' + items.map(function (r) {
      return '<li class="list-item"><a class="row-link flex" href="' + base + encodeURIComponent(r.reportId) + '"><span class="dot-ico">' + icon('report') + '</span>' +
        '<span class="main"><span class="title">' + esc(r.title) + '</span><span class="meta">' + (r.stats ? esc(r.stats.tasksDone) + ' tugas selesai · ' + esc(r.stats.activities) + ' aktivitas · ' + esc(String(r.stats.hours).replace('.', ',')) + ' jam' : '') + '</span></span>' +
        '<span class="row-badges">' + (r.includePrivate ? '<span class="badge badge-neutral">' + icon('lock') + 'Pribadi</span>' : '') + MC.statusBadge(r.status) + '</span></a></li>';
    }).join('') + '</ul>';
  }

  function reportView(main, id) {
    MC.skeletonPage(main);
    MC.api('reports.get', { reportId: id }).then(function (r) {
      if (!MC.stillOn('reports')) return;
      var draft = r.status === 'DRAFT';
      main.innerHTML = '<div class="page">' +
        '<a class="back-link no-print" href="#/reports">' + icon('chevronLeft') + 'Semua laporan</a>' +
        '<div class="report-actions no-print card card-pad">' +
        (draft ? (r.includePrivate ? '<div class="alert alert-warning">' + icon('lock') + '<div>Laporan ini memuat data pribadi sehingga hanya untuk arsip kamu.</div></div>'
          : '<div class="alert alert-info">' + icon('eye') + '<div><strong>Masih draf.</strong> Atasan belum bisa melihat laporan ini sampai diterbitkan.</div></div>')
          : '<div class="alert alert-success">' + icon('checkCircle') + '<div><strong>Sudah terbit.</strong> Atasan dapat membaca dan memberi feedback.</div></div>') +
        '<div class="ra-buttons">' +
        (draft && !r.includePrivate ? '<button class="btn btn-primary" type="button" id="rp-pub">' + icon('send') + 'Terbitkan ke atasan</button>' : '') +
        (!draft ? '<button class="btn btn-secondary" type="button" id="rp-unpub">' + icon('refresh') + 'Tarik ke draf</button>' : '') +
        (draft ? '<button class="btn btn-secondary" type="button" id="rp-edit">' + icon('edit') + 'Ubah catatan</button>' +
          '<button class="btn btn-secondary" type="button" id="rp-refresh">' + icon('refresh') + 'Perbarui data</button>' : '') +
        (MC.CFG.NO_PRINT ? '' : '<button class="btn btn-secondary" type="button" id="rp-print">' + icon('printer') + 'Cetak / PDF</button>') +
        '<button class="btn btn-secondary" type="button" id="rp-drive">' + icon('download') + 'Simpan PDF ke Drive</button>' +
        (draft ? '<button class="btn btn-danger" type="button" id="rp-del">' + icon('trash') + 'Hapus</button>' : '') +
        '</div></div>' + MC.reportDoc(r) +
        (r.reviews && r.reviews.length ? '<section class="card no-print"><div class="card-head"><div><h2>Feedback atasan</h2></div></div><div class="card-body"><ul class="review-list">' +
          r.reviews.map(function (x) { return MC.reviewItem(x, { owner: true }); }).join('') + '</ul></div></section>' : '') + '</div>';
      var reload = function () { reportView(main, id); };
      function act(btnId, action, payload, msg) {
        var b = $('#' + btnId); if (!b) return;
        b.addEventListener('click', function () {
          MC.setLoading(b, true);
          MC.api(action, Object.assign({ reportId: r.reportId }, payload)).then(function (res) {
            MC.toast(msg);
            if (action === 'reports.exportPdf' && res && MC.safeHttps(res.url) && !MC.DEMO) window.open(res.url, '_blank', 'noopener');
            reload();
          }, function (e) { MC.setLoading(b, false); MC.toast(e.message, 'error'); });
        });
      }
      act('rp-pub', 'reports.publish', {}, 'Laporan diterbitkan. Atasan sekarang bisa membacanya.');
      act('rp-unpub', 'reports.publish', { unpublish: true }, 'Laporan ditarik ke draf.');
      act('rp-refresh', 'reports.update', { refreshData: true }, 'Data laporan diperbarui dari data terbaru.');
      act('rp-drive', 'reports.exportPdf', {}, MC.DEMO ? 'Mode demo: di versi asli, PDF tersimpan di Drive 03_REPORTS.' : 'PDF tersimpan di Google Drive (03_REPORTS).');
      if ($('#rp-print')) $('#rp-print').addEventListener('click', MC.printReport);
      if ($('#rp-del')) $('#rp-del').addEventListener('click', function () {
        MC.confirmDialog({ title: 'Hapus laporan draf?', message: '"' + r.title + '" akan dihapus.', danger: true, confirmText: 'Hapus', icon: 'trash' }).then(function (yes) {
          if (!yes) return;
          MC.api('reports.remove', { reportId: r.reportId }).then(function () { MC.toast('Laporan dihapus.'); location.hash = '#/reports'; }, function (e) { MC.toast(e.message, 'error'); });
        });
      });
      if ($('#rp-edit')) $('#rp-edit').addEventListener('click', function () {
        MC.formDialog({
          title: 'Ubah catatan laporan', icon: 'edit', wide: true, submitText: 'Simpan',
          body: MC.field({ name: 'summaryNote', label: 'Ringkasan', type: 'textarea', rows: 3, maxlength: 3000, value: r.summaryNote, full: true }) +
            MC.field({ name: 'obstacles', label: 'Kendala', type: 'textarea', rows: 2, maxlength: 2000, value: r.obstacles, full: true }) +
            MC.field({ name: 'nextPlan', label: 'Rencana berikutnya', type: 'textarea', rows: 2, maxlength: 2000, value: r.nextPlan, full: true }),
          onSubmit: function (form) {
            var v = MC.readForm(form); v.reportId = r.reportId;
            return MC.api('reports.update', v).then(function () { MC.toast('Catatan disimpan.'); MC.closeOverlay(); reload(); });
          }
        });
      });
      MC.bindAck(main, reload);
      MC.focusHeading();
    }, function (err) { MC.errorState(main, err, function () { reportView(main, id); }); });
  }

  /* =================== Laporan (Mode Atasan) =================== */
  MC.PAGES['exec-reports'] = function (main, sub) {
    if (sub) return execReportView(main, sub);
    main.innerHTML = '<div class="page">' + MC.pageHead('Mode Atasan', 'Laporan', 'Laporan periodik yang sudah diterbitkan.') + '<section class="card"><div class="card-body flush" id="er-list">' + MC.loadingBox(160) + '</div></section></div>';
    function load() {
      MC.load('exec.reports', {}, function (items) {
        if (!MC.stillOn('exec-reports')) return;
        $('#er-list').innerHTML = items.length ? reportList(items, '#/exec-reports/') : '<div class="card-pad">' + MC.emptyState('report', 'Belum ada laporan terbit', 'Laporan yang diterbitkan pemilik akan muncul di sini.') + '</div>';
      }, function (e) { MC.errorState($('#er-list'), e, load); });
    }
    load();
  };
  function execReportView(main, id) {
    MC.skeletonPage(main);
    MC.api('reports.get', { reportId: id }).then(function (r) {
      if (!MC.stillOn('exec-reports')) return;
      var owner = MC.state.me.role === 'OWNER';
      main.innerHTML = '<div class="page"><a class="back-link no-print" href="#/exec-reports">' + icon('chevronLeft') + 'Semua laporan</a>' +
        '<div class="report-actions no-print card card-pad"><div class="ra-buttons">' + (MC.CFG.NO_PRINT ? '' : '<button class="btn btn-primary" type="button" id="er-print">' + icon('printer') + 'Cetak / unduh PDF</button>') +
        (owner ? '' : '<button class="btn btn-secondary" type="button" id="er-fb">' + icon('message') + 'Beri feedback</button>') + '</div></div>' +
        MC.reportDoc(r) +
        '<section class="card no-print"><div class="card-head"><div><h2>Feedback</h2></div></div><div class="card-body">' +
        (r.reviews.length ? '<ul class="review-list">' + r.reviews.map(function (x) { return MC.reviewItem(x); }).join('') + '</ul>' : '<p class="hint">Belum ada feedback untuk laporan ini.</p>') +
        (owner ? '<p class="hint" style="margin-top:12px">' + icon('eye', 'width="14" height="14"') + ' Kamu sedang mempratinjau Mode Atasan. Feedback hanya dapat ditulis oleh akun atasan.</p>' : '') + '</div></section></div>';
      if ($('#er-print')) $('#er-print').addEventListener('click', MC.printReport);
      if ($('#er-fb')) $('#er-fb').addEventListener('click', function () { MC.feedbackDialog('REPORT', r.reportId, r.title, function () { execReportView(main, id); }); });
      MC.focusHeading();
    }, function (err) { MC.errorState(main, err, function () { execReportView(main, id); }); });
  }
})(window.MC);

;
/* =========================================================
   Mode Atasan: proyek, detail proyek, aktivitas, feedback.
   Semua data berasal dari endpoint exec.* (selalu scope atasan),
   sehingga pratinjau pemilik identik dengan yang dilihat atasan.
   ========================================================= */
(function (MC) {
  'use strict';
  var $ = MC.$, $$ = MC.$$, esc = MC.esc, icon = MC.icon;

  /** Form feedback atasan (umum / proyek / laporan). */
  MC.feedbackDialog = function (entityType, entityId, title, after) {
    if (MC.state.me.role !== 'SUPERVISOR') { MC.toast('Feedback hanya dapat ditulis oleh akun atasan.', 'error'); return; }
    var rating = 0;
    MC.formDialog({
      title: 'Beri feedback', icon: 'message', sub: title, submitText: 'Kirim feedback', submitIcon: 'send',
      body: '<div class="field full"><span class="label" id="rt-l">Penilaian <span class="opt">(opsional)</span></span><div class="rating" role="radiogroup" aria-labelledby="rt-l">' +
        [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" role="radio" aria-checked="false" data-rate="' + n + '" aria-label="' + n + ' dari 5">★</button>'; }).join('') + '</div></div>' +
        MC.field({ name: 'comment', label: 'Feedback', type: 'textarea', rows: 4, required: true, maxlength: 2000, full: true, placeholder: 'Contoh: Hasil dokumentasinya rapi. Mohon video teaser selesai sebelum Jumat.' }),
      onSubmit: function (form) {
        var v = MC.validate(form, [['comment', 'required', 'Tulis feedback minimal 2 karakter.', 2]]);
        if (!v) return null;
        return MC.api('reviews.create', { entityType: entityType, entityId: entityId, comment: v.comment, rating: rating }).then(function () {
          MC.toast('Feedback terkirim. Terima kasih!'); MC.closeOverlay(); if (after) after();
        });
      },
      onOpen: function (form) {
        var stars = $$('[data-rate]', form);
        stars.forEach(function (b) {
          b.addEventListener('click', function () {
            var n = Number(b.getAttribute('data-rate'));
            rating = rating === n ? 0 : n;
            stars.forEach(function (x) { var k = Number(x.getAttribute('data-rate')); x.classList.toggle('on', k <= rating); x.setAttribute('aria-checked', String(k === rating)); });
          });
        });
      }
    });
  };

  var EP = { view: MC.store.get('mcms.execprojects.view') || 'cards', sort: { key: 'dueDate', dir: 'asc' } };
  MC.PAGES['exec-projects'] = function (main, sub) {
    if (sub) return execProject(main, sub);
    main.innerHTML = '<div class="page">' + MC.pageHead('Mode Atasan', 'Proyek', 'Proyek Media Center yang dibagikan beserta progresnya.') +
      '<div class="toolbar"><span class="hint" id="ep-count"></span>' + MC.segmented('epv', [['cards', 'Kartu', 'grid'], ['table', 'Tabel', 'list']], EP.view, 'Tampilan proyek') + '</div>' +
      '<div id="ep-body">' + MC.loadingBox(200) + '</div></div>';
    var last = [];
    function draw() {
      var box = $('#ep-body'); if (!box) return;
      $('#ep-count').textContent = last.length + ' proyek';
      if (!last.length) { box.innerHTML = '<div class="card card-pad">' + MC.emptyState('folder', 'Belum ada proyek', 'Proyek yang dibagikan akan tampil di sini.') + '</div>'; return; }
      if (EP.view === 'table') { box.innerHTML = MC.projectTable(last, '#/exec-projects/', EP.sort); MC.bindProjectTable(box, EP.sort, draw); return; }
      box.innerHTML = '<div class="project-grid">' + last.map(function (p) { return MC.projectCard(p, '#/exec-projects/' + encodeURIComponent(p.projectId)); }).join('') + '</div>';
    }
    MC.bindSegmented(main, 'epv', function (v) { EP.view = v; MC.store.set('mcms.execprojects.view', v); draw(); });
    function load() {
      MC.load('exec.projects', {}, function (items) {
        if (!MC.stillOn('exec-projects')) return;
        last = items; draw();
      }, function (e) { MC.errorState($('#ep-body'), e, load); });
    }
    load();
  };

  function execProject(main, id) {
    if (MC.state.lastView !== location.hash) MC.skeletonPage(main);
    MC.load('exec.project', { projectId: id }, function (d) {
      if (!MC.stillOn('exec-projects')) return;
      var p = d.project, isSup = MC.state.me.role === 'SUPERVISOR';
      var due = MC.dueLabel(p.dueDate, p.status === 'DONE');
      var mins = d.activities.reduce(function (s, a) { return s + a.durationMinutes; }, 0);
      main.innerHTML = '<div class="page"><a class="back-link" href="#/exec-projects">' + icon('chevronLeft') + 'Semua proyek</a>' +
        '<div class="detail-hero card"><div class="dh-top"><div class="dh-text"><div class="eyebrow">' + esc(p.projectId) + (p.category ? ' · ' + esc(p.category.name) : '') + '</div><h1>' + esc(p.name) + '</h1>' +
        '<div class="dh-badges">' + MC.statusBadge(p.status) + MC.priorityBadge(p.priority) + (p.overdue ? '<span class="badge badge-danger">' + icon('alert') + 'Terlambat</span>' : '') + '</div></div>' +
        (isSup ? '<div class="dh-actions"><button class="btn btn-primary" type="button" id="ep-fb">' + icon('message') + 'Beri feedback</button></div>' : '') + '</div>' +
        '<div class="dh-progress">' + MC.progressRow(p.progress) + '</div>' +
        '<div class="dh-stats"><div><span class="v num">' + p.taskDone + '/' + p.taskCount + '</span><span class="l">tugas selesai</span></div>' +
        '<div><span class="v">' + (p.dueDate ? esc(MC.fmtDay(p.dueDate)) : '—') + '</span><span class="l">' + (due ? esc(due.text) : 'tanpa deadline') + '</span></div>' +
        '<div><span class="v num">' + esc(MC.fmtMinutes(mins)) + '</span><span class="l">waktu tercatat</span></div>' +
        '<div><span class="v num">' + d.assets.length + '</span><span class="l">bukti kerja</span></div></div></div>' +
        (p.description || p.objective ? '<section class="card"><div class="card-head"><div><h2>Brief & tujuan</h2></div></div><div class="card-body">' +
          (p.description ? '<p class="prose">' + MC.multiline(p.description) + '</p>' : '') + (p.objective ? '<p class="prose" style="margin-top:10px"><strong>Tujuan:</strong> ' + MC.multiline(p.objective) + '</p>' : '') + '</div></section>' : '') +
        '<div class="grid grid-main"><div class="stack">' +
        '<section class="card"><div class="card-head"><div><h2>Tugas</h2><p>Progres per pekerjaan</p></div></div><div class="card-body flush">' +
        (d.tasks.length ? '<ul class="task-list">' + d.tasks.map(function (t) { return MC.taskRow(t, { readonly: true }); }).join('') + '</ul>' : '<p class="hint pad">Belum ada tugas yang dibagikan.</p>') + '</div></section>' +
        '<section class="card"><div class="card-head"><div><h2>Bukti kerja</h2></div></div><div class="card-body">' +
        (d.assets.length ? MC.assetGrid(d.assets, { exec: true }) : '<p class="hint">Belum ada file yang dibagikan.</p>') + '</div></section>' +
        '</div><div class="stack">' +
        '<section class="card"><div class="card-head"><div><h2>Timeline aktivitas</h2></div></div><div class="card-body">' +
        (d.activities.length ? MC.groupByDay(d.activities, function (a) { return MC.activityRow(a); }) : '<p class="hint">Belum ada aktivitas.</p>') + '</div></section>' +
        '<section class="card"><div class="card-head"><div><h2>Feedback</h2></div></div><div class="card-body">' +
        (d.reviews.length ? '<ul class="review-list">' + d.reviews.map(function (r) { return MC.reviewItem(r); }).join('') + '</ul>' : '<p class="hint">Belum ada feedback.</p>') +
        (isSup ? '' : '<p class="hint" style="margin-top:12px">' + icon('eye', 'width="14" height="14"') + ' Pratinjau Mode Atasan — feedback ditulis oleh akun atasan.</p>') + '</div></section>' +
        '</div></div></div>';
      if ($('#ep-fb')) $('#ep-fb').addEventListener('click', function () { MC.feedbackDialog('PROJECT', p.projectId, p.name, function () { execProject(main, id); }); });
      MC.bindAssetOpen(main, true);
      MC.loadThumbs(main);
      MC.focusHeading();
    }, function (err) { MC.errorState(main, err, function () { execProject(main, id); }); });
  }

  var EA = { period: '7' };
  MC.PAGES['exec-activity'] = function (main) {
    main.innerHTML = '<div class="page">' + MC.pageHead('Mode Atasan', 'Aktivitas', 'Kegiatan Media Center secara kronologis.') +
      '<div class="toolbar">' + MC.segmented('eap', [['7', '7 hari'], ['30', '30 hari'], ['month', 'Bulan ini'], ['all', 'Semua']], EA.period, 'Periode') + '</div>' +
      '<div id="eact-body">' + MC.loadingBox(200) + '</div></div>';
    MC.bindSegmented(main, 'eap', function (v) { EA.period = v; load(); });
    function load() {
      var r = MC.periodRange(EA.period);
      MC.load('exec.activity', { from: r.from }, function (d) {
        if (!MC.stillOn('exec-activity')) return;
        $('#eact-body').innerHTML = '<div class="summary-strip"><div><span class="v num">' + d.total + '</span><span class="l">aktivitas</span></div>' +
          '<div><span class="v num">' + esc(MC.fmtMinutes(d.totalMinutes)) + '</span><span class="l">waktu tercatat</span></div></div>' +
          (d.items.length ? '<div class="card"><div class="card-body">' + MC.groupByDay(d.items, function (a) { return MC.activityRow(a); }) + '</div></div>'
            : '<div class="card card-pad">' + MC.emptyState('activity', 'Belum ada aktivitas', 'Tidak ada aktivitas pada periode ini.') + '</div>');
      }, function (e) { MC.errorState($('#eact-body'), e, load); });
    }
    load();
  };

  /* =================== Kotak feedback (pemilik) =================== */
  var FB = { filter: 'OPEN' };
  MC.PAGES.feedback = function (main) {
    main.innerHTML = '<div class="page">' + MC.pageHead('Laporan', 'Feedback Atasan', 'Masukan dari atasan untuk proyek, laporan, dan pekerjaan secara umum.') +
      '<div class="toolbar" id="fb-tools"></div><div id="fb-body">' + MC.loadingBox(160) + '</div></div>';
    function load() {
      MC.api('reviews.list', {}).then(function (d) {
        if (!MC.stillOn('feedback')) return;
        MC.setNavBadge('feedback', d.open);
        $('#fb-tools').innerHTML = MC.segmented('fbf', [['OPEN', 'Belum dibaca', null, d.open], ['ALL', 'Semua', null, d.items.length]], FB.filter, 'Filter feedback');
        MC.bindSegmented($('#fb-tools'), 'fbf', function (v) { FB.filter = v; load(); });
        var items = FB.filter === 'OPEN' ? d.items.filter(function (r) { return r.status === 'OPEN'; }) : d.items;
        $('#fb-body').innerHTML = items.length ? '<section class="card"><div class="card-body"><ul class="review-list">' + items.map(function (r) {
          var link = r.entityType === 'PROJECT' ? '#/projects/' + encodeURIComponent(r.entityId) + '/feedback' : r.entityType === 'REPORT' ? '#/reports/' + encodeURIComponent(r.entityId) : '';
          return MC.reviewItem(r, { owner: true, showEntity: true }).replace('</li>', (link ? '<a class="btn btn-ghost btn-sm rv-link" href="' + link + '">Lihat ' + (r.entityType === 'PROJECT' ? 'proyek' : 'laporan') + icon('arrowRight') + '</a>' : '') + '</li>');
        }).join('') + '</ul></div></section>'
          : '<div class="card card-pad">' + MC.emptyState('message', FB.filter === 'OPEN' ? 'Semua feedback sudah dibaca' : 'Belum ada feedback', 'Feedback dari atasan akan muncul di sini.') + '</div>';
        MC.bindAck($('#fb-body'), load);
      }, function (e) { MC.errorState($('#fb-body'), e, load); });
    }
    load();
  };
})(window.MC);

;
/* =========================================================
   Mode Atasan — Permintaan kerja ke Media Center.
   Atasan menulis brief + tautan/file referensi desain → otomatis menjadi tugas pemilik.
   Atasan memantau status, progres, hasil kerja, dan berdiskusi lewat komentar.
   ========================================================= */
(function (MC) {
  'use strict';
  var $ = MC.$, $$ = MC.$$, esc = MC.esc, icon = MC.icon;
  var MAX_BYTES = MC.DEMO ? 2 * 1024 * 1024 : 10 * 1024 * 1024;
  var RQ = { filter: 'OPEN' };

  function isSup() { return MC.state.me && MC.state.me.role === 'SUPERVISOR'; }

  /* ---------- Form permintaan baru ---------- */
  function requestForm(after) {
    MC.api('exec.projects').then(function (projects) {
      var files = [];
      var f = MC.formDialog({
        title: 'Permintaan baru', icon: 'send', wide: true, submitText: 'Kirim permintaan', submitIcon: 'send',
        sub: 'Permintaan langsung masuk ke daftar tugas Media Center.',
        body:
          MC.field({ name: 'title', label: 'Apa yang dibutuhkan?', required: true, maxlength: 200, full: true, placeholder: 'Contoh: Poster PPDB gelombang 2 untuk Instagram' }) +
          MC.field({ name: 'description', label: 'Brief / detail', type: 'textarea', rows: 4, maxlength: 5000, full: true,
            placeholder: 'Tujuan, ukuran/format, teks wajib, warna, tanggal publikasi…' }) +
          MC.field({ name: 'dueDate', label: 'Dibutuhkan paling lambat', type: 'date', min: MC.todayKey() }) +
          MC.field({ name: 'priority', label: 'Prioritas', type: 'select', value: 'MEDIUM', required: true, options: MC.PRIORITIES.map(function (p) { return [p[0], p[1]]; }) }) +
          (projects.length ? MC.field({ name: 'projectId', label: 'Bagian dari proyek', type: 'select', full: true,
            options: [['', '— Tidak terkait proyek —']].concat(projects.filter(function (p) { return p.status !== 'DONE'; }).map(function (p) { return [p.projectId, p.name]; })) }) : '') +
          MC.field({ name: 'links', label: 'Tautan referensi desain', type: 'textarea', rows: 3, full: true,
            placeholder: 'Satu tautan per baris, misalnya Pinterest, Instagram, Canva, Google Drive', hint: 'Maksimal 10 tautan. Diawali https://' }) +
          '<div class="field full"><span class="label">File referensi <span class="opt">(opsional)</span></span>' +
          '<div class="uploader" id="rq-zone"><input type="file" id="rq-input" multiple class="sr-only" accept="image/*,video/*,application/pdf,.doc,.docx,.ppt,.pptx">' +
          '<label for="rq-input" class="uploader-label">' + icon('upload') + '<span><strong>Pilih file</strong> atau seret ke sini</span>' +
          '<span class="hint">Contoh desain, foto, logo, dokumen · maks ' + MC.fmtSize(MAX_BYTES) + ' per file</span></label></div>' +
          '<ul class="upload-list" id="rq-list" aria-live="polite"></ul></div>',
        onSubmit: function (form) {
          var v = MC.validate(form, [['title', 'required', 'Tulis apa yang dibutuhkan (minimal 2 karakter).', 2]]);
          if (!v) return null;
          var lines = String(v.links || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(String);
          var bad = lines.filter(function (u) { return !/^https?:\/\/\S+\.\S+/i.test(u); })[0];
          if (bad) { MC.fieldError(form, 'links', 'Tautan harus diawali https:// — periksa: ' + bad.slice(0, 50)); return null; }
          if (lines.length > 10) { MC.fieldError(form, 'links', 'Maksimal 10 tautan.'); return null; }
          var queue = files.filter(function (x) { return x.state === 'ready'; });
          return MC.api('requests.create', { title: v.title, description: v.description, dueDate: v.dueDate, priority: v.priority, projectId: v.projectId || '', links: lines })
            .then(function (r) {
              var chain = Promise.resolve(), failed = 0;
              queue.forEach(function (x) {
                chain = chain.then(function () {
                  x.state = 'uploading'; draw();
                  return Promise.all([MC.fileToBase64(x.file), MC.makeThumb(x.file)]).then(function (res) {
                    var th = res[1];
                    return MC.api('requests.attach', { taskId: r.task.taskId, fileName: x.file.name, mimeType: x.file.type || 'application/octet-stream',
                      dataBase64: res[0], thumbBase64: th ? th.data : '', thumbMime: th ? th.mime : '' });
                  }).then(function () { x.state = 'done'; draw(); }, function (e) { x.state = 'error'; x.err = e.message; failed++; draw(); });
                });
              });
              return chain.then(function () {
                MC.toast(failed ? 'Permintaan terkirim, tetapi ' + failed + ' file gagal diunggah.' : 'Permintaan terkirim ke Media Center.', failed ? 'error' : 'success');
                MC.closeOverlay();
                if (after) after();
              });
            });
        },
        onOpen: function (form) {
          var input = $('#rq-input', form), zone = $('#rq-zone', form);
          input.addEventListener('change', function () { add(input.files); input.value = ''; });
          ['dragenter', 'dragover'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('drag'); }); });
          ['dragleave', 'drop'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('drag'); }); });
          zone.addEventListener('drop', function (e) { add(e.dataTransfer.files); });
        }
      });
      function add(list) {
        Array.prototype.forEach.call(list, function (file) {
          var err = file.size > MAX_BYTES ? 'Lebih dari ' + MC.fmtSize(MAX_BYTES) + '. Kirim sebagai tautan Google Drive.' : !file.size ? 'File kosong.' :
            /\.(html?|js|exe|bat|cmd|sh|php|svg)$/i.test(file.name) ? 'Tipe file ini tidak diizinkan.' : '';
          files.push({ file: file, err: err, state: err ? 'error' : 'ready' });
        });
        draw();
      }
      function draw() {
        var ul = $('#rq-list', f.form); if (!ul) return;
        ul.innerHTML = files.map(function (x, i) {
          var st = x.state === 'error' ? '<span class="due due-danger">' + icon('alert', 'width="13" height="13"') + esc(x.err) + '</span>'
            : x.state === 'uploading' ? '<span class="due due-info"><span class="spinner" aria-hidden="true"></span>Mengunggah…</span>'
              : x.state === 'done' ? '<span class="due due-success">' + icon('check', 'width="13" height="13"') + 'Terlampir</span>'
                : '<span class="hint">' + MC.fmtSize(x.file.size) + '</span>';
          return '<li class="upload-item"><span class="dot-ico">' + icon(/^image\//.test(x.file.type) ? 'image' : /^video\//.test(x.file.type) ? 'video' : 'file') + '</span>' +
            '<span class="grow"><span class="t">' + esc(x.file.name) + '</span>' + st + '</span>' +
            (x.state === 'ready' || x.state === 'error' ? '<button class="icon-btn sm" type="button" data-rm="' + i + '" aria-label="Hapus ' + esc(x.file.name) + ' dari daftar">' + icon('x') + '</button>' : '') + '</li>';
        }).join('');
        $$('[data-rm]', ul).forEach(function (b) { b.addEventListener('click', function () { files.splice(Number(b.getAttribute('data-rm')), 1); draw(); }); });
      }
    }, function (e) { MC.toast(e.message, 'error'); });
  }

  /* ---------- Detail permintaan (panel samping) ---------- */
  function openRequest(taskId, onChange) {
    var changed = false;
    var ov = MC.openOverlay('<div class="drawer-head"><h2 id="dlg-title">Detail permintaan</h2><button class="icon-btn" type="button" data-close aria-label="Tutup">' + icon('x') + '</button></div>' +
      '<div class="drawer-body" id="rq-body">' + MC.loadingBox(200) + '</div>', { drawer: true, onClose: function () { if (changed && onChange) onChange(); } });
    $('[data-close]', ov).addEventListener('click', MC.closeOverlay);
    function load() {
      MC.api('requests.get', { taskId: taskId }).then(render, function (e) {
        var b = $('#rq-body'); if (b) b.innerHTML = '<div class="alert alert-error">' + icon('alert') + '<div>' + esc(e.message) + '</div></div>';
      });
    }
    function render(d) {
      var t = d.task, body = $('#rq-body');
      if (!body) return;
      body.innerHTML =
        '<div class="td-title"><h3>' + esc(t.title) + '</h3><div class="td-badges">' + MC.statusBadge(t.status) + MC.priorityBadge(t.priority) +
        (t.projectName ? '<span class="badge badge-neutral">' + icon('folder') + esc(t.projectName) + '</span>' : '') + '</div></div>' +
        '<div class="td-section"><span class="label">Progres pengerjaan</span>' + MC.progressRow(t.progress) + '</div>' +
        '<dl class="kv td-kv"><dt>Diminta</dt><dd>' + esc(MC.fmtDate(t.requestedAt, true)) + '</dd>' +
        '<dt>Deadline</dt><dd>' + (t.dueDate ? esc(MC.fmtDay(t.dueDate)) + ' ' + MC.dueChip(t.dueDate, t.status === 'DONE') : '—') + '</dd>' +
        (t.completedAt ? '<dt>Selesai</dt><dd>' + esc(MC.fmtDate(t.completedAt, true)) + '</dd>' : '') + '</dl>' +
        (t.description ? '<div class="td-section"><span class="label">Brief</span><p class="td-desc">' + MC.multiline(t.description) + '</p></div>' : '') +
        (t.referenceLinks.length ? '<div class="td-section"><span class="label">Tautan referensi</span><ul class="link-list">' + t.referenceLinks.map(function (u) {
          return '<li><a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + icon('link', 'width="14" height="14"') + '<span>' + esc(u.replace(/^https?:\/\/(www\.)?/, '')) + '</span></a></li>';
        }).join('') + '</ul></div>' : '') +
        (d.references.length ? '<div class="td-section"><h4>File referensi (' + d.references.length + ')</h4>' + MC.assetGrid(d.references, { exec: true }) + '</div>' : '') +
        (isSup() && t.status !== 'DONE' ? '<div class="td-section"><label class="label" for="rq-more">Tambah file referensi</label><input type="file" id="rq-more" multiple accept="image/*,video/*,application/pdf,.doc,.docx,.ppt,.pptx" class="input"></div>' : '') +
        '<div class="td-section"><h4>Hasil kerja (' + d.results.length + ')</h4>' + (d.results.length ? MC.assetGrid(d.results, { exec: true }) : '<p class="hint">Belum ada hasil yang dibagikan. File hasil akan muncul di sini.</p>') + '</div>' +
        (d.activities.length ? '<div class="td-section"><h4>Aktivitas pengerjaan</h4><ul class="act-list">' + d.activities.map(function (a) { return MC.activityRow(a, { showDate: true }); }).join('') + '</ul></div>' : '') +
        '<div class="td-section"><h4>Diskusi</h4>' + (d.comments.length ? '<ul class="chat">' + d.comments.map(function (c) {
          var mine = MC.state.me && c.reviewerName === MC.state.me.displayName;
          return '<li class="bubble' + (mine ? ' me' : '') + '"><div class="b-meta"><strong>' + esc(c.reviewerName) + '</strong> · ' + esc(MC.fmtDate(c.createdAt, true)) + '</div><p>' + MC.multiline(c.comment) + '</p></li>';
        }).join('') + '</ul>' : '<p class="hint">Belum ada komentar.</p>') +
        '<form class="inline-form" id="rq-c-form" novalidate><label class="sr-only" for="rq-c">Tulis komentar</label><input class="input" id="rq-c" maxlength="2000" placeholder="Tulis komentar atau revisi…" autocomplete="off">' +
        '<button class="btn btn-primary" type="submit">' + icon('send') + 'Kirim</button></form></div>';
      $('#rq-c-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var inp = $('#rq-c'), txt = inp.value.trim();
        if (txt.length < 2) { MC.toast('Tulis komentar minimal 2 karakter.', 'error'); inp.focus(); return; }
        var btn = $('#rq-c-form button');
        MC.setLoading(btn, true);
        MC.api('requests.comment', { taskId: t.taskId, comment: txt }).then(function (nd) { changed = true; MC.toast('Komentar terkirim.'); render(nd); setTimeout(function () { var i = $('#rq-c'); if (i) i.focus(); }, 30); },
          function (er) { MC.setLoading(btn, false); MC.toast(er.message, 'error'); });
      });
      var more = $('#rq-more');
      if (more) more.addEventListener('change', function () {
        var list = Array.prototype.slice.call(more.files);
        more.disabled = true;
        var chain = Promise.resolve(), ok = 0;
        list.forEach(function (file) {
          chain = chain.then(function () {
            if (file.size > MAX_BYTES) { MC.toast(file.name + ': lebih dari ' + MC.fmtSize(MAX_BYTES) + '.', 'error'); return; }
            return Promise.all([MC.fileToBase64(file), MC.makeThumb(file)]).then(function (r) {
              return MC.api('requests.attach', { taskId: t.taskId, fileName: file.name, mimeType: file.type || 'application/octet-stream', dataBase64: r[0], thumbBase64: r[1] ? r[1].data : '', thumbMime: r[1] ? r[1].mime : '' });
            }).then(function () { ok++; }, function (er) { MC.toast(file.name + ': ' + er.message, 'error'); });
          });
        });
        chain.then(function () { if (ok) { changed = true; MC.toast(ok + ' file referensi ditambahkan.'); } load(); });
      });
      MC.bindAssetOpen(body, true);
      MC.loadThumbs(body);
    }
    load();
  }

  MC.PAGES['exec-requests'] = function (main) {
    var sup = isSup();
    main.innerHTML = '<div class="page">' + MC.pageHead('Mode Atasan', 'Permintaan ke Media Center',
      'Kirim brief, tautan, atau contoh desain. Permintaan otomatis masuk ke daftar tugas Media Center dan bisa dipantau di sini.',
      sup ? '<button class="btn btn-primary" type="button" id="rq-new">' + icon('plus') + 'Buat permintaan</button>' : '') +
      (sup ? '' : '<div class="alert alert-info" style="margin-bottom:16px">' + icon('eye') + '<div>Pratinjau Mode Atasan. Permintaan dibuat oleh akun atasan dan muncul di halaman <a href="#/tasks/requests">Tugas → Dari atasan</a>.</div></div>') +
      '<div class="toolbar" id="rq-tools"></div><div id="rq-list-box">' + MC.loadingBox(180) + '</div></div>';
    if (sup) $('#rq-new').addEventListener('click', function () { requestForm(load); });
    function load() {
      MC.load('requests.list', {}, function (items) {
        if (!MC.stillOn('exec-requests')) return;
        var open = items.filter(function (t) { return t.status !== 'DONE' && t.status !== 'CANCELLED'; });
        var done = items.filter(function (t) { return t.status === 'DONE'; });
        $('#rq-tools').innerHTML = MC.segmented('rqf', [['OPEN', 'Sedang berjalan', null, open.length], ['DONE', 'Selesai', null, done.length], ['ALL', 'Semua', null, items.length]], RQ.filter, 'Filter permintaan');
        MC.bindSegmented($('#rq-tools'), 'rqf', function (v) { RQ.filter = v; load(); });
        var list = RQ.filter === 'OPEN' ? open : RQ.filter === 'DONE' ? done : items;
        var box = $('#rq-list-box');
        box.innerHTML = list.length ? '<ul class="req-list">' + list.map(function (t) {
          return '<li><button type="button" class="req-card card" data-rq="' + esc(t.taskId) + '">' +
            '<span class="rq-top"><span class="rq-title">' + esc(t.title) + '</span><span class="row-badges">' + MC.priorityBadge(t.priority) + MC.statusBadge(t.status) + '</span></span>' +
            MC.progressRow(t.progress) +
            '<span class="rq-meta"><span>' + icon('calendar', 'width="14" height="14"') + 'Diminta ' + esc(MC.fmtDate(t.requestedAt)) + '</span>' +
            (t.dueDate ? MC.dueChip(t.dueDate, t.status === 'DONE') : '') +
            (t.referenceLinks.length ? '<span>' + icon('link', 'width="14" height="14"') + t.referenceLinks.length + ' tautan</span>' : '') +
            '<span>' + icon('image', 'width="14" height="14"') + t.resultCount + ' hasil</span>' +
            (t.projectName ? '<span>' + icon('folder', 'width="14" height="14"') + esc(t.projectName) + '</span>' : '') + '</span></button></li>';
        }).join('') + '</ul>' : '<div class="card card-pad">' + MC.emptyState('send', RQ.filter === 'DONE' ? 'Belum ada permintaan selesai' : 'Belum ada permintaan',
          sup ? 'Butuh poster, video, atau dokumentasi? Kirim permintaan beserta contoh desainnya.' : 'Permintaan dari atasan akan tampil di sini.',
          sup && RQ.filter !== 'DONE' ? '<button class="btn btn-primary" type="button" id="rq-empty">' + icon('plus') + 'Buat permintaan</button>' : '') + '</div>';
        var em = $('#rq-empty'); if (em) em.addEventListener('click', function () { requestForm(load); });
        $$('[data-rq]', box).forEach(function (b) { b.addEventListener('click', function () { openRequest(b.getAttribute('data-rq'), load); }); });
      }, function (e) { MC.errorState($('#rq-list-box'), e, load); });
    }
    load();
  };
  MC.openRequest = openRequest;
})(window.MC);

;
/* =========================================================
   Pengaturan tambahan: kategori kerja.
   ========================================================= */
(function (MC) {
  'use strict';
  var $ = MC.$, $$ = MC.$$, esc = MC.esc, icon = MC.icon;
  var COLORS = ['#7868ED', '#36A99B', '#E9A64D', '#E36D79', '#5B8DEF', '#6B7280', '#B05BD6', '#2E9E5B'];

  MC.settingsCategories = function (body) {
    body.innerHTML = MC.loadingBox(160);
    MC.api('categories.list').then(draw, function (e) { MC.errorState(body, e, function () { MC.settingsCategories(body); }); });
    function draw(cats) {
      body.innerHTML = '<div class="grid grid-2"><section class="card"><div class="card-head"><div><h2>Kategori kerja</h2><p>Dipakai untuk proyek, tugas, dan aktivitas</p></div></div><div class="card-body flush">' +
        '<ul class="list">' + cats.map(function (c) {
          return '<li class="list-item"><span class="cat-dot" style="background:' + esc(c.color) + '" aria-hidden="true"></span><div class="main"><div class="title">' + esc(c.name) + '</div>' +
            '<div class="meta">' + (c.active ? 'Aktif' : 'Nonaktif — tidak ditawarkan di form') + '</div></div>' +
            '<button class="btn btn-ghost btn-sm" type="button" data-cat="' + esc(c.categoryId) + '">' + icon('edit') + 'Ubah</button></li>';
        }).join('') + '</ul></div></section>' +
        '<section class="card"><div class="card-head"><div><h2>Tambah kategori</h2></div></div><div class="card-body">' + catForm(null) + '</div></section></div>';
      bind($('#cat-form-new'), null);
      $$('[data-cat]', body).forEach(function (b) {
        b.addEventListener('click', function () {
          var c = cats.filter(function (x) { return x.categoryId === b.getAttribute('data-cat'); })[0];
          MC.formDialog({
            title: 'Ubah kategori', icon: 'tag', submitText: 'Simpan',
            body: MC.field({ name: 'name', label: 'Nama kategori', required: true, value: c.name, maxlength: 40, full: true }) + colorPicker(c.color, 'e') +
              MC.field({ name: 'active', label: 'Aktif', type: 'switch', value: c.active, full: true, hint: 'Kategori nonaktif tidak muncul di form, tetapi data lama tetap tersimpan.' }),
            onSubmit: function (form) {
              var v = MC.validate(form, [['name', 'required', 'Nama minimal 2 karakter.', 2]]);
              if (!v) return null;
              v.categoryId = c.categoryId; v.color = colorOf(form);
              return MC.api('categories.save', v).then(function (list) { MC.toast('Kategori disimpan.'); MC.invalidate(); MC.closeOverlay(); draw(list); });
            }
          });
        });
      });
    }
    function colorPicker(cur, k) {
      return '<fieldset class="field full color-pick"><legend class="label">Warna</legend><div class="swatches">' + COLORS.map(function (c, i) {
        return '<label class="swatch"><input type="radio" name="color-' + k + '" value="' + c + '"' + ((cur || COLORS[0]) === c ? ' checked' : '') + '><span style="background:' + c + '"></span><span class="sr-only">Warna ' + (i + 1) + '</span></label>';
      }).join('') + '</div></fieldset>';
    }
    function colorOf(form) { var r = $('input[type=radio]:checked', form); return r ? r.value : COLORS[0]; }
    function catForm() {
      return '<form id="cat-form-new" novalidate><div class="form-alert"></div>' + MC.field({ name: 'name', label: 'Nama kategori', required: true, maxlength: 40, placeholder: 'Contoh: Podcast sekolah' }) +
        colorPicker(COLORS[0], 'n') + '<button class="btn btn-primary" type="submit">' + icon('plus') + 'Tambah</button></form>';
    }
    function bind(form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = MC.validate(form, [['name', 'required', 'Nama minimal 2 karakter.', 2]]);
        if (!v) return;
        var btn = $('button[type=submit]', form);
        MC.setLoading(btn, true);
        MC.api('categories.save', { name: v.name, color: colorOf(form) }).then(function (list) { MC.toast('Kategori ditambahkan.'); MC.invalidate(); draw(list); },
          function (er) { MC.setLoading(btn, false); MC.formAlert(form, er.message); });
      });
    }
  };
})(window.MC);

;
/* =========================================================
   Pencarian global + memulai aplikasi (dimuat paling akhir).
   ========================================================= */
(function (MC) {
  'use strict';
  var $ = MC.$, $$ = MC.$$, esc = MC.esc, icon = MC.icon;
  var TYPE = { PROJECT: ['folder', 'Proyek'], TASK: ['tasks', 'Tugas'], ACTIVITY: ['activity', 'Aktivitas'], ASSET: ['image', 'File'], REPORT: ['report', 'Laporan'] };

  function openSearch() {
    var ov = MC.openOverlay('<div class="search-dlg"><div class="search-top">' + icon('search') +
      '<label class="sr-only" for="gs-q" id="dlg-title">Cari di MCMS</label><input class="input" id="gs-q" type="search" autocomplete="off" placeholder="Cari proyek, tugas, file, laporan, atau ID…" data-autofocus>' +
      '<button class="icon-btn" type="button" data-close aria-label="Tutup">' + icon('x') + '</button></div>' +
      '<div class="search-results" id="gs-res" role="region" aria-live="polite"><p class="hint pad">Ketik minimal 2 huruf.</p></div></div>', { wide: true });
    $('[data-close]', ov).addEventListener('click', MC.closeOverlay);
    var q = $('#gs-q'), deb, seq = 0;
    q.addEventListener('input', function () {
      clearTimeout(deb);
      deb = setTimeout(function () {
        var text = q.value.trim(), my = ++seq;
        if (text.length < 2) { $('#gs-res').innerHTML = '<p class="hint pad">Ketik minimal 2 huruf.</p>'; return; }
        $('#gs-res').innerHTML = '<p class="hint pad">Mencari…</p>';
        MC.api('search.global', { q: text }).then(function (r) {
          if (my !== seq || !$('#gs-res')) return;
          $('#gs-res').innerHTML = r.results.length ? '<ul class="sheet-list">' + r.results.map(function (x, i) {
            var t = TYPE[x.type] || ['file', x.type];
            return '<li><button class="sheet-item" type="button" data-i="' + i + '"><span class="dot-ico">' + icon(t[0]) + '</span><span class="grow"><span class="t">' + esc(x.title) + '</span>' +
              '<span class="d">' + esc(t[1]) + (x.meta ? ' · ' + esc(x.meta) : '') + '</span></span>' + icon('arrowRight', 'width="18" height="18"') + '</button></li>';
          }).join('') + '</ul>' : '<p class="hint pad">Tidak ada hasil untuk "' + esc(text) + '".</p>';
          $$('[data-i]', $('#gs-res')).forEach(function (b) {
            b.addEventListener('click', function () {
              var x = r.results[Number(b.getAttribute('data-i'))];
              MC.closeOverlay();
              if (x.type === 'PROJECT') location.hash = '#/projects/' + encodeURIComponent(x.id);
              else if (x.type === 'TASK') MC.openTask(x.id, function () { MC.route(); });
              else if (x.type === 'ACTIVITY') location.hash = '#/activity';
              else if (x.type === 'ASSET') location.hash = '#/assets';
              else if (x.type === 'REPORT') location.hash = '#/reports/' + encodeURIComponent(x.id);
            });
          });
        }, function (e) { if ($('#gs-res')) $('#gs-res').innerHTML = '<div class="alert alert-error">' + icon('alert') + '<div>' + esc(e.message) + '</div></div>'; });
      }, 250);
    });
  }

  document.getElementById('btn-search').addEventListener('click', openSearch);
  MC.openSearch = openSearch;

  MC.boot();
})(window.MC);
