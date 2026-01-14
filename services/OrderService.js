const { sequelize, Product, Order, OrderItem } = require('../models');
const CreditCardPaymentStrategy = require('./payments/CreditCardPaymentStrategy');

class OrderService {
  constructor() {}

  _selectStrategy(method) {
    switch ((method || '').toLowerCase()) {
      case 'creditcard':
      case 'card':
      case 'credit_card':
        return new CreditCardPaymentStrategy();
      default:
        return new CreditCardPaymentStrategy();
    }
  }

  async createOrder(userId, items = [], paymentMethod, paymentDetails = {}) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      const e = new Error('No items provided');
      e.code = 'NO_ITEMS';
      throw e;
    }

    // run everything in a transaction
    return await sequelize.transaction(async (t) => {
      // 1) Verify stock and collect product snapshots
      const productSnapshots = [];
      let total = 0.0;

      for (const it of items) {
        const productId = it.productId || it.id || it.product_id;
        const quantity = parseInt(it.quantity, 10) || 0;

        if (!productId || quantity <= 0) {
          const err = new Error('Invalid item payload');
          err.code = 'INVALID_ITEM';
          throw err;
        }

        const product = await Product.findByPk(productId, { transaction: t });
        if (!product) {
          const err = new Error(`Product ${productId} not found`);
          err.code = 'PRODUCT_NOT_FOUND';
          throw err;
        }

        if (product.stock < quantity) {
          const err = new Error(`Insufficient stock for product ${productId}`);
          err.code = 'INSUFFICIENT_STOCK';
          throw err;
        }

        const unitPrice = parseFloat(product.price || 0.0);
        total += unitPrice * quantity;

        productSnapshots.push({ product, quantity, unitPrice });
      }

      // 2) Process payment via strategy
      const strategy = this._selectStrategy(paymentMethod);
      const paymentResult = await strategy.processPayment({ amount: total, currency: paymentDetails.currency || 'USD', paymentDetails });

      if (!paymentResult || paymentResult.success !== true) {
        const err = new Error('Payment failed');
        err.code = 'PAYMENT_FAILED';
        throw err;
      }

      // 3) Update stock
      for (const snap of productSnapshots) {
        const newStock = snap.product.stock - snap.quantity;
        await snap.product.update({ stock: newStock }, { transaction: t });
      }

      // 4) Create order and order items
      const order = await Order.create({ user_id: userId, status: 'COMPLETED', total_amount: total }, { transaction: t });

      for (const snap of productSnapshots) {
        await OrderItem.create({ order_id: order.id, product_id: snap.product.id, quantity: snap.quantity, unit_price: snap.unitPrice }, { transaction: t });
      }

      // reload with items
      const saved = await Order.findByPk(order.id, { include: [{ model: OrderItem, as: 'items' }], transaction: t });
      return saved;
    });
  }

  async listOrdersForUser(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const orders = await Order.findAndCountAll({ where: { user_id: userId }, include: [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }], limit, offset, order: [['created_at', 'DESC']] });
    return orders;
  }

  async getOrderById(userId, orderId) {
    const order = await Order.findByPk(orderId, { include: [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }] });
    if (!order) return null;
    if (order.user_id !== userId) return null;
    return order;
  }
}

module.exports = new OrderService();
