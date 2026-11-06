/**
 * MCMS — Simulator layanan Google Apps Script (SpreadsheetApp, DriveApp, CacheService, dll).
 *
 * Dipakai di dua tempat dengan kode yang SAMA:
 *  1. Node.js  → pengujian otomatis backend (tests/backend.test.js)
 *  2. Browser  → MODE DEMO: kode backend asli dijalankan di browser, data disimpan di localStorage.
 * Hanya mencakup API yang dipakai MCMS. Perilaku penting (batas cache 100 KB, lock, byte bertanda,
 * verifikasi token Google) dibuat semirip mungkin dengan aslinya.
 */
(function (root) {
  'use strict';

  /* ---------------- Byte & hash ---------------- */
  var toSigned = function (u8) { var out = new Array(u8.length); for (var i = 0; i < u8.length; i++) out[i] = u8[i] > 127 ? u8[i] - 256 : u8[i]; return out; };
  var toU8 = function (arr) { var out = new Uint8Array(arr.length); for (var i = 0; i < arr.length; i++) out[i] = arr[i] < 0 ? arr[i] + 256 : arr[i]; return out; };
  var utf8 = function (s) { return new TextEncoder().encode(String(s)); };

  var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function sha256(bytes) {
    var l = bytes.length, withPad = ((l + 9 + 63) >> 6) << 6;
    var m = new Uint8Array(withPad); m.set(bytes); m[l] = 0x80;
    var bits = l * 8, dv = new DataView(m.buffer);
    dv.setUint32(withPad - 4, bits >>> 0); dv.setUint32(withPad - 8, Math.floor(bits / 4294967296));
    var h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var w = new Uint32Array(64);
    for (var off = 0; off < withPad; off += 64) {
      for (var i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
      for (i = 16; i < 64; i++) {
        var a = w[i - 15], b = w[i - 2];
        var s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
        var s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      var A = h[0], B = h[1], C = h[2], D = h[3], E = h[4], F = h[5], G = h[6], H = h[7];
      for (i = 0; i < 64; i++) {
        var S1 = ((E >>> 6) | (E << 26)) ^ ((E >>> 11) | (E << 21)) ^ ((E >>> 25) | (E << 7));
        var ch = (E & F) ^ (~E & G);
        var t1 = (H + S1 + ch + K[i] + w[i]) >>> 0;
        var S0 = ((A >>> 2) | (A << 30)) ^ ((A >>> 13) | (A << 19)) ^ ((A >>> 22) | (A << 10));
        var mj = (A & B) ^ (A & C) ^ (B & C);
        var t2 = (S0 + mj) >>> 0;
        H = G; G = F; F = E; E = (D + t1) >>> 0; D = C; C = B; B = A; A = (t1 + t2) >>> 0;
      }
      h[0] = (h[0] + A) >>> 0; h[1] = (h[1] + B) >>> 0; h[2] = (h[2] + C) >>> 0; h[3] = (h[3] + D) >>> 0;
      h[4] = (h[4] + E) >>> 0; h[5] = (h[5] + F) >>> 0; h[6] = (h[6] + G) >>> 0; h[7] = (h[7] + H) >>> 0;
    }
    var out = new Uint8Array(32), odv = new DataView(out.buffer);
    for (i = 0; i < 8; i++) odv.setUint32(i * 4, h[i]);
    return out;
  }

  function b64encode(u8) {
    var s = '';
    for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function b64decode(str) {
    var bin = atob(String(str));
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function uuid() {
    var c = root.crypto || (typeof globalThis !== 'undefined' ? globalThis.crypto : null);
    if (c && c.randomUUID) { try { return c.randomUUID(); } catch (e) { /* konteks tidak aman */ } }
    var r = new Uint8Array(16);
    if (c && c.getRandomValues) c.getRandomValues(r); else for (var i = 0; i < 16; i++) r[i] = Math.floor(Math.random() * 256);
    r[6] = (r[6] & 0x0f) | 0x40; r[8] = (r[8] & 0x3f) | 0x80;
    var hex = Array.prototype.map.call(r, function (x) { return (x + 256).toString(16).slice(1); }).join('');
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
  }
  function randHex(n) { return uuid().replace(/-/g, '').slice(0, n); }

  /* ---------------- Simulator ---------------- */
  function createGasSim(opts) {
    opts = opts || {};
    var state = {
      spreadsheets: {}, folders: {}, files: {}, props: {}, cache: {}, mails: [], tokens: {},
      effectiveEmail: opts.ownerEmail || 'owner@gmail.com', lockHeld: false, fetchCount: 0,
      failDriveWrite: false, failMail: !!opts.failMail, idSeq: 1
    };
    var newId = function (p) { return p + '_' + (state.idSeq++) + '_' + randHex(6); };

    /* ----- Sheets ----- */
    function makeRange(sheet, r, c, nr, nc) {
      var range = {
        getValues: function () {
          var out = [];
          for (var i = 0; i < nr; i++) {
            var row = [];
            for (var j = 0; j < nc; j++) {
              var v = (sheet._data[r - 1 + i] || [])[c - 1 + j];
              row.push(v === undefined || v === null ? '' : (v instanceof Date ? new Date(v.getTime()) : v));
            }
            out.push(row);
          }
          return out;
        },
        setValues: function (vals) {
          if (vals.length !== nr || vals.some(function (row) { return row.length !== nc; })) throw new Error('The number of columns in the data does not match the number of columns in the range.');
          for (var i = 0; i < nr; i++) {
            sheet._data[r - 1 + i] = sheet._data[r - 1 + i] || [];
            for (var j = 0; j < nc; j++) sheet._data[r - 1 + i][c - 1 + j] = cellValue(vals[i][j]);
          }
          return range;
        },
        setNumberFormat: function () { return range; },
        setDataValidation: function () { sheet._validations++; return range; },
        setFontWeight: function () { return range; },
        setBackground: function () { return range; }
      };
      return range;
    }
    /** Nilai disimpan apa adanya (termasuk prefix apostrof anti-formula); Database.gs membuangnya saat membaca. */
    function cellValue(v) { return v; }
    function makeSheet(name) {
      var sheet = {
        _name: name, _data: [], _validations: 0, _frozen: 0,
        getName: function () { return name; },
        getLastRow: function () { var n = 0; sheet._data.forEach(function (r, i) { if (r && r.some(function (v) { return v !== '' && v !== undefined && v !== null; })) n = i + 1; }); return n; },
        getLastColumn: function () { return sheet._data.reduce(function (m, r) { return Math.max(m, r ? r.length : 0); }, 0); },
        getMaxRows: function () { return 1000; },
        getDataRange: function () { return makeRange(sheet, 1, 1, Math.max(sheet.getLastRow(), 1), Math.max(sheet.getLastColumn(), 1)); },
        getRange: function (r, c, nr, nc) { return makeRange(sheet, r, c, nr || 1, nc || 1); },
        appendRow: function (row) { sheet._data[sheet.getLastRow()] = row.map(cellValue); return sheet; },
        setFrozenRows: function (n) { sheet._frozen = n; return sheet; }
      };
      return sheet;
    }
    function ssApi(id) {
      var ss = state.spreadsheets[id];
      return {
        getId: function () { return id; },
        getUrl: function () { return 'https://docs.google.com/spreadsheets/d/' + id + '/edit'; },
        getSheetByName: function (n) { return ss.sheets.filter(function (s) { return s._name === n; })[0] || null; },
        insertSheet: function (n) {
          if (ss.sheets.some(function (s) { return s._name === n; })) throw new Error('A sheet with the name "' + n + '" already exists.');
          var sh = makeSheet(n); ss.sheets.push(sh); return sh;
        },
        getSheets: function () { return ss.sheets.slice(); },
        deleteSheet: function (sh) { ss.sheets = ss.sheets.filter(function (x) { return x !== sh; }); }
      };
    }
    function createSpreadsheet(name) {
      var id = newId('ss');
      state.spreadsheets[id] = { name: name, sheets: [makeSheet('Sheet1')] };
      state.files[id] = { id: id, name: name, parent: 'root', bytes: [], mime: 'application/vnd.google-apps.spreadsheet', viewers: [], created: new Date().toISOString() };
      return ssApi(id);
    }
    var SpreadsheetApp = {
      create: createSpreadsheet,
      openById: function (id) { if (!state.spreadsheets[id]) throw new Error('Spreadsheet tidak ditemukan'); return ssApi(id); },
      newDataValidation: function () {
        var b = { requireValueInList: function () { return b; }, setAllowInvalid: function () { return b; }, build: function () { return { rule: true }; } };
        return b;
      }
    };

    /* ----- Drive ----- */
    function iter(list) { var i = 0; return { hasNext: function () { return i < list.length; }, next: function () { return list[i++]; } }; }
    function blob(bytes, mime, name) {
      var b = {
        _name: name || 'file', _mime: mime || 'application/octet-stream', _bytes: bytes,
        getBytes: function () { return b._bytes.slice(); },
        getContentType: function () { return b._mime; },
        getName: function () { return b._name; },
        setName: function (n) { b._name = n; return b; },
        getAs: function (m) { return blob(b._bytes.slice(), m, b._name.replace(/\.[^.]+$/, '') + (m === 'application/pdf' ? '.pdf' : '')); },
        getDataAsString: function () { return new TextDecoder().decode(toU8(b._bytes)); }
      };
      return b;
    }
    function fileApi(f) {
      return {
        getId: function () { return f.id; },
        getName: function () { return f.name; },
        setName: function (n) { f.name = n; return this; },
        getMimeType: function () { return f.mime; },
        getSize: function () { return f.size !== undefined ? f.size : f.bytes.length; },
        getUrl: function () { return 'https://drive.google.com/file/d/' + f.id + '/view'; },
        getDateCreated: function () { return new Date(f.created); },
        getBlob: function () { if (f.lost) throw new Error('Isi file tidak tersedia (demo)'); return blob(f.bytes, f.mime, f.name); },
        getThumbnail: function () {
          if (f.lost || !/^image\/(png|jpeg|webp|gif)$/.test(f.mime)) return null;
          return blob(f.bytes, f.mime, f.name);
        },
        addViewer: function (email) { if (f.viewers.indexOf(email) < 0) f.viewers.push(email); return this; },
        removeViewer: function (email) { f.viewers = f.viewers.filter(function (v) { return v !== email; }); return this; },
        getViewers: function () { return f.viewers.map(function (e) { return { getEmail: function () { return e; } }; }); },
        moveTo: function (folder) { f.parent = folder.getId(); return this; },
        makeCopy: function (name, folder) {
          if (state.failDriveWrite) throw new Error('Drive quota exceeded');
          var id = newId('file');
          state.files[id] = { id: id, name: name, parent: folder ? folder.getId() : f.parent, bytes: [], size: 0, mime: f.mime, viewers: [], created: new Date().toISOString() };
          if (state.spreadsheets[f.id]) state.spreadsheets[id] = JSON.parse(JSON.stringify({ name: name, sheets: [] }));
          return fileApi(state.files[id]);
        }
      };
    }
    function folderApi(id) {
      return {
        getId: function () { return id; },
        getName: function () { return state.folders[id].name; },
        getUrl: function () { return 'https://drive.google.com/drive/folders/' + id; },
        createFolder: function (n) { return makeFolder(n, id); },
        getFoldersByName: function (n) {
          return iter(Object.keys(state.folders).map(function (k) { return state.folders[k]; })
            .filter(function (f) { return f.parent === id && f.name === n; }).map(function (f) { return folderApi(f.id); }));
        },
        getFiles: function () {
          return iter(Object.keys(state.files).map(function (k) { return state.files[k]; })
            .filter(function (f) { return f.parent === id; }).map(fileApi));
        },
        createFile: function (b) {
          if (state.failDriveWrite) throw new Error('Drive storage quota exceeded');
          var fid = newId('file');
          state.files[fid] = { id: fid, name: b.getName(), parent: id, bytes: b.getBytes(), mime: b.getContentType(), viewers: [], created: new Date().toISOString() };
          return fileApi(state.files[fid]);
        }
      };
    }
    function makeFolder(name, parent) {
      if (state.failDriveWrite) throw new Error('Drive quota exceeded');
      var id = newId('folder');
      state.folders[id] = { id: id, name: name, parent: parent };
      return folderApi(id);
    }
    var DriveApp = {
      createFolder: function (n) { return makeFolder(n, 'root'); },
      getFolderById: function (id) { if (!state.folders[id]) throw new Error('Folder tidak ditemukan'); return folderApi(id); },
      getFileById: function (id) { if (!state.files[id]) throw new Error('File tidak ditemukan'); return fileApi(state.files[id]); }
    };

    /* ----- Utilities ----- */
    function fmtParts(date, tz) {
      var p = new Intl.DateTimeFormat('en-GB', { timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(date);
      var o = {}; p.forEach(function (x) { o[x.type] = x.value; });
      if (o.hour === '24') o.hour = '00';
      return o;
    }
    var Utilities = {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      Charset: { UTF_8: 'UTF_8' },
      getUuid: uuid,
      computeDigest: function (alg, str) { return toSigned(sha256(utf8(str))); },
      base64Decode: function (s) { return toSigned(b64decode(s)); },
      base64Encode: function (bytes) { return b64encode(toU8(bytes)); },
      newBlob: function (data, mime, name) {
        var bytes = typeof data === 'string' ? toSigned(utf8(data)) : data;
        return blob(bytes, mime, name);
      },
      formatDate: function (date, tz, fmt) {
        var o = fmtParts(date, tz);
        return fmt.replace('yyyy', o.year).replace('yy', o.year.slice(2)).replace('MM', o.month).replace('dd', o.day)
          .replace('HH', o.hour).replace('mm', o.minute).replace('ss', o.second);
      }
    };

    /* ----- Properti, cache, lock ----- */
    var props = {
      getProperty: function (k) { return Object.prototype.hasOwnProperty.call(state.props, k) ? state.props[k] : null; },
      setProperty: function (k, v) { state.props[k] = String(v); return props; },
      setProperties: function (o) { Object.keys(o).forEach(function (k) { state.props[k] = String(o[k]); }); return props; }
    };
    var cache = {
      get: function (k) { var e = state.cache[k]; if (!e) return null; if (e.exp < Date.now()) { delete state.cache[k]; return null; } return e.v; },
      put: function (k, v, ttl) {
        if (String(v).length > 100 * 1024) throw new Error('Argument too large: value');
        state.cache[k] = { v: String(v), exp: Date.now() + Math.min(ttl || 600, 21600) * 1000 };
      },
      remove: function (k) { delete state.cache[k]; }
    };
    var lock = {
      tryLock: function () { if (state.lockHeld) return false; state.lockHeld = true; return true; },
      waitLock: function () { if (state.lockHeld) throw new Error('Lock timeout'); state.lockHeld = true; },
      releaseLock: function () { state.lockHeld = false; }
    };

    /* ----- Verifikasi ID token Google (tokeninfo) ----- */
    var UrlFetchApp = {
      fetch: function (url) {
        state.fetchCount++;
        var m = /tokeninfo\?id_token=([^&]+)/.exec(url);
        var tok = m ? decodeURIComponent(m[1]) : '';
        var info = state.tokens[tok];
        if (!info) return { getResponseCode: function () { return 400; }, getContentText: function () { return '{"error":"invalid_token"}'; } };
        return { getResponseCode: function () { return 200; }, getContentText: function () { return JSON.stringify(info); } };
      }
    };

    var globals = {
      SpreadsheetApp: SpreadsheetApp,
      DriveApp: DriveApp,
      Utilities: Utilities,
      PropertiesService: { getScriptProperties: function () { return props; } },
      CacheService: { getScriptCache: function () { return cache; } },
      LockService: { getScriptLock: function () { return lock; } },
      UrlFetchApp: UrlFetchApp,
      MailApp: { sendEmail: function (msg) { if (state.failMail) throw new Error('Service invoked too many times: email'); state.mails.push(msg); } },
      Session: { getEffectiveUser: function () { return { getEmail: function () { return state.effectiveEmail; } }; } },
      ContentService: {
        MimeType: { JSON: 'application/json' },
        createTextOutput: function (s) { return { _c: s, setMimeType: function () { return this; }, getContent: function () { return s; } }; }
      },
      Logger: { log: function () {} },
      console: opts.console || { log: function () {}, error: function () {}, warn: function () {} }
    };

    /** Mendaftarkan ID token yang dianggap "sudah diverifikasi Google". */
    function issueIdToken(email, extra) {
      var tok = 'hdr.' + randHex(24) + '.sig';
      var info = {
        aud: state.props.GOOGLE_CLIENT_ID, iss: 'https://accounts.google.com', email: email, email_verified: 'true',
        exp: String(Math.floor(Date.now() / 1000) + 3600), name: email.split('@')[0], picture: '', sub: '1' + state.idSeq
      };
      Object.keys(extra || {}).forEach(function (k) { info[k] = extra[k]; });
      state.tokens[tok] = info;
      return tok;
    }

    /* ----- Simpan/muat (dipakai mode demo di browser) ----- */
    var MAX_PERSIST_FILE = opts.maxPersistFileBytes || 350 * 1024;
    function serialize() {
      var files = {};
      Object.keys(state.files).forEach(function (k) {
        var f = state.files[k];
        var keep = f.bytes && f.bytes.length && f.bytes.length <= MAX_PERSIST_FILE;
        files[k] = { id: f.id, name: f.name, parent: f.parent, mime: f.mime, viewers: f.viewers, created: f.created,
          size: f.size !== undefined ? f.size : (f.bytes ? f.bytes.length : 0), b64: keep ? b64encode(toU8(f.bytes)) : '', lost: f.lost || (!keep && f.bytes && f.bytes.length > 0) };
      });
      var sheets = {};
      Object.keys(state.spreadsheets).forEach(function (id) {
        sheets[id] = { name: state.spreadsheets[id].name, sheets: state.spreadsheets[id].sheets.map(function (sh) {
          return { name: sh._name, data: sh._data.map(function (r) { return (r || []).map(function (v) { return v instanceof Date ? { $d: v.toISOString() } : v; }); }) };
        }) };
      });
      return JSON.stringify({ v: 1, spreadsheets: sheets, folders: state.folders, files: files, props: state.props, cache: state.cache, idSeq: state.idSeq, tokens: state.tokens });
    }
    function restore(json) {
      var o = typeof json === 'string' ? JSON.parse(json) : json;
      if (!o || o.v !== 1) return false;
      state.spreadsheets = {};
      Object.keys(o.spreadsheets).forEach(function (id) {
        var src = o.spreadsheets[id];
        state.spreadsheets[id] = { name: src.name, sheets: src.sheets.map(function (s) {
          var sh = makeSheet(s.name);
          sh._data = s.data.map(function (r) { return r.map(function (v) { return v && typeof v === 'object' && v.$d ? new Date(v.$d) : v; }); });
          return sh;
        }) };
      });
      state.folders = o.folders || {};
      state.files = {};
      Object.keys(o.files || {}).forEach(function (k) {
        var f = o.files[k];
        state.files[k] = { id: f.id, name: f.name, parent: f.parent, mime: f.mime, viewers: f.viewers || [], created: f.created,
          size: f.size, bytes: f.b64 ? toSigned(b64decode(f.b64)) : [], lost: !!f.lost };
      });
      state.props = o.props || {};
      state.cache = o.cache || {};
      state.idSeq = o.idSeq || 1;
      state.tokens = o.tokens || {};
      return true;
    }

    return { globals: globals, state: state, issueIdToken: issueIdToken, serialize: serialize, restore: restore, helpers: { toSigned: toSigned, toU8: toU8, b64encode: b64encode, b64decode: b64decode, sha256: sha256 } };
  }

  var api = { createGasSim: createGasSim };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MCMSGasSim = api;
})(typeof window !== 'undefined' ? window : globalThis);
