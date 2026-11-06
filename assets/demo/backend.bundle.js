/* MCMS V1.0.0 — backend asli (dari folder backend/) untuk MODE DEMO di browser. File ini dibuat otomatis oleh tools/build.js. */
window.MCMSBackendFactory = function (G) {
  'use strict';
  var SpreadsheetApp = G.SpreadsheetApp;
  var DriveApp = G.DriveApp;
  var Utilities = G.Utilities;
  var PropertiesService = G.PropertiesService;
  var CacheService = G.CacheService;
  var LockService = G.LockService;
  var UrlFetchApp = G.UrlFetchApp;
  var MailApp = G.MailApp;
  var Session = G.Session;
  var ContentService = G.ContentService;
  var Logger = G.Logger;
  var console = G.console;

// ==================== Setup.gs ====================
/**
 * Setup.gs — instalasi & inisialisasi MCMS.
 *
 * LANGKAH: isi SETUP_CONFIG di bawah, lalu jalankan fungsi setupMCMS() dari editor Apps Script.
 * Aman dijalankan berulang (idempotent): tidak membuat sheet/folder ganda dan tidak menghapus data.
 */

var SETUP_CONFIG = {
  // Client ID dari Google Cloud Console → Credentials → OAuth client ID (Web application)
  GOOGLE_CLIENT_ID: 'TEMPEL_CLIENT_ID_DI_SINI.apps.googleusercontent.com',
  // Alamat frontend MCMS (GitHub Pages / Cloudflare Pages), diakhiri garis miring
  APP_URL: 'https://USERNAME.github.io/mcms/',
  // Zona waktu sekolah
  TIMEZONE: 'Asia/Jakarta',
  // Nama tampilan pemilik (opsional)
  OWNER_NAME: ''
};

/** Kolom yang tetap dibiarkan berformat otomatis (tanggal / angka). Selainnya dipaksa teks biasa. */
/* Kolom tanggal-saja (due_date, activity_date, …) disimpan sebagai teks 'yyyy-MM-dd' agar tidak bergeser zona waktu. */
var NON_TEXT_COLUMN = /(_at|_time|^timestamp|^progress|^weight|^size_bytes|^duration_minutes|^target|^rating|^sort_order|^revision_no|^year|^version)$/;

function setupMCMS() {
  var report = [];
  var cfg = SETUP_CONFIG;

  if (!cfg.GOOGLE_CLIENT_ID || cfg.GOOGLE_CLIENT_ID.indexOf('TEMPEL_') === 0 ||
      !/\.apps\.googleusercontent\.com$/.test(cfg.GOOGLE_CLIENT_ID)) {
    throw new Error('Isi SETUP_CONFIG.GOOGLE_CLIENT_ID dengan Client ID dari Google Cloud terlebih dahulu.');
  }
  if (!/^(https:\/\/.+|http:\/\/localhost(:\d+)?)\/$/.test(cfg.APP_URL) || cfg.APP_URL.indexOf('USERNAME') >= 0) {
    throw new Error('Isi SETUP_CONFIG.APP_URL dengan alamat frontend (https://..., diakhiri "/").');
  }

  var ownerEmail = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (!ownerEmail) throw new Error('Email pemilik tidak terbaca. Jalankan setupMCMS() langsung dari editor Apps Script.');

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    // 1. Folder Drive
    var root = setupDrive_(report);

    // 2. Spreadsheet database
    var ss = setupSpreadsheet_(root, report);

    // 3. Properti script (dipakai backend saat runtime)
    Props.setAll({
      SPREADSHEET_ID: ss.getId(),
      DRIVE_ROOT_ID: root.getId(),
      GOOGLE_CLIENT_ID: cfg.GOOGLE_CLIENT_ID,
      APP_URL: cfg.APP_URL,
      TIMEZONE: cfg.TIMEZONE || 'Asia/Jakarta',
      SCHEMA_VERSION: SCHEMA_VERSION
    });
    Db.reset();

    // 4. Sheet, header, format, dropdown
    setupSheets_(ss, report);
    Db.reset();

    // 5. CONFIG awal
    var existing = ConfigStore.getAll();
    DEFAULT_CONFIG.forEach(function (row) {
      if (!Object.prototype.hasOwnProperty.call(existing, row[0])) ConfigStore.set(row[0], row[1], row[2]);
    });
    ConfigStore.set('SCHEMA_VERSION', SCHEMA_VERSION);
    ConfigStore.set('SPREADSHEET_ID', ss.getId());
    ConfigStore.set('DRIVE_ROOT_ID', root.getId());
    ConfigStore.set('DRIVE_BRANDING_ID', Props.get('DRIVE_BRANDING_ID'));
    ConfigStore.set('TIMEZONE', cfg.TIMEZONE || 'Asia/Jakarta');

    // 6. Kategori awal
    if (Db.all('CATEGORIES').length === 0) {
      DEFAULT_CATEGORIES.forEach(function (c, i) {
        Db.insert('CATEGORIES', {
          category_id: 'CAT-' + ('00' + (i + 1)).slice(-3), name: c[0], type: c[1], color: c[2],
          is_active: true, sort_order: i + 1, created_at: U.now()
        });
      });
      report.push('Kategori awal dibuat.');
    }

    // 7. Akun OWNER
    var owners = Db.find('USERS', function (u) { return u.role === ROLES.OWNER; });
    if (owners.length === 0) {
      Db.insert('USERS', {
        user_id: U.newId('USR'), email: ownerEmail, display_name: cfg.OWNER_NAME || ownerEmail.split('@')[0],
        role: ROLES.OWNER, is_active: true, invitation_status: ACCOUNT_STATUS.ACTIVE, invite_token_hash: '',
        invited_by: '', invited_at: '', invitation_expires_at: '', accepted_at: U.now(), created_at: U.now(),
        last_login: '', photo_url: ''
      });
      report.push('Akun OWNER dibuat untuk ' + ownerEmail + '.');
    } else {
      report.push('Akun OWNER sudah ada (' + owners[0].email + ').');
    }

    Audit.log({ user_id: 'SYSTEM', email: ownerEmail }, 'SYSTEM_SETUP', 'SYSTEM', '', { version: SCHEMA_VERSION });
  } finally {
    lock.releaseLock();
  }

  var summary = 'MCMS siap.\n- ' + report.join('\n- ') +
    '\n\nSpreadsheet: ' + SpreadsheetApp.openById(Props.get('SPREADSHEET_ID')).getUrl() +
    '\nLangkah berikutnya: Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).';
  Logger.log(summary);
  return summary;
}

function setupDrive_(report) {
  var rootId = Props.get('DRIVE_ROOT_ID');
  var root = null;
  if (rootId) { try { root = DriveApp.getFolderById(rootId); } catch (e) { root = null; } }
  if (!root) {
    root = DriveApp.createFolder('MCMS');
    report.push('Folder Drive "MCMS" dibuat.');
  }
  var created = ensureFolders_(root, DRIVE_STRUCTURE);
  if (created) report.push(created + ' subfolder Drive dibuat.');
  var branding = root.getFoldersByName('00_BRANDING').next();
  Props.set('DRIVE_BRANDING_ID', branding.getId());
  return root;
}

function ensureFolders_(parent, tree) {
  var count = 0;
  Object.keys(tree).forEach(function (name) {
    var it = parent.getFoldersByName(name);
    var folder = it.hasNext() ? it.next() : null;
    if (!folder) { folder = parent.createFolder(name); count++; }
    count += ensureFolders_(folder, tree[name]);
  });
  return count;
}

function setupSpreadsheet_(root, report) {
  var id = Props.get('SPREADSHEET_ID');
  var ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create('MCMS Database');
    try { DriveApp.getFileById(ss.getId()).moveTo(root); } catch (e) { /* tetap di My Drive */ }
    report.push('Spreadsheet "MCMS Database" dibuat.');
  }
  return ss;
}

function setupSheets_(ss, report) {
  var names = Object.keys(SCHEMA);
  var createdCount = 0;
  names.forEach(function (name) {
    var headers = SCHEMA[name];
    var sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      createdCount++;
    }
    // Header: tambahkan kolom yang belum ada di ujung kanan; jangan pernah menghapus/mengurutkan ulang.
    var lastCol = Math.max(sh.getLastColumn(), 1);
    var current = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String).filter(function (h) { return h !== ''; });
    if (current.length === 0) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      current = headers.slice();
    } else {
      var missing = headers.filter(function (h) { return current.indexOf(h) < 0; });
      if (missing.length) {
        sh.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
        current = current.concat(missing);
        report.push(name + ': kolom baru ditambahkan (' + missing.join(', ') + ').');
      }
    }
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, current.length).setFontWeight('bold').setBackground('#EEECFD');

    // Format teks biasa untuk kolom non-tanggal/non-angka (mencegah token/ID berubah jadi angka atau tanggal)
    var maxRows = Math.max(sh.getMaxRows() - 1, 1);
    current.forEach(function (h, idx) {
      if (!NON_TEXT_COLUMN.test(h)) sh.getRange(2, idx + 1, maxRows, 1).setNumberFormat('@');
    });

    // Dropdown
    var drops = SCHEMA_DROPDOWNS[name] || {};
    Object.keys(drops).forEach(function (col) {
      var idx = current.indexOf(col);
      if (idx < 0) return;
      var rule = SpreadsheetApp.newDataValidation().requireValueInList(drops[col], true).setAllowInvalid(false).build();
      sh.getRange(2, idx + 1, maxRows, 1).setDataValidation(rule);
    });
  });

  // Hapus "Sheet1" bawaan jika kosong
  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Lembar1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);

  report.push(createdCount ? createdCount + ' sheet baru dibuat (total ' + names.length + ').' : 'Seluruh ' + names.length + ' sheet sudah tersedia.');
}

/** Utilitas: memeriksa kesehatan instalasi. Jalankan dari editor bila perlu. */
function checkMCMS() {
  var ss = SpreadsheetApp.openById(Props.get('SPREADSHEET_ID'));
  var missing = Object.keys(SCHEMA).filter(function (n) { return !ss.getSheetByName(n); });
  var msg = 'Sheet: ' + (Object.keys(SCHEMA).length - missing.length) + '/' + Object.keys(SCHEMA).length +
    (missing.length ? ' (hilang: ' + missing.join(', ') + ')' : ' lengkap') +
    '\nClient ID: ' + (Props.get('GOOGLE_CLIENT_ID') ? 'terisi' : 'KOSONG') +
    '\nAPP_URL: ' + Props.get('APP_URL');
  Logger.log(msg);
  return msg;
}

// ==================== Config.gs ====================
/**
 * MCMS — Media Center Management System
 * Config.gs — konstanta global dan skema database V1.0 (20 sheet).
 *
 * File ini TIDAK perlu diubah. Pengaturan instalasi ada di Setup.gs (SETUP_CONFIG).
 */

var MCMS_VERSION = '1.0.0';
var SCHEMA_VERSION = '1.0.0';

var SESSION_TTL_SECONDS = 21600;          // 6 jam (batas maksimum CacheService)
var INVITE_TTL_DAYS = 7;                  // masa berlaku undangan supervisor
var LOGO_MAX_BYTES = 70 * 1024;           // logo setelah dikompres di browser (agar muat di cache)
var MAX_REQUEST_CHARS = 15 * 1024 * 1024; // batas ukuran request API (upload 10 MB ≈ 13,4 juta karakter base64)
var UPLOAD_MAX_BYTES = 10 * 1024 * 1024;   // batas unggah file lewat aplikasi (video besar: tautkan dari Drive)
var SNAPSHOT_MAX_CHARS = 45000;           // batas isi sel Google Sheets ±50.000 karakter
var GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

var ROLES = { OWNER: 'OWNER', SUPERVISOR: 'SUPERVISOR', VIEWER: 'VIEWER' };
var ACCOUNT_STATUS = {
  INVITED: 'INVITED', ACTIVE: 'ACTIVE', EXPIRED: 'EXPIRED', REVOKED: 'REVOKED', SUSPENDED: 'SUSPENDED'
};
var VISIBILITY = { PRIVATE: 'PRIVATE', SUPERVISOR: 'SUPERVISOR', PORTFOLIO: 'PORTFOLIO' };
var LOGO_MODES = ['MEDIA', 'SCHOOL', 'BOTH', 'NONE'];

/** Skema 20 sheet. Urutan kolom = urutan header di spreadsheet. */
var SCHEMA = {
  CONFIG: ['key', 'value', 'description', 'updated_at'],
  USERS: ['user_id', 'email', 'display_name', 'role', 'is_active', 'invitation_status', 'invite_token_hash',
    'invited_by', 'invited_at', 'invitation_expires_at', 'accepted_at', 'created_at', 'last_login', 'photo_url'],
  CATEGORIES: ['category_id', 'name', 'type', 'color', 'is_active', 'sort_order', 'created_at'],
  PROJECTS: ['project_id', 'name', 'category_id', 'description', 'objective', 'status', 'priority', 'start_date',
    'due_date', 'completed_at', 'progress', 'drive_folder_id', 'thumbnail_asset_id', 'visibility', 'created_by',
    'created_at', 'updated_at', 'is_deleted'],
  TASKS: ['task_id', 'project_id', 'title', 'description', 'status', 'priority', 'weight', 'progress',
    'planned_date', 'due_date', 'completed_at', 'is_standalone', 'visibility', 'created_by', 'created_at',
    'updated_at', 'is_deleted', 'category_id', 'blocker_note', 'started_at'],
  CONTENTS: ['content_id', 'project_id', 'title', 'category_id', 'format', 'platform', 'status', 'brief',
    'publish_date', 'published_url', 'visibility', 'created_at', 'updated_at', 'is_deleted'],
  DELIVERABLES: ['deliverable_id', 'task_id', 'content_id', 'title', 'version', 'status', 'asset_id',
    'approved_at', 'visibility', 'created_at', 'updated_at'],
  REVISIONS: ['revision_id', 'content_id', 'deliverable_id', 'revision_no', 'notes', 'requested_by', 'status',
    'created_at', 'resolved_at'],
  ASSETS: ['asset_id', 'drive_file_id', 'file_name', 'mime_type', 'size_bytes', 'category', 'purpose',
    'visibility', 'uploaded_by', 'created_at', 'is_deleted', 'file_type', 'source', 'description', 'project_id',
    'shared_with', 'updated_at'],
  ASSET_LINKS: ['link_id', 'asset_id', 'entity_type', 'entity_id', 'relation', 'created_at'],
  ACTIVITY_LOG: ['activity_id', 'title', 'description', 'category_id', 'project_id', 'task_id', 'content_id',
    'result', 'activity_date', 'planned_date', 'visibility', 'created_by', 'created_at', 'duration_minutes',
    'blocker_note', 'updated_at', 'is_deleted'],
  TIME_LOG: ['time_id', 'task_id', 'project_id', 'start_time', 'end_time', 'duration_minutes', 'notes', 'created_at'],
  KPI_CONFIG: ['kpi_id', 'name', 'kpi_group', 'formula_key', 'target', 'unit', 'period', 'is_active', 'updated_at'],
  PORTFOLIO: ['portfolio_id', 'title', 'project_id', 'content_id', 'cover_asset_id', 'role', 'contribution',
    'challenge', 'solution', 'outcome', 'tools', 'skills', 'year', 'is_featured', 'visibility', 'created_at',
    'updated_at'],
  SKILLS: ['skill_id', 'name', 'category', 'level', 'description', 'created_at', 'updated_at'],
  SKILL_LOG: ['skill_log_id', 'skill_id', 'source_type', 'source_id', 'notes', 'log_date', 'created_at'],
  REPORTS: ['report_id', 'type', 'period_start', 'period_end', 'title', 'snapshot_json', 'drive_file_id', 'status',
    'generated_by', 'created_at', 'summary_note', 'next_plan', 'obstacles', 'include_private', 'published_at',
    'updated_at', 'is_deleted'],
  REVIEW_LOG: ['review_id', 'entity_type', 'entity_id', 'reviewer_id', 'rating', 'comment', 'status', 'created_at',
    'reviewer_name', 'entity_title', 'acknowledged_at'],
  FORM_INBOX: ['submission_id', 'idempotency_key', 'form_type', 'payload_json', 'status', 'processed_at', 'error',
    'created_at'],
  AUDIT_LOG: ['audit_id', 'timestamp', 'user_id', 'user_email', 'action', 'entity_type', 'entity_id', 'details_json']
};

/** Dropdown (data validation) per kolom. */
var SCHEMA_DROPDOWNS = {
  USERS: { role: ['OWNER', 'SUPERVISOR', 'VIEWER'], invitation_status: ['INVITED', 'ACTIVE', 'EXPIRED', 'REVOKED', 'SUSPENDED'] },
  PROJECTS: {
    status: ['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'DONE', 'ARCHIVED'],
    priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    visibility: ['PRIVATE', 'SUPERVISOR', 'PORTFOLIO']
  },
  TASKS: {
    status: ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED'],
    priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    visibility: ['PRIVATE', 'SUPERVISOR', 'PORTFOLIO']
  },
  CONTENTS: {
    status: ['IDEA', 'BRIEF', 'PRODUCTION', 'REVIEW', 'FINAL', 'PUBLISHED'],
    visibility: ['PRIVATE', 'SUPERVISOR', 'PORTFOLIO']
  },
  DELIVERABLES: { status: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'], visibility: ['PRIVATE', 'SUPERVISOR', 'PORTFOLIO'] },
  ASSETS: { visibility: ['PRIVATE', 'SUPERVISOR', 'PORTFOLIO'] },
  ACTIVITY_LOG: { visibility: ['PRIVATE', 'SUPERVISOR', 'PORTFOLIO'] },
  PORTFOLIO: { visibility: ['PRIVATE', 'SUPERVISOR', 'PORTFOLIO'] },
  REPORTS: { type: ['DAILY', 'WEEKLY', 'MONTHLY', 'PROJECT', 'ANNUAL'], status: ['DRAFT', 'PUBLISHED'] },
  REVIEW_LOG: { status: ['OPEN', 'ACKNOWLEDGED'] }
};

/** Nilai awal CONFIG (hanya ditambahkan jika key belum ada). */
var DEFAULT_CONFIG = [
  ['SCHEMA_VERSION', SCHEMA_VERSION, 'Versi skema database'],
  ['SPREADSHEET_ID', '', 'ID spreadsheet database'],
  ['DRIVE_ROOT_ID', '', 'ID folder utama MCMS di Google Drive'],
  ['DRIVE_BRANDING_ID', '', 'ID folder logo/branding'],
  ['TIMEZONE', 'Asia/Jakarta', 'Zona waktu aplikasi'],
  ['APP_NAME', 'MCMS — Media Center Workspace', 'Nama aplikasi di header'],
  ['APP_TAGLINE', 'Manage work. Build impact.', 'Slogan di halaman login'],
  ['ORGANIZATION_NAME', '', 'Nama sekolah / lembaga'],
  ['APP_LOGO_MODE', 'NONE', 'MEDIA / SCHOOL / BOTH / NONE'],
  ['APP_LOGO_PRIMARY_ID', '', 'ASSET ID logo Media Center (utama)'],
  ['APP_LOGO_SECONDARY_ID', '', 'ASSET ID logo sekolah (pendamping)'],
  ['APP_LOGO_ALT', 'Logo Media Center', 'Teks alternatif logo'],
  ['APP_BRANDING_UPDATED_AT', '', 'Waktu perubahan branding']
];

var DEFAULT_CATEGORIES = [
  ['Desain Grafis', 'WORK', '#7868ED'],
  ['Video & Motion', 'WORK', '#36A99B'],
  ['Fotografi', 'WORK', '#E9A64D'],
  ['Media Sosial', 'WORK', '#E36D79'],
  ['Dokumentasi Kegiatan', 'WORK', '#5B8DEF'],
  ['Administrasi', 'WORK', '#6B7280']
];

var DRIVE_STRUCTURE = {
  '00_BRANDING': {},
  '01_PROJECTS': {},
  '02_ASSET_LIBRARY': { PHOTO: {}, VIDEO: {}, DESIGN: {}, DOCUMENT: {} },
  '03_REPORTS': { DAILY: {}, WEEKLY: {}, MONTHLY: {} },
  '04_PORTFOLIO': {},
  '05_SYSTEM_BACKUP': {}
};

/** Enum modul kerja (dipakai validasi backend). */
var PROJECT_STATUS = ['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'DONE', 'ARCHIVED'];
var TASK_STATUS = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED'];
var PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
var ASSET_STAGES = ['BRIEF', 'WORKING', 'REVIEW', 'FINAL', 'EVIDENCE', 'OTHER'];
var REPORT_TYPES = ['DAILY', 'WEEKLY', 'MONTHLY'];
var REVIEW_ENTITIES = ['PROJECT', 'REPORT', 'GENERAL'];

/** Tipe MIME yang boleh diunggah (file yang bisa dieksekusi browser seperti HTML/JS diblokir). */
var UPLOAD_MIME_ALLOW = [
  /^image\/(png|jpeg|gif|webp|heic|heif)$/, /^video\//, /^audio\//, /^application\/pdf$/,
  /^application\/(zip|x-zip-compressed|x-rar-compressed|vnd\.rar)$/, /^text\/(plain|csv)$/,
  /^application\/(msword|vnd\.ms-excel|vnd\.ms-powerpoint)$/,
  /^application\/vnd\.openxmlformats-officedocument\./, /^application\/(postscript|illustrator|x-photoshop|vnd\.adobe\.photoshop)$/,
  /^image\/(vnd\.adobe\.photoshop|x-photoshop|tiff)$/
];

// ==================== Utils.gs ====================
/**
 * Utils.gs — error standar, properti, hashing, sanitasi, tanggal.
 */

/** Error yang aman ditampilkan ke pengguna. code dipakai frontend untuk membedakan jenis error. */
function AppError(code, message, details) {
  this.name = 'AppError';
  this.code = code;
  this.message = message;
  this.details = details || null;
}
AppError.prototype = Object.create(Error.prototype);
AppError.prototype.constructor = AppError;

var ERR = {
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION: 'VALIDATION',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INVALID_INVITE: 'INVALID_INVITE',
  INVITE_EXPIRED: 'INVITE_EXPIRED',
  NOT_INITIALIZED: 'NOT_INITIALIZED',
  BUSY: 'BUSY',
  INTERNAL: 'INTERNAL'
};

var Props = {
  get: function (key) { return PropertiesService.getScriptProperties().getProperty(key); },
  set: function (key, value) { PropertiesService.getScriptProperties().setProperty(key, String(value)); },
  setAll: function (obj) {
    var clean = {};
    Object.keys(obj).forEach(function (k) { clean[k] = String(obj[k]); });
    PropertiesService.getScriptProperties().setProperties(clean, false);
  }
};

var U = {
  now: function () { return new Date(); },

  /** SHA-256 hex. */
  sha256: function (text) {
    var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8);
    return bytes.map(function (b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
  },

  /** Token acak 64 karakter hex (2 × UUID v4 ≈ 244 bit acak). */
  randomToken: function () {
    return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  },

  newId: function (prefix) {
    var stamp = Utilities.formatDate(new Date(), 'UTC', 'yyMMdd');
    return prefix + '-' + stamp + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
  },

  /** Mencegah teks dibaca sebagai formula oleh Google Sheets (formula injection). */
  sanitizeCell: function (value) {
    if (value === null || value === undefined) return '';
    if (value instanceof Date || typeof value === 'number' || typeof value === 'boolean') return value;
    var s = String(value);
    if (/^[=+\-@\t\r]/.test(s)) return "'" + s;
    return s;
  },

  cleanText: function (value, maxLen) {
    var s = (value === null || value === undefined) ? '' : String(value);
    s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
    if (maxLen && s.length > maxLen) s = s.slice(0, maxLen);
    return s;
  },

  isEmail: function (email) {
    return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  },

  maskEmail: function (email) {
    var parts = String(email || '').split('@');
    if (parts.length !== 2) return '***';
    var name = parts[0];
    return name.slice(0, Math.min(2, name.length)) + '***@' + parts[1];
  },

  asDate: function (v) {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    var d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  },

  toIso: function (v) {
    var d = U.asDate(v);
    return d ? d.toISOString() : '';
  },

  isTrue: function (v) { return v === true || String(v).toUpperCase() === 'TRUE'; },

  timezone: function () { return Props.get('TIMEZONE') || 'Asia/Jakarta'; },

  /** 'yyyy-MM-dd' pada zona waktu aplikasi. Teks tanggal-saja dikembalikan apa adanya. */
  dayKey: function (v) {
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    var d = U.asDate(v);
    return d ? Utilities.formatDate(d, U.timezone(), 'yyyy-MM-dd') : '';
  },

  addDays: function (date, days) { return new Date(date.getTime() + days * 86400000); },

  /** Parse data URL gambar → {mime, bytes}. */
  parseImageDataUrl: function (dataUrl) {
    var m = /^data:(image\/(png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
    if (!m) throw new AppError(ERR.VALIDATION, 'Format logo tidak didukung. Gunakan PNG, JPG, WEBP, atau SVG.');
    var bytes = Utilities.base64Decode(m[3]);
    return { mime: m[1], bytes: bytes };
  },

  /** Memastikan isi file sesuai tipenya (magic bytes), bukan hanya label MIME. */
  checkImageSignature: function (mime, bytes) {
    var b = bytes.map(function (x) { return x < 0 ? x + 256 : x; });
    var ok = false;
    if (mime === 'image/png') ok = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
    if (mime === 'image/jpeg') ok = b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
    if (mime === 'image/webp') ok = b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
    if (!ok) throw new AppError(ERR.VALIDATION, 'File logo rusak atau bukan gambar yang valid.');
  }
};

/* ---------- Validasi input modul kerja ---------- */
U.today = function () { return U.dayKey(new Date()); };

/** Tanggal opsional 'yyyy-MM-dd' → string valid atau ''. Format salah → VALIDATION. */
U.dateOnly = function (v, label) {
  if (v === null || v === undefined || v === '') return '';
  var s = String(v).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new AppError(ERR.VALIDATION, (label || 'Tanggal') + ' tidak valid.');
  var d = new Date(s + 'T00:00:00Z');
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw new AppError(ERR.VALIDATION, (label || 'Tanggal') + ' tidak valid.');
  var y = Number(s.slice(0, 4));
  if (y < 2000 || y > 2100) throw new AppError(ERR.VALIDATION, (label || 'Tanggal') + ' di luar rentang yang wajar.');
  return s;
};

/** Teks wajib dengan panjang minimum/maksimum. */
U.required = function (v, label, min, max) {
  var s = U.cleanText(v, max || 200);
  if (s.length < (min || 1)) throw new AppError(ERR.VALIDATION, label + ' wajib diisi' + (min > 1 ? ' (minimal ' + min + ' karakter)' : '') + '.');
  return s;
};

U.oneOf = function (v, list, fallback, label) {
  if (v === null || v === undefined || v === '') return fallback;
  var s = String(v).toUpperCase();
  if (list.indexOf(s) < 0) throw new AppError(ERR.VALIDATION, (label || 'Pilihan') + ' tidak valid.');
  return s;
};

U.intRange = function (v, min, max, fallback, label) {
  if (v === null || v === undefined || v === '') return fallback;
  var n = Number(v);
  if (!isFinite(n) || Math.floor(n) !== n || n < min || n > max) {
    throw new AppError(ERR.VALIDATION, (label || 'Angka') + ' harus bilangan bulat ' + min + '–' + max + '.');
  }
  return n;
};

U.has = function (obj, key) { return obj && Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined; };

/** Visibilitas dari payload: boolean sharedWithSupervisor atau string visibility. */
U.visibility = function (p, fallback) {
  if (U.has(p, 'sharedWithSupervisor')) return p.sharedWithSupervisor ? VISIBILITY.SUPERVISOR : VISIBILITY.PRIVATE;
  if (U.has(p, 'visibility')) return U.oneOf(p.visibility, ['PRIVATE', 'SUPERVISOR', 'PORTFOLIO'], fallback, 'Visibilitas');
  return fallback;
};

U.escapeHtml = function (s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};

U.matches = function (q, fields) {
  if (!q) return true;
  var hay = fields.map(function (f) { return String(f || '').toLowerCase(); }).join(' ');
  return String(q).toLowerCase().split(/\s+/).filter(String).every(function (w) { return hay.indexOf(w) >= 0; });
};

// ==================== Database.gs ====================
/**
 * Database.gs — akses Google Sheets sebagai database.
 * - Satu kali baca per sheet per request (memo per eksekusi).
 * - Tulis per baris dengan setValues (batch), sanitasi formula.
 * - Semua penulisan dijalankan di dalam Db.withLock oleh Router.
 */
var Db = (function () {
  var _ss = null;
  var _memo = {};

  function spreadsheet() {
    if (_ss) return _ss;
    var id = Props.get('SPREADSHEET_ID');
    if (!id) throw new AppError(ERR.NOT_INITIALIZED, 'Sistem belum diinisialisasi. Jalankan setupMCMS() di editor Apps Script.');
    _ss = SpreadsheetApp.openById(id);
    return _ss;
  }

  function sheet(name) {
    var sh = spreadsheet().getSheetByName(name);
    if (!sh) throw new AppError(ERR.NOT_INITIALIZED, 'Sheet ' + name + ' belum tersedia. Jalankan setupMCMS().');
    return sh;
  }

  function load(name) {
    if (_memo[name]) return _memo[name];
    var sh = sheet(name);
    var values = sh.getDataRange().getValues();
    var headers = (values[0] || []).map(String);
    var rows = [];
    for (var i = 1; i < values.length; i++) {
      var r = values[i];
      if (r[0] === '' || r[0] === null) continue; // baris kosong diabaikan
      var obj = {};
      for (var c = 0; c < headers.length; c++) {
        var v = r[c];
        if (typeof v === 'string' && /^'[=+\-@\t\r]/.test(v)) v = v.slice(1); // buang prefix anti-formula
        obj[headers[c]] = v;
      }
      Object.defineProperty(obj, '_row', { value: i + 1, enumerable: false });
      rows.push(obj);
    }
    _memo[name] = { headers: headers, rows: rows, sheet: sh };
    return _memo[name];
  }

  function copy(obj) {
    var o = {};
    Object.keys(obj).forEach(function (k) { o[k] = obj[k]; });
    Object.defineProperty(o, '_row', { value: obj._row, enumerable: false });
    return o;
  }

  function toRow(headers, obj) {
    return headers.map(function (h) { return U.sanitizeCell(obj[h]); });
  }

  return {
    spreadsheet: spreadsheet,
    reset: function () { _ss = null; _memo = {}; },
    invalidate: function (name) { if (name) delete _memo[name]; else _memo = {}; },

    all: function (name) { return load(name).rows.map(copy); },

    find: function (name, predicate) { return load(name).rows.filter(predicate).map(copy); },

    findOne: function (name, field, value) {
      var rows = load(name).rows;
      for (var i = 0; i < rows.length; i++) if (rows[i][field] === value) return copy(rows[i]);
      return null;
    },

    insert: function (name, obj) {
      var t = load(name);
      var row = toRow(t.headers, obj);
      t.sheet.appendRow(row);
      delete _memo[name];
      return obj;
    },

    /** Update satu baris berdasarkan kolom ID (kolom pertama). */
    update: function (name, idField, id, patch) {
      var t = load(name);
      var target = null;
      for (var i = 0; i < t.rows.length; i++) if (t.rows[i][idField] === id) { target = t.rows[i]; break; }
      if (!target) throw new AppError(ERR.NOT_FOUND, 'Data tidak ditemukan.');
      var merged = {};
      t.headers.forEach(function (h) { merged[h] = Object.prototype.hasOwnProperty.call(patch, h) ? patch[h] : target[h]; });
      t.sheet.getRange(target._row, 1, 1, t.headers.length).setValues([toRow(t.headers, merged)]);
      delete _memo[name];
      return merged;
    },

    /** Menjalankan fn dengan kunci global agar penulisan bersamaan tidak saling menimpa. */
    withLock: function (fn) {
      var lock = LockService.getScriptLock();
      if (!lock.tryLock(20000)) throw new AppError(ERR.BUSY, 'Sistem sedang sibuk. Coba lagi beberapa detik lagi.');
      try { _memo = {}; return fn(); }
      finally { lock.releaseLock(); }
    }
  };
})();

/** CONFIG sebagai key-value. */
var ConfigStore = {
  getAll: function () {
    var out = {};
    Db.all('CONFIG').forEach(function (r) { out[String(r.key)] = r.value === null ? '' : String(r.value); });
    return out;
  },
  get: function (key) {
    var r = Db.findOne('CONFIG', 'key', key);
    return r ? String(r.value) : '';
  },
  set: function (key, value, description) {
    var existing = Db.findOne('CONFIG', 'key', key);
    if (existing) Db.update('CONFIG', 'key', key, { value: value, updated_at: U.now() });
    else Db.insert('CONFIG', { key: key, value: value, description: description || '', updated_at: U.now() });
  }
};

// ==================== Audit.gs ====================
/**
 * Audit.gs — riwayat perubahan penting (akun, undangan, branding, login).
 * Audit tidak boleh menggagalkan aksi utama, jadi error-nya ditangkap.
 */
var Audit = {
  log: function (actor, action, entityType, entityId, details) {
    try {
      Db.insert('AUDIT_LOG', {
        audit_id: U.newId('AUD'),
        timestamp: U.now(),
        user_id: actor ? (actor.user_id || '') : '',
        user_email: actor ? (actor.email || '') : '',
        action: action,
        entity_type: entityType || '',
        entity_id: entityId || '',
        details_json: details ? JSON.stringify(details).slice(0, 5000) : ''
      });
    } catch (e) {
      console.error('Audit gagal: ' + (e && e.message));
    }
  }
};

// ==================== Permission.gs ====================
/**
 * Permission.gs — matriks hak akses MCMS.
 * Catatan: tidak memakai konstanta dari file lain di level atas, agar urutan file Apps Script tidak berpengaruh.
 * Mode tampilan (Saya/Atasan) TIDAK mengubah izin. Izin hanya berasal dari role di sheet USERS.
 */
var PERMISSIONS = {
  'dashboard.personal': ['OWNER'],
  'dashboard.executive': ['OWNER', 'SUPERVISOR'],
  'project.manage': ['OWNER'],
  'project.view': ['OWNER', 'SUPERVISOR'],
  'task.manage': ['OWNER'],
  'activity.view': ['OWNER', 'SUPERVISOR'],
  'evidence.view': ['OWNER', 'SUPERVISOR'],   // supervisor: hanya visibility SUPERVISOR/PORTFOLIO
  'drive.manage': ['OWNER'],
  'feedback.create': ['SUPERVISOR'],          // atasan menulis feedback; pemilik membaca & menandai
  'feedback.view': ['OWNER', 'SUPERVISOR'],
  'feedback.manage': ['OWNER'],
  'activity.manage': ['OWNER'],
  'category.manage': ['OWNER'],
  'search.global': ['OWNER'],
  'data.backup': ['OWNER'],
  'account.manage': ['OWNER'],
  'kpi.manage': ['OWNER'],
  'report.generate': ['OWNER'],
  'report.view': ['OWNER', 'SUPERVISOR'],
  'portfolio.view': ['OWNER', 'SUPERVISOR'],
  'branding.manage': ['OWNER'],
  'settings.system': ['OWNER'],
  'profile.self': ['OWNER', 'SUPERVISOR']
};

var Permission = {
  has: function (user, permission) {
    var allowed = PERMISSIONS[permission];
    return !!(user && allowed && allowed.indexOf(user.role) >= 0);
  },

  require: function (user, permission) {
    if (!Permission.has(user, permission)) {
      throw new AppError(ERR.FORBIDDEN, 'Akun kamu tidak memiliki izin untuk tindakan ini.');
    }
  },

  listFor: function (user) {
    return Object.keys(PERMISSIONS).filter(function (p) { return Permission.has(user, p); });
  },

  /** OWNER: dua mode. SUPERVISOR: hanya Mode Atasan. */
  modesFor: function (user) {
    if (user.role === ROLES.OWNER) return ['personal', 'executive'];
    if (user.role === ROLES.SUPERVISOR) return ['executive'];
    return [];
  },

  /** Filter visibilitas untuk tampilan eksekutif (dipakai juga saat OWNER mempratinjau Mode Atasan). */
  visibleToSupervisor: function (row) {
    var v = String(row.visibility || VISIBILITY.PRIVATE).toUpperCase();
    return v === VISIBILITY.SUPERVISOR || v === VISIBILITY.PORTFOLIO;
  }
};

// ==================== Auth.gs ====================
/**
 * Auth.gs — verifikasi Google Sign-In di server + sesi aplikasi.
 *
 * Alur: browser mengirim ID token Google → server memverifikasi ke Google (aud, iss, email_verified, exp)
 * → email dicocokkan dengan sheet USERS → server menerbitkan session token acak (disimpan sebagai hash di cache).
 * Role SELALU dibaca ulang dari USERS pada setiap request, tidak pernah dipercaya dari browser.
 */
var Auth = (function () {
  var SESSION_PREFIX = 'mcms:sess:';

  function cache() { return CacheService.getScriptCache(); }

  /** Verifikasi ID token Google. Mengembalikan identitas terverifikasi. */
  function verifyGoogleIdToken(idToken) {
    if (!idToken || typeof idToken !== 'string' || idToken.length > 4096 || idToken.split('.').length !== 3) {
      throw new AppError(ERR.UNAUTHENTICATED, 'Login Google tidak valid. Silakan coba lagi.');
    }
    var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), {
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) {
      throw new AppError(ERR.UNAUTHENTICATED, 'Sesi login Google sudah tidak berlaku. Silakan masuk kembali.');
    }
    var info;
    try { info = JSON.parse(res.getContentText()); } catch (e) { info = null; }
    var clientId = Props.get('GOOGLE_CLIENT_ID');
    if (!info || !clientId || info.aud !== clientId) {
      throw new AppError(ERR.UNAUTHENTICATED, 'Login ditolak: token bukan untuk aplikasi MCMS.');
    }
    if (GOOGLE_ISSUERS.indexOf(info.iss) < 0) throw new AppError(ERR.UNAUTHENTICATED, 'Login ditolak: penerbit token tidak dikenal.');
    if (String(info.email_verified) !== 'true') throw new AppError(ERR.UNAUTHENTICATED, 'Email akun Google belum terverifikasi.');
    if (!info.exp || Number(info.exp) * 1000 < Date.now()) throw new AppError(ERR.UNAUTHENTICATED, 'Login Google kedaluwarsa. Silakan masuk kembali.');
    if (!info.email) throw new AppError(ERR.UNAUTHENTICATED, 'Email akun Google tidak terbaca.');
    return {
      email: String(info.email).toLowerCase(),
      name: info.name ? String(info.name) : '',
      picture: info.picture ? String(info.picture) : '',
      sub: String(info.sub || '')
    };
  }

  function createSession(user) {
    var token = U.randomToken();
    var expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
    cache().put(SESSION_PREFIX + U.sha256(token), JSON.stringify({ userId: user.user_id, exp: expiresAt }), SESSION_TTL_SECONDS);
    return { token: token, expiresAt: new Date(expiresAt).toISOString() };
  }

  function destroySession(token) {
    if (token) cache().remove(SESSION_PREFIX + U.sha256(token));
  }

  function accountUsable(u) {
    return u && U.isTrue(u.is_active) && u.invitation_status === ACCOUNT_STATUS.ACTIVE;
  }

  /** Dipanggil Router untuk setiap aksi yang butuh login. */
  function requireSession(token) {
    if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      throw new AppError(ERR.UNAUTHENTICATED, 'Silakan masuk terlebih dahulu.');
    }
    var raw = cache().get(SESSION_PREFIX + U.sha256(token));
    if (!raw) throw new AppError(ERR.UNAUTHENTICATED, 'Sesi berakhir. Silakan masuk kembali.');
    var sess = JSON.parse(raw);
    if (sess.exp < Date.now()) { destroySession(token); throw new AppError(ERR.UNAUTHENTICATED, 'Sesi berakhir. Silakan masuk kembali.'); }
    var user = Db.findOne('USERS', 'user_id', sess.userId);
    if (!accountUsable(user)) {
      destroySession(token);
      throw new AppError(ERR.UNAUTHENTICATED, 'Akses akun ini sudah tidak aktif. Hubungi pemilik MCMS.');
    }
    return user;
  }

  function login(idToken) {
    var id = verifyGoogleIdToken(idToken);
    var user = Db.findOne('USERS', 'email', id.email);
    if (!user) {
      throw new AppError(ERR.FORBIDDEN, 'Akun ' + id.email + ' belum terdaftar di MCMS. Minta undangan dari pemilik.');
    }
    if (user.invitation_status === ACCOUNT_STATUS.INVITED) {
      throw new AppError(ERR.FORBIDDEN, 'Akun kamu masih berstatus undangan. Buka tautan undangan dari email untuk mengaktifkannya.');
    }
    if (!accountUsable(user)) {
      throw new AppError(ERR.FORBIDDEN, 'Akses akun ini sedang tidak aktif. Hubungi pemilik MCMS.');
    }
    var patch = { last_login: U.now() };
    if (!user.display_name && id.name) patch.display_name = U.cleanText(id.name, 80);
    if (id.picture && user.photo_url !== id.picture) patch.photo_url = id.picture;
    user = Db.update('USERS', 'user_id', user.user_id, patch);
    Audit.log(user, 'LOGIN', 'USERS', user.user_id, null);
    var session = createSession(user);
    return { session: session, me: describe(user) };
  }

  /** Data pengguna yang aman dikirim ke browser. */
  function describe(user) {
    return {
      userId: user.user_id,
      email: user.email,
      displayName: user.display_name || user.email,
      photoUrl: user.photo_url || '',
      role: user.role,
      modes: Permission.modesFor(user),
      permissions: Permission.listFor(user)
    };
  }

  function updateProfile(user, payload) {
    var name = U.cleanText(payload.displayName, 80);
    if (name.length < 2) throw new AppError(ERR.VALIDATION, 'Nama tampilan minimal 2 karakter.');
    var updated = Db.update('USERS', 'user_id', user.user_id, { display_name: name });
    Audit.log(user, 'PROFILE_UPDATE', 'USERS', user.user_id, null);
    return describe(updated);
  }

  return {
    verifyGoogleIdToken: verifyGoogleIdToken,
    createSession: createSession,
    destroySession: destroySession,
    requireSession: requireSession,
    login: login,
    describe: describe,
    updateProfile: updateProfile
  };
})();

// ==================== UserService.gs ====================
/**
 * UserService.gs — manajemen akun & undangan supervisor.
 * Token undangan hanya dikirim sekali (email / tautan). Yang disimpan di sheet hanyalah hash-nya.
 */
var UserService = (function () {

  function effectiveStatus(u) {
    if (u.invitation_status === ACCOUNT_STATUS.INVITED) {
      var exp = U.asDate(u.invitation_expires_at);
      if (exp && exp.getTime() < Date.now()) return ACCOUNT_STATUS.EXPIRED;
    }
    return u.invitation_status;
  }

  function publicUser(u) {
    return {
      userId: u.user_id,
      email: u.email,
      displayName: u.display_name || '',
      role: u.role,
      status: effectiveStatus(u),
      invitedAt: U.toIso(u.invited_at),
      invitationExpiresAt: U.toIso(u.invitation_expires_at),
      acceptedAt: U.toIso(u.accepted_at),
      lastLogin: U.toIso(u.last_login)
    };
  }

  function inviteLink(token) {
    var base = Props.get('APP_URL') || '';
    return base + '#invite=' + token;
  }

  function sendInviteEmail(email, displayName, link, owner) {
    var appName = ConfigStore.get('APP_NAME') || 'MCMS';
    var org = ConfigStore.get('ORGANIZATION_NAME');
    var html =
      '<div style="font-family:Arial,sans-serif;max-width:520px;color:#171B2B">' +
      '<h2 style="color:#5B4BD6;margin:0 0 12px">Undangan ' + escapeHtml(appName) + '</h2>' +
      '<p>Halo ' + escapeHtml(displayName || email) + ',</p>' +
      '<p>' + escapeHtml(owner.display_name || owner.email) + ' mengundang Anda sebagai <b>Atasan (Supervisor)</b>' +
      (org ? ' di ' + escapeHtml(org) : '') + ' untuk memantau progres dan hasil kerja Media Center.</p>' +
      '<p style="margin:24px 0"><a href="' + link + '" style="background:#5B4BD6;color:#fff;padding:12px 20px;' +
      'border-radius:10px;text-decoration:none;font-weight:bold">Terima undangan</a></p>' +
      '<p style="font-size:13px;color:#4B5563">Masuk menggunakan akun Google <b>' + escapeHtml(email) + '</b>. ' +
      'Tautan berlaku ' + INVITE_TTL_DAYS + ' hari dan hanya bisa dipakai satu kali.</p></div>';
    try {
      MailApp.sendEmail({ to: email, subject: 'Undangan akses ' + appName, htmlBody: html, name: appName });
      return true;
    } catch (e) {
      console.error('Email undangan gagal: ' + e.message);
      return false;
    }
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function issueInvite(owner, existing, email, displayName) {
    var token = U.randomToken();
    var now = U.now();
    var fields = {
      email: email, display_name: displayName || (existing ? existing.display_name : '') || '',
      role: ROLES.SUPERVISOR, is_active: false, invitation_status: ACCOUNT_STATUS.INVITED,
      invite_token_hash: U.sha256(token), invited_by: owner.user_id, invited_at: now,
      invitation_expires_at: U.addDays(now, INVITE_TTL_DAYS), accepted_at: ''
    };
    var row;
    if (existing) {
      row = Db.update('USERS', 'user_id', existing.user_id, fields);
    } else {
      fields.user_id = U.newId('USR');
      fields.created_at = now;
      fields.last_login = '';
      fields.photo_url = '';
      row = Db.insert('USERS', fields);
    }
    var link = inviteLink(token);
    var emailSent = sendInviteEmail(email, fields.display_name, link, owner);
    Audit.log(owner, existing ? 'INVITE_REISSUED' : 'INVITE_CREATED', 'USERS', row.user_id, { email: email, emailSent: emailSent });
    return { user: publicUser(Db.findOne('USERS', 'user_id', row.user_id)), inviteLink: link, emailSent: emailSent };
  }

  function getSupervisor(userId) {
    var u = Db.findOne('USERS', 'user_id', String(userId || ''));
    if (!u) throw new AppError(ERR.NOT_FOUND, 'Akun tidak ditemukan.');
    if (u.role === ROLES.OWNER) throw new AppError(ERR.FORBIDDEN, 'Akun pemilik tidak dapat diubah dari sini.');
    return u;
  }

  return {
    publicUser: publicUser,

    list: function () {
      return Db.all('USERS')
        .sort(function (a, b) { return (a.role === ROLES.OWNER ? -1 : 0) - (b.role === ROLES.OWNER ? -1 : 0); })
        .map(publicUser);
    },

    invite: function (owner, payload) {
      var email = U.cleanText(payload.email, 254).toLowerCase();
      var name = U.cleanText(payload.displayName, 80);
      if (!U.isEmail(email)) throw new AppError(ERR.VALIDATION, 'Alamat email tidak valid.');
      if (email === String(owner.email).toLowerCase()) throw new AppError(ERR.VALIDATION, 'Tidak bisa mengundang email milik sendiri.');
      var existing = Db.findOne('USERS', 'email', email);
      if (existing) {
        if (existing.role === ROLES.OWNER) throw new AppError(ERR.CONFLICT, 'Email ini adalah akun pemilik.');
        if (existing.invitation_status === ACCOUNT_STATUS.ACTIVE) throw new AppError(ERR.CONFLICT, 'Email ini sudah aktif sebagai atasan.');
        if (existing.invitation_status === ACCOUNT_STATUS.SUSPENDED) throw new AppError(ERR.CONFLICT, 'Akun ini sedang dinonaktifkan. Gunakan tombol "Aktifkan kembali".');
      }
      return issueInvite(owner, existing, email, name);
    },

    resendInvite: function (owner, payload) {
      var u = getSupervisor(payload.userId);
      var st = effectiveStatus(u);
      if (st === ACCOUNT_STATUS.ACTIVE || st === ACCOUNT_STATUS.SUSPENDED) {
        throw new AppError(ERR.CONFLICT, 'Undangan hanya bisa dikirim ulang untuk akun yang belum aktif.');
      }
      return issueInvite(owner, u, u.email, u.display_name);
    },

    revoke: function (owner, payload) {
      var u = getSupervisor(payload.userId);
      Db.update('USERS', 'user_id', u.user_id, {
        is_active: false, invitation_status: ACCOUNT_STATUS.REVOKED, invite_token_hash: ''
      });
      Audit.log(owner, 'ACCESS_REVOKED', 'USERS', u.user_id, { email: u.email });
      AssetService.revokeUserEverywhere(u.email);
      return publicUser(Db.findOne('USERS', 'user_id', u.user_id));
    },

    suspend: function (owner, payload) {
      var u = getSupervisor(payload.userId);
      if (u.invitation_status !== ACCOUNT_STATUS.ACTIVE) throw new AppError(ERR.CONFLICT, 'Hanya akun aktif yang bisa dinonaktifkan sementara.');
      Db.update('USERS', 'user_id', u.user_id, { is_active: false, invitation_status: ACCOUNT_STATUS.SUSPENDED });
      Audit.log(owner, 'ACCOUNT_SUSPENDED', 'USERS', u.user_id, { email: u.email });
      AssetService.revokeUserEverywhere(u.email);
      return publicUser(Db.findOne('USERS', 'user_id', u.user_id));
    },

    reactivate: function (owner, payload) {
      var u = getSupervisor(payload.userId);
      if (u.invitation_status !== ACCOUNT_STATUS.SUSPENDED) throw new AppError(ERR.CONFLICT, 'Hanya akun yang dinonaktifkan sementara yang bisa diaktifkan kembali.');
      Db.update('USERS', 'user_id', u.user_id, { is_active: true, invitation_status: ACCOUNT_STATUS.ACTIVE });
      Audit.log(owner, 'ACCOUNT_REACTIVATED', 'USERS', u.user_id, { email: u.email });
      return publicUser(Db.findOne('USERS', 'user_id', u.user_id));
    },

    /** Dipanggil oleh supervisor saat membuka tautan undangan. */
    acceptInvite: function (idToken, inviteToken) {
      if (!inviteToken || !/^[a-f0-9]{64}$/.test(String(inviteToken))) {
        throw new AppError(ERR.INVALID_INVITE, 'Tautan undangan tidak valid.');
      }
      var identity = Auth.verifyGoogleIdToken(idToken);
      var hash = U.sha256(inviteToken);
      var u = Db.findOne('USERS', 'invite_token_hash', hash);
      if (!u || u.invitation_status !== ACCOUNT_STATUS.INVITED) {
        throw new AppError(ERR.INVALID_INVITE, 'Undangan tidak valid atau sudah digunakan. Minta undangan baru kepada pemilik.');
      }
      var exp = U.asDate(u.invitation_expires_at);
      if (!exp || exp.getTime() < Date.now()) {
        Db.update('USERS', 'user_id', u.user_id, { invitation_status: ACCOUNT_STATUS.EXPIRED, invite_token_hash: '' });
        Audit.log({ user_id: u.user_id, email: u.email }, 'INVITE_EXPIRED_ATTEMPT', 'USERS', u.user_id, null);
        throw new AppError(ERR.INVITE_EXPIRED, 'Undangan sudah kedaluwarsa. Minta undangan baru kepada pemilik.');
      }
      if (identity.email !== String(u.email).toLowerCase()) {
        Audit.log({ user_id: '', email: identity.email }, 'INVITE_EMAIL_MISMATCH', 'USERS', u.user_id, null);
        throw new AppError(ERR.FORBIDDEN, 'Undangan ini untuk akun Google ' + U.maskEmail(u.email) +
          '. Keluar lalu masuk dengan akun tersebut.');
      }
      var now = U.now();
      var updated = Db.update('USERS', 'user_id', u.user_id, {
        is_active: true, invitation_status: ACCOUNT_STATUS.ACTIVE, invite_token_hash: '', accepted_at: now,
        last_login: now, display_name: u.display_name || U.cleanText(identity.name, 80) || identity.email.split('@')[0],
        photo_url: identity.picture || ''
      });
      Audit.log(updated, 'INVITE_ACCEPTED', 'USERS', u.user_id, null);
      return { session: Auth.createSession(updated), me: Auth.describe(updated) };
    }
  };
})();

// ==================== BrandingService.gs ====================
/**
 * BrandingService.gs — nama aplikasi, identitas sekolah, dan logo.
 *
 * Logo dikompres di browser (maks ±320px, ≤70KB), disimpan ke Drive (00_BRANDING),
 * dicatat di ASSETS, dirujuk dari CONFIG, lalu disajikan sebagai data URL (di-cache).
 * Dengan cara ini logo tampil untuk semua akun (termasuk halaman login) tanpa membagikan folder Drive.
 * Logo lama tidak dihapus agar bisa dipulihkan.
 */
var BrandingService = (function () {
  var CACHE_KEY = 'mcms:branding:v1';
  var LOGO_CACHE_PREFIX = 'mcms:logo:';

  function cache() { return CacheService.getScriptCache(); }

  function logoDataUrl(assetId) {
    if (!assetId) return '';
    var cached = cache().get(LOGO_CACHE_PREFIX + assetId);
    if (cached) return cached;
    var asset = Db.findOne('ASSETS', 'asset_id', assetId);
    if (!asset || U.isTrue(asset.is_deleted)) return '';
    try {
      var blob = DriveApp.getFileById(asset.drive_file_id).getBlob();
      var url = 'data:' + asset.mime_type + ';base64,' + Utilities.base64Encode(blob.getBytes());
      if (url.length < 99000) cache().put(LOGO_CACHE_PREFIX + assetId, url, 21600);
      return url;
    } catch (e) {
      console.error('Logo tidak dapat dibaca: ' + e.message);
      return '';
    }
  }

  function build() {
    var c = ConfigStore.getAll();
    return {
      appName: c.APP_NAME || 'MCMS — Media Center Workspace',
      tagline: c.APP_TAGLINE || '',
      organizationName: c.ORGANIZATION_NAME || '',
      logoMode: LOGO_MODES.indexOf(c.APP_LOGO_MODE) >= 0 ? c.APP_LOGO_MODE : 'NONE',
      logoAlt: c.APP_LOGO_ALT || 'Logo Media Center',
      primaryLogo: logoDataUrl(c.APP_LOGO_PRIMARY_ID),
      secondaryLogo: logoDataUrl(c.APP_LOGO_SECONDARY_ID),
      updatedAt: c.APP_BRANDING_UPDATED_AT || ''
    };
  }

  function storeLogo(owner, logo, label) {
    var parsed = U.parseImageDataUrl(logo.dataUrl);
    if (parsed.bytes.length > LOGO_MAX_BYTES) {
      throw new AppError(ERR.VALIDATION, 'Ukuran ' + label + ' terlalu besar setelah dikompres (maks 70 KB). Gunakan gambar yang lebih sederhana.');
    }
    U.checkImageSignature(parsed.mime, parsed.bytes);
    var ext = parsed.mime === 'image/png' ? 'png' : parsed.mime === 'image/webp' ? 'webp' : 'jpg';
    var folderId = Props.get('DRIVE_BRANDING_ID');
    var folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getFolderById(Props.get('DRIVE_ROOT_ID'));
    var stamp = Utilities.formatDate(new Date(), U.timezone(), 'yyyyMMdd-HHmmss');
    var fileName = label.replace(/\s+/g, '_') + '_' + stamp + '.' + ext;
    var file;
    try {
      file = folder.createFile(Utilities.newBlob(parsed.bytes, parsed.mime, fileName));
    } catch (e) {
      throw new AppError(ERR.INTERNAL, 'Logo gagal disimpan ke Google Drive. Coba lagi.');
    }
    var assetId = U.newId('AST');
    Db.insert('ASSETS', {
      asset_id: assetId, drive_file_id: file.getId(), file_name: fileName, mime_type: parsed.mime,
      size_bytes: parsed.bytes.length, category: 'BRANDING', purpose: label, visibility: VISIBILITY.SUPERVISOR,
      uploaded_by: owner.user_id, created_at: U.now(), is_deleted: false
    });
    return assetId;
  }

  function applyLogoChange(owner, change, configKey, label) {
    if (!change || !change.action || change.action === 'keep') return null;
    if (change.action === 'remove') { ConfigStore.set(configKey, ''); return 'removed'; }
    if (change.action === 'replace') { ConfigStore.set(configKey, storeLogo(owner, change, label)); return 'replaced'; }
    throw new AppError(ERR.VALIDATION, 'Aksi logo tidak dikenal.');
  }

  return {
    /** Publik (tanpa login): dipakai halaman login & header. */
    getPublic: function () {
      var cached = cache().get(CACHE_KEY);
      if (cached) return JSON.parse(cached);
      var data = build();
      var json = JSON.stringify(data);
      if (json.length < 99000) cache().put(CACHE_KEY, json, 21600);
      return data;
    },

    save: function (owner, p) {
      var appName = U.cleanText(p.appName, 60);
      if (appName.length < 2) throw new AppError(ERR.VALIDATION, 'Nama aplikasi minimal 2 karakter.');
      var mode = String(p.logoMode || 'NONE').toUpperCase();
      if (LOGO_MODES.indexOf(mode) < 0) throw new AppError(ERR.VALIDATION, 'Pilihan tampilan logo tidak valid.');

      // Validasi dulu sebelum menyimpan apa pun (tidak ada penyimpanan setengah jadi)
      function willHave(change, key) {
        var action = change && change.action ? change.action : 'keep';
        if (action === 'replace') return true;
        if (action === 'remove') return false;
        return !!ConfigStore.get(key);
      }
      if ((mode === 'MEDIA' || mode === 'BOTH') && !willHave(p.primaryLogo, 'APP_LOGO_PRIMARY_ID')) {
        throw new AppError(ERR.VALIDATION, 'Unggah logo Media Center terlebih dahulu.');
      }
      if ((mode === 'SCHOOL' || mode === 'BOTH') && !willHave(p.secondaryLogo, 'APP_LOGO_SECONDARY_ID')) {
        throw new AppError(ERR.VALIDATION, 'Unggah logo sekolah terlebih dahulu.');
      }
      [p.primaryLogo, p.secondaryLogo].forEach(function (ch) {
        if (ch && ch.action === 'replace') {
          var parsed = U.parseImageDataUrl(ch.dataUrl);
          if (parsed.bytes.length > LOGO_MAX_BYTES) throw new AppError(ERR.VALIDATION, 'Ukuran logo terlalu besar (maks 70 KB setelah dikompres).');
          U.checkImageSignature(parsed.mime, parsed.bytes);
        }
      });

      var changes = {
        primary: applyLogoChange(owner, p.primaryLogo, 'APP_LOGO_PRIMARY_ID', 'Logo Media Center'),
        secondary: applyLogoChange(owner, p.secondaryLogo, 'APP_LOGO_SECONDARY_ID', 'Logo Sekolah')
      };

      ConfigStore.set('APP_NAME', appName);
      ConfigStore.set('APP_TAGLINE', U.cleanText(p.tagline, 80));
      ConfigStore.set('ORGANIZATION_NAME', U.cleanText(p.organizationName, 80));
      ConfigStore.set('APP_LOGO_MODE', mode);
      ConfigStore.set('APP_LOGO_ALT', U.cleanText(p.logoAlt, 120) || ('Logo ' + appName));
      ConfigStore.set('APP_BRANDING_UPDATED_AT', new Date().toISOString());

      cache().remove(CACHE_KEY);
      Audit.log(owner, 'BRANDING_UPDATED', 'CONFIG', 'BRANDING', { mode: mode, changes: changes });
      return build();
    }
  };
})();

// ==================== Repo.gs ====================
/**
 * Repo.gs — lapisan data bersama untuk seluruh modul kerja.
 *
 * Satu sumber kebenaran untuk:
 *  - rumus progres proyek (rata-rata tertimbang bobot tugas)
 *  - aturan "terlambat"
 *  - aturan visibilitas untuk atasan (scope SUPERVISOR)
 *  - bentuk data (DTO) yang dikirim ke browser
 * Mode Saya dan Mode Atasan memakai fungsi yang sama, sehingga angka di kedua mode selalu identik.
 */
var Repo = (function () {
  var ACTIVE_PROJECT = ['PLANNING', 'IN_PROGRESS', 'ON_HOLD'];
  var OPEN_TASK = ['TODO', 'IN_PROGRESS', 'REVIEW'];

  function alive(r) { return !U.isTrue(r.is_deleted); }
  function indexBy(rows, key) { var o = {}; rows.forEach(function (r) { o[r[key]] = r; }); return o; }

  /** Memuat sheet yang diperlukan sekali per request (lazy). */
  function bundle() {
    var memo = {};
    function get(name, fn) { if (!memo[name]) memo[name] = fn(); return memo[name]; }
    var b = {
      get projects() { return get('projects', function () { return Db.all('PROJECTS').filter(alive); }); },
      get tasks() { return get('tasks', function () { return Db.all('TASKS').filter(alive); }); },
      get activities() { return get('activities', function () { return Db.all('ACTIVITY_LOG').filter(alive); }); },
      get assets() {
        return get('assets', function () {
          return Db.all('ASSETS').filter(function (a) { return alive(a) && a.category !== 'BRANDING'; });
        });
      },
      get links() { return get('links', function () { return Db.all('ASSET_LINKS').filter(function (l) { return l.entity_type !== 'REMOVED'; }); }); },
      get categories() { return get('categories', function () { return Db.all('CATEGORIES'); }); },
      get reviews() { return get('reviews', function () { return Db.all('REVIEW_LOG'); }); },
      get reports() { return get('reports', function () { return Db.all('REPORTS').filter(alive); }); },
      get timeLogs() { return get('timeLogs', function () { return Db.all('TIME_LOG'); }); },
      get projectsById() { return get('projectsById', function () { return indexBy(b.projects, 'project_id'); }); },
      get tasksById() { return get('tasksById', function () { return indexBy(b.tasks, 'task_id'); }); },
      get categoriesById() { return get('categoriesById', function () { return indexBy(b.categories, 'category_id'); }); },
      get tasksByProject() {
        return get('tasksByProject', function () {
          var o = {};
          b.tasks.forEach(function (t) { if (t.project_id) (o[t.project_id] = o[t.project_id] || []).push(t); });
          return o;
        });
      },
      get linksByAsset() {
        return get('linksByAsset', function () {
          var o = {};
          b.links.forEach(function (l) { (o[l.asset_id] = o[l.asset_id] || []).push(l); });
          return o;
        });
      }
    };
    return b;
  }

  function visible(row) { return Permission.visibleToSupervisor(row); }

  /**
   * Data yang boleh dilihat atasan. Aturan:
   * - proyek: visibility SUPERVISOR/PORTFOLIO
   * - tugas & aktivitas: visibility SUPERVISOR/PORTFOLIO DAN (tanpa proyek ATAU proyeknya terlihat)
   * - aset: visibility SUPERVISOR/PORTFOLIO DAN (tanpa proyek ATAU proyeknya terlihat)
   */
  function supervisorScope(b) {
    var projects = b.projects.filter(visible);
    var pid = indexBy(projects, 'project_id');
    function projOk(r) { return !r.project_id || !!pid[r.project_id]; }
    var tasks = b.tasks.filter(function (t) { return visible(t) && projOk(t); });
    var tid = indexBy(tasks, 'task_id');
    return {
      projects: projects,
      projectIds: pid,
      tasks: tasks,
      taskIds: tid,
      activities: b.activities.filter(function (a) { return visible(a) && projOk(a) && (!a.task_id || !!tid[a.task_id] || !b.tasksById[a.task_id]); }),
      assets: b.assets.filter(function (a) { return visible(a) && projOk(a); })
    };
  }

  /** Progres proyek = rata-rata tertimbang progres tugas (bobot default 1). null = belum ada tugas. */
  function projectProgress(projectId, b) {
    var list = (b.tasksByProject[projectId] || []).filter(function (t) { return t.status !== 'CANCELLED'; });
    if (!list.length) return null;
    var totalW = 0, sum = 0;
    list.forEach(function (t) {
      var w = Number(t.weight) > 0 ? Number(t.weight) : 1;
      var p = t.status === 'DONE' ? 100 : Math.max(0, Math.min(100, Number(t.progress) || 0));
      totalW += w; sum += w * p;
    });
    return Math.round(sum / totalW);
  }

  function isOverdue(row, doneStatuses) {
    var due = U.dayKey(row.due_date);
    if (!due || doneStatuses.indexOf(row.status) >= 0) return false;
    return due < U.today();
  }
  function taskOverdue(t) { return isOverdue(t, ['DONE', 'CANCELLED']); }
  function projectOverdue(p) { return isOverdue(p, ['DONE', 'ARCHIVED']); }

  function category(b, id) {
    var c = id ? b.categoriesById[id] : null;
    return c ? { id: c.category_id, name: c.name, color: c.color } : null;
  }

  function evidenceCount(b, entityType, id) {
    return b.links.filter(function (l) { return l.entity_type === entityType && l.entity_id === id; }).length;
  }

  /* ---------------- DTO ---------------- */
  function projectDto(p, b, opts) {
    opts = opts || {};
    var tasks = (b.tasksByProject[p.project_id] || []).filter(function (t) { return t.status !== 'CANCELLED'; });
    return {
      projectId: p.project_id,
      name: p.name,
      description: p.description || '',
      objective: p.objective || '',
      category: category(b, p.category_id),
      categoryId: p.category_id || '',
      status: p.status || 'PLANNING',
      priority: p.priority || 'MEDIUM',
      startDate: U.dayKey(p.start_date),
      dueDate: U.dayKey(p.due_date),
      completedAt: U.toIso(p.completed_at),
      progress: projectProgress(p.project_id, b),
      taskCount: tasks.length,
      taskDone: tasks.filter(function (t) { return t.status === 'DONE'; }).length,
      overdue: projectOverdue(p),
      visibility: p.visibility || 'PRIVATE',
      driveFolderUrl: opts.owner && p.drive_folder_id ? 'https://drive.google.com/drive/folders/' + p.drive_folder_id : '',
      createdAt: U.toIso(p.created_at),
      updatedAt: U.toIso(p.updated_at)
    };
  }

  function taskDto(t, b) {
    var proj = t.project_id ? b.projectsById[t.project_id] : null;
    return {
      taskId: t.task_id,
      projectId: t.project_id || '',
      projectName: proj ? proj.name : '',
      title: t.title,
      description: t.description || '',
      category: category(b, t.category_id),
      categoryId: t.category_id || '',
      status: t.status || 'TODO',
      priority: t.priority || 'MEDIUM',
      weight: Number(t.weight) > 0 ? Number(t.weight) : 1,
      progress: t.status === 'DONE' ? 100 : Math.max(0, Math.min(100, Number(t.progress) || 0)),
      plannedDate: U.dayKey(t.planned_date),
      dueDate: U.dayKey(t.due_date),
      startedAt: U.toIso(t.started_at),
      completedAt: U.toIso(t.completed_at),
      standalone: !t.project_id,
      blockerNote: t.blocker_note || '',
      visibility: t.visibility || 'PRIVATE',
      overdue: taskOverdue(t),
      evidenceCount: evidenceCount(b, 'TASK', t.task_id),
      createdAt: U.toIso(t.created_at),
      updatedAt: U.toIso(t.updated_at)
    };
  }

  function activityDto(a, b) {
    var proj = a.project_id ? b.projectsById[a.project_id] : null;
    var task = a.task_id ? b.tasksById[a.task_id] : null;
    return {
      activityId: a.activity_id,
      title: a.title,
      description: a.description || '',
      result: a.result || '',
      category: category(b, a.category_id),
      categoryId: a.category_id || '',
      projectId: a.project_id || '',
      projectName: proj ? proj.name : '',
      taskId: a.task_id || '',
      taskTitle: task ? task.title : '',
      date: U.dayKey(a.activity_date || a.created_at),
      durationMinutes: Number(a.duration_minutes) || 0,
      blockerNote: a.blocker_note || '',
      visibility: a.visibility || 'PRIVATE',
      evidenceCount: evidenceCount(b, 'ACTIVITY', a.activity_id),
      createdAt: U.toIso(a.created_at)
    };
  }

  function fileTypeOf(mime) {
    mime = String(mime || '');
    if (/^image\//.test(mime)) return 'IMAGE';
    if (/^video\//.test(mime)) return 'VIDEO';
    if (/^audio\//.test(mime)) return 'AUDIO';
    if (/photoshop|illustrator|postscript/.test(mime)) return 'DESIGN';
    if (/pdf|word|document|sheet|excel|presentation|powerpoint|text\//.test(mime) || /google-apps\.(document|spreadsheet|presentation)/.test(mime)) return 'DOCUMENT';
    return 'OTHER';
  }

  function assetDto(a, b, opts) {
    opts = opts || {};
    var proj = a.project_id ? b.projectsById[a.project_id] : null;
    var links = (b.linksByAsset[a.asset_id] || []).map(function (l) {
      var title = '';
      if (l.entity_type === 'PROJECT' && b.projectsById[l.entity_id]) title = b.projectsById[l.entity_id].name;
      if (l.entity_type === 'TASK' && b.tasksById[l.entity_id]) title = b.tasksById[l.entity_id].title;
      return { linkId: l.link_id, entityType: l.entity_type, entityId: l.entity_id, relation: l.relation || '', title: title };
    });
    if (opts.supervisor) {
      // Atasan hanya melihat relasi ke entitas yang juga terlihat olehnya.
      links = links.filter(function (l) {
        if (l.entityType === 'PROJECT') return !!opts.scope.projectIds[l.entityId];
        if (l.entityType === 'TASK') return !!opts.scope.taskIds[l.entityId];
        return false;
      });
    }
    return {
      assetId: a.asset_id,
      fileName: a.file_name,
      mimeType: a.mime_type || '',
      fileType: a.file_type || fileTypeOf(a.mime_type),
      sizeBytes: Number(a.size_bytes) || 0,
      source: a.source || 'UPLOAD',
      stage: a.purpose || 'OTHER',
      description: a.description || '',
      visibility: a.visibility || 'PRIVATE',
      projectId: a.project_id || '',
      projectName: proj ? proj.name : '',
      links: links,
      driveUrl: opts.owner && a.drive_file_id ? 'https://drive.google.com/file/d/' + a.drive_file_id + '/view' : '',
      createdAt: U.toIso(a.created_at)
    };
  }

  function reviewDto(r) {
    return {
      reviewId: r.review_id,
      entityType: r.entity_type,
      entityId: r.entity_id || '',
      entityTitle: r.entity_title || '',
      reviewerName: r.reviewer_name || 'Atasan',
      comment: r.comment,
      rating: Number(r.rating) || 0,
      status: r.status || 'OPEN',
      createdAt: U.toIso(r.created_at),
      acknowledgedAt: U.toIso(r.acknowledged_at)
    };
  }

  function byDayDesc(a, b) {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
  }

  /** Urutan tugas: terlambat → deadline terdekat → tanpa deadline. */
  function taskSort(a, b) {
    var ad = a.dueDate || '9999', bd = b.dueDate || '9999';
    if (ad !== bd) return ad < bd ? -1 : 1;
    var pr = PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority);
    if (pr) return pr;
    return a.createdAt < b.createdAt ? -1 : 1;
  }

  function projectSort(a, b) {
    var aa = ACTIVE_PROJECT.indexOf(a.status) >= 0 ? 0 : 1, bb = ACTIVE_PROJECT.indexOf(b.status) >= 0 ? 0 : 1;
    if (aa !== bb) return aa - bb;
    var ad = a.dueDate || '9999', bd = b.dueDate || '9999';
    if (ad !== bd) return ad < bd ? -1 : 1;
    return a.name < b.name ? -1 : 1;
  }

  /** Menyimpan progres terbaru ke kolom PROJECTS.progress (agar terbaca juga di spreadsheet). */
  function syncProjectProgress(projectId) {
    if (!projectId) return;
    Db.invalidate('TASKS');
    var b = bundle();
    var p = b.projectsById[projectId];
    if (!p) return;
    var prog = projectProgress(projectId, b);
    var value = prog === null ? '' : prog;
    if (String(p.progress) !== String(value)) Db.update('PROJECTS', 'project_id', projectId, { progress: value });
  }

  function requireProject(id, b) {
    var p = id ? (b || bundle()).projectsById[String(id)] : null;
    if (!p) throw new AppError(ERR.NOT_FOUND, 'Proyek tidak ditemukan atau sudah dihapus.');
    return p;
  }
  function requireTask(id, b) {
    var t = id ? (b || bundle()).tasksById[String(id)] : null;
    if (!t) throw new AppError(ERR.NOT_FOUND, 'Tugas tidak ditemukan atau sudah dihapus.');
    return t;
  }
  function requireCategory(id, b) {
    if (!id) return '';
    var c = (b || bundle()).categoriesById[String(id)];
    if (!c) throw new AppError(ERR.VALIDATION, 'Kategori tidak ditemukan.');
    return c.category_id;
  }

  return {
    ACTIVE_PROJECT: ACTIVE_PROJECT,
    OPEN_TASK: OPEN_TASK,
    alive: alive,
    indexBy: indexBy,
    bundle: bundle,
    supervisorScope: supervisorScope,
    projectProgress: projectProgress,
    taskOverdue: taskOverdue,
    projectOverdue: projectOverdue,
    fileTypeOf: fileTypeOf,
    projectDto: projectDto,
    taskDto: taskDto,
    activityDto: activityDto,
    assetDto: assetDto,
    reviewDto: reviewDto,
    byDayDesc: byDayDesc,
    taskSort: taskSort,
    projectSort: projectSort,
    syncProjectProgress: syncProjectProgress,
    requireProject: requireProject,
    requireTask: requireTask,
    requireCategory: requireCategory
  };
})();

// ==================== DriveService.gs ====================
/**
 * DriveService.gs — struktur folder MCMS di Google Drive.
 * Folder dicari berdasarkan nama di bawah folder utama MCMS dan dibuat bila belum ada (idempotent).
 */
var DriveService = (function () {
  var STAGE_FOLDER = { BRIEF: '01_BRIEF', WORKING: '02_WORKING', REVIEW: '03_REVIEW', FINAL: '04_FINAL', EVIDENCE: '02_WORKING', OTHER: '02_WORKING' };
  var LIBRARY_FOLDER = { IMAGE: 'PHOTO', VIDEO: 'VIDEO', DESIGN: 'DESIGN', DOCUMENT: 'DOCUMENT', AUDIO: 'DOCUMENT', OTHER: 'DOCUMENT' };

  function root() {
    var id = Props.get('DRIVE_ROOT_ID');
    if (!id) throw new AppError(ERR.NOT_INITIALIZED, 'Folder Drive MCMS belum disiapkan. Jalankan setupMCMS().');
    try { return DriveApp.getFolderById(id); } catch (e) {
      throw new AppError(ERR.INTERNAL, 'Folder Drive MCMS tidak dapat dibuka. Pastikan folder "MCMS" tidak terhapus.');
    }
  }

  function child(parent, name) {
    var it = parent.getFoldersByName(name);
    return it.hasNext() ? it.next() : parent.createFolder(name);
  }

  function path(names) {
    var f = root();
    names.forEach(function (n) { f = child(f, n); });
    return f;
  }

  function safeName(s) { return String(s || '').replace(/[\\/:*?"<>|#%]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60); }

  /** Folder proyek: 01_PROJECTS/PRJ-2026-0001 Nama/{01_BRIEF,02_WORKING,03_REVIEW,04_FINAL}. */
  function projectFolder(project) {
    if (project.drive_folder_id) {
      try { return DriveApp.getFolderById(project.drive_folder_id); } catch (e) { /* folder hilang → buat ulang */ }
    }
    var folder = child(path(['01_PROJECTS']), project.project_id + ' ' + safeName(project.name));
    ['01_BRIEF', '02_WORKING', '03_REVIEW', '04_FINAL'].forEach(function (n) { child(folder, n); });
    Db.update('PROJECTS', 'project_id', project.project_id, { drive_folder_id: folder.getId() });
    return folder;
  }

  return {
    root: root,
    path: path,
    projectFolder: projectFolder,

    /** Folder tujuan unggahan sesuai proyek & tahap, atau Asset Library sesuai tipe file. */
    uploadFolder: function (project, stage, fileType) {
      if (project) return child(projectFolder(project), STAGE_FOLDER[stage] || '02_WORKING');
      return path(['02_ASSET_LIBRARY', LIBRARY_FOLDER[fileType] || 'DOCUMENT']);
    },

    reportFolder: function (type) { return path(['03_REPORTS', type === 'DAILY' ? 'DAILY' : type === 'MONTHLY' ? 'MONTHLY' : 'WEEKLY']); },
    backupFolder: function () { return path(['05_SYSTEM_BACKUP']); },

    /** Mengambil ID file dari berbagai bentuk tautan Google Drive. */
    parseFileId: function (url) {
      var s = String(url || '').trim();
      if (/\/folders\//.test(s)) throw new AppError(ERR.VALIDATION, 'Itu tautan folder. Tempel tautan file (klik kanan file → Bagikan → Salin link).');
      var m = /\/d\/([A-Za-z0-9_-]{20,})/.exec(s) || /[?&]id=([A-Za-z0-9_-]{20,})/.exec(s) || /^([A-Za-z0-9_-]{25,})$/.exec(s);
      if (!m) throw new AppError(ERR.VALIDATION, 'Tautan Google Drive tidak dikenali. Contoh: https://drive.google.com/file/d/…/view');
      return m[1];
    }
  };
})();

// ==================== ProjectService.gs ====================
/**
 * ProjectService.gs — proyek & kategori.
 * Progres proyek tidak pernah diisi manual: dihitung dari bobot tugas (Repo.projectProgress).
 */
var CategoryService = {
  list: function () {
    return Db.all('CATEGORIES')
      .sort(function (a, b) { return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0); })
      .map(function (c) {
        return { categoryId: c.category_id, name: c.name, type: c.type || 'WORK', color: c.color || '#7868ED', active: U.isTrue(c.is_active) };
      });
  },

  save: function (user, p) {
    var name = U.required(p.name, 'Nama kategori', 2, 40);
    var color = /^#[0-9A-Fa-f]{6}$/.test(String(p.color || '')) ? String(p.color).toUpperCase() : '#7868ED';
    var all = Db.all('CATEGORIES');
    var dup = all.filter(function (c) { return String(c.name).toLowerCase() === name.toLowerCase() && c.category_id !== p.categoryId; });
    if (dup.length) throw new AppError(ERR.CONFLICT, 'Kategori "' + name + '" sudah ada.');
    if (p.categoryId) {
      if (!Db.findOne('CATEGORIES', 'category_id', String(p.categoryId))) throw new AppError(ERR.NOT_FOUND, 'Kategori tidak ditemukan.');
      Db.update('CATEGORIES', 'category_id', String(p.categoryId), {
        name: name, color: color, is_active: U.has(p, 'active') ? !!p.active : true
      });
      Audit.log(user, 'CATEGORY_UPDATED', 'CATEGORIES', p.categoryId, { name: name });
    } else {
      var max = all.reduce(function (m, c) { var n = Number(String(c.category_id).replace(/\D/g, '')) || 0; return Math.max(m, n); }, 0);
      var id = 'CAT-' + ('00' + (max + 1)).slice(-3);
      Db.insert('CATEGORIES', { category_id: id, name: name, type: 'WORK', color: color, is_active: true, sort_order: all.length + 1, created_at: U.now() });
      Audit.log(user, 'CATEGORY_CREATED', 'CATEGORIES', id, { name: name });
    }
    return CategoryService.list();
  }
};

var ProjectService = (function () {

  function nextId() {
    var year = U.today().slice(0, 4);
    var prefix = 'PRJ-' + year + '-';
    var max = 0;
    Db.all('PROJECTS').forEach(function (p) {
      var id = String(p.project_id);
      if (id.indexOf(prefix) === 0) max = Math.max(max, Number(id.slice(prefix.length)) || 0);
    });
    return prefix + ('000' + (max + 1)).slice(-4);
  }

  function readFields(p, current) {
    var out = {};
    var b = Repo.bundle();
    if (!current || U.has(p, 'name')) out.name = U.required(p.name, 'Nama proyek', 3, 120);
    if (U.has(p, 'description')) out.description = U.cleanText(p.description, 5000);
    if (U.has(p, 'objective')) out.objective = U.cleanText(p.objective, 2000);
    if (U.has(p, 'categoryId')) out.category_id = Repo.requireCategory(p.categoryId, b);
    if (U.has(p, 'status')) out.status = U.oneOf(p.status, PROJECT_STATUS, 'PLANNING', 'Status proyek');
    if (U.has(p, 'priority')) out.priority = U.oneOf(p.priority, PRIORITIES, 'MEDIUM', 'Prioritas');
    if (U.has(p, 'startDate')) out.start_date = U.dateOnly(p.startDate, 'Tanggal mulai');
    if (U.has(p, 'dueDate')) out.due_date = U.dateOnly(p.dueDate, 'Deadline');
    var vis = U.visibility(p, null);
    if (vis) out.visibility = vis;
    var start = U.has(out, 'start_date') ? out.start_date : (current ? U.dayKey(current.start_date) : '');
    var due = U.has(out, 'due_date') ? out.due_date : (current ? U.dayKey(current.due_date) : '');
    if (start && due && due < start) throw new AppError(ERR.VALIDATION, 'Deadline tidak boleh sebelum tanggal mulai.');
    return out;
  }

  function detail(projectId) {
    var b = Repo.bundle();
    var p = Repo.requireProject(projectId, b);
    var tasks = (b.tasksByProject[p.project_id] || []).map(function (t) { return Repo.taskDto(t, b); }).sort(Repo.taskSort);
    var activities = b.activities.filter(function (a) { return a.project_id === p.project_id; })
      .map(function (a) { return Repo.activityDto(a, b); }).sort(Repo.byDayDesc);
    var assetIds = {};
    b.links.forEach(function (l) {
      if (l.entity_type === 'PROJECT' && l.entity_id === p.project_id) assetIds[l.asset_id] = true;
      if (l.entity_type === 'TASK' && b.tasksById[l.entity_id] && b.tasksById[l.entity_id].project_id === p.project_id) assetIds[l.asset_id] = true;
    });
    var assets = b.assets.filter(function (a) { return a.project_id === p.project_id || assetIds[a.asset_id]; })
      .map(function (a) { return Repo.assetDto(a, b, { owner: true }); })
      .sort(function (x, y) { return x.createdAt < y.createdAt ? 1 : -1; });
    var reviews = b.reviews.filter(function (r) { return r.entity_type === 'PROJECT' && r.entity_id === p.project_id; })
      .map(Repo.reviewDto).sort(function (x, y) { return x.createdAt < y.createdAt ? 1 : -1; });
    return {
      project: Repo.projectDto(p, b, { owner: true }),
      tasks: tasks,
      activities: activities,
      assets: assets,
      reviews: reviews,
      minutes: activities.reduce(function (s, a) { return s + a.durationMinutes; }, 0)
    };
  }

  return {
    list: function (p) {
      p = p || {};
      var b = Repo.bundle();
      var status = p.status ? String(p.status).toUpperCase() : '';
      return b.projects
        .filter(function (x) {
          if (status === 'ACTIVE') return Repo.ACTIVE_PROJECT.indexOf(x.status) >= 0;
          if (status) return x.status === status;
          return x.status !== 'ARCHIVED';
        })
        .filter(function (x) { return U.matches(p.q, [x.name, x.project_id, x.description]); })
        .map(function (x) { return Repo.projectDto(x, b, { owner: true }); })
        .sort(Repo.projectSort);
    },

    get: function (p) { return detail(String(p.projectId || '')); },

    create: function (user, p) {
      var f = readFields(p, null);
      var now = U.now();
      var row = {
        project_id: nextId(), name: f.name, category_id: f.category_id || '', description: f.description || '',
        objective: f.objective || '', status: f.status || 'IN_PROGRESS', priority: f.priority || 'MEDIUM',
        start_date: f.start_date || U.today(), due_date: f.due_date || '', completed_at: '', progress: '',
        drive_folder_id: '', thumbnail_asset_id: '', visibility: f.visibility || VISIBILITY.SUPERVISOR,
        created_by: user.user_id, created_at: now, updated_at: now, is_deleted: false
      };
      if (row.due_date && row.due_date < row.start_date) row.start_date = row.due_date;
      if (row.status === 'DONE') row.completed_at = now;
      Db.insert('PROJECTS', row);
      var folderWarning = '';
      try { DriveService.projectFolder(row); } catch (e) {
        folderWarning = 'Folder Drive proyek belum dibuat dan akan dibuat otomatis saat unggah file pertama.';
      }
      Audit.log(user, 'PROJECT_CREATED', 'PROJECTS', row.project_id, { name: row.name });
      var out = detail(row.project_id);
      out.warning = folderWarning;
      return out;
    },

    update: function (user, p) {
      var id = String(p.projectId || '');
      var current = Repo.requireProject(id);
      var patch = readFields(p, current);
      if (patch.status && patch.status !== current.status) {
        patch.completed_at = patch.status === 'DONE' ? U.now() : (current.status === 'DONE' ? '' : current.completed_at);
      }
      patch.updated_at = U.now();
      Db.update('PROJECTS', 'project_id', id, patch);
      Audit.log(user, 'PROJECT_UPDATED', 'PROJECTS', id, { fields: Object.keys(patch) });
      return detail(id);
    },

    /** Hapus lunak: proyek & tugasnya ditandai is_deleted. File di Drive tidak dihapus. */
    remove: function (user, p) {
      var id = String(p.projectId || '');
      var current = Repo.requireProject(id);
      var now = U.now();
      Db.update('PROJECTS', 'project_id', id, { is_deleted: true, updated_at: now });
      Db.all('TASKS').filter(function (t) { return t.project_id === id && Repo.alive(t); })
        .forEach(function (t) { Db.update('TASKS', 'task_id', t.task_id, { is_deleted: true, updated_at: now }); });
      Audit.log(user, 'PROJECT_DELETED', 'PROJECTS', id, { name: current.name });
      return { projectId: id, deleted: true };
    }
  };
})();

// ==================== TaskService.gs ====================
/**
 * TaskService.gs — tugas proyek & tugas mandiri (tanpa proyek).
 * Setiap perubahan tugas menyinkronkan progres proyek terkait.
 */
var TaskService = (function () {

  function readFields(p, current, b) {
    var out = {};
    if (!current || U.has(p, 'title')) out.title = U.required(p.title, 'Judul tugas', 2, 200);
    if (U.has(p, 'description')) out.description = U.cleanText(p.description, 5000);
    if (U.has(p, 'projectId')) {
      out.project_id = p.projectId ? Repo.requireProject(p.projectId, b).project_id : '';
      out.is_standalone = !out.project_id;
    }
    if (U.has(p, 'categoryId')) out.category_id = Repo.requireCategory(p.categoryId, b);
    if (U.has(p, 'status')) out.status = U.oneOf(p.status, TASK_STATUS, 'TODO', 'Status tugas');
    if (U.has(p, 'priority')) out.priority = U.oneOf(p.priority, PRIORITIES, 'MEDIUM', 'Prioritas');
    if (U.has(p, 'weight')) out.weight = U.intRange(p.weight, 1, 5, 1, 'Bobot');
    if (U.has(p, 'progress')) out.progress = U.intRange(Math.round(Number(p.progress)), 0, 100, 0, 'Progres');
    if (U.has(p, 'plannedDate')) out.planned_date = U.dateOnly(p.plannedDate, 'Tanggal rencana');
    if (U.has(p, 'dueDate')) out.due_date = U.dateOnly(p.dueDate, 'Deadline');
    if (U.has(p, 'blockerNote')) out.blocker_note = U.cleanText(p.blockerNote, 1000);
    var vis = U.visibility(p, null);
    if (vis) out.visibility = vis;
    return out;
  }

  /** Aturan status ↔ progres agar data selalu masuk akal. */
  function applyStatusRules(patch, current, now) {
    var status = patch.status || (current ? current.status : 'TODO');
    var changed = !current || (patch.status && patch.status !== current.status);
    if (status === 'DONE') {
      patch.progress = 100;
      if (changed) patch.completed_at = now;
    } else if (changed && current && current.status === 'DONE') {
      patch.completed_at = '';
      if (!U.has(patch, 'progress')) patch.progress = status === 'TODO' ? 0 : 90;
    }
    if (status === 'TODO' && changed && !U.has(patch, 'progress')) patch.progress = 0;
    if ((status === 'IN_PROGRESS' || status === 'REVIEW') && (!current || !current.started_at)) patch.started_at = now;
    // Progres 100% dari slider → status otomatis Selesai (satu langkah, tidak perlu dua kali klik)
    if (U.has(patch, 'progress') && patch.progress === 100 && status !== 'DONE' && status !== 'CANCELLED') {
      patch.status = 'DONE';
      patch.completed_at = now;
    }
    if (U.has(patch, 'progress') && patch.progress > 0 && patch.progress < 100 && status === 'TODO' && !patch.status) {
      patch.status = 'IN_PROGRESS';
      if (!current || !current.started_at) patch.started_at = now;
    }
  }

  function one(id) {
    var b = Repo.bundle();
    return Repo.taskDto(Repo.requireTask(id, b), b);
  }

  return {
    list: function (p) {
      p = p || {};
      var b = Repo.bundle();
      var status = p.status ? String(p.status).toUpperCase() : '';
      return b.tasks
        .filter(function (t) {
          if (p.projectId === '__standalone') { if (t.project_id) return false; }
          else if (p.projectId && t.project_id !== p.projectId) return false;
          if (status === 'OPEN') return Repo.OPEN_TASK.indexOf(t.status) >= 0;
          if (status === 'OVERDUE') return Repo.taskOverdue(t);
          if (status) return t.status === status;
          return true;
        })
        .filter(function (t) { return U.matches(p.q, [t.title, t.task_id, t.description]); })
        .map(function (t) { return Repo.taskDto(t, b); })
        .sort(Repo.taskSort);
    },

    get: function (p) {
      var b = Repo.bundle();
      var t = Repo.requireTask(String(p.taskId || ''), b);
      var activities = b.activities.filter(function (a) { return a.task_id === t.task_id; })
        .map(function (a) { return Repo.activityDto(a, b); }).sort(Repo.byDayDesc);
      var assetIds = {};
      b.links.forEach(function (l) { if (l.entity_type === 'TASK' && l.entity_id === t.task_id) assetIds[l.asset_id] = true; });
      var assets = b.assets.filter(function (a) { return assetIds[a.asset_id]; }).map(function (a) { return Repo.assetDto(a, b, { owner: true }); });
      return { task: Repo.taskDto(t, b), activities: activities, assets: assets };
    },

    create: function (user, p) {
      var b = Repo.bundle();
      var f = readFields(p, null, b);
      var now = U.now();
      var row = {
        task_id: U.newId('TSK'), project_id: f.project_id || '', title: f.title, description: f.description || '',
        status: f.status || 'TODO', priority: f.priority || 'MEDIUM', weight: f.weight || 1, progress: f.progress || 0,
        planned_date: f.planned_date || '', due_date: f.due_date || '', completed_at: '', is_standalone: !f.project_id,
        visibility: f.visibility || VISIBILITY.SUPERVISOR, created_by: user.user_id, created_at: now, updated_at: now,
        is_deleted: false, category_id: f.category_id || '', blocker_note: f.blocker_note || '', started_at: ''
      };
      var rules = {};
      if (f.status) rules.status = f.status;
      if (U.has(f, 'progress')) rules.progress = row.progress;
      applyStatusRules(rules, null, now);
      Object.keys(rules).forEach(function (k) { row[k] = rules[k]; });
      Db.insert('TASKS', row);
      Repo.syncProjectProgress(row.project_id);
      Audit.log(user, 'TASK_CREATED', 'TASKS', row.task_id, { title: row.title, project: row.project_id });
      return one(row.task_id);
    },

    update: function (user, p) {
      var id = String(p.taskId || '');
      var b = Repo.bundle();
      var current = Repo.requireTask(id, b);
      var patch = readFields(p, current, b);
      var now = U.now();
      applyStatusRules(patch, current, now);
      patch.updated_at = now;
      Db.update('TASKS', 'task_id', id, patch);
      Repo.syncProjectProgress(current.project_id);
      if (U.has(patch, 'project_id') && patch.project_id !== current.project_id) Repo.syncProjectProgress(patch.project_id);
      if (patch.status && patch.status !== current.status) {
        Audit.log(user, 'TASK_STATUS', 'TASKS', id, { from: current.status, to: patch.status });
      }
      return one(id);
    },

    remove: function (user, p) {
      var id = String(p.taskId || '');
      var current = Repo.requireTask(id);
      Db.update('TASKS', 'task_id', id, { is_deleted: true, updated_at: U.now() });
      Repo.syncProjectProgress(current.project_id);
      Audit.log(user, 'TASK_DELETED', 'TASKS', id, { title: current.title });
      return { taskId: id, deleted: true };
    }
  };
})();

// ==================== ActivityService.gs ====================
/**
 * ActivityService.gs — catatan aktivitas harian (input cepat 10–30 detik).
 * Tanggal aktivitas (realisasi) dipisahkan dari tanggal rencana tugas agar laporan tidak salah membaca pekerjaan tertunda.
 */
var ActivityService = (function () {

  function readFields(p, current, b) {
    var out = {};
    if (!current || U.has(p, 'title')) out.title = U.required(p.title, 'Judul aktivitas', 3, 200);
    if (U.has(p, 'description')) out.description = U.cleanText(p.description, 3000);
    if (U.has(p, 'result')) out.result = U.cleanText(p.result, 500);
    if (U.has(p, 'categoryId')) out.category_id = Repo.requireCategory(p.categoryId, b);
    if (U.has(p, 'date')) {
      out.activity_date = U.dateOnly(p.date, 'Tanggal aktivitas') || U.today();
      if (out.activity_date > U.dayKey(U.addDays(new Date(), 1))) {
        throw new AppError(ERR.VALIDATION, 'Tanggal aktivitas tidak boleh di masa depan. Untuk rencana, buat tugas dengan deadline.');
      }
    }
    if (U.has(p, 'durationMinutes')) out.duration_minutes = U.intRange(p.durationMinutes, 0, 1440, 0, 'Durasi (menit)');
    if (U.has(p, 'blockerNote')) out.blocker_note = U.cleanText(p.blockerNote, 1000);
    if (U.has(p, 'taskId')) {
      out.task_id = p.taskId ? Repo.requireTask(p.taskId, b).task_id : '';
      if (out.task_id) out.project_id = b.tasksById[out.task_id].project_id || '';
    }
    if (U.has(p, 'projectId') && !out.task_id) out.project_id = p.projectId ? Repo.requireProject(p.projectId, b).project_id : '';
    var vis = U.visibility(p, null);
    if (vis) out.visibility = vis;
    return out;
  }

  function one(id) {
    var b = Repo.bundle();
    var a = b.activities.filter(function (x) { return x.activity_id === id; })[0];
    if (!a) throw new AppError(ERR.NOT_FOUND, 'Aktivitas tidak ditemukan.');
    return Repo.activityDto(a, b);
  }

  function inRange(a, from, to) {
    var d = U.dayKey(a.activity_date || a.created_at);
    return (!from || d >= from) && (!to || d <= to);
  }

  return {
    inRange: inRange,

    list: function (p) {
      p = p || {};
      var b = Repo.bundle();
      var from = U.dateOnly(p.from, 'Tanggal awal'), to = U.dateOnly(p.to, 'Tanggal akhir');
      var limit = U.intRange(p.limit, 1, 500, 200, 'Batas');
      var items = b.activities
        .filter(function (a) { return inRange(a, from, to); })
        .filter(function (a) { return !p.projectId || a.project_id === p.projectId; })
        .filter(function (a) { return U.matches(p.q, [a.title, a.description, a.result]); })
        .map(function (a) { return Repo.activityDto(a, b); })
        .sort(Repo.byDayDesc);
      return {
        items: items.slice(0, limit),
        total: items.length,
        totalMinutes: items.reduce(function (s, a) { return s + a.durationMinutes; }, 0)
      };
    },

    create: function (user, p) {
      var b = Repo.bundle();
      if (!U.has(p, 'date')) p.date = U.today();
      var f = readFields(p, null, b);
      var now = U.now();
      var row = {
        activity_id: U.newId('ACT'), title: f.title, description: f.description || '', category_id: f.category_id || '',
        project_id: f.project_id || '', task_id: f.task_id || '', content_id: '', result: f.result || '',
        activity_date: f.activity_date || U.today(), planned_date: '', visibility: f.visibility || VISIBILITY.SUPERVISOR,
        created_by: user.user_id, created_at: now, duration_minutes: f.duration_minutes || 0,
        blocker_note: f.blocker_note || '', updated_at: now, is_deleted: false
      };
      Db.insert('ACTIVITY_LOG', row);
      // Mencatat aktivitas pada tugas "Belum mulai" otomatis menandai tugas sedang dikerjakan.
      if (row.task_id && b.tasksById[row.task_id] && b.tasksById[row.task_id].status === 'TODO' && p.markTaskInProgress !== false) {
        TaskService.update(user, { taskId: row.task_id, status: 'IN_PROGRESS' });
      }
      return one(row.activity_id);
    },

    update: function (user, p) {
      var id = String(p.activityId || '');
      var b = Repo.bundle();
      var current = b.activities.filter(function (x) { return x.activity_id === id; })[0];
      if (!current) throw new AppError(ERR.NOT_FOUND, 'Aktivitas tidak ditemukan.');
      var patch = readFields(p, current, b);
      patch.updated_at = U.now();
      Db.update('ACTIVITY_LOG', 'activity_id', id, patch);
      return one(id);
    },

    remove: function (user, p) {
      var id = String(p.activityId || '');
      var current = Db.findOne('ACTIVITY_LOG', 'activity_id', id);
      if (!current || !Repo.alive(current)) throw new AppError(ERR.NOT_FOUND, 'Aktivitas tidak ditemukan.');
      Db.update('ACTIVITY_LOG', 'activity_id', id, { is_deleted: true, updated_at: U.now() });
      Audit.log(user, 'ACTIVITY_DELETED', 'ACTIVITY_LOG', id, { title: current.title });
      return { activityId: id, deleted: true };
    }
  };
})();

// ==================== AssetService.gs ====================
/**
 * AssetService.gs — arsip file & bukti kerja di Google Drive.
 *
 * - Unggah langsung (≤ 10 MB) atau tautkan file yang sudah ada di Drive (untuk video besar).
 * - Satu file bisa dipakai banyak entitas (ASSET_LINKS) tanpa diunggah ulang.
 * - Pratinjau (thumbnail) disajikan lewat server, sehingga folder Drive tidak perlu dibagikan.
 * - Atasan membuka file asli hanya bila visibilitasnya SUPERVISOR: akses viewer diberikan saat dibuka,
 *   dan dicabut otomatis bila file dijadikan pribadi, dihapus, atau akses atasan dicabut.
 */
var AssetService = (function () {
  var THUMB_PREFIX = 'mcms:thumb:';
  var LINK_TYPES = ['PROJECT', 'TASK', 'ACTIVITY'];

  function sanitizeFileName(name) {
    var s = U.cleanText(name, 150).replace(/[\\/:*?"<>|]+/g, '_');
    if (!s || /^\.+$/.test(s)) throw new AppError(ERR.VALIDATION, 'Nama file tidak valid.');
    return s;
  }

  function mimeAllowed(mime) {
    return UPLOAD_MIME_ALLOW.some(function (re) { return re.test(mime); });
  }

  function addLink(assetId, entityType, entityId, relation) {
    var exists = Db.all('ASSET_LINKS').some(function (l) {
      return l.asset_id === assetId && l.entity_type === entityType && l.entity_id === entityId;
    });
    if (exists) return;
    Db.insert('ASSET_LINKS', {
      link_id: U.newId('LNK'), asset_id: assetId, entity_type: entityType, entity_id: entityId,
      relation: relation || 'EVIDENCE', created_at: U.now()
    });
  }

  /** Validasi & kumpulkan relasi (proyek/tugas/aktivitas) dari payload. */
  function readRelations(p, b) {
    var rel = { projectId: '', taskId: '', activityId: '' };
    if (p.taskId) {
      var t = Repo.requireTask(p.taskId, b);
      rel.taskId = t.task_id;
      rel.projectId = t.project_id || '';
    }
    if (p.projectId) rel.projectId = Repo.requireProject(p.projectId, b).project_id;
    if (p.activityId) {
      var a = b.activities.filter(function (x) { return x.activity_id === String(p.activityId); })[0];
      if (!a) throw new AppError(ERR.NOT_FOUND, 'Aktivitas tidak ditemukan.');
      rel.activityId = a.activity_id;
      if (!rel.projectId) rel.projectId = a.project_id || '';
    }
    return rel;
  }

  function record(user, file, meta, rel, source) {
    var now = U.now();
    var row = {
      asset_id: U.newId('AST'), drive_file_id: file.id, file_name: meta.fileName, mime_type: meta.mimeType,
      size_bytes: meta.size, category: meta.categoryId || '', purpose: meta.stage, visibility: meta.visibility,
      uploaded_by: user.user_id, created_at: now, is_deleted: false, file_type: Repo.fileTypeOf(meta.mimeType),
      source: source, description: meta.description, project_id: rel.projectId, shared_with: '', updated_at: now
    };
    Db.insert('ASSETS', row);
    if (rel.projectId && !rel.taskId) addLink(row.asset_id, 'PROJECT', rel.projectId, meta.stage);
    if (rel.taskId) addLink(row.asset_id, 'TASK', rel.taskId, meta.stage);
    if (rel.activityId) addLink(row.asset_id, 'ACTIVITY', rel.activityId, meta.stage);
    Audit.log(user, source === 'LINK' ? 'ASSET_LINKED' : 'ASSET_UPLOADED', 'ASSETS', row.asset_id, { name: row.file_name, size: row.size_bytes });
    return row.asset_id;
  }

  function readMeta(p) {
    return {
      stage: U.oneOf(p.stage, ASSET_STAGES, 'EVIDENCE', 'Tahap file'),
      description: U.cleanText(p.description, 1000),
      visibility: U.visibility(p, VISIBILITY.SUPERVISOR)
    };
  }

  function one(assetId) {
    var b = Repo.bundle();
    var a = b.assets.filter(function (x) { return x.asset_id === assetId; })[0];
    if (!a) throw new AppError(ERR.NOT_FOUND, 'File tidak ditemukan.');
    return Repo.assetDto(a, b, { owner: true });
  }

  function sharedList(a) { return String(a.shared_with || '').split(',').map(function (s) { return s.trim(); }).filter(String); }

  /** Mencabut akses viewer atasan dari satu aset (dipakai saat jadi pribadi/dihapus). */
  function unshareAll(a) {
    var list = sharedList(a);
    if (!list.length || !a.drive_file_id) return;
    try {
      var f = DriveApp.getFileById(a.drive_file_id);
      list.forEach(function (email) { try { f.removeViewer(email); } catch (e) { /* sudah tidak punya akses */ } });
    } catch (e) { console.error('Cabut akses file gagal: ' + e.message); }
    Db.update('ASSETS', 'asset_id', a.asset_id, { shared_with: '' });
  }

  function requireAsset(id) {
    var a = Db.findOne('ASSETS', 'asset_id', String(id || ''));
    if (!a || !Repo.alive(a) || a.category === 'BRANDING') throw new AppError(ERR.NOT_FOUND, 'File tidak ditemukan atau sudah dihapus.');
    return a;
  }

  /** Atasan: aset harus berada dalam scope atasan. */
  function requireVisibleForSupervisor(id) {
    var b = Repo.bundle();
    var scope = Repo.supervisorScope(b);
    var a = scope.assets.filter(function (x) { return x.asset_id === String(id || ''); })[0];
    if (!a) throw new AppError(ERR.FORBIDDEN, 'File ini tidak dibagikan ke atasan.');
    return a;
  }

  return {
    unshareAll: unshareAll,

    list: function (p) {
      p = p || {};
      var b = Repo.bundle();
      var type = p.fileType ? String(p.fileType).toUpperCase() : '';
      var items = b.assets
        .filter(function (a) { return !type || (a.file_type || Repo.fileTypeOf(a.mime_type)) === type; })
        .filter(function (a) { return !p.projectId || a.project_id === p.projectId; })
        .filter(function (a) { return !p.visibility || a.visibility === p.visibility; })
        .filter(function (a) { return U.matches(p.q, [a.file_name, a.description, a.asset_id]); })
        .map(function (a) { return Repo.assetDto(a, b, { owner: true }); })
        .sort(function (x, y) { return x.createdAt < y.createdAt ? 1 : -1; });
      return { items: items, totalBytes: items.reduce(function (s, a) { return s + a.sizeBytes; }, 0) };
    },

    upload: function (user, p) {
      var b = Repo.bundle();
      var fileName = sanitizeFileName(p.fileName);
      var mime = String(p.mimeType || '').toLowerCase();
      if (!mimeAllowed(mime)) {
        throw new AppError(ERR.VALIDATION, 'Tipe file ini tidak didukung. Gunakan foto, video, audio, PDF, dokumen Office, atau file desain.');
      }
      var data = String(p.dataBase64 || '');
      if (!data || !/^[A-Za-z0-9+/=]+$/.test(data)) throw new AppError(ERR.VALIDATION, 'Isi file kosong atau rusak.');
      var approxBytes = Math.floor(data.length * 3 / 4);
      if (approxBytes > UPLOAD_MAX_BYTES + 4) {
        throw new AppError(ERR.VALIDATION, 'File lebih dari 10 MB. Unggah langsung ke Google Drive, lalu gunakan "Tautkan dari Drive".');
      }
      var bytes = Utilities.base64Decode(data);
      if (/^image\/(png|jpeg|webp)$/.test(mime)) U.checkImageSignature(mime, bytes);
      var meta = readMeta(p);
      meta.fileName = fileName; meta.mimeType = mime; meta.size = bytes.length;
      var rel = readRelations(p, b);
      var project = rel.projectId ? b.projectsById[rel.projectId] : null;
      var file;
      try {
        var folder = DriveService.uploadFolder(project, meta.stage, Repo.fileTypeOf(mime));
        file = folder.createFile(Utilities.newBlob(bytes, mime, fileName));
      } catch (e) {
        if (e instanceof AppError) throw e;
        throw new AppError(ERR.INTERNAL, 'File gagal disimpan ke Google Drive (kuota penuh atau gangguan). Data tidak dicatat. Coba lagi.');
      }
      var id = record(user, { id: file.getId() }, meta, rel, 'UPLOAD');
      return one(id);
    },

    /** Menautkan file yang sudah ada di Drive pemilik (tanpa unggah ulang). */
    linkDrive: function (user, p) {
      var b = Repo.bundle();
      var fileId = DriveService.parseFileId(p.url);
      var dup = b.assets.filter(function (a) { return a.drive_file_id === fileId; })[0];
      if (dup) throw new AppError(ERR.CONFLICT, 'File ini sudah ada di arsip sebagai "' + dup.file_name + '".', { assetId: dup.asset_id });
      var f;
      try { f = DriveApp.getFileById(fileId); } catch (e) {
        throw new AppError(ERR.NOT_FOUND, 'File tidak ditemukan atau akun pemilik tidak punya akses ke file tersebut.');
      }
      var meta = readMeta(p);
      meta.fileName = sanitizeFileName(p.fileName || f.getName());
      meta.mimeType = String(f.getMimeType() || 'application/octet-stream');
      meta.size = Number(f.getSize()) || 0;
      var rel = readRelations(p, b);
      var id = record(user, { id: fileId }, meta, rel, 'LINK');
      return one(id);
    },

    update: function (user, p) {
      var a = requireAsset(p.assetId);
      var patch = { updated_at: U.now() };
      if (U.has(p, 'description')) patch.description = U.cleanText(p.description, 1000);
      if (U.has(p, 'stage')) patch.purpose = U.oneOf(p.stage, ASSET_STAGES, 'EVIDENCE', 'Tahap file');
      if (U.has(p, 'fileName')) patch.file_name = sanitizeFileName(p.fileName);
      var vis = U.visibility(p, null);
      if (vis) patch.visibility = vis;
      Db.update('ASSETS', 'asset_id', a.asset_id, patch);
      if (vis === VISIBILITY.PRIVATE && a.visibility !== VISIBILITY.PRIVATE) unshareAll(Db.findOne('ASSETS', 'asset_id', a.asset_id));
      if (vis && vis !== a.visibility) Audit.log(user, 'ASSET_VISIBILITY', 'ASSETS', a.asset_id, { from: a.visibility, to: vis });
      return one(a.asset_id);
    },

    /** Tambah / hapus relasi file ke proyek atau tugas. */
    setLink: function (user, p) {
      var a = requireAsset(p.assetId);
      var type = U.oneOf(p.entityType, LINK_TYPES, '', 'Jenis relasi');
      var b = Repo.bundle();
      var entityId = type === 'PROJECT' ? Repo.requireProject(p.entityId, b).project_id : type === 'TASK' ? Repo.requireTask(p.entityId, b).task_id : String(p.entityId || '');
      if (p.remove) {
        Db.all('ASSET_LINKS').filter(function (l) { return l.asset_id === a.asset_id && l.entity_type === type && l.entity_id === entityId; })
          .forEach(function (l) { Db.update('ASSET_LINKS', 'link_id', l.link_id, { entity_type: 'REMOVED' }); });
      } else {
        addLink(a.asset_id, type, entityId, 'EVIDENCE');
        if (type === 'PROJECT' && !a.project_id) Db.update('ASSETS', 'asset_id', a.asset_id, { project_id: entityId });
      }
      return one(a.asset_id);
    },

    /** Hapus dari arsip MCMS (file asli tetap ada di Google Drive). */
    remove: function (user, p) {
      var a = requireAsset(p.assetId);
      unshareAll(a);
      Db.update('ASSETS', 'asset_id', a.asset_id, { is_deleted: true, updated_at: U.now() });
      Audit.log(user, 'ASSET_REMOVED', 'ASSETS', a.asset_id, { name: a.file_name });
      return { assetId: a.asset_id, deleted: true };
    },

    /** Thumbnail kecil sebagai data URL. OWNER: semua aset; SUPERVISOR: hanya yang dibagikan. */
    thumbs: function (user, p) {
      var ids = Array.isArray(p.ids) ? p.ids.slice(0, 12).map(String) : [];
      var allowed;
      if (user.role === ROLES.OWNER) allowed = Repo.indexBy(Repo.bundle().assets, 'asset_id');
      else allowed = Repo.indexBy(Repo.supervisorScope(Repo.bundle()).assets, 'asset_id');
      var cache = CacheService.getScriptCache();
      var out = {};
      ids.forEach(function (id) {
        var a = allowed[id];
        if (!a || !a.drive_file_id) { out[id] = ''; return; }
        var hit = cache.get(THUMB_PREFIX + id);
        if (hit !== null && hit !== undefined) { out[id] = hit; return; }
        var url = '';
        try {
          var f = DriveApp.getFileById(a.drive_file_id);
          var blob = f.getThumbnail();
          if (blob) {
            var mime = blob.getContentType() || 'image/png';
            if (/^image\/(png|jpeg|webp|gif)$/.test(mime)) url = 'data:' + mime + ';base64,' + Utilities.base64Encode(blob.getBytes());
          }
        } catch (e) { url = ''; }
        if (url.length > 95000) url = '';
        try { cache.put(THUMB_PREFIX + id, url, url ? 21600 : 600); } catch (e) { /* abaikan */ }
        out[id] = url;
      });
      return out;
    },

    /** Membuka file asli. Atasan diberi akses viewer saat itu juga (hanya untuk file yang dibagikan). */
    open: function (user, p) {
      var a;
      if (user.role === ROLES.OWNER) a = requireAsset(p.assetId);
      else {
        a = requireVisibleForSupervisor(p.assetId);
        var list = sharedList(a);
        var email = String(user.email).toLowerCase();
        if (list.indexOf(email) < 0) {
          try { DriveApp.getFileById(a.drive_file_id).addViewer(email); } catch (e) {
            throw new AppError(ERR.INTERNAL, 'Akses file belum bisa diberikan. Coba lagi atau minta pemilik membagikannya.');
          }
          list.push(email);
          Db.update('ASSETS', 'asset_id', a.asset_id, { shared_with: list.join(',') });
          Audit.log(user, 'ASSET_SHARED_ON_OPEN', 'ASSETS', a.asset_id, { email: email });
        }
      }
      return { url: 'https://drive.google.com/file/d/' + a.drive_file_id + '/view', fileName: a.file_name };
    },

    /** Dipanggil saat akses atasan dicabut: hapus dia dari semua file yang pernah dibagikan. */
    revokeUserEverywhere: function (email) {
      email = String(email || '').toLowerCase();
      Db.all('ASSETS').forEach(function (a) {
        var list = sharedList(a);
        if (list.indexOf(email) < 0) return;
        try { DriveApp.getFileById(a.drive_file_id).removeViewer(email); } catch (e) { /* abaikan */ }
        Db.update('ASSETS', 'asset_id', a.asset_id, { shared_with: list.filter(function (x) { return x !== email; }).join(',') });
      });
    }
  };
})();

// ==================== ReportService.gs ====================
/**
 * ReportService.gs — laporan harian, mingguan, bulanan.
 *
 * - Saat dibuat, data periode dibekukan ke snapshot_json. Perubahan data setelahnya tidak mengubah laporan.
 * - Secara default laporan hanya memuat data yang dibagikan ke atasan. Laporan yang memuat data pribadi
 *   tidak bisa diterbitkan ke atasan.
 * - Status: DRAFT (bisa diedit catatannya / diperbarui datanya) → PUBLISHED (terlihat oleh atasan).
 */
var ReportService = (function () {
  var MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var TYPE_LABEL = { DAILY: 'Harian', WEEKLY: 'Mingguan', MONTHLY: 'Bulanan' };

  function d(s) { return new Date(s + 'T00:00:00Z'); }
  function key(dt) { return dt.toISOString().slice(0, 10); }
  function shift(s, days) { return key(new Date(d(s).getTime() + days * 86400000)); }

  function period(type, dateStr) {
    var s = dateStr || U.today();
    if (type === 'DAILY') return { start: s, end: s };
    if (type === 'WEEKLY') {
      var dow = d(s).getUTCDay(); // 0 = Minggu
      var start = shift(s, -((dow + 6) % 7));
      return { start: start, end: shift(start, 6) };
    }
    var first = s.slice(0, 8) + '01';
    var dt = d(first);
    var next = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 1));
    return { start: first, end: key(new Date(next.getTime() - 86400000)) };
  }

  function fmtShort(s) { var x = d(s); return x.getUTCDate() + ' ' + MONTHS_SHORT[x.getUTCMonth()] + ' ' + x.getUTCFullYear(); }

  function periodLabel(type, pr) {
    var a = d(pr.start), b = d(pr.end);
    if (type === 'DAILY') return DAYS[a.getUTCDay()] + ', ' + a.getUTCDate() + ' ' + MONTHS[a.getUTCMonth()] + ' ' + a.getUTCFullYear();
    if (type === 'MONTHLY') return MONTHS[a.getUTCMonth()] + ' ' + a.getUTCFullYear();
    if (a.getUTCMonth() === b.getUTCMonth()) return a.getUTCDate() + '–' + b.getUTCDate() + ' ' + MONTHS_SHORT[b.getUTCMonth()] + ' ' + b.getUTCFullYear();
    return fmtShort(pr.start) + ' – ' + fmtShort(pr.end);
  }

  function within(v, pr) { var k = U.dayKey(v); return !!k && k >= pr.start && k <= pr.end; }

  function buildSnapshot(type, pr, includePrivate) {
    var b = Repo.bundle();
    var src = includePrivate ? { projects: b.projects, tasks: b.tasks, activities: b.activities, assets: b.assets } : Repo.supervisorScope(b);
    var nextEnd = shift(pr.end, 7);
    var tasks = src.tasks.map(function (t) { return Repo.taskDto(t, b); });
    var done = tasks.filter(function (t) { return t.status === 'DONE' && within(t.completedAt, pr); });
    var created = tasks.filter(function (t) { return within(t.createdAt, pr); });
    var open = tasks.filter(function (t) { return Repo.OPEN_TASK.indexOf(t.status) >= 0; });
    var pending = open.filter(function (t) { return t.dueDate && t.dueDate <= pr.end; });
    var upcoming = open.filter(function (t) { return t.dueDate && t.dueDate > pr.end && t.dueDate <= nextEnd; });
    var acts = src.activities.filter(function (a) { return within(a.activity_date || a.created_at, pr); })
      .map(function (a) { return Repo.activityDto(a, b); }).sort(Repo.byDayDesc).reverse();
    var assets = src.assets.filter(function (a) { return within(a.created_at, pr); }).map(function (a) { return Repo.assetDto(a, b, {}); });
    var projects = src.projects
      .filter(function (p) { return Repo.ACTIVE_PROJECT.indexOf(p.status) >= 0 || (p.status === 'DONE' && within(p.completed_at, pr)); })
      .map(function (p) { return Repo.projectDto(p, b, {}); }).sort(Repo.projectSort);
    var blockers = [];
    open.forEach(function (t) { if (t.blockerNote) blockers.push({ source: 'Tugas', title: t.title, note: t.blockerNote }); });
    acts.forEach(function (a) { if (a.blockerNote) blockers.push({ source: 'Aktivitas ' + a.date, title: a.title, note: a.blockerNote }); });
    var minutes = acts.reduce(function (s, a) { return s + a.durationMinutes; }, 0);

    var snap = {
      version: 1,
      type: type,
      period: { start: pr.start, end: pr.end, label: periodLabel(type, pr) },
      generatedAt: new Date().toISOString(),
      scope: includePrivate ? 'ALL' : 'SUPERVISOR',
      stats: {
        tasksDone: done.length, tasksCreated: created.length, activities: acts.length, hours: Math.round(minutes / 6) / 10,
        assetsAdded: assets.length, activeProjects: projects.filter(function (p) { return p.status !== 'DONE'; }).length,
        projectsCompleted: projects.filter(function (p) { return p.status === 'DONE'; }).length,
        pending: pending.length, overdue: pending.filter(function (t) { return t.overdue; }).length
      },
      projects: projects.map(function (p) {
        return { projectId: p.projectId, name: p.name, status: p.status, progress: p.progress, dueDate: p.dueDate, overdue: p.overdue, taskDone: p.taskDone, taskCount: p.taskCount };
      }),
      tasksDone: done.map(function (t) { return { title: t.title, projectName: t.projectName, completedAt: t.completedAt.slice(0, 10) }; }),
      activities: acts.map(function (a) {
        return { date: a.date, title: a.title, result: a.result, projectName: a.projectName, durationMinutes: a.durationMinutes, description: a.description };
      }),
      pending: pending.map(function (t) { return { title: t.title, projectName: t.projectName, dueDate: t.dueDate, status: t.status, overdue: t.overdue, progress: t.progress }; }),
      upcoming: upcoming.map(function (t) { return { title: t.title, projectName: t.projectName, dueDate: t.dueDate }; }),
      blockers: blockers,
      assets: assets.map(function (a) { return { assetId: a.assetId, fileName: a.fileName, fileType: a.fileType, projectName: a.projectName }; }),
      truncated: false
    };
    return fit(snap);
  }

  /** Menjaga snapshot muat dalam satu sel Sheets (±50.000 karakter). */
  function fit(snap) {
    var lists = ['activities', 'tasksDone', 'assets', 'pending', 'upcoming', 'blockers', 'projects'];
    var guard = 0;
    while (JSON.stringify(snap).length > SNAPSHOT_MAX_CHARS && guard++ < 40) {
      snap.truncated = true;
      if (snap.activities.some(function (a) { return a.description; })) { snap.activities.forEach(function (a) { a.description = ''; }); continue; }
      var biggest = lists.slice().sort(function (x, y) { return JSON.stringify(snap[y]).length - JSON.stringify(snap[x]).length; })[0];
      snap[biggest] = snap[biggest].slice(0, Math.max(5, Math.floor(snap[biggest].length * 0.7)));
    }
    return snap;
  }

  function dto(r, opts) {
    opts = opts || {};
    var snap = null;
    try { snap = r.snapshot_json ? JSON.parse(r.snapshot_json) : null; } catch (e) { snap = null; }
    var out = {
      reportId: r.report_id, type: r.type, typeLabel: TYPE_LABEL[r.type] || r.type, title: r.title,
      periodStart: U.dayKey(r.period_start), periodEnd: U.dayKey(r.period_end), status: r.status || 'DRAFT',
      includePrivate: U.isTrue(r.include_private), summaryNote: r.summary_note || '', nextPlan: r.next_plan || '',
      obstacles: r.obstacles || '', createdAt: U.toIso(r.created_at), publishedAt: U.toIso(r.published_at),
      updatedAt: U.toIso(r.updated_at), stats: snap ? snap.stats : null,
      pdfUrl: opts.owner && r.drive_file_id ? 'https://drive.google.com/file/d/' + r.drive_file_id + '/view' : ''
    };
    if (opts.full) {
      out.snapshot = snap;
      out.reviews = Db.all('REVIEW_LOG').filter(function (x) { return x.entity_type === 'REPORT' && x.entity_id === r.report_id; })
        .map(Repo.reviewDto).sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
    }
    return out;
  }

  function requireReport(id) {
    var r = Db.findOne('REPORTS', 'report_id', String(id || ''));
    if (!r || !Repo.alive(r)) throw new AppError(ERR.NOT_FOUND, 'Laporan tidak ditemukan.');
    return r;
  }

  function supervisorCanSee(r) { return r.status === 'PUBLISHED' && !U.isTrue(r.include_private); }

  function sortDesc(a, b) {
    if (a.periodStart !== b.periodStart) return a.periodStart < b.periodStart ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  }

  function readNotes(p) {
    var out = {};
    if (U.has(p, 'summaryNote')) out.summary_note = U.cleanText(p.summaryNote, 3000);
    if (U.has(p, 'nextPlan')) out.next_plan = U.cleanText(p.nextPlan, 2000);
    if (U.has(p, 'obstacles')) out.obstacles = U.cleanText(p.obstacles, 2000);
    return out;
  }

  function pdfHtml(r) {
    var s = JSON.parse(r.snapshot_json || '{}');
    var brand = BrandingService.getPublic();
    var e = U.escapeHtml;
    function list(items, fn, empty) {
      return items && items.length ? '<ul>' + items.map(function (x) { return '<li>' + fn(x) + '</li>'; }).join('') + '</ul>' : '<p class="m">' + empty + '</p>';
    }
    var st = s.stats || {};
    var statCells = [['Tugas selesai', st.tasksDone], ['Aktivitas', st.activities], ['Jam kerja', st.hours], ['File/bukti baru', st.assetsAdded], ['Proyek aktif', st.activeProjects], ['Tugas tertunda', st.pending]]
      .map(function (c) { return '<td><div class="v">' + e(c[1]) + '</div><div class="l">' + c[0] + '</div></td>'; }).join('');
    return '<html><head><meta charset="utf-8"><style>' +
      'body{font-family:Arial,sans-serif;color:#171B2B;font-size:11pt;margin:28px}h1{font-size:18pt;margin:0 0 4px;color:#4A3BB8}' +
      'h2{font-size:12.5pt;margin:20px 0 6px;border-bottom:1px solid #E6E8EF;padding-bottom:4px}.m{color:#4B5563}' +
      'table.s{width:100%;border-collapse:collapse;margin:14px 0}table.s td{border:1px solid #E6E8EF;padding:8px;text-align:center}' +
      '.v{font-size:15pt;font-weight:bold}.l{font-size:9pt;color:#4B5563}li{margin:3px 0}.n{white-space:pre-wrap}' +
      '</style></head><body>' +
      '<div class="m">' + e(brand.appName) + (brand.organizationName ? ' · ' + e(brand.organizationName) : '') + '</div>' +
      '<h1>' + e(r.title) + '</h1><div class="m">Periode ' + e(s.period ? s.period.label : '') + ' · dibuat ' +
      e(Utilities.formatDate(U.asDate(r.created_at) || new Date(), U.timezone(), 'dd/MM/yyyy HH:mm')) + '</div>' +
      '<table class="s"><tr>' + statCells + '</tr></table>' +
      (r.summary_note ? '<h2>Ringkasan</h2><div class="n">' + e(r.summary_note) + '</div>' : '') +
      '<h2>Progres proyek</h2>' + list(s.projects, function (p) { return '<b>' + e(p.name) + '</b> — ' + (p.progress === null ? 'belum ada tugas' : p.progress + '%') + (p.dueDate ? ' · deadline ' + e(p.dueDate) : '') + (p.overdue ? ' · <b>terlambat</b>' : ''); }, 'Tidak ada proyek aktif.') +
      '<h2>Pekerjaan selesai</h2>' + list(s.tasksDone, function (t) { return e(t.title) + (t.projectName ? ' <span class="m">(' + e(t.projectName) + ')</span>' : ''); }, 'Belum ada tugas selesai pada periode ini.') +
      '<h2>Aktivitas</h2>' + list(s.activities, function (a) { return e(a.date) + ' — ' + e(a.title) + (a.result ? ': ' + e(a.result) : ''); }, 'Belum ada aktivitas tercatat.') +
      '<h2>Pekerjaan tertunda</h2>' + list(s.pending, function (t) { return e(t.title) + ' · deadline ' + e(t.dueDate) + (t.overdue ? ' (terlambat)' : ''); }, 'Tidak ada.') +
      (s.blockers && s.blockers.length ? '<h2>Kendala</h2>' + list(s.blockers, function (x) { return '<b>' + e(x.title) + '</b>: ' + e(x.note); }, '') : '') +
      (r.obstacles ? '<h2>Catatan kendala</h2><div class="n">' + e(r.obstacles) + '</div>' : '') +
      '<h2>Rencana berikutnya</h2>' + (r.next_plan ? '<div class="n">' + e(r.next_plan) + '</div>' : '') +
      list(s.upcoming, function (t) { return e(t.title) + ' · ' + e(t.dueDate); }, r.next_plan ? '' : 'Belum ada deadline pada periode berikutnya.') +
      '</body></html>';
  }

  return {
    period: period,
    periodLabel: periodLabel,

    list: function () {
      return Db.all('REPORTS').filter(Repo.alive).map(function (r) { return dto(r, { owner: true }); }).sort(sortDesc);
    },

    listPublished: function () {
      return Db.all('REPORTS').filter(function (r) { return Repo.alive(r) && supervisorCanSee(r); })
        .map(function (r) { return dto(r, {}); }).sort(sortDesc);
    },

    get: function (user, p) {
      var r = requireReport(p.reportId);
      if (user.role !== ROLES.OWNER && !supervisorCanSee(r)) throw new AppError(ERR.FORBIDDEN, 'Laporan ini belum diterbitkan untuk atasan.');
      return dto(r, { owner: user.role === ROLES.OWNER, full: true });
    },

    /** Pratinjau tanpa menyimpan (dipakai form "Buat laporan"). */
    preview: function (user, p) {
      var type = U.oneOf(p.type, REPORT_TYPES, 'WEEKLY', 'Jenis laporan');
      var pr = period(type, U.dateOnly(p.date, 'Tanggal') || U.today());
      return buildSnapshot(type, pr, !!p.includePrivate);
    },

    generate: function (user, p) {
      var type = U.oneOf(p.type, REPORT_TYPES, 'WEEKLY', 'Jenis laporan');
      var pr = period(type, U.dateOnly(p.date, 'Tanggal') || U.today());
      var includePrivate = !!p.includePrivate;
      var snap = buildSnapshot(type, pr, includePrivate);
      var now = U.now();
      var notes = readNotes(p);
      var row = {
        report_id: U.newId('RPT'), type: type, period_start: pr.start, period_end: pr.end,
        title: 'Laporan ' + TYPE_LABEL[type] + ' · ' + snap.period.label, snapshot_json: JSON.stringify(snap),
        drive_file_id: '', status: 'DRAFT', generated_by: user.user_id, created_at: now,
        summary_note: notes.summary_note || '', next_plan: notes.next_plan || '', obstacles: notes.obstacles || '',
        include_private: includePrivate, published_at: '', updated_at: now, is_deleted: false
      };
      Db.insert('REPORTS', row);
      Audit.log(user, 'REPORT_GENERATED', 'REPORTS', row.report_id, { type: type, period: pr });
      return dto(Db.findOne('REPORTS', 'report_id', row.report_id), { owner: true, full: true });
    },

    update: function (user, p) {
      var r = requireReport(p.reportId);
      if (r.status === 'PUBLISHED') throw new AppError(ERR.CONFLICT, 'Laporan sudah diterbitkan. Tarik kembali ke draf untuk mengubahnya.');
      var patch = readNotes(p);
      if (p.refreshData) {
        var pr = { start: U.dayKey(r.period_start), end: U.dayKey(r.period_end) };
        patch.snapshot_json = JSON.stringify(buildSnapshot(r.type, pr, U.isTrue(r.include_private)));
      }
      patch.updated_at = U.now();
      Db.update('REPORTS', 'report_id', r.report_id, patch);
      return dto(Db.findOne('REPORTS', 'report_id', r.report_id), { owner: true, full: true });
    },

    publish: function (user, p) {
      var r = requireReport(p.reportId);
      var unpublish = !!p.unpublish;
      if (!unpublish && U.isTrue(r.include_private)) {
        throw new AppError(ERR.VALIDATION, 'Laporan ini memuat data pribadi sehingga tidak bisa diterbitkan ke atasan. Buat laporan baru tanpa data pribadi.');
      }
      Db.update('REPORTS', 'report_id', r.report_id, {
        status: unpublish ? 'DRAFT' : 'PUBLISHED', published_at: unpublish ? '' : U.now(), updated_at: U.now()
      });
      Audit.log(user, unpublish ? 'REPORT_UNPUBLISHED' : 'REPORT_PUBLISHED', 'REPORTS', r.report_id, null);
      return dto(Db.findOne('REPORTS', 'report_id', r.report_id), { owner: true, full: true });
    },

    remove: function (user, p) {
      var r = requireReport(p.reportId);
      if (r.status === 'PUBLISHED') throw new AppError(ERR.CONFLICT, 'Tarik kembali laporan ke draf sebelum menghapusnya.');
      Db.update('REPORTS', 'report_id', r.report_id, { is_deleted: true, updated_at: U.now() });
      Audit.log(user, 'REPORT_DELETED', 'REPORTS', r.report_id, null);
      return { reportId: r.report_id, deleted: true };
    },

    /** Simpan PDF ke Drive (03_REPORTS/<JENIS>). */
    exportPdf: function (user, p) {
      var r = requireReport(p.reportId);
      var file;
      try {
        var blob = Utilities.newBlob(pdfHtml(r), 'text/html', r.report_id + '.html').getAs('application/pdf');
        blob.setName(r.title.replace(/[\\/:*?"<>|]+/g, '-') + '.pdf');
        file = DriveService.reportFolder(r.type).createFile(blob);
      } catch (e) {
        if (e instanceof AppError) throw e;
        throw new AppError(ERR.INTERNAL, 'PDF gagal dibuat di Google Drive. Coba lagi.');
      }
      Db.update('REPORTS', 'report_id', r.report_id, { drive_file_id: file.getId(), updated_at: U.now() });
      Audit.log(user, 'REPORT_PDF', 'REPORTS', r.report_id, null);
      return { url: 'https://drive.google.com/file/d/' + file.getId() + '/view', reportId: r.report_id };
    }
  };
})();

// ==================== ReviewService.gs ====================
/**
 * ReviewService.gs — feedback atasan (REVIEW_LOG), tampilan eksekutif per halaman, dan pencarian global.
 *
 * Atasan hanya boleh MENULIS feedback; tidak bisa mengubah data operasional.
 * Semua tampilan eksekutif memakai Repo.supervisorScope, termasuk saat pemilik mempratinjau Mode Atasan.
 */
var ReviewService = (function () {

  function entityTitle(type, id) {
    if (type === 'GENERAL') return 'Umum';
    var scope = Repo.supervisorScope(Repo.bundle());
    if (type === 'PROJECT') {
      var p = scope.projectIds[id];
      if (!p) throw new AppError(ERR.FORBIDDEN, 'Proyek ini tidak dibagikan ke atasan.');
      return p.name;
    }
    var r = Db.findOne('REPORTS', 'report_id', id);
    if (!r || !Repo.alive(r) || r.status !== 'PUBLISHED' || U.isTrue(r.include_private)) {
      throw new AppError(ERR.FORBIDDEN, 'Laporan ini belum diterbitkan untuk atasan.');
    }
    return r.title;
  }

  return {
    create: function (user, p) {
      var type = U.oneOf(p.entityType, REVIEW_ENTITIES, 'GENERAL', 'Jenis feedback');
      var id = type === 'GENERAL' ? '' : String(p.entityId || '');
      if (type !== 'GENERAL' && !id) throw new AppError(ERR.VALIDATION, 'Pilih proyek atau laporan yang diberi feedback.');
      var comment = U.required(p.comment, 'Feedback', 2, 2000);
      var rating = U.intRange(p.rating, 0, 5, 0, 'Penilaian');
      var row = {
        review_id: U.newId('REV'), entity_type: type, entity_id: id, reviewer_id: user.user_id, rating: rating,
        comment: comment, status: 'OPEN', created_at: U.now(), reviewer_name: user.display_name || user.email,
        entity_title: entityTitle(type, id), acknowledged_at: ''
      };
      Db.insert('REVIEW_LOG', row);
      Audit.log(user, 'FEEDBACK_CREATED', 'REVIEW_LOG', row.review_id, { entity: type + ':' + id });
      return Repo.reviewDto(row);
    },

    /** Daftar feedback. Atasan: hanya feedback pada entitas yang terlihat olehnya. */
    list: function (user, p) {
      p = p || {};
      var rows = Db.all('REVIEW_LOG');
      if (p.entityType) rows = rows.filter(function (r) { return r.entity_type === String(p.entityType); });
      if (p.entityId) rows = rows.filter(function (r) { return r.entity_id === String(p.entityId); });
      if (user.role !== ROLES.OWNER) {
        var scope = Repo.supervisorScope(Repo.bundle());
        var published = Repo.indexBy(ReportService.listPublished(), 'reportId');
        rows = rows.filter(function (r) {
          if (r.entity_type === 'PROJECT') return !!scope.projectIds[r.entity_id];
          if (r.entity_type === 'REPORT') return !!published[r.entity_id];
          return true;
        });
      }
      var items = rows.map(Repo.reviewDto).sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
      return { items: items, open: items.filter(function (x) { return x.status === 'OPEN'; }).length };
    },

    acknowledge: function (user, p) {
      var r = Db.findOne('REVIEW_LOG', 'review_id', String(p.reviewId || ''));
      if (!r) throw new AppError(ERR.NOT_FOUND, 'Feedback tidak ditemukan.');
      var row = Db.update('REVIEW_LOG', 'review_id', r.review_id, { status: 'ACKNOWLEDGED', acknowledged_at: U.now() });
      return Repo.reviewDto(row);
    }
  };
})();

var ExecService = {
  projects: function () {
    var b = Repo.bundle();
    return Repo.supervisorScope(b).projects.filter(function (p) { return p.status !== 'ARCHIVED'; })
      .map(function (p) { return Repo.projectDto(p, b, {}); }).sort(Repo.projectSort);
  },

  project: function (user, p) {
    var b = Repo.bundle();
    var scope = Repo.supervisorScope(b);
    var proj = scope.projectIds[String(p.projectId || '')];
    if (!proj) throw new AppError(ERR.NOT_FOUND, 'Proyek tidak ditemukan atau tidak dibagikan ke atasan.');
    var id = proj.project_id;
    var opts = { supervisor: true, scope: scope };
    var taskIds = {};
    var tasks = scope.tasks.filter(function (t) { return t.project_id === id; });
    tasks.forEach(function (t) { taskIds[t.task_id] = true; });
    var assetIds = {};
    b.links.forEach(function (l) {
      if ((l.entity_type === 'PROJECT' && l.entity_id === id) || (l.entity_type === 'TASK' && taskIds[l.entity_id])) assetIds[l.asset_id] = true;
    });
    return {
      project: Repo.projectDto(proj, b, {}),
      tasks: tasks.map(function (t) { return Repo.taskDto(t, b); }).sort(Repo.taskSort),
      activities: scope.activities.filter(function (a) { return a.project_id === id; }).map(function (a) { return Repo.activityDto(a, b); }).sort(Repo.byDayDesc),
      assets: scope.assets.filter(function (a) { return a.project_id === id || assetIds[a.asset_id]; })
        .map(function (a) { return Repo.assetDto(a, b, opts); }),
      reviews: ReviewService.list(user, { entityType: 'PROJECT', entityId: id }).items
    };
  },

  activity: function (user, p) {
    p = p || {};
    var b = Repo.bundle();
    var from = U.dateOnly(p.from, 'Tanggal awal'), to = U.dateOnly(p.to, 'Tanggal akhir');
    var items = Repo.supervisorScope(b).activities
      .filter(function (a) { return ActivityService.inRange(a, from, to); })
      .map(function (a) { return Repo.activityDto(a, b); }).sort(Repo.byDayDesc);
    return { items: items.slice(0, 300), total: items.length, totalMinutes: items.reduce(function (s, a) { return s + a.durationMinutes; }, 0) };
  },

  assets: function (user, p) {
    p = p || {};
    var b = Repo.bundle();
    var scope = Repo.supervisorScope(b);
    var type = p.fileType ? String(p.fileType).toUpperCase() : '';
    return {
      items: scope.assets
        .filter(function (a) { return !type || (a.file_type || Repo.fileTypeOf(a.mime_type)) === type; })
        .filter(function (a) { return U.matches(p.q, [a.file_name, a.description]); })
        .map(function (a) { return Repo.assetDto(a, b, { supervisor: true, scope: scope }); })
        .sort(function (x, y) { return x.createdAt < y.createdAt ? 1 : -1; })
    };
  }
};

var SearchService = {
  global: function (p) {
    var q = U.cleanText(p.q, 80);
    if (q.length < 2) return { q: q, results: [] };
    var b = Repo.bundle();
    var out = [];
    function add(list, max) { out = out.concat(list.slice(0, max)); }
    add(b.projects.filter(function (x) { return U.matches(q, [x.name, x.project_id, x.description]); })
      .map(function (x) { return { type: 'PROJECT', id: x.project_id, title: x.name, meta: x.project_id }; }), 6);
    add(b.tasks.filter(function (x) { return U.matches(q, [x.title, x.task_id]); })
      .map(function (x) { var pr = b.projectsById[x.project_id]; return { type: 'TASK', id: x.task_id, title: x.title, meta: pr ? pr.name : 'Tugas mandiri' }; }), 8);
    add(b.activities.filter(function (x) { return U.matches(q, [x.title, x.result, x.activity_id]); })
      .map(function (x) { return { type: 'ACTIVITY', id: x.activity_id, title: x.title, meta: U.dayKey(x.activity_date) }; }), 5);
    add(b.assets.filter(function (x) { return U.matches(q, [x.file_name, x.description, x.asset_id]); })
      .map(function (x) { return { type: 'ASSET', id: x.asset_id, title: x.file_name, meta: x.file_type || '' }; }), 6);
    add(b.reports.filter(function (x) { return U.matches(q, [x.title, x.report_id]); })
      .map(function (x) { return { type: 'REPORT', id: x.report_id, title: x.title, meta: x.status }; }), 4);
    return { q: q, results: out };
  }
};

// ==================== DashboardService.gs ====================
/**
 * DashboardService.gs — ringkasan Mode Saya & Mode Atasan.
 * Semua angka dihitung dari sheet melalui Repo (rumus yang sama dengan halaman lain). Tidak ada angka rekaan.
 * Mode Atasan SELALU memakai Repo.supervisorScope, siapa pun pemanggilnya.
 */
var DashboardService = (function () {

  function minutesSince(b, activities, sinceDay) {
    var act = activities.filter(function (a) { return U.dayKey(a.activity_date || a.created_at) >= sinceDay; })
      .reduce(function (s, a) { return s + (Number(a.duration_minutes) || 0); }, 0);
    var tl = b.timeLogs.filter(function (l) { return U.dayKey(l.start_time) >= sinceDay; })
      .reduce(function (s, l) { return s + (Number(l.duration_minutes) || 0); }, 0);
    return act + tl;
  }

  function lastDays(n) {
    var out = [];
    for (var i = n - 1; i >= 0; i--) out.push(U.dayKey(U.addDays(new Date(), -i)));
    return out;
  }

  function week(b, tasks, activities) {
    return lastDays(7).map(function (day) {
      var acts = activities.filter(function (a) { return U.dayKey(a.activity_date || a.created_at) === day; });
      return {
        date: day,
        activities: acts.length,
        minutes: acts.reduce(function (s, a) { return s + (Number(a.duration_minutes) || 0); }, 0),
        tasksDone: tasks.filter(function (t) { return t.status === 'DONE' && U.dayKey(t.completed_at) === day; }).length
      };
    });
  }

  return {
    projectProgress: function (project, tasks) {
      var b = { tasksByProject: {} };
      b.tasksByProject[project.project_id] = tasks.filter(function (t) { return t.project_id === project.project_id; });
      return Repo.projectProgress(project.project_id, b);
    },

    owner: function (user) {
      var b = Repo.bundle();
      var today = U.today();
      var weekAhead = U.dayKey(U.addDays(new Date(), 7));
      var weekStart = U.dayKey(U.addDays(new Date(), -6));
      var thisMonth = today.slice(0, 7);

      var activeProjects = b.projects.filter(function (p) { return Repo.ACTIVE_PROJECT.indexOf(p.status) >= 0; });
      var openTasks = b.tasks.filter(function (t) { return Repo.OPEN_TASK.indexOf(t.status) >= 0; });
      var todayTasks = openTasks.filter(function (t) { return U.dayKey(t.due_date) === today || U.dayKey(t.planned_date) === today; });
      var overdue = openTasks.filter(Repo.taskOverdue);
      var upcoming = openTasks.filter(function (t) { var k = U.dayKey(t.due_date); return k && k > today && k <= weekAhead; });
      var inProgress = openTasks.filter(function (t) { return t.status === 'IN_PROGRESS' || t.status === 'REVIEW'; });
      var deliverablesMonth = Db.all('DELIVERABLES').filter(function (x) { return U.dayKey(x.created_at).slice(0, 7) === thisMonth; });
      var doneWeek = b.tasks.filter(function (t) { return t.status === 'DONE' && U.dayKey(t.completed_at) >= weekStart; });
      var reviews = b.reviews.map(Repo.reviewDto).sort(function (x, y) { return x.createdAt < y.createdAt ? 1 : -1; });

      var cfg = ConfigStore.getAll();
      var supervisors = Db.find('USERS', function (u) { return u.role === ROLES.SUPERVISOR; });
      var dto = function (t) { return Repo.taskDto(t, b); };

      return {
        generatedAt: new Date().toISOString(),
        stats: {
          activeProjects: activeProjects.length,
          tasksToday: todayTasks.length,
          overdueTasks: overdue.length,
          deliverablesThisMonth: deliverablesMonth.length,
          hoursThisWeek: Math.round(minutesSince(b, b.activities, weekStart) / 6) / 10,
          tasksDoneThisWeek: doneWeek.length,
          openTasks: openTasks.length,
          feedbackOpen: reviews.filter(function (r) { return r.status === 'OPEN'; }).length
        },
        todayTasks: todayTasks.map(dto).sort(Repo.taskSort).slice(0, 8),
        overdueTasks: overdue.map(dto).sort(Repo.taskSort).slice(0, 8),
        inProgress: inProgress.map(dto).sort(Repo.taskSort).slice(0, 6),
        upcoming: upcoming.map(dto).sort(Repo.taskSort).slice(0, 6),
        projects: activeProjects.map(function (p) { return Repo.projectDto(p, b, { owner: true }); }).sort(Repo.projectSort).slice(0, 6),
        recentActivity: b.activities.map(function (a) { return Repo.activityDto(a, b); }).sort(Repo.byDayDesc).slice(0, 6),
        feedback: reviews.slice(0, 4),
        week: week(b, b.tasks, b.activities),
        setup: {
          brandingDone: !!cfg.APP_LOGO_PRIMARY_ID || !!cfg.APP_LOGO_SECONDARY_ID,
          organizationSet: !!cfg.ORGANIZATION_NAME,
          supervisorInvited: supervisors.length > 0,
          supervisorActive: supervisors.some(function (u) { return u.invitation_status === ACCOUNT_STATUS.ACTIVE; }),
          firstProject: b.projects.length > 0
        }
      };
    },

    /** Tampilan eksekutif: hanya data yang dibagikan ke atasan. */
    executive: function (user) {
      var b = Repo.bundle();
      var s = Repo.supervisorScope(b);
      var today = U.today();
      var thisMonth = today.slice(0, 7);
      var monthStart = thisMonth + '-01';

      var active = s.projects.filter(function (p) { return Repo.ACTIVE_PROJECT.indexOf(p.status) >= 0; });
      var done = s.projects.filter(function (p) { return p.status === 'DONE'; });
      var late = active.filter(Repo.projectOverdue);
      var tasksDoneMonth = s.tasks.filter(function (t) { return t.status === 'DONE' && U.dayKey(t.completed_at).slice(0, 7) === thisMonth; });
      var actsMonth = s.activities.filter(function (a) { return U.dayKey(a.activity_date || a.created_at) >= monthStart; });
      var deliverables = Db.all('DELIVERABLES').filter(Permission.visibleToSupervisor)
        .filter(function (x) { return x.status === 'APPROVED' || x.status === 'SUBMITTED'; });
      var reports = ReportService.listPublished();
      var opts = { supervisor: true, scope: s };

      return {
        generatedAt: new Date().toISOString(),
        viewScope: 'SUPERVISOR',
        stats: {
          activeProjects: active.length,
          completedProjects: done.length,
          lateProjects: late.length,
          tasksDoneThisMonth: tasksDoneMonth.length,
          deliverables: deliverables.length,
          activitiesThisMonth: actsMonth.length,
          hoursThisMonth: Math.round(actsMonth.reduce(function (x, a) { return x + (Number(a.duration_minutes) || 0); }, 0) / 6) / 10,
          evidence: s.assets.length,
          publishedReports: reports.length
        },
        projects: active.concat(done).map(function (p) { return Repo.projectDto(p, b, {}); }).sort(Repo.projectSort).slice(0, 8),
        recentActivity: s.activities.map(function (a) { return Repo.activityDto(a, b); }).sort(Repo.byDayDesc).slice(0, 8),
        recentEvidence: s.assets.map(function (a) { return Repo.assetDto(a, b, opts); })
          .sort(function (x, y) { return x.createdAt < y.createdAt ? 1 : -1; }).slice(0, 6),
        latestReport: reports[0] || null,
        week: week(b, s.tasks, s.activities)
      };
    },

    systemInfo: function () {
      var ssId = Props.get('SPREADSHEET_ID');
      var rootId = Props.get('DRIVE_ROOT_ID');
      var backups = [];
      try {
        var it = DriveService.backupFolder().getFiles();
        while (it.hasNext() && backups.length < 50) {
          var f = it.next();
          backups.push({ name: f.getName(), url: f.getUrl(), createdAt: U.toIso(f.getDateCreated()) });
        }
      } catch (e) { backups = []; }
      backups.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
      return {
        version: MCMS_VERSION,
        schemaVersion: ConfigStore.get('SCHEMA_VERSION') || SCHEMA_VERSION,
        timezone: U.timezone(),
        appUrl: Props.get('APP_URL') || '',
        spreadsheetUrl: ssId ? 'https://docs.google.com/spreadsheets/d/' + ssId + '/edit' : '',
        driveUrl: rootId ? 'https://drive.google.com/drive/folders/' + rootId : '',
        sheetCount: Object.keys(SCHEMA).length,
        userCount: Db.all('USERS').length,
        backups: backups.slice(0, 5)
      };
    },

    /** Salinan spreadsheet database ke 05_SYSTEM_BACKUP. */
    backup: function (user) {
      var ssId = Props.get('SPREADSHEET_ID');
      var name = 'MCMS Backup ' + Utilities.formatDate(new Date(), U.timezone(), 'yyyy-MM-dd HHmm');
      var copy;
      try { copy = DriveApp.getFileById(ssId).makeCopy(name, DriveService.backupFolder()); } catch (e) {
        throw new AppError(ERR.INTERNAL, 'Backup gagal dibuat di Google Drive. Coba lagi.');
      }
      Audit.log(user, 'BACKUP_CREATED', 'SYSTEM', copy.getId(), { name: name });
      return { name: name, url: copy.getUrl() };
    }
  };
})();

// ==================== Router.gs ====================
/**
 * Router.gs — satu pintu masuk API.
 * Setiap aksi mendeklarasikan: perlu login atau tidak, izin yang dibutuhkan, dan apakah menulis data (pakai lock).
 * Format respons standar: { success, data, message, errorCode }.
 */
var ROUTES = {
  // ---------- Publik (tanpa sesi) ----------
  'system.ping':        { auth: false, handler: function () { return { ok: true, version: MCMS_VERSION, time: new Date().toISOString() }; } },
  'branding.getPublic': { auth: false, handler: function () { return BrandingService.getPublic(); } },
  'auth.login':         { auth: false, write: true, handler: function (p) { return Auth.login(p.idToken); } },
  'auth.acceptInvite':  { auth: false, write: true, handler: function (p) { return UserService.acceptInvite(p.idToken, p.inviteToken); } },

  // ---------- Butuh sesi ----------
  'auth.me':            { permission: 'profile.self', handler: function (p, user) { return Auth.describe(user); } },
  'auth.logout':        { permission: 'profile.self', handler: function (p, user, req) { Auth.destroySession(req.token); return { loggedOut: true }; } },
  'account.updateProfile': { permission: 'profile.self', write: true, handler: function (p, user) { return Auth.updateProfile(user, p); } },

  'dashboard.owner':     { permission: 'dashboard.personal', handler: function (p, user) { return DashboardService.owner(user); } },
  'dashboard.executive': { permission: 'dashboard.executive', handler: function (p, user) { return DashboardService.executive(user); } },

  'branding.save':      { permission: 'branding.manage', write: true, handler: function (p, user) { return BrandingService.save(user, p); } },

  'users.list':         { permission: 'account.manage', handler: function () { return UserService.list(); } },
  'users.invite':       { permission: 'account.manage', write: true, handler: function (p, user) { return UserService.invite(user, p); } },
  'users.resendInvite': { permission: 'account.manage', write: true, handler: function (p, user) { return UserService.resendInvite(user, p); } },
  'users.revoke':       { permission: 'account.manage', write: true, handler: function (p, user) { return UserService.revoke(user, p); } },
  'users.suspend':      { permission: 'account.manage', write: true, handler: function (p, user) { return UserService.suspend(user, p); } },
  'users.reactivate':   { permission: 'account.manage', write: true, handler: function (p, user) { return UserService.reactivate(user, p); } },

  'settings.system':    { permission: 'settings.system', handler: function () { return DashboardService.systemInfo(); } },
  'system.backup':      { permission: 'data.backup', write: true, handler: function (p, user) { return DashboardService.backup(user); } },

  // ---------- Data master ----------
  'categories.list':    { permission: 'profile.self', handler: function () { return CategoryService.list(); } },
  'categories.save':    { permission: 'category.manage', write: true, handler: function (p, user) { return CategoryService.save(user, p); } },
  'lookup.all':         { permission: 'project.manage', handler: function () { return Lookup.all(); } },
  'search.global':      { permission: 'search.global', handler: function (p) { return SearchService.global(p); } },

  // ---------- Proyek ----------
  'projects.list':      { permission: 'project.manage', handler: function (p) { return ProjectService.list(p); } },
  'projects.get':       { permission: 'project.manage', handler: function (p) { return ProjectService.get(p); } },
  'projects.create':    { permission: 'project.manage', write: true, handler: function (p, user) { return ProjectService.create(user, p); } },
  'projects.update':    { permission: 'project.manage', write: true, handler: function (p, user) { return ProjectService.update(user, p); } },
  'projects.remove':    { permission: 'project.manage', write: true, handler: function (p, user) { return ProjectService.remove(user, p); } },

  // ---------- Tugas ----------
  'tasks.list':         { permission: 'task.manage', handler: function (p) { return TaskService.list(p); } },
  'tasks.get':          { permission: 'task.manage', handler: function (p) { return TaskService.get(p); } },
  'tasks.create':       { permission: 'task.manage', write: true, handler: function (p, user) { return TaskService.create(user, p); } },
  'tasks.update':       { permission: 'task.manage', write: true, handler: function (p, user) { return TaskService.update(user, p); } },
  'tasks.remove':       { permission: 'task.manage', write: true, handler: function (p, user) { return TaskService.remove(user, p); } },

  // ---------- Aktivitas ----------
  'activities.list':    { permission: 'activity.manage', handler: function (p) { return ActivityService.list(p); } },
  'activities.create':  { permission: 'activity.manage', write: true, handler: function (p, user) { return ActivityService.create(user, p); } },
  'activities.update':  { permission: 'activity.manage', write: true, handler: function (p, user) { return ActivityService.update(user, p); } },
  'activities.remove':  { permission: 'activity.manage', write: true, handler: function (p, user) { return ActivityService.remove(user, p); } },

  // ---------- Aset / Google Drive ----------
  'assets.list':        { permission: 'drive.manage', handler: function (p) { return AssetService.list(p); } },
  'assets.upload':      { permission: 'drive.manage', write: true, handler: function (p, user) { return AssetService.upload(user, p); } },
  'assets.linkDrive':   { permission: 'drive.manage', write: true, handler: function (p, user) { return AssetService.linkDrive(user, p); } },
  'assets.update':      { permission: 'drive.manage', write: true, handler: function (p, user) { return AssetService.update(user, p); } },
  'assets.setLink':     { permission: 'drive.manage', write: true, handler: function (p, user) { return AssetService.setLink(user, p); } },
  'assets.remove':      { permission: 'drive.manage', write: true, handler: function (p, user) { return AssetService.remove(user, p); } },
  'assets.thumbs':      { permission: 'evidence.view', handler: function (p, user) { return AssetService.thumbs(user, p); } },
  'assets.open':        { permission: 'evidence.view', write: true, handler: function (p, user) { return AssetService.open(user, p); } },

  // ---------- Laporan ----------
  'reports.list':       { permission: 'report.generate', handler: function () { return ReportService.list(); } },
  'reports.preview':    { permission: 'report.generate', handler: function (p, user) { return ReportService.preview(user, p); } },
  'reports.generate':   { permission: 'report.generate', write: true, handler: function (p, user) { return ReportService.generate(user, p); } },
  'reports.update':     { permission: 'report.generate', write: true, handler: function (p, user) { return ReportService.update(user, p); } },
  'reports.publish':    { permission: 'report.generate', write: true, handler: function (p, user) { return ReportService.publish(user, p); } },
  'reports.remove':     { permission: 'report.generate', write: true, handler: function (p, user) { return ReportService.remove(user, p); } },
  'reports.exportPdf':  { permission: 'report.generate', write: true, handler: function (p, user) { return ReportService.exportPdf(user, p); } },
  'reports.get':        { permission: 'report.view', handler: function (p, user) { return ReportService.get(user, p); } },

  // ---------- Feedback ----------
  'reviews.list':       { permission: 'feedback.view', handler: function (p, user) { return ReviewService.list(user, p); } },
  'reviews.create':     { permission: 'feedback.create', write: true, handler: function (p, user) { return ReviewService.create(user, p); } },
  'reviews.acknowledge': { permission: 'feedback.manage', write: true, handler: function (p, user) { return ReviewService.acknowledge(user, p); } },

  // ---------- Mode Atasan (selalu scope SUPERVISOR) ----------
  'exec.projects':      { permission: 'project.view', handler: function () { return ExecService.projects(); } },
  'exec.project':       { permission: 'project.view', handler: function (p, user) { return ExecService.project(user, p); } },
  'exec.activity':      { permission: 'activity.view', handler: function (p, user) { return ExecService.activity(user, p); } },
  'exec.assets':        { permission: 'evidence.view', handler: function (p, user) { return ExecService.assets(user, p); } },
  'exec.reports':       { permission: 'report.view', handler: function () { return ReportService.listPublished(); } }
};

/** Daftar pilihan untuk form (proyek aktif, tugas terbuka, kategori) dalam satu panggilan. */
var Lookup = {
  all: function () {
    var b = Repo.bundle();
    return {
      projects: b.projects.filter(function (p) { return p.status !== 'ARCHIVED'; })
        .map(function (p) { return { id: p.project_id, name: p.name, status: p.status }; })
        .sort(function (a, c) { return a.name < c.name ? -1 : 1; }),
      tasks: b.tasks.filter(function (t) { return Repo.OPEN_TASK.indexOf(t.status) >= 0; })
        .map(function (t) { return { id: t.task_id, title: t.title, projectId: t.project_id || '' }; }),
      categories: CategoryService.list().filter(function (c) { return c.active; })
    };
  }
};

var SUCCESS_MESSAGES = {
  'auth.login': 'Berhasil masuk.',
  'auth.acceptInvite': 'Undangan diterima. Selamat datang!',
  'branding.save': 'Branding berhasil disimpan.',
  'users.invite': 'Undangan berhasil dibuat.',
  'users.resendInvite': 'Undangan baru berhasil dibuat.',
  'users.revoke': 'Akses berhasil dicabut.',
  'users.suspend': 'Akun dinonaktifkan sementara.',
  'users.reactivate': 'Akun diaktifkan kembali.',
  'account.updateProfile': 'Profil disimpan.',
  'system.backup': 'Backup berhasil dibuat di Google Drive.',
  'categories.save': 'Kategori disimpan.',
  'projects.create': 'Proyek berhasil dibuat.',
  'projects.update': 'Proyek diperbarui.',
  'projects.remove': 'Proyek dihapus.',
  'tasks.create': 'Tugas berhasil dibuat.',
  'tasks.update': 'Tugas diperbarui.',
  'tasks.remove': 'Tugas dihapus.',
  'activities.create': 'Aktivitas tercatat.',
  'activities.update': 'Aktivitas diperbarui.',
  'activities.remove': 'Aktivitas dihapus.',
  'assets.upload': 'File berhasil diunggah ke Google Drive.',
  'assets.linkDrive': 'File Drive berhasil ditautkan.',
  'assets.update': 'File diperbarui.',
  'assets.setLink': 'Relasi file diperbarui.',
  'assets.remove': 'File dihapus dari arsip MCMS (file asli tetap ada di Drive).',
  'reports.generate': 'Laporan berhasil dibuat.',
  'reports.update': 'Laporan diperbarui.',
  'reports.publish': 'Status laporan diperbarui.',
  'reports.remove': 'Laporan dihapus.',
  'reports.exportPdf': 'PDF tersimpan di Google Drive.',
  'reviews.create': 'Feedback terkirim. Terima kasih!',
  'reviews.acknowledge': 'Feedback ditandai sudah dibaca.'
};

function handleRequest_(rawBody) {
  var action = '';
  try {
    if (!rawBody || typeof rawBody !== 'string') throw new AppError(ERR.BAD_REQUEST, 'Permintaan kosong.');
    if (rawBody.length > MAX_REQUEST_CHARS) throw new AppError(ERR.BAD_REQUEST, 'Permintaan terlalu besar.');
    var req;
    try { req = JSON.parse(rawBody); } catch (e) { throw new AppError(ERR.BAD_REQUEST, 'Format permintaan tidak valid.'); }
    if (!req || typeof req !== 'object') throw new AppError(ERR.BAD_REQUEST, 'Format permintaan tidak valid.');

    action = String(req.action || '');
    var route = Object.prototype.hasOwnProperty.call(ROUTES, action) ? ROUTES[action] : null;
    if (!route) throw new AppError(ERR.NOT_FOUND, 'Aksi tidak dikenal.');
    var payload = (req.payload && typeof req.payload === 'object') ? req.payload : {};

    var run = function () {
      var user = null;
      if (route.auth !== false) {
        user = Auth.requireSession(req.token);
        Permission.require(user, route.permission);
      }
      return route.handler(payload, user, req);
    };
    var data = route.write ? Db.withLock(run) : run();
    return { success: true, data: data, message: SUCCESS_MESSAGES[action] || 'OK', errorCode: null };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, data: err.details || null, message: err.message, errorCode: err.code };
    }
    console.error('[' + action + '] ' + (err && err.stack ? err.stack : err));
    return { success: false, data: null, message: 'Terjadi kesalahan sistem. Silakan coba lagi.', errorCode: ERR.INTERNAL };
  }
}

// ==================== Code.gs ====================
/**
 * Code.gs — entry point Web App MCMS (API backend).
 *
 * Deploy: Deploy → New deployment → Web app
 *   Execute as: Me (pemilik)          → spreadsheet & Drive tetap privat milik pemilik
 *   Who has access: Anyone            → keamanan dijamin oleh verifikasi Google Sign-In + sesi di server
 *
 * Frontend memanggil API dengan POST (Content-Type: text/plain) berisi JSON:
 *   { "action": "dashboard.owner", "token": "<session token>", "payload": { ... } }
 */

function doPost(e) {
  var body = e && e.postData ? e.postData.contents : '';
  return jsonOutput_(handleRequest_(body));
}

/** GET hanya untuk cek status deployment (buka URL /exec di browser). */
function doGet() {
  return jsonOutput_({
    success: true,
    data: { app: 'MCMS API', version: MCMS_VERSION, initialized: !!Props.get('SPREADSHEET_ID') },
    message: 'MCMS API aktif. Buka aplikasi melalui alamat frontend.',
    errorCode: null
  });
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

  return { doPost: doPost, doGet: doGet, setupMCMS: setupMCMS, SETUP_CONFIG: SETUP_CONFIG, Db: Db, U: U, Repo: Repo, ProjectService: ProjectService, TaskService: TaskService, ActivityService: ActivityService, AssetService: AssetService, ReportService: ReportService, ReviewService: ReviewService, UserService: UserService, Auth: Auth, ConfigStore: ConfigStore, BrandingService: BrandingService, MCMS_VERSION: MCMS_VERSION };
};
