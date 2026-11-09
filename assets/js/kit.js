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
  var thumbCache = {};
  /** Muat thumbnail untuk elemen [data-thumb] di dalam root, 12 per panggilan. */
  MC.loadThumbs = function (root) {
    var els = $$('[data-thumb]:not([data-thumb-done])', root);
    var need = [];
    els.forEach(function (el) {
      var id = el.getAttribute('data-thumb');
      if (Object.prototype.hasOwnProperty.call(thumbCache, id)) apply(el, thumbCache[id]);
      else if (need.indexOf(id) < 0) need.push(id);
    });
    function apply(el, url) {
      el.setAttribute('data-thumb-done', '1');
      if (MC.safeImg(url) || /^data:image\/gif;base64,/.test(url)) {
        el.innerHTML = '<img src="' + url + '" alt="" loading="lazy">';
        el.classList.add('has-img');
      }
    }
    for (var i = 0; i < need.length; i += 12) {
      (function (ids) {
        MC.api('assets.thumbs', { ids: ids }).then(function (map) {
          ids.forEach(function (id) { thumbCache[id] = map[id] || ''; });
          $$('[data-thumb]:not([data-thumb-done])', root).forEach(function (el) {
            var id = el.getAttribute('data-thumb');
            if (Object.prototype.hasOwnProperty.call(thumbCache, id)) apply(el, thumbCache[id]);
          });
        }, function () { /* thumbnail opsional */ });
      })(need.slice(i, i + 12));
    }
  };
  MC.forgetThumb = function (id) { delete thumbCache[id]; };

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
      '<button class="asset-thumb" type="button" data-asset-open="' + esc(a.assetId) + '" aria-label="Lihat ' + esc(a.fileName) + '" data-thumb="' + (a.fileType === 'IMAGE' ? esc(a.assetId) : '') + '">' +
      '<span class="ft-ico">' + MC.fileIcon(a.fileType) + '</span></button>' +
      '<div class="asset-info"><div class="asset-name" title="' + esc(a.fileName) + '">' + esc(a.fileName) + '</div>' +
      '<div class="asset-meta">' + esc(FT_LABEL[a.fileType] || 'File') + (a.sizeBytes ? ' · ' + MC.fmtSize(a.sizeBytes) : '') + (a.source === 'LINK' ? ' · ' + icon('link', 'width="12" height="12"') + 'Drive' : '') + '</div>' +
      (a.projectName ? '<div class="asset-meta">' + icon('folder', 'width="12" height="12"') + esc(a.projectName) + '</div>' : '') +
      (opts.exec ? '' : '<div class="asset-badges">' + MC.visBadge(a.visibility) + (a.stage === 'FINAL' ? '<span class="badge badge-success">' + icon('star') + 'Final</span>' : '') + '</div>') +
      '</div></article>';
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
      '<span class="tr-meta">' + (t.standalone ? '<span class="badge badge-neutral">Mandiri</span>' : (t.projectName ? '<span class="tr-proj">' + icon('folder', 'width="12" height="12"') + esc(t.projectName) + '</span>' : '')) +
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
