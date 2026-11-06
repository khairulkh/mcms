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

  MC.PAGES.overview = function (main) {
    MC.skeletonPage(main);
    MC.api('dashboard.owner').then(function (d) {
      if (!MC.stillOn('overview')) return;
      var s = d.stats, st = d.setup, me = MC.state.me;
      MC.setNavBadge('feedback', s.feedbackOpen);
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
        '</div><div class="stack">' +
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
      $$('[data-setup-act]', main).forEach(function (b) { b.addEventListener('click', function () { MC.create(b.getAttribute('data-setup-act'), reload); }); });
      MC.focusHeading();
    }, function (err) { MC.errorState(main, err, function () { MC.PAGES.overview(main); }); });
  };

  /* ---------------- Mode Atasan ---------------- */
  MC.PAGES.exec = function (main) {
    MC.skeletonPage(main);
    MC.api('dashboard.executive').then(function (d) {
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
