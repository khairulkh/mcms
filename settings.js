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
