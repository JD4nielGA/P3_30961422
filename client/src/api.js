const apiFetch = async (path, opts = {}) => {
  const token = localStorage.getItem('token');
  const headers = opts.headers || {};
  if (!headers['Accept']) headers['Accept'] = 'application/json';
  if (!headers['Content-Type'] && opts.body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(path, { ...opts, headers, credentials: 'include' });
  const text = await res.text();
  try { return JSON.parse(text); } catch(e) { return text; }
}

export default {
  login: (payload) => apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  register: (payload) => apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  products: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch('/api/public/products' + (qs ? ('?' + qs) : ''))
  },
  createOrder: (payload) => apiFetch('/api/orders', { method: 'POST', body: JSON.stringify(payload) }),
  orders: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch('/api/orders' + (qs ? ('?' + qs) : ''))
  }
}
