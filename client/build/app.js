(function(){
  const API = {
    getProducts: () => apiFetch('/api/public/products'),
    login: (payload) => apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
    register: (payload) => apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
    createOrder: (payload, token) => apiFetch('/api/orders', { method: 'POST', body: JSON.stringify(payload), token }),
    listOrders: (page=1, limit=10, token) => apiFetch(`/api/orders?page=${page}&limit=${limit}`, { token }) ,
    verify: (token) => apiFetch('/api/auth/verify', { token })
  };

  const $ = sel => document.querySelector(sel);
  const app = $('#app');
  const toast = $('#toast');

  function apiFetch(url, opts = {}){
    const headers = opts.headers || {};
    headers['Accept'] = 'application/json';
    headers['Content-Type'] = 'application/json';
    if (opts.token || localStorage.getItem('token')) {
      const token = opts.token || localStorage.getItem('token');
      headers['Authorization'] = 'Bearer '+token;
    }
    const fetchOpts = { method: opts.method || 'GET', headers, body: opts.body, credentials: 'include' };
    showLoading(true);
    return fetch(url, fetchOpts).then(async res => {
      showLoading(false);
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) throw data;
        return data;
      } else {
        const text = await res.text();
        if (!res.ok) throw { error: text };
        return text;
      }
    }).catch(err => { showLoading(false); throw err; });
  }

  function showToast(msg, timeout=3000){
    toast.textContent = msg; toast.classList.remove('hidden');
    setTimeout(()=>toast.classList.add('hidden'), timeout);
  }

  function showLoading(on){
    if (on) {
      if (!$('#loading')){
        const el = document.createElement('div'); el.id='loading'; el.textContent='Cargando...'; el.style.position='fixed'; el.style.left='16px'; el.style.bottom='16px'; el.style.background='#000'; el.style.color='#fff'; el.style.padding='6px 10px'; el.style.borderRadius='6px'; document.body.appendChild(el);
      }
    } else {
      const l = $('#loading'); if (l) l.remove();
    }
  }

  // --- Auth helpers ---
  async function tryRestoreSession(){
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const res = await API.verify(token);
      if (res && res.user) {
        localStorage.setItem('user', JSON.stringify(res.user));
        updateAuthLinks();
        return res.user;
      }
    } catch (err) {
      console.warn('Session restore failed', err);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    updateAuthLinks();
    return null;
  }

  function logout(){
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateAuthLinks();
    location.hash = '#/login';
  }

  function updateAuthLinks(){
    const user = JSON.parse(localStorage.getItem('user')||'null');
    $('#link-login').textContent = user ? ('Salir '+(user.username||'')) : 'Login';
    $('#link-profile').style.display = user ? 'inline' : 'none';
    $('#link-orders').style.display = user ? 'inline' : 'none';
  }

  // --- Cart ---
  function loadCart(){
    return JSON.parse(localStorage.getItem('cart')||'[]');
  }
  function saveCart(cart){ localStorage.setItem('cart', JSON.stringify(cart)); renderCartCount(); }
  function addToCart(product){
    const cart = loadCart();
    const found = cart.find(i=>i.productId===product.id);
    if (found) found.quantity += 1; else cart.push({ productId: product.id, name: product.name, price: product.price, quantity: 1 });
    saveCart(cart); showToast('Añadido al carrito');
  }
  function renderCartCount(){ const cart = loadCart(); const total = cart.reduce((s,i)=>s+i.quantity,0); $('#cart-count').textContent = total; }

  // --- Views ---
  async function viewHome(){
    app.innerHTML = `<div class="card"><h2>Bienvenido a CineCríticas</h2><p>Explora nuestras películas y tienda.</p></div>`;
  }

  async function viewCatalog(){
    app.innerHTML = `<div class="card"><h2>Catálogo</h2>
      <div class="filters">
        <input id="filter-q" placeholder="Buscar..." />
        <input id="filter-min" type="number" placeholder="Min precio" />
        <input id="filter-max" type="number" placeholder="Max precio" />
        <button id="apply-f" class="button">Aplicar</button>
      </div>
      <div id="products" class="grid"></div>
    </div>`;

    try {
      const res = await API.getProducts();
      const products = res.data || [];
      function renderList(items){
        const container = $('#products'); container.innerHTML = '';
        if (items.length===0) return container.innerHTML = '<div class="card">No hay productos</div>';
        items.forEach(p=>{
          const el = document.createElement('div'); el.className='card product';
          el.innerHTML = `<img src="${p.image||'/images/default-poster.jpg'}" alt=""><h3>${p.name}</h3><p>${p.description||''}</p><p><strong>$${(p.price||0).toFixed(2)}</strong></p><div><button class="button btn-add">Agregar</button><button class="button secondary btn-detail">Detalle</button></div>`;
          el.querySelector('.btn-add').addEventListener('click', ()=>addToCart(p));
          el.querySelector('.btn-detail').addEventListener('click', ()=>{ location.hash = '#/product/'+p.id });
          container.appendChild(el);
        });
      }

      renderList(products);

      $('#apply-f').addEventListener('click', ()=>{
        const q = $('#filter-q').value.trim().toLowerCase();
        const min = parseFloat($('#filter-min').value) || 0;
        const max = parseFloat($('#filter-max').value) || Infinity;
        const filtered = products.filter(p=> (p.name||'').toLowerCase().includes(q) && (parseFloat(p.price||0) >= min) && (parseFloat(p.price||0) <= max));
        renderList(filtered);
      });

    } catch (err) {
      console.error(err); app.innerHTML = `<div class="card">Error cargando catálogo</div>`;
    }
  }

  async function viewProduct(id){
    try {
      const res = await API.getProducts();
      const product = (res.data||[]).find(p=>String(p.id)===String(id));
      if (!product) return app.innerHTML = '<div class="card">Producto no encontrado</div>';
      app.innerHTML = `<div class="card"><h2>${product.name}</h2><img src="${product.image||'/images/default-poster.jpg'}" style="max-width:240px"><p>${product.description||''}</p><p>Precio: <strong>$${(product.price||0).toFixed(2)}</strong></p><div><button id="add" class="button">Agregar al carrito</button></div></div>`;
      $('#add').addEventListener('click', ()=>addToCart(product));
    } catch (err){ console.error(err); app.innerHTML = '<div class="card">Error</div>' }
  }

  function viewCart(){
    const cart = loadCart();
    if (cart.length===0) return app.innerHTML = '<div class="card">Tu carrito está vacío</div>';
    let total = cart.reduce((s,i)=>s+i.price*i.quantity,0);
    app.innerHTML = `<div class="card"><h2>Carrito</h2><div id="cart-items"></div><p><strong>Total: $${total.toFixed(2)}</strong></p><div><button id="checkout" class="button">Ir a checkout</button></div></div>`;
    const ci = $('#cart-items'); cart.forEach((it, idx)=>{
      const el = document.createElement('div'); el.className='card'; el.innerHTML = `<strong>${it.name}</strong> x ${it.quantity} - $${(it.price*it.quantity).toFixed(2)} <button data-idx="${idx}" class="button secondary btn-remove">Quitar</button>`;
      ci.appendChild(el);
    });
    ci.addEventListener('click', (e)=>{ if (e.target.matches('.btn-remove')){ const i = parseInt(e.target.dataset.idx,10); cart.splice(i,1); saveCart(cart); viewCart(); } });
    $('#checkout').addEventListener('click', ()=>{ location.hash = '#/checkout' });
  }

  function requireAuthToView(){ if (!localStorage.getItem('token')){ location.hash = '#/login'; return false } return true }

  async function viewCheckout(){
    if (!requireAuthToView()) return;
    const cart = loadCart(); if (cart.length===0) return app.innerHTML = '<div class="card">Carrito vacío</div>';
    const total = cart.reduce((s,i)=>s+i.price*i.quantity,0);
    app.innerHTML = `<div class="card"><h2>Checkout</h2><p>Total: <strong>$${total.toFixed(2)}</strong></p>
      <div class="form-row"><label>Nombre en tarjeta</label><input id="card-name" type="text"></div>
      <div class="form-row"><label>Número de tarjeta</label><input id="card-num" type="text"></div>
      <div class="form-row"><label>Expiración</label><input id="card-exp" type="text" placeholder="MM/YY"></div>
      <div class="form-row"><label>CVV</label><input id="card-cvv" type="text"></div>
      <div><button id="pay" class="button">Pagar</button></div>
    </div>`;

    $('#pay').addEventListener('click', async ()=>{
      const items = cart.map(i=>({ productId: i.productId, quantity: i.quantity }));
      const paymentDetails = { card_holder: $('#card-name').value, card_number: $('#card-num').value, expiry_date: $('#card-exp').value, cvv: $('#card-cvv').value };
      try {
        const token = localStorage.getItem('token');
        const res = await API.createOrder({ items, paymentMethod: 'card', paymentDetails }, token);
        if (res && res.success) {
          localStorage.removeItem('cart'); renderCartCount(); showToast('Compra exitosa'); location.hash = '#/orders';
        } else {
          showToast('Error en la compra');
        }
      } catch (err) {
        console.error(err); showToast(err && err.error ? err.error : 'Error procesando pago');
      }
    });
  }

  async function viewOrders(){
    if (!requireAuthToView()) return;
    app.innerHTML = '<div class="card"><h2>Mis Pedidos</h2><div id="orders-list">Cargando...</div></div>';
    try {
      const token = localStorage.getItem('token');
      const res = await API.listOrders(1, 20, token);
      if (!res.success) throw res;
      const rows = res.data.rows || [];
      const container = $('#orders-list'); container.innerHTML = '';
      if (rows.length===0) return container.innerHTML = '<div class="card">No hay pedidos</div>';
      rows.forEach(o=>{
        const el = document.createElement('div'); el.className='card'; el.innerHTML = `<h3>Pedido #${o.id}</h3><p>Total: $${(o.total_amount||0).toFixed(2)}</p><p>Items: ${o.items ? o.items.length : 0}</p>`;
        container.appendChild(el);
      });
    } catch (err){ console.error(err); $('#orders-list').innerHTML = '<div class="card">Error cargando pedidos</div>' }
  }

  function viewProfile(){
    if (!requireAuthToView()) return;
    const user = JSON.parse(localStorage.getItem('user')||'null');
    app.innerHTML = `<div class="card"><h2>Perfil</h2><p>Usuario: ${user.username}</p><p>Email: ${user.email}</p></div>`;
  }

  function viewLogin(){
    app.innerHTML = `<div class="card"><h2>Iniciar sesión</h2>
      <div class="form-row"><label>Usuario</label><input id="f-user" type="text"></div>
      <div class="form-row"><label>Contraseña</label><input id="f-pass" type="password"></div>
      <div><button id="btn-login" class="button">Ingresar</button> <a href="#/register">Registrarse</a></div>
    </div>`;
    $('#btn-login').addEventListener('click', async ()=>{
      try {
        const username = $('#f-user').value.trim(); const password = $('#f-pass').value;
        const res = await API.login({ username, password });
        if (res && res.token) {
          localStorage.setItem('token', res.token);
          await tryRestoreSession();
          renderCartCount();
          showToast('Login exitoso');
          location.hash = '#/';
        } else {
          showToast('Credenciales inválidas');
        }
      } catch (err) { console.error(err); showToast(err && err.error ? err.error : 'Error al iniciar sesión'); }
    });
  }

  function viewRegister(){
    app.innerHTML = `<div class="card"><h2>Registrarse</h2>
      <div class="form-row"><label>Usuario</label><input id="r-user" type="text"></div>
      <div class="form-row"><label>Email</label><input id="r-email" type="text"></div>
      <div class="form-row"><label>Contraseña</label><input id="r-pass" type="password"></div>
      <div class="form-row"><label>Confirmar</label><input id="r-pass2" type="password"></div>
      <div><button id="btn-register" class="button">Crear cuenta</button></div>
    </div>`;
    $('#btn-register').addEventListener('click', async ()=>{
      try {
        const username = $('#r-user').value.trim(); const email = $('#r-email').value.trim(); const password = $('#r-pass').value; const confirmPassword = $('#r-pass2').value;
        const res = await API.register({ username, email, password, confirmPassword });
        // Backend for non-JSON renders redirect; but API returns JSON on Accept
        if (res && (res.success || res.token)) {
          if (res.token) localStorage.setItem('token', res.token);
          await tryRestoreSession();
          showToast('Registro exitoso'); location.hash = '#/';
        } else {
          showToast('Error en registro');
        }
      } catch (err) { console.error(err); showToast(err && err.error ? err.error : 'Error al registrar'); }
    });
  }

  // Router
  async function router(){
    const hash = location.hash || '#/';
    const parts = hash.replace('#/','').split('/');
    const route = parts[0] || '';
    if (hash === '#/logout') { logout(); return }
    updateAuthLinks();
    switch(route){
      case '': await viewHome(); break;
      case 'catalog': await viewCatalog(); break;
      case 'product': await viewProduct(parts[1]); break;
      case 'cart': viewCart(); break;
      case 'checkout': await viewCheckout(); break;
      case 'orders': await viewOrders(); break;
      case 'profile': viewProfile(); break;
      case 'login': viewLogin(); break;
      case 'register': viewRegister(); break;
      default: app.innerHTML = '<div class="card">Página no encontrada</div>';
    }
  }

  window.addEventListener('hashchange', router);
  window.addEventListener('load', async ()=>{ await tryRestoreSession(); renderCartCount(); router(); });

})();
