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
      return json.data;
    }, function (err) {
      // Coba ulang otomatis sekali untuk aksi baca saat jaringan bermasalah
      if (err instanceof ApiError && (err.code === 'NETWORK' || err.code === 'TIMEOUT') && attempt < 1 && READ_ACTIONS.indexOf(action) >= 0) {
        return new Promise(function (r) { setTimeout(r, 1200); }).then(function () { return api(action, payload, attempt + 1); });
      }
      throw err instanceof ApiError ? err : new ApiError('NETWORK', 'Tidak dapat terhubung ke server.');
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
    document.title = (b && b.appName) ? b.appName : 'MCMS — Media Center Workspace';
    var brand = $('#brand');
    [brand, $('#brand-side')].forEach(function (el) {
      if (el) { el.innerHTML = brandMarkup(b); el.setAttribute('aria-label', (b.appName || 'MCMS') + ' — ke beranda'); }
    });
  }

  function loadBranding() {
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
    store.set(STORE_KEY, res.session);
    var saved = store.get(modeKey());
    state.mode = res.me.modes.indexOf(saved) >= 0 ? saved : res.me.modes[0];
    enterApp();
  }

  function handleSessionExpired(message) {
    state.session = null; state.me = null;
    store.del(STORE_KEY);
    closeOverlay();
    renderLogin(message || 'Sesi berakhir. Silakan masuk kembali.');
  }

  function logout() {
    var done = function () {
      state.session = null; state.me = null; NAV_BADGE = {};
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
    executive: ['exec', 'exec-projects', 'exec-reports', 'exec-activity', '__more']
  };
  var SHORT = { overview: 'Beranda', tasks: 'Tugas', projects: 'Proyek', exec: 'Ringkasan', 'exec-projects': 'Proyek', 'exec-reports': 'Laporan', 'exec-activity': 'Aktivitas' };

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
      api('auth.me').then(function (me) {
        state.me = me;
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
    api: api, ApiError: ApiError, toast: toast, openOverlay: openOverlay, closeOverlay: closeOverlay,
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
