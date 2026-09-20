const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function req(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const t = token || (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `API ${res.status}`);
  return data;
}

export const apiLogin = (email, password) => req('/auth/login', { method: 'POST', body: { email, password } });
export const apiMe = () => req('/auth/me');
export const apiForgotPassword = (email) => req('/auth/forgot-password', { method: 'POST', body: { email } });
export const apiResetPassword = (token, password) => req('/auth/reset-password', { method: 'POST', body: { token, password } });
export const apiChangePassword = (currentPassword, newPassword) => req('/auth/password', { method: 'PATCH', body: { currentPassword, newPassword } });
export const apiChangeEmail = (newEmail) => req('/auth/email', { method: 'PATCH', body: { newEmail } });

export const apiList = (entity, params = {}) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
  return req(`/master/${entity}${qs ? `?${qs}` : ''}`);
};
export const apiPenempatanList = (params = {}) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
  return req(`/penempatan${qs ? `?${qs}` : ''}`);
};
export const apiSyncLogs = (params = {}) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
  return req(`/sync/logs${qs ? `?${qs}` : ''}`);
};

export const apiJurnalList = (params = {}) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
  return req(`/jurnal${qs ? `?${qs}` : ''}`);
};
export async function apiJurnalCreate(formData) {
  const t = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const res = await fetch(`${API_BASE}/jurnal`, {
    method: 'POST', body: formData, credentials: 'include',
    headers: t ? { Authorization: `Bearer ${t}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `API ${res.status}`);
  return data;
}
export const apiJurnalNilai = (id, body) => req(`/jurnal/${id}/nilai`, { method: 'PATCH', body });
export const apiPresensiList = (params = {}) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
  return req(`/presensi${qs ? `?${qs}` : ''}`);
};
export const apiPresensiCreate = (body) => req('/presensi', { method: 'POST', body });

const qa = (params = {}) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
  return qs ? `?${qs}` : '';
};
export const apiOverview = () => req('/analitik/overview');
export const apiDudiMap = () => req('/analitik/dudi-map');
export const apiKehadiran = (p) => req(`/analitik/kehadiran${qa(p)}`);
export const apiDudiTerbaik = (p) => req(`/analitik/dudi-terbaik${qa(p)}`);
export const apiNilaiTertinggi = (p) => req(`/analitik/siswa-nilai-tertinggi${qa(p)}`);
export const apiTerajin = (p) => req(`/analitik/siswa-terajin${qa(p)}`);
export const apiBermasalah = (p) => req(`/analitik/siswa-bermasalah${qa(p)}`);
export const apiTeraktif = (p) => req(`/analitik/jurnal-teraktif${qa(p)}`);
export const apiExportUrl = (type) => `${API_BASE}/analitik/export?type=${type}`;

export const apiSyncStatus = () => req('/sync/status');
export const apiSyncPull = (entity) => req(`/sync/${entity}/pull`, { method: 'POST' });
export const apiSyncPush = (limit = 100) =>
  fetch(`${API_BASE}/sync/jurnal/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(typeof window !== 'undefined' && localStorage.getItem('accessToken') ? { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } : {}) },
    body: JSON.stringify({ limit }),
    credentials: 'include',
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `API ${res.status}`);
    return data;
  });
