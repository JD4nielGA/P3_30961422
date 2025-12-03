const DatabaseService = require('../services/DatabaseService');
const fs = require('fs');
const path = require('path');

class PurchaseController {
  
  /**
   * Mostrar página de compra para película - VERSIÓN FUNCIONAL
   */
  static async showMoviePurchasePage(req, res) {
    try {
      const movieId = parseInt(req.params.id);
      
      if (isNaN(movieId) || movieId <= 0) {
        return res.redirect('/?error=ID de película inválido');
      }

      console.log(`=== PÁGINA DE COMPRA PARA PELÍCULA ID: ${movieId} ===`);
      
      // Obtener la película
      const { Movie, Product } = require('../models');
      
      console.log('🔍 Buscando película en la base de datos...');
      const movie = await Movie.findByPk(movieId);
      
      if (!movie) {
        console.log('❌ Película no encontrada');
        return res.redirect('/?error=Película no encontrada');
      }

      // Convertir a objeto plano
      const movieData = movie.get({ plain: true });
      
      console.log('✅ Película encontrada:', {
        id: movieData.id,
        title: movieData.title,
        release_year: movieData.release_year,
        price: movieData.price,
        poster_image: movieData.poster_image,
        genre: movieData.genre,
        type: movieData.type
      });
      
      // VERIFICAR IMAGEN FÍSICAMENTE
      let finalPosterImage = '/images/default-poster.jpg';
      
      if (movieData.poster_image && 
          movieData.poster_image !== 'undefined' && 
          movieData.poster_image !== 'null' &&
          String(movieData.poster_image).trim() !== '') {
        
        let imagePath = String(movieData.poster_image).trim();
        
        // Asegurar que sea ruta absoluta
        if (!imagePath.startsWith('/')) {
          imagePath = '/' + imagePath;
        }
        
        // Verificar si el archivo existe físicamente
        const physicalPath = path.join(__dirname, '..', 'public', imagePath);
        console.log('📁 Verificando imagen:', {
          rutaEnBD: movieData.poster_image,
          rutaCorregida: imagePath,
          rutaFísica: physicalPath,
          existe: fs.existsSync(physicalPath)
        });
        
        if (fs.existsSync(physicalPath)) {
          finalPosterImage = imagePath;
          console.log('✅ Imagen física encontrada, usando:', finalPosterImage);
        } else {
          console.log('❌ Imagen física NO encontrada, usando default');
          
          // Intentar buscar en otras ubicaciones posibles
          const possiblePaths = [
            movieData.poster_image,
            '/uploads' + movieData.poster_image,
            '/public' + movieData.poster_image,
            movieData.poster_image.replace('/uploads/', '/uploads/movies/'),
            movieData.poster_image.replace('movie-', ''),
            '/images/default-poster.jpg' // Fallback final
          ];
          
          for (const possiblePath of possiblePaths) {
            const testPath = path.join(__dirname, '..', 'public', possiblePath.startsWith('/') ? possiblePath.slice(1) : possiblePath);
            if (fs.existsSync(testPath)) {
              finalPosterImage = possiblePath.startsWith('/') ? possiblePath : '/' + possiblePath;
              console.log('✅ Imagen alternativa encontrada en:', finalPosterImage);
              break;
            }
          }
        }
      }
      
      // Datos finales para el template
      const templateData = {
        id: movieData.id,
        title: movieData.title || 'Película sin título',
        release_year: movieData.release_year || 'N/A',
        genre: movieData.genre || 'No especificado',
        description: movieData.description || '',
        poster_image: finalPosterImage,
        type: movieData.type || 'movie',
        price: movieData.price || 20.00,
        director: movieData.director || '',
        duration: movieData.duration || 0,
        trailer_url: movieData.trailer_url || ''
      };
      
      console.log('🎯 Datos enviados al template:', {
        título: templateData.title,
        año: templateData.release_year,
        precio: templateData.price,
        imagen: templateData.poster_image
      });
      
      res.render('purchase-movie', {
        title: `Comprar ${templateData.title} - CineCríticas`,
        movie: templateData,
        user: req.session.user,
        csrfToken: req.csrfToken ? req.csrfToken() : null
      });
      
    } catch (error) {
      console.error('❌ Error en showMoviePurchasePage:', error);
      console.error('❌ Stack trace:', error.stack);
      res.redirect('/?error=Error al cargar página: ' + error.message);
    }
  }

  /**
   * Mostrar página de compra desde parámetros de query
   */
  static async showPurchasePage(req, res) {
    try {
      const { movie_id, movie_title, amount } = req.query;
      
      if (!movie_id && !movie_title) {
        return res.redirect('/?error=Datos de compra incompletos');
      }

      let movie = null;
      
      // Buscar película por ID si está disponible
      if (movie_id) {
        const movieId = parseInt(movie_id);
        if (!isNaN(movieId) && movieId > 0) {
          movie = await DatabaseService.getMovieById(movieId);
        }
      }
      
      // Si no se encontró por ID, buscar por título
      if (!movie && movie_title) {
        const { Movie } = require('../models');
        movie = await Movie.findOne({
          where: { title: movie_title }
        });
      }

      if (!movie) {
        return res.redirect('/?error=Película no encontrada');
      }

      // Convertir a objeto plano
      let moviePlain;
      try {
        moviePlain = movie.get ? movie.get({ plain: true }) : movie;
      } catch (error) {
        moviePlain = movie;
      }

      // Usar el precio proporcionado o el de la película
      let finalPrice = 3.99;
      if (amount && !isNaN(parseFloat(amount))) {
        finalPrice = parseFloat(amount);
      } else if (moviePlain.price && !isNaN(parseFloat(moviePlain.price))) {
        finalPrice = parseFloat(moviePlain.price);
      }

      // Preparar datos para template
      const movieData = {
        id: moviePlain.id || 0,
        title: moviePlain.title || 'Película sin título',
        release_year: moviePlain.release_year || moviePlain.year || 'N/A',
        genre: moviePlain.genre || 'No especificado',
        description: moviePlain.description || '',
        poster_image: moviePlain.poster_image || '/images/default-poster.jpg',
        type: moviePlain.type || 'movie',
        price: finalPrice,
        director: moviePlain.director || '',
        duration: moviePlain.duration || 0,
        trailer_url: moviePlain.trailer_url || ''
      };

      res.render('purchase-movie', {
        title: `Comprar ${movieData.title} - CineCríticas`,
        movie: movieData,
        user: req.session.user,
        csrfToken: req.csrfToken ? req.csrfToken() : null
      });
      
    } catch (error) {
      console.error('❌ Error cargando página de compra:', error);
      res.redirect('/?error=Error al cargar página de compra');
    }
  }

  /**
   * Procesar compra de película
   */
  static async processMoviePurchase(req, res) {
    try {
      const { movie_id, movie_title, amount, payment_method } = req.body;
      const userId = req.session.user ? req.session.user.id : null;

      console.log('💳 Procesando compra:', {
        movie_id,
        movie_title,
        amount,
        payment_method,
        user_id: userId
      });

      // Validaciones
      if (!userId) {
        return res.redirect('/auth/login?error=Debes iniciar sesión para comprar');
      }

      if (!movie_id && !movie_title) {
        return res.redirect('/?error=Datos de compra incompletos');
      }

      // Buscar la película
      let movie = null;
      if (movie_id) {
        const id = parseInt(movie_id);
        if (!isNaN(id) && id > 0) {
          movie = await DatabaseService.getMovieById(id);
        }
      }
      
      if (!movie && movie_title) {
        const { Movie } = require('../models');
        movie = await Movie.findOne({
          where: { title: movie_title }
        });
      }

      if (!movie) {
        return res.redirect('/?error=Película no encontrada');
      }

      // Convertir a objeto plano
      let moviePlain;
      try {
        moviePlain = movie.get ? movie.get({ plain: true }) : movie;
      } catch (error) {
        moviePlain = movie;
      }

      // Determinar monto
      let purchaseAmount = 3.99;
      if (amount && !isNaN(parseFloat(amount))) {
        purchaseAmount = parseFloat(amount);
      } else if (moviePlain.price && !isNaN(parseFloat(moviePlain.price))) {
        purchaseAmount = parseFloat(moviePlain.price);
      }

      // Usar el modelo Purchase directamente
      const { Purchase } = require('../models');
      
      // Crear registro de compra
      const purchaseData = {
        user_id: userId,
        type: 'movie',
        movie_id: moviePlain.id || 0,
        movie_title: moviePlain.title || 'Película sin título',
        amount: purchaseAmount,
        payment_method: payment_method || 'card',
        status: 'completed',
        transaction_id: 'txn_' + Date.now()
      };

      console.log('📦 Creando registro de compra:', purchaseData);

      const purchase = await Purchase.create(purchaseData);

      // Actualizar historial de compras del usuario
      await PurchaseController._updateUserPurchaseHistory(userId, purchase);

      console.log(`✅ Compra completada - ID: ${purchase.id}, Usuario: ${userId}, Película: ${moviePlain.title}`);

      // Redirigir a página de éxito
      res.redirect(`/purchase/success/${purchase.id}`);
      
    } catch (error) {
      console.error('❌ Error procesando compra:', error);
      res.redirect('/?error=Error al procesar la compra: ' + error.message);
    }
  }

  /**
   * Página de éxito de compra
   */
  static async showPurchaseSuccess(req, res) {
    try {
      const purchaseId = parseInt(req.params.id);
      
      if (isNaN(purchaseId) || purchaseId <= 0) {
        return res.redirect('/?error=ID de compra inválido');
      }

      // Usar el modelo Purchase directamente
      const { Purchase } = require('../models');
      const purchase = await Purchase.findByPk(purchaseId);
      
      if (!purchase) {
        return res.redirect('/?error=Compra no encontrada');
      }

      // Verificar que el usuario actual es el dueño de la compra
      if (req.session.user && req.session.user.id !== purchase.user_id) {
        return res.redirect('/?error=No tienes permiso para ver esta compra');
      }

      res.render('purchase-success', {
        title: 'Compra Exitosa - CineCríticas',
        purchase: purchase,
        user: req.session.user
      });
      
    } catch (error) {
      console.error('❌ Error cargando página de éxito:', error);
      res.redirect('/?error=Error al cargar página de éxito');
    }
  }

  /**
   * Obtener compras del usuario
   */
  static async getUserPurchases(req, res) {
    try {
      const userId = req.session.user ? req.session.user.id : null;
      
      if (!userId) {
        return res.redirect('/auth/login?error=Debes iniciar sesión');
      }

      const { Purchase } = require('../models');
      const purchases = await Purchase.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']]
      });

      res.render('user/purchases', {
        title: 'Mis Compras - CineCríticas',
        purchases: purchases,
        user: req.session.user
      });
      
    } catch (error) {
      console.error('❌ Error cargando compras del usuario:', error);
      res.redirect('/?error=Error al cargar tus compras');
    }
  }

  /**
   * Método auxiliar: Obtener precio válido
   */
  static _getValidPrice(moviePlain) {
    let price = 3.99;
    
    // Intentar obtener precio de movie.price
    if (moviePlain.price && !isNaN(parseFloat(moviePlain.price))) {
      price = parseFloat(moviePlain.price);
    }
    // Intentar obtener precio de producto asociado
    else if (moviePlain.product && moviePlain.product.price && !isNaN(parseFloat(moviePlain.product.price))) {
      price = parseFloat(moviePlain.product.price);
    }
    // Usar precio fijo si es un valor específico que mencionaste
    else if (moviePlain.id && moviePlain.id > 0) {
      // Si es una película específica, usar 20.00 como mencionaste
      price = 20.00;
    }
    
    return price;
  }

  /**
   * Actualizar historial de compras del usuario
   */
  static async _updateUserPurchaseHistory(userId, purchase) {
    try {
      const { User } = require('../models');
      const user = await User.findByPk(userId);
      
      if (user) {
        let purchaseHistory = [];
        
        try {
          purchaseHistory = user.purchase_history || [];
        } catch (e) {
          purchaseHistory = [];
        }
        
        // Agregar nueva compra al historial
        purchaseHistory.push({
          id: purchase.id,
          type: purchase.type,
          movie_title: purchase.movie_title,
          amount: purchase.amount,
          date: new Date().toISOString(),
          status: purchase.status
        });
        
        // Actualizar usuario
        await user.update({
          purchase_history: purchaseHistory
        });
        
        console.log(`✅ Historial de compras actualizado para usuario ${userId}`);
      }
    } catch (error) {
      console.error('❌ Error actualizando historial de compras:', error);
    }
  }
}

module.exports = PurchaseController;