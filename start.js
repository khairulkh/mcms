/* =========================================================
   Pencarian global + memulai aplikasi (dimuat paling akhir).
   ========================================================= */
(function (MC) {
  'use strict';
  var $ = MC.$, $$ = MC.$$, esc = MC.esc, icon = MC.icon;
  var TYPE = { PROJECT: ['folder', 'Proyek'], TASK: ['tasks', 'Tugas'], ACTIVITY: ['activity', 'Aktivitas'], ASSET: ['image', 'File'], REPORT: ['report', 'Laporan'] };

  function openSearch() {
    var ov = MC.openOverlay('<div class="search-dlg"><div class="search-top">' + icon('search') +
      '<label class="sr-only" for="gs-q" id="dlg-title">Cari di MCMS</label><input class="input" id="gs-q" type="search" autocomplete="off" placeholder="Cari proyek, tugas, file, laporan, atau ID…" data-autofocus>' +
      '<button class="icon-btn" type="button" data-close aria-label="Tutup">' + icon('x') + '</button></div>' +
      '<div class="search-results" id="gs-res" role="region" aria-live="polite"><p class="hint pad">Ketik minimal 2 huruf.</p></div></div>', { wide: true });
    $('[data-close]', ov).addEventListener('click', MC.closeOverlay);
    var q = $('#gs-q'), deb, seq = 0;
    q.addEventListener('input', function () {
      clearTimeout(deb);
      deb = setTimeout(function () {
        var text = q.value.trim(), my = ++seq;
        if (text.length < 2) { $('#gs-res').innerHTML = '<p class="hint pad">Ketik minimal 2 huruf.</p>'; return; }
        $('#gs-res').innerHTML = '<p class="hint pad">Mencari…</p>';
        MC.api('search.global', { q: text }).then(function (r) {
          if (my !== seq || !$('#gs-res')) return;
          $('#gs-res').innerHTML = r.results.length ? '<ul class="sheet-list">' + r.results.map(function (x, i) {
            var t = TYPE[x.type] || ['file', x.type];
            return '<li><button class="sheet-item" type="button" data-i="' + i + '"><span class="dot-ico">' + icon(t[0]) + '</span><span class="grow"><span class="t">' + esc(x.title) + '</span>' +
              '<span class="d">' + esc(t[1]) + (x.meta ? ' · ' + esc(x.meta) : '') + '</span></span>' + icon('arrowRight', 'width="18" height="18"') + '</button></li>';
          }).join('') + '</ul>' : '<p class="hint pad">Tidak ada hasil untuk "' + esc(text) + '".</p>';
          $$('[data-i]', $('#gs-res')).forEach(function (b) {
            b.addEventListener('click', function () {
              var x = r.results[Number(b.getAttribute('data-i'))];
              MC.closeOverlay();
              if (x.type === 'PROJECT') location.hash = '#/projects/' + encodeURIComponent(x.id);
              else if (x.type === 'TASK') MC.openTask(x.id, function () { MC.route(); });
              else if (x.type === 'ACTIVITY') location.hash = '#/activity';
              else if (x.type === 'ASSET') location.hash = '#/assets';
              else if (x.type === 'REPORT') location.hash = '#/reports/' + encodeURIComponent(x.id);
            });
          });
        }, function (e) { if ($('#gs-res')) $('#gs-res').innerHTML = '<div class="alert alert-error">' + icon('alert') + '<div>' + esc(e.message) + '</div></div>'; });
      }, 250);
    });
  }

  document.getElementById('btn-search').addEventListener('click', openSearch);
  MC.openSearch = openSearch;

  MC.boot();
})(window.MC);
