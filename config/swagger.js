// config/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CineCríticas API',
      version: '1.0.0',
      description: 'API REST para sistema de reseñas de cine con autenticación JWT',
      contact: {
        name: 'Soporte CineCríticas',
        email: 'soporte@cinecriticas.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'OK'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            environment: {
              type: 'string',
              example: 'development'
            },
            version: {
              type: 'string',
              example: '1.0.0'
            },
            database: {
              type: 'string',
              example: 'connected'
            },
            auth: {
              type: 'string',
              example: 'JWT + Sessions Hybrid'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensaje de error'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            username: {
              type: 'string',
              example: 'usuario123'
            },
            email: {
              type: 'string',
              example: 'usuario@ejemplo.com'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              example: 'user'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Review: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            title: {
              type: 'string',
              example: 'Excelente película'
            },
            content: {
              type: 'string',
              example: 'Una película fantástica con gran actuación...'
            },
            rating: {
              type: 'integer',
              minimum: 1,
              maximum: 5,
              example: 5
            },
            movie_title: {
              type: 'string',
              example: 'Inception'
            },
            user_id: {
              type: 'integer',
              example: 1
            },
            is_featured: {
              type: 'boolean',
              example: false
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
        ,
        Order: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            user_id: { type: 'integer', example: 1 },
            status: { type: 'string', example: 'COMPLETED' },
            total_amount: { type: 'number', example: 29.99 },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        OrderItem: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            order_id: { type: 'integer', example: 1 },
            product_id: { type: 'integer', example: 2 },
            quantity: { type: 'integer', example: 2 },
            unit_price: { type: 'number', example: 9.99 }
          }
        }
        ,
        Payment: {
          type: 'object',
          properties: {
            movie_id: { type: 'integer', example: 2 },
            amount: { type: 'number', example: 12.99 },
            payment_method: { type: 'string', enum: ['card','paypal'], example: 'card' },
            card_type: { type: 'string', enum: ['visa','mastercard','amex'], example: 'visa', description: 'Tipo de tarjeta (visa, mastercard, amex) para validación UI' },
            card_number: { type: 'string', example: '4242 4242 4242 4242' },
            expiry_date: { type: 'string', example: '12/26', description: 'Formato MM/AA' },
            cvv: { type: 'string', example: '123' },
            card_holder: { type: 'string', example: 'Juan Pérez' }
          },
          required: ['movie_id','amount','payment_method']
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: 'Endpoints de verificación de salud del servidor'
      },
      {
        name: 'Authentication',
        description: 'Endpoints de autenticación y gestión de usuarios'
      },
      {
        name: 'Users',
        description: 'Endpoints de gestión de usuarios'
      },
      {
        name: 'Reviews',
        description: 'Endpoints de gestión de reseñas'
      },
      {
        name: 'Admin',
        description: 'Endpoints de administración (requieren rol admin)'
      },
      {
        name: 'Pages',
        description: 'Páginas web renderizadas'
      },
      {
        name: 'Test',
        description: 'Endpoints de prueba'
      }
      ,
      {
        name: 'Orders',
        description: 'Endpoints de gestión de órdenes y checkout'
      }
    ]
  },
  apis: [
    './app.js',
    './routes/*.js',
    './controllers/*.js',
    './models/*.js'
  ],
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs
};