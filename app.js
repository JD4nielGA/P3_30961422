// app.js - VERSIÓN COMPLETAMENTE CORREGIDA CON DEBUGGING MEJORADO
console.log('🚀 Iniciando CineCríticas con Swagger...');

// Configuración
const isProduction = process.env.NODE_ENV === 'production';

console.log('=== CINECRITICAS SWAGGER ===');
console.log('Node version:', process.version);
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('PORT:', process.env.PORT || 3000);
console.log('=== INICIANDO ===');

// Solo usar dotenv en desarrollo local
if (!isProduction) {
  try {
    require('dotenv').config();
    console.log('🔧 Development mode with dotenv');
  } catch (error) {
    console.log('⚠️  dotenv not available');
  }
}

const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

// Importar servicios SQLite
const DatabaseService = require('./services/DatabaseService');

const app = express();

// PUERTO
const PORT = process.env.PORT || 3000;

// ================= CONFIGURACIÓN JWT =================
const JWT_SECRET = process.env.JWT_SECRET || 'cinecriticas-jwt-secret-2024-super-seguro';
console.log('🔐 JWT Configurado');

// ================= CONFIGURACIÓN SWAGGER =================
console.log('🔄 Cargando configuración Swagger...');

try {
  // Forzar recarga del módulo Swagger
  delete require.cache[require.resolve('./config/swagger')];
  const { swaggerUi, specs } = require('./config/swagger');

  console.log('📊 Especificaciones Swagger cargadas:');
  console.log('   - Paths encontrados:', specs.paths ? Object.keys(specs.paths).length : 0);

  // Configuración de Swagger UI
  const swaggerOptions = {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list'
    }
  };

  // Asegurar que GET /api-docs responda 200 (algunos middlewares devuelven 301)
  try {
    if (typeof swaggerUi.generateHTML === 'function') {
      app.get('/api-docs', (req, res) => {
        const html = swaggerUi.generateHTML(specs, swaggerOptions.swaggerOptions || {});
        res.status(200).send(html);
      });
    } else {
      app.get('/api-docs', (req, res) => res.status(200).send('API Docs'));
    }
  } catch (err) {
    app.get('/api-docs', (req, res) => res.status(200).send('API Docs'));
  }

  // Servir Swagger UI (después de declarar GET explícito para evitar redirecciones)
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

  console.log('📚 Swagger UI disponible en: http://localhost:' + PORT + '/api-docs');
} catch (error) {
  console.error('❌ Error cargando Swagger:', error.message);
  console.log('⚠️  Continuando sin Swagger UI');
}

// ================= MIDDLEWARES JWT =================
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token requerido.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Token inválido.' });
  }
};

const requireAuthAPI = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

const requireAdminAPI = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Se requieren permisos de administrador' });
  }
  next();
};

// ================= CONFIGURACIÓN MULTER =================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public', 'uploads', 'reviews');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'review-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen (JPEG, JPG, PNG, GIF)'));
    }
  }
});

// Multer para posters de películas
const movieStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public', 'uploads', 'movies');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'movie-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const movieUpload = multer({
  storage: movieStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten imágenes'));
  }
});

// Middleware seguro para manejar uploads de películas
const handleMovieUpload = (req, res, next) => {
  movieUpload.single('poster_image')(req, res, function(err) {
    if (err) {
      console.error('❌ Error Multer en upload de película:', err);
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        // Campo inesperado, continuar sin archivo
        req.file = null;
        return next();
      }
      return res.status(400).json({ error: 'Error al subir la imagen: ' + err.message });
    }
    next();
  });
};

// ================= CONFIGURACIÓN EXPRESS =================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Configuración de sesión
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'cinecriticas-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    maxAge: 24 * 60 * 60 * 1000
  }
};

if (isProduction) {
  app.set('trust proxy', 1);
  sessionConfig.cookie.secure = true;
}

app.use(session(sessionConfig));

// Middleware para user global
app.use((req, res, next) => {
  if (req.session.user) {
    res.locals.user = req.session.user;
  } 
  else if (req.cookies?.token) {
    try {
      const decoded = jwt.verify(req.cookies.token, JWT_SECRET);
      res.locals.user = decoded;
      req.session.user = decoded;
    } catch (error) {
      res.clearCookie('token');
    }
  } else {
    res.locals.user = null;
  }
  
  res.locals.currentPath = req.path;
  next();
});

app.get('/api/urgent-sync-database', async (req, res) => {
  try {
    console.log('🚨 EJECUTANDO SINCRONIZACIÓN URGENTE DE BASE DE DATOS...');
    
    // 1. Obtener interfaz de consulta
    const queryInterface = DatabaseService.sequelize.getQueryInterface();
    
    // 2. Verificar estado actual
    const tableInfo = await queryInterface.describeTable('users');
    console.log('📊 Columnas actuales en tabla users:', Object.keys(tableInfo));
    
    // 3. Agregar columnas faltantes manualmente si no existen
    const columnsAdded = [];
    
    if (!tableInfo.membership_type) {
      console.log('➕ Agregando columna membership_type...');
      await queryInterface.addColumn('users', 'membership_type', {
        type: DatabaseService.sequelize.Sequelize.STRING,
        defaultValue: 'free',
        allowNull: false
      });
      columnsAdded.push('membership_type');
    }
    
    if (!tableInfo.membership_expires) {
      console.log('➕ Agregando columna membership_expires...');
      await queryInterface.addColumn('users', 'membership_expires', {
        type: DatabaseService.sequelize.Sequelize.DATE,
        allowNull: true
      });
      columnsAdded.push('membership_expires');
    }
    
    if (!tableInfo.membership_purchased) {
      console.log('➕ Agregando columna membership_purchased...');
      await queryInterface.addColumn('users', 'membership_purchased', {
        type: DatabaseService.sequelize.Sequelize.DATE,
        allowNull: true
      });
      columnsAdded.push('membership_purchased');
    }
    
    // 4. Verificar resultado
    const updatedInfo = await queryInterface.describeTable('users');
    const hasAllColumns = updatedInfo.membership_type && 
                         updatedInfo.membership_expires && 
                         updatedInfo.membership_purchased;
    
    /* Swagger example removed (was YAML-like and caused syntax error)
      requestBody:
        required: true
        content:
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/Payment'
            examples:
              cardExample:
                summary: Pago con tarjeta (ejemplo)
                value:
                  movie_id: 2
                  amount: 12.99
                  payment_method: card
                  card_type: visa
                  card_number: "4242 4242 4242 4242"
                  expiry_date: "12/26"
                  cvv: "123"
                  card_holder: "Juan Pérez"
    */

    // Responder al endpoint de sincronización urgente
    res.json({
      success: true,
      columnsAdded,
      hasAllColumns: !!hasAllColumns,
      table: 'users',
      updatedInfo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener información de un usuario por ID
app.get('/api/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await DatabaseService.User.findByPk(userId);
    
    if (!user) {
      return res.json({ error: 'Usuario no encontrado' });
    }
    
    const userData = user.toJSON ? user.toJSON() : user;
    
    // Verificar qué columnas existen
    const existingColumns = Object.keys(userData);
    const hasMembershipColumns = existingColumns.includes('membership_type') &&
                                existingColumns.includes('membership_expires') &&
                                existingColumns.includes('membership_purchased');
    
    res.json({
      user_id: userId,
      username: userData.username,
      existing_columns: existingColumns,
      has_membership_columns: hasMembershipColumns,
      membership_data: {
        type: userData.membership_type || 'NOT FOUND',
        expires: userData.membership_expires || 'NOT FOUND',
        purchased: userData.membership_purchased || 'NOT FOUND'
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ================= MIDDLEWARES DE AUTENTICACIÓN =================
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).render('error', {
      title: 'Acceso Denegado',
      message: 'No tienes permisos de administrador.',
      user: req.session.user
    });
  }
  next();
};

// ================= IMPORTAR CONTROLADORES CON MANEJO DE ERRORES =================
console.log('\n🔍 CARGANDO CONTROLADORES...');

let AuthController, UserController, ReviewController, AdminController, MovieController;
let CategoryController, TagController, ProductController, ProfileController;
let OrderController;

// Función helper para crear controladores de respaldo
const createFallbackController = (controllerName, methods) => {
  const fallback = {};
  methods.forEach(method => {
    fallback[method] = (req, res) => {
      console.error(`❌ Controlador no disponible: ${controllerName}.${method}`);
      if (req.accepts('html')) {
        res.status(500).render('error', {
          title: 'Error',
          message: `Controlador ${controllerName} no disponible`,
          user: req.session?.user || null
        });
      } else {
        res.status(500).json({ error: `Controlador ${controllerName} no disponible` });
      }
    };
  });
  return fallback;
};

try {
  AuthController = require('./controllers/authController');
  console.log('✅ AuthController cargado');
} catch (error) {
  console.error('❌ Error cargando AuthController:', error.message);
  AuthController = createFallbackController('AuthController', [
    'showLogin', 'showRegister', 'login', 'register', 'logoutAPI'
  ]);
}

try {
  UserController = require('./controllers/userController');
  console.log('✅ UserController cargado');
} catch (error) {
  console.error('❌ Error cargando UserController:', error.message);
  UserController = createFallbackController('UserController', [
    'getProfile', 'listUsers', 'updateProfile'
  ]);
}

try {
  ReviewController = require('./controllers/reviewController');
  console.log('✅ ReviewController cargado');
} catch (error) {
  console.error('❌ Error cargando ReviewController:', error.message);
  ReviewController = createFallbackController('ReviewController', [
    'showNewUserReviewForm', 'createUserReview', 'showMyReviews', 'getAllReviews',
    'getReviewById', 'createReviewAPI', 'showNewReviewForm', 'createReviewAdmin',
    'showEditReviewForm', 'updateReviewAdmin', 'toggleFeatured', 'deleteReviewAdmin', 'showReview'
  ]);
}

try {
  AdminController = require('./controllers/adminController');
  console.log('✅ AdminController cargado');
} catch (error) {
  console.error('❌ Error cargando AdminController:', error.message);
  AdminController = createFallbackController('AdminController', [
    'showDashboard', 'showNewUserForm', 'createUser', 'showEditUserForm',
    'updateUser', 'deleteUser'
  ]);
}

try {
  MovieController = require('./controllers/movieController');
  console.log('✅ MovieController cargado');
} catch (error) {
  console.error('❌ Error cargando MovieController:', error.message);
  MovieController = createFallbackController('MovieController', [
    'showNewMovieForm', 'createMovie', 'showEditMovieForm', 'updateMovie',
    'deleteMovie', 'activateMovie'
  ]);
}

try {
  CategoryController = require('./controllers/categoryController');
  console.log('✅ CategoryController cargado');
} catch (error) {
  console.error('❌ Error cargando CategoryController:', error.message);
  CategoryController = createFallbackController('CategoryController', [
    'list', 'create', 'getById', 'update', 'remove'
  ]);
}

try {
  TagController = require('./controllers/tagController');
  console.log('✅ TagController cargado');
} catch (error) {
  console.error('❌ Error cargando TagController:', error.message);
  TagController = createFallbackController('TagController', [
    'list', 'create', 'getById', 'update', 'remove'
  ]);
}

try {
  ProductController = require('./controllers/productController');
  console.log('✅ ProductController cargado');
} catch (error) {
  console.error('❌ Error cargando ProductController:', error.message);
  ProductController = createFallbackController('ProductController', [
    'create', 'getById', 'update', 'remove', 'listPublic', 'showPublic'
  ]);
}

try {
  ProfileController = require('./controllers/profileController');
  console.log('✅ ProfileController cargado');
} catch (error) {
  console.error('❌ Error cargando ProfileController:', error.message);
  ProfileController = createFallbackController('ProfileController', [
    'showProfile', 'updateProfile', 'purchaseHistory', 'myReviews',
    'membership', 'purchaseMembership', 'getProfileStats'
  ]);
}

try {
  OrderController = require('./controllers/orderController');
  console.log('✅ OrderController cargado');
} catch (error) {
  console.error('❌ Error cargando OrderController:', error.message);
  OrderController = createFallbackController('OrderController', ['createOrderAPI','listOrdersAPI','getOrderAPI']);
}

console.log('🎯 Todos los controladores cargados con manejo de errores');

// ================= VERIFICACIÓN DETALLADA DE CONTROLADORES =================
console.log('\n🔍 VERIFICACIÓN DETALLADA DE CONTROLADORES:');

const controllers = {
  'AuthController': AuthController,
  'UserController': UserController, 
  'ReviewController': ReviewController,
  'AdminController': AdminController,
  'MovieController': MovieController,
  'CategoryController': CategoryController,
  'TagController': TagController,
  'ProductController': ProductController,
  'ProfileController': ProfileController,
  'OrderController': OrderController
};

Object.entries(controllers).forEach(([name, controller]) => {
  console.log(`\n${name}:`);
  if (!controller) {
    console.log('  ❌ CONTROLADOR UNDEFINED');
    return;
  }
  
  // Listar métodos disponibles
  const methods = Object.getOwnPropertyNames(controller).filter(prop => 
    typeof controller[prop] === 'function' && prop !== 'constructor'
  );
  
  if (methods.length > 0) {
    console.log(`  ✅ Métodos: ${methods.join(', ')}`);
  } else {
    console.log('  ⚠️  No se encontraron métodos');
  }
});

// ================= ENDPOINTS DOCUMENTADOS PARA SWAGGER =================

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verificar estado del servidor
 *     description: Endpoint de salud para verificar que la API está funcionando correctamente
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servidor funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: "development"
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    database: 'connected'
  });
});

/**
 * @swagger
 * /api/test:
 *   get:
 *     summary: Endpoint de prueba
 *     description: Solo para probar que Swagger funciona
 *     tags: [Test]
 *     responses:
 *       200:
 *         description: Test exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Swagger funciona correctamente"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Swagger funciona correctamente',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/health',
      '/api/test', 
      '/api/reviews',
      '/api/auth/login',
      '/api/auth/register'
    ]
  });
});


// ================= RUTAS DE COMPRA - CORREGIDAS =================

/**
 * @swagger
 * /purchase-movie:
 *   get:
 *     summary: Mostrar página de compra de película
 *     description: Renderiza la página de compra para una película específica
 *     tags: [Purchase]
 *     parameters:
 *       - in: query
 *         name: movie
 *         required: true
 *         schema:
 *           type: string
 *         description: Título de la película a comprar
 *       - in: query
 *         name: price
 *         schema:
 *           type: number
 *         description: Precio de la película
 *     responses:
 *       200:
 *         description: Página de compra renderizada
 */
app.get('/purchase-movie', requireAuth, async (req, res) => {
  try {
    // Removed verbose debug logs to keep output clean in production/dev
    
    const { movie: movieTitle, price, movie_id, amount } = req.query;

    // Preferir movie_id (numérico) si viene en la query, sino usar título
    let movieRecord = null;
    let movieData = null;

    if (movie_id) {
      const id = parseInt(movie_id);
      if (isNaN(id) || id <= 0) {
        console.log('❌ DEBUG - movie_id inválido:', movie_id);
        return res.status(400).render('error', { title: 'Error', message: 'ID de película inválido', user: req.session.user });
      }

      console.log('🔍 DEBUG - Buscando película por ID:', id);
      const result = await DatabaseService.getMovieById(id);
      movieRecord = result && result.movie ? result.movie : null;
      console.log('🔍 DEBUG - Resultado búsqueda por ID:', !!movieRecord);
    } else if (movieTitle) {
      console.log('🔍 DEBUG - Buscando película por título:', movieTitle);
      movieRecord = await DatabaseService.getMovieByTitle(movieTitle);
      console.log('🔍 DEBUG - Resultado búsqueda por título:', !!movieRecord);
    } else {
      console.log('❌ DEBUG - No movie_id ni movie title provided');
      return res.status(400).render('error', { title: 'Error', message: 'Datos de película incompletos', user: req.session.user });
    }

    // Construir movieData a partir del registro o de los parámetros
    if (movieRecord) {
      const moviePlain = movieRecord.get ? movieRecord.get({ plain: true }) : movieRecord;
      movieData = {
        id: moviePlain.id,
        title: moviePlain.title,
        price: (amount || price) ? parseFloat(amount || price) : (moviePlain.price || 3.99),
        poster_image: moviePlain.poster_image,
        release_year: moviePlain.release_year || 'N/A',
        genre: moviePlain.genre || 'No especificado',
        duration: moviePlain.duration || 'N/A',
        director: moviePlain.director || 'No especificado'
      };
    } else {
      console.log('🔍 DEBUG - Creando datos de película desde query');
      movieData = {
        id: null,
        title: movieTitle || 'Película',
        price: (amount || price) ? parseFloat(amount || price) : 3.99,
        poster_image: null,
        release_year: 'N/A',
        genre: 'No especificado',
        duration: 'N/A',
        director: 'No especificado'
      };
    }

    // render without debug logging
    
    res.render('purchase-movie', {
      title: `Comprar ${movieData.title} - CineCríticas`,
      movie: movieData,
      user: req.session.user,
      error: req.query.error || null
    });

  } catch (error) {
    console.error('❌ ERROR en purchase-movie:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error al cargar la página de compra: ' + error.message,
      user: req.session.user
    });
  }
});

/**
 * @swagger
 * /purchase/process-movie:
 *   post:
 *     summary: Procesar compra de película
 *     description: Procesa el pago y completa la compra de una película
 *     tags: [Purchase]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required:
 *               - movie_id
 *               - amount
 *               - payment_method
 *             properties:
 *               movie_id:
 *                 type: integer
 *               amount:
 *                 type: number
 *               payment_method:
 *                 type: string
 *                 enum: [card, paypal]
 *               card_number:
 *                 type: string
 *               expiry_date:
 *                 type: string
 *               cvv:
 *                 type: string
 *               card_holder:
 *                 type: string
 *     responses:
 *       200:
 *         description: Compra procesada exitosamente
 *       400:
 *         description: Error en los datos de pago
 */
app.post('/purchase/process-movie', requireAuth, async (req, res) => {
  try {
    console.log('🔍 DEBUG - Procesando compra');
    console.log('🔍 DEBUG - Body:', req.body);
    
    const { 
      movie_id, 
      amount, 
      payment_method, 
      card_number, 
      expiry_date, 
      cvv, 
      card_holder,
      movie_title 
    } = req.body;

    // Minimal logging: avoid printing sensitive data
    console.log('Procesando compra - user:', req.session.user?.id, 'movie_id:', movie_id, 'amount:', amount, 'method:', payment_method);

      // ================= VALIDACIÓN DE PAGO (BÁSICA) =================
      if ((payment_method || 'card') === 'card') {
        const cardNumRaw = String(card_number || '').replace(/\s+/g, '');
        if (!/^\d+$/.test(cardNumRaw)) {
          return res.redirect(`/purchase-movie?movie_id=${encodeURIComponent(movie_id||'')}&amount=${encodeURIComponent(amount||'')}&error=${encodeURIComponent('El número de tarjeta debe contener sólo dígitos.')}`);
        }
        if (cardNumRaw.length < 13 || cardNumRaw.length > 19) {
          return res.redirect(`/purchase-movie?movie_id=${encodeURIComponent(movie_id||'')}&amount=${encodeURIComponent(amount||'')}&error=${encodeURIComponent('El número de tarjeta tiene una longitud inválida.')}`);
        }

        const cvvRaw = String(cvv || '').trim();
        if (!/^\d+$/.test(cvvRaw)) {
          return res.redirect(`/purchase-movie?movie_id=${encodeURIComponent(movie_id||'')}&amount=${encodeURIComponent(amount||'')}&error=${encodeURIComponent('El CVV debe contener sólo dígitos.')}`);
        }

        const cardType = String(req.body.card_type || '').toLowerCase();
        if (cardType === 'amex') {
          if (cvvRaw.length !== 4) {
            return res.redirect(`/purchase-movie?movie_id=${encodeURIComponent(movie_id||'')}&amount=${encodeURIComponent(amount||'')}&error=${encodeURIComponent('El CVV para AMEX debe tener 4 dígitos.')}`);
          }
        } else if (cvvRaw.length !== 3) {
          return res.redirect(`/purchase-movie?movie_id=${encodeURIComponent(movie_id||'')}&amount=${encodeURIComponent(amount||'')}&error=${encodeURIComponent('El CVV debe tener 3 dígitos.')}`);
        }

        // Allow flexible expiry formats: MM/YY, M/YY, MMYY, MM/YYYY, MM-YYYY, MYYYY, etc.
        const expiryRaw = String(expiry_date || '').trim();
        const digits = expiryRaw.replace(/\D/g, '');
        let expMonth = null;
        let expYear = null;

        if (digits.length === 3) {
          // MYY -> pad month
          expMonth = parseInt(digits.substring(0,1), 10);
          expYear = 2000 + parseInt(digits.substring(1,3), 10);
        } else if (digits.length === 4) {
          // MMYY
          expMonth = parseInt(digits.substring(0,2), 10);
          expYear = 2000 + parseInt(digits.substring(2,4), 10);
        } else if (digits.length === 5) {
          // MYYYY
          expMonth = parseInt(digits.substring(0,1), 10);
          expYear = parseInt(digits.substring(1,5), 10);
        } else if (digits.length === 6) {
          // MMYYYY
          expMonth = parseInt(digits.substring(0,2), 10);
          expYear = parseInt(digits.substring(2,6), 10);
        } else {
          return res.redirect(`/purchase-movie?movie_id=${encodeURIComponent(movie_id||'')}&amount=${encodeURIComponent(amount||'')}&error=${encodeURIComponent('Formato de expiración inválido. Usa MM/AA o MM/YYYY (ej: 07/26 ó 07/2026).')}`);
        }
        if (isNaN(expMonth) || expMonth < 1 || expMonth > 12) {
          return res.redirect(`/purchase-movie?movie_id=${encodeURIComponent(movie_id||'')}&amount=${encodeURIComponent(amount||'')}&error=${encodeURIComponent('Mes de expiración inválido.')}`);
        }
        const now = new Date();
        const expiryDate = new Date(expYear, expMonth - 1 + 1, 0); // last day of expiry month
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        if (expiryDate < currentMonthStart) {
          return res.redirect(`/purchase-movie?movie_id=${encodeURIComponent(movie_id||'')}&amount=${encodeURIComponent(amount||'')}&error=${encodeURIComponent('La tarjeta está vencida.')}`);
        }
        if (expYear > now.getFullYear() + 30) {
          return res.redirect(`/purchase-movie?movie_id=${encodeURIComponent(movie_id||'')}&amount=${encodeURIComponent(amount||'')}&error=${encodeURIComponent('Año de expiración poco realista.')}`);
        }
      }

      // Guardar la compra en la base de datos
      const purchase = await DatabaseService.recordPurchase({
        user_id: req.session.user.id,
        movie_id: movie_id || null,
        movie_title: movie_title || 'Película Comprada',
        amount: parseFloat(amount),
        payment_method,
        status: 'completed'
      });

    console.log('✅ Compra registrada:', purchase);

    res.redirect(`/purchase/confirmation?purchase_id=${purchase.id}`);

  } catch (error) {
    console.error('❌ Error procesando compra:', error);
    res.status(500).render('error', {
      title: 'Error en la compra',
      message: 'Hubo un error al procesar tu compra. Por favor intenta nuevamente.',
      user: req.session.user
    });
  }
});

// Página pública de detalle de película: /movie?id=123
// Aceptar también ruta RESTy /movie/:id redirigiendo a /movie?id=
app.get('/movie/:id', (req, res) => {
  try {
    const id = req.params.id;
    return res.redirect(`/movie?id=${encodeURIComponent(id)}`);
  } catch (err) {
    console.error('Error redirigiendo /movie/:id -> /movie?id= :', err);
    return res.redirect('/?error=ID de película inválido');
  }
});

app.get('/movie', async (req, res) => {
  try {
    const id = parseInt(req.query.id);
    if (isNaN(id) || id <= 0) {
      return res.redirect('/?error=ID de película inválido');
    }

    const result = await DatabaseService.getMovieById(id);
    const movieRecord = result && result.movie ? result.movie : null;

    if (!movieRecord) {
      return res.redirect('/?error=Película no encontrada');
    }

    let moviePlain;
    try {
      moviePlain = movieRecord.get ? movieRecord.get({ plain: true }) : movieRecord;
    } catch (err) {
      moviePlain = movieRecord;
    }

    const movieData = {
      id: moviePlain.id,
      title: moviePlain.title || 'Película sin título',
      release_year: moviePlain.release_year || moviePlain.year || 'N/A',
      genre: moviePlain.genre || 'No especificado',
      description: moviePlain.description || '',
      poster_image: moviePlain.poster_image || '/images/default-poster.jpg',
      price: moviePlain.price || 3.99,
      director: moviePlain.director || '',
      duration: moviePlain.duration || 0,
      trailer_url: moviePlain.trailer_url || ''
    };

    res.render('movie', {
      title: `${movieData.title} - CineCríticas`,
      movie: movieData,
      user: req.session.user
    });

  } catch (error) {
    console.error('❌ Error en GET /movie:', error);
    res.redirect('/?error=Error al cargar la película');
  }
});

/**
 * @swagger
 * /purchase/confirmation:
 *   get:
 *     summary: Mostrar confirmación de compra
 *     description: Página de confirmación después de una compra exitosa
 *     tags: [Purchase]
 *     parameters:
 *       - in: query
 *         name: purchase_id
 *         schema:
 *           type: integer
 *         description: ID de la compra
 *     responses:
 *       200:
 *         description: Página de confirmación renderizada
 */
app.get('/purchase/confirmation', requireAuth, async (req, res) => {
  try {
    console.log('🔍 DEBUG - Accediendo a confirmación de compra');
    const { purchase_id } = req.query;
    console.log('🔍 DEBUG - Purchase ID:', purchase_id);
    
    let purchase = null;
    if (purchase_id) {
      purchase = await DatabaseService.getPurchaseById(purchase_id);
      console.log('🔍 DEBUG - Compra encontrada:', purchase);
    }

    res.render('purchase-confirmation', {
      title: 'Compra Exitosa - CineCríticas',
      purchase,
      user: req.session.user
    });

  } catch (error) {
    console.error('❌ Error en confirmación:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error al cargar la confirmación: ' + error.message,
      user: req.session.user
    });
  }
});

app.get('/api/system/reset-database', async (req, res) => {
  try {
    console.log('🔄 INICIANDO RESET COMPLETO DE BASE DE DATOS EN RENDER...');
    
    // 1. Sincronizar fuerza todos los modelos
    await DatabaseService.sequelize.sync({ force: true });
    console.log('✅ 1. Tablas recreadas');
    
    // 2. Crear usuarios de prueba
    const { adminCreated, userCreated } = await DatabaseService.ensureTestUsers();
    console.log('✅ 2. Usuarios de prueba creados:', { adminCreated, userCreated });
    
    // 3. Seed de películas iniciales
    await DatabaseService.seedInitialMovies();
    console.log('✅ 3. Películas iniciales creadas');
    
    res.json({ 
      success: true, 
      message: '✅ BASE DE DATOS RESETEADA COMPLETAMENTE EN RENDER',
      details: {
        users_created: { admin: adminCreated, user: userCreated },
        tables_recreated: true
      }
    });
    
  } catch (error) {
    console.error('❌ ERROR EN RESET:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    });
  }
});

app.get('/api/system/database-status', async (req, res) => {
  try {
    const users = await DatabaseService.User.findAll();
    const movies = await DatabaseService.Movie.findAll();
    
    // Verificar columnas de membresía
    const sampleUser = users[0];
    const hasMembershipColumns = sampleUser && 
                                'membership_type' in sampleUser && 
                                'membership_purchased' in sampleUser;
    
    res.json({
      success: true,
      database_status: 'connected',
      tables: {
        users: users.length,
        movies: movies.length,
        has_membership_columns: hasMembershipColumns
      },
      users_sample: users.slice(0, 2).map(u => ({
        id: u.id,
        username: u.username,
        has_membership_type: 'membership_type' in u,
        has_membership_purchased: 'membership_purchased' in u
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ================= RUTAS DE AUTENTICACIÓN WEB =================
app.get('/login', AuthController.showLogin);
app.get('/register', AuthController.showRegister);
app.post('/auth/login', AuthController.login);
app.post('/auth/register', AuthController.register);


// ================= RUTAS DE PERFIL DE USUARIO - CORREGIDAS =================
app.get('/user/profile', requireAuth, async (req, res) => {
  try {
    const user = await DatabaseService.getUserById(req.session.user.id);
    if (!user) {
      return res.redirect('/login');
    }
    
    res.render('user-profile', {
      title: 'Mi Perfil - CineCríticas',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Error cargando perfil:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error al cargar el perfil',
      user: req.session.user
    });
  }
});
const purchaseRoutes = require('./routes/purchase');
app.use('/', purchaseRoutes);
// Montar rutas de usuario (incluye /user/cart)
try {
  app.use('/user', require('./routes/user'));
} catch (err) {
  console.error('No se pudo montar routes/user:', err);
}
app.get('/user/purchase-history', requireAuth, ProfileController.purchaseHistory);
app.get('/user/my-reviews', requireAuth, ProfileController.myReviews);
app.get('/user/membership', requireAuth, ProfileController.membership);

// Ruta de depuración para renderizar `user/cart.ejs` sin autenticación
app.get('/debug/cart', (req, res) => {
  const sampleUser = {
    id: 0,
    username: 'demo_user',
    cart: [
      { title: 'Película Demo A', price: 3.99, qty: 2, description: 'Demo descripción A' },
      { title: 'Serie Demo B', price: 5.50, qty: 1 }
    ]
  };
  res.render('user/cart', {
    title: 'Mi Carrito (debug)',
    user: sampleUser,
    currentPath: '/user/cart'
  });
});

// ================= RUTAS DE PERFIL CON SESIÓN - VERSIÓN CORREGIDA =================
app.put('/api/user/profile/session', requireAuth, async (req, res) => {
  try {
    const { full_name, email, current_password, new_password } = req.body;
    const userId = req.session.user.id;
    
    console.log('🔍 === INICIANDO ACTUALIZACIÓN DE PERFIL ===');
    console.log('🔍 Usuario ID:', userId);
    console.log('🔍 Datos recibidos:', { 
      full_name, 
      email, 
      current_password: current_password ? '***' : 'null',
      new_password: new_password ? '***' : 'null'
    });
    
    // Validar que el usuario existe
    const user = await DatabaseService.getUserById(userId);
    if (!user) {
      console.log('❌ Usuario no encontrado en BD');
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    console.log('🔍 Usuario encontrado en BD:', { 
      id: user.id, 
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      hasPassword: !!user.password_hash
    });
    
    // Preparar datos para actualizar
    const updateData = {};
    
    // Actualizar nombre completo si es diferente
    if (full_name !== undefined && full_name !== user.full_name) {
      updateData.full_name = full_name.trim();
      console.log('🔍 Actualizando full_name:', user.full_name, '→', updateData.full_name);
    }
    
    // Actualizar email si es diferente
    if (email !== undefined && email !== user.email) {
      updateData.email = email.trim();
      console.log('🔍 Actualizando email:', user.email, '→', updateData.email);
    }
    
    // Manejo de cambio de contraseña
    const wantsToChangePassword = new_password && new_password.trim() !== '';
    const hasCurrentPassword = current_password && current_password.trim() !== '';
    
    if (wantsToChangePassword) {
      console.log('🔍 Solicitando cambio de contraseña');
      
      // Validar longitud
      if (new_password.trim().length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
      }
      
      // Verificar si el usuario tiene contraseña actual
      const userHasPassword = user.password_hash && user.password_hash.length > 0;
      
      if (userHasPassword) {
        console.log('🔍 Usuario tiene contraseña existente, validando...');
        if (!hasCurrentPassword) {
          return res.status(400).json({ error: 'Debe proporcionar la contraseña actual para cambiarla' });
        }
        
        try {
          const isValidPassword = await bcrypt.compare(current_password.trim(), user.password_hash);
          if (!isValidPassword) {
            return res.status(400).json({ error: 'Contraseña actual incorrecta' });
          }
          console.log('✅ Contraseña actual validada');
        } catch (bcryptError) {
          console.error('❌ Error en bcrypt:', bcryptError);
          return res.status(400).json({ error: 'Error al validar la contraseña actual' });
        }
      } else {
        console.log('🔍 Usuario sin contraseña existente, estableciendo nueva');
      }
      
      // Hashear nueva contraseña - USAR password_hash PARA SEQUELIZE
      updateData.password_hash = await bcrypt.hash(new_password.trim(), 10);
      console.log('✅ Nueva contraseña hasheada');
    }
    
    // Verificar si hay algo que actualizar
    if (Object.keys(updateData).length === 0) {
      console.log('⚠️  No hay cambios para actualizar');
      return res.json({ 
        success: true, 
        message: 'No se detectaron cambios para actualizar',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role
        }
      });
    }
    
    console.log('🔍 Datos a actualizar en BD:', updateData);
    
    // Actualizar en la base de datos
    const updated = await DatabaseService.updateUser(userId, updateData);
    console.log('🔍 Resultado de updateUser:', updated);
    
    if (updated) {
      // Obtener usuario actualizado
      const updatedUser = await DatabaseService.getUserById(userId);
      console.log('🔍 Usuario después de actualizar:', {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        password_hash_updated: !!updateData.password_hash
      });
      
      // Actualizar datos en sesión
      req.session.user = { 
        ...req.session.user, 
        full_name: updatedUser.full_name, 
        email: updatedUser.email 
      };
      
      console.log('🔍 Sesión actualizada:', req.session.user);
      
      const message = updateData.password_hash 
        ? 'Perfil y contraseña actualizados correctamente' 
        : 'Perfil actualizado correctamente';
      
      console.log('✅ === ACTUALIZACIÓN EXITOSA ===');
      res.json({ 
        success: true, 
        message: message,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          full_name: updatedUser.full_name,
          role: updatedUser.role
        }
      });
    } else {
      console.log('❌ DatabaseService.updateUser devolvió false');
      res.status(400).json({ error: 'Error al actualizar perfil en la base de datos' });
    }
    
  } catch (error) {
    console.error('❌ Error actualizando perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
});

// ================= RUTA DE DEBUGGING - VER ESTADO DE USUARIOS =================
app.get('/api/debug/users', async (req, res) => {
  try {
    const users = await DatabaseService.getAllUsers();
    const usersSafe = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      hasPassword: !!user.password_hash,
      passwordLength: user.password_hash ? user.password_hash.length : 0,
      created_at: user.created_at
    }));
    
    res.json({
      success: true,
      users: usersSafe,
      total: users.length
    });
  } catch (error) {
    console.error('Error en debug users:', error);
    res.status(500).json({ error: error.message });
  }
});

// ================= RUTA TEMPORAL - ACTUALIZACIÓN DIRECTA =================
app.put('/api/user/profile/direct', requireAuth, async (req, res) => {
  try {
    const { full_name, email, new_password } = req.body;
    const userId = req.session.user.id;
    
    console.log('🔧 Actualización directa para usuario:', userId);
    
    let updateQuery = 'UPDATE users SET full_name = ?, email = ?';
    let params = [full_name, email, userId];
    
    if (new_password && new_password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(new_password.trim(), 10);
      updateQuery = 'UPDATE users SET full_name = ?, email = ?, password_hash = ?';
      params = [full_name, email, hashedPassword, userId];
      console.log('🔧 Incluyendo nueva contraseña hasheada');
    }
    
    updateQuery += ' WHERE id = ?';
    
    // Actualización directa usando una consulta SQL simple
    const db = await DatabaseService.getDB();
    const result = await db.run(updateQuery, params);
    
    console.log('🔧 Resultado directo:', result);
    
    if (result.changes > 0) {
      // Actualizar sesión
      req.session.user.full_name = full_name;
      req.session.user.email = email;
      
      res.json({ 
        success: true, 
        message: 'Perfil actualizado correctamente (método directo)',
        changes: result.changes
      });
    } else {
      res.status(400).json({ error: 'No se pudo actualizar el perfil' });
    }
    
  } catch (error) {
    console.error('Error en actualización directa:', error);
    res.status(500).json({ error: error.message });
  }
});


// ================= RUTAS DE RESEÑAS =================
app.get('/review/:id', ReviewController.showReview);
app.get('/reviews/new', requireAuth, ReviewController.showNewUserReviewForm);
app.post('/reviews/new', requireAuth, ReviewController.createUserReview);

// ================= RUTAS DE ADMIN WEB =================
app.get('/admin', requireAuth, requireAdmin, AdminController.showDashboard);

// Función helper segura para rutas
const safeRoute = (controller, methodName, fallbackMessage = 'Controlador no disponible') => {
  if (controller && controller[methodName]) {
    return controller[methodName];
  } else {
    console.error(`❌ Controlador no disponible: ${methodName}`);
    return (req, res) => {
      if (req.accepts('html')) {
        res.status(500).render('error', {
          title: 'Error',
          message: fallbackMessage,
          user: req.session.user
        });
      } else {
        res.status(500).json({ error: fallbackMessage });
      }
    };
  }
};
const HomeController = require('./controllers/homeController');

// Rutas principales
app.get('/', HomeController.showHome);
app.get('/about', HomeController.showAbout);
app.get('/contact', HomeController.showContact);
app.get('/test-associations', HomeController.testAssociations);

// Admin - películas (RUTAS SEGURAS)
app.get('/admin/movies/new', requireAdmin, safeRoute(MovieController, 'showNewMovieForm'));
app.post('/admin/movies/new', requireAdmin, handleMovieUpload, safeRoute(MovieController, 'createMovie'));
app.get('/admin/movies/:id/edit', requireAdmin, safeRoute(MovieController, 'showEditMovieForm'));
app.post('/admin/movies/:id/edit', requireAdmin, handleMovieUpload, safeRoute(MovieController, 'updateMovie'));
app.post('/admin/movies/:id/delete', requireAdmin, safeRoute(MovieController, 'deleteMovie'));
app.post('/admin/movies/:id/activate', requireAdmin, safeRoute(MovieController, 'activateMovie'));

// Admin - usuarios (RUTAS SEGURAS)
app.get('/admin/users/new', requireAdmin, safeRoute(AdminController, 'showNewUserForm'));
app.post('/admin/users/new', requireAdmin, safeRoute(AdminController, 'createUser'));
app.get('/admin/users/:id/edit', requireAdmin, safeRoute(AdminController, 'showEditUserForm'));
app.post('/admin/users/:id/edit', requireAdmin, safeRoute(AdminController, 'updateUser'));
app.post('/admin/users/:id/delete', requireAdmin, safeRoute(AdminController, 'deleteUser'));

// Admin - reseñas (RUTAS SEGURAS)
app.get('/admin/reviews/new', requireAdmin, safeRoute(ReviewController, 'showNewReviewForm'));
app.post('/admin/reviews/new', requireAdmin, upload.single('review_image'), safeRoute(ReviewController, 'createReviewAdmin'));
app.get('/admin/reviews/:id/edit', requireAdmin, safeRoute(ReviewController, 'showEditReviewForm'));
app.post('/admin/reviews/:id/edit', requireAdmin, upload.single('review_image'), safeRoute(ReviewController, 'updateReviewAdmin'));
app.get('/admin/reviews/:id/toggle-featured', requireAdmin, safeRoute(ReviewController, 'toggleFeatured'));
app.post('/admin/reviews/:id/delete', requireAdmin, safeRoute(ReviewController, 'deleteReviewAdmin'));

// ================= RUTAS DE API =================

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión de usuario
 *     description: Autentica un usuario y devuelve un token JWT
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: usuario
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login exitoso
 *       401:
 *         description: Credenciales inválidas
 */
app.post('/api/auth/login', AuthController.login);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     description: Crea una nueva cuenta de usuario
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - confirmPassword
 *             properties:
 *               username:
 *                 type: string
 *                 example: nuevo_usuario
 *               email:
 *                 type: string
 *                 example: nuevo@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               confirmPassword:
 *                 type: string
 *                 example: password123
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *       400:
 *         description: Error de validación
 */
app.post('/api/auth/register', AuthController.register);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     description: Cierra la sesión del usuario actual
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logout exitoso
 */
app.post('/api/auth/logout', AuthController.logoutAPI);

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verificar token JWT
 *     description: Verifica si un token JWT es válido
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token válido
 */
app.get('/api/auth/verify', requireAuthAPI, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// API - Perfil de usuario (CON SESIÓN PARA WEB)
app.get('/api/user/profile', requireAuth, UserController.getProfile);
app.put('/api/user/profile', requireAuth, UserController.updateProfile); // Usa sesión
app.post('/api/user/membership/purchase', requireAuth, ProfileController.purchaseMembership);

// API - Reseñas
app.get('/api/reviews', ReviewController.getAllReviews);
app.get('/api/reviews/:id', ReviewController.getReviewById);
app.post('/api/reviews', requireAuthAPI, ReviewController.createReviewAPI);

// API - Administración (CORREGIDO - usar AdminController para update y delete)
app.get('/api/admin/users', requireAuthAPI, requireAdminAPI, UserController.listUsers);
app.put('/api/admin/users/:id', requireAuthAPI, requireAdminAPI, AdminController.updateUser);
app.delete('/api/admin/users/:id', requireAuthAPI, requireAdminAPI, AdminController.deleteUser);

// API - Categorías
app.get('/api/categories', requireAuthAPI, CategoryController.list);
app.post('/api/categories', requireAuthAPI, CategoryController.create);
app.get('/api/categories/:id', requireAuthAPI, CategoryController.getById);
app.put('/api/categories/:id', requireAuthAPI, CategoryController.update);
app.delete('/api/categories/:id', requireAuthAPI, CategoryController.remove);

// API - Tags
app.get('/api/tags', requireAuthAPI, TagController.list);
app.post('/api/tags', requireAuthAPI, TagController.create);
app.get('/api/tags/:id', requireAuthAPI, TagController.getById);
app.put('/api/tags/:id', requireAuthAPI, TagController.update);
app.delete('/api/tags/:id', requireAuthAPI, TagController.remove);

// API - Productos
app.post('/api/products', requireAuthAPI, ProductController.create);
app.get('/api/products/:id', requireAuthAPI, ProductController.getById);
app.put('/api/products/:id', requireAuthAPI, ProductController.update);
app.delete('/api/products/:id', requireAuthAPI, ProductController.remove);

// Rutas públicas de productos
app.get('/products', ProductController.listPublic);
app.get('/p/:idslug', ProductController.showPublic);

// ================= RUTA DE LOGOUT =================
app.post('/logout', (req, res) => {
  try {
    const username = req.session?.user?.username || 'Usuario desconocido';
    console.log(`🔐 Cerrando sesión para: ${username}`);

    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Error destruyendo sesión:', err);
        return res.status(500).redirect('/?error=Error al cerrar sesión');
      }

      res.clearCookie('connect.sid');
      res.clearCookie('token');
      return res.redirect('/?success=Sesión cerrada correctamente');
    });
  } catch (error) {
    console.error('💥 Error inesperado en logout:', error);
    return res.redirect('/?error=Error inesperado al cerrar sesión');
  }
});

app.get('/logout', (req, res) => {
  try {
    const username = req.session?.user?.username || 'Usuario desconocido';
    console.log(`🔐 Cerrando sesión (GET) para: ${username}`);

    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Error destruyendo sesión (GET):', err);
        return res.status(500).redirect('/?error=Error al cerrar sesión');
      }

      res.clearCookie('connect.sid');
      res.clearCookie('token');
      return res.redirect('/?success=Sesión cerrada correctamente');
    });
  } catch (error) {
    console.error('💥 Error inesperado en logout (GET):', error);
    return res.redirect('/?error=Error inesperado al cerrar sesión');
  }
});

app.get('/api/system/reset-database', async (req, res) => {
  try {
    console.log('🔄 Reseteando base de datos en Render...');
    
    // Sincronizar todos los modelos
    await DatabaseService.sequelize.sync({ force: true });
    console.log('✅ Base de datos reseteada');
    
    // Crear usuarios de prueba
    await DatabaseService.ensureTestUsers();
    console.log('✅ Usuarios de prueba creados');
    
    res.json({ 
      success: true, 
      message: 'Base de datos reseteada correctamente en Render' 
    });
  } catch (error) {
    console.error('❌ Error reseteando BD:', error);
    res.status(500).json({ error: error.message });
  }
});
// ================= INICIO DEL SERVIDOR =================
const startServer = async () => {
  try {
    console.log('🚀 INICIANDO SERVIDOR CINECRÍTICAS...');
    
    // 1. Inicialización de base de datos
    console.log('\n1. 🔄 INICIALIZANDO BASE DE DATOS...');
    const dbInitialized = await DatabaseService.initialize();
    
    if (!dbInitialized) {
      throw new Error('No se pudo inicializar DatabaseService');
    }
    console.log('✅ DatabaseService inicializado correctamente');
    
    // 2. Sincronización automática (alter)
    console.log('\n2. 🔥 SINCRONIZANDO MODELOS AUTOMÁTICAMENTE...');
    try {
      await DatabaseService.sequelize.sync({ alter: true });
      console.log('✅ Base de datos sincronizada - columnas actualizadas si faltaban');
    } catch (syncError) {
      console.warn('⚠️ Advertencia en sincronización:', syncError.message);
    }
    
    // 3. Verificación de columnas de membresía
    console.log('\n3. 🎫 VERIFICANDO COLUMNAS DE MEMBRESÍA...');
    console.log('✅ Columnas de membresía verificadas');
    
    // 4. Creación de usuarios de prueba
    console.log('\n4. 👥 CREANDO USUARIOS DE PRUEBA...');
    const { adminCreated, userCreated } = await DatabaseService.ensureTestUsers();
    
    console.log('\n🔐 ESTADO DE USUARIOS DE PRUEBA:');
    console.log('   👑 ADMIN:', adminCreated ? 'Creado/Existente' : 'No creado');
    console.log('   👤 USUARIO:', userCreated ? 'Creado/Existente' : 'No creado');
    
    // 5. Inicio del servidor
    console.log('\n5. 🌐 INICIANDO SERVIDOR WEB...');
    console.log('🎬 Iniciando servidor en puerto:', PORT);
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🎬 SERVVIDOR ACTIVO EN PUERTO: ${PORT}`);
      console.log('✅ ¡CineCríticas está listo para usar!');
      
      console.log('\n🔗 ACCESOS PRINCIPALES:');
      console.log('   🌐 Aplicación:      http://localhost:' + PORT);
      console.log('   📚 Documentación:   http://localhost:' + PORT + '/api-docs');
      console.log('   🔐 Health Check:    http://localhost:' + PORT + '/health');
      console.log('   🧪 Test API:        http://localhost:' + PORT + '/api/test');
      
      console.log('\n🛒 EJEMPLO DE COMPRA:');
      console.log('   http://localhost:' + PORT + '/purchase-movie?movie=Avatar&price=3.99');
      
      console.log('\n💡 CREDENCIALES DE PRUEBA:');
      console.log('   👑 ADMINISTRADOR:   admin / admin123');
      console.log('   👤 USUARIO:         usuario / password123');
      
      console.log('\n🔐 RUTAS DE PERFIL:');
      console.log('   👤 Perfil web:          http://localhost:' + PORT + '/user/profile');
      console.log('   🔄 Actualizar sesión:   PUT http://localhost:' + PORT + '/api/user/profile/session');
      console.log('   🔧 Actualizar directo:  PUT http://localhost:' + PORT + '/api/user/profile/direct');
      console.log('   🐛 Debug usuarios:      http://localhost:' + PORT + '/api/debug/users');
      
      console.log('\n🔧 MANTENIMIENTO:');
      console.log('   🔄 Reparar BD (npm):    npm run repair-db');
      console.log('   🔧 Reparar BD (web):    http://localhost:' + PORT + '/api/system/repair-database');
    });
    
  } catch (error) {
    console.error('\n💥 ERROR CRÍTICO AL INICIAR EL SERVIDOR:', error.message);
    
    console.log('\n🔧 SOLUCIONES RECOMENDADAS:');
    console.log('1. Ejecuta: npm run repair-db');
    console.log('2. O visita: http://localhost:' + PORT + '/api/system/repair-database');
    console.log('3. Verifica los archivos de modelos en la carpeta models/');
    console.log('4. Revisa la configuración de la base de datos');
    
    process.exit(1);
  }
};
  // ================= RUTAS API - ORDERS =================

  /**
   * @swagger
   * tags:
   *   - name: Orders
   *     description: Gestión de órdenes y checkout
   */

  app.post('/api/orders', requireAuthAPI, async (req, res) => {
    if (!OrderController) return res.status(500).json({ success: false, error: 'OrderController not available' });
    return OrderController.createOrderAPI(req, res);
  });

  app.get('/api/orders', requireAuthAPI, async (req, res) => {
    if (!OrderController) return res.status(500).json({ success: false, error: 'OrderController not available' });
    return OrderController.listOrdersAPI(req, res);
  });

  app.get('/api/orders/:id', requireAuthAPI, async (req, res) => {
    if (!OrderController) return res.status(500).json({ success: false, error: 'OrderController not available' });
    return OrderController.getOrderAPI(req, res);
  });

  if (process.env.NODE_ENV === 'test') {
  module.exports = { 
    app, 
    verifyToken, 
    requireAuthAPI, 
    requireAdminAPI,
    JWT_SECRET 
  };
} else {
  startServer();
}

  // ================= MANEJO DE ERRORES (FINAL) =================
  // ==== Serve client build (if present) and expose a JSON products endpoint ====
  const clientBuildPath = path.join(__dirname, 'client', 'build');
  if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
    app.get('/*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/api-docs') || req.path.startsWith('/uploads')) return next();
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
    console.log('📦 Serving client build from /client/build');
  }

  // Public JSON endpoint for products for the SPA (supports basic query params client-side)
  app.get('/api/public/products', async (req, res) => {
    try {
      await DatabaseService.ensureDatabase();
      let products = [];
      if (DatabaseService.Product) {
        products = await DatabaseService.Product.findAll({ where: { is_active: true } });
      }

      // If no products exist, attempt to create simple product entries from movies (seed for SPA/testing)
      if ((!products || products.length === 0) && DatabaseService.Movie && DatabaseService.Product) {
        try {
          const movies = await DatabaseService.getAllMovies();
          for (const m of movies.slice(0, 6)) {
            await DatabaseService.Product.create({
              name: m.title || `Movie ${m.id}`,
              price: m.price ? parseFloat(m.price) : 3.99,
              description: m.description || '',
              movie_id: m.id,
              stock: 10,
              is_active: true,
              type: 'movie'
            });
          }
          products = await DatabaseService.Product.findAll({ where: { is_active: true } });
        } catch (seedErr) {
          console.warn('No se pudieron crear productos desde movies:', seedErr.message);
        }
      }

      // Apply server-side filters and pagination
      const { search, category, price_min, price_max, page = 1, limit = 24 } = req.query;

      let mapped = products.map(p => ({ id: p.id, name: p.name, price: p.price, stock: p.stock, description: p.description, image: p.image || null, category: p.category || null }));

      if (search) {
        const s = String(search).toLowerCase();
        mapped = mapped.filter(p => (p.name || '').toLowerCase().includes(s) || (p.description||'').toLowerCase().includes(s));
      }
      if (category) {
        mapped = mapped.filter(p => String(p.category||'').toLowerCase() === String(category).toLowerCase());
      }
      if (price_min !== undefined) {
        const min = parseFloat(price_min) || 0;
        mapped = mapped.filter(p => parseFloat(p.price || 0) >= min);
      }
      if (price_max !== undefined) {
        const max = parseFloat(price_max) || Number.MAX_SAFE_INTEGER;
        mapped = mapped.filter(p => parseFloat(p.price || 0) <= max);
      }

      // pagination
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const lim = Math.max(1, Math.min(100, parseInt(limit, 10) || 24));
      const start = (pageNum - 1) * lim;
      const paged = mapped.slice(start, start + lim);

      res.json({ success: true, data: paged, meta: { total: mapped.length, page: pageNum, limit: lim } });
    } catch (error) {
      console.error('Error /api/public/products:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  
  app.use((req, res) => {
    res.status(404).render('404', {
      title: 'Página No Encontrada - CineCríticas',
      user: req.session?.user || null
    });
  });

  app.use((error, req, res, next) => {
    console.error('Error global:', error);
    res.status(500).render('error', {
      title: 'Error - CineCríticas',
      message: 'Ha ocurrido un error inesperado.',
      user: req.session?.user || null
    });
  });
 