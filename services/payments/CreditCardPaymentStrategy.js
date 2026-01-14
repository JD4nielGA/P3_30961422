const https = require('https');
const PaymentStrategy = require('./PaymentStrategy');

class CreditCardPaymentStrategy extends PaymentStrategy {
  constructor() {
    super();
    this.endpoint = 'https://fakepayment.onrender.com/payments';
  }

  async processPayment({ amount, currency = 'USD', paymentDetails = {} }) {
    // Build body
    const body = JSON.stringify({ amount, currency, ...paymentDetails });

    return new Promise((resolve, reject) => {
      try {
        const url = new URL(this.endpoint);
        const options = {
          hostname: url.hostname,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          }
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data || '{}');
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve({ success: true, data: parsed });
              } else {
                resolve({ success: false, data: parsed });
              }
            } catch (err) {
              reject(err);
            }
          });
        });

        req.on('error', (err) => reject(err));
        req.write(body);
        req.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = CreditCardPaymentStrategy;
