const request = require('supertest');
const jwt = require('jsonwebtoken');

describe('Orders API (transaccional)', () => {
  let app;
  let DatabaseService;
  const JWT_SECRET = 'test-secret';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = JWT_SECRET;
    jest.resetModules();
    DatabaseService = require('../services/DatabaseService');
    await DatabaseService.initialize();
    const exported = require('../app');
    app = exported.app;
  });

  beforeEach(async () => {
    // clean products and orders tables for isolation
    const { Product, Order, OrderItem } = require('../models');
    await OrderItem.destroy({ where: {} });
    await Order.destroy({ where: {} });
    await Product.destroy({ where: {} });
  });

  test('should create order and reduce stock on successful payment', async () => {
    // mock payment strategy to always succeed
    jest.doMock('../services/payments/CreditCardPaymentStrategy', () => {
      return function () {
        this.processPayment = jest.fn().mockResolvedValue({ success: true, data: { transactionId: 'tx123' } });
      };
    });

    // recreate modules so OrderService picks up mocked strategy
    jest.resetModules();
    const DatabaseService2 = require('../services/DatabaseService');
    await DatabaseService2.initialize();
    const { Product } = require('../models');

    const ts1 = Date.now();
    const user = await DatabaseService2.createUser({ username: `buyer1_${ts1}`, email: `buyer1_${ts1}@test.com`, password_hash: 'pass' });
    const p = await Product.create({ name: 'P1', price: 5.00, stock: 5 });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);

    const res = await request(require('../app').app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: p.id, quantity: 2 }], paymentMethod: 'CreditCard', paymentDetails: { cardToken: 'tok_visa' } });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // verify stock reduced
    const refreshed = await Product.findByPk(p.id);
    expect(refreshed.stock).toBe(3);
  });

  test('should rollback when stock insufficient', async () => {
    jest.resetModules();
    const DatabaseService2 = require('../services/DatabaseService');
    await DatabaseService2.initialize();
    const { Product } = require('../models');

    const ts2 = Date.now();
    const user = await DatabaseService2.createUser({ username: `buyer2_${ts2}`, email: `buyer2_${ts2}@test.com`, password_hash: 'pass' });
    const p1 = await Product.create({ name: 'P2', price: 10.00, stock: 1 });
    const p2 = await Product.create({ name: 'P3', price: 3.00, stock: 5 });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);

    const res = await request(require('../app').app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: p1.id, quantity: 2 }, { productId: p2.id, quantity: 1 }], paymentMethod: 'CreditCard', paymentDetails: { cardToken: 'tok_visa' } });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    // stocks unchanged
    const rp1 = await Product.findByPk(p1.id);
    const rp2 = await Product.findByPk(p2.id);
    expect(rp1.stock).toBe(1);
    expect(rp2.stock).toBe(5);
  });

  test('should rollback when payment rejected', async () => {
    // mock payment to fail
    jest.doMock('../services/payments/CreditCardPaymentStrategy', () => {
      return function () {
        this.processPayment = jest.fn().mockResolvedValue({ success: false, data: { reason: 'card_declined' } });
      };
    });

    jest.resetModules();
    const DatabaseService2 = require('../services/DatabaseService');
    await DatabaseService2.initialize();
    const { Product } = require('../models');

    const ts3 = Date.now();
    const user = await DatabaseService2.createUser({ username: `buyer3_${ts3}`, email: `buyer3_${ts3}@test.com`, password_hash: 'pass' });
    const p = await Product.create({ name: 'P4', price: 7.00, stock: 4 });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);

    const res = await request(require('../app').app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: p.id, quantity: 2 }], paymentMethod: 'CreditCard', paymentDetails: { cardToken: 'tok_fail' } });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);

    const refreshed = await Product.findByPk(p.id);
    expect(refreshed.stock).toBe(4);
  });

  test('should deny access for unauthenticated users', async () => {
    const res = await request(require('../app').app).get('/api/orders');
    expect([401,400]).toContain(res.status);
  });
});
