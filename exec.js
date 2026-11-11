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
