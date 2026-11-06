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
      '<div class="drawer-body" id="td-body">' + MC.loadingBox(200) + '</div>', { drawer: true });
    var close = function () { MC.closeOverlay(); if (changed && onChange) onChange(); };
    $('[data-close]', ov).addEventListener('click', close);
    ov.addEventListener('keydown', function (e) { if (e.key === 'Escape' && changed && onChange) setTimeout(onChange, 0); });
    ov.addEventListener('click', function (e) { if (e.target === ov && changed && onChange) setTimeout(onChange, 0); });

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
      var body = $('#td-body');
      if (!body) return;
      body.innerHTML =
        '<div class="td-title"><h3>' + esc(t.title) + '</h3><div class="td-badges">' + MC.statusBadge(t.status) + MC.priorityBadge(t.priority) + MC.visBadge(t.visibility) +
        (t.standalone ? '<span class="badge badge-neutral">Mandiri</span>' : '') + '</div>' +
        (t.projectName ? '<a class="td-proj" href="#/projects/' + encodeURIComponent(t.projectId) + '">' + icon('folder', 'width="14" height="14"') + esc(t.projectName) + '</a>' : '') + '</div>' +
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
        '<div class="td-section"><h4>Bukti kerja (' + d.assets.length + ')</h4>' + (d.assets.length ? MC.assetGrid(d.assets) : '<p class="hint">Belum ada file. Unggah hasil kerja agar bisa dilihat atasan & masuk portofolio.</p>') + '</div>' +
        '<div class="td-section"><h4>Aktivitas (' + d.activities.length + ')</h4>' + (d.activities.length ? '<ul class="act-list">' + d.activities.map(function (a) { return MC.activityRow(a, { showDate: true }); }).join('') + '</ul>' : '<p class="hint">Belum ada aktivitas untuk tugas ini.</p>') + '</div>';

      MC.bindSegmented(body, 'st', function (v) { update({ status: v }, v === 'DONE' ? 'Tugas selesai. Kerja bagus!' : 'Status diperbarui.'); });
      var r = $('#td-prog'), out = r.nextElementSibling, deb;
      r.addEventListener('input', function () { out.textContent = r.value + '%'; });
      r.addEventListener('change', function () { clearTimeout(deb); deb = setTimeout(function () { update({ progress: Number(r.value) }, 'Progres disimpan.'); }, 150); });
      $('#td-block-save').addEventListener('click', function () { update({ blockerNote: $('#td-block').value }, 'Kendala disimpan.'); });
      $('#td-log').addEventListener('click', function () { activityForm(null, { taskId: t.taskId, projectId: t.projectId, title: t.title }, function () { changed = true; MC.openTaskAgain(); }); });
      $('#td-up').addEventListener('click', function () { MC.uploadDialog({ taskId: t.taskId, projectId: t.projectId, label: t.title }, function () { changed = true; MC.openTaskAgain(); }); });
      $('#td-edit').addEventListener('click', function () { taskForm(t, {}, function () { changed = true; MC.openTaskAgain(); }); });
      $('#td-del').addEventListener('click', function () {
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

  /* =================== Halaman Proyek =================== */
  var projFilter = 'ACTIVE';
  MC.PAGES.projects = function (main, sub, rest) {
    if (sub) return projectDetail(main, sub, rest[0] || 'tasks');
    main.innerHTML = '<div class="page">' + MC.pageHead('Workspace', 'Proyek', 'Pekerjaan besar seperti campaign, dokumentasi acara, atau produksi video.',
      '<button class="btn btn-primary" type="button" id="new-proj">' + icon('plus') + 'Proyek baru</button>') +
      '<div class="toolbar">' + MC.segmented('pf', [['ACTIVE', 'Aktif'], ['DONE', 'Selesai'], ['ARCHIVED', 'Arsip'], ['', 'Semua']], projFilter, 'Filter status proyek') +
      '<div class="search-field">' + icon('search') + '<input class="input" type="search" id="proj-q" placeholder="Cari proyek…" aria-label="Cari proyek"></div></div>' +
      '<div id="proj-list">' + MC.loadingBox(180) + '</div></div>';
    $('#new-proj').addEventListener('click', function () { MC.create('project'); });
    var q = $('#proj-q'), deb;
    function load() {
      MC.api('projects.list', { status: projFilter, q: q.value }).then(function (items) {
        if (!MC.stillOn('projects')) return;
        $('#proj-list').innerHTML = items.length ? '<div class="project-grid">' + items.map(function (p) { return MC.projectCard(p, '#/projects/' + encodeURIComponent(p.projectId)); }).join('') + '</div>'
          : '<div class="card card-pad">' + MC.emptyState('folder', q.value ? 'Tidak ada proyek yang cocok' : 'Belum ada proyek di sini',
            q.value ? 'Coba kata kunci lain.' : 'Buat proyek untuk mengelompokkan tugas, file, dan aktivitas.',
            q.value ? '' : '<button class="btn btn-primary" type="button" id="empty-new">' + icon('plus') + 'Buat proyek</button>') + '</div>';
        var en = $('#empty-new'); if (en) en.addEventListener('click', function () { MC.create('project'); });
      }, function (e) { MC.errorState($('#proj-list'), e, load); });
    }
    MC.bindSegmented(main, 'pf', function (v) { projFilter = v; load(); });
    q.addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(function () { if (document.body.contains(q)) load(); }, 250); });
    load();
  };

  function projectDetail(main, id, tab) {
    MC.skeletonPage(main);
    MC.api('projects.get', { projectId: id }).then(function (d) {
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
  var FILTERS = [['open', 'Terbuka'], ['today', 'Hari ini'], ['overdue', 'Terlambat'], ['done', 'Selesai'], ['all', 'Semua']];
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
      MC.api('tasks.list', { projectId: TF.project }).then(function (items) { if (!MC.stillOn('tasks')) return; all = items; draw(); },
        function (e) { MC.errorState($('#task-body'), e, load); });
    }
    function matchesFilter(t, f) {
      var today = MC.todayKey();
      if (f === 'open') return ['TODO', 'IN_PROGRESS', 'REVIEW'].indexOf(t.status) >= 0;
      if (f === 'today') return ['TODO', 'IN_PROGRESS', 'REVIEW'].indexOf(t.status) >= 0 && (t.dueDate === today || t.plannedDate === today);
      if (f === 'overdue') return t.overdue;
      if (f === 'done') return t.status === 'DONE';
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
      MC.api('activities.list', { from: r.from, q: $('#act-q').value }).then(function (d) {
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
