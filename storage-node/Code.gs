/**
 * MCMS — Simpul Penyimpanan (dipasang di akun Google LAIN yang Drive-nya masih kosong).
 *
 * Cara pasang (sekitar 5 menit):
 *  1. Masuk ke akun Google yang Drive-nya kosong, buka https://script.google.com, klik "Project baru".
 *  2. Ganti isi Code.gs dengan seluruh file ini. Simpan.
 *  3. Pilih fungsi siapkanPenyimpanan, klik Jalankan, izinkan aksesnya.
 *     Buka "Log eksekusi": salin KODE RAHASIA yang tampil.
 *  4. Terapkan > Deployment baru > jenis "Aplikasi web":
 *       Jalankan sebagai: Saya     Siapa yang memiliki akses: Siapa saja
 *     Salin URL aplikasi web (berakhiran /exec).
 *  5. Di MCMS: Pengaturan > Penyimpanan > Tambah penyimpanan, tempel URL dan kode rahasia, lalu "Jadikan aktif".
 *
 * Memperbarui simpul lama (untuk unggah file besar): ganti isi Code.gs dengan file ini, simpan, jalankan
 * siapkanPenyimpanan sekali (izinkan akses baru "terhubung ke layanan eksternal"), lalu
 * Terapkan > Kelola deployment > Edit > Versi baru. URL dan kode rahasia tetap sama.
 *
 * Simpul ini hanya membuat file di dalam folder "MCMS Penyimpanan" miliknya, dan hanya menerima
 * permintaan yang membawa kode rahasia. Folder itu otomatis dibagikan (Editor) ke akun pemilik MCMS.
 */
var NODE_VERSION = '1.2.0';
var MAX_BYTES = 12 * 1024 * 1024;

function props_() { return PropertiesService.getScriptProperties(); }

function siapkanPenyimpanan() {
  var p = props_();
  if (!p.getProperty('NODE_SECRET')) {
    p.setProperty('NODE_SECRET', Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''));
  }
  var root = root_();
  Logger.log('Akun penyimpanan : ' + Session.getEffectiveUser().getEmail());
  Logger.log('Folder           : ' + root.getUrl());
  Logger.log('Sisa kuota       : ' + Math.round((DriveApp.getStorageLimit() - DriveApp.getStorageUsed()) / 1048576) + ' MB');
  Logger.log('KODE RAHASIA     : ' + p.getProperty('NODE_SECRET'));
  Logger.log('Langkah berikut  : Terapkan > Deployment baru > Aplikasi web (Jalankan sebagai: Saya, Akses: Siapa saja).');
}

/** Ganti kode rahasia (bila pernah bocor). Setelah itu perbarui di MCMS: hapus lalu tambah ulang penyimpanan ini. */
function gantiKodeRahasia() {
  props_().deleteProperty('NODE_SECRET');
  siapkanPenyimpanan();
}

function root_() {
  var p = props_();
  var id = p.getProperty('NODE_ROOT_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* folder terhapus: buat ulang */ } }
  var f = DriveApp.createFolder('MCMS Penyimpanan');
  p.setProperty('NODE_ROOT_ID', f.getId());
  p.deleteProperty('SHARED_WITH');
  return f;
}

function folderAt_(names) {
  var f = root_();
  (names || []).forEach(function (raw) {
    var n = String(raw || '').replace(/[\\/]+/g, ' ').trim().slice(0, 100);
    if (!n) return;
    var it = f.getFoldersByName(n);
    f = it.hasNext() ? it.next() : f.createFolder(n);
  });
  return f;
}

function sameSecret_(a, b) {
  a = String(a || ''); b = String(b || '');
  if (!a || !b || a.length !== b.length) return false;
  var d = 0;
  for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doGet() { return json_({ ok: true, app: 'MCMS Penyimpanan', version: NODE_VERSION }); }

function doPost(e) {
  try {
    var b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var secret = props_().getProperty('NODE_SECRET');
    if (!secret) return json_({ ok: false, error: 'Simpul belum disiapkan. Jalankan siapkanPenyimpanan() di editor.' });
    if (!sameSecret_(b.secret, secret)) return json_({ ok: false, error: 'Kode rahasia salah.' });
    switch (b.op) {
      case 'info': return json_(info_(b));
      case 'put': return json_(put_(b));
      case 'copy': return json_(copy_(b));
      case 'list': return json_(list_(b));
      case 'upStart': return json_(upStart_(b));
      default: return json_({ ok: false, error: 'Perintah tidak dikenal.' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err).slice(0, 300) });
  }
}

function info_(b) {
  var root = root_();
  var owner = String(b.ownerEmail || '').toLowerCase();
  var p = props_();
  if (owner && /^[^@\s]+@[^@\s]+$/.test(owner) && p.getProperty('SHARED_WITH') !== owner) {
    root.addEditor(owner);
    p.setProperty('SHARED_WITH', owner);
  }
  return {
    ok: true, version: NODE_VERSION, email: Session.getEffectiveUser().getEmail(),
    used: Number(DriveApp.getStorageUsed()) || 0, limit: Number(DriveApp.getStorageLimit()) || 0, rootId: root.getId()
  };
}

function put_(b) {
  var data = String(b.data || '');
  if (!data || !/^[A-Za-z0-9+/=]+$/.test(data)) return { ok: false, error: 'Isi file kosong atau rusak.' };
  var bytes = Utilities.base64Decode(data);
  if (bytes.length > MAX_BYTES) return { ok: false, error: 'File terlalu besar.' };
  var name = String(b.name || 'file').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 150);
  var f = folderAt_(b.path).createFile(Utilities.newBlob(bytes, String(b.mime || 'application/octet-stream'), name));
  return { ok: true, id: f.getId() };
}

function copy_(b) {
  var src = DriveApp.getFileById(String(b.fileId || ''));
  var c = src.makeCopy(String(b.name || 'Salinan').slice(0, 150), folderAt_(b.path));
  return { ok: true, id: c.getId(), url: c.getUrl() };
}

/**
 * Membuka sesi unggah bertahap (resumable) Google Drive untuk file besar. File dibuat oleh akun simpul ini
 * (memakai kuotanya). Backend MCMS lalu mengirim potongan file langsung ke URI sesi tersebut.
 */
function upStart_(b) {
  var size = Math.floor(Number(b.size) || 0);
  if (size <= 0) return { ok: false, error: 'Ukuran file tidak valid.' };
  var name = String(b.name || 'file').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 150);
  var mime = String(b.mime || 'application/octet-stream');
  var res = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id', {
    method: 'post', contentType: 'application/json; charset=UTF-8', muteHttpExceptions: true, followRedirects: false,
    headers: originHeaders_({ Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Upload-Content-Type': mime, 'X-Upload-Content-Length': String(size) }, b.origin),
    payload: JSON.stringify({ name: name, mimeType: mime, parents: [folderAt_(b.path).getId()] })
  });
  var h = res.getAllHeaders() || {};
  var uri = '';
  for (var k in h) if (k.toLowerCase() === 'location') uri = String(h[k]);
  if (res.getResponseCode() !== 200 || !uri) {
    return { ok: false, error: res.getResponseCode() === 403 ? 'Drive simpul menolak unggahan (kuota penuh?).' : 'Sesi unggah tidak bisa dibuka (' + res.getResponseCode() + ').' };
  }
  return { ok: true, uri: uri };
}

/** Origin web MCMS di header pembuka sesi agar browser boleh mengirim potongan langsung (CORS). */
function originHeaders_(h, origin) {
  if (/^https:\/\/[A-Za-z0-9.-]+(:\d+)?$/.test(String(origin || ''))) h.Origin = origin;
  return h;
}

function list_(b) {
  var it = folderAt_(b.path).getFiles();
  var out = [];
  var max = Math.min(Number(b.max) || 50, 100);
  while (it.hasNext() && out.length < max) {
    var f = it.next();
    out.push({ name: f.getName(), url: f.getUrl(), createdAt: f.getDateCreated().toISOString() });
  }
  return { ok: true, files: out };
}
