const OrderService = require('../services/OrderService');

const OrderController = {
  async createOrderAPI(req, res) {
    try {
      const userId = req.user?.id;
      const { items, paymentMethod, paymentDetails } = req.body;
      const order = await OrderService.createOrder(userId, items, paymentMethod, paymentDetails);
      return res.status(201).json({ success: true, data: order });
    } catch (error) {
      console.error('Error createOrderAPI:', error.message);
      const status = error.code === 'INSUFFICIENT_STOCK' || error.code === 'NO_ITEMS' ? 400 : 500;
      return res.status(status).json({ success: false, error: error.message });
    }
  },

  async listOrdersAPI(req, res) {
    try {
      const userId = req.user?.id;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const result = await OrderService.listOrdersForUser(userId, page, limit);
      return res.json({ success: true, data: { count: result.count, rows: result.rows } });
    } catch (error) {
      console.error('Error listOrdersAPI:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async getOrderAPI(req, res) {
    try {
      const userId = req.user?.id;
      const orderId = parseInt(req.params.id, 10);
      const order = await OrderService.getOrderById(userId, orderId);
      if (!order) return res.status(404).json({ success: false, error: 'Order not found or access denied' });
      return res.json({ success: true, data: order });
    } catch (error) {
      console.error('Error getOrderAPI:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = OrderController;
