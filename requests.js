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
