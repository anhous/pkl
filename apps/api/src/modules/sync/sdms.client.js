'use strict';

// Klien HTTP untuk SDMS SMKN 1 Kras.
// Kontrak diverifikasi dari bundle frontend SDMS (http://sdms.smkn1kras.sch.id):
// - Base: {baseUrl}/api/v1 ; axios baseURL "/api/v1", timeout 15s
// - Login: POST /auth/login {username, password} -> {data:{access_token, refresh_token, user}}
// - Refresh: POST /auth/refresh {refresh_token} -> {data:{access_token}} (bundle pakai /api/v1/auth/refresh)
// - Header: Authorization: Bearer <access_token>
// - Pull master: GET /master/{siswa,guru,jurusan,kelas,pegawai,mapel,...} {params}
// - Push jurnal (kanal resmi untuk app satelit): GET /gateway/jurnal/test, POST /gateway/jurnal/sync
// - Health: GET /gateway/health
// SDMS TIDAK punya master DUDI/instruktur → DUDI & Instruktur dimiliki lokal app PKL.

const DEFAULT_TIMEOUT_MS = 15000;

class SdmsError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

class SdmsClient {
  constructor({ baseUrl, username, password, apiKey, timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl } = {}) {
    this.baseUrl = String(baseUrl || '').replace(/\/+$/, '');
    this.username = username;
    this.password = password;
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl || fetch;
    this.accessToken = null;
    this.refreshToken = null;
  }

  get configured() {
    return Boolean(this.baseUrl && this.username && this.password);
  }

  assertConfigured() {
    if (!this.configured) {
      const e = new Error('SDMS belum dikonfigurasi (isi SDMS_BASE_URL/SDMS_USERNAME/SDMS_PASSWORD)');
      e.status = 503;
      throw e;
    }
  }

  async rawRequest(method, path, { params, body } = {}) {
    this.assertConfigured();
    let url = `${this.baseUrl}/api/v1${path}`;
    if (params && Object.keys(params).length) {
      url += `?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString()}`;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(url, {
        method,
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
          // FAQ INTEGRATION.md: pull memakai Bearer + X-API-Key
          ...(this.apiKey ? { 'X-API-Key': this.apiKey } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new SdmsError(data.message || `SDMS ${res.status}`, { status: res.status, body: data });
      return data;
    } catch (e) {
      if (e.name === 'AbortError') throw new SdmsError(`SDMS timeout ${this.timeoutMs}ms`, { status: 504 });
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  // Request dengan auto-login + 1x retry refresh saat 401 (meniru interceptor SDMS).
  async request(method, path, opts = {}) {
    if (!this.accessToken) await this.login();
    try {
      return await this.rawRequest(method, path, opts);
    } catch (e) {
      if (e.status === 401 && !opts._retried) {
        if (this.refreshToken) {
          try {
            const r = await this.rawRequest('POST', '/auth/refresh', { body: { refresh_token: this.refreshToken } });
            this.accessToken = r?.data?.access_token || r?.data?.data?.access_token;
            if (this.accessToken) return await this.rawRequest(method, path, { ...opts, _retried: true });
          } catch { /* jatuh ke login ulang */ }
        }
        await this.login();
        return await this.rawRequest(method, path, { ...opts, _retried: true });
      }
      throw e;
    }
  }

  async login() {
    const data = await this.rawRequest('POST', '/auth/login', {
      body: { username: this.username, password: this.password },
    });
    const payload = data?.data || {};
    if (!payload.access_token) throw new SdmsError('Login SDMS gagal: tanpa access_token', { status: 401, body: data });
    this.accessToken = payload.access_token;
    this.refreshToken = payload.refresh_token || null;
    return payload;
  }

  async health() {
    return this.request('GET', '/gateway/health');
  }

  async testJurnal() {
    return this.request('GET', '/gateway/jurnal/test');
  }

  async pushJurnal(payload) {
    return this.request('POST', '/gateway/jurnal/sync', { body: payload });
  }

  // Loop semua halaman list SDMS. Berhenti saat < perPage atau meta.last_page tercapai.
  async pullAll(path, { perPage = 100, params = {} } = {}) {
    const all = [];
    let page = 1;
    for (;;) {
      const envelope = await this.request('GET', path, { params: { ...params, page, limit: perPage, per_page: perPage } });
      const { rows, meta } = require('./mappers').normalizeList(envelope);
      all.push(...rows);
      const lastPage = meta?.last_page || meta?.lastPage || meta?.totalPages;
      if (lastPage ? page >= lastPage : rows.length < perPage) break;
      page += 1;
      if (page > 500) break; // pengaman
    }
    return all;
  }
}

module.exports = { SdmsClient, SdmsError };
