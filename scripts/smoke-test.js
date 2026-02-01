(async function(){
  const base = 'http://127.0.0.1:3000';
  const wait = ms => new Promise(r=>setTimeout(r,ms));

  async function healthReady(){
    for(let i=0;i<30;i++){
      try{
        const res = await fetch(base+'/health', { headers: { Accept: 'application/json' } });
        if (res.ok){ const j = await res.json(); if (j.status==='OK') return true; }
      }catch(e){}
      await wait(1000);
    }
    return false;
  }

  if (!await healthReady()){
    console.error('SERVER_NOT_READY'); process.exit(1);
  }

  try{
    const ts = Math.floor(Date.now()/1000);
    const username = `smoke_user_${ts}`;
    const email = `smoke_${ts}@example.com`;
    const password = 'password123';

    console.log('1) Register', username);
    try{
      const r = await fetch(base+'/api/auth/register', { method: 'POST', headers: { 'Accept':'application/json','Content-Type':'application/json' }, body: JSON.stringify({ username, email, password, confirmPassword: password }) });
      const j = await r.json().catch(()=>null);
      console.log('  REG:', r.status, j);
    } catch(e){ console.log('  REG ERROR', e.message) }

    console.log('2) Login');
    let token = null;
    try{
      const r = await fetch(base+'/api/auth/login', { method: 'POST', headers: { 'Accept':'application/json','Content-Type':'application/json' }, body: JSON.stringify({ username, password }) });
      const j = await r.json();
      console.log('  LOGIN:', r.status, j && j.token ? 'TOKEN_RECEIVED' : j);
      token = j && j.token;
    } catch(e){ console.log('  LOGIN ERR', e.message) }

    if (!token){ console.error('NO_TOKEN'); process.exit(1); }

    console.log('3) Get products');
    const prodRes = await fetch(base+'/api/public/products', { headers: { Accept: 'application/json', Authorization: 'Bearer '+token } });
    const prodJson = await prodRes.json();
    console.log('  PRODUCTS count:', (prodJson.data || []).length);
    if (!prodJson.data || prodJson.data.length===0){ console.error('NO_PRODUCTS'); process.exit(1); }
    const first = prodJson.data[0];

    console.log('4) Create order for product', first.id);
    const orderPayload = { items: [{ productId: first.id, quantity: 1 }], paymentMethod: 'card', paymentDetails: { card_number:'4242424242424242', expiry_date:'12/30', cvv:'123', card_holder:'Smoke Tester' } };
    const orderRes = await fetch(base+'/api/orders', { method: 'POST', headers: { 'Accept':'application/json','Content-Type':'application/json', Authorization: 'Bearer '+token }, body: JSON.stringify(orderPayload) });
    const orderJson = await orderRes.json();
    console.log('  ORDER:', orderRes.status, orderJson);
    if (!orderJson.success){ console.error('ORDER_FAILED'); process.exit(1); }

    console.log('5) List orders');
    const listRes = await fetch(base+'/api/orders', { headers: { Accept: 'application/json', Authorization: 'Bearer '+token } });
    const listJson = await listRes.json();
    console.log('  ORDERS:', listRes.status, listJson && listJson.data && listJson.data.rows ? listJson.data.rows.length : 0);

    console.log('SMOKE_TEST_DONE');
    process.exit(0);
  } catch (err){ console.error('SMOKE ERROR', err); process.exit(1); }
})();
