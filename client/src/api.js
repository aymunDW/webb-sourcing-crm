const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function getToken() {
  return localStorage.getItem('webb_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),

  getSuppliers: () => request('/suppliers'),
  createSupplier: (body) => request('/suppliers', { method: 'POST', body }),
  updateSupplier: (id, body) => request(`/suppliers/${id}`, { method: 'PUT', body }),
  deleteSupplier: (id) => request(`/suppliers/${id}`, { method: 'DELETE' }),

  getRequests: () => request('/requests'),
  createRequest: (body) => request('/requests', { method: 'POST', body }),
  updateRequest: (id, body) => request(`/requests/${id}`, { method: 'PUT', body }),
  deleteRequest: (id) => request(`/requests/${id}`, { method: 'DELETE' }),

  getActivity: () => request('/activity'),
  addNote: (text) => request('/activity', { method: 'POST', body: { text } }),
};

export function setToken(token) {
  if (token) localStorage.setItem('webb_token', token);
  else localStorage.removeItem('webb_token');
}
export function getStoredToken() { return getToken(); }
