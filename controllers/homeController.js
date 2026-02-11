const DatabaseService = require('../services/DatabaseService');

class HomeController {
  
  /**
   * Mostrar página de inicio
   */
  static async showHome(req, res) {
    try {
      console.log('🏠 Cargando página de inicio...');
      
      // Manejar sesión undefined de forma segura
      const user = req.session && req.session.user ? req.session.user : null;
      
      console.log('👤 Estado de sesión:', {
        hasSession: !!req.session,
        hasUser: !!user,
        userId: user ? user.id : 'No user'
      });

      let featuredReviews = [], allReviews = [], movies = [], debugError = null, debugMovieInfo = null;
      try {
        await DatabaseService.checkReviewAssociations();
        featuredReviews = await DatabaseService.getFeaturedReviewsForHome();
        allReviews = await DatabaseService.getRecentReviewsForHome();
        movies = await DatabaseService.getAllMovies(20);
        debugMovieInfo = {
          cantidad: movies.length,
          primerTitulo: movies[0] ? movies[0].title : null,
          primerId: movies[0] ? movies[0].id : null
        };
      } catch (innerError) {
        debugError = innerError.message || innerError.toString();
        console.error('❌ Error interno al cargar películas/reseñas:', innerError);
      }

      console.log('📊 Reseñas cargadas:', {
        destacadas: featuredReviews.length,
        total: allReviews.length
      });

      // DEBUG: Mostrar información de las primeras reseñas
      if (featuredReviews.length > 0) {
        console.log('🔍 DEBUG - Primera reseña destacada:', {
          id: featuredReviews[0].id,
          movie_title: featuredReviews[0].movie_title,
          user_id: featuredReviews[0].user_id,
          hasUserObject: !!featuredReviews[0].user,
          userData: featuredReviews[0].user ? {
            username: featuredReviews[0].user.username,
            role: featuredReviews[0].user.role
          } : 'No hay datos de usuario'
        });
      }

      // Procesar las reseñas para incluir la información del autor
      const processedFeaturedReviews = featuredReviews.map(review => {
        const reviewData = review.toJSON ? review.toJSON() : review;
        if (reviewData.user) {
          reviewData.username = reviewData.user.username || 'Usuario';
          reviewData.user_role = reviewData.user.role || 'user';
        } else if (reviewData.User) {
          reviewData.username = reviewData.User.username || 'Usuario';
          reviewData.user_role = reviewData.User.role || 'user';
        } else {
          reviewData.username = 'Usuario';
          reviewData.user_role = 'user';
        }
        return reviewData;
      });
      const processedAllReviews = allReviews.map(review => {
        const reviewData = review.toJSON ? review.toJSON() : review;
        if (reviewData.user) {
          reviewData.username = reviewData.user.username || 'Usuario';
          reviewData.user_role = reviewData.user.role || 'user';
        } else if (reviewData.User) {
          reviewData.username = reviewData.User.username || 'Usuario';
          reviewData.user_role = reviewData.User.role || 'user';
        } else {
          reviewData.username = 'Usuario';
          reviewData.user_role = 'user';
        }
        return reviewData;
      });

      res.render('home', {
        title: 'CineCríticas - Descubre y Comparte Reseñas',
        user: user,
        featuredReviews: processedFeaturedReviews,
        allReviews: processedAllReviews,
        movies: movies.map(m => (m.toJSON ? m.toJSON() : m)),
        success: req.query.success,
        error: req.query.error,
        debugError: debugError,
        debugMovieInfo: debugMovieInfo
      });

    } catch (error) {
      console.error('❌ Error cargando página de inicio:', error);
      
      // También manejar sesión undefined en el catch
      const user = req.session && req.session.user ? req.session.user : null;
      
      res.render('home', {
        title: 'CineCríticas - Descubre y Comparte Reseñas',
        user: user,
        featuredReviews: [],
        allReviews: [],
        movies: [],
        error: 'Error al cargar las reseñas',
        debugError: error.message || error.toString(),
        debugMovieInfo: null
      });
    }
  }

  /**
   * Ruta de prueba para verificar asociaciones
   */
  static async testAssociations(req, res) {
    try {
      console.log('🔍 Probando asociaciones...');
      
      const result = await DatabaseService.checkReviewAssociations();
      
      // Obtener algunas reseñas con usuarios para debug
      const reviewsWithUsers = await DatabaseService.Review.findAll({
        include: [
          {
            model: DatabaseService.User,
            as: 'user',
            attributes: ['id', 'username', 'role']
          }
        ],
        limit: 3
      });
      
      const debugData = reviewsWithUsers.map(review => ({
        id: review.id,
        title: review.title,
        user_id: review.user_id,
        hasUser: !!review.user,
        username: review.user?.username,
        userRole: review.user?.role
      }));
      
      res.json({
        success: true,
        associationsWorking: result,
        sampleData: debugData,
        message: 'Asociaciones verificadas'
      });
    } catch (error) {
      console.error('❌ Error en testAssociations:', error);
      res.json({
        success: false,
        error: error.message,
        associationsWorking: false
      });
    }
  }

  /**
   * Mostrar página about
   */
  static async showAbout(req, res) {
    try {
      const user = req.session && req.session.user ? req.session.user : null;
      
      res.render('about', {
        title: 'Acerca de - CineCríticas',
        user: user
      });
    } catch (error) {
      console.error('Error cargando página about:', error);
      res.redirect('/?error=Error al cargar la página');
    }
  }

  /**
   * Mostrar página de contacto
   */
  static async showContact(req, res) {
    try {
      const user = req.session && req.session.user ? req.session.user : null;
      
      res.render('contact', {
        title: 'Contacto - CineCríticas',
        user: user
      });
    } catch (error) {
      console.error('Error cargando página de contacto:', error);
      res.redirect('/?error=Error al cargar la página');
    }
  }

  /**
   * Buscar películas por título (query param `q`)
   */
  static async search(req, res) {
    try {
      const q = req.query.q ? String(req.query.q).trim() : '';
      const user = req.session && req.session.user ? req.session.user : null;

      // Obtener reseñas para la página (reutilizamos los métodos del servicio)
      const featuredReviews = await DatabaseService.getFeaturedReviewsForHome();
      const allReviews = await DatabaseService.getRecentReviewsForHome();

      // Procesar reseñas igual que en showHome
      const processedFeaturedReviews = featuredReviews.map(review => {
        const reviewData = review.toJSON ? review.toJSON() : review;
        if (reviewData.user) {
          reviewData.username = reviewData.user.username || 'Usuario';
          reviewData.user_role = reviewData.user.role || 'user';
        } else if (reviewData.User) {
          reviewData.username = reviewData.User.username || 'Usuario';
          reviewData.user_role = reviewData.User.role || 'user';
        } else {
          reviewData.username = 'Usuario';
          reviewData.user_role = 'user';
        }
        return reviewData;
      });

      const processedAllReviews = allReviews.map(review => {
        const reviewData = review.toJSON ? review.toJSON() : review;
        if (reviewData.user) {
          reviewData.username = reviewData.user.username || 'Usuario';
          reviewData.user_role = reviewData.user.role || 'user';
        } else if (reviewData.User) {
          reviewData.username = reviewData.User.username || 'Usuario';
          reviewData.user_role = reviewData.User.role || 'user';
        } else {
          reviewData.username = 'Usuario';
          reviewData.user_role = 'user';
        }
        return reviewData;
      });

      let movies = [];
      if (q) {
        // Validación mínima para evitar búsquedas vacías/very small
        if (q.length < 2) {
          movies = [];
        } else {
          const Sequelize = require('sequelize');
          const { Op } = Sequelize;
          await DatabaseService.ensureDatabase();
          movies = await DatabaseService.Movie.findAll({
            where: {
              is_active: true,
              [Op.and]: [
                Sequelize.where(
                  Sequelize.fn('LOWER', Sequelize.col('title')),
                  { [Op.like]: `%${q.toLowerCase()}%` }
                )
              ]
            },
            attributes: ['id', 'title', 'poster_image', 'release_year', 'description', 'price'],
            order: [['created_at', 'DESC']]
          });
        }
      }

      res.render('search', {
        results: movies.map(m => (m.toJSON ? m.toJSON() : m)),
        q: q,
        title: q ? `Resultados para "${q}"` : 'Buscar películas'
      });
    } catch (error) {
      console.error('❌ Error en búsqueda de películas:', error);
      res.render('search', {
        results: [],
        q: req.query.q || '',
        title: 'Buscar películas'
      });
    }
  }

  /**
   * API: búsqueda en vivo de películas (devuelve JSON)
   */
  static async apiSearch(req, res) {
    try {
      const q = req.query.q ? String(req.query.q).trim() : '';
      console.log('🔎 [DEBUG] apiSearch query:', q);
      // Si la query está vacía devolvemos array vacío
      if (!q) {
        console.log('🔎 [DEBUG] Query vacía, retorno array vacío');
        return res.json({ success: true, movies: [] });
      }

      // Validación: mínimo 2 caracteres
      if (q.length < 2) {
        console.log('🔎 [DEBUG] Query muy corta');
        return res.json({ success: true, movies: [], message: 'Escribe al menos 2 caracteres para buscar' });
      }

      const Sequelize = require('sequelize');
      const { Op } = Sequelize;

      // Asegurar servicio y usar búsqueda case-insensitive en title
      await DatabaseService.ensureDatabase();
      const movies = await DatabaseService.Movie.findAll({
        where: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('title')),
          { [Op.like]: `%${q.toLowerCase()}%` }
        ),
        attributes: ['id', 'title', 'poster_image', 'release_year', 'description', 'price'],
        limit: 30,
        order: [['created_at', 'DESC']]
      });

      const plain = movies.map(m => (m.toJSON ? m.toJSON() : m));
      console.log('🔎 [DEBUG] Resultados encontrados:', plain.length);
      if (plain.length > 0) {
        console.log('🔎 [DEBUG] Primer resultado:', plain[0]);
      }
      res.json({ success: true, movies: plain });
    } catch (error) {
      console.error('❌ Error en apiSearch:', error);
      res.status(500).json({ success: false, error: 'Error interno' });
    }
  }
}

module.exports = HomeController;