/* =========================================================
   MCMS — MODE DEMO
   Menjalankan KODE BACKEND ASLI (backend.bundle.js) di browser di atas simulator Google (gas-sim.js).
   Seluruh aturan (hak akses, visibilitas atasan, validasi, progres, laporan) sama persis dengan versi Google.
   Data contoh disimpan di browser ini saja (localStorage), tidak dikirim ke mana pun.
   ========================================================= */
(function () {
  'use strict';
  var KEY = 'mcms.demo.v2';
  var OWNER = 'pemilik.demo@gmail.com';
  var BOSS = 'kepala.sekolah.demo@gmail.com';
  var CLIENT_ID = 'demo-mcms.apps.googleusercontent.com';

  var sim = window.MCMSGasSim.createGasSim({ ownerEmail: OWNER });
  var B = window.MCMSBackendFactory(sim.globals);
  var storageOk = true;

  function pageUrl() { return location.href.split('#')[0]; }

  function day(offset) {
    var d = new Date(Date.now() + offset * 86400000);
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d); } catch (e) { return d.toISOString().slice(0, 10); }
  }

  function call(action, payload, token) {
    var out = B.doPost({ postData: { contents: JSON.stringify({ action: action, payload: payload || {}, token: token || '' }) } });
    B.Db.reset();
    return JSON.parse(out.getContent());
  }
  function must(r) { if (!r.success) throw new Error('Seed demo gagal: ' + r.message); return r.data; }

  /** Gambar contoh (bukan foto asli) dibuat dengan canvas agar Arsip punya pratinjau. */
  function sampleImage(label, c1, c2, w, h) {
    try {
      var cv = document.createElement('canvas');
      cv.width = w || 480; cv.height = h || 320;
      var g = cv.getContext('2d');
      var grd = g.createLinearGradient(0, 0, cv.width, cv.height);
      grd.addColorStop(0, c1); grd.addColorStop(1, c2);
      g.fillStyle = grd; g.fillRect(0, 0, cv.width, cv.height);
      g.globalAlpha = 0.18; g.fillStyle = '#fff';
      g.beginPath(); g.arc(cv.width * 0.82, cv.height * 0.2, cv.height * 0.35, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(cv.width * 0.1, cv.height * 0.95, cv.height * 0.45, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1; g.fillStyle = '#fff';
      g.font = 'bold ' + Math.round(cv.height / 9) + 'px Arial, sans-serif';
      g.fillText(label, cv.width * 0.07, cv.height * 0.58);
      g.font = Math.round(cv.height / 18) + 'px Arial, sans-serif';
      g.fillText('Contoh demo MCMS', cv.width * 0.07, cv.height * 0.72);
      return cv.toDataURL('image/jpeg', 0.82).split(',')[1];
    } catch (e) {
      return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }
  }

  function install() {
    B.SETUP_CONFIG.GOOGLE_CLIENT_ID = CLIENT_ID;
    B.SETUP_CONFIG.APP_URL = 'https://demo.mcms.local/';
    B.SETUP_CONFIG.OWNER_NAME = 'Pemilik Demo';
    B.setupMCMS();
    sim.state.props.APP_URL = pageUrl();
    B.Db.reset();
    seed();
  }

  function seed() {
    var o = must(call('auth.login', { idToken: sim.issueIdToken(OWNER, { name: 'Pemilik Demo' }) })).session.token;
    var api = function (a, p) { return must(call(a, p, o)); };

    api('branding.save', { appName: 'MCMS — Media Center Workspace', tagline: 'Manage work. Build impact.', organizationName: 'SMA Contoh Nusantara', logoMode: 'NONE' });

    // Atasan diundang & menerima undangan lewat alur asli
    var inv = api('users.invite', { email: BOSS, displayName: 'Bapak Kepala Sekolah' });
    var boss = must(call('auth.acceptInvite', { idToken: sim.issueIdToken(BOSS, { name: 'Bapak Kepala Sekolah' }), inviteToken: inv.inviteLink.split('#invite=')[1] })).session.token;

    var p1 = api('projects.create', { name: 'Campaign Mondok Itu Seru', categoryId: 'CAT-004', priority: 'HIGH', startDate: day(-14), dueDate: day(9),
      description: 'Rangkaian konten Instagram & TikTok untuk promosi program pondok.', objective: 'Meningkatkan minat pendaftar program pondok 20%.' }).project.projectId;
    var p2 = api('projects.create', { name: 'Dokumentasi Wisuda Angkatan 12', categoryId: 'CAT-005', priority: 'URGENT', startDate: day(-10), dueDate: day(-2),
      description: 'Foto & video prosesi wisuda, album digital untuk orang tua.' }).project.projectId;
    var p3 = api('projects.create', { name: 'Konten PPDB 2027', categoryId: 'CAT-001', status: 'PLANNING', startDate: day(3), dueDate: day(30),
      sharedWithSupervisor: false, description: 'Masih tahap ide — belum dibagikan ke atasan.' }).project.projectId;
    var p4 = api('projects.create', { name: 'Video Profil Sekolah', categoryId: 'CAT-002', startDate: day(-40), dueDate: day(-12) }).project.projectId;

    function task(p) { return api('tasks.create', p).taskId; }
    var t = {};
    t.riset = task({ projectId: p1, title: 'Riset referensi & moodboard', weight: 1, status: 'DONE' });
    t.c1 = task({ projectId: p1, title: 'Desain carousel #1 — Hari pertama di pondok', weight: 2, status: 'DONE' });
    t.c2 = task({ projectId: p1, title: 'Desain carousel #2 — Kegiatan santri', weight: 2, status: 'DONE' });
    t.c3 = task({ projectId: p1, title: 'Desain carousel #3 — Testimoni alumni', weight: 2, progress: 60, dueDate: day(0), priority: 'HIGH' });
    t.teaser = task({ projectId: p1, title: 'Video teaser 30 detik', weight: 3, dueDate: day(4), priority: 'HIGH' });
    t.caption = task({ projectId: p1, title: 'Caption & jadwal posting', weight: 1, dueDate: day(6) });
    t.prosesi = task({ projectId: p2, title: 'Foto prosesi wisuda', weight: 2, status: 'DONE' });
    t.highlight = task({ projectId: p2, title: 'Edit video highlight wisuda', weight: 3, status: 'REVIEW', progress: 80, dueDate: day(-2),
      blockerNote: 'Menunggu musik latar yang disetujui panitia.' });
    t.album = task({ projectId: p2, title: 'Album digital untuk orang tua', weight: 2, progress: 40, dueDate: day(1) });
    task({ projectId: p3, title: 'Copywriting caption PPDB', dueDate: day(5) });
    task({ projectId: p3, title: 'Moodboard visual PPDB', dueDate: day(8) });
    task({ projectId: p4, title: 'Naskah & storyboard', status: 'DONE' });
    task({ projectId: p4, title: 'Syuting & editing', status: 'DONE', weight: 3 });
    api('projects.update', { projectId: p4, status: 'DONE' });
    t.upacara = task({ title: 'Foto upacara hari Senin', dueDate: day(0), priority: 'MEDIUM' });
    task({ title: 'Poster lomba kebersihan kelas', dueDate: day(5), categoryId: 'CAT-001' });
    task({ title: 'Banner HUT sekolah', progress: 30, dueDate: day(12), categoryId: 'CAT-001' });

    // Sebar tanggal selesai ke beberapa hari terakhir agar grafik minggu ini terlihat hidup
    var spread = [[t.riset, -6], [t.c1, -4], [t.c2, -2], [t.prosesi, -5]];
    B.Db.withLock(function () {
      spread.forEach(function (x) { B.Db.update('TASKS', 'task_id', x[0], { completed_at: new Date(Date.now() + x[1] * 86400000) }); });
    });

    function act(p) { return api('activities.create', p).activityId; }
    act({ title: 'Liputan kunjungan Dinas Pendidikan', date: day(0), durationMinutes: 150, result: '48 foto terarsip', categoryId: 'CAT-005' });
    act({ title: 'Desain carousel #3 slide 1–4', taskId: t.c3, date: day(0), durationMinutes: 120, result: 'Draft 4 slide' });
    act({ title: 'Belajar teknik color grading', date: day(-1), durationMinutes: 60, result: 'Catatan pribadi', sharedWithSupervisor: false });
    act({ title: 'Upload carousel #2 Mondok Itu Seru', taskId: t.c2, date: day(-2), durationMinutes: 30, result: 'Dipublikasikan, 1.240 jangkauan' });
    act({ title: 'Rapat koordinasi OSIS — pentas seni', date: day(-2), durationMinutes: 45, result: 'Brief video pentas seni' });
    act({ title: 'Edit video highlight wisuda (rough cut)', taskId: t.highlight, date: day(-3), durationMinutes: 210, result: 'Rough cut 3 menit',
      blockerNote: 'Menunggu musik latar dari panitia' });
    act({ title: 'Seleksi foto prosesi wisuda', taskId: t.prosesi, date: day(-5), durationMinutes: 180, result: '320 foto terpilih' });
    act({ title: 'Riset referensi konten pesantren', taskId: t.riset, date: day(-6), durationMinutes: 90, result: 'Moodboard 24 referensi' });

    api('assets.upload', { fileName: 'carousel-1-hari-pertama.jpg', mimeType: 'image/jpeg', dataBase64: sampleImage('Carousel #1', '#7868ED', '#4A3BB8'), taskId: t.c1, stage: 'FINAL' });
    api('assets.upload', { fileName: 'carousel-2-kegiatan-santri.jpg', mimeType: 'image/jpeg', dataBase64: sampleImage('Carousel #2', '#36A99B', '#1F7A6F'), taskId: t.c2, stage: 'FINAL' });
    api('assets.upload', { fileName: 'carousel-3-draft.jpg', mimeType: 'image/jpeg', dataBase64: sampleImage('Draft #3', '#E9A64D', '#B97A1E'), taskId: t.c3, stage: 'WORKING', sharedWithSupervisor: false });
    api('assets.upload', { fileName: 'wisuda-prosesi-001.jpg', mimeType: 'image/jpeg', dataBase64: sampleImage('Wisuda 2026', '#5B8DEF', '#2F5FB3'), taskId: t.prosesi, stage: 'FINAL' });
    api('assets.upload', { fileName: 'kunjungan-dinas.jpg', mimeType: 'image/jpeg', dataBase64: sampleImage('Kunjungan Dinas', '#E36D79', '#B23A48') });

    var rep = api('reports.generate', { type: 'WEEKLY', date: day(-7), summaryNote: 'Fokus minggu lalu: produksi carousel campaign dan dokumentasi wisuda.', nextPlan: 'Menyelesaikan video teaser dan album digital.' });
    api('reports.publish', { reportId: rep.reportId });

    must(call('reviews.create', { entityType: 'PROJECT', entityId: p1, comment: 'Carousel #2 bagus sekali, warnanya konsisten. Lanjutkan untuk teaser.', rating: 5 }, boss));
    must(call('auth.logout', {}, o));
    must(call('auth.logout', {}, boss));
    sim.state.props.APP_URL = pageUrl();
  }

  var timer = null;
  function persist() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      try { localStorage.setItem(KEY, sim.serialize()); storageOk = true; }
      catch (e) { storageOk = false; }
    }, 150);
  }

  // Muat data tersimpan atau buat data contoh baru
  var restored = false;
  try { var raw = localStorage.getItem(KEY); if (raw) restored = sim.restore(raw); } catch (e) { restored = false; }
  if (!restored) { install(); persist(); }
  sim.state.props.APP_URL = pageUrl();

  /** Login demo: tombol "Masuk sebagai …" menerbitkan ID token simulasi untuk akun demo. */
  function translate(req) {
    var p = req.payload || {};
    if (req.action === 'auth.login' && p.demoRole) {
      var email = p.demoRole === 'SUPERVISOR' ? BOSS : OWNER;
      var row = B.Db.find('USERS', function (u) { return u.role === p.demoRole; })[0];
      if (row) email = row.email;
      B.Db.reset();
      req.payload = { idToken: sim.issueIdToken(email, { name: row ? row.display_name : '' }) };
    }
    if (req.action === 'auth.acceptInvite' && p.idToken === 'demo') {
      var hash = /^[a-f0-9]{64}$/.test(String(p.inviteToken || '')) ? B.U.sha256(p.inviteToken) : '';
      var inv = hash ? B.Db.findOne('USERS', 'invite_token_hash', hash) : null;
      B.Db.reset();
      req.payload = { inviteToken: p.inviteToken, idToken: sim.issueIdToken(inv ? inv.email : 'tamu.demo@gmail.com') };
    }
    return req;
  }

  window.MCMSDemo = {
    call: function (body) {
      var req = translate(JSON.parse(body));
      return new Promise(function (resolve) {
        setTimeout(function () {
          var out;
          try { out = JSON.parse(B.doPost({ postData: { contents: JSON.stringify(req) } }).getContent()); }
          catch (e) { out = { success: false, data: null, message: 'Kesalahan demo: ' + e.message, errorCode: 'INTERNAL' }; }
          B.Db.reset();
          persist();
          resolve(out);
        }, 120 + Math.random() * 180);
      });
    },
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) { /* abaikan */ } },
    storageOk: function () { return storageOk; },
    accounts: { owner: OWNER, supervisor: BOSS }
  };
})();
