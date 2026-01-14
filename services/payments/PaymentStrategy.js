class PaymentStrategy {
  // payload: { amount, currency, paymentDetails }
  async processPayment(payload) {
    throw new Error('processPayment debe implementarse en la estrategia concreta');
  }
}

module.exports = PaymentStrategy;
