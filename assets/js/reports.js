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
      MC.api('reports.list').then(function (items) {
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
      MC.api('exec.reports').then(function (items) {
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
