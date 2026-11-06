/**
 * Konfigurasi MCMS — HANYA file ini yang perlu diubah setelah deploy.
 * Tidak ada rahasia di sini: Client ID Google memang bersifat publik,
 * dan keamanan data dijamin oleh verifikasi di server Apps Script.
 */
window.MCMS_CONFIG = {
  // URL Web App Apps Script (Deploy → Web app → URL yang berakhiran /exec)
  API_URL: 'GANTI_DENGAN_URL_WEB_APP/exec',

  // Client ID OAuth dari Google Cloud Console (sama dengan di Setup.gs)
  GOOGLE_CLIENT_ID: 'GANTI_DENGAN_CLIENT_ID.apps.googleusercontent.com',

  // true = coba tampilan tanpa backend (data contoh, tidak tersimpan ke Google).
  // Setelah API_URL & GOOGLE_CLIENT_ID diisi, ubah menjadi false.
  DEMO_MODE: true
};
