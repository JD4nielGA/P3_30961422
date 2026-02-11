const buildQuery = (obj) => {
  const qs = new URLSearchParams();
  Object.keys(obj || {}).forEach(k => {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') qs.append(k, obj[k]);
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
}

const _fetch = async (url, opts = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = opts.headers || {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  headers['Accept'] = 'application/json';
  if (opts.body && !(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, { ...opts, headers });
  const text = await res.text();
  try { return JSON.parse(text); } catch (e) { return text; }
}

export default {
  products: (params) => _fetch(`/api/public/products${buildQuery(params)}`),
  login: (body) => _fetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => _fetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  orders: (params) => _fetch(`/api/orders${buildQuery(params)}`),
  createOrder: (body) => _fetch('/api/orders', { method: 'POST', body: JSON.stringify(body) }),
}
