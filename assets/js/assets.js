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
