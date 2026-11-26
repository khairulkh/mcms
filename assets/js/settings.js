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

  /* =========================================================
     Penyimpanan: ganti Google Drive tempat file baru disimpan,
     tanpa memindahkan atau mereset data.
     ========================================================= */
  function gb(b) {
    if (!b) return '0 GB';
    var g = b / 1073741824;
    return (g >= 10 ? Math.round(g) : Math.round(g * 10) / 10).toString().replace('.', ',') + ' GB';
  }

  MC.settingsStorage = function (body) {
    body.innerHTML = MC.loadingBox(200);
    MC.api('storage.list', {}).then(draw, function (e) { MC.errorState(body, e, function () { MC.settingsStorage(body); }); });

    function quota(it) {
      if (it.used === null || it.used === undefined || !it.limit) return '<span class="hint">Kuota tidak terbaca</span>';
      var pct = Math.min(100, Math.round(it.used / it.limit * 100));
      return '<div class="progress-row"><div class="progress' + (pct >= 90 ? ' progress-danger' : '') + '" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="Kuota terpakai">' +
        '<span style="width:' + pct + '%"></span></div><span class="pct">' + pct + '%</span></div>' +
        '<div class="hint">' + esc(gb(it.used)) + ' dari ' + esc(gb(it.limit)) + ' terpakai · sisa ' + esc(gb(Math.max(0, it.limit - it.used))) + '</div>';
    }

    function draw(d) {
      var activeItem = d.items.filter(function (x) { return x.active; })[0] || d.items[0];
      body.innerHTML = '<div class="grid grid-2">' +
        '<section class="card"><div class="card-head"><div><h2>Tempat penyimpanan file</h2><p>File baru disimpan di: <strong>' + esc(activeItem.label) + '</strong></p></div></div><div class="card-body flush"><ul class="list">' +
        d.items.map(function (it) {
          var acts = '';
          if (it.folderUrl && MC.safeHttps(it.folderUrl)) acts += '<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="' + esc(it.folderUrl) + '">' + icon('external') + 'Folder</a>';
          if (!it.active && it.online) acts += '<button class="btn btn-secondary btn-sm" type="button" data-act="' + esc(it.id) + '">' + icon('check') + 'Jadikan aktif</button>';
          if (!it.main && !it.active) acts += '<button class="btn btn-ghost btn-sm" type="button" data-del="' + esc(it.id) + '" aria-label="Hapus ' + esc(it.label) + ' dari daftar">' + icon('trash') + '</button>';
          return '<li class="list-item" style="align-items:flex-start;flex-wrap:wrap"><span class="dot-ico">' + icon(it.main ? 'folder' : 'database') + '</span>' +
            '<div class="main" style="min-width:200px"><div class="title">' + esc(it.label) + ' ' +
            (it.active ? '<span class="badge badge-success">' + icon('checkCircle') + 'Aktif</span>' : '') +
            (!it.online ? '<span class="badge badge-danger">Tidak terhubung</span>' : '') + '</div>' +
            '<div class="meta">' + esc(it.email || '—') + '</div>' +
            (it.online ? quota(it) : '<div class="hint">' + esc(it.error || 'Simpul tidak menjawab.') + '</div>') + '</div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap">' + acts + '</div></li>';
        }).join('') + '</ul></div></section>' +
        '<section class="card"><div class="card-head"><div><h2>Drive penuh? Tambah penyimpanan</h2><p>Gratis, pakai akun Google lain (15 GB)</p></div></div><div class="card-body">' +
        '<div class="alert alert-info" style="margin-bottom:14px">' + icon('shield') + '<div>Database dan isi web tidak direset. File lama tetap di tempatnya dan tetap bisa dibuka. Hanya file baru (unggahan, logo, PDF laporan, backup) yang masuk ke penyimpanan aktif.</div></div>' +
        '<ol class="steps-list" style="padding-left:20px;display:grid;gap:8px;margin:0 0 16px">' +
        '<li>Masuk ke akun Google yang Drive-nya masih kosong, buka <a href="https://script.google.com/home" target="_blank" rel="noopener">script.google.com</a>, klik <strong>Project baru</strong>.</li>' +
        '<li>Tempel skrip simpul penyimpanan (tombol di bawah), simpan.</li>' +
        '<li>Jalankan fungsi <code>siapkanPenyimpanan</code>, izinkan akses, lalu salin <strong>KODE RAHASIA</strong> dari Log eksekusi.</li>' +
        '<li><strong>Terapkan › Deployment baru › Aplikasi web</strong>: Jalankan sebagai <em>Saya</em>, akses <em>Siapa saja</em>. Salin URL-nya.</li>' +
        '<li>Klik <strong>Tambah penyimpanan</strong>, tempel URL dan kode rahasia, lalu <strong>Jadikan aktif</strong>.</li></ol>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-secondary" type="button" id="stg-copy">' + icon('copy') + 'Salin skrip simpul</button>' +
        '<button class="btn btn-primary" type="button" id="stg-add">' + icon('plus') + 'Tambah penyimpanan</button></div></div></section></div>';

      $('#stg-copy').addEventListener('click', function (e) {
        var btn = e.currentTarget;
        MC.setLoading(btn, true);
        fetch('storage-node/Code.gs', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(); return r.text(); })
          .then(function (txt) { return navigator.clipboard.writeText(txt); })
          .then(function () { MC.setLoading(btn, false); MC.toast('Skrip disalin. Tempel di Code.gs project baru.'); },
            function () { MC.setLoading(btn, false); window.open('storage-node/Code.gs', '_blank', 'noopener'); MC.toast('Skrip dibuka di tab baru. Salin seluruh isinya.'); });
      });
      $('#stg-add').addEventListener('click', addDialog);
      $$('[data-act]', body).forEach(function (b) {
        b.addEventListener('click', function () {
          var it = d.items.filter(function (x) { return x.id === b.getAttribute('data-act'); })[0];
          MC.confirmDialog({ title: 'Jadikan "' + it.label + '" aktif?', message: 'Mulai sekarang file baru disimpan di Drive ' + (it.email || it.label) + '. Data dan file lama tidak berubah.', confirmText: 'Jadikan aktif', icon: 'database' })
            .then(function (yes) {
              if (!yes) return;
              MC.setLoading(b, true);
              MC.api('storage.activate', { id: it.id }).then(function (nd) { MC.toast('File baru sekarang disimpan di ' + it.label + '.'); draw(nd); },
                function (er) { MC.setLoading(b, false); MC.toast(er.message, 'error'); });
            });
        });
      });
      $$('[data-del]', body).forEach(function (b) {
        b.addEventListener('click', function () {
          var it = d.items.filter(function (x) { return x.id === b.getAttribute('data-del'); })[0];
          MC.confirmDialog({ title: 'Hapus "' + it.label + '" dari daftar?', message: 'File yang sudah tersimpan di Drive itu tidak dihapus dan tetap bisa dibuka dari arsip. MCMS hanya berhenti memakai penyimpanan ini.', danger: true, confirmText: 'Hapus dari daftar', icon: 'trash' })
            .then(function (yes) {
              if (!yes) return;
              MC.api('storage.remove', { id: it.id }).then(function (nd) { MC.toast('Penyimpanan dihapus dari daftar.'); draw(nd); }, function (er) { MC.toast(er.message, 'error'); });
            });
        });
      });
    }

    function addDialog() {
      MC.formDialog({
        title: 'Tambah penyimpanan', icon: 'database', submitText: 'Hubungkan', submitIcon: 'link',
        sub: 'Pakai akun Google lain yang Drive-nya masih kosong.',
        body: MC.field({ name: 'label', label: 'Nama', required: true, maxlength: 40, placeholder: 'Contoh: Drive cadangan 2027', full: true }) +
          MC.field({ name: 'url', label: 'URL aplikasi web simpul', required: true, type: 'url', placeholder: 'https://script.google.com/macros/s/…/exec', full: true, autocomplete: 'off' }) +
          MC.field({ name: 'secret', label: 'Kode rahasia', required: true, type: 'password', full: true, autocomplete: 'off', hint: 'Dari Log eksekusi fungsi siapkanPenyimpanan. Disimpan di server, tidak ditampilkan lagi.' }),
        onSubmit: function (form) {
          var v = MC.validate(form, [['label', 'required', 'Nama minimal 2 karakter.', 2], ['url', 'required', 'Tempel URL aplikasi web.', 20], ['secret', 'required', 'Tempel kode rahasia.', 32]]);
          if (!v) return null;
          return MC.api('storage.add', v).then(function (d) { MC.closeOverlay(); MC.toast('Penyimpanan "' + v.label + '" terhubung. Klik "Jadikan aktif" untuk memakainya.'); draw(d); });
        }
      });
    }
  };
})(window.MC);
