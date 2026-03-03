// Use VITE_API_URL in production (e.g. https://api.yourdomain.com). Dev: proxy /api to backend.
const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || '/api';

export function getToken() {
  return localStorage.getItem('attendance_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('attendance_token', token);
  else localStorage.removeItem('attendance_token');
}

async function req(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers['Authorization'] = `Token ${token}`;

  const res = await fetch(`${API}${path}`, {
    headers,
    ...options,
  });

  if (res.status === 401) {
    setToken(null);
    throw new Error('Unauthorized');
  }

  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text || res.statusText);
  }
}

export const api = {
  get: (path) => req(path),
  post: (path, body) => req(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => req(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => req(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => req(path, { method: 'DELETE' }),

  auth: {
    login: (username, password) =>
      api.post('/auth/login/', { username, password }),
    signup: (username, password) =>
      api.post('/auth/signup/', { username, password }),
    resetPassword: (username, new_password) =>
      api.post('/auth/reset-password/', { username, new_password }),
  },

  classes: {
    list: () => api.get('/classes/'),
    create: (data) => api.post('/classes/', data),
    get: (id) => api.get(`/classes/${id}/`),
    update: (id, data) => api.patch(`/classes/${id}/`, data),
    delete: (id) => api.delete(`/classes/${id}/`),
  },
  columns: (classId) => ({
    list: () => api.get(`/classes/${classId}/columns/`),
    create: (data) => api.post(`/classes/${classId}/columns/`, data),
    update: (id, data) => api.patch(`/classes/${classId}/columns/${id}/`, data),
    delete: (id) => api.delete(`/classes/${classId}/columns/${id}/`),
  }),
  rows: (classId) => ({
    list: () => api.get(`/classes/${classId}/rows/`),
    create: (data) => api.post(`/classes/${classId}/rows/`, data),
    update: (id, data) => api.patch(`/classes/${classId}/rows/${id}/`, data),
    delete: (id) => api.delete(`/classes/${classId}/rows/${id}/`),
  }),
  cells: (classId) => ({
    list: () => api.get(`/classes/${classId}/cells/`),
    bulk: (cells) => api.post(`/classes/${classId}/cells/bulk/`, { cells }),
    set: (rowId, columnId, value) =>
      api.put(`/classes/${classId}/cells/${rowId}/${columnId}/`, { value }),
  }),
  monthConfigs: (classId) => ({
    list: () => api.get(`/classes/${classId}/month-configs/`),
    create: (data) => api.post(`/classes/${classId}/month-configs/`, data),
    update: (id, data) => api.patch(`/classes/${classId}/month-configs/${id}/`, data),
    delete: (id) => api.delete(`/classes/${classId}/month-configs/${id}/`),
  }),
  holidays: (classId) => ({
    list: (month, year) => {
      const q = [];
      if (month != null) q.push(`month=${month}`);
      if (year != null) q.push(`year=${year}`);
      return api.get(`/classes/${classId}/holidays/${q.length ? '?' + q.join('&') : ''}`);
    },
    create: (data) => api.post(`/classes/${classId}/holidays/`, data),
    delete: (id) => api.delete(`/classes/${classId}/holidays/${id}/`),
  }),
  attendance: (classId) => ({
    list: (month, year) => api.get(`/classes/${classId}/attendance/?month=${month}&year=${year}`),
    bulk: (data) => api.post(`/classes/${classId}/attendance/bulk/`, data),
  }),

  async exportBlob(classId, month, year) {
    const token = getToken();
    const url = `${API}/classes/${classId}/export/?month=${month}&year=${year}`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Token ${token}` } : {},
    });
    if (res.status === 401) {
      setToken(null);
      throw new Error('Unauthorized');
    }
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  },
};
