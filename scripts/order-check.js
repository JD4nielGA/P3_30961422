(async ()=>{
  const base = 'http://127.0.0.1:3000';
  const wait = ms => new Promise(r=>setTimeout(r,ms));

  async function login(){
    const res = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Accept':'application/json','Content-Type':'application/json' }, body: JSON.stringify({ username: 'usuario', password: 'password123' }) });
    const j = await res.json();
    console.log('LOGIN', res.status, j);
    return j.token;
  }

  try{
    const token = await login();
    if (!token) { console.error('No token, abort'); process.exit(1); }

    const prodRes = await fetch(base + '/api/public/products', { headers: { Accept: 'application/json', Authorization: 'Bearer '+token } });
    const prodJson = await prodRes.json();
    console.log('PRODUCTS', prodRes.status, (prodJson.data||[]).length);
    if (!prodJson.data || prodJson.data.length===0) return console.error('NO_PRODUCTS');
    const first = prodJson.data[0];

    console.log('Sending order for product', first.id);
    const payload = { items:[{ productId:first.id, quantity:1 }], paymentMethod: 'card', paymentDetails: { card_number:'4242424242424242', expiry_date:'12/30', cvv:'123', card_holder:'Tester' } };

    const controller = new AbortController();
    const timeout = setTimeout(()=>{ controller.abort(); }, 15000);

    try{
      const orderRes = await fetch(base + '/api/orders', { method: 'POST', headers: { 'Accept':'application/json','Content-Type':'application/json', Authorization: 'Bearer '+token }, body: JSON.stringify(payload), signal: controller.signal });
      clearTimeout(timeout);
      let text;
      try { text = await orderRes.text(); } catch(e){ text = '<no body>'; }
      console.log('ORDER RESPONSE', orderRes.status, text);
    } catch (err) {
      console.error('ORDER ERROR', err.name || err.message, err);
    }

  } catch (err) {
    console.error('ERR',err);
  }
})();
